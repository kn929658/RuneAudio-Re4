#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

if [[ -e /etc/systemd/system/bootsplash.service ]]; then
	sed -i 's|usr/local/bin|srv/http/bash|' /etc/systemd/system/bootsplash.service
	systemctl try-restart bootsplash
fi
if [[ -e /etc/systemd/system/wsdd.service ]]; then
	sed -i 's|usr/local/bin|srv/http/bash|' /etc/systemd/system/wsdd.service
	systemctl daemon-reload
	systemctl try-restart wsdd
fi

dirsystem=/srv/http/data/system

if ls /usr/lib/python*/site-packages/RPi.GPIO* &> /dev/null; then
	echo '{
  "name": {
    "11": "DAC",
    "13": "PreAmp",
    "15": "Amp",
    "16": "Subwoofer"
  },
  "on": {
    "on1": 11,
    "ond1": 2,
    "on2": 13,
    "ond2": 2,
    "on3": 15,
    "ond3": 2,
    "on4": 16
  },
  "off": {
    "off1": 16,
    "offd1": 2,
    "off2": 15,
    "offd2": 2,
    "off3": 13,
    "offd3": 2,
    "off4": 11
  },
  "timer": 5
}' > $dirsystem/gpio.json
	usermod -a -G root http
fi

if [[ -e $dirsystem/sound-eth0mtu ]]; then
	echo \
	$( cat $dirsystem/sound-eth0mtu ) \
	$( cat $dirsystem/sound-eth0txq ) \
	$( cat $dirsystem/sound-sysswap ) \
	$( cat $dirsystem/sound-syslatency ) \
	> $dirsystem/soundprofile
	rm $dirsystem/sound-*
fi
if grep -q shairport-startstop /etc/shairport-sync.conf; then
	sed -i 's/shairport.*sh/shairport.sh/' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync
fi

installstart "$1"

if [[ ! -e /usr/bin/mpdscribble ]]; then
	[[ $( lscpu | awk '/CPU\(s\):/ {print $NF}' ) == 4 ]] && arch=armv7h || arch=armv6h
	wget -q https://github.com/rern/rern.github.io/raw/master/$arch/mpdscribble-0.22-14-$arch.pkg.tar.xz
	pacman -U --noconfirm mpdscribble*
	rm mpdscribble*
	cp /usr/share/mpdscribble/mpdscribble.conf.example /etc/mpdscribble.conf
fi

if [[ $( cat /srv/http/data/addons/rre4 ) > 20200627 ]]; then
	getinstallzip

	installfinish

	restartlocalbrowser
	
	exit
fi

#-------------------------------------------------------------------------------------------------------
if [[ ! -e /etc/udev/rules.d/90-alsa-restore.rules ]]; then
	rm /var/lib/alsa/asound.state
	alsactl store
	cp /{usr/lib,etc}/udev/rules.d/90-alsa-restore.rules
	sed -i '/^TEST/ s/^/#/' /etc/udev/rules.d/90-alsa-restore.rules
	
	systemctl -q disable haveged
	sed -i -e '/^SystemCallFilter\|SystemCallError/ d
' -e '/SystemCallArchitectures/ a\
SystemCallFilter=@system-service\
SystemCallFilter=~@mount\
SystemCallErrorNumber=EPERM
' /usr/lib/systemd/system/haveged.service
	systemctl daemon-reload
	systemctl -q enable --now haveged
	rm -f /etc/haveged.service
	
	chmod 755 /etc /usr
fi

if grep -q rewrite /etc/nginx/nginx.conf; then
	nginx=1
	sed -i -e '/rewrite/ d
' -e '/cache busting/ {n;d}
' -e '/try_files/ i\
		location ~* (.+)\\.(?:\\d\\d\\d\\d\\d\\d\\d\\d\\d\\d)\\.(css|js|jpg|jpeg|gif|png|svg|ttf|woff)$ {
' /etc/nginx/nginx.conf
fi

if ! grep -q '\[RR\]' /etc/pacman.conf; then
	echo '
[RR]
SigLevel = Optional TrustAll
Server = https://rern.github.io/$arch
' >> /etc/pacman.conf
fi

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

getinstallzip

installfinish

if [[ $nginx ]]; then
	systemctl restart mpd
	restartnginx
fi

restartlocalbrowser
