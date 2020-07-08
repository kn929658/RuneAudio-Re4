#!/bin/bash

curlPage() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "system" }'
}
enable() {
	systemctl enable --now $1
	touch $dirsystem/$2
	curlPage
}
disable() {
	systemctl disable --now $1
	rm $dirsystem/$2
	curlPage
}
changeSetting() {
	systemctl try-restart $1
	echo $3 > $dirsystem/$2
	curlPage
}

dirsystem=/srv/http/data/system
filereboot=/srv/http/data/tmp/reboot

if [[ $1 == airplay ]]; then
	[[ $2 == true ]] && enable shairport-sync $1 || disable shairport-sync $1
elif [[ $1 == autoplay ]]; then
	[[ $2 == true ]] && touch $dirsystem/autoplay || rm $dirsystem/autoplay
	curlPage
if [[ $1 == bluetooth ]]; then
	if [[ $2 == true ]]; then
		! grep -q 'dtoverlay=bcmbt' /boot/config.txt && echo dtoverlay=bcmbt >> /boot/config.txt
		touch $dirsystem/onboard-bluetooth
	else
		systemctl stop bluetooth
		sed -i '/dtoverlay=bcmbt/ d' /boot/config.txt
		rm $dirsystem/onboard-bluetooth
	fi
	echo "$3" > $filereboot
	curlPage
if [[ $1 == hostname ]]; then
	hostnamectl set-hostname $2
	sed -i "s/\(--hostname \).*/\1$2/" /etc/systemd/system/wsdd.service
	sed -i "s/^\(ssid=\).*/\1$2/" /etc/hostapd/hostapd.conf
	sed -i '/^\tname =/ s/".*"/"'$2'"/' /etc/shairport-sync.conf
	sed -i "s/^\(friendlyname = \).*/\1$2/" /etc/upmpdcli.conf
	rm -f /root/.config/chromium/SingletonLock
	systemctl daemon-reload
	systemctl try-restart avahi-daemon hostapd mpd smb wsdd shairport-sync shairport-meta upmpdcli
	systemctl -q is-active bluetooth && bluetoothctl system-alias $2
	echo $2 > $dirsystem/hostname
	curlPage
if [[ $1 == i2smodule ]]; then
	grep -q 'dtoverlay=gpio' /boot/config.txt && gpio=1
	grep -q 'dtoverlay=bcmbt' /boot/config.txt && bt=1
	sed -i '/dtparam=\|dtoverlay=\|^$/ d' /boot/config.txt
	[[ -n $gpio ]] && echo dtoverlay=gpio >> /boot/config.txt
	[[ -n $bt ]] && echo dtoverlay=bcmbt >> /boot/config.txt
	if [[ $2 != none ]]; then
		echo "\
dtparam=audio=off
dtparam=i2s=on
dtoverlay=$2\
" > /boot/config.txt
		rm -f $dirsystem/onboard-audio
	else
		echo dtparam=audio=on > /boot/config.txt
		touch $dirsystem/onboard-audio
	fi
	echo $2 > $dirsystem/audio-aplayname
	echo $3 > $dirsystem/audio-output
	echo "$4" > $filereboot
	curlPage
if [[ $1 == localbrowser ]]; then
	if [[ $2 == true ]]; then
		enable localbrowser $1
		systemctl disable getty@tty1
		sed -i 's/\(console=\).*/\1tty3 plymouth.enable=0 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
	else
		disable localbrowser $1
		systemctl enable getty@tty1
		sed -i 's/\(console=\).*/\1tty1/' /boot/cmdline.txt
		/usr/local/bin/ply-image /srv/http/assets/img/splash.png
	fi
if [[ $1 == localbrowserset ]]; then # rotate cursor screenoff zoom
	path=$dirsystem/localbrowser
	rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
	if [[ $1 == NORMAL ]]; then
		rm -f $rotateconf $path-rotatefile
	else
		case $2 in
			CW )  matrix='0 1 0 -1 0 1 0 0 1';;
			CCW ) matrix='0 -1 1 1 0 0 0 0 1';;
			UD )  matrix='-1 0 1 0 -1 1 0 0 1';;
		esac
		sed -e "s/ROTATION_SETTING/$2/
		" -e "s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf | tee $rotateconf $path-rotatefile
	fi
	ln -sf /srv/http/assets/img/{$1,splash}.png
	if [[ $2 == 1 ]]; then
		touch $path-cursor
		cursor=yes
	else
		rm $path-cursor
		cursor=no
	fi
	[[ $3 != 0 ]] && echo $3 > $path-screenoff || rm $path-screenoff
	[[ $4 != 1 ]] && echo $4 > $path-zoom || rm $path-zoom
	sed -i -e 's/\(-use_cursor \).*/\1"'$cursor'" \&/
	' -e 's/\(xset dpms 0 0 \).*/\1"'$3'" \&/
	' -e 's/\(factor=\).*/\1"'$4'"/
	' /etc/X11/xinit/xinitrc
	systemctl restart localbrowser
	curlPage
