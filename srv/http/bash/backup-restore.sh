#!/bin/bash

if [[ $1 == backup ]]; then
	backupfile=/srv/http/data/tmp/backup.gz
	rm -f $backupfile
	bsdtar \
		--exclude './system/version' \
		--exclude './tmp' \
		-czf $backupfile \
		-C /srv/http \
		data \
		&> /dev/null
	exit
fi

dirdata=/srv/http/data
diraddons=$dirdata/addons
dirsystem=$dirdata/system

version=$( cat $dirsystem/version )

systemctl restart mpd

if [[ $1 == restore ]]; then
	backupfile=$dirdata/tmp/backup.$2
	bsdtar -xpf $backupfile -C /srv/http
	rm $backupfile
elif [[ $1 == reset ]]; then # reset to default
	mv -f $diraddons /tmp
	rm -rf $dirdata
	/srv/http/bash/data-reset.sh
	mv -f /tmp/addons $dirdata
else # from copied data
	chown -R http:http "$dirdata"
	chown -R mpd:audio "$dirdata/mpd"
fi

echo $version > $dirsystem/version

# hostname
if [[ $( cat $dirsystem/hostname ) != RuneAudio ]]; then
	hostname=$( cat $dirsystem/hostname )
	hostnamelc=$( echo $hostname | tr '[:upper:]' '[:lower:]' )
	hostnamectl set-hostname $hostnamelc
	sed -i "s/\(.*\[\).*\(\] \[.*\)/\1$hostnamelc\2/" /etc/avahi/services/runeaudio.service
	sed -i "s/^\(ssid=\).*/\1$hostname/" /etc/hostapd/hostapd.conf &> /dev/null
	sed -i "s/\(netbios name = \"\).*/\1+ $hostnamelc +\"/" /etc/samba/smb.conf &> /dev/null
	sed -i "/ExecStart/ s/\\w*$/$hostname/" /etc/systemd/system/wsdd.service &> /dev/null
	sed -i "s/^\(name = \).*/\1$hostname" /etc/shairport-sync.conf &> /dev/null
	sed -i "s/^\(friendlyname = \).*/\1$hostname/" /etc/upmpdcli.conf &> /dev/null
fi
# chromium
if [[ -e /usr/bin/chromium ]]; then
	file=$dirsystem/localbrowser
	[[ -e $file-cursor ]] && sed -i -e "s/\(-use_cursor \).*/\1yes \&/" /etc/X11/xinit/xinitrc
	[[ -e $file-rotate ]] && cp $file-rotatefile /etc/X11/xorg.conf.d/99-raspi-rotate.conf
	[[ -e $file-screenoff ]] && sed -i 's/\(xset dpms 0 0 \).*/\1'$( cat $file-screenoff )' \&/' /etc/X11/xinit/xinitrc
	[[ -e $file-zoom ]] && sed -i 's/\(factor=.*\)/\1'$( cat $file-zoom )'/' /etc/X11/xinit/xinitrc
	if [[ ! -e $file ]]; then
		sed -i 's/\(console=\).*/\1tty1/' /boot/cmdline.txt
		enable=' getty@tty1'
		disable+=' localbrowser'
	fi
fi
# color
[[ -e $dirsystem/color ]] && color=1 && /srv/http/bash/setcolor.sh
# fstab
if ls $dirsystem/fstab-* &> /dev/null; then
	sed -i '\|/mnt/MPD/NAS| d' /etc/fstab
	rmdir /mnt/MPD/NAS/* &> /dev/null
	files=( $dirsystem/fstab-* )
	for file in "${files[@]}"; do
		cat $file >> /etc/fstab
		mkdir -p "/mnt/MPD/NAS/${file/*fstab-}"
	done
	mount -a
fi
# hostapd
if [[ -e /usr/bin/hostapd ]]; then
	if [[ -e $dirsystem/accesspoint-passphrase ]]; then
		passphrase=$( cat $dirsystem/accesspoint-passphrase )
		ip=$( cat $dirsystem/accesspoint-ip )
		iprange=$( cat $dirsystem/accesspoint-iprange )
		sed -i -e "/wpa\|rsn_pairwise/ s/^#*//
" -e "s/\(wpa_passphrase=\).*/\1$passphrase/
" /etc/hostapd/hostapd.conf
		sed -i -e "s/^\(dhcp-range=\).*/\1$iprange/
" -e "s/^\(dhcp-option-force=option:router,\).*/\1$ip/
" -e "s/^\(dhcp-option-force=option:dns-server,\).*/\1$ip/
" /etc/dnsmasq.conf
	fi
	[[ -e $dirsystem/accesspoint ]] && enable+=' hostapd'
fi
# login
[[ -e $dirsystem/login ]] && sed -i 's/\(bind_to_address\).*/\1         "127.0.0.1"/' /etc/mpd.conf
# mpd.conf
file=$dirsystem/mpd
if ls $file-* &> /dev/null; then
	[[ -e $file-autoupdate ]] &&    sed -i '1 i\auto_update           "yes"' /etc/mpd.conf
	[[ -e $file-buffer ]] &&        sed -i '1 i\audio_buffer_size     "'$( cat $dirsystem/mpd-buffer )'"' /etc/mpd.conf
	[[ -e $file-ffmpeg ]] &&        sed -i '/ffmpeg/ {n;s/\(enabled\s*"\).*/\1yes"/}' /etc/mpd.conf
	[[ -e $file-normalization ]] && sed -i '/^user/ a\volume_normalization  "yes"' /etc/mpd.conf
	[[ -e $file-replaygain ]] &&    sed -i 's/\(replaygain\s*\"\).*/\1'$( cat $dirsystem/mpd-replaygain )'"/' /etc/mpd.conf
