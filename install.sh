#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

hwcode=$( grep Revision /proc/cpuinfo | tail -c 4 | cut -c1-2 )
file=/srv/http/data/system/audio-aplayname
file1=/srv/http/data/system/audio-output
if grep -q 'bcm2835 ALSA_1' $file; then
	if [[ $hwcode =~ ^(09|0c)$ ]]; then
		echo 'bcm2835 HDMI 1' > $file
		echo 'On-board - HDMI' > $file1
	else
		echo 'bcm2835 Headphones' > $file
		echo 'On-board - Headphone' > $file1
	fi
fi

getinstallzip

installfinish $@

restartlocalbrowser
