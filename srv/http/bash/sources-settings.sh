#!/bin/bash

if [[ -z $2 ]]; then
	umount -l "$1"
	sed -i "\|$1\| d" /etc/fstab
	rmdir "$1" &> /dev/null
	rm "$dirsystem/fstab-${1/*\/}"
	exit
fi

mountpoint=$1
ip=$2
source=$3
cifsnfs=$4
options=$5

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
