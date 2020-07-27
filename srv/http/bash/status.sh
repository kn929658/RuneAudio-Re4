#!/bin/bash

playerfile=/srv/http/data/system/player
########
status=$( cat $playerfile )
status+='
	, "webradio" : false
	, "gpio"     : '$( [[ -e /srv/http/data/system/gpio ]] && echo true || echo false )'
	, "gpioon"   : '$( [[ -e  /srv/http/data/tmp/gpiotimer ]] && echo true || echo false )
if [[ -e $playerfile-snapclient ]]; then
	[[ ! -e /srv/http/data/tmp/snapserverpw ]] && snapserverpw=rune || snapserverpw=$( cat /srv/http/data/tmp/snapserverpw )
########
	status+='
		, "snapserverip" : "'$( cat /srv/http/data/tmp/snapserverip )'"
		, "snapserverpw" : "'$snapserverpw'"'
	echo {$status}
	exit
elif [[ -e $playerfile-spotify ]]; then
	file=/srv/http/data/tmp/spotify
	elapsed=$( cat $file-elapsed 2> /dev/null || echo 0 )
	state=$( cat $file-state )
	if [[ $state == play ]]; then
		start=$( cat $file-start )
		now=$( date +%s%3N )
		elapsed=$(( now - start + elapsed ))
		time=$( sed 's/.*"Time"\s*:\s*\(.*\)\s*,\s*"Title".*/\1/' < $file )
		if (( $elapsed > $(( time * 1000 )) )); then
			elapsed=0
			echo 0 > $file-elapsed
		fi
	fi
########
	status+=$( cat $file )
	status+='
		, "elapsed" : '$(( ( elapsed + 500 ) / 1000 ))'
		, "state"   : "'$state'"
		, "volume"  : '$( mpc volume | cut -d: -f2 | tr -d ' %' )
	echo {$status}
	exit
elif [[ -e $playerfile-airplay ]]; then
	path=/srv/http/data/tmp/airplay
	if [[ ! -e $path-volume ]]; then
		card=$( grep output_device /etc/shairport-sync.conf | cut -d'"' -f2 | cut -d: -f2 )
		mixer=$( grep mixer_control /etc/shairport-sync.conf | cut -d'"' -f2 )
		amixer -c $card sget $mixer | grep % | sed 's/.*\[\(.*\)%.*/\1/' > $path-volume
	fi
	for item in Artist Album coverart Title; do
		val=$( cat $path-$item 2> /dev/null )
		[[ -n $val ]] && status+=', "'$item'":"'${val//\"/\\\"}'"' # escape " for json - no need for ' : , [ {
	done
	start=$( cat $path-start 2> /dev/null )
	Time=$( cat $path-Time 2> /dev/null )
	if [[ -n $start && -n $Time ]]; then
		now=$( date +%s%3N )
		elapsed=$(( ( now - start + 500 ) / 1000 ))
	fi
	volume=$( cat $path-volume 2> /dev/null )
	[[ -z $volume ]] && volume=false
########
	[[ -e /srv/http/data/tmp/airplay-coverart.jpg ]] && coverart=/data/tmp/airplay-coverart.$( date +%s ).jpg
	status+='
		, "coverart"       : "'$coverart'"
		, "elapsed"        : '$elapsed'
		, "playlistlength" : 1
		, "sampling"       : "16 bit 44.1 kHz 1.41 Mbit/s • AirPlay"
		, "state"          : "play"
		, "Time"           : '$Time'
		, "volume"         : '$volume'
		, "volumemute"     : 0'
	echo {$status}
	exit
fi

filter='Album\|Artist\|audio\|bitrate\|consume\|duration\|elapsed\|file\|Name\|playlistlength\|random\|repeat\|single\|^song:\|state\|Time\|Title\|updating_db\|volume'
mpdStatus() {
	mpdtelnet=$( { echo clearerror; echo status; echo $1; sleep 0.05; } \
		| telnet 127.0.0.1 6600 2> /dev/null \
		| grep "$filter" )
}
mpdStatus currentsong

# when playlist is empty, add song without play - currentsong = (blank)
! grep -q '^file:' <<<"$mpdtelnet" && mpdStatus 'playlistinfo 0'

readarray -t lines <<<"$mpdtelnet"
for line in "${lines[@]}"; do
	key=${line/:*}
	val=${line#*: }
	case $key in
		audio )
			samplerate=${val/:*}
			bitdepth=$( echo $val | cut -d: -f2 );;
		bitrate )
			bitrate=$(( val * 1000 ));;
		# true/false
		consume | random | repeat | single )
			[[ $val == 1 ]] && tf=true || tf=false
