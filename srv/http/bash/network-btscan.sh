#!/bin/bash

if [[ $1 == disconnect ]]; then
	macs=( $( bluetoothctl paired-devices | cut -d' ' -f2 ) )
	for mac in "${macs[@]}"; do
		bluetoothctl disconnect $mac
	done
	exit
fi

if (( $# == 0 )); then
	timeout 10 bluetoothctl scan on
	bluetoothctl scan off &> /dev/null
fi
lines=$( bluetoothctl devices | cut -d' ' -f2- )
[[ -z $lines ]] && echo [] && exit

readarray -t lines <<<"$lines"
for line in "${lines[@]}"; do
	name=${line#* }
	dash=${name//[^-]}
	(( ${#dash} == 5 )) && continue
	mac=${line/ *}
	connected=$( bluetoothctl info $mac | awk '/^\s*Connected:/ {print $NF}' )
	saved=$( bluetoothctl paired-devices | grep -q $mac && echo true || echo false )
	data+='{"name":"'${name//\"/\\\"}'","mac":"'$mac'","connected":"'$connected'","saved":'$saved'}\n'
done
data=$( echo -e "$data" | sort -f | awk NF | tr '\n' ',' )

echo [${data:0:-1}]
