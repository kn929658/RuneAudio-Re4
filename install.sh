#!/bin/bash

alias=rre3

. /srv/http/bash/addons-functions.sh

file=/srv/http/data/system/display
grep -q progressbar $file || sed -i '/radioelapsed/ i\    "progressbar": true,' $file
grep -q coversmall $file || sed -i '/"cover"/ a\    "coversmall": false,' $file
sed -i -e '/color\|coverlarge\|hidecover\|order\|share\|updating_db\|update\|volumenone/ d
' -e 's/barsauto/barsalways/
' -e "/$( grep -B1 } /srv/http/data/system/display | head -1 )/ s/,$//
" $file

if grep -q 'netbios name' /etc/samba/smb.conf; then
	sed -i -e '/netbios name\|workgroup\|socket options\|write cache size\|encrypt passwords/ d
	' -e '/domain master/,/dns proxy/ d
	' /etc/samba/smb.conf
	systemctl disable --now nmb
	systemctl try-restart smb wsdd
fi

sed -i 's/On-board - 3.5mm/On-board - Headphone/' /srv/http/data/system/audio-output
if [[ ! -e /etc/udev/rules.d/bluetooth.rules ]]; then
	echo 'ACTION=="add", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh bt udev"
ACTION=="remove", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh bt"
' > /etc/udev/rules.d/bluetooth.rules
	udevadm control --reload-rules && udevadm trigger
fi

chown http:http /etc/fstab
chown -R http:http /etc/netctl /etc/systemd/network

if grep -q startstop /etc/shairport-sync.conf; then
	rm -f /srv/http/bash/shairport-startstop.sh
	sed -i 's/-startstop//' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync
fi

playerfile=/srv/http/data/system/player
if [[ ! -e $playerfile ]]; then
	echo '"mpd":true,"airplay":false,"snapclient":false,"spotify":false,"upnp":false' > $playerfile
	touch $playerfile-mpd
	systemctl try-restart shairport-sync snapclient spotifyd &> /dev/null
fi

if [[ -e /usr/bin/upmpdcli ]]; then
	dir=/etc/systemd/system/upmpdcli.service.d
	if [[ ! -e $dir ]]; then
		mkdir -p $dir
		echo '[Service]
User=http' > $dir/override.conf
		systemctl daemon-reload
		systemctl try-restart upmpdcli
	fi
fi
systemctl restart mpd

installstart $@

getinstallzip

installfinish $@

restartlocalbrowser
