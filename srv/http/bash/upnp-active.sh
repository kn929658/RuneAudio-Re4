#!/bin/bash

playerfile=/srv/http/data/system/player
[[ -e $playerfile-upnp ]] && exit

urlnet=$( mpc playlist -f %file% | head -1 | sed 's|.*//\(.*\):.*|\1|' | cut -d. -f1-2 )
gatewaynet=$( ip route | awk '/default/ {print $3}' | cut -d. -f1-2 )
if [[ $gatewaynet == $urlnet ]]; then
	echo '"mpd":false,"airplay":false,"snapclient":false,"spotify":false,"upnp":true' > $playerfile
	rm -f $playerfile-*
	touch $playerfile-upnp
	systemctl try-restart shairport-sync snapclient spotifyd &> /dev/null
fi
