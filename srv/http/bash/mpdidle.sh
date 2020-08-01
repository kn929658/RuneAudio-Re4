#!/bin/bash

for pid in $( pgrep mpd ); do
	ionice -c 0 -n 0 -p $pid
	renice -n -19 -p $pid
done

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

mpc idleloop | while read changed; do
	case $changed in
		options )
			pushstream mpdoptions "$( /srv/http/bash/status.sh statusonly )"
			;;
		player )
			flag=/srv/http/data/tmp/prevnext
			if [[ ! -e $flag ]]; then # suppress on prev/next
				status=$( /srv/http/bash/status.sh )
				pushstream mpdplayer "$status"
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
