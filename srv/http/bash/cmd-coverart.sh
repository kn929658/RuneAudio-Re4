#!/bin/bash

readarray -t args <<< "$1"

if [[ -z ${args[0]} ]]; then # webradio
	/srv/http/bash/cmd-coverartget.sh "$( sed '1 d' <<< "$1" )" &> /dev/null &
	exit
fi

path="/mnt/MPD/${args[0]}"
arg1=${args[1]}
argsL=${#args[@]}
(( $argsL == 2 )) && size=${args[1]}

# get coverfile in directory
[[ -d $path ]] && dir=$path || dir=$( dirname "$path" )
for name in cover folder front thumb album; do
	for ext in jpg png gif; do
		coverfile="$dir/$name.$ext"
		[[ -e $coverfile ]] && found=1 && break
		coverfile="$dir/${name^}.$ext" # capitalize
		[[ -e $coverfile ]] && found=1 && break
	done
	[[ -n $found ]] && break
done

# get embedded in file
if [[ $found != 1 ]]; then
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
	tmpfile=/srv/http/data/tmp/coverart0.jpg
	kid3-cli -c "select \"$file\"" -c "get picture:$tmpfile" &> /dev/null # suppress '1 space' stdout
	if (( $? == 0 )); then
		#found=1
		mv /srv/http/data/tmp/coverart{0,}.jpg &> /dev/null
		coverfile=/data/tmp/coverart.jpg
	fi
fi

if [[ -z $found && -z $size ]]; then
	/srv/http/bash/cmd-coverartget.sh "$( sed '1 d' <<< "$1" )" &> /dev/null &
	exit
fi
# convert % > ^
# replace " > %20
# convert ^ > %
if [[ -z $size || $ext == gif ]]; then
	coverfile=$( sed 's/%/\^/g; s/"/%22/g; s/\^/%25/g' <<< $coverfile )
	echo -n ${coverfile%.*}.$( date +%s ).${coverfile/*.}
else # resize
	base64file=/srv/http/data/tmp/base64
	convert "$coverfile" -thumbnail ${size}x${size} -unsharp 0x.5 inline:$base64file
	cat $base64file
fi

