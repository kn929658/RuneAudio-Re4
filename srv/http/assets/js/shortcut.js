// keyboard controls
$( document ).keydown( function( e ) {
	if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) return
	
	var key = e.key;

	if ( [ 'ArrowUp', 'ArrowDown' ].indexOf( key ) !== -1 ) e.preventDefault();
	
	if ( !$( '#settings' ).hasClass( 'hide' ) && key === 'Enter' ) {
		var $menu = $( '#settings' ).find( 'a.active' );
		if ( !$menu.length ) $menu = $( '#settings' ).find( '.submenu.active' );
		var href = $menu.prop( 'href' );
		href ? location.href = href : $menu.click();
		return
	}
	
	if ( key === 'Escape' ) {
		if ( $( '.menu:not(.hide)' ).length ) {
			$( '.menu' ).addClass( 'hide' );
			if ( typeof colorpicker !== 'undefined' ) $( '#colorcancel' ).click();
		} else {
			$( '#button-settings' ).click();
		}
		return
	}
	
	if ( $( '#infoOverlay' ).css( 'display' ) === 'block' || !$( '#colorpicker' ).hasClass( 'hide' ) ) return
		
	var keyevent = {
		  AudioVolumeDown    : 'voldn'
		, AudioVolumeMute    : 'volmute'
		, AudioVolumeUp      : 'volup'
		, MediaNextTrack     : 'next'
		, MediaPause         : 'pause'
		, MediaPlay          : 'play'
		, MediaPreviousTrack : 'previous'
		, MediaStop          : 'stop'
		, MediaTrackPrevious : 'previous'
		, MediaTrackNext     : 'next'
	}
	if ( ( key === ' ' && e.target.localName !== 'input' ) || key === 'MediaPlayPause' ) {
		$( '#'+ ( G.status.state === 'play' ? 'pause' : 'play' ) ).click();
		e.preventDefault();
		return
		
	} else if ( key === 'Tab' ) {
		e.preventDefault();
		if ( G.library ) {
			$( '#tab-playback' ).click();
		} else if ( G.playback ) {
			$( '#tab-playlist' ).click();
		} else {
			$( '#tab-library' ).click();
		}
		return
		
	} else {
		$( '#'+ keyevent[ key ] ).click();
		if ( key.slice( 5 ) === 'Media' ) return
		
	}
	
	// context menu
	var $contextmenu = $( '.contextmenu:not( .hide )' );
	if ( !$contextmenu.length ) $contextmenu = $( '#settings:not( .hide )' );
	if ( $contextmenu.length ) {
		if ( G.library ) {
			var $liactive = $( '#lib-list li.active' );
		} else if ( G.playlist ) {
			if ( !G.savedlist ) {
				var $liactive = $( '#pl-list li.updn' );
				if ( !$liactive.length ) $liactive = $( '#pl-list li.active' );
			} else {
				var $liactive = $( '#pl-savedlist li.active' );
			}
		}
		var $menu = $contextmenu.find( 'a.active' );
		var $menuactive = $menu.length ? $menu : $contextmenu.find( '.submenu.active' ).parent();
		var $menufirst = $contextmenu.find( 'a:not( .hide )' ).first();
		var $menulast = $contextmenu.find( 'a:not( .hide )' ).last();
		if ( key === 'ArrowLeft' ) {
			if ( $( '.submenu.active' ).length ) {
				$menuactive.addClass( 'active' );
				$( '.submenu' ).removeClass( 'active' );
				return
			}
			
			$( '.menu' ).addClass( 'hide' )
			$menuactive.removeClass( 'active' );
			$( '.submenu' ).removeClass( 'active' );
		} else if ( key === 'ArrowRight' ) {
			var $submenu = $menuactive.find( '.submenu' );
			if ( $submenu.length ) {
				$menuactive.removeClass( 'active' );
				$submenu.addClass( 'active' );
			}
		} else if ( key === 'ArrowUp' || key === 'ArrowDown' ) {
			if ( !$menuactive.length ) {
				$menufirst.addClass( 'active' );
			} else {
				$menuactive.removeClass( 'active' );
				$( '.submenu' ).removeClass( 'active' );
				if ( key === 'ArrowDown' ) {
					if ( $menuactive.is( $menulast ) ) {
						$menufirst.addClass( 'active' );
					} else {
						$menuactive.nextAll( 'a' ).not( '.hide' ).first().addClass( 'active' );
					}
				} else {
					if ( $menuactive.is( $menufirst ) ) {
						$menulast.addClass( 'active' );
					} else {
						$menuactive.prevAll( 'a' ).not( '.hide' ).first().addClass( 'active' );
					}
				}
			}
		} else if ( key === 'Enter' ) {
			if ( $( '.menu:not(.hide)' ).length ) { // context menu
				$contextmenu.find( 'a.active' ).click();
				$contextmenu.find( '.submenu.active' ).click();
			}
		}
		return
	}
	
	if ( G.playback ) {
		if ( key === 'ArrowLeft' ) {
			$( '#previous' ).click();
		} else if ( key === 'ArrowRight' ) {
			$( '#next' ).click();
		} else if ( key === 'ArrowUp' ) {
			$( '#volup' ).click();
		} else if ( key === 'ArrowDown' ) {
			$( '#voldn' ).click();
		}
	} else if ( G.library ) {
		if ( !$( '#lib-search' ).hasClass( 'hide' ) ) return
		
		// home /////////////////////////////////////////
		if ( !$( '#lib-mode-list' ).hasClass( 'hide' ) ) {
			var $blupdn = $( '.lib-mode.updn' );
			if ( !$blupdn.length ) {
				$( '.lib-mode:not( .hide ):eq( 0 )' ).addClass( 'updn' );
				return
			}
			
			if ( key === 'ArrowLeft' ) {
				var $div = $( '.lib-mode.updn' ).prevAll( ':not( .hide )' ).first();
				$( '.lib-mode' ).removeClass( 'updn' );
				if ( !$div.length ) $div = $( '.lib-mode:not( .hide )' ).last();
				$div.addClass( 'updn' );
			} else if ( key === 'ArrowRight' ) {
				var $div = $( '.lib-mode.updn' ).nextAll( ':not( .hide )' ).first().addClass( 'updn' );
				$( '.lib-mode' ).removeClass( 'updn' );
				if ( !$div.length ) $div = $( '.lib-mode:not( .hide )' ).first();
				$div.addClass( 'updn' );
			} else if ( key === 'Enter' ) {
				$( '.lib-mode.updn .mode' ).tap();
			}
			return
		}
		
		// back button //////////////////////////////////
		if ( key === 'ArrowLeft' ) {
			$( '#button-lib-back' ).click();
			return
		} else if ( key === 'ArrowRight' ) {
			$( '#lib-list li.active .lib-icon' ).tap();
			return
		}
		
		// list ///////////////////////////////////////
		var $liactive = $( '#lib-list li.active' );
		if ( !$liactive.length ) {
			$( '#lib-list li:eq( 0 )' ).addClass( 'active' );
			setTimeout( function() {
				$( 'html, body' ).scrollTop( 0 );
			}, 300 );
			return
		}
		
		$( '#lib-list li' ).removeClass( 'active' );
		if ( key === 'ArrowUp' ) {
			$linext = $liactive.prev( 'li' );
			if ( $linext.length ) {
				$linext.addClass( 'active' );
				setTimeout( function() {
					var litop = $linext[ 0 ].getBoundingClientRect().top;
					var libottom = $linext[ 0 ].getBoundingClientRect().bottom;
					if ( libottom > window.innerHeight - 40 || litop < 80 ) $( 'html, body' ).scrollTop( $linext.offset().top - window.innerHeight + 89 );
				}, 300 );
			} else {
				var $lilast = $( '#lib-list li' ).last();
				$lilast.addClass( 'active' );
				$( 'html, body' ).scrollTop( $lilast.offset().top );
			}
		} else if ( key === 'ArrowDown' ) {
			$linext = $liactive.next( 'li' );
			if ( $linext.length ) {
				$linext.addClass( 'active' );
				setTimeout( function() {
					var litop = $linext[ 0 ].getBoundingClientRect().top;
					var libottom = $linext[ 0 ].getBoundingClientRect().bottom;
					if ( libottom > window.innerHeight - 40 )
					$( 'html, body' ).scrollTop( $linext.offset().top - 80 );
				}, 300 );
			} else {
				$( '#lib-list li:eq( 0 )' ).addClass( 'active' );
				$( 'html, body' ).scrollTop( 0 );
			}
		} else if ( key === 'Enter' ) {
			if ( $( '.licover' ).length || $( '#lib-list li.mode-webradio' ).length ) {
				if ( $( '.menu:not(.hide)' ).length ) { // context menu
					var menu = $liactive.find( '.lib-icon' ).data( 'target' );
					$( menu ).find( 'a:eq( 1 )' ).click();
				}
			} else {
				$liactive.tap();
			}
		}
		$( '.contextmenu' ).addClass( 'hide' );
	} else if ( G.playlist ) {
		if ( !G.savedlist ) {
			var $liupdn = $( '#pl-list li.updn' );
			if ( !$liupdn.length ) $liupdn = $( '#pl-list li.active' );
			if ( key === 'ArrowUp' ) {
				var $li = $liupdn.prev( 'li' );
				$( '#pl-list li' ).removeClass( 'updn' );
				if ( !$li.length ) $li = $( '#pl-list li' ).last();
				$li.addClass( 'updn' );
			} else if ( key === 'ArrowDown' ) {
				var $li = $liupdn.next( 'li' );
				$( '#pl-list li' ).removeClass( 'updn' );
				if ( !$li.length ) {
					$li = $( '#pl-list li' ).first();
					setTimeout( function() {
						$( 'html, body' ).scrollTop( 0 );
					}, 300 );
				}
				$li.addClass( 'updn' );
			} else if ( key === 'ArrowRight' ) {
				$( '#pl-list li.active' ).find( '.pl-icon' ).click();
				$( '#pl-list li.updn' ).find( '.pl-icon' ).click();
			} else if ( key === 'Enter' ) {
				$( '#pl-list li.updn' )
					.click()
					.removeClass( 'updn' );
			}
			return
		}
		// back button //////////////////////////////////////
		if ( key === 'ArrowLeft' ) {
			$( '.plsbackroot, .plsback' ).click();
			return
		} else if ( key === 'ArrowRight' ) {
			$( '#pl-savedlist li.active i' ).click();
			return
		}
		
		// saved playlist //////////////////////////////////
		var $liactive = $( '#pl-savedlist li.active' );
		if ( !$liactive.length ) {
			$( '#pl-savedlist li:eq( 0 )' ).addClass( 'active' );
			setTimeout( function() {
				$( 'html, body' ).scrollTop( 0 );
			}, 300 );
			return
		}
		
		if ( key === 'ArrowUp' ) {
			var $icon = $liactive.prev().find( 'i' );
			if ( !$icon.length ) $icon = $( '#pl-savedlist i' ).last();
			$icon.click();
		} else if ( key === 'ArrowDown' ) {
			var $icon = $liactive.next().find( 'i' );
			if ( !$icon.length ) {
				$icon = $( '#pl-savedlist i:eq( 0 )' );
				setTimeout( function() {
					$( 'html, body' ).scrollTop( 0 );
				}, 300 );
			}
			$icon.click();
		} else if ( key === 'Enter' ) {
			if ( !$( '#pl-savedlist li.pl-folder' ).length ) {
				if ( $( '.menu:not(.hide)' ).length ) { // context menu
					var menu = $liactive.find( 'i' ).data( 'target' );
					$( menu ).find( 'a:eq( 1 )' ).click();
				}
			} else {
				$liactive.click();
			}
		}
		$( '.contextmenu' ).addClass( 'hide' );
	}
} );
