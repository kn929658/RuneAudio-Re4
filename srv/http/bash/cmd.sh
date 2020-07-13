#!/bin/bash

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST 'http://127.0.0.1/pub?id='$1 -d '{ "'$2'": "'$3'" }'
}

case ${args[0]} in

addonsclose )
	killall ${args[1]} wget pacman &> /dev/null
	rm -f /var/lib/pacman/db.lck /srv/http/*.zip /usr/local/bin/uninstall_${args[2]}.sh
	rm -f /srv/http/data/addons/${args[2]}
	;;
addonslist )
	wget -q --no-check-certificate https://github.com/rern/RuneAudio_Addons/raw/master/addons-list.php -O /srv/http/data/addons/addons-list.php
	[[ $? != 0 ]] && echo -n -1
	;;
colorset )
	/srv/http/bash/setcolor.sh ${args[1]} ${args[2]} ${args[3]}
	echo ${args[1]} ${args[2]} ${args[3]} > /srv/http/data/system/color
	pushstream reload reload all
	;;
colorreset )
	rm /srv/http/data/system/color
	/srv/http/bash/setcolor.sh
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
	echo ${args[1]} | jq > /srv/http/data/system/gpio.json
	[[ -e /srv/http/data/tmp/gpiotimer ]] && echo ${args[2]} > /srv/http/data/tmp/gpiotimer
	;;
ignoredir )
	dir=$( basename "${args[1]}" )
	mpdpath=$( dirname "${args[1]}" )
	echo $dir >> "/mnt/MPD/$mpdpath/.mpdignore"
	mpc update "$mpdpath" #1 get .mpdignore into database
	mpc update "$mpdpath" #2 after .mpdignore was in databasep
	;;
imageresize )
	convert "${args[1]}" -coalesce -resize 200x200 "${args[2]}"
	;;
mpcadd )
	[[ ${args[2]} == replace || ${args[2]} == replaceplay ]] && mpc clear
	mpc add "${args[1]}"
	if [[ ${args[2]} == addplay ]]; then
		sleep ${args[3]}
		mpc play $( mpc playlist | wc -l )
	elif [[ ${args[2]} == replaceplay ]]; then
		sleep ${args[3]}
		mpc play
	fi
	;;
mpcfindadd )
	if [[ -z ${args[3]} ]]; then
		mpc findadd ${args[1]} "${args[2]}"
	else
		mpc findadd ${args[1]} "${args[2]}" ${args[3]} "${args[4]}"
	fi
	;;
mpcload )
	mpc load "${args[1]}"
	;;
mpcloadrange )
	mpc --range=${args[1]} load "${args[2]}"
	;;
mpcls )
	/srv/http/bash/mpdls.sh "${args[1]}"
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
	mpc play $pos
	if [[ -z $playing ]]; then
		mpc stop
		touch /srv/http/data/tmp/nostatus
	fi
	;;
mpcupdate )
	mpc update "${args[1]}"
	;;
packageenable )
	systemctl start ${args[1]}
	pushstream ${args[1]} 1 ${args[2]}
	;;
packageset )
	[[ ${args[2]} == true ]] && systemctl start ${args[1]} || systemctl start ${args[1]}
	[[ ${args[3]} == true ]] && systemctl enable ${args[1]} || systemctl disable ${args[1]}
	pushstream ${args[1]} ${args[2]} ${args[3]}
	;;
playpos )
	mpc play ${args[1]}
	;;
playrandom )
	plL=$( mpc playlist | wc -l )
	mpc play $( shuf -i 0-$plL -n 1 )
	;;
playseek )
	touch /srv/http/data/tmp/nostatus
	mpc play
	mpc pause
	mpc seek ${args[1]}
	pushstream seek elapsed ${args[1]}
	;;
plrandom )
	if [[ ${args[1]} == 0 ]]; then
		systemctl stop libraryrandom
	else
		mpc random 0
		plL=$( mpc playlist | wc -l )
		mpc listall | shuf -n 3 | mpc add
		mpc play $(( plL +1 ))
		systemctl start libraryrandom
	fi
	pushstream playlist playlist playlist
	pushstream mpdoptions librandom ${args[1]}
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
	/usr/local/bin/gpiooff.py &> /dev/null
	/usr/local/bin/ply-image /srv/http/assets/img/splash.png
	mount | grep -q /mnt/MPD/NAS && umount -l /mnt/MPD/NAS/* &> /dev/null
	sleep 3
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
			for (( i=0; i < $count; i++ )); do
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
