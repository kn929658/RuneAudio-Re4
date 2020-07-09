#!/bin/bash

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "sources" }'
}

dirsystem=/srv/http/data/system

case $1 in

mount )
	mountpoint=$2
	ip=$3
	source=$4
	cifsnfs=$5
	options=$6

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
	echo "$source  $mountpoint  $cifsnfs  $options  0  0" | tee -a /etc/fstab "/srv/http/data/system/fstab-$name" &> /dev/null
	pushRefresh
	;;
remount )
	if [[ ${2:9:3} == NAS ]]; then
		mount "$2"
	else
		udevil mount "$3"
	fi
	pushRefresh
	;;
remove )
	umount -l "$2"
	sed -i "\|$2\| d" /etc/fstab
	rmdir "$2" &> /dev/null
	rm "$dirsystem/fstab-${2/*\/}"
	pushRefresh
	;;
unmount )
	if [[ ${2:9:3} == NAS ]]; then
		umount -l "$2"
	else
		udevil umount l "$2"
	fi
	pushRefresh
	;;
	
esac
