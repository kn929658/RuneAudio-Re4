#!/bin/bash

dircoverarts=/srv/http/data/coverarts
dirtmp=/srv/http/data/tmp
path=$1
replaceexist=$3
copyembedded=$5

. /srv/http/bash/addons-functions.sh

if [[ $2 == 1 ]]; then
	echo -e "$bar Update database ..."
	mpc update
fi
if [[ $4 == 1 ]]; then
	echo -e "$bar Remove entire thumbnails ..."
	rm $dircoverarts/*
fi

timestart

Sstart=$( date +%s )

findCoverFile() {
	coverfile=
	found=
	for name in cover folder front thumb album; do
		for ext in jpg png gif; do
			coverfile="$dir/$name.$ext"
			[[ -e "$coverfile" ]] && found=1 && break
			
			coverfile="$dir/${name^}.$ext" # capitalize
			[[ -e "$coverfile" ]] && found=1 && break
			
		done
		[[ $found == 1 ]] && break
		
	done
}
createThumbnail() {
	mpdpath=${dir:9}
	echo
	elapse=$(( $( date +%s ) - $Sstart ))
	[[ $percent > 0 ]] && total=$( formatTime $(( $elapse * 100 / $percent )) ) || total=0
	elapse=$( formatTime $elapse )
	echo ${percent}% $( tcolor "$elapse/$total $i/$count" 8 ) $( tcolor "$mpdpath" )
	# skip if non utf-8 name
	if [[ $( echo $mpdpath | grep -axv '.*' ) ]]; then
		(( nonutf8++ ))
		echo -e "$padR Skip - Path contains non UTF-8 characters."
		echo $mpdpath >> $nonutf8log
		return
	fi
	
	cuefile=$( find "$dir" -maxdepth 1 -type f -name '*.cue' | head -1 )
	if [[ -z $cuefile ]]; then
		albumartist=$( mpc ls -f "[%album%^[%albumartist%|%artist%]]" "$mpdpath" 2> /dev/null \
						| awk '/\^/ && !a[$0]++ && NF' \
						| head -1 )
		if [[ -z $albumartist ]]; then
			echo "  No files in MPD database."
			return
		fi
		album=$( echo "$albumartist" | cut -d^ -f1 )
		artist=$( echo "$albumartist" | cut -d^ -f2 )
		if [[ -z $album || -z $artist ]]; then
			echo "  Missing album or artist tag."
			return
		fi
	else
		album=$( cat "$cuefile" | grep -m 1 '^TITLE' | cut -d'"' -f2 )
		artist=$( cat "$cuefile" | grep -m 1 'PERFORMER' | cut -d'"' -f2 )
	fi
	# "/" not allowed in filename, ", "#" and "?" not allowed in img src
	thumbnameS=$( echo "$album^^$artist" | sed 's/\//|/g; s/#/{/g; s/?/}/g' )
	thumbname="$thumbnameS^^$( echo "$mpdpath" | sed 's/\//|/g; s/#/{/g; s/?/}/g' )"
	thumbfileS="$dircoverarts/$thumbnameS.jpg"
	thumbfile="$dircoverarts/$thumbname.jpg"
	if (( ${#thumbfile} > 255 )); then
		thumbfile=$thumbfileS
		if (( ${#thumbfile} > 255 )); then
			(( longname++ ))
			echo -e "$padR Skip - Name longer than 255 characters:"
			echo "  $thumbfile"
			echo -e "$thumbfile\n" >> $longnamelog
			return
		fi
	else
		# previous version - rename to include $mpdpath
		mv "$thumbfileS" "$thumbfile" &> /dev/null
	fi
	
	if [[ -e "$thumbfile" ]]; then
		# names after escaped
		albumname=${album//\"/\\\"}
		artistname=${artist//\"/\\\"}
		mpcfind=$( mpc find albumartist "$artistname" album "$albumname" \
					| sed 's|\(.*\)/.*|\1|' \
					| awk '!a[$0]++' )
		if (( $( echo "$mpcfind" | wc -l ) > 1 )); then
			(( dup++ ))
			echo -e "$padY Skip - Duplicate name:"
			echo "  $albumname - $artistname"
			echo -e "$mpcfind\n" >> $duplog
			return
		elif [[ $replaceexist != 1 ]]; then
			(( exist++ ))
			echo -e "$padW #$exist Skip - Thumbnail exists:"
			echo "  $( basename "$thumbfile" )"
			if [[ $copyembedded == 1 ]]; then # copy embedded
				findCoverFile
				[[ $found == 1 ]] && return
				
				if [[ -w "$dir" ]]; then
					mpcls=$( mpc ls "$mpdpath" )
					[[ -z $mpcls ]] && continue
					readarray -t lists <<<"$mpcls"
					for list in "${lists[@]}"; do # if path contains mpd file and not *.wav
						file="/mnt/MPD/$list"
						[[ -d "$file" || ${file/*.} == wav ]] && continue
						
						coverfile="$dir/cover.jpg"
						kid3-cli -c "select \"$file\"" -c "get picture:\"$coverfile\""
						if [[ -e $coverfile ]]; then
							(( copy++ ))
							echo "  Source: Embedded coverart"
							echo -e "$padM #$copy - Copy to external file."
							break
						fi
						
					done
				else
					(( permission++ ))
					echo -e "$padR Copy denied - No write permission."
					echo -e "$permission\n" >> $permissionlog
				fi
			fi
			return
		fi
	fi
	
	findCoverFile
	
	if [[ $found == 1 ]]; then
		if [[ $ext != gif ]]; then
			convert "$coverfile" -thumbnail 200x200 -unsharp 0x.5 "$thumbfile"
		else
			echo "  Resize animated GIF ..."
			convert "$coverfile" -coalesce -resize 200x200 "${thumbfile:0:-3}gif"
		fi
		if [[ $? == 0 ]]; then
			echo "  Source: $( basename "$coverfile" )"
			if [[ $replaceexist == 1 ]]; then
				(( replace++ ))
				echo -e "$padG #$replace - Replace existing."
			else
				(( thumb++ ))
				echo -e "$padC #$thumb - New thumbnail created."
			fi
			return
		fi
	fi
	
	if [[ -z $cuefile ]]; then
		mpcls=$( mpc ls "$mpdpath" )
		[[ -z $mpcls ]] && continue
		readarray -t lists <<<"$mpcls"
		for list in "${lists[@]}"; do # if path contains mpd file and not *.wav
			file="/mnt/MPD/$list"
			[[ -d "$file" || ${file/*.} == wav ]] && continue
			
			findCoverFile
			[[ $found == 1 ]] && break
			
			# find embedded
			coverfile=$dirtmp/cover.jpg
			kid3-cli -c "select \"$file\"" -c "get picture:$coverfile"
			[[ -e $coverfile ]] && found=1 && break
			
		done
		if [[ $found == 1 ]]; then
			if [[ ${coverfile:0:4} != '/srv' ]]; then
				echo "  Source: $( basename "$coverfile" )"
				return
			else
				echo "  Source: Embedded coverart"
				convert "$coverfile" -thumbnail 200x200 -unsharp 0x.5 "$thumbfile"
				if [[ $copyembedded == 1 ]]; then
					if [[ -w "$dir" ]]; then
						mv $coverfile "$dir"
						(( copy++ ))
						echo -e "$padM #$copy - Copy to external file."
					else
						echo -e "$padR Copy denied - No write permission."
					fi
				else
					rm "$coverfile"
				fi
				if [[ $? == 0 ]]; then
					if [[ $replaceexist == 1 ]]; then
						(( replace++ ))
						echo -e "$padG #$replace - Replace existing."
					else
						(( thumb++ ))
						echo -e "$padC #$thumb - New thumbnail created."
					fi
					return
				fi
			fi
		fi
	fi

	ln -s /srv/http/assets/img/cover.svg "${thumbfile:0:-3}svg"
	(( dummy++ ))
	echo -e "$padGr #$dummy Dummy - No coverart found."
}

cue=
replace=0
exist=0
thumb=0
dummy=0
copy=0
padGr=$( tcolor '.' 8 8 )
padW=$( tcolor '.' 7 7 )
padC=$( tcolor '.' 6 6 )
padM=$( tcolor '.' 6 5 )
padY=$( tcolor '.' 3 3 )
padG=$( tcolor '.' 2 2 )
padR=$( tcolor '.' 1 1 )
nonutf8=0
longname=0
dup=0
permission=0
nonutf8log=$dirtmp/list-nonutf8.log
longnamelog=$dirtmp/list-longnames.log
duplog=$dirtmp/list-duplicates.log
permissionlog=$dirtmp/list-permissions.log
echo -e "Non-UTF8 Named Files - $( date +"%D %T" )\n" > $nonutf8log
echo -e "Too Long Named Files - $( date +"%D %T" )\n" > $longnamelog
echo -e "Duplicate Artist-Album - $( date +"%D %T" )\n" > $duplog
echo -e "No Write Permission Directories - $( date +"%D %T" )\n" > $permissionlog

[[ -n $( ls $dircoverarts ) ]] && update=Update || update=Create
coloredname=$( tcolor 'Browse By CoverArt' )

title -l '=' "$bar $update thumbnails for $coloredname ..."

echo Base directory: $( tcolor "$path" )
find=$( find "$path" -mindepth 1 ! -empty ! -path '*/\.*' -type d | sort )
[[ -z $find ]] && find=$path

