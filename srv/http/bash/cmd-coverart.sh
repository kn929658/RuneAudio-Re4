#!/bin/bash

path="/mnt/MPD/$1"

### 1 - get coverfile in directory ##################################
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

### 2 - get embedded in file ########################################
if [[ -n $coverfile ]]; then
	# convert % > ^ | replace " > %20 | convert ^ > % for img src="/encoded/url"
	coverfile=$( sed 's/%/\^/g; s/"/%22/g; s/\^/%25/g' <<< $coverfile )
	echo "$coverfile.$( date +%s ).$ext"
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
#	ffmpeg -i "$file" $tmpfile &> /dev/null
	kid3-cli -c "select \"$file\"" -c "get picture:$tmpfile" &> /dev/null # suppress '1 space' stdout
	if [[ -e $tmpfile ]]; then
		echo /data/tmp/coverart.$( date +%s ).jpg
	else
		/srv/http/bash/cmd-coverartfetch.sh "$2" &> /dev/null &
	fi
fi
