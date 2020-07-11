#!/bin/bash

dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "mpd" }'
}
restartMPD() {
	/srv/http/bash/mpd-conf.sh
}

case ${args[0]} in

amixer )
	amixer -c ${args[1]}scontents \
		| grep -A2 'Simple mixer control' \
		| grep -v 'Capabilities' \
		| tr -d '\n' \
		| sed 's/--/\n/g' \
		| grep 'Playback channels' \
		| sed "s/.*'\(.*\)',\(.\) .*/\1 \2/; s/ 0$//" \
		| awk '!a[$0]++'
	;;
audiooutput )
	[[ ${2:0:7} == WM5102 ]] && /srv/http/bash/mpd-wm5102.sh ${args[2]} ${2/*-} &> /dev/null
	if [[ ${args[1]} != $( cat /srv/http/data/system/usbdac 2> /dev/null ) ]]; then
		echo ${args[1]} > $dirsystem/audio-aplayname
		echo ${args[3]} > $dirsystem/audio-output
	fi
	sed -i -e '/output_device = / s/".*"/"hw:'${args[2]}'"/
	' -e '/mixer_control_name = / s/".*"/"'${args[4]}'"/
	' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync shairport-meta
	pushRefresh
	;;
autoupdate )
	if [[ ${args[1]} == true ]]; then
		sed -i '1 i\auto_update          "yes"' /etc/mpd.conf
		touch $dirsystem/mpd-autoupdate
	else
		sed -i '/^auto_update/ d' /etc/mpd.conf
		rm $dirsystem/mpd-autoupdate
	fi
	restartMPD
	pushRefresh
	;;
buffer )
	if [[ -n ${args[1]} ]]; then
		sed -i -e '/^audio_buffer/ d
		' -e '1 i\audio_buffer_size    "'${args[1]}'"' /etc/mpd.conf
		echo ${args[1]} > $dirsystem/mpd-buffer
	else
		sed -i '/^audio_buffer/ d' /etc/mpd.conf
		rm $dirsystem/mpd-buffer
	fi
	restartMPD
	pushRefresh
	;;
crossfade )
	if [[ -n ${args[1]} ]]; then
		mpc crossfade ${args[1]}
		echo ${args[1]} > $dirsystem/mpd-crossfade
	else
		mpc crossfade 0
		rm $dirsystem/mpd-crossfade
	fi
	pushRefresh
	;;
count )
	albumartist=$( mpc list albumartist | awk NF | wc -l )
	composer=$( mpc list composer | awk NF | wc -l )
	genre=$( mpc list genre | awk NF | wc -l )
	count="$count $( mpc stats | head -n3 | awk '{print $2,$4,$6}' )"

	data='
		  "album"       : '$( echo $count | cut -d' ' -f2 )'
		, "albumartist" : '$albumartist'
		, "artist"      : '$( echo $count | cut -d' ' -f1 )'
		, "composer"    : '$composer'
		, "coverart"    : '$( ls -1q /srv/http/data/coverarts | wc -l )'
		, "date"        : '$( mpc list date | awk NF | wc -l )'
		, "genre"       : '$genre'
		, "nas"         : '$( mpc ls NAS 2> /dev/null | wc -l )'
		, "sd"          : '$( mpc ls SD 2> /dev/null | wc -l )'
		, "song"        : '$( echo $count | cut -d' ' -f3 )'
		, "usb"         : '$( mpc ls USB 2> /dev/null | wc -l )'
		, "webradio"    : '$( ls -U /srv/http/data/webradios/* 2> /dev/null | wc -l )
	mpc | grep -q Updating && data+=', "updating_db":1'
	echo {$data}
	echo $albumartist $composer $genre > /srv/http/data/system/mpddb
	;;
dop )
	if [[ ${args[1]} == true ]]; then
		touch "$dirsystem/mpd-dop-${args[2]}"
	else
		rm "$dirsystem/mpd-dop-${args[2]}"
	fi
	restartMPD
	pushRefresh
	;;
ffmpeg )
	if [[ ${args[1]} == true ]]; then
		sed -i '/ffmpeg/ {n; s/".*"/"yes"/}' /etc/mpd.conf
		touch $dirsystem/mpd-ffmpeg
	else
		sed -i '/ffmpeg/ {n; s/".*"/"no"/}' /etc/mpd.conf
		rm $dirsystem/mpd-ffmpeg
	fi
	restartMPD
	pushRefresh
	;;
mixerhw )
	sed -i '/'${args[1]}'/,/}/ s/\(mixer_control \+"\).*/\1"'${args[2]}'"/' /etc/mpd.conf
	sed -i '/mixer_control_name = / s/".*"/"'${args[2]}'"/' /etc/shairport-sync.conf
	if [[ ${args[3]} == auto ]]; then
		rm /srv/http/data/system/mpd-hwmixer-${args[4]}
	else
		echo ${args[3]} > /srv/http/data/system/mpd-hwmixer-${args[4]}
	fi
	systemctl try-restart shairport-sync shairport-meta
	restartMPD
	pushRefresh
	;;
mixerset )
	volumenone=0
	if [[ ${args[1]} == none ]]; then
		[[ -n ${args[4]} ]] && amixer -c ${args[3]} sset ${args[4]} 0dB
		volumenone=1
	fi
	if [[ ${args[1]} == hardware ]]; then
		rm "$dirsystem/mpd-mixertype-${args[2]}"
	else
		echo ${args[1]} > "$dirsystem/mpd-mixertype-${args[2]}"
	fi
	restartMPD
	pushRefresh
	curl -s -X POST 'http://127.0.0.1/pub?id=volumenone' -d '{ "pvolumenone": "'$volumenone'" }'
	;;
normalization )
	if [[ ${args[1]} == true ]]; then
		sed -i '/^user/ a\volume_normalization "yes"' /etc/mpd.conf
		touch $dirsystem/mpd-normalization
	else
		sed -i '/^volume_normalization/ d' /etc/mpd.conf
		rm $dirsystem/mpd-normalization
	fi
	restartMPD
	pushRefresh
	;;
novolume )
	sed -i -e '/volume_normalization/ d
	' -e '/^replaygain/ s/".*"/"off"/
	' /etc/mpd.conf
	echo none > "$dirsystem/mpd-mixertype-${args[1]}"
	mpc crossfade 0
	rm $dirsystem/{mpd-crossfade,mpd-replaygain,mpd-normalization}
	restartMPD
	pushRefresh
	curl -s -X POST 'http://127.0.0.1/pub?id=volumenone' -d '{ "pvolumenone": "1" }'
	;;
replaygain )
	if [[ -n ${args[1]} ]]; then
		sed -i '/^replaygain/ s/".*"/"'${args[1]}'"/' /etc/mpd.conf
		echo ${args[1]} $dirsystem/mpd-replaygain
	else
		sed -i '/^replaygain/ s/".*"/"off"/' /etc/mpd.conf
		rm $dirsystem/mpd-replaygain
	fi
	restartMPD
	pushRefresh
	;;
statusmpd )
	systemctl status mpd \
		| sed 's|\(active (running)\)|<grn>\1</grn>|; s|\(inactive (dead)\)|<red>\1</ed>|'
	;;

esac
