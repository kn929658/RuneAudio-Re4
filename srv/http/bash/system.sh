#!/bin/bash

dirsystem=/srv/http/data/system
filereboot=/srv/http/data/tmp/reboot

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "system" }'
}
enable() {
	systemctl enable --now $1
	touch $dirsystem/$2
	pushRefresh
}
disable() {
	systemctl disable --now $1
	rm $dirsystem/$2
	pushRefresh
}
changeSetting() {
	systemctl try-restart $1
	echo $3 > $dirsystem/$2
	pushRefresh
}


case ${args[0]} in

airplay )
	[[ ${args[1]} == true ]] && enable shairport-sync airplay || disable shairport-sync airplay
	;;
autoplay )
	[[ ${args[1]} == true ]] && touch $dirsystem/autoplay || rm $dirsystem/autoplay
	pushRefresh
	;;
bluetooth )
	if [[ ${args[1]} == true ]]; then
		! grep -q 'dtoverlay=bcmbt' /boot/config.txt && echo dtoverlay=bcmbt >> /boot/config.txt
		touch $dirsystem/onboard-bluetooth
	else
		systemctl stop bluetooth
		sed -i '/dtoverlay=bcmbt/ d' /boot/config.txt
		rm $dirsystem/onboard-bluetooth
	fi
	echo "${args[2]}" > $filereboot
	pushRefresh
	;;
hostname )
	hostnamectl set-hostname ${args[1]}
	sed -i "s/\(--hostname \).*/\1${args[1]}/" /etc/systemd/system/wsdd.service
	sed -i "s/^\(ssid=\).*/\1${args[1]}/" /etc/hostapd/hostapd.conf
	sed -i '/^\tname =/ s/".*"/"'${args[1]}'"/' /etc/shairport-sync.conf
	sed -i "s/^\(friendlyname = \).*/\1${args[1]}/" /etc/upmpdcli.conf
	rm -f /root/.config/chromium/SingletonLock
	systemctl daemon-reload
	systemctl try-restart avahi-daemon hostapd mpd smb wsdd shairport-sync shairport-meta upmpdcli
	systemctl -q is-active bluetooth && bluetoothctl system-alias ${args[1]}
	echo ${args[1]} > $dirsystem/hostname
	pushRefresh
	;;
i2smodule )
	grep -q 'dtoverlay=gpio' /boot/config.txt && gpio=1
	grep -q 'dtoverlay=bcmbt' /boot/config.txt && bt=1
	sed -i '/dtparam=\|dtoverlay=\|^$/ d' /boot/config.txt
	[[ -n $gpio ]] && echo dtoverlay=gpio >> /boot/config.txt
	[[ -n $bt ]] && echo dtoverlay=bcmbt >> /boot/config.txt
	if [[ ${2:0:7} != bcm2835 ]]; then
		echo "\
dtparam=audio=off
dtparam=i2s=on
dtoverlay=${args[1]}\
" >> /boot/config.txt
		rm -f $dirsystem/onboard-audio
	else
		echo dtparam=audio=on >> /boot/config.txt
		touch $dirsystem/onboard-audio
	fi
	echo ${args[1]} > $dirsystem/audio-aplayname
	echo ${args[2]} > $dirsystem/audio-output
	echo "${args[3]}" > $filereboot
	pushRefresh
	;;
localbrowser )
	if [[ ${args[1]} == true ]]; then
		enable localbrowser $1
		systemctl disable getty@tty1
		sed -i 's/\(console=\).*/\1tty3 plymouth.enable=0 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
	else
		disable localbrowser $1
		systemctl enable getty@tty1
		sed -i 's/\(console=\).*/\1tty1/' /boot/cmdline.txt
		/usr/local/bin/ply-image /srv/http/assets/img/splash.png
	fi
	pushRefresh
	;;
localbrowserset )
	path=$dirsystem/localbrowser
	rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
	if [[ $1 == NORMAL ]]; then
		rm -f $rotateconf $path-rotatefile
	else
		case ${args[1]} in
			CW )  matrix='0 1 0 -1 0 1 0 0 1';;
			CCW ) matrix='0 -1 1 1 0 0 0 0 1';;
			UD )  matrix='-1 0 1 0 -1 1 0 0 1';;
		esac
		sed -e "s/ROTATION_SETTING/${args[1]}/
		" -e "s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf | tee $rotateconf $path-rotatefile
	fi
	ln -sf /srv/http/assets/img/{$1,splash}.png
	if [[ ${args[1]} == 1 ]]; then
		touch $path-cursor
		cursor=yes
	else
		rm $path-cursor
		cursor=no
	fi
	[[ ${args[2]} != 0 ]] && echo ${args[2]} > $path-screenoff || rm $path-screenoff
	[[ ${args[3]} != 1 ]] && echo ${args[3]} > $path-zoom || rm $path-zoom
	sed -i -e 's/\(-use_cursor \).*/\1"'$cursor'" \&/
	' -e 's/\(xset dpms 0 0 \).*/\1"'${args[2]}'" \&/
	' -e 's/\(factor=\).*/\1"'${args[3]}'"/
	' /etc/X11/xinit/xinitrc
	systemctl restart localbrowser
	pushRefresh
	;;
login )
	if [[ ${args[1]} == true ]]; then
		touch $dirsystem/login
		ip=127.0.0.1
	else
		rm $dirsystem/login
		ip=0.0.0.0
	fi
	sed -i '/^bind_to_address/ s/".*"/"'$ip'"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	;;
