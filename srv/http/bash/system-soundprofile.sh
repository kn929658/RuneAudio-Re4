#!/bin/bash

setConfig() {
	[[ -n $1 ]] && ip link set eth0 mtu $1
	[[ -n $2 ]] && ip link set eth0 txqueuelen $2
	[[ -n $3 ]] && sysctl vm.swappiness=$3
	sysctl kernel.sched_latency_ns=$4
}

hwcode=$( awk '/Revision/ {print substr($NF, 4, 2)}' /proc/cpuinfo )
if [[ $hwcode =~ ^(04|08|0d|0e|11)$ ]]; then # not RPi 1
	lat=( 4500000 3500075 1000000 2000000 3700000 1500000 145655 6000000 )
else
	lat=( 1500000 850000 500000 120000 500000 1500000 145655 6000000 )
fi

case $1 in
	#                     mtu  txq  sw lat
	RuneAudio ) val="''   ''   0  ${lat[0]}";;
	ACX )       val="''   4000 0  ${lat[1]}";;
	Orion )     val="1000 4000 20 ${lat[2]}";;
	OrionV2 )   val="1000 4000 0  ${lat[3]}";;
	Um3ggh1U )  val="''   ''   0  ${lat[4]}";;
	iqaudio )   val="1000 4000 0  ${lat[5]}";;
	berrynos )  val="1000 4000 '' ${lat[6]}";;
	default )   val="1500 1000 60 18000000";;
	* )         val="$1   $2   $3 $4";;
esac

[[ $2 == getvalue ]] && echo $val || setConfig $val
