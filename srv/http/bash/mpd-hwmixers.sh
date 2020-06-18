#!/bin/bash

amixer=$( amixer -c $1 scontents \
	| grep -A2 'Simple mixer control' \
	| grep -v 'Capabilities' \
	| tr -d '\n' \
	| sed 's/--/\n/g' \
	| grep 'Playback channels' \
	| sed "s/.*'\(.*\)',\(.\) .*/\1 \2/; s/ 0$//" \
	| awk '!a[$0]++' \
	| tr '\n' '^' )

echo ${amixer:0:-1}
