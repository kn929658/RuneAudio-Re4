#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

if [[ ! -e /srv/http/data/mpd/counts ]]; then
	for type in albumartist composer date genre; do
		printf -v $type '%s' $( mpc list $type | awk NF | wc -l )
	done
	for type in NAS SD USB; do
		printf -v $type '%s' $( mpc ls $type 2> /dev/null | wc -l )
	done
	stats=( $( mpc stats | head -3 | awk '{print $2,$4,$6}' ) )
	counts='
	  "album"       : '$(( ialbum + ${stats[1]} ))'
	, "albumartist" : '$(( ialbumartist + albumartist ))'
	, "artist"      : '$(( iartist + ${stats[0]} ))'
	, "composer"    : '$(( icomposer + composer ))'
	, "coverart"    : '$( ls -1q /srv/http/data/coverarts | wc -l )'
	, "date"        : '$(( idate + date ))'
	, "genre"       : '$(( igenre + genre ))'
	, "nas"         : '$NAS'
	, "sd"          : '$SD'
	, "title"       : '$(( ititle + ${stats[2]} ))'
	, "usb"         : '$USB'
	, "webradio"    : '$( ls -U /srv/http/data/webradios/* 2> /dev/null | wc -l )
	
	echo {$counts} | jq . > /srv/http/data/mpd/counts
fi

if [[ ! -e /srv/http/data/mpd/album ]]; then
	for type in album albumartist artist composer date genre; do
		mpc list $type | sed '/^$/ d' > /srv/http/data/mpd/$type
	done
fi
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

installfinish

systemctl restart mpdidle

restartlocalbrowser
