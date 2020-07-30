#!/bin/bash

for pid in $( pgrep mpd ); do
	ionice -c 0 -n 0 -p $pid
	renice -n -19 -p $pid
done

curlPost() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

mpc idleloop | while read changed; do
	case $changed in
		database )
			curlPost mpddatabase 1
			;;
		options )
			curlPost mpdoptions "$( /srv/http/bash/status.sh statusonly )"
			;;
		player )
			flag=/srv/http/data/tmp/prevnext
			if [[ ! -e $flag ]]; then # suppress prev/next while stop - mpc play
				touch $flag
				status=$( /srv/http/bash/status.sh )
				if [[ ! -e /srv/http/data/system/player-snapclient ]]; then
					curlPost mpdplayer "$status"
				else
					sed -i '/^$/d' $snapclientfile # remove blank lines
					if [[ -s $snapclientfile ]]; then
						mapfile -t clientip < $snapclientfile
						for ip in "${clientip[@]}"; do
							curlPost mpdplayer "$status"
						done
					else
						rm $snapclientfile
					fi
				fi
				rm -f $flag
			fi
			;;
		playlistplayer )
			status=$( /srv/http/bash/status.sh )
			curlPost mpdplayer "$status"
			;;
		playlist )
			curlPost playlist '{"playlist":"playlist"}'
			;;
	esac
done
