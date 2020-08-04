#!/bin/bash

# config.txt
hwcode=$( awk '/Revision/ {print substr($NF, 4, 2)}' /proc/cpuinfo )
if (( $# == 0 )); then
	case $hwcode in
		09 | 0c ) rpi=0;;
		11 )      rpi=4;;
	esac
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
"
	[[ $rpi != 0 ]] && config=$( sed '/over_voltage\|hdmi_drive/ d' <<<"$config" )
	[[ $rpi == 4 ]] && config=$( sed '/force_turbo/ d' <<<"$config" )

	echo -n "$config" > /boot/config.txt
fi

# data - settings directories
dirdata=/srv/http/data
dirsystem=$dirdata/system
mkdir -p $dirdata/{addons,bookmarks,coverarts,embedded,lyrics,mpd,playlists,system,tmp,webradios}
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
	"hidecover": false,
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
echo '"mpd":true,"airplay":false,"snapclient":false,"spotify":false,"upnp":false' > $dirsystem/player
# system
hostnamectl set-hostname runeaudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
timedatectl set-timezone UTC
# on-board audio
echo 'bcm2835 Headphones' > $dirsystem/audio-aplayname
echo 'On-board - Headphone' > $dirsystem/audio-output
echo 1 | tee $dirsystem/{localbrowser,onboard-audio,onboard-wlan} > /dev/null
# nowireless
[[ $hwcode =~ ^(00|01|02|03|04|09)$ ]] && rm $dirsystem/onboard-wlan
echo RuneAudio | tee $dirsystem/{hostname,soundprofile} > /dev/null
echo '$2a$12$rNJSBU0FOJM/jP98tA.J7uzFWAnpbXFYx5q1pmNhPnXnUu3L1Zz6W' > $dirsystem/password
[[ -n $1 ]] && echo $1 > $dirsystem/version
# gpio
python -c "import RPi.GPIO" &> /dev/null && echo '{
  "name": {
    "11": "DAC",
    "13": "PreAmp",
    "15": "Amp",
    "16": "Subwoofer"
  },
  "on": {
    "on1": 11,
    "ond1": 2,
    "on2": 13,
    "ond2": 2,
    "on3": 15,
    "ond3": 2,
    "on4": 16
  },
  "off": {
    "off1": 16,
    "offd1": 2,
    "off2": 15,
    "offd2": 2,
    "off3": 13,
    "offd3": 2,
    "off4": 11
  },
  "timer": 5
}' > $dirsystem/gpio.json
usermod -a -G root http # add user http to group root to allow /dev/gpiomem access

# mpd - music directories
mkdir -p /mnt/MPD/{NAS,SD,USB}

# set permissions and ownership
chown -R http:http /srv/http
chown -R mpd:audio /srv/http/data/mpd /mnt/MPD
chmod 755 /srv/http/* /srv/http/bash/* /srv/http/settings/* /usr/local/bin/*
chmod 777 /srv/http/data/tmp
