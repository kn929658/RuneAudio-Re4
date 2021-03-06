#!/bin/bash

readarray -t args <<< "$1"
file=${args[0]}
album=${args[1]}
cue=${args[2]}
path="/mnt/MPD/$file"
args=( "${args[@]:3}" )

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=mpdupdate -d "$1"
}

if [[ $cue == false ]]; then
	if [[ $album == false ]]; then
		kid3-cli \
			-c "set album \"${args[0]}\"" \
			-c "set albumartist \"${args[1]}\"" \
			-c "set artist \"${args[2]}\"" \
			-c "set composer \"${args[3]}\"" \
			-c "set genre \"${args[4]}\"" \
			-c "set date \"${args[5]}\"" \
			-c "set title \"${args[6]}\"" \
			-c "set track \"${args[7]}\"" \
			"$path"
	else
		kid3-cli \
			-c "set album \"${args[0]}\"" \
			-c "set albumartist \"${args[1]}\"" \
			-c "set artist \"${args[2]}\"" \
			-c "set composer \"${args[3]}\"" \
			-c "set genre \"${args[4]}\"" \
			-c "set date \"${args[5]}\"" \
			"$path/"*.*
	fi
	pushstream 1
	mpc update "$file"
	# update pre-queried list
	/srv/http/bash/cmd.sh list
	/srv/http/bash/cmd.sh count
else
	if [[ $album == false ]]; then
		sed -i '/^\s\+TRACK '${args[2]}'/ {
n; s/^\(\s\+TITLE\).*/\1 "'${args[1]}'"/
n; s/^\(\s\+PERFORMER\).*/\1 "'${args[0]}'"/
}
' "$path"
	else
		sed -i '/^TITLE\|^PERFORMER\|^REM COMPOSER\|^REM DATE\|^REM GENRE/ d' "$path"
		keys=( album albumartist artist composer genre date )
		for (( i=0; i < 6; i++ )); do
			key=${keys[$i]}
			val=${args[$i]}
			[[ -z $val ]] && continue
			
			case $key in
				album )       sed -i "1 i\TITLE \"$val\"" "$path";;
				albumartist ) sed -i "/^TITLE/ a\PERFORMER \"$val\"" "$path";;
				composer )    sed -i "1 i\REM COMPOSER \"$val\"" "$path";;
				date )        sed -i "1 i\REM DATE \"$val\"" "$path";;
				genre )       sed -i "1 i\REM GENRE \"$val\"" "$path";;
			esac
		done
	fi
	# update pre-queried list
	/srv/http/bash/cmd.sh listcue
	/srv/http/bash/cmd.sh count
fi
