#!/bin/bash

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST 'http://127.0.0.1/pub?id='$1 -d '{ "'$2'": "'$3'" }'
}

case ${args[0]} in

addonsclose )
	script=${args[1]}
	alias=${args[2]}
	killall $script wget pacman &> /dev/null
	rm -f /var/lib/pacman/db.lck /srv/http/*.zip /srv/http/data/addons/$alias /usr/local/bin/uninstall_$alias.sh
	;;
addonslist )
	wget -q --no-check-certificate https://github.com/rern/RuneAudio_Addons/raw/master/addons-list.php -O /srv/http/data/addons/addons-list.php
	echo -n $?
	;;
color )
	cmd=${args[1]}
	file=/srv/http/data/system/color
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
	pushstream reload reload all
	;;
coverartget )
	coverart=$( /srv/http/bash/getcover.sh "/mnt/MPD/${args[1]}" )
	echo -n $coverart
	[[ -n ${args[2]} ]] && pushstream coverart coverart $coverart
	;;
coverartthumb )
	/srv/http/bash/getcover.sh "/mnt/MPD/${args[1]}" ${args[2]}
	;;
filemove )
	mv -f "${args[1]}" "${args[2]}"
	;;
gpiotimerreset )
	awk '/timer/ {print $NF}' /srv/http/data/system/gpio.json > /srv/http/data/tmp/gpiotimer
	pushstream gpio state RESET
	;;
gpioset )
	echo ${args[1]} | jq . > /srv/http/data/system/gpio.json
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
	
	lyricsfile="/srv/http/data/lyrics/${name,,}.txt"
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
	/srv/http/bash/mpdls.sh "$dir"
	[[ -z $play ]] && exit
	
	sleep $sleep
	mpc play $pos
	;;
mpcprevnext )
	dir=${args[1]}
	current=${args[2]}
	length=${args[3]}
	mpc | grep -q '^\[playing\]' && playing=1 
	random=$( mpc | awk '/random/ {print $6}' )
	if [[ $random == on ]]; then
		pos=$( shuf -n 1 -i 1-$length )
		if (( $pos == $current )); then
			(( $pos == $length )) && (( pos-- )) || (( pos++ ))
		fi
	else
		if [[ $dir == next ]]; then
			(( $current != $length )) && pos=$(( current + 1 )) || pos=1
		else
			(( $current != 1 )) && pos=$(( current - 1 )) || pos=$length
		fi
	fi
	if [[ -n $playing ]]; then
		mpc play $pos
	else
		touch /srv/http/data/tmp/nostatus
		mpc play $pos
		mpc stop
	fi
	;;
mpcupdate )
	mpc update "${args[1]}"
	;;
packageenable )
	pkg=${args[1]}
	enable=${args[2]}
	systemctl start $pkg
	pushstream package $pkg [true,$enable]
	;;
packageset )
	pkg=${args[1]}
	start=${args[2]}
	enable=${args[3]}
	[[ $start == true ]] && systemctl start $pkg || systemctl stop $pkg
	[[ $enable == true ]] && systemctl enable $pkg || systemctl disable $pkg
	pushstream package $pkg [$start,$enable]
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
	touch /srv/http/data/tmp/nostatus
	mpc play
	mpc pause
	mpc seek $seek
	pushstream seek elapsed $seek
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
	pushstream playlist playlist playlist
	;;
plrename )
	mv "/srv/http/data/playlists/${args[1]}" "/srv/http/data/playlists/${args[2]}"
	;;
plshuffle )
	mpc shuffle
	pushstream playlist playlist playlist
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
	pushstream playlist playlist playlist
	;;
plorder )
	mpc move ${args[1]} ${args[2]}
	pushstream playlist playlist playlist
	;;
reboot )
	/srv/http/bash/gpiooff.py &> /dev/null
	/srv/http/bash/ply-image /srv/http/assets/img/splash.png &> /dev/null
	mount | grep -q /mnt/MPD/NAS && umount -l /mnt/MPD/NAS/* &> /dev/null
	sleep 3
	rm -f /srv/http/data/tmp/*
	[[ ${args[1]} == off ]] && shutdown -h now || shutdown -r now
	;;
refreshbrowser )
	curl -s -X POST 'http://127.0.0.1/pub?id=reload' -d '{ "reload": 1 }'
	;;
tageditor )
	cue=${args[-1]} && unset args[-1]
	album=${args[-1]} && unset args[-1]
	file=${args[-1]} && unset args[-1]
	path="/mnt/MPD/$file"
	count=${#args[@]}
	keys=( 'tageditor' album albumartist artist composer genre date )
	if (( $count == 9 )); then
		keys+=( title track )
	elif (( $count == 4 )); then
		keys=( 'tageditor' artist title track )
	fi
	if [[ $cue == false ]]; then
		[[ $album == true ]] && path="/mnt/MPD/$file/"*.*
		for (( i=1; i < $count; i++ )); do
			key=${keys[$i]}
			val=${args[$i]}
			kid3-cli -c "set $key \"$val\"" "$path"
		done
	else
		if [[ $album == false ]]; then
			sed -i '/^\s\+TRACK '${args[2]}'/ {
n; s/^\(\s\+TITLE\).*/\1 "'${args[1]}'"/
n; s/^\(\s\+PERFORMER\).*/\1 "'${args[0]}'"/
}
' "$path"
		else
			sed -i '/^PERFORMER\|^REM COMPOSER\|^REM DATE\|^REM GENRE/ d' "$path"
			for (( i=0; i < count; i++ )); do
				key=${keys[$i]}
				val=${args[$i]}
				[[ -z $val ]] && continue
				
				case $key in
					albumartist ) sed -i '/^TITLE/ i\PERFORMER "'$val'"' "$path";;
					composer )    sed -i '1 i\REM COMPOSER "'$val'"' "$path";;
					date )        sed -i '1 i\REM DATE "'$val'"' "$path";;
					genre )       sed -i '1 a\REM GENRE "'$val'"' "$path";;
					album )       sed -i 's/^\(\s\+PERFORMER \).*/\1 "'$val'"/' "$path";;
					artist )      sed -i 's/^\(TITLE\).*/\1 "'$val'"/' "$path";;
				esac
			done
		fi
	fi
	mpc update "$file"
	;;
volumenone )
	output=$( cat "/srv/http/data/system/${args[1]}" )
	mixer=$( sed -n "/$output/,/^}/ p" /etc/mpd.conf \
		| awk -F '\"' '/mixer_type/ {print $2}' )
	echo -n $mixer
	;;
	
esac
