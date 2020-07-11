#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "network" }'
}

case ${args[0]} in

accesspoint )
	if [[ ${args[1]} == true ]]; then
		ifconfig wlan0 ${args[2]}
		systemctl enable --now hostapd dnsmasq
		touch $dirsystem/accesspoint
	else
		systemctl disable --now hostapd dnsmasq
		rm $dirsystem/accesspoint
		ifconfig wlan0 0.0.0.0
	fi
	pushRefresh
	;;
accesspointset )
	sed -i -e "s/^\(dhcp-range=\).*/\1${args[1]}/
	" -e "s/^\(.*option:router,\).*/\1${args[2]}/
	" -e "s/^\(.*option:dns-server,\).*/\1${args[2]}
	" /etc/dnsmasq.conf
	sed -i -e '/wpa\|rsn_pairwise/ s/^#\+//
	' -e "s/\(wpa_passphrase=\).*/\1${args[3]}/
	" /etc/hostapd/hostapd.conf
	systemctl restart hostapd dnsmasq
	if [[ ${args[2]} == 192.168.5.1 ]]; then
		rm $dirsystem/accesspoint-ip*
	else
		echo ${args[2]} > $dirsystem/accesspoint-ip
		echo ${args[1]} > $dirsystem/accesspoint-iprange
	fi
	if [[ ${args[3]} == RuneAudio ]]; then
		rm $dirsystem/accesspoint-passphrase
	else
		echo ${args[3]} > $dirsystem/accesspoint-passphrase
	fi
	pushRefresh
	;;
btconnect )
	/srv/http/bash/network-btscan.sh disconnect
	bluetoothctl trust ${args[1]}
	bluetoothctl pair ${args[1]}
	bluetoothctl connect ${args[1]}
	[[ $? != 0 ]] && echo -1 ||	pushRefresh
	;;
connect )
	ifconfig ${args[1]} down
	[[ -n ${args[3]} ]] && echo "${args[3]}" | tee "/srv/http/data/system/netctl-${args[2]}" > "/etc/netctl/${args[2]}"
	netctl switch-to "${args[2]}"
	ifconfig ${args[1]} up
	pushRefresh
	;;
connectenable )
	systemctl enable netctl-auto${args[1]}
	pushRefresh
	;;
disconnect )
	netctl stop-all
	killall wpa_supplicant
	ifconfig ${args[1]} up
	if [[ -n ${args[2]} ]]; then
		systemctl disable netctl-auto@${args[1]}
		rm "/etc/netctl/${args[2]}" "/srv/http/data/system/netctl-${args[2]}"
	fi
	pushRefresh
	;;
editlan )
	eth0="\
[Match]
Name=eth0
[Network]
DNSSEC=no
"
	if [[ -z ${args[1]} ]];then
		eth0+="\
DHCP=yes
"
		rm /srv/http/data/system/eth0.network
	else
		arp -n | grep -q ^${args[1]} && echo -1 && exit
		
		eth0+="\
Address=${args[1]}/24
Gateway=${args[2]}
"
		echo "$eth0" > /srv/http/data/system/eth0.network
	fi
	echo "$eth0" > /etc/systemd/network/eth0.network
	systemctl restart systemd-networkd
	pushRefresh
	;;
editwifidhcp )
	file="/srv/http/data/system/netctl-${args[1]}"
	netctl stop "${args[1]}"
	sed -i -e '/^Address\|^Gateway/ d
	' -e 's/^IP.*/IP=dhcp/
	' "$file"
	cp "$file" "/etc/netctl/${args[1]}"
	netctl start "${args[1]}"
	pushRefresh
	;;
ifconfig )
	lines=$( ifconfig \
		| sed -n '/^eth\|^wlan/,/ether/ p' \
		| grep -v inet6 \
		| sed 's/^\(.*\): .*/\1/; s/^ *inet \(.*\)   *net.*/\1/; s/^ *ether \(.*\)   *txq.*/\1=/' \
		| tr '\n' ' ' \
		| sed 's/= /\n/g' )
	echo "$lines"
	;;
ipused )
	arp -n | grep -q ^${args[1]} && echo 1 || echo 0
	;;
statusifconfig )
	ifconfig
	if systemctl -q is-active bluetooth; then
		echo '<hr>'
		bluetoothctl show | sed 's/^\(Controller.*\)/bluetooth: \1/'
	fi
	;;
statusnetctl )
	lists=$( netctl list )
	[[ -z $lists ]] && echo '(none)' && exit
	
	readarray -t lists <<< "$lists"
	for list in "${lists[@]}"; do
		name=$( sed 's/^-*\** *//' <<< $list )
		profiles+="<hr>$name<hr>$( cat /etc/netctl/$name | sed -e '/^#.*/ d' -e 's/Key=.*/Key="*********"/' )"
	done
	echo "$profiles"
	;;
statuswifi )
	value=$( grep '^Address\|^Gateway\|^IP\|^Key\|^Security' "/etc/netctl/${args[1]}" \
				| tr -d '"' \
				| sed 's/^/"/ ;s/=/":"/; s/$/",/' )
	echo {${value:0:-1}}
	;;
	
esac
