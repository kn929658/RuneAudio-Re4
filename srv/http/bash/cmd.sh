#!/bin/bash

dirdata=/srv/http/data
diraddons=/srv/http/data/addons
dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/tmp
dirwebradios=/srv/http/data/webradios

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamKeyVal() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d '{ "'$2'": "'$3'" }'
}
pushstreamVol() {
	curl -s -X POST http://127.0.0.1/pub?id=volume -d '{"type":"'$1'", "val":'$2' }'
}
pushstreamPkg() {
	curl -s -X POST http://127.0.0.1/pub?id=package -d '{"pkg":"'$1'", "start":'$2',"enable":'$3' }'
}

cuescan() {
	# pre-fetched - browse by mode
	album=$( mpc -f '%album%^^[%albumartist%|%artist%]^^%file%' listall \
			| awk -F'/[^/]*$' 'NF && !/^\^/ && !a[$0]++ {print $1}' )
	for mode in albumartist artist composer date genre; do
		printf -v $mode '%s' "$( mpc list $mode )"
	done
	cuedbfile=/srv/http/data/mpd/cuedb.php
	files=$( find /mnt/MPD -type f -name *.cue )
	[[ -z $files ]] && rm -f $cuedbfile && exit
	
	readarray -t files <<< "$files"
	
	Ialbum=0
	Ialbumartist=0
	Iartist=0
	Icomposer=0
	Idate=0
	Igenre=0
	Ititle=0
		
	for file in "${files[@]}"; do # album albumartist artist composer date genre path
		lines=$( grep '^TITLE\|^PERFORMER\|^\s\+PERFORMER\|^REM GENRE\|REM DATE\|^\s\+TRACK' "$file" )
		Calbum=$( grep '^TITLE' <<< "$lines" | sed 's/^TITLE "*//; s/"*.$//' )
		Calbumartist=$( grep '^PERFORMER' <<< "$lines" | sed 's/^PERFORMER "*//; s/"*.$//' )
		Cartist=$( grep -m1 '^\s\+PERFORMER' <<< "$lines" | sed 's/^\s\+PERFORMER "*//; s/"*.$//' )
		Ccomposer=$( grep '^REM COMPOSER' <<< "$lines" | sed 's/^REM COMPOSER "*//; s/"*.$//' )
		Cdate=$( grep '^REM DATE' <<< "$lines" | sed 's/^REM DATE "*//; s/"*.$//' )
		Cgenre=$( grep '^REM GENRE' <<< "$lines" | sed 's/^REM GENRE "*//; s/"*.$//' )
		Cpath=$( dirname "$file" | sed 's|/mnt/MPD/||' )
		[[ -n $Calbumartist ]] && (( Ialbumartist++ )) && albumartist+="$Calbumartist"$'\n'
		[[ -n $Cartist ]]      && (( Iartist++ ))      && artist+="$Cartist"$'\n'
		[[ -n $Ccomposer ]]    && (( Icomposer++ ))    && composer+="$Ccomposer"$'\n'
		[[ -n $Cdate ]]        && (( Idate++ ))        && date+="$Cdate"$'\n'
		[[ -n $Cgenre ]]       && (( Igenre++ ))       && genre+="$Cgenre"$'\n'
		[[ -n $Calbumartist ]] && Cartist=$Cartist
		album+="$Calbum^^$Cartist^^$Cpath"$'\n'
		Ititle=$(( Ititle + $( grep -c '^\s\+TRACK' <<< "$lines" ) ))
		cue+=',["'$Calbum'","'$Calbumartist'","'$Cartist'","'$Ccomposer'","'$Cdate'","'$Cgenre'","'$Cpath'"]'
	done
	cuedb=$( jq . <<< "[ ${cue:1} ]" ) # remove 1st comma
	cat << EOF > $cuedbfile
<?php
\$cuedb = $cuedb;
EOF
	for mode in album artist albumartist artist composer date genre; do
		echo "${!mode}" | sort -u | awk NF > /srv/http/data/mpd/$mode
	done
	count
}
count() {
	for mode in albumartist composer date genre; do
		printf -v $mode '%s' $( mpc list $mode | awk NF | wc -l )
	done
	for mode in NAS SD USB; do
		printf -v $mode '%s' $( mpc ls $mode 2> /dev/null | wc -l )
	done
	stats=( $( mpc stats | head -3 | awk '{print $2,$4,$6}' ) )
	counts='
	  "album"       : '$(( Ialbum + ${stats[1]} ))'
	, "albumartist" : '$(( Ialbumartist + albumartist ))'
	, "artist"      : '$(( Iartist + ${stats[0]} ))'
	, "composer"    : '$(( Icomposer + composer ))'
	, "coverart"    : '$( ls -1q /srv/http/data/coverarts | wc -l )'
	, "date"        : '$(( Idate + date ))'
	, "genre"       : '$(( Igenre + genre ))'
	, "nas"         : '$NAS'
	, "sd"          : '$SD'
	, "title"       : '$(( Ititle + ${stats[2]} ))'
	, "usb"         : '$USB'
	, "webradio"    : '$( ls -U /srv/http/data/webradios/* 2> /dev/null | wc -l )
	
	echo {$counts} | jq . > /srv/http/data/mpd/counts
	pushstream mpdupdate "{$counts}"
}
volumeSet() {
	current=$1
	target=$2
	diff=$(( $target - $current ))
	if (( -10 < $diff && $diff < 10 )); then
		mpc -q volume $target
	else # increment
		pushstream volume '{"disable":true}'
		(( $diff > 0 )) && incr=5 || incr=-5
		for i in $( seq $current $incr $target ); do
			mpc -q volume $i
			sleep 0.2
		done
		(( $i != $target )) && mpc -q volume $target
		pushstream volume '{"disable":false}'
	fi
}

