#!/bin/bash

lines=$( ifconfig \
    | sed -n '/^eth\|^wlan/,/ether/ p' \
    | grep -v inet6 \
    | sed 's/^\(.*\): .*/\1/; s/^ *inet \(.*\)   *net.*/\1/; s/^ *ether \(.*\)   *txq.*/\1=/' \
    | tr '\n' ' ' \
    | sed 's/= /\n/g' )
readarray -t lines <<<"$lines"
