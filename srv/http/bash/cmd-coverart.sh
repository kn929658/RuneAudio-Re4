#!/bin/bash

path="/mnt/MPD/$1"
(( $# > 1 )) && size=$2
# get coverfile in directory
[[ -d $path ]] && dir=$path || dir=$( dirname "$path" )
for name in cover folder front thumb album; do
	for ext in jpg png gif; do
		coverfile="$dir/$name"
		[[ -e "$coverfile.$ext" ]] && break 2
		coverfile="$dir/${name^}" # capitalize
		[[ -e "$coverfile.$ext" ]] && break 2
	done
	coverfile=
done

# get embedded in file
if [[ -n $coverfile ]]; then
	# convert % > ^ | replace " > %20 | convert ^ > %
	coverfile=$( sed 's/%/\^/g; s/"/%22/g; s/\^/%25/g' <<< $coverfile )
else
	if [[ -f "$path" ]]; then
		file="$path"
	else
		files=$( mpc ls "${path:9}" )
		readarray -t files <<<"$files"
		for file in "${files[@]}"; do
			file="/mnt/MPD/$file"
			[[ -f "$file" ]] && break
		done
	fi
	tmpfile=/srv/http/data/tmp/coverart.jpg
	rm -f $tmpfile
	kid3-cli -c "select \"$file\"" -c "get picture:$tmpfile" &> /dev/null # suppress '1 space' stdout
	[[ ! -e $tmpfile ]] && exit
	
	coverfile=/data/tmp/coverart
	ext=jpg
fi

if [[ -z $size || $ext == gif ]]; then
	echo "$coverfile.$( date +%s ).$ext"
else # resize
	base64file=/srv/http/data/tmp/base64
	convert "$coverfile" -thumbnail ${size}x${size} -unsharp 0x.5 inline:$base64file
	cat $base64file
fi