# omit .mpdignore
mpdignore=$( find "$path" -mindepth 1 -name .mpdignore -type f )
if [[ -n $mpdignore ]]; then
	readarray -t files <<<"$mpdignore"
	for file in "${files[@]}"; do
		dir=$( dirname "$file" )
		mapfile -t ignores < "$file"
		for ignore in "${ignores[@]}"; do
			find=$( echo "$find" | grep -v "$dir/$ignore$" )
		done
	done
fi

readarray -t dirs <<<"$find"
count=${#dirs[@]}
echo -e "\n$( tcolor $( numfmt --g $count ) ) Subdirectories"
i=0
for dir in "${dirs[@]}"; do
	(( i++ ))
	percent=$(( $i * 100 / $count ))
	createThumbnail
done
chown -h http:http $dircoverarts/*

echo -e               "\n\n$padC New thumbnails       : $( tcolor $( numfmt --g $thumb ) )"
(( $replace )) && echo -e "$padG Replaced thumbnails  : $( tcolor $( numfmt --g $replace ) )"
(( $exist )) && echo -e   "$padW Existings thumbnails : $( numfmt --g $exist )"
(( $dummy )) && echo -e  "$padGr Dummy thumbnails     : $( tcolor $( numfmt --g $dummy ) )"
(( $copy )) && echo -e    "$padM Copy embedded        : $( tcolor $( numfmt --g $copy ) )"
if (( $nonutf8 )); then
	echo -e               "$padR Non UTF-8 path       : $( tcolor $( numfmt --g $nonutf8 ) )  (See list in $( tcolor "$nonutf8log" ))"
else
	rm $nonutf8log
fi
if (( $longname )); then
	echo -e              "$padR Too long named       : $( tcolor $( numfmt --g $longname ) )  (See list in $( tcolor "$longnamelog" ))"
else
	rm $longnamelog
fi
if (( $dup )); then
	echo "$( awk '!NF || !seen[$0]++' $duplog | cat -s )" > $duplog # remove duplicate files
	dup=$(( $( grep -cve '^\s*$' $duplog ) - 1 )) # count without blank lines and less header
	echo -e              "$padY Duplicate albums     : $( tcolor $( numfmt --g $dup ) )  (See list in $( tcolor "$duplog" ))"
else
	rm $duplog
fi
if (( $permission )); then
	echo -e               "$padR No Write Permission : $( tcolor $( numfmt --g $permission ) )  (See list in $( tcolor "$permissionlog" ))"
else
	rm $permissionlog
fi
echo
echo -e                       "      Total thumbnails : $( tcolor $( numfmt --g $( ls -1 $dircoverarts | wc -l ) ) )"
echo -e  "      Parsed directory : $( tcolor "$path" )"

curl -s -v -X POST 'http://localhost/pub?id=notify' \
	-d '{ "title": "'"Browse By CoverArt"'", "text": "'"Thumbnails ${update}d."'" }' \
	&> /dev/null

timestop

title -l '=' "$bar Thumbnails for $coloredname ${update}d successfully."

echo
echo Thumbnails directory : $( tcolor "$dircoverarts" )
echo
echo -e "$bar To change individually:"
echo "    - CoverArt > long-press thumbnail > coverArt / delete"
echo -e "$bar To update with updated database:"
echo "    - Library > long-press CoverArt"
echo "    - Library > directory > context menu > Update thumbnails"
