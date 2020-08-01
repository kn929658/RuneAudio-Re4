var G = {
	  apikeyfanart  : '06f56465de874e4c75a2e9f0cc284fa3'
	, apikeylastfm  : 'ba8ad00468a50732a3860832eaed0882'
	, bookmarkedit  : 0
	, countsong     : $( '#lib-mode-list' ).data( 'count' )
	, coversave     : 0
	, librarylist   : 0
	, debounce      : ''
	, debouncems    : 300
	, display       : {}
	, guide         : 0
	, list          : {}
	, library       : 0
	, local         : 0
	, localhost     : [ 'localhost', '127.0.0.1' ].indexOf( location.hostname ) !== -1
	, mode          : ''
	, modescrolltop : 0
	, pladd         : {}
	, playback      : 1
	, playlist      : 0
	, query         : []
	, savedlist     : 0
	, savedplaylist : 0
	, scale         : 1
	, screenS       : window.innerHeight < 590 || window.innerWidth < 500
	, scrollspeed   : 80 // pixel/s
	, scrolltop     : {}
	, similarpl     : -1
	, status        : {}

}
var data = {}
var picaOption = { // pica.js
	  unsharpAmount    : 100  // 0...500 Default = 0 (try 50-100)
	, unsharpThreshold : 5    // 0...100 Default = 0 (try 10)
	, unsharpRadius    : 0.6
//	, quality          : 3    // 0...3 Default = 3 (Lanczos win=3)
//	, alpha            : true // Default = false (black crop background)
};
var cmdphp = 'cmd.php';
var hash = Math.ceil( Date.now() / 1000 );
var coverrune = '/assets/img/cover.'+ hash +'.svg';
var vustop = '/assets/img/vustop.'+ hash +'.gif';
if ( G.localhost ) {
	var vu = '/assets/img/vustop.'+ hash +'.gif';
	var blinkdot = '<a>·</a>&ensp;<a>·</a>&ensp;<a>·</a>';
} else {
	var vu = '/assets/img/vu.'+ hash +'.gif';
	var blinkdot = '<a class="dot">·</a>&ensp;<a class="dot dot2">·</a>&ensp;<a class="dot dot3">·</a>';
}
var stopwatch = '<span class="stopwatch">'
				+'<i class="fa fa-stopwatch-i fa-spin"></i>'
				+'<i class="fa fa-stopwatch-o"></i>'
				+'</span>';
var timer = false; // for 'setInterval' status check

// get mpd status with passive.js on pushstream connect
displayGet( function( data ) {
	G.display = data;
	G.bars = data.bars;
	$.event.special.tap.emitTapOnTaphold = false; // suppress tap on taphold
	$.event.special.swipe.horizontalDistanceThreshold = 80; // pixel to swipe
	$.event.special.tap.tapholdThreshold = 1000;
	$( '#swipebar, .page' ).on( 'swipeleft swiperight', function( e ) {
		if ( G.bars || !G.status.mpd || G.swipepl || G.drag ) return
		
		G.swipe = 1;
		setTimeout( function() { G.swipe = 0 }, 1000 );
		var swipeleft = e.type === 'swipeleft';
		if ( G.library ) {
			swipeleft ? $( '#tab-playback' ).click() : $( '#tab-playlist' ).click();
		} else if ( G.playback ) {
			swipeleft ? $( '#tab-playlist' ).click() : $( '#tab-library' ).click();
		} else {
			swipeleft ? $( '#tab-library' ).click()  : $( '#tab-playback' ).click();
		}
	} );
} );

