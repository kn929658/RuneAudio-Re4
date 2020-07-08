#!/bin/bash

curlPage() {
	curl -s -X POST 'http://127.0.0.1/pub?id=refresh' -d '{ "page": "mpd" }'
}

dirsystem=/srv/http/data/system

if [[ $1 == audiooutput ]]; then
	[[ ${2:0:7} == WM5102 ]] && /srv/http/bash/mpd-wm5102.sh $3 ${2/*-} &> /dev/null
	if [[ $2 != $( cat /srv/http/data/system/usbdac 2> /dev/null ) ]]; then
		echo $2 > $dirsystem/audio-aplayname
		echo $4 > $dirsystem/audio-output
	fi
	sed -i -e '/output_device = / s/".*"/"hw:'$3'"/
	' -e '/mixer_control_name = / s/".*"/"'$5'"/
	' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync shairport-meta
	curlPage
elif [[ $1 == autoupdate ]]; then
	if [[ $2 == true ]]; then
		sed -i '1 i\auto_update        "yes"' /etc/mpd.conf
		touch $dirsystem/mpd-autoupdate
	else
		sed -i '/^auto_update/ d' /etc/mpd.conf
		rm $dirsystem/mpd-autoupdate
	fi
	systemctl restart mpd
	curlPage
elif [[ $1 == buffer ]]; then
	if [[ -n $2 ]]; then
		sed -i -e '/^audio_buffer/ d
		' -e '1 i\audio_buffer_size  "'$2'"' /etc/mpd.conf
		echo $2 > $dirsystem/mpd-buffer
	else
		sed -i '/^audio_buffer/ d' /etc/mpd.conf
		rm $dirsystem/mpd-buffer
	fi
	systemctl restart mpd
	curlPage
elif [[ $1 == crossfade ]]; then
	if [[ -n $2 ]]; then
		mpc crossfade $2
		echo $2 > $dirsystem/mpd-crossfade
	else
		mpc crossfade 0
		rm $dirsystem/mpd-crossfade
	fi
	systemctl restart mpd
	curlPage
elif [[ $1 == dop ]]; then
	if [[ $2 == true ]]; then
		echo $2 > $dirsystem/mpd-dop
	else
		rm $dirsystem/mpd-dop
	fi
	systemctl restart mpd
	curlPage
elif [[ $1 == ffmpeg ]]; then
	if [[ $2 == true ]]; then
		sed -i '/ffmpeg/ {n; s/".*"/"yes"/}' /etc/mpd.conf
		touch $dirsystem/mpd-ffmpeg
	else
		sed -i '/ffmpeg/ {n; s/".*"/"no"/}' /etc/mpd.conf
		rm $dirsystem/mpd-ffmpeg
	fi
	systemctl restart mpd
	curlPage
elif [[ $1 == getstatus ]]; then
	echo 111
elif [[ $1 == mixerhw ]]; then
	sed -i '/'$2'/,/mixer_control/ s/\(mixer_control \+"\).*/\1"'$3'"/' /etc/mpd.conf
	sed -i '/mixer_control_name = / s/".*"/"'$3'"/' /etc/shairport-sync.conf
	if [[ $4 == auto ]]; then
		rm /srv/http/data/system/mpd-hwmixer-$5
	else
		echo $4 > /srv/http/data/system/mpd-hwmixer-$5
	fi
	systemctl try-restart mpd shairport-sync shairport-meta
	curlPage
elif [[ $1 == mixerset ]]; then
	volumenone=0
	if [[ $2 == none ]]; then
		[[ -n $5 ]] && amixer -c $4 sset $5 0dB
		volumenone=1
	elif [[ $2 == hardware ]]; then
		rm "$dirsystem/mpd-mixertype-$3"
	else
		echo $2 > "$dirsystem/mpd-mixertype-$3"
	fi
	systemctl restart mpd
	curlPage
	curl -s -X POST 'http://127.0.0.1/pub?id=volumenone' -d '{ "pvolumenone": "'$volumenone'" }'
elif [[ $1 == normalization ]]; then
	if [[ $2 == true ]]; then
		sed -i '/^user/ a\volume_normalization "yes"' /etc/mpd.conf
		touch $dirsystem/mpd-normalization
	else
		sed -i '/^volume_normalization/ d' /etc/mpd.conf
		rm $dirsystem/mpd-normalization
	fi
	systemctl restart mpd
	curlPage
elif [[ $1 == novolume ]]; then
	sed -i -e '/mixer_type/ s/".*"/"none"/
	' -e '/mixer_control\|mixer_device\|volume_normalization/ d
	' -e '/^replaygain/ s/".*"/"off"/' /etc/mpd.conf
	echo none > "$dirsystem/mpd-mixertype-$2"
	rm $dirsystem/{mpd-replaygain,mpd-normalization}
	mpc crossfade 0
	systemctl restart mpd
	curlPage
	curl -s -X POST 'http://127.0.0.1/pub?id=volumenone' -d '{ "pvolumenone": "1" }'
elif [[ $1 == replaygain ]]; then
	if [[ -n $2 ]]; then
		sed -i '/^replaygain/ s/".*"/"'$2'"/' /etc/mpd.conf
		echo $2 $dirsystem/mpd-replaygain
	else
		sed -i '/^replaygain/ s/".*"/"off"/' /etc/mpd.conf
		rm $dirsystem/mpd-replaygain
	fi
	systemctl restart mpd
	curlPage
fi
