#!/bin/bash

[[ -n $1 ]] && wlan=$1 || wlan=wlan0

ifconfig $wlan up

listProfile() {
	netctllist=$( netctl list | grep -v eth | sed 's/^\s*\**\s*//' )
	i=0
	if grep -q '^+' <<<"$netctllist"; then # leading '+' = connecting
		(( i++ ))
		(( i == 15 )) && echo -1 && exit
		
		sleep 2
		listProfile
	fi
}
listProfile

if [[ -n $netctllist ]]; then
	readarray -t netctllist_ar <<<"$netctllist"
	# pre-scan saved profile to force display hidden ssid
	for name in "${netctllist_ar[@]}"; do
		grep -q '^Hidden=yes' "/etc/netctl/$name" && iwlist $wlan scan essid "$name" &> /dev/null
	done
fi

connectedssid=$( iwgetid $wlan -r )

iwlistscan=$( iwlist $wlan scan | \
	grep '^\s*Qu\|^\s*En\|^\s*ES\|WPA' | \
	sed 's/^\s*//; s/Quality.*level\| dBm *\|En.*:\|ES.*://g; s/IE: .*\/\(.*\) .* .*/\1/' | \
	tr '\n' ' ' | \
	sed 's/=/\n/g' |
	sort -V )
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
			profile=
			dhcp=
			password=
			[[ $ssid == $name ]] && profile=1
			grep -q 'IP=dhcp' "/etc/netctl/$name" && dhcp=1
			password=$( grep '^Key' "/etc/netctl/$name" | cut -d'"' -f2 )
		done
	fi
	if [[ $ssid == $connectedssid ]]; then
		connected=1
		gw=$( ip r | awk '/default.*'$wlan'/ {print $3}' )
		ip=$( ifconfig $wlan | awk '/inet / {print $2}' )
	else
		connected=
		gw=
		ip=
	fi
	list+=',{"dbm":"'$dbm'","ssid":"'${ssid//\"/\\\"}'","encrypt":"'$encrypt'","wpa":"'$wpa'","wlan":"'$wlan'","profile":"'$profile'","dhcp":"'$dhcp'","connected":"'$connected'","gateway":"'$gw'","ip":"'$ip'","password":"'$password'"}'
done

echo [${list:1}] # 'remove leading ,
