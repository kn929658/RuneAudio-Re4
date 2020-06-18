#!/bin/bash

if (( $# > 0 )); then
	h=$1; s=$2; l=$3
else
	file=/srv/http/data/system/color
	if [[ -e $file ]]; then
		hsl=( $( cat $file ) )
		h=${hsl[0]}; s=${hsl[1]}; l=${hsl[2]}
	else
		h=200; s=100; l=35
	fi
fi

hs="$h,$s%,"
hsg="$h,3%,"

sed -i "
 s|\(--cml: *hsl\).*;|\1(${hs}$(( l + 5 ))%);|
  s|\(--cm: *hsl\).*;|\1(${hs}$l%);|
 s|\(--cma: *hsl\).*;|\1(${hs}$(( l - 5 ))%);|
 s|\(--cmd: *hsl\).*;|\1(${hs}$(( l - 15 ))%);|
s|\(--cg75: *hsl\).*;|\1(${hsg}75%);|
s|\(--cg60: *hsl\).*;|\1(${hsg}60%);|
 s|\(--cgl: *hsl\).*;|\1(${hsg}40%);|
  s|\(--cg: *hsl\).*;|\1(${hsg}30%);|
 s|\(--cga: *hsl\).*;|\1(${hsg}20%);|
 s|\(--cgd: *hsl\).*;|\1(${hsg}10%);|
" /srv/http/assets/css/colors.css

curl -s -X POST "http://127.0.0.1/pub?id=reload" -d '{ "reload": "all" }'
