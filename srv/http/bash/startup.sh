#!/bin/bash

# reset player, tmp files
# set and connect wi-fi if pre-configured
# expand root partition (once)
# enable/disable wlan
# set sound profile if enabled
# set mpd-conf.sh
#   - list sound devices
#   - populate mpd.conf
#   - start mpd, mpdidle
# set autoplay if enabled
# disable wlan power saving
# check addons updates

dirsystem=/srv/http/data/system
playerfile=/srv/http/data/system/player

echo '"mpd":true,"airplay":false,"snapclient":false,"spotify":false,"upnp":false' > $playerfile
rm -f $playerfile-*
touch $playerfile-mpd
rm -rf /srv/http/data/tmp/*

if [[ -e /boot/wifi ]]; then
	ssid=$( grep '^ESSID' /boot/wifi | cut -d'"' -f2 )
	sed -i -e '/^#\|^$/ d' -e 's/\r//' /boot/wifi
	cp /boot/wifi "$dirsystem/netctl-$ssid"
	mv /boot/wifi "/etc/netctl/$ssid"
	chown http:http "$dirsystem/netctl-$ssid" "/etc/netctl/$ssid"
	netctl start "$ssid"
	systemctl enable netctl-auto@wlan0
fi

/boot/x.sh &> /dev/null

[[ -e $dirsystem/onboard-wlan ]] && ifconfig wlan0 up || rmmod brcmfmac

[[ -e $dirsystem/soundprofile ]] && /srv/http/bash/cmd-soundprofile.sh

/srv/http/bash/mpd-conf.sh # mpd start by this script

mountpoints=$( grep /mnt/MPD/NAS /etc/fstab | awk '{print $2}' )
if [[ -n "$mountpoints" ]]; then
	ip=$( grep '/mnt/MPD/NAS' /etc/fstab | tail -1 | cut -d' ' -f1 | sed 's|^//||; s|:*/.*$||' )
	sleep 10 # wait for network interfaces
	i=0
	while $( sleep 1 ); do
		ping -c 1 -w 1 $ip &> /dev/null && break
		
		(( i++ ))
		if (( i > 20 )); then
			echo 'NAS mount failed.<br><br><gr>Try reboot again.</gr>' > /srv/http/data/tmp/reboot
			curl -s -X POST 'http://127.0.0.1/pub?id=reload' -d 1
			exit
		fi
	done

	for mountpoint in $mountpoints; do
		mount $mountpoint
	done
fi

[[ ! -e /srv/http/data/mpd/mpd.db ]] && mpc rescan

[[ -e $dirsystem/autoplay ]] && mpc -q play

if [[ -z "$mountpoints" ]]; then
	sleep 10
	i=0
	while $( sleep 1 ); do
		 ip a show wlan0 &> /dev/null || (( i++ > 20 )) && break
	done
fi

wlans=$( ip a | grep 'wlan.:' | sed 's/.*: \(.*\):.*/\1/' )
if [[ -n "$wlans" ]]; then
	if [[ -e $dirsystem/accesspoint ]]; then
		ifconfig wlan0 $( grep router /etc/dnsmasq.conf | cut -d, -f2 )
		systemctl start dnsmasq hostapd
	fi
	
	sleep 15 # wait "power_save" ready for setting
	
	for wlan in $wlans; do
		iw $wlan set power_save off
	done
fi

/srv/http/bash/cmd.sh addonsupdate

if grep -q dtoverlay=bcmbt /boot/config.txt; then
	modprobe btbcm
	systemctl start bluetooth bluealsa
fi
