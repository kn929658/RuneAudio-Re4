function onVisibilityChange( callback ) {
    var visible = 1;
    function focused() {
        if ( !visible ) callback( visible = 1 );
    }
    function unfocused() {
        if ( visible ) callback( visible = 0 );
    }
    document.addEventListener( 'visibilitychange', function() {
		document.hidden ? unfocused() : focused();
	} );
    window.onpageshow = window.onfocus = focused;
    window.onpagehide = window.onblur = unfocused;
};
onVisibilityChange( function( visible ) {
	if ( visible ) {
		if ( G.playback ) {
			hideGuide();
			getPlaybackStatus();
		} else if ( G.library ) {
			displayTopBottom();
			if ( !$( '#lib-search-close' ).text() && !$( '#lib-mode-list' ).hasClass( 'hide' ) ) renderLibrary();
		} else if ( G.playlist ) {
			displayTopBottom();
			if ( !G.savedlist && !G.savedplaylist && !$( '#pl-search-close' ).text() ) {
				list( { cmd: 'current' }, renderPlaylist, 'json' );
			}
		}
	} else {
		clearIntervalAll();
	}
} );
window.addEventListener( 'orientationchange', function() {
	if ( G.playback ) $( '#page-playback' ).addClass( 'hide' );
	setTimeout( function() {
		if ( G.playback ) {
			displayPlayback();
			scrollLongText()
			$( '#page-playback' ).removeClass( 'hide' );
		} else if ( G.library ) {
			if ( G.librarylist || G.savedlist  || !$( '#lib-cover-list' ).hasClass( 'hide' ) ) {
				if ( G.librarylist ) {
					if ( $( '.licover' ).length ) {
						$( '#lib-list p' ).css( 'min-height', ( G.bars ? 40 : 0 ) +'px' );
						$( '.liinfo' ).css( 'width', ( window.innerWidth - $( '.licoverimg img' ).width() - 50 ) +'px' );
					} else {
						$( '#lib-list p' ).css( 'min-height', window.innerHeight - ( G.bars ? 130 : 90 ) +'px' );
					}
				}
			}
		} else {
			if ( G.playlist && !G.savedlist && !G.savedplaylist ) {
				getTitleWidth();
				setTitleWidth();
				setPlaylistScroll()
				$( '#pl-list p' ).css( 'min-height', window.innerHeight - ( G.bars ? 277 : 237 ) +'px' );
			}
		}
	}, 100 );
} );

var pushstream = new PushStream( {
	  modes                                 : 'websocket'
	, timeout                               : 5000
	, reconnectOnChannelUnavailableInterval : 5000
} );
var streams = [ 'airplay', 'bookmark', 'coverart', 'display', 'gpio', 'mpdoptions', 'mpdplayer', 'mpdupdate',
	'notify', 'order', 'package', 'playlist', 'reload', 'seek', 'snapcast', 'spotify', 'volume', 'volumenone' ];