elif [[ $1 == login ]]; then
	if [[ $2 == true ]]; then
		touch $dirsystem/login
		ip=127.0.0.1
	else
		rm $dirsystem/login
		ip=0.0.0.0
	fi
	sed -i '/^bind_to_address/ s/".*"/"'$ip'"/' /etc/mpd.conf
	systemctl restart mpd
	curlPage
elif [[ $1 == mpdscribble ]]; then
	[[ $2 == true ]] && enable mpdscribble@mpd $1 || disable mpdscribble@mpd $1
elif [[ $1 == mpdscribbleset ]]; then
	sed -i -e "s/^\(username =\).*/\1 $2/
	" -e "s/^\(password =\).*/\1 $3/
	" /etc/mpdscribble.conf
	echo -e "$2\n$3" > $dirsystem/mpdscribble-login
	touch $dirsystem/mpdscribble
	systemctl -q is-active mpdscribble@mpd && systemctl restart mpdscribble@mpd || systemctl enable --now mpdscribble@mpd
	curlPage
elif [[ $1 == onboardaudio ]]; then
	if [[ $2 == true ]]; then
		onoff=on
		touch $dirsystem/onboard-audio
	else
		onoff=off
		rm $dirsystem/onboard-audio
	fi
	sed -i "s/\(dtparam=audio=\).*/\1$onoff/" /boot/config.txt
	echo "$3" > $filereboot
	curlPage
elif [[ $1 == reboot ]]; then
	rm -f $filereboot
	/usr/local/bin/gpiooff.py &> /dev/null
	/usr/local/bin/ply-image /srv/http/assets/img/splash.png
	umount -l /mnt/MPD/NAS/* &> /dev/null
	sleep 3
	rm -f /srv/http/data/tmp/*
	shutdown -r now
elif [[ $1 == regional ]]; then
	sed -i "s/^\(NTP=\).*/\1$2/" /etc/systemd/timesyncd.conf
	sed -i 's/".*"/"'$3'"/' /etc/conf.d/wireless-regdom
	iw reg set $3
	[[ $2 == pool.ntp.org ]] && rm $dirsystem/ntp || echo $2 > $dirsystem/ntp
	[[ $3 == 00 ]] && rm $dirsystem/wlanregdom || echo $3 > $dirsystem/wlanregdom
	curlPage
elif [[ $1 == samba ]]; then
	[[ $2 == true ]] && enable samba $1 || disable samba $1
elif [[ $1 == sambaset ]]; then
	smbconf=/etc/samba/smb.conf
	sed -i '/read only = no/ d' $smbconf
	rm -f $dirsystem/samba-*
	if [[ $2 == true ]]; then
		sed -i '/path = .*SD/ a\tread only = no' $smbconf
		touch $dirsystem/samba-readonlysd
	fi
	if [[ $3 == true ]]; then
		sed -i '/path = .*USB/ a\tread only = no' $smbconf
		touch $dirsystem/samba-readonlyusb
	fi
	systemctl restart smb wsdd
	curlPage
elif [[ $1 == snapcast ]]; then
	[[ $2 == true ]] && enable snapserver $1 || disable snapserver $1
	/srv/http/bash/mpd-conf.sh
	/srv/http/bash/snapcast.sh serverstop
elif [[ $1 == snapclient ]]; then
	[[ $2 == true ]] && touch $dirsystem/snapclient || rm $dirsystem/snapclient
	curlPage
elif [[ $1 == snapclientset ]]; then
	sed -i '/OPTS=/ s/".*"/"--latency="'$2'"/' /etc/default/snapclient
	changeSetting snapclient snapcast-latency $2
elif [[ $1 == soundprofile ]]; then
	if [[ $2 == true ]]; then
		[[ -e $dirsystem/soundprofile ]] && profile=$( cat $dirsystem/soundprofile ) || profile=RuneAudio
	else
		profile=default
	fi
	/srv/http/bash/system-soundprofile.sh $profile
	curlPage
elif [[ $1 == soundprofileset ]]; then
	if [[ $2 != [0-9]* ]]; then
		/srv/http/bash/system-soundprofile.sh $2
		echo $2 > $dirsystem/soundprofile
	else
		/srv/http/bash/system-soundprofile.sh $2 $3 $4 $5
		echo $2 $3 $4 $5 > $dirsystem/soundprofile
	fi
	curlPage
elif [[ $1 == spotify ]]; then
	[[ $2 == true ]] && enable spotifyd $1 || disable spotifyd $1
elif [[ $1 == spotifyset ]]; then
	changeSetting spotifyd spotify-device $2
elif [[ $1 == streaming ]]; then
	[[ $2 == true ]] && touch $dirsystem/streaming || rm $dirsystem/streaming
	curlPage
	/srv/http/bash/mpd-conf.sh
elif [[ $1 == timezone ]]; then
	timedatectl set-timezone $2
	echo $2 > $dirsystem/timezone
	curlPage
elif [[ $1 == upnp ]]; then
	[[ $2 == true ]] && enable upmpdcli $1 || disable upmpdcli $1
elif [[ $1 == wlan ]]; then
	if [[ $2 == true ]]; then
		modprobe brcmfmac
		enable netctl-auto@wlan0 onboard-wlan
	else
		enable netctl-auto@wlan0 onboard-wlan
		rmmod brcmfmac
	fi
else

fi
