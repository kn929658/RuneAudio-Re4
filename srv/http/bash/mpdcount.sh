#!/bin/bash

albumartist=$( mpc list albumartist | awk NF | wc -l )
composer=$( mpc list composer | awk NF | wc -l )
genre=$( mpc list genre | awk NF | wc -l )
count="$count $( mpc stats | head -n3 | awk '{print $2,$4,$6}' )"

data='
	  "album"       : '$( echo $count | cut -d' ' -f2 )'
	, "albumartist" : '$albumartist'
	, "artist"      : '$( echo $count | cut -d' ' -f1 )'
	, "composer"    : '$composer'
	, "coverart"    : '$( ls -1q /srv/http/data/coverarts | wc -l )'
	, "date"        : '$( mpc list date | awk NF | wc -l )'
	, "genre"       : '$genre'
	, "nas"         : '$( mpc ls NAS | wc -l )'
	, "sd"          : '$( mpc ls SD | wc -l )'
	, "song"        : '$( echo $count | cut -d' ' -f3 )'
	, "usb"         : '$( mpc ls USB | wc -l )'
	, "webradio"    : '$( ls -U /srv/http/data/webradios/* 2> /dev/null | wc -l )

mpc | grep -q Updating && data+=', "updating_db":1'

echo {$data} | tr -d '\n\t'

echo $albumartist $composer $genre > /srv/http/data/system/mpddb
