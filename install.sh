#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

if grep -q shairport-startstop /etc/shairport-sync.conf; then
	sed -i 's/shairport.*sh/shairport.sh/' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync
fi

installstart $@

if [[ ! -e /usr/bin/mpdscribble ]]; then
	[[ $( lscpu | awk '/CPU\(s\):/ {print $NF}' ) == 4 ]] && arch=armv7h || arch=armv6h
	wget -q https://github.com/rern/rern.github.io/raw/master/$arch/mpdscribble-0.22-14-$arch.pkg.tar.xz
	pacman -U --noconfirm mpdscribble*
	rm mpdscribble*
fi

if [[ $( cat /srv/http/data/addons/rre4 ) > 20200627 ]]; then
	getinstallzip

	installfinish $@

	restartlocalbrowser
	
	exit
fi

#-------------------------------------------------------------------------------------------------------
if [[ ! -e /etc/udev/rules.d/90-alsa-restore.rules ]]; then
	rm /var/lib/alsa/asound.state
	alsactl store
	cp /{usr/lib,etc}/udev/rules.d/90-alsa-restore.rules
	sed -i '/^TEST/ s/^/#/' /etc/udev/rules.d/90-alsa-restore.rules
	
	systemctl -q disable haveged
	sed -i -e '/^SystemCallFilter\|SystemCallError/ d
' -e '/SystemCallArchitectures/ a\
SystemCallFilter=@system-service\
SystemCallFilter=~@mount\
SystemCallErrorNumber=EPERM
' /usr/lib/systemd/system/haveged.service
	systemctl -q enable --now haveged
	rm -f /etc/haveged.service
	
	chmod 755 /etc /usr
fi

if grep -q rewrite /etc/nginx/nginx.conf; then
	nginx=1
	sed -i -e '/rewrite/ d
' -e '/cache busting/ {n;d}
' -e '/try_files/ i\
		location ~* (.+)\\.(?:\\d\\d\\d\\d\\d\\d\\d\\d\\d\\d)\\.(css|js|jpg|jpeg|gif|png|svg|ttf|woff)$ {
' /etc/nginx/nginx.conf
fi

if ! grep -q '\[RR\]' /etc/pacman.conf; then
	echo '
[RR]
SigLevel = Optional TrustAll
Server = https://rern.github.io/$arch
' >> /etc/pacman.conf
fi

sed -i '/dtoverlay=vc4-kms-v3d/ d' /boot/config.txt

getinstallzip

installfinish $@

if [[ $nginx ]]; then
	systemctl restart mpd
	restartnginx
fi

restartlocalbrowser
