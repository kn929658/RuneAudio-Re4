#!/bin/bash

alias=rre4

. /srv/http/bash/addons-functions.sh

installstart $@

getinstallzip

installfinish $@

restartlocalbrowser
