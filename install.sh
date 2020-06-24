#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

hwcode=$( grep Revision /proc/cpuinfo | tail -c 4 | cut -c1-2 )
if [[ $hwcode =~ ^(09|0c)$ ]]; then
	sed -i -e '$ a\dtoverlay=vc4-kms-v3d
' -e '/dtparam=audio=on/ d
' /boot/config.txt
fi

file=/srv/http/data/system/audio-aplayname
file1=/srv/http/data/system/audio-output
if grep -q 'bcm2835 ALSA_1' $file; then
	if [[ $hwcode =~ ^(09|0c)$ ]]; then
		echo 'vc4-hdmi' > $file
		echo 'On-board - HDMI' > $file1
	else
		echo 'bcm2835 Headphones' > $file
		echo 'On-board - Headphone' > $file1
	fi
fi

getinstallzip

installfinish $@

restartlocalbrowser
