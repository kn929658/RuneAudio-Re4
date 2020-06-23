#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

hwcode=$( grep Revision /proc/cpuinfo )
if [[ ${hwcode: -3:2} =~ ^(09|0c)$ ]]; then
	sed -i -e '$ a\dtoverlay=vc4-kms-v3d
' -e '/dtparam=audio=on/ d
' /boot/config.txt
fi

getinstallzip

installfinish $@

restartlocalbrowser
