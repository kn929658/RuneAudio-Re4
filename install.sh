#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

echo '
[RR]
SigLevel = Optional TrustAll
Server = https://rern.github.io/$arch
' >> /etc/pacman.conf

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

getinstallzip

installfinish $@

restartlocalbrowser