streams.forEach( function( stream ) {
	pushstream.addChannel( stream );
} );
pushstream.connect();
pushstream.onstatuschange = function( status ) {
	if ( status === 2 ) {
		G.playlist ? updatePlaylist() : getPlaybackStatus();
		$( '#loader' ).addClass( 'hide' );
	} else if ( status === 0 ) { // disconnect
		$( '#loader' ).removeClass( 'hide' );
		bannerHide();
	}
}
pushstream.onmessage = function( data, id, channel ) {
	switch( channel ) {
		case 'airplay':     psAirplay( data );     break;
		case 'bookmark':    psBookmark( data );    break;
		case 'coverart':    psCoverart( data );    break;
		case 'display':     psDisplay( data );     break;
		case 'gpio':        psGPIO( data );        break;
		case 'mpdoptions':  psMpdOptions( data );  break;
		case 'mpdplayer':   psMpdPlayer( data );   break;
		case 'mpdupdate' :  psMpdUpdate( data );   break;
		case 'notify':      psNotify( data );      break;
		case 'order':       psOrder( data );       break;
		case 'package':     psPackage( data );     break;
		case 'playlist':    psPlaylist( data );    break;
		case 'reload':      psReload( data );      break;
		case 'restore':     psRestore( data );     break;
		case 'seek':        psSeek( data );        break;
		case 'snapcast':    psSnapcast( data );    break;
		case 'spotify':     psSpotify( data );     break;
		case 'volume':      psVolume( data );      break;
		case 'volumenone':  psVolumeNone( data );  break;
	}
}
function psAirplay( data ) {
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	renderPlayback();
	setButtonControl();
	displayTopBottom();
}
function psBookmark( data ) {
	if ( G.bookmarkedit ) return
		
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		if ( 'html' in data ) {
			$( '#lib-mode-list' ).append( data.html );
		} else {
			$( '.lib-mode' ).filter( function() {
				var $bookmark = $( this ).find( '.lipath' ) === data.path;
			} );
			if ( data.type === 'delete' ) {
				$bookmark.remove();
			} else {
				$bookmark.find( '.bklabel' ).text( data.name );
			}
		}
	}, G.debouncems );
}
function psCoverart( data ) {
	G.status.coverart = data.url;
	$( '#divcover, #coverart' ).removeClass( 'vu coverrune' );
	$( '#coverart' ).prop( 'src', data.url );
}
function psDisplay( data ) {
	if ( G.local ) return
	
	$.each( data, function( key, val ) {
		G.display[ key ] = val;
	} );
	if ( G.playback ) {
		setButtonControl();
		renderPlayback();
		displayPlayback();
	} else if ( G.library ) {
		if ( !$( '#lib-mode-list' ).hasClass( 'hide' ) ) {
			renderLibrary();
		} else {
			if ( $( '.licover' ).length ) setTrackCoverart();
		}
	}
	displayTopBottom();
}
function psGPIO( response ) { // on receive broadcast
	var state = response.state;
	G.status.gpioon = state;
	var delay = response.delay;
	if ( timer ) { // must clear before pnotify can remove
		clearInterval( timer );
		timer = false;
	}
	if ( state === 'RESET' ) {
		$( '#infoX' ).click();
	} else if ( state === 'IDLE' ) {
		info( {
			  icon        : 'gpio'
			, title       : 'GPIO Idle Timer'
			, message     : 'Power Off Countdown:<br><br>'
						   + stopwatch +'&ensp;<white>'+ delay +'</white>'
			, oklabel     : 'Reset'
			, ok          : function() {
				bash( [ 'gpiotimerreset' ] );
			}
		} );
		timer = setInterval( function() {
			if ( delay === 1 ) {
				G.status.gpioon = false;
				setButtonOptions();
				$( '#infoX' ).click();
				clearInterval( timer );
			}
			$( '#infoMessage white' ).text( delay-- );
		}, 1000 );
	} else {
		var onoff = state === true ? 'ON' : 'OFF';
		var order = response.order;
		var delays = [ 0 ];
		var devices = ''
		$.each( order, function( i, val ) {
			if ( i % 2 ) {
				delays.push( val );
			} else {
				devices += '<br><a id="device'+ i / 2 +'" class="'+ ( state ? 'gr' : '' ) +'">'+ val +'</a>';
			}
		} );
		info( {
			  icon      : 'gpio'
			, title     : 'GPIO'
			, message   : stopwatch +' <wh>Power '+ onoff +'</wh><hr>'
						+ devices
			, nobutton  : 1
		} );
		var iL = delays.length;
		var i = 0
		gpioCountdown( i, iL, delays );
		setTimeout( function() {
			setButtonOptions();
		}, delay * 1000 );
	}
}
function psMpdOptions( data ) {
	if ( G.local ) return
	
	$.each( data, function( key, value ) {
		if ( value == 1 || value === 'true' ) {
			value = true;
		} else if ( value == 0 || value === 'false' ) {
			value = false;
		}
		G.status[ key ] = value;
	} );
	if ( G.playback ) setButtonOptions();
	$( '#button-pl-consume' ).toggleClass( 'bl', G.status.consume );
	$( '#button-pl-random' ).toggleClass( 'bl', G.status.librandom );
}
function psMpdPlayer( data ) {
	if ( G.local ) return
	
	if ( G.prevnext ) { // fix: prev / next while stop
		clearTimeout( G.debounce );
		G.debounce = setTimeout( function() {
			delete data.playlistlength;
			setPlayback( data );
		}, 600 );
	} else {
		G.playback ? setPlayback( data ) : setPlaylistScroll();
	}
}
function psMpdUpdate( data ) {
	if ( G.local ) return
	
	if ( data == 1 ) {
		G.status.updating_db = true;
		if ( !G.localhost ) $( '#tab-library, #button-library' ).addClass( 'blink' );
		if ( !G.bars ) {
			$( '#posupdate' ).toggleClass( 'hide', !G.display.time );
			$( '#iupdate' ).toggleClass( 'hide', G.display.time );
		}
	} else {
		G.status.updating_db = false;
		if ( !G.localhost ) $( '#tab-library, #button-library, .lib-icon' ).removeClass( 'blink' );
		$( '#posupdate, #i-update, #ti-update' ).addClass( 'hide' );
		notify( 'Library Update', 'Done', 'library' );
		if ( $( '.licover' ).length ) {
			$( '#loader' ).removeClass( 'hide' );
			var query = G.query[ G.query.length - 1 ];
			list( query, function( data ) {
				data.path = query.path;
				data.modetitle = query.modetitle;
				renderLibraryList( data );
			}, 'json' );
		}
		$( '#lib-mode-list' ).data( 'count', data.title )
		$( '#li-count' ).html( data.title.toLocaleString() +' <i class="fa fa-music gr"></i>' );
		delete data.title;
		$.each( data, function( key, val ) {
			$( '#mode-'+ key ).find( 'grl' ).text( val ? val.toLocaleString() : '' );
		} );
		$( '#lib-list .fa-refresh-library' )
			.removeClass( 'fa-refresh-library blink' )
			.addClass( 'fa-folder' );
		if ( G.library && G.mode === 'webradio' ) {
			data.webradio ? $( '#mode-webradio' ).click() : $( '#button-library' ).click();
		} else if ( G.playlist && !G.savedlist ) {
			$( '#tab-playlist' ).click();
		}
	}
}
function psNotify( data ) {
	if ( $( '#bannerTitle' ).text() == 'Power' ) return
	
	notify( data.title, data.text, data.icon, data.delay );
	if ( data.title === 'AirPlay' && data.text === 'Stop ...' ) $( '#loader' ).removeClass( 'hide' );
}
function psOrder( data ) {
	if ( G.local ) return
	
	G.display.order = data;
	orderLibrary();
}
function psPackage( data ) {
	if ( G.local ) return
	
	$( '#'+ data.pkg )
			.data( { active: data.start, enabled: data.enable } )
			.find( 'img' ).toggleClass( 'on', data.start );
}
function psPlaylist( data ) {
	if ( data.playlist === 'playlist' ) {
		getPlaylist();
	} else if ( data.playlist === 'save' ) {
		if ( G.savedlist ) $( '#button-pl-open' ).click();
	} else {
		var name = $( '#pl-path .lipath' ).text();
		if ( G.savedplaylist && data.playlist === name ) renderSavedPlaylist( name );
	}
}
function psReload( data ) {
	if ( data.reload === 'all' || G.localhost ) location.href = '/';
}
function psRestore( data ) {
	if ( data.restore === 'done' ) {
		$( '#loader' ).addClass( 'hide' );
		banner( 'Restore Settings', 'Done', 'sliders' );
	} else {
		$( '#loader' ).removeClass( 'hide' );
		banner( 'Restore Settings', 'Restart '+ data.restore +' ...', 'sliders blink', -1 );
	}
}
function psSeek( data ) {
	G.local = 1;
	setTimeout( function() { G.local = 0 }, 300 );
	G.status.elapsed = data.elapsed;
	G.status.state = 'pause';
	renderPlayback();
}
function psSnapcast( data ) {
	if ( data !== -1 ) {
		var cmd = '/srv/http/bash/snapcast.sh ';
		cmd += 'add' in data ? ' add '+ data.add : ' remove '+ data.remove;
		bash( cmd );
	} else {
		bash( 'systemctl stop snapclient && systemctl start mpd', function() {
			getPlaybackStatus();
		} );
	}
}
function psSpotify( data ) {
	if ( G.playback ) {
		if ( 'pause' in data ) {
			G.status.state = 'pause'
			G.status.elapsed = data.pause;
		} else {
			$.each( data, function( key, value ) {
				G.status[ key ] = value;
			} );
		}
		renderPlayback();
		setButtonControl();
		displayTopBottom();
	} else {
		$( '#tab-playback' ).click();
	}
}
function psVolume( data ) {
	if ( G.local ) return
	
	if ( 'disable' in data ) {
		$( '#vol-group .btn, .volmap' ).toggleClass( 'disabled', data.disable );
		return
	}
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		var type = data.type;
		var val = data.val;
		if ( type === 'mute' ) {
			G.status.volume = 0;
			$volumeRS.setValue( 0 );
		} else {
			G.status.volume = val;
			$volumeRS.setValue( val );
		}
		$volumehandle.rsRotate( - $volumeRS._handle1.angle );
		if ( type === 'mute' ) {
			muteColor( val );
		} else if ( type === 'unmute' ) {
			unmuteColor();
		}
	}, G.debouncems );
}
function psVolumeNone( data ) {
	if ( data.volumenone ) {
		var existing = G.display.volumenone;
		G.display.volumenone = data.volumenone;
		if ( data.volumenone !== existing && G.playback ) displayPlayback();
	} else {
		G.display.volumenone = false;
		bash( "awk '/volume/ {print $NF}' /srv/http/data/mpd/mpdstate", function( data ) {
			G.status.volume = data;
			if ( G.playback ) {
				$volumeRS.setValue( G.status.volume );
				displayPlayback();
			}
		} );
	}
}
function setPlayback( data ) {
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	bannerHide();
	setButtonControl();
	renderPlayback();
	displayPlayback();
}