########
			status+=', "'$key'" : '$tf;;
		# number
		duration | elapsed | playlistlength | song | Time | volume )
			printf -v $key '%s' $val;; # value of $key as "var name" - value of $val as "var value"
		# string - escaped name
		Album | AlbumArtist | Artist | Name | Title )
			printf -v $key '%s' "${val//\"/\\\"}";; # escape " for json
		file )
			file0=$val             # no escape " for coverart and ffprobe
			file=${val//\"/\\\"};; # escape " for json
		# string
		* ) # state | updating_db
			printf -v $key '%s' "$val"
	esac
done

[[ -z $elapsed ]] && elapsed=false || elapsed=$( printf '%.0f\n' $elapsed )
[[ -z $playlistlength ]] && playlistlength=0
[[ -z $song ]] && song=false
[[ -z $Time ]] && Time=false
[[ -z $updating_db ]] && updating_db=false || updating_db=true
[[ -z $volume ]] && volume=false
########
status+='
	, "elapsed"        : '$elapsed'
	, "file"           : "'$file'"
	, "playlistlength" : '$playlistlength'
	, "song"           : '$song'
	, "state"          : "'$state'"
	, "updating_db"    : '$updating_db'
	, "volume"         : '$volume'
	, "volumemute"     : '$( cat /srv/http/data/system/volumemute 2> /dev/null || echo 0 )'
	, "librandom"      : '$( systemctl -q is-active libraryrandom && echo true || echo false )'
	, "playlists"      : '$( ls /srv/http/data/playlists | wc -l )

if [[ -z $playlistlength ]]; then
	echo {$status}
	exit
fi

if [[ ${file:0:4} == http ]]; then
	gatewaynet=$( ip route | awk '/default/ {print $3}' | cut -d. -f1-2 )
	urlnet=$( echo $file | sed 's|.*//\(.*\):.*|\1|' | cut -d. -f1-2 )
	if systemctl -q is-active upmpdcli && [[ $gatewaynet == $urlnet ]]; then # internal ip
		ext=UPnP
########
		status+='
			, "Album"  : "'$Album'"
			, "Artist" : "'$Artist'"
			, "Time"   : "'$( printf '%.0f\n' $duration )'"
			, "Title"  : "'$Title'"
		'
	else
		ext=Radio
		# before webradios play: no 'Name:' - use station name from file instead
		radiofile="/srv/http/data/webradios/${file//\//|}"
		stationname=$( head -1 "$radiofile" | cut -d^ -f1 )
		if [[ $state != stop ]]; then
			[[ -n $Name ]] && Artist=$Name || Artist=$stationname
		else
			Artist=$stationname
			Title=
		fi
########
		status+='
			, "Album"    : "'$file'"
			, "Artist"   : "'$Artist'"
			, "Name"     : "'$stationname'"
			, "Time"     : false
			, "Title"    : "'$Title'"
			, "webradio" : 'true
		systemctl start radiowatchdog
	fi
