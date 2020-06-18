#!/bin/bash

# config.txt
if (( $# == 0 )); then
	hwcode=$( grep Revision /proc/cpuinfo | tail -c 4 | cut -c1-2 )
	[[ $hwcode == 09 || $hwcode == 0c ]] && rpi=0
	[[ $hwcode == 11 ]] && rpi=4
	config="\
over_voltage=2
hdmi_drive=2
force_turbo=1
gpu_mem=32
initramfs initramfs-linux.img followkernel
max_usb_current=1
disable_splash=1
disable_overscan=1
dtparam=audio=on
dtoverlay=vc4-kms-v3d
"
	if [[ $rpi == 0 ]]; then
		config=$( sed '/dtparam=audio=on/ d' <<<"$config" )
	else
		config=$( sed '/over_voltage\|hdmi_drive\|dtoverlay=vc4-kms-v3d/ d' <<<"$config" )
	fi
	[[ $rpi == 4 ]] && config=$( sed '/force_turbo/ d' <<<"$config" )

	echo -n "$config" > /boot/config.txt
fi

# data - settings directories
dirdata=/srv/http/data
dirsystem=$dirdata/system
mkdir -p "$dirdata"
for dir in addons bookmarks coverarts lyrics mpd playlists system tmp webradios; do
	mkdir -p "$dirdata/$dir"
done
# display
echo '{
	"album": true,
	"albumartist": true,
	"artist": true,
	"composer": true,
	"coverart": true,
	"date": true,
	"genre": true,
	"nas": true,
	"sd": true,
	"usb": true,
	"webradio": true,
	"backonleft": false,
	"count": true,
	"fixedcover": true,
	"label": true,
	"playbackswitch": true,
	"plclear": true,
	"tapaddplay": false,
	"tapreplaceplay": false,
	"thumbbyartist": false,
	"bars": true,
	"barsalways": false,
	"buttons": true,
	"cover": true,
	"coversmall": false,
	"radioelapsed": false,
	"time": true,
	"volume": true
}' > $dirsystem/display
echo '[
	"CoverArt",
	"SD",
	"USB",
	"NAS",
	"WebRadio",
	"Album",
	"Artist",
	"AlbumArtist",
	"Composer",
	"Genre",
	"Date"
]' > $dirsystem/order
# system
hostnamectl set-hostname runeaudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
timedatectl set-timezone UTC
echo 'On-board - Headphone' > $dirsystem/audio-output
echo bcm2835 ALSA_1 > $dirsystem/audio-aplayname
echo 1 | tee $dirsystem/{localbrowser,onboard-audio,onboard-wlan} > /dev/null
# kernel 5 - no headphone
if [[ $( cat /proc/version | cut -d" " -f3 ) > 5.4 ]]; then
	if [[ $hwcode =~ ^(09|0c)$ ]]; then
		rm $dirsystem/onboard-audio
		echo 1 > $dirsystem/onboard-hdmi
	fi
fi
# nowireless
[[ $hwcode =~ ^(00|01|02|03|04|09)$ ]] && rm $dirsystem/onboard-wlan
echo RuneAudio | tee $dirsystem/{hostname,soundprofile} > /dev/null
echo 0 0 0 > $dirsystem/mpddb
echo '$2a$12$rNJSBU0FOJM/jP98tA.J7uzFWAnpbXFYx5q1pmNhPnXnUu3L1Zz6W' > $dirsystem/password
[[ -n $1 ]] && echo $1 > $dirsystem/version

# mpd - music directories
mkdir -p /mnt/MPD/{NAS,SD,USB}

# set permissions and ownership
chown -R http:http "$dirdata"
chown -R mpd:audio "$dirdata/mpd" /mnt/MPD
chmod 777 /srv/http/data/tmp