$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var canvas = document.getElementById( 'iconrainbow' );
var ctx = canvas.getContext( '2d' );
var cw = canvas.width / 2;
var ch = canvas.height / 2;
for( i = 0; i < 360; i += 0.25 ) {
	var rad = i * Math.PI / 180;
	ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
	ctx.beginPath();
	ctx.moveTo( cw, ch );
	ctx.lineTo( cw + cw * Math.cos( rad ), ch + ch * Math.sin( rad ) );
	ctx.stroke();
}
$( '#coverart' ).on( 'error', function() {
	var $this = $( this );
	if ( G.status.webradio ) {
		$this.prop( 'src', status.state === 'play' ? vu : vustop );
	} else {
		$this.prop( 'src', coverrune );
	}
} ).one( 'load', function() {
	$( '#splash' ).remove();
	$( '#coverart' ).removeClass( 'hide' );
	$( '.rs-animation .rs-transition' ).css( 'transition-property', '' ); // restore animation after load
	$( 'html, body' ).scrollTop( 0 );
	if ( $( '#lib-cover-list' ).html() ) new LazyLoad( { elements_selector: '.lazy' } );
} ).on( 'load', function() {
	var covervu = $( '#coverart' ).prop( 'src' ).split( '/' ).pop().slice( 0, 2 ) === 'vu';
	$( '#divcover, #coverart' ).toggleClass( 'vu', covervu );
	if ( G.status.mpd && !G.status.webradio && G.status.coverart.slice( 0, 4 ) === 'http' ) {
		G.coversave = 1;
		$( '#divcover' ).append( '<div class="cover-save"><i class="fa fa-save"></i></div>' );
	} else {
		$( '.cover-save' ).remove();
	}
} );
// COMMON /////////////////////////////////////////////////////////////////////////////////////
$( '#button-settings, #badge' ).click( function() {
	$( '#settings' )
		.toggleClass( 'hide' )
		.css( 'top', ( G.bars ? '40px' : 0 ) );
	$( '#settings .menushadow' ).css( 'height', $( '#settings' ).height() +'px' );
	$( '.contextmenu' ).addClass( 'hide' );
} );
var chklibrary = {
	  coverart       : '_<i class="fa fa-coverart"></i>CoverArt'
	, thumbbyartist  : '<i class="fa fa-coverart"></i>Sort by artist'
	, sd             : '_<i class="fa fa-microsd"></i>SD'
	, usb            : '<i class="fa fa-usbdrive"></i>USB'
	, nas            : '_<i class="fa fa-network"></i>Network'
	, webradio       : '<i class="fa fa-webradio"></i>WebRadio'
	, album          : '_<i class="fa fa-album"></i>Album'
	, artist         : '<i class="fa fa-artist"></i>Artist'
	, composer       : '_<i class="fa fa-composer"></i>Composer'
	, albumartist    : '<i class="fa fa-albumartist"></i>AlbumArtist'
	, genre          : '_<i class="fa fa-genre"></i>Genre'
	, date           : '<i class="fa fa-date"></i>Date'
	, count          : '_<gr>text</gr> Count'
	, label          : '<gr>text</gr> Label'
}
var chklibrary2 = {
	  backonleft     : '<i class="fa fa-arrow-left"></i>Back button on left side'
	, tapaddplay     : 'Tap song&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-plus"></i>Add + Play'
	, tapreplaceplay : 'Tap song&ensp;<gr>=</gr>&ensp;<i class="fa fa-play-replace"></i>Replace + Play'
	, plclear        : 'Confirm <gr>on replace Playlist</gr>'
	, playbackswitch : 'Switch to Playback <gr>on <i class="fa fa-play-plus"></i>or <i class="fa fa-play-replace"></i></gr>'
	, hr             : '<hr><px30/><i class="fa fa-coverart"></i>Cover art band <gr>in tracks view</gr><br>'
	, hidecover      : 'Hide'
	, fixedcover     : 'Fix <gr>on large screen</gr>'
}
$( '#displaylibrary' ).click( function( e ) {
	var options = $( e.target ).hasClass( 'submenu' );
	var checklist = !options ? chklibrary : chklibrary2;
	var thumbbyartist = G.display.thumbbyartist;
	displayGet( function( data ) {
		G.display = data;
		info( {
			  icon     : 'library'
			, title    : !options ? 'Library Display' : 'Library-Playlist Options'
			, message  : !options ? 'Show selected items:' : ''
			, checkbox : '<form id="displaysavelibrary">'+ displayCheckbox( checklist ) +'</form>'
			, preshow  : function() {
				if ( options ) {
					$( 'input[name="tapaddplay"], input[name="tapreplaceplay"]' ).click( function() {
						var toggle = $( this ).prop( 'name' ) === 'tapaddplay' ? 'tapreplaceplay' : 'tapaddplay';
						if ( $( this ).prop( 'checked' ) ) $( 'input[ name="'+ toggle +'" ]' ).prop( 'checked', 0 ) ;
					} );
					$( 'input[name=hidecover]' ).change( function() {
						if ( $( this ).prop( 'checked' ) ) {
							displayCheckboxSet( 'fixedcover', false, false );
						} else {
							displayCheckboxSet( 'fixedcover', true );
						}
					} );
					$( 'input[name=fixedcover]' ).prop( 'disabled', G.display.hidecover );
				} else {
					$( 'input[name=coverart]' ).change( function() {
						if ( $( this ).prop( 'checked' ) ) {
							displayCheckboxSet( 'thumbbyartist', true );
						} else {
							displayCheckboxSet( 'thumbbyartist', false, false );
						}
					} );
				}
			}
			, ok       : function () {
				displaySave( 'library', G.display.thumbbyartist );
				if ( G.library ) {
					if ( $( '.licover' ).length ) {
						var pH = G.bars ? 130 : 90;
						if ( G.display.fixedcover ) {
							pH += 230;
							$( '.licover' ).removeClass( 'nofixed' );
							$( '#lib-list li:eq( 1 )' ).addClass( 'track1' );
						} else {
							$( '.licover' ).addClass( 'nofixed' );
							$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
						}
						$( '.list p' ).toggleClass( 'bars-on', G.bars );
						$( '#lib-list p' ).toggleClass( 'fixedcover', G.display.fixedcover );
						if ( G.display.hidecover ) {
							$( '.licover' ).addClass( 'hide' );
						} else {
							$( '.licover' ).removeClass( 'hide' );
						}
					} else {
						renderLibrary();
					}
				} else if ( G.playlist ) {
					if ( G.savedlist ) $( '#button-pl-back' ).css( 'float', G.display.backonleft ? 'left' : '' );
				}
			}
		} );
	} );
} );
var chkplayback = {
	  bars         : 'Top-Bottom bars'
	, barsalways   : 'Bars on small screen'
	, time         : 'Time'
	, radioelapsed : 'WebRadio elapsed'
	, cover        : 'Cover art'
	, coversmall   : 'Small cover art'
	, progressbar  : 'Progress bar'
	, volume       : 'Volume'
	, buttons      : 'Buttons'
}
$( '#displayplayback' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'submenu' ) || e.target.id === 'iconrainbow' ) {
		if ( $( '#mode-album grl' ).text() == 0 ) {
			info( {
				  icon    : 'info-circle'
				, title   : 'Color Editor'
				, message : 'Need at least 1 album in Library.'
			} );
		} else {
			G.color = 1;
			$( '#loader' ).removeClass( 'hide' );
			$( '#tab-library' ).click();
			$( '#mode-album' ).click();
		}
		return
	}
	
	if ( 'coverTL' in G ) $( '#coverTL' ).tap();
	displayGet( function( data ) {
		G.display = data;
		info( {
			  icon     : 'play-circle'
			, title    : 'Playback Display'
			, message  : 'Show selected items:'
			, checkbox : '<form id="displaysaveplayback">'+ displayCheckbox( chkplayback ) +'</form>'
			, preshow  : function() {
				if ( !G.display.bars ) displayCheckboxSet( 'barsalways' );  // disable by bars hide
				if ( G.display.time ) displayCheckboxSet( 'progressbar' );  // disable by time
				if ( !G.display.cover ) displayCheckboxSet( 'coversmall' ); // disable by cover
				if ( G.display.volumenone ) displayCheckboxSet( 'volume' ); // disable by mpd volume
				if ( !G.display.time && !G.display.volume ) {
					displayCheckboxSet( 'cover' ); // disable by autohide
					displayCheckboxSet( 'buttons' );
				}
				if ( !G.status.mpd ) displayCheckboxSet( 'buttons' );
				var $bars = $( 'input[name=bars]' );
				var $time = $( 'input[name=time]' );
				var $cover = $( 'input[name=cover]' );
				var $volume = $( 'input[name=volume]' );
				var $timevolume = $( 'input[name=time], input[name=volume]' );
				$timevolume.change( function() {
					var time = $time.prop( 'checked' );
					var volume = $volume.prop( 'checked' );
					if ( time || volume ) {
						displayCheckboxSet( 'cover', true );
						displayCheckboxSet( 'progressbar', false, false );
						displayCheckboxSet( 'buttons', true );
					} else {
						displayCheckboxSet( 'cover', false, true );
						displayCheckboxSet( 'progressbar', false, false );
						displayCheckboxSet( 'buttons', false, false );
					}
					if ( !time && $cover.prop( 'checked' ) ) {
						displayCheckboxSet( 'progressbar', true, true );
					} else {
						displayCheckboxSet( 'progressbar', false, false );
					}
					if ( !time && ( !volume || G.display.volumenone ) ) {
						displayCheckboxSet( 'cover', true, true );
						displayCheckboxSet( 'progressbar', true, true );
					}
				} );
				$bars.change( function() {
					if ( $( this ).prop( 'checked' ) ) {
						displayCheckboxSet( 'barsalways', true );
					} else {
						displayCheckboxSet( 'barsalways', false, false );
					}
				} );
				$cover.change( function() {
					if ( $( this ).prop( 'checked' ) ) {
						if ( !$time.prop( 'checked' ) ) displayCheckboxSet( 'progressbar', true, true );
						displayCheckboxSet( 'coversmall', true );
					} else {
						displayCheckboxSet( 'progressbar', false, false );
						displayCheckboxSet( 'coversmall', false, false );
						if ( !$time.prop( 'checked' ) && ( !$volume.prop( 'checked' ) || G.display.volumenone ) ) displayCheckboxSet( 'time', true, true );
					}
				} );
			}
			, ok       : function () {
				displaySave( 'playback' );
				G.bars = G.display.bars;
				displayTopBottom();
				if ( G.playback ) {
					setButtonControl();
					displayPlayback();
					renderPlayback();
					$( '#ti-gpio, #i-gpio' ).toggleClass( 'hide', !G.status.gpioon );
				} else {
					if ( G.library ) {
						$( '.list p' ).toggleClass( 'bars-on', G.bars );
						var pH = $( '#lib-cover-list .coverart' ).height() + ( G.bars ? 95 : 55 );
						$( '#lib-cover-list p' ).css( 'height', 'calc( 100vh - '+ pH +'px )' );
					}
				}
			}
		} );
	} );
} );
$( '.settings' ).click( function( e ) {
	var id = e.target.id || e.currentTarget.id;
	if ( id === 'snapclient' ) {
		bash( '/srv/http/bash/snapcast.sh '+ ( G.status.snapclient ? 'stop' : 'start' ), function( data ) {
			bannerHide();
			if ( data != -1 ) {
				getPlaybackStatus();
				displayTopBottom();
			} else {
				info( {
					  icon    : 'snapcast'
					, title   : 'Snapcast'
					, message : 'Snapcast server not available'
				} );
			}
		} );
		notify( 'Snapcast - Sync Streaming Client', ( G.status.snapclient ? 'Stop ...' : 'Start ...' ), 'snapcast blink', -1 );
	} else if ( id !== 'update' ) {
		location.href = 'index-settings.php?p='+ id;
	} else {
		info( {
			  icon    : 'refresh-library'
			, title   : 'Update Library Database'
			, radio   : { 'Only changed files' : 'mpcupdate', 'Rebuild entire database': 'mpcrescan' }
			, ok      : function() {
				G.status.updating_db = true;
				bash( [ $( '#infoRadio input:checked' ).val() ] );
//				notify( 'Library Database', 'Update ...', 'library blink' );
			}
		} );
	}
} );
$( '#power' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'submenu' ) ) {
		$.post( cmdphp, { cmd: 'screenoff' } );
		return
	}
	
	info( {
		  icon        : 'power'
		, title       : 'Power'
		, buttonlabel : '<i class="fa fa-reboot"></i>Reboot'
		, buttoncolor : '#de810e'
		, button      : function() {
			$( '#stop' ).click();
			bash( [ 'reboot' ] );
			notify( 'Power', 'Reboot ...', 'reboot blink', -1 );
		}
		, oklabel     : '<i class="fa fa-power"></i>Off'
		, okcolor     : '#bb2828'
		, ok          : function() {
			$( '#stop' ).click();
			bash( [ 'reboot', 'off' ] );
			$( '#loader' )
				.css( 'background', '#000000' )
				.find( 'svg' ).css( 'animation', 'unset' );
			notify( 'Power', 'Shutdown ...', 'power blink', -1 );
		}
		, buttonwidth : 1
	} );
} );
$( '#gpio' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'submenu' ) ) {
		location.href = 'gpiosettings.php';
	} else {
		bash( G.status.gpioon ? '/srv/http/bash/gpiooff.py' : '/srv/http/bash/gpioon.py' );
	}
} );
$( '#logout' ).click( function( e ) {
	$.post( cmdphp, { cmd: 'logout' }, function() {
		location.reload();
	} );
} );
$( '#addons' ).click( function ( e ) {
	if ( $( e.target ).hasClass( 'submenu' ) ) {
		location.href = '/settings/guide.php'
		return
	}
	
	bash( [ 'addonslist' ], function( std ) {
		if ( std != 0 ) {
			info( {
				  icon    : 'info-circle'
				, message : 'Download from Addons server failed.'
						   +'<br>Please try again later.'
				, ok      : function() {
					$( '#loader' ).addClass( 'hide' );
				}
			} );
		} else {
			location.href = 'addons.php';
		}
	} );
	$( '#loader' ).removeClass( 'hide' );
} );
$( '.pkg' ).click( function( e ) {
	menuPackage( $( this ), $( e.target ) );
} );
$( '#colorok' ).click( function() {
	G.color = 0;
	var hsv = colorpicker.getCurColorHsv(); // hsv = { h: N, s: N, v: N } N = 0-1
	var s = hsv.s;
	var v = hsv.v;
	var L = ( 2 - s ) * v / 2;
	if ( L && L < 1 ) {
		S = L < 0.5 ? s * v / ( L * 2 ) : s * v / ( 2 - L * 2 );
		var h = Math.round( 360 * hsv.h );
		var s = Math.round( S * 100 );
		var l = Math.round( L * 100 );
	} else {
		var h = 0;
		var s = 0;
		var l = L * 100;
	}
	var hsl = h +' '+ s +' '+ l;
	if ( hsl === G.display.color ) {
		$( '#colorcancel' ).click();
	} else {
		bash( [ 'color', hsl ] );
	}
} );
$( '#colorreset' ).click( function() {
	bash( [ 'color', 'reset' ] );
} );
$( '#colorcancel' ).click( function() {
	G.color = 0;
	$( '#colorpicker' ).addClass( 'hide' );
	$( '#playback-controls i, #button-library, #lib-list li.active, #colorok,  \
		#bar-top, #bar-bottom i, .menu a, .submenu, .content-top' ).css( 'background-color', '' );
	$( '#mode-title, #button-lib-back, .lialbum, .licover i, .lidir, .lib-icon, gr, grl, \
		#lib-list li.active i, #lib-list li.active .time, #lib-list li.active .li2' ).css( 'color', '' );
	$( '.logo path.st0' ).css( 'fill', '' )
	$( '.menu a' ).css( 'border-top', '' );
	$( '#lib-list li' ).css( 'border-bottom', '' );
	$( 'body' ).removeClass( 'disablescroll' );
	if ( window.innerHeight < 590 ) {
		$( '.licover' ).removeClass( 'hide' );
		$( '.menu' ).addClass( 'hide' );
	}
} );
$( '#colorpicker' ).click( function( e ) {
	if ( e.target.id === 'colorpicker' ) $( '#colorcancel' ).click();
} );
$( '#tab-library, #button-library' ).click( function() {
	$( '.menu' ).addClass( 'hide' );
	if ( !$( '#lib-search-input' ).val() ) $( '#lib-search-close' ).empty();
	if ( G.library ) {
		if ( G.librarylist || G.bookmarkedit || G.mode === 'coverart' ) {
			if ( G.librarylist ) {
				G.scrolltop[ $( '#lib-path .lipath' ).text() ] = $( window ).scrollTop();
			} else if ( G.mode === 'coverart' ) {
				G.liscrolltop = $( window ).scrollTop();
			}
			G.mode = '';
			G.librarylist = 0;
			G.bookmarkedit = 0;
			G.query = [];
			renderLibrary();
		} else {
			renderLibrary();
		}
	} else {
		switchPage( 'library' );
	}
} );
$( '#tab-playback' ).click( function() {
	getPlaybackStatus();
	switchPage( 'playback' );
	if ( G.color ) $( '#colorcancel' ).click();
} )
$( '#tab-playlist' ).click( function() {
	G.pladd = {};
	if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) {
			G.savedlist = 0;
			G.savedplaylist = 0;
			getPlaylist();
		}
	} else {
		switchPage( 'playlist' );
		if ( !G.savedlist && !G.savedplaylist ) G.status.playlistlength ? getPlaylist() : renderPlaylist( -1 );
		if ( G.color ) $( '#colorcancel' ).click();
	}
} );
$( '#swipebar' ).tap( function( e ) {
	if ( !G.swipe && e.target.id !== 'swipeL' && e.target.id !== 'swipeR' ) $( '#button-settings' ).click();
} ).taphold( function() {
	if ( G.swipe ) return
	
	location.reload();
} );
$( '#swipeL' ).click( function() {
	var page = G.playback ? 'library' : ( G.library ? 'playlist' : 'playback' );
	$( '#tab-'+ page ).click();
} );
$( '#swipeR' ).click( function() {
	var page = G.playback ? 'playlist' : ( G.library ? 'playback' : 'library' );
	$( '#tab-'+ page ).click();
} );
$( '#page-playback' ).tap( function( e ) {
	if ( [ 'coverT', 'timeT', 'volume-bar', 'volume-band', 'volume-band-dn', 'volume-band-up' ].indexOf( e.target.id ) !== -1 ) return
	
	if ( $( '.edit' ).length ) {
		if ( $( e.target ).hasClass( 'edit' ) ) return
		
		$( '.licover-cover' ).remove();
		$( '#coverart' ).css( 'opacity', '' );
		return
	}
	
	clearTimeout( G.volumebar );
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	if ( G.guide ) hideGuide();
} );
$( '#page-library' ).tap( function( e ) {
	var $target = $( e.target );
	if ( G.bookmarkedit
		&& !$target.closest( '.mode-bookmark' ).length
		&& !$target.closest( '.coverart' ).length
	) {
		G.bookmarkedit = 0;
		$( '.edit' ).remove();
		$( '.mode-bookmark' ).find( '.fa-bookmark, .bklabel, img' ).css( 'opacity', '' );
		$( '.coverart img' ).css( 'opacity', '' );
	}
} );
$( '#page-library, #page-playback, #page-playlist' ).click( function( e ) {
	if ( [ 'coverTR', 'timeTR' ].indexOf( e.target.id ) === -1 ) $( '#settings' ).addClass( 'hide' );
} );
$( '#bar-top, #bar-bottom' ).click( function() {
	if ( G.guide ) hideGuide();
	if ( !$( '#colorpicker' ).hasClass( 'hide' ) ) $( '#colorcancel' ).click();
} );
$( '#settings' ).click( function() {
	$( this ).addClass( 'hide' )
} );
$( '#bar-bottom' ).taphold( function() {
	location.reload();
} );
$( '#lib-list, #pl-list, #pl-savedlist' ).on( 'click', 'p', function() {
	$( '.menu' ).addClass( 'hide' );
	$( '#lib-list li, #pl-savedlist li' ).removeClass( 'active' );
	$( '#pl-list li' ).removeClass( 'updn' );
	$( '#pl-list .pl-remove' ).remove();
	$( '#pl-list .name' ).css( 'max-width', '' );
} );
// PLAYBACK /////////////////////////////////////////////////////////////////////////////////////
$( '.emptyadd' ).click( function( e ) {
	if( $( e.target ).hasClass( 'fa-gear' ) ) {
		location.href = 'index-settings.php?p=network';
	} else if ( $( e.target ).hasClass( 'fa' ) ) {
		$( '#tab-library' ).click();
	}
} );
$( '#artist, #guide-bio' ).click( function() {
	if ( G.status.webradio ) return
	
	if ( $( '#bio legend' ).text() != G.status.Artist ) {
		getBio( $( '#artist' ).text() );
	} else {
		$( '#bar-top, #bar-bottom, #loader' ).addClass( 'hide' );
		$( '#bio' ).removeClass( 'hide' );
	}
} );
$( '#album, #guide-album' ).click( function() {
	if ( !G.status.webradio && !G.localhost ) window.open( 'https://www.last.fm/music/'+ G.status.Artist +'/'+ G.status.Album, '_blank' );
} );
$( '#time' ).roundSlider( {
	  sliderType  : 'min-range'
	, max         : 1000
	, radius      : 115
	, width       : 20
	, startAngle  : 90
	, endAngle    : 450
	, showTooltip : false
	, animation   : false
	, create      : function ( e ) {
		$timeRS = this;
	}
	, change      : function( e ) { // not fire on 'setValue'
		clearIntervalAll();
		mpdSeek( e.value );
	}
	, start       : function () {
		clearIntervalAll();
		$( '.map' ).removeClass( 'mapshow' );
	}
	, drag        : function ( e ) { // drag with no transition by default
		$( '#elapsed' ).text( second2HMS( Math.round( e.value / 1000 * G.status.Time ) ) );
	}
	, stop        : function( e ) { // on 'stop drag'
		mpdSeek( e.value );
	}
} );
$( '#volume' ).roundSlider( {
	  sliderType      : 'default'
	, radius          : 115
	, width           : 50
	, handleSize      : '-25'
	, startAngle      : -50
	, endAngle        : 230
	, editableTooltip : false
	, create          : function () { // maintain shadow angle of handle
		$volumeRS = this;
		$volumetooltip = $( '#volume' ).find( '.rs-tooltip' );
		$volumehandle = $( '#volume' ).find( '.rs-handle' );
		$volumehandle.addClass( 'rs-transition' ).eq( 0 )           // make it rotate with 'rs-transition'
			.rsRotate( - this._handle1.angle );                     // initial rotate
		$( '.rs-transition' ).css( 'transition-property', 'none' ); // disable animation on load
	}
	, update          : function( e ) {
		$( e.handle.element ).rsRotate( - e.handle.angle );
		clearTimeout( G.debounce );
		G.debounce = setTimeout( function() {
			G.local = 1;
			$( '#volume' ).addClass( 'disabled' );
			//setTimeout( function() { G.local = 0 }, 300 );
			bash( [ 'volume', G.status.volume, e.value ], function() {
				G.local = 0;
				G.status.volume = e.value;
				$( '#volume' ).removeClass( 'disabled' );
			} );
		}, 50 );
	}
	, start           : function( e ) { // on 'start drag'
		// restore handle color immediately on start drag
		if ( e.value === 0 ) unmuteColor(); // value before 'start drag'
		$( '.map' ).removeClass( 'mapshow' );
	}
} );
$( '#volmute' ).click( function() {
	bash( [ 'volume', G.status.volume ] );
} );
$( '#volup, #voldn' ).click( function() {
	var thisid = this.id;
	var vol = G.status.volume;
	if ( ( vol === 0 && ( thisid === 'voldn' ) ) || ( vol === 100 && ( thisid === 'volup' ) ) ) return

	G.status.volume = ( thisid === 'volup' ) ? vol + 1 : vol - 1;
	$volumeRS.setValue( G.status.volume );
	G.local = 1;
	bash( [ 'volumeincrement', G.status.volume ], function() {
		G.local = 0;
	} );
} );
$( '#coverTL, #timeTL' ).tap( function() {
	if ( !G.status.playlistlength ) return
	
	var list = [ 'bars', 'time', 'cover', 'coversmall', 'volume', 'buttons', 'progressbar' ];
	if ( 'coverTL' in G ) {
		list.forEach( function( el ) {
			G.display[ el ] = G.coverTL[ el ];
		} );
		delete G.coverTL;
	} else {
		G.coverTL = {};
		list.forEach( function( el ) {
			G.coverTL[ el ] = G.display[ el ];
		} );
		if ( this.id === 'coverTL' ) {
			if ( G.display.time || G.display.volume ) {
				G.display.time = G.display.coversmall = G.display.volume = G.display.buttons = false;
				G.display.progressbar = G.status.webradio ? false : true;
			} else {
				G.display.time = G.display.volume = G.display.buttons = true;
			}
		} else {
			G.display.time = G.display.cover = G.display.coversmall = G.display.volume = G.display.buttons = true;
		}
		G.display.bars = false;
	}
	$( '.band, #swipebar' ).addClass( 'transparent' );
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	$( '.volumeband' ).toggleClass( 'hide', G.display.volumenone );
	renderPlayback();
	setButtonControl();
	displayPlayback();
	setButtonOptions();
	if ( 'coverTL' in G && G.display.coversmall ) $( '#timemap' ).removeClass( 'hide' );
} );
$( '#coverT, #timeT' ).tap( function() {
	clearTimeout( G.volumebar );
	if ( !G.status.playlistlength ) return
	
	$( '#swipeL, #swipebar .fa-swipe, #swipeR' ).show();
	G.guide = !$( this ).hasClass( 'mapshow' );
	if ( $( this ).hasClass( 'mapshow' ) ) {
		hideGuide();
		return
	}
	
	$( '.covermap, .guide' ).addClass( 'mapshow' );
	$( '.guide' ).toggleClass( 'hide', !G.status.playlistlength && G.status.mpd );
	$( '#guide-artist, #guide-album' ).toggleClass( 'hide', G.status.webradio || !G.status.playlistlength );
	$( '#volume-text' ).addClass( 'hide' );
	if ( !G.display.cover ) $( '.timemap' ).addClass( 'mapshow' );
	if ( !G.display.volumenone && G.display.volume ) $( '.volmap' ).addClass( 'mapshow' );
	if ( !G.bars ) $( '#swipebar' ).toggleClass( 'transparent' );
	if ( G.display.time || ( G.display.volume && !G.display.volumenone ) ) {
		$( '#coverTL' )
			.removeClass( 'fa-scale-dn' )
			.addClass( 'fa-scale-up' );
	} else {
		$( '#coverTL' )
			.removeClass( 'fa-scale-up' )
			.addClass( 'fa-scale-dn' );
	}
	if ( G.status.mpd ) {
		if ( !G.display.time && !G.status.webradio ) {
			$( '#time-band' )
				.removeClass( 'transparent' )
				.text( $( '#progress' ).text() );
		}
		if ( !G.display.volume && !G.display.volumenone ) {
			$( '.volumeband' ).removeClass( 'transparent' );
			$( '#volume-bar' ).removeClass( 'hide' );
		}
	}
	if ( !G.status.mpd ) $( '#swipeL, #swipebar .fa-swipe, #swipeR' ).hide();
	$( '.edit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
	$( '.cover-save' ).css( 'z-index', 100 );
} );
$( '.covermap' ).taphold( function( e ) {
	if ( ( G.status.webradio && G.status.state === 'play' ) || !G.status.playlistlength || G.guide ) return
	
	$( '#coverart' )
		.css( 'opacity', 0.33 )
		.after( '<i class="edit licover-cover fa fa-coverart"></i>' );
} );
$( '#time-band' ).on( 'touchstart mousedown', function( e ) {
	if ( G.guide ) {
		$( '.controls, #volume-bar' ).addClass( 'hide' );
		$( '.band, #swipebar' ).addClass( 'transparent' );
		$( '.map' ).removeClass( 'mapshow' );
	}
	if ( !G.status.mpd || G.status.webradio ) return
	
	$( '#time-bar' ).removeClass( 'hide' );
	if ( G.guide ) $( '#coverT' ).click();
	G.drag = 1;
	clearIntervalAll();
	var pageX = 'pageX' in e ? e.pageX : e.originalEvent.touches[ 0 ].pageX;
	mpdSeekBar( pageX );
} ).on( 'touchmove mousemove', function( e ) {
	e.preventDefault();
	if ( !G.status.mpd || G.status.webradio ) return
	
	var pageX = 'pageX' in e ? e.pageX : e.originalEvent.touches[ 0 ].pageX;
	if ( G.drag ) mpdSeekBar( pageX );
} ).on( 'click touchend mouseup', function( e ) {
	if ( !G.status.mpd || G.status.webradio ) return
	
	G.drag = 0;
	var pageX = 'pageX' in e ? e.pageX : e.originalEvent.changedTouches[ 0 ].pageX;
	mpdSeekBar( pageX, 'set' );
} );
$( '#volume-band' ).on( 'touchstart mousedown', function( e ) {
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	if ( !G.status.volumenone ) {
		$( '#volume-text' ).text( G.status.volume );
		$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	}
	if ( G.guide ) {
		$( '.controls' ).addClass( 'hide' );
		$( '.band, #swipebar' ).addClass( 'transparent' );
		$( '.map' ).removeClass( 'mapshow' );
	}
	G.drag = 1;
	clearTimeout( G.volumebar );
} ).on( 'touchmove mousemove', function( e ) {
	e.preventDefault();
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	var pageX = 'pageX' in e ? e.pageX : e.originalEvent.touches[ 0 ].pageX;
	if ( G.drag ) volumeSet( pageX );
} ).on( 'touchend mouseup', function( e ) {
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) return
	
	G.drag = 0;
	var pageX = 'pageX' in e ? e.pageX : e.originalEvent.changedTouches[ 0 ].pageX;
	volumeSet( pageX );
	G.volumebar = setTimeout( function() {
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	}, 3000 );
} ).on( 'click', function( e ) {
	if ( G.status.volumenone ) return
	
	if ( $( '#volume-bar' ).hasClass( 'hide' ) ) {
		$( '#volume-text' ).text( G.status.volume );
		$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
		G.volumebar = setTimeout( function() {
			$( '#volume-bar, #volume-text' ).addClass( 'hide' );
		}, 3000 );
	} else {
		G.drag = 0;
		var pageX = 'pageX' in e ? e.pageX : e.originalEvent.changedTouches[ 0 ].pageX;
		volumeSet( pageX );
	}
} );
$( '#volume-band-dn, #volume-band-up' ).click( function() {
	if ( G.status.volumenone ) return
	
	if ( G.guide ) {
		$( '.controls' ).addClass( 'hide' );
		$( '.band, #swipebar' ).addClass( 'transparent' );
		$( '.map' ).removeClass( 'mapshow' );
	}
	$( '#volume-bar, #volume-text' ).removeClass( 'hide' );
	clearTimeout( G.volumebar );
	G.volumebar = setTimeout( function() {
		$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	}, 3000 );
	var updn = this.id.slice( -2 );
	var vol = G.status.volume;
	if ( ( vol === 0 && ( updn === 'dn' ) ) || ( vol === 100 && ( updn === 'up' ) ) ) return
	
	barW = updn === 'up' ? vol + 1 : vol - 1;
	$( '#volume-text' ).text( barW );
	$( '#volume-bar' ).css( 'width', barW +'%' );
	$( '#vol'+ updn ).click();
} );
$( '#divcover' ).on( 'click', '.edit, .cover-save', function( e ) {
	var $this = $( e.target );
	if ( $this.hasClass( 'licover-cover' ) ) {
		G.status.webradio ? webRadioCoverart () : coverartChange();
	} else {
		coverartSave();
	}
} );
var btnctrl = {
//	  timeTL  : ''
//	  timeT   : ''
	  timeTR  : 'settings'
	, timeL   : 'previous'
	, timeM   : 'play'
	, timeR   : 'next'
	, timeBL  : 'random'
	, timeB   : 'stop'
	, timeBR  : 'repeat'
//	, coverTL : ''
//	, coverT  : ''
	, coverTR : 'settings'
	, coverL  : 'previous'
	, coverM  : 'play'
	, coverR  : 'next'
	, coverBL : 'random'
	, coverB  : 'stop'
	, coverBR : 'repeat'
	, volT    : 'volup'
	, volL    : 'voldn'
	, volM    : 'volmute'
	, volR    : 'volup'
	, volB    : 'voldn'
}
$( '.map' ).tap( function( e ) {
	e.preventDefault()
	if ( [ 'coverTL', 'coverT', 'timeT' ].indexOf( this.id ) !== -1
		|| ( !G.status.playlistlength && this.id !== 'coverTR' )
	) return
	
	hideGuide();
	var cmd = btnctrl[ this.id ];
	if ( cmd === 'play' && G.status.state === 'play' ) cmd = !G.status.webradio ? 'pause' : 'stop';
	if ( cmd === 'settings' ) {
		setTimeout( function() { // fix: settings fired on showed
			$( '#button-settings' ).click();
		}, 0 );
	} else if ( cmd === 'repeat' ) {
		if ( G.status.repeat ) {
			if ( G.status.single ) {
				$( '#single' ).click();
				G.status.repeat = false;
				G.status.single = false;
				setButtonOptions();
				G.local = 1;
				setTimeout( function() { G.local = 0 }, 600 );
				bash( 'mpc repeat 0 && mpc single 0' );
			} else {
				$( '#single' ).click();
			}
		} else {
			$( '#repeat' ).click();
		}
	} else {
		$( '#'+ cmd ).click();
	}
} );
$( '.btn-cmd' ).click( function() {
	var $this = $( this );
	var cmd = this.id;
	if ( $this.hasClass( 'btn-toggle' ) ) {
		var onoff = !G.status[ cmd ];
		G.status[ cmd ] = onoff;
		bash( 'mpc -q '+ cmd +' '+ onoff );
		setButtonOptions();
		G.local = 1;
		setTimeout( function() { G.local = 0 }, 600 );
	} else {
		if ( $( '.edit' ).length ) return
		
		if ( cmd !== 'play' ) clearIntervalAll();
		if ( cmd === 'play' ) {
			bash( 'mpc play' );
			$( '#song' ).removeClass( 'gr' );
			if ( G.display.time ) {
				$( '#elapsed' ).removeClass( 'bl' );
				$( '#total' ).removeClass( 'wh' );
			} else {
				if ( !G.status.webradio ) {
					var timehms = second2HMS( G.status.Time );
					var elapsedhms = second2HMS( G.status.elapsed );
					$( '#progress' ).html( '<i class="fa fa-play"></i><w>'+ elapsedhms +'</w> / '+ timehms );
				}
			}
		} else if ( cmd === 'stop' ) {
			if ( G.status.airplay ) {
				bash( '/srv/http/bash/shairport.sh stop' );
			} else if ( G.status.snapclient ) {
				clearIntervalAll();
				bash( '/srv/http/bash/snapcast.sh stop', function() {
					getPlaybackStatus();
				} );
			} else if ( G.status.spotify ) {
				bash( '/srv/http/bash/spotifyd.sh stop' );
			} else if ( G.status.upnp ) {
				bash( '/srv/http/bash/upnp-stop.sh' );
			}
			if ( !G.status.mpd ) return
			
			$( '#song' ).removeClass( 'gr' );
			if ( !G.status.playlistlength ) return
			
			bash( 'mpc stop' );
			$( '#pl-list .elapsed' ).empty();
			$( '#total' ).empty();
			if ( !G.status.webradio ) {
				var timehms = second2HMS( G.status.Time );
				if ( G.display.time ) {
					$( '#time' ).roundSlider( 'setValue', 0 );
					$( '#elapsed' )
						.text( timehms )
						.addClass( 'gr' );
					$( '#total, #progress' ).empty();
				} else {
					$( '#progress' ).html( '<i class="fa fa-stop"></i><w>'+ timehms +'</w>' );
					$( '#time-bar' ).css( 'width', 0 );
				}
			} else {
				$( '#song' ).html( '·&ensp;·&ensp;·' );
				$( '#elapsed, #progress' ).empty();
				if ( $( '#coverart' ).hasClass( 'vu' ) ) $( '#coverart' ).prop( 'src', vustop );
			}
		} else if ( cmd === 'pause' ) {
			if ( G.status.state === 'stop' ) return
			
			bash( 'mpc pause' );
			$( '#song' ).addClass( 'gr' );
			if ( G.display.time && !$( '#time-knob' ).hasClass( 'hide' ) ) {
				$( '#elapsed' ).addClass( 'bl' );
				$( '#total' ).addClass( 'wh' );
			} else {
				var timehms = second2HMS( G.status.Time );
				var elapsedhms = second2HMS( G.status.elapsed );
				$( '#progress' ).html( '<i class="fa fa-pause"></i><bl>'+ elapsedhms +'</bl> / <w>'+ timehms +'</w>' );
			}
		} else if ( cmd === 'previous' || cmd === 'next' ) {
			var length = G.status.playlistlength;
			if ( length === 1 ) return
			
			if ( G.status.state !== 'play' ) {
				G.prevnext = 1;
				var prevnext = setTimeout( function() {
					$( '#loader' ).removeClass( 'hide' );
				}, 1000 );
			}
			bash( [ 'mpcprevnext', cmd, G.status.song + 1, length ], function() {
				G.prevnext = 0;
				clearTimeout( prevnext );
			} );
		}
		G.status.state = cmd;
		[ 'previous', 'stop', 'play', 'pause', 'next' ].forEach( function( el ) {
			$( '#'+ el ).toggleClass( 'active', el === cmd );
		} );
	}
	// for gpio
	if ( $( '#gpio' ).hasClass( 'on' ) && command === 'mpc play' ) bash( [ 'gpiotimerreset' ] );
} );
$( '#biocontent' ).on( 'click', '.biosimilar', function() {
	getBio( $( this ).text() );
} );
$( '#bio' ).on( 'click', '.closebio', function() {
	$( '#bio' ).addClass( 'hide' );
	displayTopBottom();
} );
// LIBRARY /////////////////////////////////////////////////////////////////////////////////////
$( '#lib-breadcrumbs' ).on( 'click', 'a', function() {
	if ( G.query.length > 1 ) G.scrolltop[ G.query[ G.query.length - 1 ].modetitle ] = $( window ).scrollTop();
	var path = $( this ).find( '.lidir' ).text();
	var query = {
		  query  : 'ls'
		, string : path
		, format : [ 'file' ]
	}
	list( query, function( data ) {
		data.path = path;
		data.modetitle = path;
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = path;
	G.query.push( query );
} );
$( '#lib-breadcrumbs' ).on( 'click', '.button-webradio-new', function() {
	webRadioNew();
} );
$( '#button-lib-search' ).click( function() { // icon
	if ( $( '#lib-path .lipath' ).text() === 'Webradio' ) return
	
	$( '#lib-path span, #button-lib-back, #button-lib-search' ).addClass( 'hide' );
	$( '#lib-search, #lib-search-btn' ).removeClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path' ).css( 'max-width', '40px' );
	$( '#lib-search-input' ).focus();
} );
$( '#lib-search-btn' ).click( function() { // search
	var keyword = $( '#lib-search-input' ).val();
	if ( !keyword ) {
		$( '#lib-search-close' ).click();
	} else {
		if ( G.mode === 'coverart' ) G.liscrolltop = $( window ).scrollTop();
		var query = {
			  query  : 'search'
			, string : keyword
		}
		list( query, function( data ) {
			if ( data != -1 ) {
				data.modetitle = 'search';
				renderLibraryList( data );
				$( 'html, body' ).scrollTop( 0 );
			} else {
				$( '#lib-search-close' ).html( '<i class="fa fa-times"></i>&ensp;' );
				infoNoData();
			}
		}, 'json' );
	}
} );
$( '#lib-search-close' ).click( function() {
	G.keyword = '';
	$( '#lib-search, #lib-search-btn' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-path span, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-search-close' ).empty();
	if ( $( '#lib-path .lipath').text() ) $( '#button-lib-back' ).removeClass( 'hide' );
	if ( !$( '#lib-search-input' ).val() ) return
	
	$( '#lib-search-input' ).val( '' );
	if ( G.mode === 'coverart' ) {
		$( '#mode-coverart' ).click();
	} else if ( G.query.length ) {
		var query = G.query[ G.query.length - 1 ];
		list( query, function( data ) {
			data.path = query.path;
			data.modetitle = query.modetitle;
			renderLibraryList( data );
		}, 'json' );
	} else {
		$( '#button-library' ).click();
	}
} );
$( '#lib-search-input' ).keydown( function( e ) {
	if ( e.key === 'Enter' ) $( '#lib-search-btn' ).click();
} );
$( '#button-lib-back' ).click( function() {
	$( '.menu' ).addClass( 'hide' );
	if ( G.query.length < 2 || G.mode === 'webradio' ) {
		G.liscrolltop = $( window ).scrollTop();
		$( '#button-library' ).click();
	} else if ( [ 'file', 'nas', 'sd', 'usb' ].indexOf( G.mode ) !== -1 && G.query[ 0 ] !== 'playlist' ) {
		if ( $( '#lib-breadcrumbs a' ).length > 1 ) {
			$( '#lib-breadcrumbs a' ).eq( -2 ).click();
		} else {
			$( '#button-library' ).click();
		}
	} else {
		G.query.pop();
		var query = G.query[ G.query.length - 1 ];
		if ( query === 'mode-coverart' ) {
			$( '#mode-coverart' ).click();
		} else if ( query === 'playlist' ) {
			$( '#tab-playlist' ).click();
		} else {
			if ( query.query === 'ls' ) G.mode = 'file';
			list( query, function( data ) {
				if ( data != -1 ) {
					data.path = query.path;
					data.modetitle = query.modetitle;
					renderLibraryList( data );
				} else {
					$( '#button-lib-back' ).click(); 
				}
			}, 'json' );
		}
	}
} );
$( '#lib-mode-list' ).contextmenu( function( e ) { // disable default image context menu
	e.preventDefault();
} );
$( '.mode' ).click( function() {
	$( '#lib-search-close' ).click();
	G.mode = $( this ).data( 'mode' );
	G.modescrolltop = $( window ).scrollTop();
	if ( G.mode === 'coverart' || G.mode === 'bookmark' ) return
	
	if ( ( G.mode === 'usb' || G.mode === 'nas' ) && !$( this ).find( 'grl' ).text() ) {
		$( '#loader' ).removeClass( 'hide' );
		location.href = 'index-settings.php?p=sources';
		return
	} else if ( G.mode === 'webradio' ) {
		if ( !$( '#mode-webradio grl' ).text() ) {
			webRadioNew();
			return
		}
	}

	var path = G.mode.toUpperCase();
	// G.modes: sd, nas, usb, webradio, album, artist, albumartist, composer, genre
	// ( coverart, bookmark by other functions )
	if ( [ 'sd', 'nas', 'usb' ].indexOf( G.mode ) !== -1 ) { // browse by directory
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
	} else if ( G.mode === 'webradio' ) {
		var query = {
			  query  : 'webradio'
		}
	} else { // browse by modes
		var query = {
			  query  : 'list'
			, mode   : G.mode
			, format : [ G.mode ]
		}
	}
	list( query, function( data ) {
		data.path = path;
		data.modetitle = path;
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = path;
	G.query.push( query );
} );
$( '#infoContent' ).on( 'click', '#imgnew', function() {
	var canvas = document.createElement( 'canvas' );
	var ctx = canvas.getContext( '2d' );
	var image = document.getElementById( 'imgnew' );
	var img = new Image();
	img.onload = function() {
		ctx.drawImage( image, 0, 0 );
	}
	img.src = image.src;
	var w = img.width;
	var h = img.height;
	var cw = Math.round( w / 2 );
	var ch = Math.round( h / 2 );
	canvas.width = h;
	canvas.height = w;
	ctx.translate( ch, cw );
	ctx.rotate( Math.PI / 2 );
	ctx.drawImage( img, -cw, -ch );
	image.src = canvas.toDataURL( 'image/jpeg' );
} );
$( '#infoFileBox' ).change( function() {
	var file = this.files[ 0 ];
	$( '#infoButton' ).hide();
	if ( !file ) return
	
	$( '#infoFilename' ).empty();
	$( '#imgnew, .imagewh, .imgname' ).remove();
	$( '.imgold' ).css( 'float', 'left' );
	if ( file.name.slice( -4 ) === '.gif' ) {
		var img = new Image();
		img.onload = function() {
			$( '#infoMessage' ).append(
				 '<img id="imgnew" src="'+ URL.createObjectURL( file ) +'">'
				+'<div class="imagewh"><span>'+ this.width +' x '+ this.height
			);
		}
		img.src = URL.createObjectURL( file );
		return
	}
	
	getOrientation( file, function( ori ) {
		resetOrientation( file, ori, function( filecanvas, imgW, imgH ) {
			if ( imgW > 1000 || imgH > 1000 ) {
				if ( imgW > imgH ) {
					pxW = 1000;
					pxH = Math.round( imgH / imgW * 1000 );
				} else {
					pxH = 1000;
					pxW = Math.round( imgW / imgH * 1000 );
				}
				var canvas = document.createElement( 'canvas' );
				canvas.width = pxW;
				canvas.height = pxH;
				pica.resize( filecanvas, canvas, picaOption ).then( function() {
					var resizedimg = canvas.toDataURL( 'image/jpeg' ); // canvas -> base64
					$( '#infoMessage' ).append(
						 '<img id="imgnew" src="'+ resizedimg +'">'
						+'<div class="imagewh"><span>'+ pxW +' x '+ pxH
						+'<br>original: '+ imgW +' x '+ imgH
						+'<br><i class="fa fa-redo"></i>Tap to rotate</span></div>'
					);
				} );
			} else {
				$( '#infoMessage' ).append( 
					 '<img id="imgnew" src="'+ filecanvas.toDataURL( 'image/jpeg' ) +'">'
					+'<div class="imagewh"><span>'+ imgW +' x '+ imgH
					+'<br><i class="fa fa-redo"></i>Tap to rotate</span></div>'
				);
			}
		} );
	} );
} );
$( '#lib-mode-list' ).on( 'tap', '.mode-bookmark', function( e ) { // delegate - id changed on renamed
	$( '#lib-search-close' ).click();
	if ( $( '.edit' ).length && !$( e.target ).hasClass( 'edit' )  ) {
		$( '.edit' ).remove();
		$( '.mode-bookmark' ).find( '.fa-bookmark, .bklabel, img' ).css( 'opacity', '' );
		return
	}
	
	var $target = $( e.target );
	var $this = $( this );
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.bklabel' ).text() || '';
	if ( $target.hasClass( 'mode-edit' ) ) {
		bookmarkRename( name, path, $this );
	} else if ( $target.hasClass( 'mode-cover' ) ) {
		var thumbnail = $this.find( 'img' ).length;
		if ( thumbnail ) {
			var icon = '<img class="imgold" src="'+ $this.find( 'img' ).prop( 'src' ) +'">'
					  +'<p class="imgname">'+ name +'</p>';
		} else {
			var icon = '<div class="infobookmark"><i class="fa fa-bookmark"></i><br><span class="bklabel">'+ $this.find( '.bklabel' ).text() +'</span></div>';
		}
		var jsoninfo =  {
			  icon        : 'bookmark'
			, title       : 'Change Bookmark Thumbnail'
			, message     : icon
			, filelabel   : '<i class="fa fa-folder-open"></i>Browse'
			, fileoklabel : '<i class="fa fa-flash"></i>Replace'
			, filetype    : 'image/*'
			, ok          : function() {
				var bookmarkname = path;
				var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
				if ( file.name.slice( -4 ) !== '.gif' ) {
					var newimg = $( '#imgnew' ).prop( 'src' );
					$.post( cmdphp, {
						  cmd            : 'imagefile'
						, imagefile      : bookmarkname
						, base64bookmark : newimg
					}, bookmarkThumbReplace( $this, newimg ) );
				} else {
					var newimg = URL.createObjectURL( file );
					var img = $( '#infoMessage img' )[ 0 ];
					var formData = new FormData();
					formData.append( 'cmd', 'imagefile' );
					formData.append( 'imagefile', bookmarkname );
					formData.append( 'base64bookmark', 1 );
					formData.append( 'file', file );
					formData.append( 'resize', img.naturalWidth > 200 || img.naturalHeight > 200 );
					$.ajax( {
						  url         : cmdphp
						, type        : 'POST'
						, data        : formData
						, processData : false
						, contentType : false
						, success     : function() {
							bookmarkThumbReplace( $this, newimg );
						}
					} );
				}
			}
		}
		if ( thumbnail ) {
			jsoninfo.buttonlabel = '<i class="fa fa-undo"></i>Reset';
			jsoninfo.buttonwidth = 1;
			jsoninfo.button      = function() {
				var bookmarkname = path;
				var label = bookmarkname.split( '/' ).pop();
				bookmarkname = bookmarkname.replace( /\//g, '|' );
				$.post( cmdphp, {
					  cmd          : 'imagefile'
					, imagefile    : '/mnt/MPD/'+ path
					, bookmarkfile : '/srv/http/data/bookmarks/'+ bookmarkname
					, label        : label
				}, function( src ) {
					if ( src.length ) {
						$this.find( 'img' ).prop( 'src', src );
					} else {
						$this.find( 'img' ).remove();
						$this.find( '.lipath' ).after( '<i class="fa fa-bookmark"></i><div class="divbklabel"><span class="bklabel label" style="">'+ label +'</span></div>' );
					}
				} );
			}
		}
		info( jsoninfo );
	} else if ( $target.hasClass( 'mode-remove' ) ) {
		bookmarkDelete( path, name, $this );
	} else {
		G.mode = 'file';
		var path = $( this ).find( '.lipath' ).text();
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
		$( '#loader' ).removeClass( 'hide' );
		list( query, function( data ) {
			data.path = path;
			data.modetitle = path;
			renderLibraryList( data );
			$( '#loader' ).addClass( 'hide' );
		}, 'json' );
		query.path = path;
		query.modetitle = path;
		G.query.push( query );
	}
} ).on( 'taphold', '.mode-bookmark', function() {
	if ( G.drag ) return
	
	G.bookmarkedit = 1;
	G.bklabel = $( this ).find( '.bklabel' );
	$( '.mode-bookmark' ).each( function() {
		$this = $( this );
		var buttonhtml = '<i class="edit mode-remove fa fa-minus-circle"></i>'
						+'<i class="edit mode-cover fa fa-coverart"></i>';
		if ( !$this.find( 'img' ).length ) buttonhtml += '<i class="edit mode-edit fa fa-edit-circle"></i>'
		$this.append( buttonhtml )
	} );
	$( '.mode-bookmark' ).find( '.fa-bookmark, .bklabel, img' ).css( 'opacity', 0.33 );
} );
var sortablelibrary = new Sortable( document.getElementById( 'lib-mode-list' ), {
	  ghostClass    : 'lib-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onStart       : function () {
		G.bookmarkedit = 0;
		G.drag = 1;
		$( '.edit' ).remove();
		$( '.mode-bookmark' ).find( '.fa-bookmark, .bklabel, img' ).css( 'opacity', '' );
	}
	, onEnd         : function () {
		G.drag = 0;
	}
	, onUpdate      : function () {
		var $blocks = $( '.mode' );
		var order = [];
		$blocks.each( function() {
			order.push( $( this ).find( '.lipath' ).text() );
		} );
		G.display.order = order;
		$.post( cmdphp, {
			  cmd      : 'setorder'
			, setorder : order
		} );
	}
} );
$( '#mode-coverart' ).click( function() { // fix - 'tap' also fire .coverart click here
	if ( !$( '#lib-cover-list' ).html() ) { // no thumbnails yet
		$( this ).taphold();
		return
	}
	
	G.mode = 'coverart';
	G.query = [ 'mode-coverart' ];
	$( '#lib-breadcrumbs' ).html( '<i class="fa fa-coverart"></i> <span id="mode-title">COVERART</span>' );
	$( '#lib-path .lipath' ).text( 'coverart' );
	$( '#lib-list' ).empty();
	$( '#lib-mode-list, #lib-list' ).addClass( 'hide' );
	$( '#lib-cover-list, #button-lib-back' ).removeClass( 'hide' );
	var pH = $( '#lib-cover-list .coverart' ).height() + ( G.bars ? 95 : 55 );
	$( '#lib-cover-list p' ).css( 'height', 'calc( 100vh - '+ pH +'px )' );
	$( '#lib-index' )
		.html( $( '#indexcover' ).html() )
		.removeClass( 'hide' );
	$( 'html, body' ).scrollTop( G.liscrolltop );
} ).taphold( function() {
	if ( G.drag ) return
	
	if ( G.status.updating_db ) {
		info( {
			  icon    : 'coverart'
			, title   : 'CoverArt Thumbnails Update'
			, message : 'Library update is in progress ...'
					   +'<br>Please wait until finished.'
		} );
		return
	}
	
	infoCoverartScan( '' );
} );
$( '.coverart' ).tap( function( e ) {
	if ( $( e.target ).hasClass( 'edit' ) ) return
	
	if ( $( '.edit' ).length ) {
		$( '.coverart img' ).css( 'opacity', '' );
		$( '.edit' ).remove();
		return
	}
	
	G.mode = 'coverart';
	G.liscrolltop = $( window ).scrollTop();
	var path = $( this ).find( '.lipath' ).text();
	if ( path ) {
		var query = {
			  query  : 'ls'
			, mode   : 'coverart'
			, string : path
		}
	} else {
		var cv1 = $( this ).find( '.coverart1' ).text();
		var cv2 = $( this ).find( '.coverart2' ).text(); 
		var query = {
			  query  : 'find'
			, mode   : [ 'album', 'albumartist' ]
			, string : G.display.thumbbyartist ? [ cv2, cv1 ] : [ cv1, cv2 ]
		}
	}
	$( '#loader' ).removeClass( 'hide' );
	list( query, function( data ) {
		data.modetitle = 'COVERART';
		renderLibraryList( data );
	}, 'json' );
	query.modetitle = 'COVERART';
	G.query.push( query );
	
} ).taphold( function() {
	G.bookmarkedit = 1;
	$( '.coverart img' ).css( 'opacity', '' );
	$( '.edit' ).remove();
	$( '.coverart div' ).append(
		 '<i class="edit coverart-remove fa fa-minus-circle"></i>'
		+'<i class="edit coverart-cover fa fa-coverart"></i>'
	);
	$( '.coverart img' ).css( 'opacity', 0.33 );
} );
$( '#lib-cover-list' ).on( 'tap', '.coverart-remove', function() {
	var $thiscover = $( this ).parents().eq( 1 );
	var album = $thiscover.find( '.coverart1' ).text();
	var artist = $thiscover.find( '.coverart2' ).text();
	var imgsrc = $thiscover.find( 'img' ).prop( 'src' );
	var thumbfile = imgsrc.slice( 0, -14 ) + imgsrc.slice( -3 ); // remove cache busting timestamp
	thumbfile = thumbfile.split( '/' ).pop();
	thumbfile = '/srv/http/data/coverarts/'+ decodeURIComponent( thumbfile );
	info( {
		  icon    : 'coverart'
		, title   : 'Remove Thumbnail'
		, message : '<img src="'+ imgsrc +'">'
				   +'<br><wh>'+ album +'</wh>'
				   +'<br>'+ artist
		, oklabel : '<i class="fa fa-minus-circle"></i>Remove'
		, okcolor : '#bb2828'
		, ok      : function() {
			$thiscover.remove();
			var count = $( '#mode-coverart grl' ).text().replace( /,/g, '' );
			count = ( Number( count ) - 1 ).toString().replace( /\B(?=(\d{3})+(?!\d))/g, ',' );
			$( '#mode-coverart grl' ).text( count );
			$.post( cmdphp, {
				  cmd       : 'imagefile'
				, imagefile : thumbfile
			} );
		}
	} );
} );
$( '#lib-cover-list' ).on( 'tap', '.coverart-cover', function() {
	var $img = $( this ).parent().find( 'img' );
	var imgsrc = $img.prop( 'src' );
	var thumbfile = imgsrc.slice( 0, -14 ) + imgsrc.slice( -3 ); // remove cache busting timestamp
	thumbfile = thumbfile.split( '/' ).pop();
	thumbfile = '/srv/http/data/coverarts/'+ decodeURIComponent( thumbfile );
	info( {
		  icon        : 'coverart'
		, title       : 'Change Thumbnail'
		, message     : '<img src="'+ imgsrc +'">'
		, filelabel   : '<i class="fa fa-folder-open"></i>Browse'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, ok          : function() {
			var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
			if ( file.name.slice( -4 ) !== '.gif' ) {
				var newimg = $( '#imgnew' ).prop( 'src' );
				$.post( cmdphp, {
					  cmd       : 'imagefile'
					, imagefile : thumbfile.replace( /%22/g, '\\"' )
					, base64    : newimg
				}, function() {
					$img
						.removeAttr( 'data-src' ) // lazyload 'data-src'
						.prop( 'src', newimg );
				} );
			} else {
				var newimg = URL.createObjectURL( file );
				var img = $( '#infoMessage img' )[ 0 ];
				var formData = new FormData();
				formData.append( 'cmd', 'imagefile' );
				formData.append( 'imagefile', thumbfile );
				formData.append( 'base64', 1 );
				formData.append( 'file', file );
				formData.append( 'resize', img.naturalWidth > 200 || img.naturalHeight > 200 );
				$.ajax( {
					  url         : cmdphp
					, type        : 'POST'
					, data        : formData
					, processData : false
					, contentType : false
					, success     : function() {
						$img
							.removeAttr( 'data-src' )
							.prop( 'src', newimg );
					}
				} );
			}
		}
	} );
} );
$( '#lib-list' ).on( 'tap', '.liedit',  function() {
	var $this = $( this );
	var $img = $this.siblings( 'img' );
	var $thisli = $this.parent().parent();
	var album = $thisli.find( '.lialbum' ).text();
	var artist = $thisli.find( '.liartist' ).text();
	var lipath = $thisli.next().find( '.lipath' ).text();
	var path = '/mnt/MPD/'+ lipath.substr( 0, lipath.lastIndexOf( '/' ) );
	if ( $this.hasClass( 'licover-cover' ) ) {
		coverartChange();
	} else if ( $this.hasClass( 'cover-save' ) ) {
		coverartSave();
	}
} );
$( '#lib-list' ).on( 'taphold', '.licoverimg',  function() {
	$this = $( this );
	$img = $this.find( 'img' );
	$this.parent().removeClass( 'active' );
	$( '#menu-album' ).addClass( 'hide' );
	$img
		.css( 'opacity', '0.33' )
		.after( '<i class="liedit edit licover-cover fa fa-coverart"></i>' );
	$( '.menu' ).addClass( 'hide' );
} ).on( 'tap', 'li', function( e ) {
	var $this = $( this );
	var $target = $( e.target );
	if ( $target.hasClass( 'fa-save' ) || $target.hasClass( 'liedit' ) ) return
	
	$( '.licover .edit' ).remove();
	$( '.licover img' ).css( 'opacity', '' );
	var menushow = $( '.contextmenu:not( .hide )' ).length;
	var targetclass = $target.prop( 'class' )
							.replace( 'fa ', '' )
							.replace( 'fa-', '' )
							.replace( ' lib-icon', '' );
	if ( [ 'folder', 'music', 'webradio', 'licoverimg' ].indexOf( targetclass ) !== -1 ) {
		if ( $this.hasClass( 'active' ) && menushow ) {
			$( '.menu' ).addClass( 'hide' );
		} else {
			$( '#lib-list li' ).removeClass( 'active' );
			contextmenuLibrary( $this, $target );
		}
		return
	}
	
	$( '.menu' ).addClass( 'hide' );
	if ( menushow ) return
	
	$( '#lib-list li' ).removeClass( 'active' );
	if ( $target.hasClass( 'edit' ) ) return
	
	if ( $( '.edit' ).length ) {
		$( '.edit' ).remove();
		$( '.licoverimg img' ).css( 'opacity', '' );
		if ( $( this ).is( '.licover' ) ) return
	}
	
	var islast = $this.find( '.fa-music' ).length + $this.find( '.fa-webradio' ).length + $this.find( '.radiothumb' ).length;
	if ( $this.hasClass( 'licover' ) && $target.is( '.liartist, .fa-artist, .fa-albumartist, .licomposer, .fa-composer' ) ) {
		var name = ( $target.is( '.licomposer, .fa-composer' ) ) ? $this.find( '.licomposer' ).text() : $this.find( '.liartist' ).text();
		getBio( name );
		return
	} else if ( $target.hasClass( 'lialbum' ) ) {
		window.open( 'https://www.last.fm/music/'+ $this.find( '.liartist' ).text() +'/'+ $this.find( '.lialbum' ).text(), '_blank' );
		return
	} else if ( islast || $target.data( 'target' ) ) {
		contextmenuLibrary( $this, $target );
		return
	}
	$this.addClass( 'active' );
	var libpath = $( '#lib-path .lipath' ).text();
	var path = $this.find( '.lipath' ).text();
	var name = $this.find( '.liname' ).text();
	var modetitle = G.mode.toUpperCase() +'<gr> • </gr><wh>'+ path +'</wh>';
	var mode = $( this ).data( 'mode' );
	// modes: file, sd, nas, usb, webradio, album, artist, albumartist, composer, genre
	if ( [ 'file', 'sd', 'nas', 'usb' ].indexOf( mode ) !== -1 ) { // list by directory
		var modetitle = path;
		var query = {
			  query  : 'ls'
			, string : path
			, format : [ 'file' ]
		}
	} else if ( mode !== 'album' ) { // list by mode (non-album)
		var query = {
			  query  : 'find'
			, mode   : G.mode
			, string : path
			, format : [ 'genre', 'composer', 'date' ].indexOf( G.mode ) !== -1 ? [ 'album', 'artist' ] : [ 'album' ]
		}
	} else { // track list
		if ( [ 'album', 'composer', 'date' ].indexOf( G.mode ) !== -1  ) {
			if ( name ) { // albums with the same names
				var query = {
					  query  : 'find'
					, mode   : [ 'album', 'artist' ]
					, string : [ name, path ]
				}
			} else {
				var query = {
					  query  : 'find'
					, mode   : 'album'
					, string : path
					, format : [ 'album', 'artist' ]
				}
			}
		} else if ( G.mode === 'genre' ) { // genre (entire album)
			var query = {
				  query  : 'find'
				, mode   : [ 'album', 'artist' ]
				, string : [ name, path ]
			}
		} else {  // artist, albumartist, composer (by album + mode)
			path = path || name;
			var query = {
				  query  : 'find'
				, mode   : [ 'album', G.mode ]
				, string : [ path, libpath ]
			}
		}
	}
	G.scrolltop[ libpath ] = $( window ).scrollTop();
	$( '#loader' ).removeClass( 'hide' );
	list( query, function( data ) {
		data.path = path;
		data.modetitle = modetitle;
		renderLibraryList( data );
	}, 'json' );
	query.path = path;
	query.modetitle = modetitle;
	G.query.push( query );
} );
$( '#lib-index' ).on( 'click', 'a', function() {
	var $this = $( this );
	if ( !$this.hasClass( 'wh' ) ) return
	
	var index = $this.text();
	if ( index === '#' ) {
		$( 'html, body' ).scrollTop( 0 );
		return
	}
	
	if ( $( '#lib-cover-list' ).hasClass( 'hide' ) ) {
		var offsettop = $( '#lib-list li[data-index='+ index +']' ).offset().top;
	} else {
		var offsettop = $( '.coverart[data-index='+ index +']' ).offset().top;
	}
	$( 'html, body' ).scrollTop( offsettop - ( G.bars ? 80 : 40 ) );
} );
// PLAYLIST /////////////////////////////////////////////////////////////////////////////////////
$( '#button-playlist' ).click( function() {
	$( '#tab-playlist' ).click();
} );
$( '#button-pl-back' ).click( function() {
	$( '.menu' ).addClass( 'hide' );
	if ( G.savedplaylist ) {
		$( '#button-pl-open' ).click();
	} else {
		list( { cmd: 'current' }, renderPlaylist, 'json' );
	}
} );
$( '#button-pl-open' ).click( function() {
	G.savedlist = 1;
	G.savedplaylist = 0;
	if ( G.status.playlists ) renderPlaylistList();
} );
$( '#button-pl-save' ).click( function() {
	if ( G.status.playlistlength ) playlistNew();
} );
$( '#button-pl-consume' ).click( function() {
	if ( G.status.consume ) {
		$( this ).removeClass( 'bl' );
		notify( 'Consume Mode', 'Off', 'list-ul' );
		bash( 'mpc consume 0' );
	} else {
		$( this ).addClass( 'bl' );
		notify( 'Consume Mode', 'On - Remove each song after played.', 'list-ul' );
		bash( 'mpc consume 1' );
	}
} );
$( '#button-pl-random' ).click( function() {
	if ( G.status.librandom ) {
		G.status.librandom = false;
		$( this ).removeClass( 'bl' );
		notify( 'Roll The Dice', 'Off ...', 'dice' );
		bash( [ 'plrandom', false ] );
	} else {
		info( {
			  icon    : 'dice'
			, title   : 'Roll The Dice'
			, message : 'Randomly add songs and play consecutively?'
			, ok      : function() {
				G.status.librandom = true;
				$( this ).addClass( 'bl' );
				notify( 'Roll The Dice', 'Add+play ...', 'dice' );
				bash( [ 'plrandom', true ] );
			}
		} );
	}
} );
$( '#button-pl-shuffle' ).click( function() {
	if ( !G.status.playlistlength ) return
	
	info( {
		  icon    : 'shuffle'
		, title   : 'Shuffle Playlist'
		, message : 'Shuffle all tracks in playlist?'
		, ok      : function() {
			bash( [ 'plshuffle' ] );
		}
	} );
} );
$( '#button-pl-crop' ).click( function() {
	if ( !G.status.playlistlength ) return
	
	info( {
		  icon    : 'crop'
		, title   : 'Crop Playlist'
		, message : 'Clear playlist except current song?'
		, ok      : function() {
			$( '#pl-list li:not( .active )' ).remove();
			if ( !G.status.librandom ) {
				G.local = 1;
				setTimeout( function() { G.local = 0 }, 300 );
			}
			bash( [ 'plcrop' ] );
		}
	} );
} );
$( '#button-pl-clear' ).click( function() {
	if ( !G.status.playlistlength ) return
	
	if ( $( '#pl-list .pl-remove' ).length ) {
		$( '#pl-list .pl-remove' ).remove();
		$( '#pl-list .name' ).css( 'max-width', '' );
		return
	}
	
	info( {
		  icon        : 'minus-circle'
		, title       : 'Remove From Playlist'
		, message     : 'Selective remove / Clear all :'
		, buttonlabel : '<i class="fa fa-list-ul"></i>Select'
		, buttoncolor : '#de810e'
		, button      : function() {
			$( '#pl-list .li1' ).before( '<i class="fa fa-minus-circle pl-remove"></i>' );
			$( '#pl-list .name' ).css( 'max-width', 'calc( 100% - 135px )' );
		}
		, oklabel    : '<i class="fa fa-minus-circle"></i>All'
		, okcolor    : '#bb2828'
		, ok         : function() {
			G.status.playlistlength = 0;
			renderPlaybackBlank();
			renderPlaylist( -1 );
			$( '.cover-save' ).remove();
			G.local = 1;
			setTimeout( function() { G.local = 0 }, 1000 );
			bash( 'mpc clear' );
		}
		, buttonwidth : 1
	} );
} );
$( '#pl-search-input' ).keyup( playlistFilter );
$( '#pl-search-close, #pl-search-btn' ).click( function() {
	$( '#pl-search-close' ).empty();
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).addClass( 'hide' );
	$( '#pl-count, #pl-manage, #button-pl-search, #pl-list li' ).removeClass( 'hide' );
	$( '#pl-search-input' ).val( '' );
	$( '#pl-list' ).html( function() {
		return $( this ).html().replace( /<bl>|<\/bl>/g, '' );
	} )
} );
$( '#button-pl-search' ).click( function() {
	if ( !G.status.playlistlength ) return
	
	$( '#pl-search-close, #pl-search, #pl-search-btn' ).removeClass( 'hide' );
	$( '#pl-count, #pl-manage, #button-pl-search' ).addClass( 'hide' );
	$( '#pl-search-input' ).focus();
} );
var sortableplaylist = new Sortable( document.getElementById( 'pl-list' ), {
	  ghostClass    : 'pl-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onUpdate      : function ( e ) {
		if ( $( e.from ).hasClass( 'active' ) ) {
			$( e.to ).removeClass( 'active' );
			$( e.item ).addClass( 'active' )
			G.status.song = $( e.item ).index();
		}
		G.sortable = 1;
		setTimeout( function() { G.sortable = 0 }, 500 );
		bash( [ 'plorder', ( e.oldIndex + 1 ), ( e.newIndex + 1 ) ], function() {
			setTimeout( setPlaylistScroll, 600 );
		} );
	}
} );
var sortablesavedplaylist = new Sortable( document.getElementById( 'pl-savedlist' ), {
	  ghostClass    : 'pl-sortable-ghost'
	, delay         : 400
	, forceFallback : true // fix: iphone safari
	, onUpdate      : function ( e ) {
		if ( !$( '#pl-path .lipath' ).length ) return
		G.sortable = 1;
		setTimeout( function() { G.sortable = 0 }, 500 );
		
		var plname = $( '#pl-path .lipath' ).text();
		list( {
			  cmd  : 'edit'
			, name : plname
			, old  : e.oldIndex
			, new  : e.newIndex
		} );
	}
} );
$( '#pl-list, #pl-savedlist' ).on( 'swipeleft', 'li', function() {
	G.swipe = 1;
	G.swipepl = 1; // suppress .page swipe
	setTimeout( function() {
		G.swipe = 0;
		G.swipepl = 0;
	}, 500 );
	$( '#tab-library' ).click();
} ).on( 'swiperight', 'li', function() {
	G.swipe = 1;
	G.swipepl = 1;
	setTimeout( function() {
		G.swipe = 0;
		G.swipepl = 0;
	}, 500 );
	$( '#tab-playback' ).click();
} );
$( '#pl-list' ).on( 'click', 'li', function( e ) {
	$target = $( e.target );
	$plremove = $target.hasClass( 'pl-remove' );
	if ( !$plremove && $( '.pl-remove' ).length ) {
		$( '.pl-remove' ).remove();
		$( '#pl-list .name' ).css( 'max-width', '' );
		return
	}
	
	if ( G.swipe || $target.hasClass( 'pl-icon' ) || $plremove ) return
	
	var $this = $( this );
	var listnumber = $this.index() + 1;
	$( '#menu-plaction' ).addClass( 'hide' );
	if ( G.status.state == 'stop' ) {
		$( '#pl-list li.active .elapsed' ).empty();
		$( '#pl-list li.active' ).removeClass( 'active' );
		$this.addClass( 'active' );
		bash( 'mpc play '+ listnumber );
	} else {
		if ( $this.hasClass( 'active' ) ) {
			if ( G.status.state == 'play' ) {
				if ( $this.find( '.fa-webradio' ).length ) {
					$( '#stop' ).click();
					$this.find( '.song' ).empty();
					$( '.li1 .radioname' ).removeClass( 'hide' );
					$( '.li2 .radioname' ).addClass( 'hide' );
				} else {
					$( '#pause' ).click();
					$this.find( '.elapsed i' ).removeClass( 'fa-play' ).addClass( 'fa-pause' );
					G.status.elapsed++;
				}
			} else {
				$( '#play' ).click();
				playlistProgress();
			}
		} else {
			clearInterval( G.intElapsedPl );
			$( '#pl-list li.active .elapsed' ).empty();
			$( '#pl-list li.active' ).removeClass( 'active' );
			$this.addClass( 'active' );
			bash( 'mpc play '+ listnumber );
			G.status.elapsed = 0;
			if ( $this.find( '.fa-webradio' ).length ) G.status.Title = '';
			playlistProgress();
			var scrollpos = $this.offset().top - $( '#pl-list' ).offset().top - ( G.bars ? 80 : 40 ) - ( 49 * 3 );
			$( 'html, body' ).scrollTop( scrollpos );
		}
	}
} );
$( '#pl-list' ).on( 'click', '.pl-icon', function( e ) {
	var $this = $( this );
	var $thisli = $this.parent();
	var radio = $this.hasClass( 'fa-webradio' );
	G.list = {};
	G.list.li = $thisli;
	G.list.path = $thisli.find( '.lipath' ).text().trim();
	G.list.artist = $thisli.find( '.artist' ).text().trim();
	G.list.name = $thisli.find( radio ? '.radioname' : '.name' ).html().trim();
	G.list.index = $thisli.index();
	var menutop = ( $thisli.position().top + 48 ) +'px';
	var $menu = $( '#menu-plaction' );
	var $contextlist = $( '#menu-plaction a' );
	$( '#pl-list li' ).removeClass( 'updn' );
	if ( !$menu.hasClass( 'hide' ) 
		&& $menu.css( 'top' ) === menutop
	) {
		$menu.addClass( 'hide' );
		return
	}
	
	var state = G.status.state;
	$thisli.addClass( 'updn' );
	$contextlist.removeClass( 'hide' );
	if ( $thisli.hasClass( 'active' ) ) {
		$contextlist.eq( 0 ).toggleClass( 'hide', state === 'play' );
		$contextlist.eq( 1 ).toggleClass( 'hide', state !== 'play' || $( e.target ).hasClass( 'fa-webradio' ) );
		$contextlist.eq( 2 ).toggleClass( 'hide', state === 'stop' );
	} else {
		$contextlist.eq( 1 ).add( $contextlist.eq( 2 ) ).addClass( 'hide' );
	}
	$contextlist.eq( 5 ).toggleClass( 'hide', radio );
	$contextlist.eq( 6 ).toggleClass( 'hide', radio );
//	$contextlist.eq( 7 ).toggleClass( 'hide', G.list.name !== '' );
	var contextnum = $menu.find( 'a:not(.hide)' ).length;
	var menuH = $menu.height();
	$menu
		.removeClass( 'hide' )
		.css( 'top', menutop );
	$( '.menushadow' ).css( 'height', menuH );
	var targetB = $menu.offset().top + menuH;
	var wH = window.innerHeight;
	if ( targetB > wH - ( G.bars ? 80 : 40 ) + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
} );
$( '#pl-list' ).on( 'click', '.pl-remove', function() { // remove from playlist
	bash( 'mpc del '+ ( $( this ).parent().index() + 1 ) );
} );
$( '#pl-savedlist' ).on( 'click', 'li', function( e ) {
	if ( G.swipe ) return
	
	$this = $( this );
	var $target = $( e.target );
	var plicon = $target.hasClass( 'pl-icon' );
	if ( $this.hasClass( 'active' )
			&& $( '.contextmenu:not( .hide )' ).length ) {
		$( '.menu' ).addClass( 'hide' );
		return
	}
	
	var pladd = Object.keys( G.pladd ).length;
	$( '.menu' ).addClass( 'hide' );
	if ( G.savedplaylist || plicon ) {
		if ( !pladd ) {
			$( '.menu' ).addClass( 'hide' );
			var datatarget = $target.data( 'target' ) || $this.find( '.pl-icon' ).data ( 'target' );
			var $menu = $( datatarget );
			G.list = {};
			G.list.li = $this; // for contextmenu
			$( '#pl-savedlist li' ).removeClass( 'active' );
			if ( G.savedlist ) {
				G.list.name = $this.find( '.plname' ).text().trim();
				G.list.path = G.list.name;
			} else {
				G.list.artist = $this.find( '.artist' ).text().trim();
				G.list.name = $this.find( '.name' ).text().trim();
				G.list.path = $this.find( '.lipath' ).text().trim() || G.list.name;
				G.list.track = $this.data( 'track' );
				$( '.plus-refresh, .play-plus-refresh' ).toggleClass( 'hide', !G.status.playlistlength );
				$( '.minus-circle' ).removeClass( 'hide' );
				$( '.tag' ).addClass( 'hide' );
				if ( G.savedplaylist && !plicon && G.display.tapaddplay ) {
					$menu.find( 'a:eq( 0 ) .submenu' ).click();
					return
				}
				
				$( '.replace' ).toggleClass( 'hide', !G.status.playlistlength );
				$( '.similar' ).toggleClass( 'hide', G.list.path.slice( 0, 4 ) === 'http' );
			}
			$this.addClass( 'active' );
			$menu
				.removeClass( 'hide' )
				.css( 'top', ( $this.position().top + 48 ) +'px' );
			$menu.find( '.menushadow' ).css( 'height', $menu.height() +'px' );
			var targetB = $menu.offset().top + $menu.height();
			var wH = window.innerHeight;
			if ( targetB > wH - ( G.bars ? 80 : 40 ) + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
		} else {
			playlistInsertSelect( $this );
		}
	} else {
		G.savedlist = 0;
		G.savedplaylist = 1;
		renderSavedPlaylist( $this.find( '.plname' ).text() );
		if ( pladd ) playlistInsertTarget();
	}
} );
$( '#pl-index' ).on( 'click', 'a', function() {
	var $this = $( this );
	if ( !$this.hasClass( 'wh' ) ) return
	
	var index = $this.text();
	if ( index === '#' ) {
		$( 'html, body' ).scrollTop( 0 );
		return
	}
	
	var offsettop = $( '#pl-savedlist li[data-index='+ index +']' ).offset().top;
	$( 'html, body' ).scrollTop( offsettop - ( G.bars ? 80 : 40 ) );
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
