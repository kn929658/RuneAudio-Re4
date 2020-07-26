#!/bin/bash

flagfile=/srv/http/data/tmp/coverart
[[ -e $flagfile ]] && exit

touch $flagfile

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=coverart -d '{ "url": "'$1'" }'
}
readarray -t args <<< "$1"

artist=${args[0]}
album=${args[1]}
title=${args[2]}
nopush=${args[3]}
url="http://ws.audioscrobbler.com/2.0/\
?api_key=ba8ad00468a50732a3860832eaed0882\
&autocorrect=1\
&format=json\
&artist=$artist"
if [[ -n $title ]]; then
	url+="&method=track.getInfo&track=$title"
else
	url+="&method=album.getInfo&album=$album"
fi
data=$( curl -s "$url" )
error=$( jq -r .error <<< "$data" )
[[ $error != null ]] && rm $flagfile && exit

if [[ -n $title ]]; then
	album=$( jq -r .track.album <<< "$data" )
else
	album=$( jq -r .album <<< "$data" )
fi
[[ $album == null ]] && rm $flagfile && exit

image=$( jq -r .image <<< "$album" )

if [[ $image != null ]]; then
	extralarge=$( jq -r .[3] <<< "$image" | sed 's/^\s*"#text"/"url"/' )
	url=$( jq -r .url <<< "$extralarge" | sed 's|/300x300/|/_/|' ) # get larger size than 300x300
else
	mbid=$( jq -r .mbid <<< "$album" )
	if [[ $mbid == null ]]; then
		url=null
	else 
		url=$( curl -s -L https://coverartarchive.org/release/$mbid | jq -r .images[0].image )
	fi
fi
if [[ $url != null ]]; then
	[[ -z $nopush ]] && pushstream $url || echo $url
fi

rm $flagfile
