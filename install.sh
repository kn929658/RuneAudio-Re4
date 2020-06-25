#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

hwcode=$( grep Revision /proc/cpuinfo )
[[ ${hwcode: -4:1} == 0 ]] && repo=armv6h || repo=armv7h
echo "
[RR]
SigLevel = Optional TrustAll
Server = https://rern.github.io/$repo
" >> /etc/pacman.conf

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

getinstallzip

installfinish $@

restartlocalbrowser