mpdscribble )
	[[ ${args[1]} == true ]] && enable mpdscribble@mpd $1 || disable mpdscribble@mpd $1
	systemctl -q is-active mpdscribble@mpd && echo 0
	;;
mpdscribbleset )
	sed -i -e "s/^\(username =\).*/\1 ${args[1]}/
	" -e "s/^\(password =\).*/\1 ${args[2]}/
	" /etc/mpdscribble.conf
	echo -e "${args[1]}\n${args[2]}" > $dirsystem/mpdscribble-login
	touch $dirsystem/mpdscribble
	systemctl restart mpdscribble@mpd && systemctl enable mpdscribble@mpd || systemctl disable mpdscribble@mpd
	systemctl -q is-active mpdscribble@mpd && echo 0
	pushRefresh
	;;
onboardaudio )
	if [[ ${args[1]} == true ]]; then
		onoff=on
		touch $dirsystem/onboard-audio
	else
		onoff=off
		rm $dirsystem/onboard-audio
	fi
	sed -i "s/\(dtparam=audio=\).*/\1$onoff/" /boot/config.txt
	echo "${args[2]}" > $filereboot
	pushRefresh
	;;
reboot )
	rm -f $filereboot
	/usr/local/bin/gpiooff.py &> /dev/null
	/usr/local/bin/ply-image /srv/http/assets/img/splash.png
	umount -l /mnt/MPD/NAS/* &> /dev/null
	sleep 3
	rm -f /srv/http/data/tmp/*
	shutdown -r now
	;;
regional )
	sed -i "s/^\(NTP=\).*/\1${args[1]}/" /etc/systemd/timesyncd.conf
	sed -i 's/".*"/"'${args[2]}'"/' /etc/conf.d/wireless-regdom
	iw reg set ${args[2]}
	[[ ${args[1]} == pool.ntp.org ]] && rm $dirsystem/ntp || echo ${args[1]} > $dirsystem/ntp
	[[ ${args[2]} == 00 ]] && rm $dirsystem/wlanregdom || echo ${args[2]} > $dirsystem/wlanregdom
	pushRefresh
	;;
samba )
	[[ ${args[1]} == true ]] && enable 'smb wsdd' $1 || disable 'smb wsdd' $1
	;;
sambaset )
	smbconf=/etc/samba/smb.conf
	sed -i '/read only = no/ d' $smbconf
	rm -f $dirsystem/samba-*
	if [[ ${args[1]} == true ]]; then
		sed -i '/path = .*SD/ a\tread only = no' $smbconf
		touch $dirsystem/samba-readonlysd
	fi
	if [[ ${args[2]} == true ]]; then
		sed -i '/path = .*USB/ a\tread only = no' $smbconf
		touch $dirsystem/samba-readonlyusb
	fi
	systemctl restart smb wsdd
	pushRefresh
	;;
snapcast )
	[[ ${args[1]} == true ]] && enable snapserver $1 || disable snapserver $1
	/srv/http/bash/mpd-conf.sh
	/srv/http/bash/snapcast.sh serverstop
	;;
snapclient )
	[[ ${args[1]} == true ]] && touch $dirsystem/snapclient || rm $dirsystem/snapclient
	pushRefresh
	;;
snapclientset )
	sed -i '/OPTS=/ s/".*"/"--latency="'${args[1]}'"/' /etc/default/snapclient
	changeSetting snapclient snapcast-latency ${args[1]}
	;;
soundprofile )
	if [[ ${args[1]} == true ]]; then
		echo RuneAudio > $dirsystem/soundprofile
		profile=RuneAudio
	else
		rm $dirsystem/soundprofile
		profile=default
	fi
	/srv/http/bash/system-soundprofile.sh $profile
	pushRefresh
	;;
soundprofileset )
	if [[ ${args[1]} != [0-9]* ]]; then
		/srv/http/bash/system-soundprofile.sh ${args[1]}
		echo ${args[1]} > $dirsystem/soundprofile
	else
		/srv/http/bash/system-soundprofile.sh ${args[1]} ${args[2]} ${args[3]} ${args[4]}
		echo ${args[1]} ${args[2]} ${args[3]} ${args[4]} > $dirsystem/soundprofile
	fi
	pushRefresh
	;;
spotify )
	[[ ${args[1]} == true ]] && enable spotifyd $1 || disable spotifyd $1
	;;
spotifyset )
	changeSetting spotifyd spotify-device ${args[1]}
	;;
statusbootlog )
	if [[ -e /tmp/bootlog ]]; then
		cat /tmp/bootlog
	else
		log=$( journalctl -b | sed -n '1,/Startup finished.*kernel/ p' )
		finish=$( sed 's/.*\(Startup.*\)/\1/' <<< ${log##*$'\n'} )
		echo "$finish<hr>$log" | tee /tmp/bootlog
	fi
	;;
streaming )
	[[ ${args[1]} == true ]] && touch $dirsystem/streaming || rm $dirsystem/streaming
	pushRefresh
	/srv/http/bash/mpd-conf.sh
	;;
timezone )
	timedatectl set-timezone ${args[1]}
	echo ${args[1]} > $dirsystem/timezone
	pushRefresh
	;;
upnp )
	[[ ${args[1]} == true ]] && enable upmpdcli $1 || disable upmpdcli $1
	;;
wlan )
	if [[ ${args[1]} == true ]]; then
		modprobe brcmfmac
		enable netctl-auto@wlan0 onboard-wlan
	else
		enable netctl-auto@wlan0 onboard-wlan
		rmmod brcmfmac
	fi
	pushRefresh
	;;
	
esac
