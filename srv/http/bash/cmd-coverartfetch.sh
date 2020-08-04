#!/bin/bash

readarray -t args <<< "$1"

artist=${args[0]}
arg1=${args[1]}
type=${args[2]}
if [[ $type != title ]]; then
	param="album=$arg1"
	method='method=album.getInfo'
else
	param="track=$arg1"
	method='method=track.getInfo'
fi
data=$( curl -s -G \
	--data-urlencode "artist=$artist" \
	--data-urlencode "$param" \
	--data-urlencode "$method" \
	--data-urlencode "api_key=ba8ad00468a50732a3860832eaed0882" \
	--data-urlencode "autocorrect=1" \
	--data-urlencode "format=json" \
	http://ws.audioscrobbler.com/2.0/ )
error=$( jq -r .error <<< "$data" )
[[ $error != null ]] && exit

if [[ $type == 'title' ]]; then
	album=$( jq -r .track.album <<< "$data" )
else
	album=$( jq -r .album <<< "$data" )
fi
[[ $album == null ]] && exit

image=$( jq -r .image <<< "$album" )

if [[ $image != null ]]; then
	extralarge=$( jq -r .[3] <<< "$image" | sed 's/^\s*"#text"/"url"/' )
	url=$( jq -r .url <<< "$extralarge" | sed 's|/300x300/|/_/|' ) # get larger size than 300x300
else
	mbid=$( jq -r .mbid <<< "$album" )
	[[ $mbid == null ]] && url=$( curl -s -L https://coverartarchive.org/release/$mbid | jq -r .images[0].image )
fi
[[ $url == null ]] && url=
rm -f /srv/http/data/tmp/online-*
[[ -z $url ]] && exit

if [[ $type == 'licover' ]]; then
	echo $url
else
	curl -s -X POST http://127.0.0.1/pub?id=coverart -d '{ "url": "'$url'" }'
	prefix=/srv/http/data/tmp/online
	name=$( echo $artist$arg1 | tr -d ' "`'"'" )
	echo $url > /srv/http/data/tmp/online-$name
fi
