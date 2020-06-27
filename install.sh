#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

if grep -q rewrite /etc/nginx/nginx.conf; then
	nginx=1
	sed -i -e '/rewrite/ d
' -e '/cache busting/ {n;d}
' -e '/try_files/ i\
		location ~* (.+)\\.(?:\\d\\d\\d\\d\\d\\d\\d\\d\\d\\d)\\.(css|js|jpg|jpeg|gif|png|svg|ttf|woff)$ {
' /etc/nginx/nginx.conf
fi

if ! grep -q [RR] /etc/pacman.conf; then
	echo '
[RR]
SigLevel = Optional TrustAll
Server = https://rern.github.io/$arch
' >> /etc/pacman.conf
fi

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

getinstallzip

installfinish $@

[[ $nginx ]] && restartnginx

restartlocalbrowser