else
	ext=${file/*.}
	ext=${ext^^}
	position="$(( song + 1 ))/$playlistlength &bull; "
	# missing id3tags
	[[ -z $Album ]] && Album=
	[[ -z $Artist ]] && Artist=$AlbumArtist
	[[ -z $Artist ]] && dirname=${file%\/*} && Artist=${dirname/*\/}
	[[ -z $Title ]] && filename=${file/*\/} && Title=${filename%.*}
########
	status+='
		, "Album"  : "'$Album'"
		, "Artist" : "'$Artist'"
		, "Time"   : '$Time'
		, "Title"  : "'$Title'"
	'
	systemctl stop radiowatchdog
fi

if [[ $1 == statusonly
	|| $playlistlength == 0
	|| ( $Artist == $1 && $Album == $2 ) # the same song
	&& $ext != Radio
]]; then
	echo {$status}
	exit
fi

# coverart
if [[ $ext != Radio ]]; then
	coverart=$( /srv/http/bash/cmd-coverart.sh "\
$file0
$Artist
$Album" )
elif [[ -e $radiofile ]]; then
	coverart=$( sed -n '3 p' $radiofile )
	title=$( sed 's/ *(.*)$\| *$//g' <<< $Title ) # Title='artist - title (extra)' - remove trailing space and extra tag
	/srv/http/bash/cmd-coverart.sh "\

${title/ -*}
${title/* -}
title"
fi
########
status+=', "coverart" : "'$coverart'"'

samplingLine() {
	bitdepth=$1
	samplerate=$2
	bitrate=$3
	ext=$4
	
	sampletext="$( awk "BEGIN { printf \"%.1f\n\", $samplerate / 1000 }" ) kHz"
	[[ -z $bitrate ]] && bitrate=$(( bitdepth * samplerate * 2 ))
	if (( $bitrate < 1000000 )); then
		bitratetext="$(( bitrate / 1000 )) kbit/s"
	else
		[[ $bitdepth == dsd ]] && bitrate=$(( bitrate / 2 ))
		bitratetext="$( awk "BEGIN { printf \"%.2f\n\", $bitrate / 1000000 }" ) Mbit/s"
	fi
	
	if [[ $bitdepth == dsd ]]; then
			sampling="${samplerate^^} &bull; $bitratetext"
	else
		if [[ $bitdepth == 'N/A' ]]; then # lossy has no bitdepth
			[[ $ext == WAV || $ext == AIFF ]] && bittext="$(( bitrate / samplerate / 2 )) bit "
		else
			[[ -n $bitdepth && $ext != MP3 ]] && bittext="$bitdepth bit "
		fi
		[[ $ext != UPnP ]] && extension=" &bull; $ext"
		sampling="$bittext$sampletext $bitratetext$extension"
	fi
}

if [[ $state != stop ]]; then
	[[ $ext == DSF || $ext == DFF ]] && bitdepth=dsd
	# save only webradio: update sampling database on each play
	if [[ $ext != Radio ]]; then
		samplingLine $bitdepth $samplerate $bitrate $ext
	else
		if [[ $bitrate != 0 ]]; then
			samplingLine $bitdepth $samplerate $bitrate $ext
			sed -i "1 c$stationname^^$sampling" $radiofile
		else
			sampling=$( head -1 $radiofile | cut -d^ -f3 )
		fi
	fi
else
	if [[ $ext == Radio ]]; then
		sampling=$( head -1 $radiofile | cut -d^ -f3 )
	else
		if [[ $ext == DSF || $ext == DFF ]]; then
			# DSF: byte# 56+4 ? DSF: byte# 60+4
			[[ $ext == DSF ]] && byte=56 || byte=60;
			hex=( $( hexdump -x -s$byte -n4 "/mnt/MPD/$file" | head -1 | tr -s ' ' ) )
			dsd=$(( ${hex[1]} / 1100 * 64 )) # hex byte#57-58 - @1100:dsd64
			bitrate=$( awk "BEGIN { printf \"%.2f\n\", $dsd * 44100 / 1000000 }" )
			sampling="DSD$dsd • $bitrate Mbit/s &bull; $ext"
		else
			data=( $( ffprobe -v quiet -select_streams a:0 \
				-show_entries stream=bits_per_raw_sample,sample_rate \
				-show_entries format=bit_rate \
				-of default=noprint_wrappers=1:nokey=1 \
				"/mnt/MPD/$file0" ) )
			samplerate=${data[0]}
			bitdepth=${data[1]}
			bitrate=${data[2]}
			samplingLine $bitdepth $samplerate $bitrate $ext
		fi
	fi
fi
########
status+=', "sampling" : "'$position$sampling'"'

echo {$status}
