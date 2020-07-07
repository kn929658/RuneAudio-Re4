$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#audiooutput, #mixertype' ).selectric();
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard
var dirsystem = '/srv/http/data/system';
var restartmpd = '';
var setmpdconf = '/srv/http/bash/mpd-conf.sh';
var warning = '<wh><i class="fa fa-warning fa-lg"></i>&ensp;Lower amplifier volume.</wh>'
			 +'<br>(If current level in MPD is not 100%.)'
			 +'<br><br>Signal level will be set to full amplitude to 0dB'
			 +'<br>Too high volume can damage speakers and ears';
$( '#audiooutput' ).on( 'selectric-change', function() {
	var $selected = $( this ).find( ':selected' );
	G.audiooutput = $selected.text();
	G.audioaplayname = $selected.val();
	var card = $selected.data( 'card' );
	var hwmixer = $selected.data( 'hwmixer' );
	// route command
	if ( G.audioaplayname.slice( 0, 7 ) === 'bcm2835' ) {
		var cmd = [ 'amixer -c '+ card +' cset numid=3 '+ $selected.data( 'device' ) +' &> /dev/null' ];
	} else if ( G.audioaplayname.slice( 0, 6 ) === 'WM5102' ) {
		var cmd = [ '/srv/http/bash/mpd-wm5102.sh '+ card +' '+ G.audioaplayname.split( ' - ' ).pop() +' &> /dev/null' ];
	} else {
		var cmd = [];
	}
	// set only if not usbdac
	if ( G.audioaplayname !== G.usbdac ) cmd.push(
		  'echo '+ G.audiooutput +' > '+ dirsystem +'/audio-output'
		, 'echo '+ G.audioaplayname +' > '+ dirsystem +'/audio-aplayname'
	);
	cmd.push(
		  "sed -i "
			+" -e '/output_device = / s/\".*\"/\"hw:"+ card +"\"/'"
			+" -e '/mixer_control_name = / s/\".*\"/\""+ hwmixer +"\"/'"
			+" /etc/shairport-sync.conf"
		, 'systemctl try-restart shairport-sync shairport-meta'
		, curlPage( 'mpd' )
	);
	banner( 'Audio Output Device', 'Change ...', 'mpd' );
	$.post( 'commands.php', { bash: cmd }, refreshData );
} );
$( '#mixertype' ).on( 'selectric-change', function() {
	var mixertype = $( this ).val();
	if ( mixertype === 'none' ) {
		info( {
			  icon    : 'volume'
			, title   : 'Volume Level'
			, message : warning
			, cancel  : function() {
				$( '#mixertype' )
					.val( $( '#audiooutput option:selected' ).data( 'mixertype' ) )
					.selectric( 'refresh' );
			}
			, ok      : function() {
				setMixerType( mixertype );
			}
		} );
	} else {
		setMixerType( mixertype );
	}
} );
$( '#setting-mixertype' ).click( function() { // hardware mixer
	var $selectedoutput = $( '#audiooutput option:selected' );
	var card = $selectedoutput.data( 'card' );
	var hwmixer = $selectedoutput.data( 'hwmixer' );
	var select = $selectedoutput.data( 'mixermanual' ) ? { 'Auto select': 'auto' } : {};
	$.post( 'commands.php', { bash: '/srv/http/bash/mpd-hwmixers.sh '+ card }, function( data ) {
		var devices = data[ 0 ].split( '^' );
		devices.forEach( function( val ) {
			select[ val ] = val;
		} );
		info( {
			  icon    : 'volume'
			, title   : 'Hardware Mixer'
			, message : 'Manually select hardware mixer:'
					   +'<br>(Only if current one not working)'
			, selectlabel : 'Device'
			, select  : select
			, checked : hwmixer
			, preshow : function() {
				$( '#infoOk' ).addClass( 'disabled' );
				$( '#infoSelectBox' )
					.selectric()
					.on( 'selectric-change', function() {
						$( '#infoOk' ).toggleClass( 'disabled', $( this ).val() === hwmixer );
					} );
			}
			, ok      : function() {
				var name = $( '#audiooutput option:selected' ).text();
				var mixermanual = $( '#infoSelectBox' ).val();
				var mixerauto = mixermanual === 'auto';
				var mixer = mixerauto ? hwmixer : mixermanual;
				var cmd = [ 
					  "sed -i '/"+ name +"/,/mixer_control/ s/\\(mixer_control \\+\"\\).*/\\1"+ mixer +"\"/' /etc/mpd.conf"
					, "sed -i '/mixer_control_name = / s/\".*\"/\""+ mixer +"\"/' /etc/shairport-sync.conf"
					, 'systemctl try-restart mpd shairport-sync shairport-meta'
					, ( mixerauto ? 'rm -f' : 'echo '+ mixermanual ) +' /srv/http/data/system/mpd-hwmixer-'+ card
				];
				banner( 'Hardware Mixer', 'Change ...', 'mpd' );
				$.post( 'commands.php', { bash: cmd }, refreshData );
			}
		} );
	}, 'json' );
} );
$( '#aplay' ).click( function( e ) {
	codeToggle( e.target, this.id, getAplay );
} );
$( '#amixer' ).click( function( e ) {
	codeToggle( e.target, this.id, getAmixer );
} );
$( '#novolume' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked ) {
		info( {
			  icon    : 'volume'
			, title   : 'Mixer Control'
			, message : warning
			, ok      : function() {
				G.crossfade === 0;
				G.normalization === false;
				G.replaygain === 'off';
				var $output = $( '#audiooutput option:selected' );
				var volumenone = $output.data( 'mixertype' ) === 'none' ? 0 : 1;
				banner( 'No Volume', 'Enable ...', 'mpd' );
				$.post( 'commands.php', { bash: [
					  "sed -i"
						+" -e '/mixer_type/ s/\".*\"/\"none\"/'"
						+" -e '/mixer_control\\|mixer_device\\|volume_normalization/ d'"
						+" -e '/^replaygain/ s/\".*\"/\"off\"/' /etc/mpd.conf"
					, 'echo none > '+ dirsystem +'"/mpd-mixertype-'+ $output.text() +'"'
					, 'rm -f '+ dirsystem +'/{mpd-replaygain,mpd-normalization}'
					, 'mpc crossfade 0'
					, setmpdconf
					, curlPage( 'mpd' )
					, 'curl -s -X POST "http://127.0.0.1/pub?id=volumenone" -d \'{ "volumenone": "'+ volumenone +'" }\''
				] }, refreshData );
			}
		} );
	} else {
		info( {
			  icon    : 'volume'
			, title   : 'Mixer Control'
			, message : 'Enable any volume features - disable <wh>No volume</wh>.'
		} );
		$( this ).prop( 'checked', 1 );
	}
} );
$( '#dop' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	var $selected = $( '#audiooutput option:selected' );
	$selected.data( 'dop', 1 );
	banner( 'DSP over PCM', checked, 'mpd' );
	$.post( 'commands.php', { bash: [
		  ( checked ? 'touch "' : 'rm -f "' ) + dirsystem +'/mpd-dop-'+ $selected.val() +'"'
		, setmpdconf
		, curlPage( 'mpd' )
	] }, refreshData );
} );
$( '#crossfade' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-crossfade' ).click();
	} else {
		banner( 'Crossfade', G.crossfade > 0, 'mpd' );
		$.post( 'commands.php', { bash: [
			  'mpc crossfade 0'
			, 'rm -f '+ dirsystem +'/mpd-crossfade'
			, curlPage( 'mpd' )
		] }, refreshData );
	}
} );
$( '#setting-crossfade' ).click( function() {
	info( {
		  icon    : 'mpd'
		, title   : 'Crossfade'
		, message : 'Seconds:'
		, radio   : { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
		, preshow : function() {
			$( 'input[name=inforadio]' ).val( [ G.crossfade || 2 ] )
		}
		, cancel    : function() {
			if ( !G.crossfade ) {
				$( '#crossfade' ).prop( 'checked', 0 );
				$( '#setting-crossfade' ).addClass( 'hide' );
			}
		}
		, ok      : function() {
			crossfade = $( 'input[name=inforadio]:checked' ).val();
			if ( crossfade !== G.crossfade ) {
				G.crossfade = crossfade;
				banner( 'Crossfade', 'Change ...', 'mpd' );
				$.post( 'commands.php', { bash: [
					  "mpc crossfade "+ crossfade +" &> /dev/null || /usr/bin/sudo /usr/bin/"+
						"sed -i 's/\\(crossfade: \\)/\\1"+ crossfade +"/' /srv/http/data/mpd/mpdstate"
					, 'echo '+ crossfade +' > '+ dirsystem +'/mpd-crossfade'
					, curlPage( 'mpd' )
				] }, refreshData );
			}
		}
	} );
} );
$( '#normalization' ).click( function() {
	G.normalization = $( this ).prop( 'checked' );
	if ( G.normalization ) {
		var cmd = [
			  "sed -i '/^user/ a\\volume_normalization \"yes\"' /etc/mpd.conf"
			, 'touch '+ dirsystem +'/mpd-normalization'
		];
	} else {
		var cmd = [
			  "sed -i '/^volume_normalization/ d' /etc/mpd.conf"
			, 'rm '+ dirsystem +'/mpd-normalization'
		];
	}
	cmd.push(
		  restartmpd
		, curlPage( 'mpd' )
	);
	banner( 'Normalization', G.normalization, 'mpd' );
	$.post( 'commands.php', { bash: cmd }, refreshData );
} );
$( '#replaygain' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-replaygain' ).click();
	} else {
		banner( 'Replay Gain', G.replaygain !== 'off', 'mpd' );
		$.post( 'commands.php', { bash: [
			  "sed -i '/^replaygain/ s/\".*\"/\"off\"/' /etc/mpd.conf"
			, 'rm -f '+ dirsystem +'/mpd-replaygain'
			, restartmpd
			, curlPage( 'mpd' )
		] }, refreshData );
	}
} );
$( '#setting-replaygain' ).click( function() {
	info( {
		  icon      : 'mpd'
		, title     : 'Replay Gain'
		, radio     : { Auto: 'auto', Album: 'album', Track: 'track' }
		, preshow : function() {
			var checked = G.replaygain === 'off' ? 'auto' : G.replaygain;
			$( 'input[name=inforadio]' ).val( [ checked ] )
		}
		, cancel    : function() {
			if ( G.replaygain === 'off' ) {
				$( '#replaygain' ).prop( 'checked', 0 );
				$( '#setting-replaygain' ).addClass( 'hide' );
			}
		}
		, ok        : function() {
			replaygain = $( 'input[name=inforadio]:checked' ).val();
			if ( replaygain !== G.replaygain ) {
				G.replaygain = replaygain;
				banner( 'Replay Gain', 'Change ...', 'mpd' );
				$.post( 'commands.php', { bash: [
					  "sed -i '/^replaygain/ s/\".*\"/\""+ replaygain +"\"/' /etc/mpd.conf"
					, 'echo '+ replaygain +' > '+ dirsystem +'/mpd-replaygain'
					, restartmpd
					, curlPage( 'mpd' )
				] }, refreshData );
			}
		}
	} );
} );
$( '#autoupdate' ).click( function() {
	G.autoupdate = $( this ).prop( 'checked' );
	if ( G.autoupdate ) {
		var cmd = [
			  "sed -i '1 i\\auto_update        \"yes\"' /etc/mpd.conf"
			, 'touch '+ dirsystem +'/mpd-autoupdate'
		];
	} else {
		var cmd = [
			  "sed -i '/^auto_update/ d' /etc/mpd.conf"
			, 'rm '+ dirsystem +'/mpd-autoupdate'
		];
	}
	cmd.push(
		  restartmpd
		, curlPage( 'mpd' )
	);
	banner( 'Auto Update', G.autoupdate, 'mpd' );
	$.post( 'commands.php', { bash: cmd }, refreshData );
} );
$( '#buffer' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-buffer' ).click();
	} else {
		banner( 'Custom Buffer', 'Disable ...', 'mpd' );
		$.post( 'commands.php', { bash: [
			  "sed -i '/^audio_buffer/ d' /etc/mpd.conf"
			, 'rm -f ' + dirsystem +'/mpd-buffer'
			, restartmpd
			, curlPage( 'mpd' )
		] }, refreshData );
	}
} );
$( '#setting-buffer' ).click( function() {
	info( {
		  icon      : 'mpd'
		, title     : 'Buffer'
		, message   : '<px20/>(default: 4096)'
		, textlabel : 'Buffer size <gr>(kB)</gr>'
		, textvalue : G.buffer || 4096
		, cancel    : function() {
			if ( !G.buffer ) {
				$( '#buffer' ).prop( 'checked', 0 );
				$( '#setting-buffer' ).addClass( 'hide' );
			}
		}
		, ok        : function() {
			var buffer = $( '#infoTextBox' ).val().replace( /\D/g, '' );
			if ( buffer < 4097 ) {
				info( {
					  icon    : 'mpd'
					, title   : 'Buffer'
					, message : '<i class="fa fa-warning fa-lg"></i> Warning<br>'
							   +'<br>Custom buffer must be greater than <wh>4096KB</wh>.'
				} );
				if ( !G.buffer ) $( '#buffer' ).prop( 'checked', 0 );
			} else if ( buffer !== G.buffer ) {
				G.buffer = buffer;
				banner( 'Custom Buffer', 'Change ...', 'mpd' );
				$.post( 'commands.php', { bash: [
					  "sed -i"
						+" -e '/^audio_buffer/ d'"
						+" -e '1 i\\audio_buffer_size  \""+ buffer +"\"' /etc/mpd.conf"
					, 'echo '+ buffer +' > '+ dirsystem +'/mpd-buffer'
					, restartmpd
					, curlPage( 'mpd' )
				] }, refreshData );
			}
		}
	} );
} );
$( '#ffmpeg' ).click( function() {
	G.ffmpeg = $( this ).prop( 'checked' );
	banner( 'FFmpeg Decoder', G.ffmpeg, 'mpd' );
	$.post( 'commands.php', { bash: [
		  "sed -i '/ffmpeg/ {n; s/\".*\"/\""+ ( G.ffmpeg ? 'yes' : 'no' ) +"\"/}' /etc/mpd.conf"
		, ( G.ffmpeg ? 'touch ' : 'rm -f ' ) + dirsystem +'/mpd-ffmpeg'
		, restartmpd
		, curlPage( 'mpd' )
	] }, refreshData );
} );
$( '#mpdscribble' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( checked && !G.mpdscribbleuser ) {
		$( '#setting-mpdscribble' ).click();
	} else {
		if ( checked ) {
			var cmd = [
				  'systemctl enable --now mpdscribble'
				, 'touch '+ dirsystem +'/mpd-mpdscribble'
			];
		} else {
			var cmd = [
				  'systemctl disable --now mpdscribble'
				, 'rm -f '+ dirsystem +'/mpd-mpdscribble'
			];
		}
		cmd.push( curlPage( 'mpd' ) );
		banner( 'Last.fm Scrobbler', checked, 'lastfm' );
		$.post( 'commands.php', { bash: cmd }, refreshData );
	}
} );
$( '#setting-mpdscribble' ).click( function() {
	var user0 = G.mpdscribbleuser || '';
	info( {
		  icon          : 'lastfm'
		, title         : 'Last.fm Scrobbler'
		, textlabel     : 'User'
		, textvalue     : user0
		, passwordlabel : 'Password'
		, cancel        : function() {
			$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		}
		, ok            : function() {
			var user = $( '#infoTextBox' ).val().replace( /([&()\\])/g, '\$1' );
			var password = $( '#infoPasswordBox' ).val().replace( /([&()\\])/g, '\$1' );
			banner( 'Last.fm Scrobbler', 'Change ...', 'lastfm' );
			$.post( 'commands.php', { bash: [
				  'sed -i'
					+" -e 's/^\\(username =\\).*/\\1 "+ user +"/'"
					+" -e 's/^\\(password =\\).*/\\1 "+ password +"/'"
					+' /etc/mpdscribble.conf'
				, "echo '"+ user +"\n"+ password +"' > "+ dirsystem +'/mpdscribble'
				, 'touch /srv/http/data/system/mpd-mpdscribble'
				, 'systemctl restart mpdscribble'
				, curlPage( 'mpd' )
			] }, refreshData );
		}
	} );
} );
$( '#status' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) || $( e.target ).hasClass( 'fa-reboot' ) ) return
	
	codeToggle( e.target, this.id, getStatus );
} );
$( '#restart' ).click( function( e ) {
	$this = $( this );
	info( {
		  icon    : 'mpd'
		, title   : 'MPD'
		, message : 'Restart MPD?'
		, ok      : function() {
			banner( 'MPD', 'Restart ...', 'mpd' );
			$.post( 'commands.php', { bash: '/srv/http/bash/mpd-conf.sh' }, refreshData );
		}
	} );
} );
$( '#mpdconf' ).click( function( e ) {
	codeToggle( e.target, this.id, getMpdconf );
} );
function getAplay() {
	$.post( 'commands.php', { bash: 'aplay -l', string: 1 }, function( status ) {
		$( '#codeaplay' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function getAmixer() {
	var card = $( '#audiooutput option:selected' ).data( 'card' );
	$.post( 'commands.php', { bash: 'amixer -c '+ card, string: 1 }, function( status ) {
		$( '#codeamixer' )
			.html( status || '(none)' )
			.removeClass( 'hide' );
	} );
}
function getMpdconf() {
	$.post( 'commands.php', { bash: 'cat /etc/mpd.conf', string: 1 }, function( status ) {
		$( '#codempdconf' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function getStatus() {
	$.post( 'commands.php', { bash: 'systemctl status mpd'
								   +' | sed "s|\\(active (running)\\)|<grn>\\1</grn>|;'
								   +'s|\\(inactive (dead)\\)|<red>\\1</ed>|"', string: 1
		}, function( status ) {
		$( '#codestatus' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function setMixerType( mixertype ) {
	var $output = $( '#audiooutput option:selected' );
	var cmd = [];
	if ( mixertype === 'none' ) {
		var volumenone = 1;
		var hwmixer = $output.data( 'hwmixer' );
		if ( hwmixer ) cmd.push( 'amixer -c '+ $output.data( 'card' ) +' sset '+ hwmixer +' 0dB' );
	} else {
		var volumenone = 0;
	}
	cmd.push(
		  ( mixertype === 'hardware' ? 'rm -f' : 'echo '+ mixertype +' >' ) +' "'+ dirsystem +'/mpd-mixertype-'+ $output.text() +'"'
		, setmpdconf
		, curlPage( 'mpd' )
		, 'curl -s -X POST "http://127.0.0.1/pub?id=volumenone" -d \'{ "volumenone": "'+ volumenone +'" }\''
	);
	banner( 'Mixer Control', 'Change ...', 'mpd' );
	$.post( 'commands.php', { bash: cmd }, refreshData );
}

refreshData = function() {
	$.post( 'commands.php', { getjson: '/srv/http/bash/mpd-data.sh' }, function( list ) {
		G = list;
		restartmpd = G.mpd ? 'systemctl restart mpd' : '';
		var htmldevices = '';
		$.each( G.devices, function() {
			htmldevices += '<option '
				+'value="'+ this.aplayname +'" '
				+'data-card="'+ this.card +'" '
				+'data-device="'+ this.device +'" '
			if ( this.mixercount ) {
				htmldevices += 'data-hwmixer="'+ this.hwmixer +'" '
							  +'data-mixercount="'+ this.mixercount +'" '
			}
			if ( this.mixertype ) {
				htmldevices += 'data-mixertype="'+ this.mixertype +'" '
			} else if ( this.mixercount ) {
				htmldevices += 'data-mixertype="hardware" '
			} else {
				htmldevices += 'data-mixertype="software" '
			}
			if ( this.mixermanual ) htmldevices += 'data-mixermanual="'+ this.mixermanual +'" ';
			htmldevices += 'data-dop="'+ this.dop +'" '
						  +'>'+ this.name +'</option>';
		} );
		$( '#audiooutput' ).html( htmldevices );
		if ( G.devices.length === 1 ) $( '#audiooutput' ).prop( 'disabled', 1 );
		if ( G.usbdac ) {
			$( '#audiooutput' ).val( G.usbdac );
		} else {
			$( '#audiooutput option' ).filter( function() {
				var $this = $( this );
				return $this.text() === G.audiooutput && $this.val() === G.audioaplayname;
			} ).prop( 'selected', true );
		}
		if ( $( '#audiooutput option:selected' ).data( 'hwmixer' ) ) {
			var mixerhtml =  '<option value="none">Disable</option>'
							+'<option value="hardware">DAC hardware</option>'
							+'<option value="software">MPD software</option>';
			$( '#hwmixertxt' ).show();
		} else {
			var mixerhtml =  '<option value="none">Disable</option>'
							+'<option value="software">MPD software</option>';
			$( '#hwmixertxt' ).hide();
		}
		var $selected = $( '#audiooutput option:selected' );
		$( '#mixertype' ).html( mixerhtml ).val( $selected.data( 'mixertype' ) );
		$( '#audiooutput, #mixertype' ).selectric( 'refresh' );
		if ( $( '#mixertype' ).val() === 'hardware' && $selected.data( 'mixercount' ) > 1 ) {
			$( '.hwmixer' ).removeClass( 'hide' );
		} else {
			$( '.hwmixer' ).addClass( 'hide' );
		}
		$( '#divmixer' ).toggleClass( 'hide', $selected.data( 'hwmixer' ) === '' );
		var $selected = $( '#audiooutput option:selected' );
		if ( $( '#mixertype' ).val() === 'none'
			&& G.crossfade === 0
			&& G.normalization === false
			&& G.replaygain === 'off'
		) {
			G.novolume = true;
		} else {
			G.novolume = false;
		}
		$( '#novolume' ).prop( 'checked', G.novolume );
		$( '.dop' ).toggleClass( 'hide', $selected.val() === 'bcm2835 ALSA' );
		$( '#dop' ).prop( 'checked', $selected.data( 'dop' ) );
		$( '#crossfade' ).prop( 'checked', G.crossfade > 0 );
		$( '#setting-crossfade' ).toggleClass( 'hide', G.crossfade === 0 );
		$( '#normalization' ).prop( 'checked', G.normalization );
		$( '#replaygain' ).prop( 'checked', G.replaygain !== 'off' );
		$( '#setting-replaygain' ).toggleClass( 'hide', G.replaygain === 'off' );
		$( '#autoupdate' ).prop( 'checked', G.autoupdate );
		$( '#buffer' ).prop( 'checked', G.buffer > 4096 );
		$( '#setting-buffer' ).toggleClass( 'hide', G.buffer === '' );
		$( '#ffmpeg' ).prop( 'checked', G.ffmpeg );
		$( '#mpdscribble' ).prop( 'checked', G.mpdscribble );
		$( '#setting-mpdscribble' ).toggleClass( 'hide', !G.mpdscribble );
		if ( !$( '#codeaplay' ).hasClass( 'hide' ) ) getAplay();
		if ( !$( '#codestatus' ).hasClass( 'hide' ) ) getStatus();
		if ( !$( '#codempdconf' ).hasClass( 'hide' ) ) getMpdconf();
		if ( !$( '#codeamixer' ).hasClass( 'hide' ) ) getAmixer();
		if ( !$( '#codestatus' ).hasClass( 'hide' ) ) getStatus();
		if ( !$( '#codempdconf' ).hasClass( 'hide' ) ) getMpdconf();
		resetLocal();
		showContent();
	}, 'json' );
}
refreshData();

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