fi
# netctl profiles
if ls $dirsystem/netctl-* &> /dev/null; then
	files=( $dirsystem/netctl-* )
	if [[ -n $files ]]; then
		for file in "${files[@]}"; do
			filename=$( basename $file )
			cp "$file" "/etc/netctl/${filename/netctl-}"
		done
		enable+=' netctl-auto@wlan0'
	fi
fi
# ntp
[[ -e $dirsystem/ntp ]] && sed -i "s/#*NTP=.*/NTP=$( cat $dirsystem/ntp )/" /etc/systemd/timesyncd.conf
# samba
if [[ -e /ust/bin/samba ]]; then
	file=$dirsystem/samba
	[[ -e $file-readonlysd ]] && sed -i '/path = .*SD/,/\tread only = no/ {/read only/ d}' /etc/samba/smb.conf
	[[ -e $file-readonlyusb ]] && sed -i '/path = .*USB/,/\tread only = no/ {/read only/ d}' /etc/samba/smb.conf
	[[ -e $file ]] && enable+=' smb wsdd'
fi
# shairport-sync
[[ -e /usr/bin/shairport-sync && -e $dirsystem/airplay ]] && enable+=' shairport-sync'
# snapcast
if [[ -e /usr/bin/snapserver ]]; then
	[[ -e $dirsystem/snapcast ]] && enable+=' snapserver'
	[[ -e $dirsystem/snapcast-latency ]] && sed -i '/OPTS=/ s/".*"/"--latency='$( cat $dirsystem/snapcast-latency )'"/' /etc/default/snapclient
fi
# spotify
if [[ -e /usr/bin/spotify ]]; then
	[[ -e $dirsystem/spotify ]] && enable+=' spotifyd'
	[[ -e $dirsystem/spotify-device ]] && sed -i "s/^\(device = \).*/\1$( cat $dirsystem/spotify-device )/" /etc/spotifyd.conf
fi
# timezone
[[ -e $dirsystem/timezone ]] && timedatectl set-timezone $( cat $dirsystem/timezone )
# upmpdcli
if [[ -e /usr/bin/upmpdcli && -e $dirsystem/upnp ]]; then
	file=$dirsystem/upnp
	setUpnp() {
		user=( $( cat $dirsystem/upnp-$1user ) )
		pass=( $( cat $dirsystem/upnp-$1pass ) )
		quality=( $( cat $dirsystem/upnp-$1quality 2> /dev/null ) )
		[[ $1 == qobuz ]] && qlty=formatid || qlty=quallity
		sed -i -e "s/#*\($1user = \).*/\1$user/
" -e "s/#*\($1pass = \).*/\1$pass/
" -e "s/#*\($1$qlty = \).*/\1$quality/
" /etc/upmpdcli.conf
	}
	[[ -e $file-gmusicuser ]] && setUpnp gmusic
	[[ -e $file-qobuzuser ]] && setUpnp qobuz
	[[ -e $file-tidaluser ]] && setUpnp tidal
	[[ -e $file-spotifyuser ]] && setUpnp spotify
	[[ -e $file ]] && enable+=' upmpdcli'
fi

# i2s audio
audioaplayname=$( cat $dirsystem/audio-aplayname 2> /dev/null )
audiooutput=$( cat $dirsystem/audio-output )

# remove before reinstate
sed -i -e '/dtparam=\|dtoverlay=/ d
' -e :a -e '/^\n*$/{$d;N;};/\n$/ba
' /boot/config.txt

# onboard bluetooth
if [[ -e $dirsystem/onboard-bluetooth ]]; then
	config+="\
dtoverlay=bcmbt
"
	reboot+="\
Enable on-board Bluetooth
"
fi
# onboard wifi
if [[ ! -e $dirsystem/onboard-wlan ]]; then
	systemctl disable --now netctl-auto@wlan0
	rmmod brcmfmac
fi
# wifi regdom
if [[ -e $dirsystem/wlanregdom ]]; then
	regdom=$( cat $dirsystem/wlanregdom )
	sed -i 's/".*"/"'$regdom'"/' /etc/conf.d/wireless-regdom
	iw reg set $regdom
fi
# i2s
if grep -q "$audiooutput.*=>.*$audioaplayname" /srv/http/settings/system-i2smodules.php; then
	[[ -e $dirsystem/onboard-audio ]] && onoff=on || onoff=off
	config+="\
dtparam=audio=$onoff
"
	config+="\
dtparam=i2s=on
dtoverlay=$audioaplayname
"
	reboot+="\
Enable I2S Module
"
elif [[ ! -e $dirsystem/onboard-audio ]]; then
	config+="\
dtparam=audio=off
"
	reboot+="\
Disable on-board audio
"
else
	config+="\
dtparam=audio=on
"
fi

[[ -n $config ]] && echo -n "$config" >> /boot/config.txt

notify() {
	curl -s -X POST 'http://127.0.0.1/pub?id=restore' -d '{"restore":"'$1'"}' &> /dev/null
}

if [[ -z $reboot ]]; then
	[[ -n $disable ]] && systemctl -q disable --now $disable
	for item in $enable; do
		notify $item
		systemctl -q enable --now $item
	done
	[[ -z $color ]] && notify done || notify reload
	sleep 3
	systemctl restart mpd
else 
	echo -n "$reboot" > $dirdata/tmp/reboot
	[[ -n $disable ]] && systemctl -q disable $disable
	for item in $enable; do
		systemctl -q enable $item
	done
	notify done
fi
