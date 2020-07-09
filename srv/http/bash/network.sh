#!/bin/bash

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "network" }'
}

dirsystem=/srv/http/data/system

case $1 in

accesspoint )
	if [[ $2 == true ]]; then
		ifconfig wlan0 $3
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
	sed -i -e "s/^\(dhcp-range=\).*/\1$1/
	" -e "s/^\(.*option:router,\).*/\1$2/
	" -e "s/^\(.*option:dns-server,\).*/\1$2
	" /etc/dnsmasq.conf
	sed -i -e '/wpa\|rsn_pairwise/ s/^#\+//
	' -e "s/\(wpa_passphrase=\).*/\1$3/
	" /etc/hostapd/hostapd.conf
	systemctl restart hostapd dnsmasq
	if [[ $2 == 192.168.5.1 ]]; then
		rm $dirsystem/accesspoint-ip*
	else
		echo $2 > $dirsystem/accesspoint-ip
		echo $1 > $dirsystem/accesspoint-iprange
	fi
	if [[ $3 == RuneAudio ]]; then
		rm $dirsystem/accesspoint-passphrase
	else
		echo $3 > $dirsystem/accesspoint-passphrase
	fi
	pushRefresh
	;;
btconnect )
	/srv/http/bash/network-btscan.sh disconnect
	bluetoothctl trust $2
	bluetoothctl pair $2
	bluetoothctl connect $2
	[[ $? != 0 ]] && echo -1 ||	pushRefresh
	;;
connect )
	ifconfig $2 down
	[[ -n $4 ]] && echo "$4" | tee "/srv/http/data/system/netctl-$3" > "/etc/netctl/$3"
	netctl switch-to "$3"
	pushRefresh
	;;
connectenable )
	systemctl enable netctl-auto$2
	pushRefresh
	;;
disconnect )
	netctl stop-all
	killall wpa_supplicant
	ifconfig $2 up
	if [[ -n $3 ]]; then
		systemctl disable netctl-auto@$2
		rm "/etc/netctl/$3" "/srv/http/data/system/netctl-$3"
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
	if [[ -z $2 ]];then
		eth0+="\
DHCP=yes
"
		rm /srv/http/data/system/eth0.network
	else
		arp -n | grep -q ^$2 && echo -1 && exit
		
		eth0+="\
Address=$2/24
Gateway=$3
"
		echo "$eth0" > /srv/http/data/system/eth0.network
	fi
	echo "$eth0" > /etc/systemd/network/eth0.network
	systemctl restart systemd-networkd
	pushRefresh
	;;
editwifidhcp )
	file="/srv/http/data/system/netctl-$2"
	netctl stop "$2"
	sed -i -e '/^Address\|^Gateway/ d
	' -e 's/^IP.*/IP=dhcp/
	' "$file"
	cp "$file" "/etc/netctl/$2"
	netctl start "$2"
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
	arp -n | grep -q ^$2 && echo 1 || echo 0
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
	value=$( grep '^Address\|^Gateway\|^IP\|^Key\|^Security' "/etc/netctl/$2" \
				| tr -d '"' \
				| sed 's/^/"/ ;s/=/":"/; s/$/",/' )
	echo {${value:0:-1}}
	;;
	
esac
