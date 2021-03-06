$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function getAplay() {
	bash( 'aplay -l', function( status ) {
		$( '#codeaplay' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function getAmixer() {
	var card = $( '#audiooutput option:selected' ).data( 'card' );
	bash( 'amixer -c '+ card, function( status ) {
		$( '#codeamixer' )
			.html( status || '(none)' )
			.removeClass( 'hide' );
	} );
}
function getMpdconf() {
	bash( 'cat /etc/mpd.conf', function( status ) {
		$( '#codempdconf' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function getStatus() {
	bash( 'systemctl status mpd', function( status ) {
		$( '#codestatus' )
			.html( statusColor( status ) )
			.removeClass( 'hide' );
	} );
}
function setMixerType( mixertype ) {
	var $output = $( '#audiooutput option:selected' );
	var name = $output.text();
	var cmd = [];
	if ( mixertype === 'none' ) {
		var card = $output.data( 'card' );
		var hwmixer = $output.data( 'hwmixer' );
	} else {
		var card = '';
		var hwmixer = '';
	}
	banner( 'Mixer Control', 'Change ...', 'mpd' );
	bash( [ 'mixerset', mixertype, name, card, hwmixer ], refreshData );
}
refreshData = function() {
	bash( '/srv/http/bash/mpd-data.sh', function( list ) {
		G = list;
		G.reboot = list.reboot ? list.reboot.split( '\n' ) : [];
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
		$( '#divdop' ).toggleClass( 'hide', $selected.val().slice( 0, 7 ) === 'bcm2835' );
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
//---------------------------------------------------------------------------------------
$( '#audiooutput, #mixertype' ).selectric();
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard
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
	banner( 'Audio Output Device', 'Change ...', 'mpd' );
	bash( [ 'audiooutput', G.audioaplayname, card, G.audiooutput, hwmixer ], refreshData );
	$( '#divdop' ).toggleClass( 'hide', G.audioaplayname.slice( 0, 7 ) === 'bcm2835' );
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
	bash( [ 'amixer', card ], function( data ) {
		var devices = data.slice( 0, -1 ).split( '\n' );
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
				banner( 'Hardware Mixer', 'Change ...', 'mpd' );
				bash( [ 'mixerhw', name, mixer, mixermanual, card ], refreshData );
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
				var name = $( '#audiooutput option:selected' ).text();
				banner( 'No Volume', 'Enable ...', 'mpd' );
				bash( [ 'novolume', name ], refreshData );
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
	var name = $selected.text();
	$selected.data( 'dop', 1 );
	banner( 'DSP over PCM', checked, 'mpd' );
	bash( [ 'dop', checked, name ], refreshData );
} );
$( '#crossfade' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-crossfade' ).click();
	} else {
		banner( 'Crossfade', G.crossfade > 0, 'mpd' );
		bash( [ 'crossfade' ], refreshData );
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
				bash( [ 'crossfade ', G.crossfade ], refreshData );
			}
		}
	} );
} );
$( '#normalization' ).click( function() {
	G.normalization = $( this ).prop( 'checked' );
	banner( 'Normalization', G.normalization, 'mpd' );
	bash( [ 'normalization', G.normalization ], refreshData );
} );
$( '#replaygain' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-replaygain' ).click();
	} else {
		banner( 'Replay Gain', G.replaygain !== 'off', 'mpd' );
		bash( [ 'replaygain' ], refreshData );
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
				bash( [ 'replaygain', G.replaygain ], refreshData );
			}
		}
	} );
} );
$( '#autoupdate' ).click( function() {
	G.autoupdate = $( this ).prop( 'checked' );
	banner( 'Auto Update', G.autoupdate, 'mpd' );
	bash( [ 'autoupdate', G.autoupdate ], refreshData );
} );
$( '#buffer' ).click( function() {
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-buffer' ).click();
	} else {
		banner( 'Custom Buffer', 'Disable ...', 'mpd' );
		bash( [ 'buffer' ], refreshData );
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
				bash( [ 'buffer', G.buffer ], refreshData );
			}
		}
	} );
} );
$( '#ffmpeg' ).click( function() {
	G.ffmpeg = $( this ).prop( 'checked' );
	banner( 'FFmpeg Decoder', G.ffmpeg, 'mpd' );
	bash( [ 'ffmpeg', G.ffmpeg ], refreshData );
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
			bash( '/srv/http/bash/mpd-conf.sh', refreshData );
		}
	} );
} );
$( '#mpdconf' ).click( function( e ) {
	codeToggle( e.target, this.id, getMpdconf );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
