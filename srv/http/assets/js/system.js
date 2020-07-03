$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#timezone, #i2smodule' ).selectric( { maxHeight: 400 } );
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard

var dirsystem = '/srv/http/data/system';
var filereboot = '/srv/http/data/tmp/reboot';

$( '.container' ).on( 'click', '.settings', function() {
	location.href = 'index-settings.php?p='+ this.id
} );
$( '#hostname' ).click( function() {
	info( {
		  icon      : 'rune'
		, title     : 'Player Name'
		, textlabel : 'Name'
		, textvalue : G.hostname
		, ok        : function() {
			var hostname = $( '#infoTextBox' ).val().replace( /[^a-zA-Z0-9-]+/g, '-' ).replace( /(^-*|-*$)/g, '' );
			if ( hostname !== G.hostname ) {
				G.hostname = hostname;
				$( '#hostname' ).val( hostname );
				var hostnamelc = hostname.toLowerCase();
				local = 1;
				$.post( 'commands.php', { bash: [
					  'hostnamectl set-hostname "'+ hostnamelc +'"'                                        // hostname
					, "sed -i 's/\\(--hostname \\).*/\\1"+ hostname +"/' /etc/systemd/system/wsdd.service" // web service discovery
					, "sed -i 's/^\\(ssid=\\).*/\\1"+ hostname +"/' /etc/hostapd/hostapd.conf"             // hostapd
					, "sed -i '/^\\tname =/ s/\".*\"/\""+ hostname +"\"/' /etc/shairport-sync.conf"        // shairport-sync
					, "sed -i 's/^\\(friendlyname = \\).*/\\1"+ hostname +"/' /etc/upmpdcli.conf"          // upnp
					, 'rm -f /root/.config/chromium/SingletonLock'                                         // chromium profile reset
					, 'systemctl daemon-reload'
					, 'systemctl try-restart avahi-daemon hostapd mpd smb wsdd shairport-sync shairport-meta upmpdcli'
					, 'systemctl -q is-active bluetooth && bluetoothctl system-alias "'+ hostname +'"'
					, "echo '"+ hostname +"' > "+ dirsystem +"/hostname"
					, curlPage( 'system' )
				] }, resetlocal );
				banner( 'Name', 'Change ...', 'sliders' );
			}
		}
	} );
} );
$( '#setting-ntp' ).click( function() {
	info( {
		  icon      : 'stopwatch'
		, title     : 'NTP Server'
		, textlabel : 'URL'
		, textvalue : G.ntp
		, ok        : function() {
			var ntp = $( '#infoTextBox' ).val();
			if ( ntp === G.ntp ) {
				G.ntp = ntp
				local = 1;
				$.post( 'commands.php', { bash: [
					  "sed -i 's/^\\(NTP=\\).*/\\1"+ ntp +"/' /etc/systemd/timesyncd.conf"
					, "echo '"+ ntp +"' > "+ dirsystem +"/ntp"
					, curlPage( 'system' )
				] }, resetlocal );
			}
		}
	} );
} );
$( '#timezone' ).on( 'change', function( e ) {
	G.timezone = $( this ).find( ':selected' ).val();
	$.post( 'commands.php', { bash: [ 
		  'timedatectl set-timezone '+ G.timezone
		, "echo '"+ G.timezone +"' > "+ dirsystem +"/timezone"
		, curlPage( 'system' )
	] } );
} );
$( 'body' ).on( 'click touchstart', function( e ) {
	if ( !$( e.target ).closest( '.i2s' ).length && $( '#i2smodule option:selected' ).val() === 'none' ) {
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
	}
} );
$( '#refresh' ).click( function( e ) {
	var $this = $( this );
	var active = $this.find( 'i' ).hasClass( 'blink' );
	$this.find( 'i' ).toggleClass( 'blink', !active );
	if ( active ) {
		clearInterval( intervalcputime );
	} else {
		var bullet = ' <gr>&bull;</gr> ';
		intervalcputime = setInterval( function() {
			$.post( 'commands.php', { getjson: '/srv/http/bash/system-data.sh status' }, function( status ) {
				$.each( status, function( key, val ) {
					G[ key ] = val;
				} );
				$( '#status' ).html( renderStatus );
			}, 'json' );
		}, 10000 );
		notify( 'System Status', 'Refresh every 10 seconds.<br>Click again to stop.', 'sliders', 10000 );
	}
} );
$( '#airplay' ).click( function( e ) {
	G.airplay = $( this ).prop( 'checked' );
	var bannertxt = G.airplay && !G.avahi ? ' + URL By Name' : '';
	if ( G.airplay ) {
		G.avahi = true;
		$( '#avahi' ).prop( 'checked', 1 );
	}
	local = 1;
	$.post( 'commands.php', { bash: [
		  'systemctl '+ ( G.airplay ? 'enable' : 'disable' ) +' --now shairport-sync'
		, ( G.airplay ? 'touch ' : 'rm -f ' ) + dirsystem +'/airplay'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'AirPlay  Renderer'+ bannertxt, G.airplay, 'airplay' );
} );
$( '#snapclient' ).click( function( e ) {
	G.snapclient = $( this ).prop( 'checked' );
	$( '#setting-snapclient' ).toggleClass( 'hide', !G.snapclient );
	local = 1;
	$.post( 'commands.php', { bash: [
		  ( G.snapclient ? 'touch ' : 'rm -f ' ) + dirsystem +'/snapclient'
		, curlPage( 'system' )
	] }, resetlocal );
} );
$( '#setting-snapclient' ).click( function() {
	info( {
		  icon      : 'snapcast'
		, title     : 'SnapClient'
		, message   : 'Sync client to server:'
		, textlabel : 'Latency <gr>(ms)</gr>'
		, textvalue : G.snaplatency
		, ok        : function() {
			var latency = Math.abs( $( '#infoTextBox' ).val() );
			if ( latency !== G.snaplatency ) {
				G.snaplatency = latency;
				local = 1;
				$.post( 'commands.php', { bash: [
					  "sed -i '/OPTS=/ s/\".*\"/\"--latency="+ latency +"\"/' /etc/default/snapclient"
					, 'systemctl try-restart snapclient'
					, 'echo '+ latency +' > '+ dirsystem +'/snapcast-latency'
					, curlPage( 'system' )
				] }, resetlocal );
				banner( 'Snapclient Latency', 'Change ...', 'snapcast' );
			}
		}
	} );
} );
$( '#spotify' ).click( function() {
	G.spotify = $( this ).prop( 'checked' );
	$( '#setting-spotify' ).toggleClass( 'hide', !G.spotify );
	local = 1;
	$.post( 'commands.php', { bash: [
		  'systemctl '+ ( G.spotify ? 'enable' : 'disable' ) +' --now spotifyd'
		, ( G.spotify ? 'touch ' : 'rm -f ' ) + dirsystem +'/spotify'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'Spotify Connect', G.spotify, 'spotify' );
} );
$( '#setting-spotify' ).click( function() {
	$.post( 'commands.php', { bash: "aplay -L | grep -v '^\\s\\|^null' | tr '\\n' ' '" }, function( data ) {
		var devices = data[ 0 ].split( ' ' );
		var select = {}
		devices.forEach( function( val ) {
			select[ val ] = val;
		} );
		info( {
			  icon        : 'spotify'
			, title       : 'Spotify Renderer'
			, message     : 'Manually select audio output:'
						   +'<br>(Only if current one not working)'
			, selectlabel : 'Device'
			, select      : select
			, checked     : G.spotifydevice
			, preshow : function() {
				$( '#infoSelectBox' )
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoSelectBox' )
					.selectric()
					.on( 'selectric-change', function() {
						$( '#infoOk' ).toggleClass( 'disabled', $( this ).val() === G.spotifydevice );
					} );
			}
			, ok          : function() {
				var device = $( '#infoSelectBox option:selected' ).text();
				if ( device !== G.spotifydevice ) {
					G.spotifydevice = device;
					local = 1;
					$.post( 'commands.php', { bash: [
						, 'systemctl try-restart spotifyd'
						, 'echo '+ device +' > '+ dirsystem +'/spotify-device'
						, curlPage( 'system' )
					] }, resetlocal );
					banner( 'Spotify Renderer', 'Change ...', 'spotify' );
				}
			}
		} );
	}, 'json' );
} );
$( '#upnp' ).click( function( e ) {
	G.upnp = $( this ).prop( 'checked' );
	local = 1;
	$.post( 'commands.php', { bash: [
		  'systemctl '+ ( G.upnp ? 'enable' : 'disable' ) +' --now upmpdcli'
		, ( G.upnp ? 'touch ' : 'rm -f ' ) + dirsystem +'/upnp'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'UPnP Renderer', G.upnp, 'upnp' );
} );
$( '#streaming' ).click( function( e ) {
	G.streaming = $( this ).prop( 'checked' );
	local = 1;
	$.post( 'commands.php', { bash: [
		, ( G.streaming ? 'touch ' : 'rm -f ' ) + dirsystem +'/streaming'
		, '/srv/http/bash/mpd-conf.sh'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'HTTP Streaming', G.streaming, 'mpd' );
} );
$( '#snapcast' ).click( function( e ) {
	G.snapcast = $( this ).prop( 'checked' );
	if ( G.snapcast ) {
		if ( G.snapclient ) $( '#snapclient' ).click();
		$( '#divsnapclient' ).addClass( 'hide' );
	} else {
		$( '#divsnapclient' ).removeClass( 'hide' );
	}
	local = 1;
	$.post( 'commands.php', { bash: [
		  'systemctl '+ ( G.snapcast ? 'enable' : 'disable' ) +' --now snapserver'
		, ( G.snapcast ? 'touch ' : 'rm -f ' ) + dirsystem +'/snapcast'
		, '/srv/http/bash/mpd-conf.sh'
		, '/srv/http/bash/snapcast.sh serverstop'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'Snapcast - Sync Streaming Server', G.snapcast, 'snapcast' );
} );
$( '#localbrowser' ).click( function( e ) {
	G.localbrowser = $( this ).prop( 'checked' );
	$( '#setting-localbrowser' ).toggleClass( 'hide', !G.localbrowser );
	local = 1;
	if ( G.localbrowser ) {
		var cmd = [
			  "sed -i 's/\\(console=\\).*/\\1tty3 plymouth.enable=0 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt"
			, 'systemctl enable --now localbrowser'
			, 'systemctl disable getty@tty1'
			, 'touch '+ dirsystem +'/localbrowser'
			, curlPage( 'system' )
		];
	} else {
		var cmd = [
			  "sed -i 's/\\(console=\\).*/\\1tty1/' /boot/cmdline.txt"
			, 'systemctl disable --now localbrowser'
			, 'systemctl enable getty@tty1'
			, 'rm -f '+ dirsystem +'/localbrowser'
			, '/usr/local/bin/ply-image /srv/http/assets/img/splash.png'
			, curlPage( 'system' )
		];
	}
	$.post( 'commands.php', { bash: cmd }, resetlocal( 7000 ) );
	banner( 'Chromium - Browser on RPi', G.localbrowser, 'chromium' );
} );
var localbrowserinfo = heredoc( function() { /*
	<div id="infoText" class="infocontent">
		<div id="infotextlabel">
			<a class="infolabel">
				Screen off <gr>(min)</gr><br>
				Zoom <gr>(0.5-2.0)</gr>
			</a>
		</div>
		<div id="infotextbox">
			<input type="text" class="infoinput input" id="infoTextBox" spellcheck="false" style="width: 60px; text-align: center">
			<input type="text" class="infoinput input" id="infoTextBox1" spellcheck="false" style="width: 60px; text-align: center">
		</div>
	</div>
	<hr>
	Screen rotation<br>
	<div id="infoRadio" class="infocontent infohtml" style="text-align: center">
		&ensp;0°<br>
		<label><input type="radio" name="inforadio" value="NORMAL"></label><br>
		&nbsp;<label>90°&ensp;<i class="fa fa-undo"></i>&ensp;<input type="radio" name="inforadio" value="CCW"></label><px30/>
		<label><input type="radio" name="inforadio" value="CW"> <i class="fa fa-redo"></i>&ensp;90°&nbsp;</label><br>
		<label><input type="radio" name="inforadio" value="UD"></label><br>
		&nbsp;180°
	</div>
	<hr>
	<div id="infoCheckBox" class="infocontent infohtml">
		<label><input type="checkbox">&ensp;Mouse pointer</label><br>
	</div>
*/ } );
// !!!keep 'space' indent here
var rotatecontent = heredoc( function() { /*
Section "Device"
    Identifier "RpiFB"
    Driver "fbdev"
    Option "rotate" "ROTATION_SETTING"
EndSection

Section "InputClass"
    Identifier "Touchscreen"
    Driver "libinput"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Option "calibrationmatrix" "MATRIX_SETTING"
EndSection

Section "Monitor"
    Identifier "generic"
EndSection

Section "Screen"
    Identifier "screen1"
    Device "RpiFB"
    Monitor "generic"
EndSection

Section "ServerLayout"
    Identifier "slayo1"
    Screen "screen1"
EndSection
*/ } );
$( '#setting-localbrowser' ).click( function( e ) {
	info( {
		  icon        : 'chromium'
		, title       : 'Browser on RPi'
		, content     : localbrowserinfo
		, preshow     : function() {
			$( '#infoTextBox1' ).val( G.zoom );
			$( '#infoTextBox' ).val( G.screenoff );
			$( 'input[name=inforadio]' ).val( [ G.rotate ] );
			$( '#infoCheckBox input:eq( 0 )' ).prop( 'checked', G.cursor );
		}
		, buttonlabel : '<i class="fa fa-refresh"></i>Refresh'
		, buttoncolor : '#de810e'
		, button      : function() {
			$.post( 'commands.php', { bash: 'curl -s -X POST "http://127.0.0.1/pub?id=reload" -d \'{ "reload": 1 }\'' } );
		}
		, buttonwidth : 1
		, ok          : function() {
			var cursor    = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' ) ? 1 : 0;
			var rotate    = $( 'input[name=inforadio]:checked' ).val();
			var screenoff = $( '#infoTextBox' ).val();
			var zoom = parseFloat( $( '#infoTextBox1' ).val() ) || 1;
			G.zoom      = zoom < 2 ? ( zoom < 0.5 ? 0.5 : zoom ) : 2;
			if ( cursor === G.cursor && rotate === G.rotate 
				&& screenoff === G.screenoff && zoom === G.zoom ) return
			
			G.cursor    = cursor;
			G.rotate    = rotate;
			G.screenoff = screenoff;
			G.zoom      = zoom;
			var localbrowser = dirsystem +'/localbrowser-';
			var cmd = [
				  ( zoom != 1 ? 'echo '+ zoom +' > ' : 'rm -f ' ) + localbrowser +'zoom'
				, ( cursor ? 'touch ' : 'rm -f ' ) + localbrowser +'cursor'
				, ( screenoff != 0 ? 'echo '+ ( screenoff * 60 ) +' > ' : 'rm -f ' ) + localbrowser +'screenoff'
				, "sed -i"
					+" -e 's/\\(-use_cursor \\).*/\\1"+ ( cursor == 1 ? 'yes' : 'no' ) +" \\\&/'"
					+" -e 's/\\(factor=\\).*/\\1"+ zoom +"/'"
			 		+" -e 's/\\(xset dpms 0 0 \\).*/\\1"+ ( screenoff * 60 ) +" \\\&/'"
					+" /etc/X11/xinit/xinitrc"
				, 'ln -sf /srv/http/assets/img/{'+ rotate +',splash}.png'
				, 'rm -f /etc/X11/xorg.conf.d/99-raspi-rotate.conf '+ localbrowser +'rotatefile'
			];
			if ( rotate !== 'NORMAL' ) {
				var matrix = {
					  CW  : '0 1 0 -1 0 1 0 0 1'
					, CCW : '0 -1 1 1 0 0 0 0 1'
					, UD  : '-1 0 1 0 -1 1 0 0 1'
				}
				rotatecontent = rotatecontent.replace( 'ROTATION_SETTING', rotate ).replace( 'MATRIX_SETTING', matrix[ rotate ] );
				cmd.push(
					  "echo '"+ rotatecontent +"' > "+ localbrowser +'rotatefile'
					, 'cp -f '+ localbrowser +'rotatefile /etc/X11/xorg.conf.d/99-raspi-rotate.conf'
				);
			}
			cmd.push( 
				  'systemctl restart localbrowser'
				, curlPage( 'system' )
			);
			local = 1;
			$.post( 'commands.php', { bash: cmd }, function() {
				resetlocal( 7000 );
			} );
			banner( 'Chromium - Browser on RPi', 'Change ...', 'chromium' );
		}
	} );
} );
$( '#login' ).click( function( e ) {
	G.login = $( this ).prop( 'checked' );
	$( '#setting-login' ).toggleClass( 'hide', !G.login );
	local = 1;
	$.post( 'commands.php', { bash: [
		  ( G.login ? 'touch ' : 'rm -f ' ) + dirsystem +'/login'
		, "sed -i '/^bind_to_address/ s/\".*\"/\""+ ( G.login ? '127.0.0.1' : '0.0.0.0' ) +"\"/' /etc/mpd.conf"
		, 'systemctl restart mpd'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'Password Login', G.login, 'lock' );
	if ( G.login && G.passworddefault ) {
		info( {
			  icon    : 'lock'
			, title   : 'Password'
			, message : 'Default password is <wh>rune</wh>'
		} );
	}
} );
$( '#setting-login' ).click( function() {
	info( {
		  icon          : 'lock'
		, title         : 'Change Password'
		, passwordlabel : [ 'Existing', 'New' ]
		, ok            : function() {
			$.post( 'commands.php', {
				  login  : $( '#infoPasswordBox' ).val()
				, pwdnew : $( '#infoPasswordBox1' ).val() }
			, function( std ) {
				info( {
					  icon    : 'lock'
					, title   : 'Change Password'
					, nox     : 1
					, message : ( std ? 'Password changed' : 'Wrong existing password' )
				} );
			} );
		}
	} );
} );
$( '#samba' ).click( function( e ) {
	G.samba = $( this ).prop( 'checked' );
	$( '#setting-samba' ).toggleClass( 'hide', !G.samba );
	local = 1;
	$.post( 'commands.php', { bash: [
		  'systemctl '+ ( G.samba ? 'enable' : 'disable' ) +' --now smb wsdd'
		, ( G.samba ? 'touch ' : 'rm -f ' ) + dirsystem +'/samba'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'Samba - File Sharing', G.samba, 'network' );
} );
$( '#setting-samba' ).click( function() {
	info( {
		  icon     : 'network'
		, title    : 'Samba File Sharing'
		, message  : '<wh>Write</wh> permission:</gr>'
		, checkbox : { '<gr>/mnt/MPD/</gr>SD': 1, '<gr>/mnt/MPD/</gr>USB': 1 }
		, preshow  : function() {
			$( '#infoCheckBox input:eq( 0 )' ).prop( 'checked', G.writesd );
			$( '#infoCheckBox input:eq( 1 )' ).prop( 'checked', G.writeusb );
		}
		, ok       : function() {
			var writesd = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' );
			var writeusb = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' );
			if ( writesd !== G.writesd || writeusb !== G.writeusb ) {
				G.writesd = writesd;
				G.writeusb = writeusb;
				var sed = "sed -i -e '/read only = no/ d'";
				if ( writesd ) sed += " -e '/path = .*SD/ a\\\tread only = no'";
				if ( writeusb ) sed += " -e '/path = .*USB/ a\\\tread only = no'";
				local = 1;
				$.post( 'commands.php', { bash: [ 
					  sed +' /etc/samba/smb.conf'
					, 'systemctl try-restart smb wsdd'
					, ( writesd ? 'rm -f ' : 'touch ' ) + dirsystem +'/samba-readonlysd'
					, ( writeusb ? 'rm -f ' : 'touch ' ) + dirsystem +'/samba-readonlyusb'
					, curlPage( 'system' )
				] }, resetlocal );
				banner( 'Samba - File Sharing', 'Change ...', 'network' );
			}
		}
	} );
} );
$( '#autoplay' ).click( function() {
	G.autoplay = $( this ).prop( 'checked' );
	local = 1;
	$.post( 'commands.php', { bash: [
		 ( G.autoplay ? 'touch ' : 'rm -f ' ) + dirsystem +'/autoplay'
		, curlPage( 'system' )
	] }, resetlocal );
	banner( 'Play On Startup', G.autoplay, 'mpd' );
} );
$( '#onboardaudio' ).click( function( e ) {
	var onboardaudio = $( this ).prop( 'checked' );
	if ( !onboardaudio && G.audioaplayname.slice( 0, 7 ) === 'bcm2835' ) {
		info( {
			  icon    : 'volume'
			, title   : 'On-board Audio'
			, message : 'On-board audio is currently in used.'
		} );
		$( '#onboardaudio' ).prop( 'checked', 1 );
	} else {
		G.onboardaudio = onboardaudio;
		rebootText( onboardaudio ? 'Enable' : 'Disable', 'on-board audio' );
		local = 1;
		$.post( 'commands.php', { bash: [
			  "sed -i 's/\\(dtparam=audio=\\).*/\\1"+ ( onboardaudio ? 'on' : 'off' ) +"/' /boot/config.txt"
			, ( onboardaudio ? 'touch ' : 'rm -f ' ) + dirsystem +'/onboard-audio'
			, "sed -i '/on-board audio/ d' "+ filereboot
			, "echo -e '"+ G.reboot.join( '\n' ) +"' > "+ filereboot
			, curlPage( 'system' )
		] }, resetlocal );
	}
} );
$( '#bluetooth' ).click( function( e ) {
	bluetooth = $( this ).prop( 'checked' );
	local = 1;
	if ( bluetooth ) {
		var cmd = [
			  "sed -i '/dtoverlay=bcmbt/ d' /boot/config.txt"
			, "sed -i '$ a\dtoverlay=bcmbt' /boot/config.txt"
			, 'touch '+ dirsystem +'/onboard-bluetooth'
		];
	} else {
		var cmd = [
			  "sed -i '/dtoverlay=bcmbt/ d' /boot/config.txt"
			, 'rm -f '+ dirsystem +'/onboard-bluetooth'
			, 'systemctl stop bluetooth'
		];
	}
	rebootText( bluetooth ? 'Enable' : 'Disable', 'on-board Bluetooth' );
	cmd.push(
		  "echo -e '"+ G.reboot.join( '\n' ) +"' > "+ filereboot
		, curlPage( 'system' )
	);
	$.post( 'commands.php', { bash: cmd }, resetlocal );
} );
$( '#wlan' ).click( function( e ) {
	G.wlan = $( this ).prop( 'checked' );
	if ( G.wlan ) {
		var cmd = [
			  'modprobe brcmfmac'
			, 'systemctl enable --now netctl-auto@wlan0'
			, 'touch '+ dirsystem +'/onboard-wlan'
			, curlPage( 'system' )
		];
	} else {
		var cmd = [
			  'systemctl disable --now netctl-auto@wlan0'
			, 'rmmod brcmfmac'
			, 'rm -f '+ dirsystem +'/onboard-wlan'
			, curlPage( 'system' )
		];
	}
	$.post( 'commands.php', { bash: cmd } );
} );
$( '#setting-wlan' ).click( function() {
	info( {
		  icon      : 'wifi-3'
		, title     : 'Regulatory Domain'
		, textlabel : 'Country code'
		, textvalue : ( G.regdom === 0 ? '00' : G.regdom )
		, ok        : function() {
			var regdom = $( '#infoTextBox' ).val().trim().toUpperCase();
			if ( regdom === G.regdom ) return
			
			G.regdom = regdom;
			$.post( 'commands.php', { bash: [ 
				  'sed -i \'s/".*"/"'+ regdom +'"/\' /etc/conf.d/wireless-regdom'
				, 'iw reg set '+ regdom
				, ( regdom === '00' ? 'rm ' : 'echo '+ regdom +' > ' ) + dirsystem +'/wlanregdom'
				, curlPage( 'system' )
			] }, resetlocal );
			banner( 'Regulatory Domain', 'Change ...', 'wifi-3' );
		}
	} );
} );
$( '#i2smodulesw' ).click( function() {
	// delay to show switch sliding
	setTimeout( function() {
		$( '#i2smodulesw' ).prop( 'checked', 0 );
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' )
			.removeClass( 'hide' )
			.find( '.selectric' ).click();
	}, 200 );
} );
$( '#i2smodule' ).on( 'change', function( e ) {
	var $selected = $( this ).find( ':selected' );
	var audioaplayname = $selected.val();
	var audiooutput = $selected.text();
	local = 1;
	if ( audioaplayname !== 'none' ) {
		G.audioaplayname = audioaplayname;
		G.audiooutput = audiooutput;
		G.onboardaudio = false;
		G.onboardhdmi = false;
		$( '#onboardaudio, #onboardhdmi' ).prop( 'checked', 0 );
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' ).removeClass( 'hide' );
		rebootText( 'Enable', 'I&#178;S Module' );
		$.post( 'commands.php', { bash: [
			  "grep -q 'dtoverlay=gpio' /boot/config.txt && touch /tmp/gpio"
			, "sed -i '/dtparam=\\|dtoverlay=\\|^$/ d' /boot/config.txt"
			, 'test -e /tmp/gpio && rm /tmp/gpio && echo dtoverlay=gpio >> /boot/config.txt'
			, "sed -i '$ a\\"
				+ ( G.bluetoothon ? "dtoverlay=bcmbt\\n" : '' )
				+"dtparam=audio=off\\n"
				+"dtparam=i2s=on\\n"
				+"dtoverlay="+ audioaplayname
			  	+"' /boot/config.txt"
			, "echo '"+ audiooutput +"' > "+ dirsystem +"/audio-output"
			, "echo '"+ audioaplayname +"' > "+ dirsystem +"/audio-aplayname"
			, 'rm -f '+ dirsystem +'/onboard-audio'
			, "sed -i '/I&#178;S Module/ d' "+ filereboot
			, "echo -e '"+ G.reboot.join( '\n' ) +"' > "+ filereboot
			, curlPage( 'system' )
		] }, resetlocal );
	} else {
		var audioaplayname = G.audioaplayname;
		var notrpi0 = G.hardware.split( ' ' )[ 2 ] !== 'Zero';
		if ( notrpi0 ) {
			G.audiooutput = 'On-board - Headphone';
			G.audioaplayname = 'bcm2835 Headphones';
		} else {
			G.audiooutput = 'On-board - HDMI';
			G.audioaplayname = 'bcm2835 HDMI 1';
		}
		G.onboardaudio = true;
		$( '#onboardaudio' ).prop( 'checked', 1 );
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
		rebootText( 'Disable', 'I&#178;S Module' );
		$.post( 'commands.php', { bash: [
			  "sed -i '/dtparam=\\|dtoverlay=\\|^$/ d' /boot/config.txt"
			, "sed -i '$ a\\"
				+ ( G.bluetoothon ? "dtoverlay=bcmbt\\n" : '' )
				+"dtparam=audio=on"
				+"' /boot/config.txt"
			, "echo "+ G.audiooutput +" > "+ dirsystem +"/audio-output"
			, "echo "+ G.audioaplayname +" > "+ dirsystem +"/audio-aplayname"
			, "touch "+ dirsystem +"/onboard-audio"
			, "sed -i '/I&#178;S Module/ d' "+ filereboot
			, "echo -e '"+ G.reboot.join( '\n' ) +"' > "+ filereboot
			, curlPage( 'system' )
		] }, resetlocal );
	}
	$( '#output' ).text( G.audiooutput );
} );
$( '#soundprofile' ).click( function( e ) {
	var soundprofile = $( this ).prop( 'checked' );
	if ( soundprofile ) {
		if ( G.eth0mtu ) { // custom
			$.post( 'commands.php', { bash: [
				  '/srv/http/bash/system-soundprofile.sh custom '
					+ G.eth0mtu +' '+ G.eth0txq +' '+ G.sysswap +' '+ G.syslatency
				, 'echo custom > '+ dirsystem +'/soundprofile'
			] } );
		} else {
			$( '#setting-soundprofile' ).click();
		}
	} else {
		G.soundprofile = '';
		$( '#setting-soundprofile' ).addClass( 'hide' );
		rebootText( 'Disable', 'sound profile' );
		local = 1;
		$.post( 'commands.php', { bash: [
			  '/srv/http/bash/system-soundprofile.sh default'
			, 'rm -f '+ dirsystem +'/soundprofile'
			, curlPage( 'system' )
		] }, resetlocal );
	}
} );
$( '#setting-soundprofile' ).click( function() {
	var radio= {
		  RuneAudio: 'RuneAudio'
		, ACX: 'ACX'
		, Orion: 'Orion'
		, 'Orion V2': 'OrionV2'
		, Um3ggh1U: 'Um3ggh1U'
	}
	if ( G.audioaplayname === 'snd_rpi_iqaudio_dac' ) radio[ 'IQaudio Pi-DAC' ] = 'OrionV3';
	if ( G.audiooutput === 'BerryNOS' ) radio[ 'BerryNOS' ] = 'OrionV4';
	radio[ 'Custom' ] = 'custom';
	info( {
		  icon    : 'volume'
		, title   : 'Sound Profile'
		, radio   : radio
		, preshow : function() {
			var soundprofile = G.soundprofile || 'RuneAudio';
			$( 'input[name=inforadio]' ).val( [ soundprofile ] )
			$( '#infoRadio input[value=custom]' ).click( function() {
				var textlabel = [ 'vm.swappiness (0-100)', 'kernel.sched_latency_ns (ns)' ];
				var textvalue = [ G.sysswap, G.syslatency ];
				if ( G.ip.slice( 0, 4 ) === 'eth0' ) {
					textlabel.push( 'eth0 mtu (byte)', 'eth0 txqueuelen' );
					textvalue.push( G.eth0mtu, G.eth0txq );
				}
				info( {
					  icon      : 'volume'
					, title     : 'Sound Profile'
					, message   : 'Custom value (Current value shown)'
					, textlabel : textlabel
					, textvalue : textvalue
					, boxwidth  : 110
					, ok        : function() {
						G.soundprofile = 'custom';
						var eth0mtu = parseInt( $( '#infoTextBox' ).val() );
						var eth0txq = parseInt( $( '#infoTextBox1' ).val() );
						var sysswap = parseInt( $( '#infoTextBox2' ).val() );
						var syslatency = parseInt( $( '#infoTextBox3' ).val() );
						if ( eth0mtu !== G.eth0mtu || eth0txq !== G.eth0txq || sysswap !== G.sysswap || syslatency !== G.syslatency ) {
							$.post( 'commands.php', { bash: [
								  '/srv/http/bash/system-soundprofile.sh custom '
									+ eth0mtu +' '+ eth0txq +' '+ sysswap +' '+ syslatency
								, 'echo custom > '+ dirsystem +'/soundprofile'
								, 'echo '+ eth0mtu +' > '+ dirsystem +'/sound-eth0mtu'
								, 'echo '+ eth0txq +' > '+ dirsystem +'/sound-eth0txq'
								, 'echo '+ sysswap +' > '+ dirsystem +'/sound-sysswap'
								, 'echo '+ syslatency +' > '+ dirsystem +'/sound-syslatency'
							] } );
						}
					}
				} );
			} );
		}
		, cancel  : function() {
			if ( !G.soundprofile ) {
				$( '#soundprofile' ).prop( 'checked', 0 );
				$( '#setting-soundprofile' ).addClass( 'hide' );
			}
		}
		, ok      : function() {
			var soundprofile = $( 'input[name=inforadio]:checked' ).val();
			if ( soundprofile !== G.soundprofile ) {
				rebootText( G.soundprofile ? 'Change' : 'Enable', 'sound profile' );
				G.soundprofile = soundprofile;
				local = 1;
				$.post( 'commands.php', { bash: [
					  '/srv/http/bash/system-soundprofile.sh '+ soundprofile
					, 'rm -f '+ dirsystem +'/sound*'
					, 'echo '+ soundprofile +' > '+ dirsystem +'/soundprofile'
					, curlPage( 'system' )
				] }, resetlocal );
			}
		}
	} );
} );
$( '#journalctl' ).click( function() {
	$( '#codejournalctl' ).hasClass( 'hide' ) ? getJournalctl() : $( '#codejournalctl' ).addClass( 'hide' );
} );
$( '#configtxt' ).click( function() {
	$( '#codeconfigtxt' ).hasClass( 'hide' ) ? getConfigtxt() : $( '#codeconfigtxt' ).addClass( 'hide' );
} );
$( '#backuprestore' ).click( function() {
	var icon = 'sliders';
	var restoretitle = 'Restore Settings';
	var backuptitle = restoretitle.replace( 'Restore', 'Backup' );
	var maintitle = 'Backup/'+ restoretitle;
	info( {
		  icon        : icon
		, title       : maintitle
		, message     :  '<span style="display: block; text-align: left"">'
						    +'&bull; Settings'
						+'<br>&bull; Library database'
						+'<br>&bull; Saved playlists'
						+'<br>&bull; Bookmarks'
						+'<br>&bull; CoverArt thumbnails'
						+'<br>&bull; Lyrics'
						+'<br>&bull; WebRadios'
						+'</span>'
		, buttonwidth : 1
		, buttonlabel : 'Backup'
		, buttoncolor : '#0a8c68'
		, button      : function() {
			$.post( 'commands.php', { backuprestore: 'backup' }, function( data ) {
				if ( data === 'ready' ) {
					notify( backuptitle, 'Download ...', 'sliders blink' );
					fetch( '/data/tmp/backup.gz' )
						.then( response => response.blob() )
						.then( blob => {
							var url = window.URL.createObjectURL( blob );
							var a = document.createElement( 'a' );
							a.style.display = 'none';
							a.href = url;
							a.download = 'backup.gz';
							document.body.appendChild( a );
							a.click();
							setTimeout( () => {
								a.remove();
								window.URL.revokeObjectURL( url );
							}, 1000 );
						} ).catch( () => {
							info( {
								  icon    : icon
								, title   : backuptitle
								, message : '<wh>Warning!</wh><br>File download failed.'
							} );
						} );
				} else {
					info( {
						  icon    : icon
						, title   : backuptitle
						, message : 'Backup failed.'
					} );
				}
			} );
			banner( backuptitle, 'Backup ...', 'sliders' );
		}
		, oklabel     : 'Restore'
		, ok          : function() {
			info( {
				  icon        : icon
				, title       : restoretitle
				, message     : 'Restore from:'
				, radio       : {
					  'Backup file <code>*.gz</code>, <code>*.xz</code>' : 'restore'
					, 'Directory <code>/srv/http/data</code>'            : 'directory'
					, 'Reset to default'                                 : 'reset'
				}
				, checked     : 'restore'
				, fileoklabel : 'Restore'
				, filetype    : '.gz,.xz'
				, filefilter  : 1
				, preshow     : function() {
					$( '#infoRadio input' ).click( function() {
						if ( $( '#infoRadio input:checked' ).val() !== 'restore' ) {
							$( '#infoFilename' ).empty()
							$( '#infoFileBox' ).val( '' );
							$( '#infoFileLabel' ).addClass( 'hide infobtn-primary' );
							$( '#infoOk' ).removeClass( 'hide' );
						} else {
							$( '#infoOk' ).addClass( 'hide' );
							$( '#infoFileLabel' ).removeClass( 'hide' );
						}
					} );
				}
				, ok          : function() {
					var checked = $( '#infoRadio input:checked' ).val();
					if ( checked !== 'restore' ) { // directly restore from directory
						$.post( 'commands.php', { backuprestore: checked }, bannerHide );
					} else {
						var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
						var formData = new FormData();
						formData.append( 'backuprestore', 'restore' );
						formData.append( 'file', file );
						$.ajax( {
							  url         : 'commands.php'
							, type        : 'POST'
							, data        : formData
							, processData : false  // no - process the data
							, contentType : false  // no - contentType
							, success     : function( data ) {
								if ( data ) {
									if ( data !== 'restored' ) G.reboot = data.split( '\n' );
								} else {
									info( {
										  icon    : icon
										, title   : restoretitle
										, message : 'File upload failed.'
									} );
								}
								bannerHide();
								$( '#loader' ).addClass( 'hide' );
							}
						} );
					}
					banner( restoretitle, 'Restore ...', 'sliders', -1 );
					setTimeout( function() {
						$( '#loader' ).removeClass( 'hide' );
					}, 0 );
				}
			} );
		}
	} );
} );
function getJournalctl() {
	if ( $( '#codejournalctl' ).text() ) {
		$( '#codejournalctl' ).removeClass( 'hide' );
	} else {
		$.post( 'commands.php', { getbootlog: 1 }, function( data ) {
			var htmldata = data.replace( /(Error:.*|Under-voltage detected.*)/g, function( match, $1 ) {
				return '<red>'+ $1 +'</red>'
			} );
			$( '#codejournalctl' )
				.html( htmldata )
				.removeClass( 'hide' );
			$( '#journalctlicon' )
				.removeClass( 'fa-refresh blink' )
				.addClass( 'fa-code' );
		} );
		$( '#journalctlicon' )
			.removeClass( 'fa-code' )
			.addClass( 'fa-refresh blink' );
	}
}
function getConfigtxt() {
	$.post( 'commands.php', { bash: 'cat /boot/config.txt', string: 1 }, function( status ) {
		$( '#codeconfigtxt' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function rebootText( enable, device ) {
	G.reboot = G.reboot.filter( function( el ) {
		return el.indexOf( device ) === -1
	} );
	G.reboot.push( enable +' '+ device );
}
function renderStatus() {
	var temp = G.cputemp < 80 ? G.cputemp +' °C' : '<red><i class="fa fa-warning blink"></i> '+ G.cputemp +' °C</red>';
	return G.cpuload.replace( / /g, '&emsp;' ) + '<br>' 
		+ temp +'<br>'
		+ G.time.replace( ' ', ' <gr>&bull;</gr> ' ) + '&ensp;<grw>' + G.timezone.replace( /\//g, ' &middot; ' ) +'</grw><br>'
		+ G.uptime +'&ensp;<gr>since '+ G.uptimesince +'</gr>'
}

refreshData = function() {
	$.post( 'commands.php', { getjson: '/srv/http/bash/system-data.sh' }, function( list ) {
		G = list;
		G.sources.pop(); // remove 'reboot' from sources-data.sh
		G.reboot = G.reboot ? G.reboot.split( '\n' ) : [];
		
		var systemlabel =
			 'RuneAudio<br>'
			+'Hardware<br>'
			+'SoC<br>'
			+'Output Device<br>'
			+'Kernel<br>'
			+'<span id="mpd" class="settings">MPD<i class="fa fa-gear"></i></span><br>'
			+'<span id="network" class="settings">Network<i class="fa fa-gear"></i></span>';
		var statuslabel =
			 'CPU Load<br>'
			+'CPU Temperatue<br>'
			+'Time<br>'
			+'Up Time';
		var bullet = ' <gr>&bull;</gr> ';
		if ( G.ip ) {
			var ip = G.ip.split( ',' );
			var iplist = '';
			ip.forEach( function( el ) {
				var val = el.split( ' ' ); // [ interface, mac, ip ]
				if ( val[ 2 ] ) {
					iplist += '<i class="fa fa-'+ ( val[ 0 ] === 'eth0' ? 'lan' : 'wifi-3' ) +' gr"></i>&ensp;';
					iplist += val[ 1 ] +'&emsp;<gr>'+ val[ 2 ] +'</gr><br>';
					systemlabel += '<br>';
					if ( !G.streamingip ) G.streamingip = val[ 1 ];
				}
			} )
		}
		if ( G.sources.length ) {
			systemlabel += '<span id="sources" class="settings">Sources<i class="fa fa-gear"></i></span>';
			var sourcelist = '';
			$.each( G.sources, function( i, val ) {
				sourcelist += '<i class="fa fa-'+ val.icon +' gr"></i>&ensp;'+ val.mountpoint.replace( '/mnt/MPD/USB/', '' );
				sourcelist += ( val.size ? bullet + val.size : '' ) +'<br>';
				systemlabel += '<br>';
			} );
		}
		$( '#systemlabel' ).html( systemlabel );
		var mpdstats = !G.mpdstats
							? ''
							: '&emsp;<i class="fa fa-music gr"></i>&nbsp;'+ G.mpdstats[ 2 ].toLocaleString()
							 +'&ensp;<i class="fa fa-album gr"></i>&ensp;'+ G.mpdstats[ 1 ].toLocaleString()
							 +'&ensp;<i class="fa fa-artist gr"></i> '+ G.mpdstats[ 0 ].toLocaleString();
		$( '#system' ).html(
			  '<i class="fa fa-addons gr" style="line-height: 20px;"></i> '+ G.version +' <gr>'+ G.versionui +'</gr>'+ bullet + G.hostname +'<br>'
			+ G.hardware +'<br>'
			+ G.soc + bullet + G.soccpu + bullet + G.socmem +'<br>'
			+ '<span id="output">'+ G.audiooutput +'</span><br>'
			+ G.kernel +'<br>'
			+ G.mpd 
			+ mpdstats
			+'<br>'
			+ iplist
			+ sourcelist
		);
		$( '#statuslabel' ).html( statuslabel );
		$( '#status' ).html( renderStatus );
		$( '#hostname' ).val( G.hostname );
		$( '#timezone' )
			.val( G.timezone )
			.selectric( 'refresh' );
		$( '#i2smodule' ).val( 'none' );
		$( '#i2smodule option' ).filter( function() {
			var $this = $( this );
			return $this.text() === G.audiooutput && $this.val() === G.audioaplayname;
		} ).prop( 'selected', true );
		$( '#i2smodule' ).selectric( 'refresh' );
		var i2senabled = $( '#i2smodule' ).val() === 'none' ? false : true;
		$( '#divi2smodulesw' ).toggleClass( 'hide', i2senabled );
		$( '#divi2smodule' ).toggleClass( 'hide', !i2senabled );
		$( '#soundprofile' ).prop( 'checked', G.soundprofile !== '' );
		$( '#eth0help' ).toggleClass( 'hide', G.ip.slice( 0, 4 ) !== 'eth0' );
		$( '#setting-soundprofile' ).toggleClass( 'hide', G.soundprofile === '' );
		$( '#onboardaudio' ).prop( 'checked', G.onboardaudio );
		$( '#onboardhdmi' ).prop( 'checked', G.onboardhdmi );
		$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		$( '#wlan' ).prop( 'checked', G.wlan );
		$( '#airplay' ).prop( 'checked', G.airplay );
		$( '#spotify' ).prop( 'checked', G.spotify );
		$( '#setting-spotify' ).toggleClass( 'hide', !G.spotify );
		$( '#upnp' ).prop( 'checked', G.upnp );
//		$( '#setting-upnp' ).toggleClass( 'hide', !G.upnp );
		$( '#localbrowser' ).prop( 'checked', G.localbrowser );
		$( '#setting-localbrowser' ).toggleClass( 'hide', !G.localbrowser );
		$( '#samba' ).prop( 'checked', G.samba );
		$( '#setting-samba' ).toggleClass( 'hide', !G.samba );
		$( '#snapcast' ).prop( 'checked', G.snapcast );
		if ( G.snapcast ) {
			$( '#divsnapclient' ).addClass( 'hide' );
		} else {
			$( '#divsnapclient' ).removeClass( 'hide' );
			$( '#snapclient' )
				.prop( 'checked', G.snapclient )
				.data( 'latency', G.snaplatency );
			$( '#setting-snapclient' ).toggleClass( 'hide', !G.snapclient );
		}
		$( '#streaming' ).prop( 'checked', G.streaming );
		$( '#ip' ).text( G.streamingip +':8000' );
		$( '#login' ).prop( 'checked', G.login );
		$( '#setting-login' ).toggleClass( 'hide', !G.login );
		$( '#avahi' ).prop( 'checked', G.avahi );
		$( '#avahiname' ).text( G.hostname.toLowerCase() );
		$( '#autoplay' ).prop( 'checked', G.autoplay );
		showContent();
	}, 'json' );
}
refreshData();

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
