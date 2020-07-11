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
			delete G.coverTL;
			hideGuide();
			getPlaybackStatus();
		} else if ( G.library ) {
			displayTopBottom();
			if ( !$( '#lib-search-close' ).text() && !$( '#lib-mode-list' ).hasClass( 'hide' ) ) renderLibrary();
		} else if ( G.playlist ) {
			displayTopBottom();
			if ( !G.savedlist && !G.savedplaylist && !$( '#pl-search-close' ).text() ) {
				$.post( 'mpdplaylist.php', { current: 1 }, function( data ) {
					renderPlaylist( data );
				}, 'json' );
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
var streams = [ 'airplay', 'bookmark', 'coverart', 'display', 'gpio', 'mpddatabase', 'mpdoptions', 'mpdplayer', 'mpdupdate',
	'notify', 'order', 'package', 'playlist', 'reload', 'seek', 'snapcast', 'spotify', 'volume', 'volumenone', 'webradio' ];
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
		case 'idle':        psIdle( data );        break;
		case 'gpio':        psGPIO( data );        break;
		case 'mpddatabase': psMpdDatabase( data ); break;
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
		case 'webradio':    psWebradio( data );    break;
	}
}
function psAirplay( data ) {
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	renderPlayback();
	setButton();
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
	$( '#coverart' ).prop( 'src', data.coverart );
	$( '#divcover .cover-save' ).remove();
}
function psDisplay( data ) {
	if ( G.local ) return
	
	$.each( data, function( key, val ) {
		G.display[ key ] = val;
	} );
	if ( G.playback ) {
		setButton();
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
function psMpdDatabase() {
	if ( G.mode === 'webradio' ) $( '#mode-webradio' ).tap();
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
	if ( G.playback ) setButtonToggle();
	$( '#button-pl-consume' ).toggleClass( 'bl', G.status.consume );
	$( '#button-pl-random' ).toggleClass( 'bl', G.status.librandom );
}
function psMpdPlayer( data ) {
	if ( G.local ) return
	
	G.playback ? setPlayback( data ) : setPlaylistScroll();
}
function psMpdUpdate( data ) {
	if ( G.local ) return
	
	if ( data === 1 ) {
		G.status.updating_db = true;
		if ( !G.localhost ) $( '#tab-library i, #button-library i' ).addClass( 'blink' );
		if ( G.playback && !G.bars ) {
			if ( $( '#time-knob' ).hasClass( 'hide' ) ) {
				$( '#posupdate' ).removeClass( 'hide' );
				$( '#iupdate' ).addClass( 'hide' );
			} else {
				$( '#posupdate' ).addClass( 'hide' );
				$( '#iupdate' ).removeClass( 'hide' );
			}
		}
	} else {
		G.status.updating_db = false;
		if ( !G.localhost ) $( '#tab-library i, #button-library i, .lib-icon' ).removeClass( 'blink' );
		$( '#posupdate, #iupdate' ).addClass( 'hide' );
		notify( 'Library Update', 'Done', 'library' );
		if ( $( '.licover' ).length ) {
			$( '#loader' ).removeClass( 'hide' );
			var query = G.query[ G.query.length - 1 ];
			$.post( 'mpdlibrary.php', query, function( data ) {
				data.path = query.path;
				data.modetitle = query.modetitle;
				renderLibraryList( data );
			}, 'json' );
		}
		$( '#li-count' ).html( data.song.toLocaleString() +' <i class="fa fa-music gr"></i>' );
		delete data.song;
		$.each( data, function( key, val ) {
			$( '#mode-'+ key ).find( 'grl' ).text( val ? val.toLocaleString() : '' );
		} );
		$( '#lib-list .fa-refresh-library' )
			.removeClass( 'fa-refresh-library blink' )
			.addClass( 'fa-folder' );
	}
}
function psNotify( data ) {
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
	
	$( '#'+ data[ 0 ] )
			.data( { active: data[ 1 ], enabled: data[ 2 ] } )
			.find( 'img' ).toggleClass( 'on', data[ 1 ] === 1 );
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
		$.post( 'cmd.php', { cmd: 'bash', bash: cmd } );
	} else {
		$.post( 'cmd.php', { cmd: 'bash', bash: 'systemctl stop snapclient && systemctl start mpd' }, function() {
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
		setButton();
		displayTopBottom();
	} else {
		$( '#tab-playback' ).click();
	}
}
function psVolume( data ) {
	if ( G.local ) return
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		var type = data.volume[ 0 ];
		var vol = data.volume[ 1 ];
		G.status.volume = vol;
		$volumeRS.setValue( type === 'mute' ? 0 : vol );
		$volumehandle.rsRotate( - $volumeRS._handle1.angle );
		if ( type === 'mute' ) {
			muteColor( vol );
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
		$.post( 'cmd.php', { cmd: 'bash', bash: "awk '/volume/ {print $NF}' /srv/http/data/mpd/mpdstate" }, function( data ) {
			G.status.volume = data;
			if ( G.playback ) {
				$volumeRS.setValue( G.status.volume );
				displayPlayback();
			}
		} );
	}
}
function psWebradio( data ) {
	var count = Number( $( '#mode-webradio grl' ).text() );
	count = count + data.webradio;
	$( '#mode-webradio grl' ).text( count ? ( count ).toLocaleString() : '' );
	if ( $( '#lib-path .lipath' ).text() === 'Webradio' ) $( '#mode-webradio' ).click();
	if ( G.playlist && !G.savedlist ) $( '#tab-playlist' ).click();
}
function setPlayback( data ) {
	$.each( data, function( key, value ) {
		G.status[ key ] = value;
	} );
	bannerHide();
	setButton();
	renderPlayback();
	displayPlayback();
}
