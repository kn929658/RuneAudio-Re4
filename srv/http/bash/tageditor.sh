#!/bin/bash

declare -A keyval
while IFS="=" read -r key value; do
    keyval[$key]="$value"
done < <( jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' <<< $1 )

cue=${keyval[cue]}
file=${keyval[file]}
single=${keyval[single]}
[[ $single == true ]] && path="/mnt/MPD/$file" || path="/mnt/MPD/$file/"*.*

unset keyval[cue]
unset keyval[file]
unset keyval[single]

if [[ $cue == false ]]; then
	for i in "${!keyval[@]}"; do
		key=$i
		val=${keyval[$i]}
		[[ -n $val ]] && kid3-cli -c "set $key '$val'" "$path"
	done
else
	if [[ $single == true ]]; then
		$track=${keyval[file]}
		$title=${keyval[title]}
		$artist=${keyval[artist]}
		sed -i '/^\s\+TRACK "'$track'"/ {
n; s/^\(\s\+TITLE\).*/\1 "'$title'"/
n; s/^\(\s\+PERFORMER\).*/\1 "'$artist'"/
}
' "$path"
	else
		sed -i '/^PERFORMER\|^REM COMPOSER\|^REM GENRE/ d' "$path"
		for i in "${!keyval[@]}"; do
			key=$i
			val=${keyval[$i]}
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
