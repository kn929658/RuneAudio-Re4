#!/bin/bash

# for interval refresh
(( $# > 0 )) && echo -e "{$data}" && exit

hardwarecode=$( grep Revision /proc/cpuinfo | awk '{print $NF}' )
code=${hardwarecode: -3:2}
case $code in
	0c | 08 | 0e | 0d | 11 ) rpiwireless=1;;
esac
case $code in
	00 | 01 | 02 | 03 ) cpu='700MHz';;
	04 )                cpu='4 @ 900MHz';;
	09 | 0c )           cpu='1GHz';;
	08 )                cpu='4 @ 900MHz';;
	0d | 0e )           cpu='4 @ 1.4GHz';;
	11 )                cpu='4 @ 1.5GHz';;
esac
case ${hardwarecode: -4:1} in
	0 ) soc='BCM2835';;
	1 ) soc='BCM2836';;
	2 ) soc='BCM2837';;
	3 ) soc='BCM2711';;
esac
case ${hardwarecode: -6:1} in
	9 ) mem='512KB';;
	a ) mem='1GB';;
	b ) mem='2GB';;
	c ) mem='4GB';;
esac

. /srv/http/bash/network-ifconfig.sh
for line in "${lines[@]}"; do
    items=( $line )
    iplist+=",${items[0]} ${items[1]} ${items[2]}"
done

dirsystem=/srv/http/data/system
version=$( cat $dirsystem/version )
mpdstats=$( systemctl -q is-active mpd && mpc stats | head -3 | awk '{print $NF}' | tr '\n' ',' | head -c -1 )
snaplatency=$( grep OPTS= /etc/default/snapclient | cut -d= -f3 | tr -d '"' )
[[ -n $mpdstats ]] && mpdstats=[$mpdstats] || mpdstats=false
[[ -z $snaplatency ]] && snaplatency=0

data='
	  "audioaplayname"  : "'$( cat $dirsystem/audio-aplayname 2> /dev/null )'"
	, "audiooutput"     : "'$( cat $dirsystem/audio-output )'"
	, "cpuload"         : "'$( cat /proc/loadavg | cut -d' ' -f1-3 )'"
	, "cputemp"         : '$(( $( cat /sys/class/thermal/thermal_zone0/temp ) / 1000 ))'
	, "hardware"        : "'$( tr -d '\0' < /sys/firmware/devicetree/base/model )'"
	, "hostname"        : "'$( cat $dirsystem/hostname )'"
	, "ip"              : "'${iplist:1}'"
	, "kernel"          : "'$( uname -r )'"
	, "login"           : '$( [[ -e $dirsystem/login ]] && echo true || echo false )'
	, "mpd"             : "'$( pacman -Q mpd | sed 's/mpd \(.*\)-.*/\1/' )'"
	, "mpdstats"        : '$mpdstats'
	, "ntp"             : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
	, "onboardaudio"    : '$( grep -q 'dtparam=audio=on' /boot/config.txt && echo true || echo false )'
	, "passworddefault" : '$( grep -q '$2a$12$rNJSBU0FOJM/jP98tA.J7uzFWAnpbXFYx5q1pmNhPnXnUu3L1Zz6W' $dirsystem/password && echo true || echo false )'
	, "reboot"          : "'$( cat /srv/http/data/tmp/reboot 2> /dev/null )'"
	, "regdom"          : "'$( cat /etc/conf.d/wireless-regdom | cut -d'"' -f2 )'"
	, "snapcast"        : '$( systemctl -q is-active snapserver && echo true || echo false )'
	, "snapclient"      : '$( [[ -e $dirsystem/snapclient ]] && echo true || echo false )'
	, "snaplatency"     : '$snaplatency'
	, "soc"             : "'$soc'"
	, "soccpu"          : "'$cpu'"
	, "socmem"          : "'$mem'"
	, "soundprofile"    : "'$( cat $dirsystem/soundprofile 2> /dev/null )'"
	, "sources"         : '$( /srv/http/bash/sources-data.sh )'
	, "streaming"       : '$( grep -q 'type.*"httpd"' /etc/mpd.conf && echo true || echo false )'
	, "sysswap"         : '$( sysctl vm.swappiness | cut -d" " -f3 )'
	, "syslatency"      : '$( sysctl kernel.sched_latency_ns | cut -d" " -f3 )'
	, "time"            : "'$( date +'%T %F' )'"
	, "timezone"        : "'$( timedatectl | grep zone: | awk '{print $3}' )'"
	, "uptime"          : "'$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )'"
	, "uptimesince"     : "'$( uptime -s | cut -d: -f1-2 )'"
	, "version"         : "'$version'"
	, "versionui"       : '$( cat /srv/http/data/addons/rr$version )
	
[[ -e /usr/bin/bluetoothctl  ]] && data+='
	, "bluetooth"       : '$( grep -q dtoverlay=bcmbt /boot/config.txt && echo true || echo false )'
	, "bluetoothon"     : '$( [[ $( systemctl is-active bluetooth ) == active ]] && echo true || echo false )
[[ -e /sys/class/net/eth0 ]] && data+='
	, "eth0mtu"         : '$( cat /sys/class/net/eth0/mtu )'
	, "eth0txq"         : '$( cat /sys/class/net/eth0/tx_queue_len )
# renderer
[[ -e /usr/bin/shairport-sync  ]] && data+='
	, "airplay"         : '$( systemctl -q is-active shairport-sync && echo true || echo false )
[[ -e /usr/bin/spotifyd  ]] && data+='
	, "spotify"         : '$( systemctl -q is-active spotifyd && echo true || echo false )'
	, "spotifydevice"   : "'$( grep 'device =' /etc/spotifyd.conf | awk '{print $NF}' )'"'
[[ -e /usr/bin/upmpdcli  ]] && data+='
	, "upnp"            : '$( systemctl -q is-active upmpdcli && echo true || echo false )
# features
[[ -e /usr/bin/smbd  ]] && data+='
	, "samba"           : '$( systemctl -q is-active smb && echo true || echo false )'
	, "writesd"         : '$( grep -A1 /mnt/MPD/SD /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )'
	, "writeusb"        : '$( grep -A1 /mnt/MPD/USB /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )
[[ -n $rpiwireless ]] && data+='
	, "wlan"            : '$( lsmod | grep -q '^brcmfmac ' && echo true || echo false )

xinitrc=/etc/X11/xinit/xinitrc
if [[ -e $xinitrc ]]; then
	file='/etc/X11/xorg.conf.d/99-raspi-rotate.conf'
	[[ -e $file ]] && rotate=$( grep rotate $file | cut -d'"' -f4 ) || rotate=NORMAL
	data+='
	, "cursor"          : '$( grep -q 'cursor yes' $xinitrc && echo true || echo false )'
	, "localbrowser"    : '$( systemctl -q is-enabled localbrowser && echo true || echo false )'
	, "rotate"          : "'$rotate'"
	, "screenoff"       : '$(( $( grep 'xset dpms .*' $xinitrc | cut -d' ' -f5 ) / 60 ))'
	, "zoom"            : '$( grep factor $xinitrc | cut -d'=' -f3 )
fi

echo {$data} | tr -d '\n\t'
