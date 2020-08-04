#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart "$1"

getinstallzip

if ! mpc | grep -q  ^Updating && [[ -e /srv/http/data/mpd/mpd.db ]] ; then
	/srv/http/bash/cmd.sh list

	echo -e "$bar Import *.cue data ..."

	/srv/http/bash/cmd.sh listcue
	/srv/http/bash/cmd.sh count
fi
mkdir -p /srv/http/data/embedded
chown http:http /srv/http/data/embedded /srv/http/data/webradios/*

installfinish

systemctl restart mpdidle

restartlocalbrowser
