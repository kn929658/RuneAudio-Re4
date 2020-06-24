#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

chown http:http /etc/netctl/*

getinstallzip

installfinish $@

restartlocalbrowser