case ${args[0]} in

addonsclose )
	script=${args[1]}
	alias=${args[2]}
	killall $script wget pacman &> /dev/null
	rm -f /var/lib/pacman/db.lck /srv/http/*.zip $diraddons/$alias /usr/local/bin/uninstall_$alias.sh
	;;
addonslist )
	wget https://github.com/rern/RuneAudio_Addons/raw/master/addons-list.json -qO $diraddons/addons-list.json
	echo -n $?
	# push updates
	wget https://github.com/rern/RuneAudio_Addons/raw/master/addons-push.sh -qO - | sh
	;;
addonsupdate )
	[[ -z ${args[1]} ]] && wget https://github.com/rern/RuneAudio_Addons/raw/master/addons-list.json -qO $diraddons/addons-list.json
	installed=$( find "$diraddons" -type f ! -name "addons*" )
	jsonfile=$diraddons/addons-list.json
	count=0
	for file in $installed; do
		verinstalled=$( cat $file )
		if (( ${#verinstalled} > 1 )); then
			addon=$( basename $file )
			verlist=$( jq -r .$addon.version $jsonfile )
			[[ $verinstalled != $verlist ]] && (( count++ ))
		fi
	done
	(( $count )) && echo $count > $diraddons/update || rm -f $diraddons/update
	;;
color )
	cmd=${args[1]}
	file=$dirsystem/color
	if [[ $cmd == reset ]]; then
		rm $file
	elif [[ -n $cmd && $cmd != color ]]; then # omit call from addons-functions.sh / backup-restore.sh
		echo $cmd > $file
	fi
	if [[ -e $file ]]; then
		hsl=( $( cat $file ) )
		h=${hsl[0]}; s=${hsl[1]}; l=${hsl[2]}
	else
		h=200; s=100; l=35
	fi
	hs="$h,$s%,"
	hsg="$h,3%,"

sed -i "
 s|\(--cml: *hsl\).*;|\1(${hs}$(( l + 5 ))%);|
  s|\(--cm: *hsl\).*;|\1(${hs}$l%);|
 s|\(--cma: *hsl\).*;|\1(${hs}$(( l - 5 ))%);|
 s|\(--cmd: *hsl\).*;|\1(${hs}$(( l - 15 ))%);|
s|\(--cg75: *hsl\).*;|\1(${hsg}75%);|
s|\(--cg60: *hsl\).*;|\1(${hsg}60%);|
 s|\(--cgl: *hsl\).*;|\1(${hsg}40%);|
  s|\(--cg: *hsl\).*;|\1(${hsg}30%);|
 s|\(--cga: *hsl\).*;|\1(${hsg}20%);|
 s|\(--cgd: *hsl\).*;|\1(${hsg}10%);|
" /srv/http/assets/css/colors.css
	pushstreamKeyVal reload reload all
	;;
count )
	count
	;;
cuescan )
	cuescan
	;;
filemove )
	mv -f "${args[1]}" "${args[2]}"
	;;
gpiotimerreset )
	awk '/timer/ {print $NF}' $dirsystem/gpio.json > $dirtmp/gpiotimer
	pushstreamKeyVal gpio state RESET
	;;
gpioset )
	echo ${args[1]} | jq . > $dirsystem/gpio.json
	;;
ignoredir )
	path=${args[1]}
	dir=$( basename "$path" )
	mpdpath=$( dirname "$path" )
	echo $dir >> "/mnt/MPD/$mpdpath/.mpdignore"
	mpc update "$mpdpath" #1 get .mpdignore into database
	mpc update "$mpdpath" #2 after .mpdignore was in databasep
	;;
imageresize )
	convert "${args[1]}" -coalesce -resize 200x200 "${args[2]}"
	;;
lyrics )
	artist=${args[1]}
	title=${args[2]}
	cmd=${args[3]}
	lyrics=${args[4]}
	name="$artist - $title"
	name=${name//\/}
	
	lyricsfile="$dirdata/lyrics/${name,,}.txt"
	if [[ $cmd == local ]]; then
		[[ -e $lyricsfile ]] && echo "$title^^$( cat "$lyricsfile" )" # return with title for display
	elif [[ $cmd == save ]]; then
		echo -e "${lyrics//^/\\n}" > "$lyricsfile" # split at ^ delimiter to lines
	elif [[ $cmd == delete ]]; then
		rm "$lyricsfile"
	else
		artist=$( echo $artist | sed 's/^A \|^The \|\///g' )
		title=${title//\/}
		query=$( echo $artist/$title \
					| tr -d " '\-\"\!*\(\);:@&=+$,?#[]." )
		lyrics=$( curl -s -A firefox https://www.azlyrics.com/lyrics/${query,,}.html )
		if [[ -n $lyrics ]]; then
			echo "$lyrics" \
				| sed -n '/id="cf_text_top"/,/id="azmxmbanner"/ p' \
				| sed '/^\s*$/ d' \
				| sed '/\/div>/,/<br>/ {N;d}' \
				| sed 's/<br>//' \
				| grep -v '^<' \
				> "$lyricsfile"
		fi
	fi
	;;
mpcadd )
	item=${args[1]}
	cmd=${args[2]}
	sleep=${args[3]}
	[[ ${cmd: -4} == play ]] && play=1 && pos=$(( $( mpc playlist | wc -l ) + 1 ))
	[[ ${cmd:0:7} == replace ]] && mpc clear && pos=1
	mpc add "$item"
	[[ -z $play ]] && exit
	
	sleep $sleep
	mpc play $pos
	;;
mpcfindadd )
	type=${args[1]}
	string=${args[2]}
	cmd=${args[3]}
	sleep=${args[4]}
	[[ ${cmd: -4} == play ]] && play=1 && pos=$(( $( mpc playlist | wc -l ) + 1 ))
	[[ ${cmd:0:7} == replace ]] && mpc clear && pos=1
	mpc findadd $type "$string"
	[[ -z $play ]] && exit
	
	sleep $sleep
	mpc play $pos
	;;
mpcload )
	playlist=${args[1]}
	cmd=${args[2]}
	sleep=${args[3]}
	[[ ${cmd: -4} == play ]] && play=1 && pos=$(( $( mpc playlist | wc -l ) + 1 ))
	[[ ${cmd:0:7} == replace ]] && mpc clear && pos=1
	mpc load "$playlist"
	[[ -z $play ]] && exit
	
	sleep $sleep
	mpc play $pos
	;;
mpcloadrange )
	range=${args[1]}
	playlist=${args[2]}
	cmd=${args[3]}
	sleep=${args[4]}
	[[ ${cmd: -4} == play ]] && play=1 && pos=$(( $( mpc playlist | wc -l ) + 1 ))
	[[ ${cmd:0:7} == replace ]] && mpc clear && pos=1
	mpc --range=$range load "$playlist"
	[[ -z $play ]] && exit
	
	sleep $sleep
	mpc play $pos
	;;
mpcls )
	dir=${args[1]}
	cmd=${args[2]}
	sleep=${args[3]}
	[[ ${cmd: -4} == play ]] && play=1 && pos=$(( $( mpc playlist | wc -l ) + 1 ))
	[[ ${cmd:0:7} == replace ]] && mpc clear && pos=1
	/srv/http/bash/cmd-mpcls.sh "$dir"
	[[ -z $play ]] && exit
	
	sleep $sleep
	mpc play $pos
	;;
mpcprevnext )
	direction=${args[1]}
	current=${args[2]}
	length=${args[3]}
	mpc | grep -q '^\[playing\]' && playing=1
	flag=/srv/http/data/tmp/prevnext
	touch $flag # suppress mpdidle
	if [[ $( mpc | awk '/random/ {print $6}' ) == on ]]; then
		pos=$( shuf -n 1 <( seq $length | grep -v $current ) )
		mpc play $pos
	else
		if [[ $direction == next ]]; then
			(( $current != $length )) && mpc play $(( current + 1 )) || mpc play 1
		else
			(( $current != 1 )) && mpc play $(( current - 1 )) || mpc play $length
		fi
	fi
	[[ -z $playing ]] && mpc stop
	status=$( /srv/http/bash/status.sh )
	pushstream mpdplayer "$status"
	rm -f $flag
	;;
mpcrescan )
	pushstream mpdupdate 1
	mpc rescan
	cuescan
	;;
mpcsimilar )
	plL=$( mpc playlist | wc -l )
	linesL=${#args[@]}
	for (( i=1; i < linesL; i++ )); do
		artist=${args[$i]}
		(( i++ ))
		title=${args[$i]}
		[[ -z $artist || -z $title ]] && continue
		
		file=$( mpc find artist "$artist" title "$title" )
		[[ -z $file ]] && continue
		
		list+="$( mpc find artist "$artist" title "$title" )
"
	done
	echo "$list" | awk 'NF' | mpc add
	echo $(( $( mpc playlist | wc -l ) - plL ))
	;;
mpcupdate )
	pushstream mpdupdate 1
	mpc rescan
#	mpc update "${args[1]}"
	cuescan
	;;
packageenable )
	pkg=${args[1]}
	enable=${args[2]}
	systemctl start $pkg
	pushstreamPkg $pkg true $enable
	;;
packageset )
	pkg=${args[1]}
	start=${args[2]}
	enable=${args[3]}
	[[ $start == true ]] && systemctl start $pkg || systemctl stop $pkg
	[[ $enable == true ]] && systemctl enable $pkg || systemctl disable $pkg
	pushstreamPkg $pkg $start $enable
	;;
playpos )
	mpc play ${args[1]}
	;;
playrandom )
	plL=$( mpc playlist | wc -l )
	mpc play $( shuf -i 0-$plL -n 1 )
	;;
playseek )
	seek=${args[1]}
	touch $dirtmp/nostatus
	mpc play
	mpc pause
	mpc seek $seek
	pushstreamKeyVal seek elapsed $seek
	;;
plrandom )
	if [[ ${args[1]} == false ]]; then
		systemctl stop libraryrandom
	else
		mpc random 0
		plL=$( mpc playlist | wc -l )
		mpc listall | shuf -n 3 | mpc add
		mpc play $(( plL +1 ))
		systemctl start libraryrandom
	fi
	pushstreamKeyVal playlist playlist playlist
	;;
plrename )
	mv "$dirdata/playlists/${args[1]}" "$dirdata/playlists/${args[2]}"
	;;
plshuffle )
	mpc shuffle
	pushstreamKeyVal playlist playlist playlist
	;;
plcrop )
	if mpc | grep -q playing; then
		mpc crop
	else
		mpc play
		mpc crop
		mpc stop
	fi
	systemctl -q is-active libraryrandom && mpc listall | shuf -n 2 | mpc add
	pushstreamKeyVal playlist playlist playlist
	;;
plorder )
	mpc move ${args[1]} ${args[2]}
	pushstreamKeyVal playlist playlist playlist
	;;
reboot )
	/srv/http/bash/gpiooff.py &> /dev/null
	/srv/http/bash/ply-image /srv/http/assets/img/splash.png &> /dev/null
	mount | grep -q /mnt/MPD/NAS && umount -l /mnt/MPD/NAS/* &> /dev/null
	sleep 3
	rm -f $dirtmp/*
	[[ ${args[1]} == off ]] && shutdown -h now || shutdown -r now
	;;
refreshbrowser )
	pushstream reload '{ "reload": 1 }'
	;;
soundprofile )
	profile=${args[1]}
	if [[ -z $profile ]]; then
		profile=$( cat $dirsystem/soundprofile )
	elif [[ $profile == getvalue ]]; then
		getvalue=1
		profile=$( cat $dirsystem/soundprofile )
	fi
	hwcode=$( awk '/Revision/ {print substr($NF, 4, 2)}' /proc/cpuinfo )
	if [[ $hwcode =~ ^(04|08|0d|0e|11)$ ]]; then # not RPi 1
		lat=( 4500000 3500075 1000000 2000000 3700000 1500000 145655 6000000 )
	else
		lat=( 1500000 850000 500000 120000 500000 1500000 145655 6000000 )
	fi
	case $profile in # mtu  txq  sw lat
		RuneAudio ) val=( 1500 1000 0  ${lat[0]} );;
		ACX )       val=( 1500 4000 0  ${lat[1]} );;
		Orion )     val=( 1000 4000 20 ${lat[2]} );;
		OrionV2 )   val=( 1000 4000 0  ${lat[3]} );;
		Um3ggh1U )  val=( 1500 1000 0  ${lat[4]} );;
		iqaudio )   val=( 1000 4000 0  ${lat[5]} );;
		berrynos )  val=( 1000 4000 60 ${lat[6]} );;
		default )   val=( 1500 1000 60 18000000 );;
		custom )    val=( $( cat $dirsystem/soundprofile-custom ) );;
	esac
	if [[ $getvalue ]]; then
		echo -n ${val[@]}
	else
		if ifconfig | grep -q eth0; then
			ip link set eth0 mtu ${val[0]}
			ip link set eth0 txqueuelen ${val[1]}
		fi
		sysctl vm.swappiness=${val[2]}
		sysctl kernel.sched_latency_ns=${val[3]}
	fi
	;;
volume )
	current=${args[1]}
	target=${args[2]}
	filevolumemute=$dirsystem/volumemute
	if [[ -n $target ]]; then # set
		pushstreamVol set $target
		volumeSet $current $target
		rm -f $filevolumemute
	else
		if (( $current > 0 )); then # mute
			pushstreamVol mute $current true
			volumeSet $current 0 false
			echo $current > $filevolumemute
		else # unmute
			target=$( cat $filevolumemute )
			pushstreamVol unmute $target true
			volumeSet 0 $target
			rm -f $filevolumemute
		fi
	fi
	;;
volumeincrement )
	target=${args[1]}
	mpc -q volume $target
	pushstreamVol set $target
	;;
volumenone )
	output=$( cat "$dirsystem/${args[1]}" )
	mixer=$( sed -n "/$output/,/^}/ p" /etc/mpd.conf \
		| awk -F '\"' '/mixer_type/ {print $2}' )
	echo -n $mixer
	;;
webradioadd )
	name=${args[1]}
	url=${args[2]}
	filewebradio=$dirwebradios/${url//\//|}
	[[ -e $filewebradio ]] && cat $filewebradio && exit
	
	ext=${url/*.}
	if [[ $ext == m3u ]]; then
		url=$( curl -s $url | grep ^http | head -1 )
	elif [[ $ext == pls ]]; then
		url=$( curl -s $url | grep ^File | head -1 | cut -d= -f2 )
	fi
	[[ -z $url ]] && echo -1 && exit
	
	echo $name^^Radio > $filewebradio
	count
	;;
webradiodelete )
	url=${args[1]}
	rm $dirwebradios/${url//\//|}
	count
	;;
webradioedit )
	url=${args[1]}
	newname=${args[2]}^^Radio
	newurl=${args[3]}
	filewebradionew=$dirwebradios/${newurl//\//|}
	[[ $url != $newurl && -e $filewebradionew ]] && cat $filewebradionew && exit
	
	filewebradio=$dirwebradios/${url//\//|}
	oldname=$( cat $filewebradio | head -1 )
	if [[ $oldname != $newname && $filewebradio != $filewebradionew ]]; then
		sed -e "1 c$newname" $filewebradio > $filewebradionew
		rm $filewebradio
	elif [[ $oldname != $newname ]]; then
		sed -i "1 c$newname" $filewebradio
	else
		mv $filewebradio $filewebradionew
	fi
	count
	;;
	
esac
