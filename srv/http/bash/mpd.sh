#!/bin/bash

pushRefresh() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "mpd" }'
}
restartMPD() {
	/srv/http/bash/mpd-conf.sh
}

dirsystem=/srv/http/data/system

case $1 in

amixer )
	amixer -c $2scontents \
		| grep -A2 'Simple mixer control' \
		| grep -v 'Capabilities' \
		| tr -d '\n' \
		| sed 's/--/\n/g' \
		| grep 'Playback channels' \
		| sed "s/.*'\(.*\)',\(.\) .*/\1 \2/; s/ 0$//" \
		| awk '!a[$0]++'
	;;
audiooutput )
	[[ ${2:0:7} == WM5102 ]] && /srv/http/bash/mpd-wm5102.sh $3 ${2/*-} &> /dev/null
	if [[ $2 != $( cat /srv/http/data/system/usbdac 2> /dev/null ) ]]; then
		echo $2 > $dirsystem/audio-aplayname
		echo $4 > $dirsystem/audio-output
	fi
	sed -i -e '/output_device = / s/".*"/"hw:'$3'"/
	' -e '/mixer_control_name = / s/".*"/"'$5'"/
	' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync shairport-meta
	pushRefresh
	;;
autoupdate )
	if [[ $2 == true ]]; then
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
	if [[ -n $2 ]]; then
		sed -i -e '/^audio_buffer/ d
		' -e '1 i\audio_buffer_size    "'$2'"' /etc/mpd.conf
		echo $2 > $dirsystem/mpd-buffer
	else
		sed -i '/^audio_buffer/ d' /etc/mpd.conf
		rm $dirsystem/mpd-buffer
	fi
	restartMPD
	pushRefresh
	;;
crossfade )
	if [[ -n $2 ]]; then
		mpc crossfade $2
		echo $2 > $dirsystem/mpd-crossfade
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
		, "nas"         : '$( mpc ls NAS | wc -l )'
		, "sd"          : '$( mpc ls SD | wc -l )'
		, "song"        : '$( echo $count | cut -d' ' -f3 )'
		, "usb"         : '$( mpc ls USB | wc -l )'
		, "webradio"    : '$( ls -U /srv/http/data/webradios/* 2> /dev/null | wc -l )
	mpc | grep -q Updating && data+=', "updating_db":1'
	echo {$data}
	echo $albumartist $composer $genre > /srv/http/data/system/mpddb
	;;
dop )
	if [[ $2 == true ]]; then
		touch "$dirsystem/mpd-dop-$3"
	else
		rm "$dirsystem/mpd-dop-$3"
	fi
	restartMPD
	pushRefresh
	;;
ffmpeg )
	if [[ $2 == true ]]; then
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
	sed -i '/'$2'/,/}/ s/\(mixer_control \+"\).*/\1"'$3'"/' /etc/mpd.conf
	sed -i '/mixer_control_name = / s/".*"/"'$3'"/' /etc/shairport-sync.conf
	if [[ $4 == auto ]]; then
		rm /srv/http/data/system/mpd-hwmixer-$5
	else
		echo $4 > /srv/http/data/system/mpd-hwmixer-$5
	fi
	systemctl try-restart shairport-sync shairport-meta
	restartMPD
	pushRefresh
	;;
mixerset )
	volumenone=0
	if [[ $2 == none ]]; then
		[[ -n $5 ]] && amixer -c $4 sset $5 0dB
		volumenone=1
	fi
	if [[ $2 == hardware ]]; then
		rm "$dirsystem/mpd-mixertype-$3"
	else
		echo $2 > "$dirsystem/mpd-mixertype-$3"
	fi
	restartMPD
	pushRefresh
	curl -s -X POST 'http://127.0.0.1/pub?id=volumenone' -d '{ "pvolumenone": "'$volumenone'" }'
	;;
normalization )
	if [[ $2 == true ]]; then
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
	echo none > "$dirsystem/mpd-mixertype-$2"
	mpc crossfade 0
	rm $dirsystem/{mpd-crossfade,mpd-replaygain,mpd-normalization}
	restartMPD
	pushRefresh
	curl -s -X POST 'http://127.0.0.1/pub?id=volumenone' -d '{ "pvolumenone": "1" }'
	;;
replaygain )
	if [[ -n $2 ]]; then
		sed -i '/^replaygain/ s/".*"/"'$2'"/' /etc/mpd.conf
		echo $2 $dirsystem/mpd-replaygain
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
