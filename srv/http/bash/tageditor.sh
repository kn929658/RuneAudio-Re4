#!/bin/bash

cue=$( jq '.cue' <<< $1 )
single=$( jq '.single' <<< $1 )
file=$( jq '.file' <<< $1 )
[[ $single == true ]] && path="/mnt/MPD/$file" || path="/mnt/MPD/$file/*.*"

keyval=$( jq 'del(.["cue", "file", "single"])' <<< $1 )

keys=$( jq 'keys' <<< "$keyval" )

if [[ $cue == false ]]; then
	for key in "${keys[@]}"; do
		val=$( jq ".$key" <<< "$keyval" )
		kid3-cli -c $key "$val" "$path"
	done
else
	sed -i '/^PERFORMER\\|^REM COMPOSER\\|^REM GENRE/ d' "$path"
	if [[ $single == true ]]; then
		$track=$( jq '.track' <<< $1 )
		$title=$( jq '.title' <<< $1 )
		$artist=$( jq '.artist' <<< $1 )
		sed -i '/^\s\+TRACK "'$track'"/ {
n; s/^\(\s\+TITLE\).*/\1"'$title'"/
n; s/^\(\s\+PERFORMER\).*/\1 "'$artist'"/
}
' "$path"
	else
		for key in "${keys[@]}"; do
			val=$( jq ".$key" <<< "$keyval" )
			case $key in
				albumartist ) sed -i '/^TITLE/ i\PERFORMER "'$val'"' "$path";;
				composer )    sed -i '1 i\REM COMPOSER "'$val'"' "$path";;
				genre )       sed -i '1 a\REM GENRE "'$val'"' "$path";;
				album )       sed -i 's/^\(\s\+PERFORMER \).*/\1 "'$val'"/' "$path";;
				artist )      sed -i 's/^\(TITLE\).*/\1 "'$val'"/' "$path";;
			esac
		done
	fi
fi

mpc update "$file"
