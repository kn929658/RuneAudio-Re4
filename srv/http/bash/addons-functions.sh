#!/bin/bash

# default variables and functions for addons install/uninstall scripts

tty -s && col=$( tput cols ) || col=80 # [[ -t 1 ]] not work
lcolor() {
	local color=6
	[[ $2 ]] && color=$2
	printf "\e[38;5;${color}m%*s\e[0m\n" $col | tr ' ' "$1"
}
tcolor() { 
	local color=6 back=0  # default
	[[ $2 ]] && color=$2
	[[ $3 ]] && back=$3
	echo -e "\e[38;5;${color}m\e[48;5;${back}m${1}\e[0m"
}

bar=$( tcolor ' . ' 6 6 )   # [   ]     (cyan on cyan)
info=$( tcolor ' i ' 0 3 )  # [ i ]     (black on yellow)
yn=$( tcolor ' ? ' 0 3 )  # [ i ]       (black on yellow)
warn=$( tcolor ' ! ' 7 1 )  # [ ! ]     (white on red)
padR=$( tcolor '.' 1 1 )
diraddons=/srv/http/data/addons

title() {
	local ctop=6
	local cbottom=6
	local ltop='-'
	local lbottom='-'
	local notop=0
	local nobottom=0
	
	while :; do
		case $1 in
			-c) ctop=$2
				cbottom=$2
				shift;; # 1st shift
			-ct) ctop=$2
				shift;;
			-cb) cbottom=$2
				shift;;
			-l) ltop=$2
				lbottom=$2
				shift;;
			-lt) ltop=$2
				shift;;
			-lb) lbottom=$2
				shift;;
			-nt) notop=1;;        # no 'shift' for option without value
			-nb) nobottom=1;;
			-h|-\?|--help) usage
				return 0;;
			-?*) echo "$info unknown option: $1"
				echo $( tcolor 'title -h' 3 ) for information
				echo
				return 0;;
			*) break
		esac
		# shift 1 out of argument array '$@'
		# 1.option + 1.value - shift twice
		# 1.option + 0.without value - shift once
		shift
	done
	
	echo
	[[ $notop == 0 ]] && echo $( lcolor $ltop $ctop )
	echo -e "${@}" # $@ > "${@}" - preserve spaces 
	[[ $nobottom == 0 ]] && echo $( lcolor $lbottom $cbottom )
}

# for install/uninstall scripts ##############################################################

yesno() { # $1: header string; $2 : optional return variable (default - answer)
	echo
	echo -e "$yn $1"
	echo -e '  \e[36m0\e[m No'
	echo -e '  \e[36m1\e[m Yes'
	echo
	echo -e '\e[36m0\e[m / 1 ? '
	read -n 1 answer
	echo
	[[ $answer != 1 ]] && answer=0
	[[ $2 ]] && eval $2=$answer
}
setpwd() { #1 : optional return variable (default - pwd1)
	echo
	echo -e "$yn Password: "
	read -s pwd1
	echo
	echo 'Retype password: '
	read -s pwd2
	echo
	if [[ $pwd1 != $pwd2 ]]; then
		echo
		echo "$info Passwords not matched. Try again."
		setpwd
	fi
	[[ $1 ]] && eval $1=$pwd1
}

timestart() { # timelapse: any argument
	time0=$( date +%s )
	[[ $1 ]] && timelapse0=$( date +%s )
}
formatTime() {
	h=00$(( $1 / 3600 ))
	hh=${h: -2}
	m=00$(( $1 % 3600 / 60 ))
	mm=${m: -2}
	s=00$(( $1 % 60 ))
	ss=${s: -2}
	[[ $hh == 00 ]] && hh= || hh=$hh:
	echo $hh$mm:$ss
}
timestop() { # timelapse: any argument
	time1=$( date +%s )
	if [[ $1 ]]; then
		dif=$(( $time1 - $timelapse0 ))
		stringlapse=' (timelapse)'
	else
		dif=$(( $time1 - $time0 ))
		stringlapse=''
	fi
	echo -e "\nDuration$stringlapse $( formatTime $dif )"
}

