#!/bin/bash

[[ -n $1 ]] && wlan=$1 || wlan=wlan0

ifconfig $wlan up

connectedssid=$( iwgetid $wlan -r )
# static ip not listed by iwgetid
[[ -z $connectedssid ]] && staticip=$( ifconfig | grep -A1 "^$wlan" | grep inet | awk '{print $2}' )

netctllist=$( netctl list | grep -v eth | sed 's/^\s*\**\s*//' )
if [[ -n $netctllist ]]; then
	readarray -t netctllist_ar <<<"$netctllist"
	# pre-scan saved profile to force display hidden ssid
	for name in "${netctllist_ar[@]}"; do
		grep -q '^Hidden=yes' "/etc/netctl/$name" && iwlist $wlan scan essid "$name" &> /dev/null
		if [[ -z $connectedssid && -n $staticip ]] && grep -q $staticip "/etc/netctl/$name"; then
			connectedssid=$( grep '^ESSID' "/etc/netctl/$name" | cut -d'"' -f2 )
		fi
	done
fi


iwlistscan=$( iwlist $wlan scan | \
	grep '^\s*Qu\|^\s*En\|^\s*ES\|WPA' | \
	sed 's/^\s*//; s/Quality.*level\| dBm *\|En.*:\|ES.*://g; s/IE: .*\/\(.*\) .* .*/\1/' | \
	tr '\n' ' ' | \
	sed 's/=/\n/g' |
	sort )
iwlistscan=${iwlistscan:1} # remove leading \n
readarray -t line <<<"$iwlistscan"
for line in "${line[@]}"; do
	line=( $line )
	dbm=${line[0]}
	encrypt=${line[1]}
	ssid=${line[2]//\"}
	ssid=${ssid/\\x00}
	[[ -z $ssid ]] && continue
	
	[[ ${line[3]:0:3} == WPA ]] && wpa=wpa || wpa=
	if [[ -n $netctllist ]]; then
		for name in "${netctllist_ar[@]}"; do
			[[ $ssid == $name ]] && profile=$netctllist_ar || profile=
		done
	fi
	if [[ $ssid == $connectedssid ]]; then
		connected=1
		gw_ip=( $( ip r | grep "default.*$wlan" | awk '{print $3" "$9}' ) )
		gw=${gw_ip[0]}
		ip=${gw_ip[1]}
	else
		connected=
		gw=
		ip=
	fi
	list+=',{"dbm":"'$dbm'","ssid":"'${ssid//\"/\\\"}'","encrypt":"'$encrypt'","wpa":"'$wpa'","wlan":"'$wlan'","profile":"'$profile'","connected":"'$connected'","gateway":"'$gw'","ip":"'$ip'"}'
done

echo [${list:1}] # 'remove leading ,
