#!/bin/bash

(( $# == 0 )) && exit

path=$1

# check for any subdirectories - not yet tracks view
if (( $# > 1 )); then
	mpcls=$( mpc ls "$1" | sed 's|^|/mnt/MPD/|' )
	readarray -t lists <<<"$mpcls"
	for list in "${lists[@]}"; do
		[[ -d "$list" ]] && echo 1 && exit
	done

	echo 0
	exit
fi

mpc ls "$path" | mpc add &> /dev/null

# mpc ls file.cue 
# - remove from playlist
# - reload with mpc load file.cue
# - move to previous position

cuefiles=$( find "/mnt/MPD/$path" -name *.cue )
[[ -z $cuefiles ]] && exit

readarray -t cuefiles <<<"$cuefiles"
for cuefile in "${cuefiles[@]}"; do
	cuedir=$( dirname "$cuefile" )
	cuedirfiles=( "$cuedir/"* )
	plL=$( mpc playlist | wc -l )
	for file in "${cuedirfiles[@]}"; do
		mpdfile=${file/\/mnt\/MPD\//}
		index=$( mpc playlist | grep -n "$mpdfile" | cut -d: -f1 )
		[[ -n $index ]] && mpc del $index && cueindex=$index
	done
	mpdcuefile=${cuefile/\/mnt\/MPD\//}
	mpc load "$mpdcuefile"
	plLnew=$( mpc playlist | wc -l )
	range=$(( plL - 1 )):$plLnew
	{ sleep 0.05; echo move $range $(( cueindex - 1 )); echo $1; sleep 0.05; } | telnet 127.0.0.1 6600 &> /dev/null
done