wgetnc() {
	[[ -t 1 ]] && progress='--show-progress'
	wget -qN --no-check-certificate $progress $@
}
getvalue() { # $1-key
	echo "$addonslist" |
		grep $1'.*=>' |
		cut -d '>' -f 2 |
		sed $'s/^ [\'"]//; s/[\'"],$//; s/\s*\**$//'
}
rankmirrors() {
	now=$( date '+%s' )
	timestamp=$( date -r /etc/pacman.d/mirrorlist '+%s' )
	if (( $(( now - timestamp )) > 86400 )) || grep -q 'http://mirror' /etc/pacman.d/mirrorlist; then # only if more than 24 hour
		wgetnc https://github.com/rern/RuneAudio/raw/master/rankmirrors/rankmirrors.sh
		chmod +x rankmirrors.sh
		./rankmirrors.sh
	fi
}
packagestatus() {
	pkg=$( pacman -Ss "^$1$" | head -n1 )
	version=$( echo $pkg | cut -d' ' -f2 )
	[[ $( echo $pkg | cut -d' ' -f3 ) == '[installed]' ]] && installed=1
}
getinstallzip() {
	installurl=$( getvalue installurl )
	installzip=${installurl/raw\/master\/install.sh/archive\/$branch.zip}
	
	echo -e "$bar Get files ..."
	wgetnc $installzip
	echo
	echo -e "$bar Install new files ..."
	tmpdir=/tmp/install
	rm -rf $tmpdir
	mkdir -p $tmpdir
	bsdtar -tf $branch.zip | cut -d/ -f2- | grep / | grep -v '/$' | sed 's|^|/|' # list files
	bsdtar -xf $branch.zip --strip 1 -C $tmpdir
	rm $branch.zip $tmpdir/* &> /dev/null
	cp -rp $tmpdir/* /
	rm -r $tmpdir
	chown -R http:http /srv/http
	chown -R mpd:audio /srv/http/data/mpd
	chmod 755 /srv/http/* /srv/http/bash/* /srv/http/settings/* /usr/local/bin/*
	chmod 777 /srv/http/data/tmp
	
	[[ -e /srv/http/data/system/color ]] && /srv/http/bash/setcolor.sh
}
getuninstall() {
	installurl=$( getvalue installurl )
	installurl=${installurl/raw\/master/raw\/$branch}
	uninstallurl=${installurl/install.sh/uninstall_$alias.sh}
	wgetnc $uninstallurl -P /usr/local/bin
	if [[ $? != 0 ]]; then
		title -l '=' "$warn Uninstall file download failed."
		title -nt "Please try install again."
		exit
	fi
	chmod +x /usr/local/bin/uninstall_$alias.sh
}
notify() { # $1-i=install $2-s=start
	[[ $alias == addo ]] && return
	[[ $2 == i ]] && type='Install' || type='Uninstall'
	if [[ $3 == s ]]; then
		data=$( cat <<EOF
			{
				  "icon" : "fa fa-info-circle fa-lg"
				, "title": "${type}ing ..."
				, "text" : "$1 \nRuneAudio may not response until finished."
			}
EOF
		)
	else
		data=$( cat <<EOF
			{
				  "icon" : "fa fa-check"
				, "title": "Done"
				, "text" : "$1 \n${type}ation."
			}
EOF
		)
	fi

	curl -s -X POST 'http://127.0.0.1/pub?id=notify' -d "$data" &> /dev/null
}
installstart() { # $1-'u'=update
	rm -f $0
	
	addonslist=$( sed -n "/^'$alias'/,/^],/p" $diraddons/addons-list.php )
	title0=$( getvalue title )
	title=$( tcolor "$title0" )
	
	if [[ -e /usr/local/bin/uninstall_$alias.sh ]]; then
	  title -l '=' "$info $title already installed."
	  if [[ ! -t 1 ]]; then
		  title -nt "Please try update instead."
		  echo 1 > $diraddons/$alias
	  fi
	  exit
	fi
	
	timestart
	notify "$title0" i s
	
	# for testing branch
	if [[ ${@:$#} == '-b' ]]; then
		branch=${@:(-2):1}
	else
		branch=master
	fi
	
	if [[ -n $( getvalue nouninstall ) ]]; then
		title -l '=' "$bar Update $title ..."
	elif [[ $1 != u ]]; then
		title -l '=' "$bar Install $title ..."
	fi
}
installfinish() { # $1-'u'=update
	version=$( getvalue version )
	echo $version > $diraddons/$alias
	
	. /srv/http/bash/addons-update.sh 1
	
	timestop
	notify "$title0" i
	
	if [[ $1 != u ]]; then
		title -l '=' "$bar $title installed successfully."
	else
		title -l '=' "$bar $title updated successfully."
	fi
}
uninstallstart() { # $1-'u'=update
	addonslist=$( sed -n "/^'$alias'/,/^],/p" $diraddons/addons-list.php )
	title0=$( getvalue title )
	title=$( tcolor "$title0" )
	
	if [[ ! -e /usr/local/bin/uninstall_$alias.sh ]]; then
	  echo -e "$info $title not found."
	  rm $diraddons/$alias &> /dev/null
	  exit 1
	fi
	
	rm $0
	notify "$title0" u s

	[[ $1 != u ]] && type=Uninstall || type=Update
	title -l '=' "$bar $type $title ..."
}
uninstallfinish() { # $1-'u'=update
	rm $diraddons/$alias &> /dev/null

	notify "$title0" u

	[[ $1 == u ]] && exit
	
	title -l '=' "$bar $title uninstalled successfully."
}
restartlocalbrowser() {
	if systemctl -q is-active localbrowser; then
		title -nt "$bar Restart local browser ..."
		systemctl restart localbrowser
	fi
}
## restart nginx seamlessly without dropping client connections
restartnginx() {
	kill -s USR2 $( cat /run/nginx.pid )         # spawn new nginx master-worker set
	kill -s WINCH $( cat /run/nginx.pid.oldbin ) # stop old worker process
	kill -s QUIT $( cat /run/nginx.pid.oldbin )  # stop old master process
}
