$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#timezone, #i2smodule' ).selectric( { maxHeight: 400 } );
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard

var dirsystem = '/srv/http/data/system';
var filereboot = '/srv/http/data/tmp/reboot';
var systemsh = '/srv/http/bash/system.sh';

$( '.container' ).on( 'click', '.settings', function() {
	location.href = 'index-settings.php?p='+ this.id
} );
$( 'body' ).on( 'click touchstart', function( e ) {
	if ( !$( e.target ).closest( '.i2s' ).length && $( '#i2smodule option:selected' ).val() === 'none' ) {
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
	}
} );
$( '#refresh' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) ) return
	
	var $this = $( this );
	var active = $this.find( '.fa-refresh' ).hasClass( 'blink' );
	$this.find( '.fa-refresh' ).toggleClass( 'blink', !active );
	if ( active ) {
		clearInterval( intervalcputime );
		bannerHide();
	} else {
		intervalcputime = setInterval( function() {
			$.post( 'cmd.php', { cmd: 'bash0', bash0: '/srv/http/bash/system-data.sh status' }, function( status ) {
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
	banner( 'AirPlay Renderer', G.airplay, 'airplay' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' airplay '+ G.airplay }, resetLocal );
} );
$( '#snapclient' ).click( function( e ) {
	G.snapclient = $( this ).prop( 'checked' );
	$( '#setting-snapclient' ).toggleClass( 'hide', !G.snapclient );
	banner( 'SnapClient Renderer', G.snapclient, 'snapcast' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' snapclient '+ G.snapclient }, resetLocal );
} );
$( '#setting-snapclient' ).click( function() {
	info( {
		  icon          : 'snapcast'
		, title         : 'SnapClient'
		, message       : 'Sync client to server:'
		, textlabel     : 'Latency <gr>(ms)</gr>'
		, textvalue     : G.snaplatency
		, passwordlabel : 'Password'
		, footer        : '<px60/>*Snapserver - if not <wh>rune</wh>'
		, ok            : function() {
			var latency = Math.abs( $( '#infoTextBox' ).val() );
			if ( latency !== G.snaplatency ) {
				G.snaplatency = latency;
				banner( 'Snapclient Latency', 'Change ...', 'snapcast' );
				$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' snapclientset '+ G.snaplatency }, resetLocal );
			}
		}
	} );
} );
$( '#spotify' ).click( function() {
	G.spotify = $( this ).prop( 'checked' );
	$( '#setting-spotify' ).toggleClass( 'hide', !G.spotify );
	banner( 'Spotify Connect', G.spotify, 'spotify' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' spotify '+ G.spotify }, resetLocal );
} );
$( '#setting-spotify' ).click( function() {
	$.post( 'cmd.php', { cmd: 'bash', bash: "aplay -L | grep -v '^\\s\\|^null'" }, function( devices ) {
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
					banner( 'Spotify Renderer', 'Change ...', 'spotify' );
					$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' spotifyset '+ device }, resetLocal );
				}
			}
		} );
	}, 'json' );
} );
$( '#upnp' ).click( function( e ) {
	G.upnp = $( this ).prop( 'checked' );
	banner( 'UPnP Renderer', G.upnp, 'upnp' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' upnp '+ G.upnp }, resetLocal );
} );
$( '#snapcast' ).click( function( e ) {
	G.snapcast = $( this ).prop( 'checked' );
	if ( G.snapcast ) {
		if ( G.snapclient ) $( '#snapclient' ).click();
		$( '#divsnapclient' ).addClass( 'hide' );
	} else {
		$( '#divsnapclient' ).removeClass( 'hide' );
	}
	banner( 'Snapcast - Sync Streaming Server', G.snapcast, 'snapcast' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' snapcast '+ G.snapcast }, resetLocal );
} );
$( '#streaming' ).click( function( e ) {
	G.streaming = $( this ).prop( 'checked' );
	banner( 'HTTP Streaming', G.streaming, 'mpd' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' streaming '+ G.streaming }, resetLocal );
} );
$( '#localbrowser' ).click( function( e ) {
	G.localbrowser = $( this ).prop( 'checked' );
	$( '#setting-localbrowser' ).toggleClass( 'hide', !G.localbrowser );
	banner( 'Chromium - Browser on RPi', G.localbrowser, 'chromium blink' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' localbrowser '+ G.localbrowser }, resetLocal( 7000 ) );
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
			$.post( 'cmd.php', { cmd: 'bash0', bash0: 'curl -s -X POST "http://127.0.0.1/pub?id=reload" -d \'{ "reload": 1 }\'' } );
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
			banner( 'Chromium - Browser on RPi', 'Change ...', 'chromium blink' );
			$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' localbrowserset '+ rotate +' '+ cursor +' '+ ( screenoff * 60 ) +' '+ zoom }, function() {
				resetLocal( 7000 );
			} );
		}
	} );
} );
$( '#samba' ).click( function( e ) {
	G.samba = $( this ).prop( 'checked' );
	$( '#setting-samba' ).toggleClass( 'hide', !G.samba );
	banner( 'Samba - File Sharing', G.samba, 'network blink' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' samba '+ G.samba }, resetLocal );
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
				banner( 'Samba - File Sharing', 'Change ...', 'network blink' );
				$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' sambaset '+ G.writesd +' '+ G.writeusb }, resetLocal );
			}
		}
	} );
} );
$( '#mpdscribble' ).click( function() {
	var mpdscribble = $( this ).prop( 'checked' );
	if ( mpdscribble && !G.mpdscribbleuser ) {
		$( '#setting-mpdscribble' ).click();
	} else {
		banner( 'Scrobbler', mpdscribble, 'lastfm' );
		$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' mpdscribble '+ mpdscribble }, function( std ) {
			G.mpdscribble = std == 0 ? true : false;
			$( '#setting-mpdscribble' ).toggleClass( 'hide', !G.mpdscribble );
			resetLocal();
		} );
	}
} );
$( '#setting-mpdscribble' ).click( function() {
	info( {
		  icon          : 'lastfm'
		, title         : 'Scrobbler'
		, textlabel     : 'Username'
		, textvalue     : G.mpdscribbleuser
		, passwordlabel : 'Password'
		, cancel        : function() {
			$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		}
		, ok            : function() {
			G.mpdscribbleuser = $( '#infoTextBox' ).val().replace( /(["&()\\])/g, '\$1' );
			var password = $( '#infoPasswordBox' ).val().replace( /(["&()\\])/g, '\$1' );
			banner( 'Scrobbler', G.mpdscribble ? 'Change ...' : 'Enable ...', 'lastfm' );
			$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' mpdscribbleset "'+ G.mpdscribbleuser +'" "'+ password +'"' }, function( std ) {
				G.mpdscribble = std == 0 ? true : false;
				$( '#setting-mpdscribble' ).toggleClass( 'hide', !G.mpdscribble );
				resetLocal();
		} );
		}
	} );
} );
$( '#login' ).click( function( e ) {
	G.login = $( this ).prop( 'checked' );
	$( '#setting-login' ).toggleClass( 'hide', !G.login );
	banner( 'Password Login', G.login, 'lock' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' login '+ G.login }, resetLocal );
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
			$.post( 'cmd.php', {
				  cmd    : 'login'
				, login  : $( '#infoPasswordBox' ).val()
				, pwdnew : $( '#infoPasswordBox1' ).val()
			}, function( std ) {
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
$( '#autoplay' ).click( function() {
	G.autoplay = $( this ).prop( 'checked' );
	banner( 'Play on Startup', G.autoplay, 'refresh-play' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' autoplay '+ G.autoplay }, resetLocal );
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
		$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' onboardaudio '+ G.onboardaudio +" '"+ G.reboot.join( '\n' ) +"'" }, resetLocal );
	}
} );
$( '#bluetooth' ).click( function( e ) {
	G.bluetooth = $( this ).prop( 'checked' );
	rebootText( G.bluetooth ? 'Enable' : 'Disable', 'on-board Bluetooth' );
	banner( 'On-board Bluetooth', G.bluetooth, 'bluetooth' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' bluetooth '+ G.bluetooth +" '"+ G.reboot.join( '\n' ) +"'" }, resetLocal );
} );
$( '#wlan' ).click( function( e ) {
	G.wlan = $( this ).prop( 'checked' );
	banner( 'On-board Wi-Fi', G.wlan, 'wifi-3' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' wlan '+ G.wlan }, resetLocal );
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
$( '#i2smodule' ).on( 'selectric-change', function( e ) {
	var audioaplayname = $( this ).val();
	var audiooutput = $( this ).find( ':selected' ).text();
	local = 1;
	if ( audioaplayname !== 'none' ) {
		G.audioaplayname = audioaplayname;
		G.audiooutput = audiooutput;
		G.onboardaudio = false;
		$( '#onboardaudio' ).prop( 'checked', 0 );
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' ).removeClass( 'hide' );
		rebootText( 'Enable', 'I&#178;S Module' );
		banner( 'I&#178;S Module', 'Enable ...', 'volume' );
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
		banner( 'I&#178;S Module', 'Disable ...', 'volume' );
	}
	$.post( 'cmd.php'
		, { cmd: 'bash0', bash0: systemsh +' i2smodule "'+ G.audioaplayname +'" "'+ G.audiooutput +'" "'+ G.reboot.join( '\n' ) +'"' }
		, function() {
			resetLocal();
			getConfigtxt();
		} );
	$( '#output' ).text( G.audiooutput );
} );
$( '#soundprofile' ).click( function( e ) {
	var checked = $( this ).prop( 'checked' );
	rebootText( checked ? 'Enable' : 'Disable', 'sound profile' );
	banner( 'Sound Profile', checked, 'volume' );
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' soundprofile '+ checked }, resetLocal );
	$( '#setting-soundprofile' ).toggleClass( 'hide', !checked );
	G.soundprofile = checked ? 'RuneAudio' : '';
} );
$( '#setting-soundprofile' ).click( function() {
	var radio= {
		  RuneAudo  : 'RuneAudio'
		, ACX       : 'ACX'
		, Orion     : 'Orion'
		, 'Orion V2': 'OrionV2'
		, Um3ggh1U  : 'Um3ggh1U'
	}
	if ( G.audioaplayname === 'snd_rpi_iqaudio_dac' ) radio[ 'IQaudio Pi-DAC' ] = 'OrionV3';
	if ( G.audiooutput === 'BerryNOS' ) radio[ 'BerryNOS' ] = 'OrionV4';
	radio[ 'Custom' ] = 'custom';
	info( {
		  icon    : 'volume'
		, title   : 'Sound Profile'
		, radio   : radio
		, preshow : function() {
			var values = G.soundprofileval.split( ' ' );
			$( 'input[value='+ G.soundprofile +']' ).prop( 'checked', 1 )
			$( '#infoRadio input[value=custom]' ).click( function() {
				var textlabel = [ 'vm.swappiness (0-100)', 'kernel.sched_latency_ns (ns)' ];
				var textvalue = [ values[ 2 ], values[ 3 ] ];
				if ( G.ip.slice( 0, 4 ) === 'eth0' ) {
					textlabel.push( 'eth0 mtu (byte)', 'eth0 txqueuelen' );
					textvalue.push( values[ 0 ], values[ 1 ] );
				}
				info( {
					  icon      : 'volume'
					, title     : 'Sound Profile'
					, message   : 'Custom value (Current value shown)'
					, textlabel : textlabel
					, textvalue : textvalue
					, boxwidth  : 110
					, ok        : function() {
						var soundprofile = $( '#infoTextBox' ).val();
						for ( i = 1; i < 4; i++ ) {
							G.soundprofile += ' '+ $( '#infoTextBox'+ i ).val();
						}
						if ( soundprofile != G.soundprofile ) {
							G.soundprofile = soundprofile;
							banner( 'Sound Profile', 'Change ...', 'volume' );
							$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' soundprofileset '+ soundprofile }, resetLocal );
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
				banner( 'Sound Profile', 'Change ...', 'volume' );
				$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' soundprofileset '+ soundprofile }, resetLocal );
			}
		}
	} );
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
				banner( 'Name', 'Change ...', 'sliders' );
				$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' hostname '+ hostname }, resetLocal );
			}
		}
	} );
} );
$( '#setting-regional' ).click( function() {
	info( {
		  icon      : 'gear'
		, title     : 'Regional Settings'
		, textlabel : [ 'NTP server', 'Regulatory domain' ]
		, textvalue : [ G.ntp, G.regdom || '00' ]
		, footer    : '<px70/><px60/>00 - common for all regions'
		, ok        : function() {
			var ntp = $( '#infoTextBox' ).val();
			var regdom = $( '#infoTextBox1' ).val();
			if ( ntp !== G.ntp || regdom !== G.regdom ) {
				G.ntp = ntp;
				G.regdom = regdom;
				banner( 'Regional Settings', 'Change ...', 'gear' );
				$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' regional '+ ntp +' '+ regdom }, resetLocal );
			}
		}
	} );
} );
$( '#timezone' ).on( 'selectric-change', function( e ) {
	G.timezone = $( this ).val();
	$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' timezone '+ G.timezone } );
} );
$( '#journalctl' ).click( function( e ) {
	codeToggle( e.target, this.id, getJournalctl );
} );
$( '#configtxt' ).click( function( e ) {
	codeToggle( e.target, this.id, getConfigtxt );
} );
$( '#backuprestore' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) ) return
	
	var icon = 'sd';
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
			notify( backuptitle, 'Backup ...', 'sd blink', -1 );
			$.post( 'cmd.php', { cmd: 'backuprestore', backuprestore: 'backup' }, function( data ) {
				if ( data === 'ready' ) {
					notify( backuptitle, 'Download ...', 'sd blink' );
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
								bannerHide();
							}, 1000 );
						} ).catch( () => {
							info( {
								  icon    : icon
								, title   : backuptitle
								, message : '<wh>Warning!</wh><br>File download failed.'
							} );
							bannerHide();
						} );
				} else {
					info( {
						  icon    : icon
						, title   : backuptitle
						, message : 'Backup failed.'
					} );
					bannerHide();
				}
			} );
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
					notify( restoretitle, 'Restore ...', 'sd blink', -1 );
					var checked = $( '#infoRadio input:checked' ).val();
					if ( checked !== 'restore' ) { // directly restore from directory
						$.post( 'cmd.php', { cmd: 'backuprestore', backuprestore: checked }, bannerHide );
					} else {
						var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
						var formData = new FormData();
						formData.append( 'cmd', 'backuprestore' );
						formData.append( 'backuprestore', 'restore' );
						formData.append( 'file', file );
						$.ajax( {
							  url         : 'cmd.php'
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
					setTimeout( function() {
						$( '#loader' ).removeClass( 'hide' );
					}, 0 );
				}
			} );
		}
	} );
} );
function getIwregget() {
	$.post( 'cmd.php', { cmd: 'bash0', bash0: 'iw reg get' }, function( status ) {
		$( '#codeiwregget' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function getJournalctl() {
	if ( $( '#codejournalctl' ).text() ) {
		$( '#codejournalctl' ).removeClass( 'hide' );
	} else {
		$.post( 'cmd.php', { cmd: 'bash0', bash0: systemsh +' statusbootlog' }, function( data ) {
			$( '#codejournalctl' )
				.html( data )
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
	$.post( 'cmd.php', { cmd: 'bash0', bash0: 'cat /boot/config.txt' }, function( status ) {
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
	var undervoltage = '';
	var warning = '<i style="width: 20px; text-align: center" class="fa fa-warning blink"></i>';
	if ( G.undervoltage ) {
		undervoltage = '<br><red>'+ warning +' Voltage under 4.7V</red>';
	} else if ( G.undervdetected ) {
		undervoltage = '<br><i class="fa fa-warning gr"></i> Voltage under 4.7V occured.';
	}
	return G.cpuload
		+'<br>'+ ( G.cputemp < 80 ? G.cputemp +' °C' : '<red>'+ warning + G.cputemp +' °C</red>' )
		+'<br>'+ G.time
		+'<br>'+ G.uptime
		+ undervoltage
}

refreshData = function() { // system page: use resetLocal() to aviod delay
	$.post( 'cmd.php', { cmd: 'bash0', bash0: '/srv/http/bash/system-data.sh' }, function( list ) {
		G = list;
		G.sources.pop(); // remove 'reboot' from sources-data.sh
		G.reboot = reboot;
		
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
			+ G.soc +'<br>'
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
		$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		$( '#setting-mpdscribble' ).toggleClass( 'hide', !G.mpdscribble );
		$( '#login' ).prop( 'checked', G.login );
		$( '#setting-login' ).toggleClass( 'hide', !G.login );
		$( '#avahi' ).prop( 'checked', G.avahi );
		$( '#avahiname' ).text( G.hostname.toLowerCase() );
		$( '#autoplay' ).prop( 'checked', G.autoplay );
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
		$( '#setting-soundprofile' ).toggleClass( 'hide', G.soundprofile === '' );
		$( '#eth0help' ).toggleClass( 'hide', G.ip.slice( 0, 4 ) !== 'eth0' );
		$( '#onboardaudio' ).prop( 'checked', G.onboardaudio );
		$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		$( '#wlan' ).prop( 'checked', G.wlan );
		$( '#hostname' ).val( G.hostname );
		$( '#timezone' )
			.val( G.timezone )
			.selectric( 'refresh' );
		showContent();
	}, 'json' );
}
refreshData();

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
