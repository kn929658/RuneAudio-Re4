#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

if grep -q usr/local/bin /etc/systemd/system/bootsplash.service &> /dev/null; then
	sed -i 's|usr/local/bin|srv/http/bash|' /etc/systemd/system/bootsplash.service
	systemctl try-restart bootsplash
fi
if grep -q usr/local/bin /etc/systemd/system/wsdd.service &> /dev/null; then
	sed -i 's|usr/local/bin|srv/http/bash|' /etc/systemd/system/wsdd.service
	systemctl daemon-reload
	systemctl try-restart wsdd
fi

dirsystem=/srv/http/data/system

if [[ ! -e /srv/http/data/system/gpio.json ]] && python -c "import RPi.GPIO" &> /dev/null; then
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
	> $dirsystem/soundprofile-custom
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

getinstallzip

if [[ ! -e /srv/http/data/mpd/albumC ]]; then
	/srv/http/bash/cmd.sh list
	/srv/http/bash/cmd.sh listcue
	/srv/http/bash/cmd.sh count
fi

installfinish

systemctl restart mpdidle

restartlocalbrowser
