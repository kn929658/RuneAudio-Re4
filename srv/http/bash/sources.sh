#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "sources" }'
}

case ${args[0]} in

mount )
	mountpoint=${args[1]}
	ip=${args[2]}
	source=${args[3]}
	cifsnfs=${args[4]}
	options=${args[5]}

	! ping -c 1 -w 1 $ip &> /dev/null && echo 'IP not found.' && exit

	[[ -e "$mountpoint" ]]  && echo 'Mount name already exists.' && exit

	mkdir -p "$mountpoint"
	chown mpd:audio "$mountpoint"
	[[ -n $options ]] && optmount="-o $options"
	mount -t $cifsnfs "$source" "$mountpoint" $optmount
	if ! mountpoint -q "$mountpoint"; then
		echo 'Mount failed.'
		rmdir "$mountpoint"
		exit
	fi

	source=${source// /\\040} # escape spaces in fstab
	name=$( basename "$mountpoint" )
	mountpoint=${mountpoint// /\\040}
	echo "$source  $mountpoint  $cifsnfs  $options  0  0" | tee -a /etc/fstab > "/srv/http/data/system/fstab-$name" && echo 0
	pushRefresh
	;;
remount )
	if [[ ${2:9:3} == NAS ]]; then
		mount "${args[1]}"
	else
		udevil mount "${args[2]}"
	fi
	pushRefresh
	;;
remove )
	umount -l "${args[1]}"
	sed -i "\|${2// /.040}| d" /etc/fstab
	rmdir "${args[1]}" &> /dev/null
	rm "$dirsystem/fstab-${2/*\/}"
	pushRefresh
	;;
unmount )
	if [[ ${2:9:3} == NAS ]]; then
		umount -l "${args[1]}"
	else
		udevil umount -l "${args[1]}"
	fi
	pushRefresh
	;;
	
esac
