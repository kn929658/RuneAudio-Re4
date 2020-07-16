#!/bin/bash

# convert each line to each args
readarray -t lines <<< "$1"

plL=$( mpc playlist | wc -l )
linesL=${#lines[@]}
for (( i=0; i < linesL; i++ )); do
	artist=${lines[$i]}
	(( i++ ))
	title=${lines[$i]}
	mpc -q findadd artist "$artist" title "$title" &> /dev/null
done

echo $(( $( mpc playlist | wc -l ) - plL ))
