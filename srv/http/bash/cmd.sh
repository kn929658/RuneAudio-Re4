#!/bin/bash

pushstream() {
	curl -s -X POST 'http://127.0.0.1/pub?id='$1 -d '{ "'$2'": "'$3'" }'
}

case $1 in

addonslist )
	wget -q --no-check-certificate https://github.com/rern/RuneAudio_Addons/raw/master/addons-list.php -O /srv/http/data/addons/addons-list.php && echo $?
	;;
colorset )
	/srv/http/bash/setcolor.sh $2 $3 $4
	echo $2 $3 $4 > /srv/http/data/system/color
	pushstream reload reload all
	;;
colorreset )
	rm /srv/http/data/system/color
	/srv/http/bash/setcolor.sh
	pushstream reload reload all
	;;
packageenable )
	systemctl start $2
	pushstream $2 1 $3
	;;
packageset )
	[[ $3 == true ]] && systemctl start $2 || systemctl start $2
	[[ $4 == true ]] && systemctl enable $2 || systemctl disable $2
	pushstream $2 $3 $4
	;;
playseek )
	touch /srv/http/data/tmp/nostatus
	mpc play
	mpc pause
	mpc seek $2
	pushstream seek elapsed $2
	;;
playstop )
	touch /srv/http/data/tmp/nostatus
	mpc play $2
	mpc stop
	;;
gpiotimerreset )
	killall -9 gpiotimer.py &> /dev/null
	/usr/local/bin/gpiotimer.py &
	pushstream gpio state RESET
	;;
plrandom )
	if [[ $2 == 0 ]]; then
		systemctl stop libraryrandom
	else
		mpc random 0
		plL=$( mpc playlist | wc -l )
		mpc listall | shuf -n 3 | mpc add
		mpc play $(( plL +1 ))
		systemctl start libraryrandom
	pushstream playlist playlist playlist
	pushstream mpdoptions librandom $2
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
	mpc move $2 $3
	pushstream playlist playlist playlist
	;;
reboot )
	/usr/local/bin/gpiooff.py &> /dev/null
	/usr/local/bin/ply-image /srv/http/assets/img/splash.png
	mount | grep -q /mnt/MPD/NAS && umount -l /mnt/MPD/NAS/* &> /dev/null
	sleep 3
	[[ $2 == off ]] && shutdown -h now || shutdown -r now
	;;
esac
