#!/bin/bash


# vcgencmd get_throttled > 0xDDDDD (decimal)
#  1st D > binary BBBB - occured
#    1st B = Soft temperature limit
#    2nd B = Throttling
#    3rd B = Arm frequency capping
#    4th B = Under-voltage
#  5th D > binary BBBB - current
#    1st B = Soft temperature limit active
#    2nd B = Currently throttled
#    3rd B = Arm frequency capped
#    4th B = Under-voltage detected
throttle=$( /opt/vc/bin/vcgencmd get_throttled )
if [[ $throttle != 0x0 ]]; then
	D2B=( {0..1}{0..1}{0..1}{0..1} )
	underv=$( echo $throttle | cut -dx -f2 | cut -c1 )
	[[ $( echo ${D2B[$underv]} | cut -c4 ) == 1 ]] && undervoltage=true || undervoltage=false
fi

bullet='<gr> &bull; </gr>'
date=( $( date +'%T %F' ) )
timezone=$( timedatectl | awk '/zone:/ {print $3}' )
time="${date[0]}$bullet${date[1]}&emsp;<grw>${timezone//\// &middot; }</grw>"
uptime=$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )
uptimesince=$( uptime -s | cut -d: -f1-2 )
uptime+="&emsp;<gr>since ${uptimesince/ / &bull; }</gr>"

data='
	  "cpuload"         : "'$( cat /proc/loadavg | cut -d' ' -f1-3 | sed 's/ /\&emsp;/g' )'"
	, "cputemp"         : '$( printf "%.0f\n" $( /opt/vc/bin/vcgencmd measure_temp | cut -d= -f2 | cut -d\' -f1 ) )'
	, "time"            : "'$time'"
	, "uptime"          : "'$uptime'"
	, "undervoltage"    : '$undervoltage

# for interval refresh
(( $# > 0 )) && echo {$data} && exit

cpuinfo=$( cat /proc/cpuinfo )
lscpu=$( lscpu )
soc=$( awk '/Hardware/ {print $NF}' <<< "$cpuinfo" )
cpucores=$( awk '/CPU\(s\):/ {print $NF}' <<< "$lscpu" | cut -d. -f1 )
cpuname=$( awk '/Model name/ {print $NF}' <<< "$lscpu" )
cpuspeed=$( awk '/CPU max/ {print $NF}' <<< "$lscpu" | cut -d. -f1 )
(( $cpucores > 1 )) && cores=" $cpucores"
soc="$soc$bullet$cores $cpuname @ "
(( $cpuspeed < 1000 )) && soc+="${cpuspeed}MHz" || soc+="$( awk "BEGIN { printf \"%.1f\n\", $cpuspeed / 1000 }" )GHz"
soc+=$bullet
hwcode=$( awk '/Revision/ {print $NF}' <<< "$cpuinfo" )
case ${hwcode::1} in
	9 ) soc+='512KB';;
	a ) soc+='1GB';;
	b ) soc+='2GB';;
	c ) soc+='4GB';;
esac

. /srv/http/bash/network-ifconfig.sh
for line in "${lines[@]}"; do
    items=( $line )
    iplist+=",${items[0]} ${items[1]} ${items[2]}"
done

dirsystem=/srv/http/data/system
version=$( cat $dirsystem/version )
mpdstats=$( systemctl -q is-active mpd && mpc stats | head -3 | awk '{print $NF}' | tr '\n' ',' | head -c -1 )
snaplatency=$( grep OPTS= /etc/default/snapclient | sed 's/.*latency=\(.*\)"/\1/' )
[[ -n $mpdstats ]] && mpdstats=[$mpdstats] || mpdstats=false
[[ -z $snaplatency ]] && snaplatency=0

data+='
	, "audioaplayname"  : "'$( cat $dirsystem/audio-aplayname 2> /dev/null )'"
	, "audiooutput"     : "'$( cat $dirsystem/audio-output )'"
	, "hardware"        : "'$( awk '/Model/ {$1=$2=""; print}' <<< "$cpuinfo" )'"
	, "hostname"        : "'$( cat $dirsystem/hostname )'"
	, "ip"              : "'${iplist:1}'"
	, "kernel"          : "'$( uname -r )'"
	, "login"           : '$( [[ -e $dirsystem/login ]] && echo true || echo false )'
	, "mpd"             : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
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
	, "soundprofile"    : "'$( cat $dirsystem/soundprofile 2> /dev/null )'"
	, "sources"         : '$( /srv/http/bash/sources-data.sh )'
	, "streaming"       : '$( grep -q 'type.*"httpd"' /etc/mpd.conf && echo true || echo false )'
	, "sysswap"         : '$( sysctl vm.swappiness | cut -d" " -f3 )'
	, "syslatency"      : '$( sysctl kernel.sched_latency_ns | cut -d" " -f3 )'
	, "timezone"        : "'$timezone'"
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
	, "spotifydevice"   : "'$( awk '/device =/ {print $NF}' /etc/spotifyd.conf )'"'
[[ -e /usr/bin/upmpdcli  ]] && data+='
	, "upnp"            : '$( systemctl -q is-active upmpdcli && echo true || echo false )
# features
[[ -e /usr/bin/smbd  ]] && data+='
	, "samba"           : '$( systemctl -q is-active smb && echo true || echo false )'
	, "writesd"         : '$( grep -A1 /mnt/MPD/SD /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )'
	, "writeusb"        : '$( grep -A1 /mnt/MPD/USB /etc/samba/smb.conf | grep -q 'read only = no' && echo true || echo false )
[[ ${hwcode:3:2} =~ ^(08|0c|0d|0e|11)$ ]] && data+='
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

echo {$data}
