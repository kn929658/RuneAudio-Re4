#!/bin/bash

# accesspoint
if [[ -e /usr/bin/hostapd ]]; then
	hostapd=$( systemctl -q is-active hostapd && echo true || echo false )
	ssid=$( grep ssid= /etc/hostapd/hostapd.conf | cut -d= -f2 )
	passphrase=$( grep '^wpa_passphrase' /etc/hostapd/hostapd.conf | cut -d'=' -f2 )
	hostapdip=$( grep router /etc/dnsmasq.conf | cut -d',' -f2 )
	ap='
	  "ssid"       : "'${ssid//\"/\\\"}'"
	, "passphrase" : "'${passphrase//\"/\\\"}'"
	, "hostapdip"  : "'$hostapdip'"
	, "hostapd"    : '$hostapd
fi

lines=$( /srv/http/bash/network.sh ifconfig )
readarray -t lines <<<"$lines"
for line in "${lines[@]}"; do
	items=( $line )
	interface=${items[0]}
	inftype=${interface:0:4}
	[[ $inftype != eth0 && $inftype != wlan ]] && continue
	
	items1=${items[1]}
	items2=${items[2]}
	if [[ ${items1:2:1} != : ]]; then
		ip=$items1
		mac=$items2
	else
		ip=
		mac=$items1
	fi
	ipr=$( ip r | grep "^default.*$interface" )
	dhcp=$( [[ $ipr == *"dhcp src $ip "* ]] && echo dhcp || echo static )
	gateway=$( cut -d' ' -f3 <<< $ipr )
	[[ -z $gateway ]] && gateway=$( ip r | grep ^default | head -n1 | cut -d' ' -f3 )
	[[ $inftype == wlan && -n $ip && $ip != $hostapdip ]] && ssid=$( iwgetid $interface -r ) || ssid=
	data+='{"dhcp":"'$dhcp'","mac":"'$mac'","gateway":"'$gateway'","interface":"'$interface'","ip":"'$ip'","ssid":"'$ssid'"},'
done

extra='
	  "hostapd"  : {'$ap'}
	, "hostname" : "'$( hostname )'"
	, "reboot"   : "'$( cat /srv/http/data/tmp/reboot 2> /dev/null )'"
	, "wlan"     : '$( lsmod | grep -q ^brcmfmac && echo true || echo false )
# bluetooth
if systemctl -q is-active bluetooth; then
	paired=$( bluetoothctl paired-devices )
	if [[ -n $paired ]]; then
		readarray -t devices <<<"$paired"
		for device in "${devices[@]}"; do
			mac=$( cut -d' ' -f2 <<<"$device" )
			name=$( cut -d' ' -f3- <<<"$device" )
			connected=$( bluetoothctl info $mac | grep '^\s*Connected:' | awk '{print $NF}' )
			btlist+=',{"name":"'${name//\"/\\\"}'","mac":"'$mac'","connected":"'$connected'"}'
		done
		btlist=[${btlist:1}]
	else
		btlist=false
	fi
	extra+=',"bluetooth":'$btlist
fi
		
data+={${extra}}

echo [${data}]
