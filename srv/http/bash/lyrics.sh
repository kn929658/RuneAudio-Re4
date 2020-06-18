#!/bin/bash

artist=$1
title=$2
name="$artist - $title"
name=${name//\/}

lyricsfile="/srv/http/data/lyrics/${name,,}.txt"
if [[ $3 == local ]]; then
	if [[ ! -e $lyricsfile ]]; then
		title=$( echo $title | sed 's/ $\| (.*$//' )
		name="$artist - $title"
		name=${name//\/}
		lyricsfile="/srv/http/data/lyrics/${name,,}.txt"
	fi
	if [[ -e $lyricsfile ]]; then
		echo "$title^^$( cat "$lyricsfile" )" # return with title for display
	else
		echo -1
	fi
elif [[ $3 == save ]]; then
	echo "$4" > "$lyricsfile"
elif [[ $3 == delete ]]; then
	rm "$lyricsfile"
else
	artist=$( echo $artist | sed 's/^A \|^The \|\///g' )
	title=${title//\/}
	query=$( echo $artist/$title \
				| tr -d " '\-\"!*\(\);:@&=+$,?#[]." )
	lyrics=$( curl -s -A firefox https://www.azlyrics.com/lyrics/${query,,}.html )
	if [[ -n $lyrics ]]; then
		echo "$lyrics" \
			| sed -n '/id="cf_text_top"/,/id="azmxmbanner"/ p' \
			| sed '/^\s*$/ d' \
			| sed '/\/div>/,/<br>/ {N;d}' \
			| sed 's/<br>//' \
			| grep -v '^<' \
			| tee "$lyricsfile"
	fi
fi