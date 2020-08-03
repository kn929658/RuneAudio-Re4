#!/bin/bash

for pid in $( pgrep mpd ); do
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

statusfile=/srv/http/data/tmp/status
flag=/srv/http/data/tmp/flag
snapclientfile=/srv/http/data/tmp/snapclientip

mpc idleloop | while read changed; do
	case $changed in
		options )
			options=( $( mpc \
						| awk '/^volume/ {print $4" "$6" "$8" "$10}' \
						| sed 's/on/true/g; s/off/false/g' ) )
			status=$( cat $statusfile )
			status=$( jq ".repeat = ${options[0]} \
						| .random = ${options[1]} \
						| .single = ${options[2]} \
						| .consume = ${options[3]}" \
						<<< "$status" )
			pushstream mpdoptions "$status"
			echo "$status" > $statusfile
			;;
		player )
			if [[ ! -e $flag ]]; then # suppress on prev/next
				touch $flag
				( sleep 0.5 && rm -f $flag ) &> /dev/null &
				status=$( /srv/http/bash/status.sh )
				if [[ ! -e /srv/http/data/system/player-snapclient ]]; then
					pushstream mpdplayer "$status"
				else
					sed -i '/^$/d' $snapclientfile # remove blank lines
					if [[ -s $snapclientfile ]]; then
						mapfile -t clientip < $snapclientfile
						for ip in "${clientip[@]}"; do
							curl -s -X POST "http://$ip/pub?id=mpdplayer" -d "$status"
						done
					else
						rm $snapclientfile
					fi
				fi
			fi
			;;
		playlistplayer )
			status=$( /srv/http/bash/status.sh )
			pushstream mpdplayer "$status"
			;;
		playlist )
			pushstream playlist '{"playlist":"playlist"}'
			;;
	esac
done
