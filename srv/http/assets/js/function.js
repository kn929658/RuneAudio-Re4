function bash( command, callback, json ) {
	if ( typeof command === 'string' ) {
		var args = { cmd: 'bash', bash : command }
	} else {
		var args = { cmd: 'sh', sh: [ 'cmd.sh' ].concat( command ) }
	}
	$.post( 
		  cmdphp
		, args
		, callback || null
		, json || null
	);
}
function list( args, callback, json ) {
	$.post(
		  ( 'cmd' in args  ? 'mpdplaylist.php' : 'mpdlibrary.php' )
		, args
		, callback || null
		, json || null
	);
}
//----------------------------------------------------------------------
function addonsdl( exit ) {
	if ( exit == 1 ) {
		info( {
			  icon    : 'info-circle'
			, message : 'Download from Addons server failed.'
					   +'<br>Please try again later.'
			, ok      : function() {
				$( '#loader' ).addClass( 'hide' );
			}
		} );
	} else if ( exit == 2 ) {
		info( {
			  icon    : 'info-circle'
			, message : 'Addons Menu cannot be updated.'
					   +'<br>Root partition has <wh>less than 1 MB free space</wh>.'
			, ok      : function() {
				location.href = 'addons.php';
			}
		} );
	} else {
		location.href = 'addons.php';
	}
}
function bookmarkThumbReplace( $this, newimg ) {
	var $img = $this.find( 'img' );
	if ( $img.length ) {
		$img.prop( 'src', newimg  );
	} else {
		$this.find( '.fa-bookmark' ).remove();
		$this.find( '.divbklabel' ).remove();
		$this.find( '.lipath' ).after( '<img class="bkcoverart" src="'+ newimg +'">' );
		$( '.mode-bookmark img' ).css( 'opacity', 0.33 );
	}
}
function clearIntervalAll() {
	clearInterval( G.intKnob );
	clearInterval( G.intElapsed );
	clearInterval( G.intElapsedPl );
}
function contextmenuLibrary( $li, $target ) {
	$( '.menu' ).addClass( 'hide' );
	var $menu = $( $li.find( '.lib-icon' ).data( 'target' ) );
	G.list = {};
	G.list.li = $li; // for contextmenu
	G.list.licover = $li.hasClass( 'licover' );
	G.list.singletrack = !G.list.licover && $li.find( '.lib-icon' ).hasClass( 'fa-music' );
	G.list.path = $li.find( '.lipath' ).text() || '';
	if ( G.playlist ) {
		G.list.name = $li.find( '.liname' ).text() || '';
		G.list.artist = $li.find( '.liartist' ).text() || '';
	} else if ( $( '.licover' ).length && !$li.hasClass( 'licover' ) ) {
		G.list.name = $li.find( '.li1' ).html().replace( /<span.*/, '' ) || '';
		G.list.artist = $( '.licover .liartist' ).text() || '';
	} else {
		G.list.name = $li.find( '.li1' ).html();
	}
	G.list.track = $li.data( 'track' ) || '';  // cue - in contextmenu
	if ( ( G.display.tapaddplay || G.display.tapreplaceplay )
		&& !$target.hasClass( 'lib-icon' )
		&& !$li.hasClass( 'licover' )
	) {
		var i = G.display.tapaddplay ? 0 : 1;
		$menu.find( 'a:eq( '+ i +' ) .submenu' ).click();
		$li.addClass( 'active' );
		return
	}
	
	$( '.replace' ).toggleClass( 'hide', !G.status.playlistlength );
	$( '.refresh-library' ).toggleClass( 'hide', G.status.updating_db );
	$( '.tag' ).addClass( 'hide' );
	if ( $( '.licover' ).length ) $( '.tag' ).removeClass( 'hide' );
	$li.addClass( 'active' );
	if ( G.list.licover ) {
		var menutop = G.bars ? '310px' : '270px';
	} else {
		var menutop = ( $li.offset().top + 48 ) +'px';
	}
	$menu
		.css( 'top',  menutop )
		.removeClass( 'hide' );
	$menu.find( '.menushadow' ).css( 'height', $menu.height() +'px' );
	$menu.toggleClass( 'fixed', G.list.licover && $li.css( 'position' ) === 'fixed' );
	var targetB = $menu.offset().top + $menu.height();
	var wH = window.innerHeight;
	if ( targetB > wH - ( G.bars ? 80 : 40 ) + $( window ).scrollTop() ) $( 'html, body' ).animate( { scrollTop: targetB - wH + 42 } );
}
function colorSet() {
	$( '#lib-list li:eq( 1 )' ).tap();
	$( '.licover' ).toggleClass( 'hide', window.innerHeight < 590 );
	colorpicker = new KellyColorPicker( {
		  place  : 'canvascolor'
		, size   : 230
		, color  : $( '#button-library' ).css( 'background-color' )
		, userEvents : {
			change : function( e ) {
				var hex = e.getCurColorHex();
				var h = Math.round( 360 * e.getCurColorHsv().h );
				var hsg = 'hsl('+ h +',3%,';
				$( '#bar-top, #playback-controls i, #tab-playlist, .menu a, .submenu, #colorcancel' ).css( 'background-color', hsg +'30%)' );
				$( '.content-top, #tab-playback' ).css( 'background', hsg +'20%)' );
				$( '.licover i, .lidir, .lib-icon, gr' ).css( 'cssText', 'color: '+ hsg +'60%) !important;' );
				$( '#lib-list li.active i, #lib-list li.active .time, #lib-list li.active .li2' ).css( 'color', hsg +'30%)' );
				$( '.menu a' ).css( 'border-top', '1px solid '+ hsg +'20%)' );
				$( '#lib-list li' ).css( 'border-bottom', '1px solid '+ hsg +'20%)' );
				$( '#playback-controls .active, #tab-library, #button-library, #lib-list li.active, #colorok' ).css( 'background-color', hex );
				$( '#button-lib-back, .lialbum' ).css( 'color', hex );
				$( '.logo path.st0' ).css( 'fill', hex )
			}
		}
	} );
	$( '#colorpicker' ).removeClass( 'hide' );
	$( 'body' ).addClass( 'disablescroll' );
}
function coverartChange() {
	if ( G.playback ) {
		var src = $( '#coverart' ).prop( 'src' );
		var path = G.status.file.substr( 0, G.status.file.lastIndexOf( '/' ) );
		var album = G.status.Album;
		var artist = G.status.Artist;
	} else {
		var src = $( '.licoverimg img' ).prop( 'src' );
		var path = $( '.licover .lipath' ).text();
		if ( path.split( '.' ).pop() === 'cue' ) path = path.substr( 0, path.lastIndexOf( '/' ) );
		var album = $( '.licover .lialbum' ).text();
		var artist = $( '.licover .liartist' ).text();
	}
	var covername = src.split( '/' ).pop();
	if ( covername.slice( 0, 10 ) === 'data:image' ) { // not yet reload page after replace - still base64
		var ext = covarname.split( ';' ) === 'data:image/jpeg' ? '.jpg' : '.gif';
		covername = 'cover'+ ext;
	}
	var list = covername.split( '.' );
	covername = list[ 0 ] +'.'+ list[ 2 ];
	var jsoninfo = {
		  icon        : 'coverart'
		, title       : 'Change Album CoverArt'
		, message     : '<img class="imgold" src="'+ src +'">'
					   +'<p class="imgname"><w>'+ album +'</w>'
					   +'<br>'+ artist +'</p>'
		, filelabel   : '<i class="fa fa-folder-open"></i>Browse'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, ok          : function() {
			var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
			var imgnew = $( '#imgnew' ).prop( 'src' );
			if ( file.name.slice( -4 ) !== '.gif' ) {
				$.post( cmdphp, {
					  cmd       : 'imagefile'
					, imagefile : '/mnt/MPD/'+ path +'/cover.jpg'
					, srcfile   : '/mnt/MPD/'+ path +'/'+ covername
					, base64    : imgnew
					, coverfile : 1
				}, function( std ) {
					coverartSuccess( 'Replace', imgnew, std );
				} );
			} else {
				var formData = new FormData();
				formData.append( 'cmd', 'imagefile' );
				formData.append( 'imagefile', '/mnt/MPD/'+ path +'/cover.gif' );
				formData.append( 'srcfile', '/mnt/MPD/'+ path +'/'+ covername );
				formData.append( 'file', file );
				$.ajax( {
					  url         : cmdphp
					, type        : 'POST'
					, data        : formData
					, processData : false  // no - process the data
					, contentType : false  // no - contentType
					, success     : function( std ) {
						coverartSuccess( 'Replace', imgnew, std );
					}
				} );
			}
		}
	}
	if ( G.playback ) {
		var pbembedded = $( '#coverart' ).prop( 'src' ).split( '/' )[ 3 ] === 'data';
		var pbonlinefetched = $( '#divcover .cover-save' ).length;
		var pbcoverrune = $( '#coverart' ).prop( 'src' ).slice( -3 ) === 'svg';
	} else {
		var liembedded = $( '.licoverimg img' ).prop( 'src' ).split( '/' )[ 3 ] === 'data';
		var lionlinefetched = $( '.liedit.cover-save' ).length;
		var licoverrune = $( '.licoverimg img' ).prop( 'src' ).slice( -3 ) === 'svg';
	}
	if ( ( G.playback && !pbembedded && !pbonlinefetched && !pbcoverrune )
		|| ( G.library && !liembedded && !lionlinefetched && !licoverrune )
	) {
		jsoninfo.buttonlabel = '<i class="fa fa-minus-circle"></i>Remove';
		jsoninfo.buttoncolor = '#bb2828';
		jsoninfo.buttonwidth = 1;
		jsoninfo.button      = function() {
			$.post( cmdphp, {
				  cmd       : 'imagefile'
				, imagefile : '/mnt/MPD/'+ path
				, srcfile   : '/mnt/MPD/'+ path +'/'+ covername
				, remove    : 1
			}, function( src ) {
				coverartSuccess( '', src, 0 );
			} );
		}
	}
	if ( ( G.playback && pbembedded ) || ( G.library && liembedded ) ) jsoninfo.footer = '<i class="fa fa-coverart"></i>&ensp;embedded';
	info( jsoninfo );
}
function coverartGet( artist, album, type ) {
	$.post(
		  cmdphp
		, { cmd: 'sh', sh: [ 'cmd-coverartfetch.sh', artist, album, type ] }
		, function( url ) {
			if ( type === 'licover' && url.trim() ) { // for library tracks view
				$( '.licoverimg img' )
					.prop( 'src', url )
					.on( 'load', function() {
						$( '.liinfo' ).css( 'width', ( window.innerWidth - $( this ).width() - 50 ) +'px' );
						if ( url.slice( 0, 4 ) === 'http' ) $( '.licoverimg img' ).after( '<div class="liedit cover-save"><i class="fa fa-save"></i></div>' );
					} );
			}
		}
	);
}
function coverartSave() {
	var img = new Image();
	img.crossOrigin = 'anonymous';
	img.src = $( '#coverart' ).prop( 'src' );
	img.onload = function() {
		var canvas = document.createElement( 'canvas' );
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.getContext( '2d' ).drawImage( this, 0, 0 );
		base64 = canvas.toDataURL( 'image/jpeg' );
	}
	if ( G.playback ) {
		var src = $( '#coverart' ).prop( 'src' );
		var file = G.status.file;
		var path = '/mnt/MPD/'+ file.substr( 0, file.lastIndexOf( '/' ) );
		var coverfile = path +'/cover.jpg';
		var artist = G.status.Artist;
		var album = G.status.Album;
	} else {
		var src = $( '.licover img' ).prop( 'src' );
		var path = '/mnt/MPD/'+ $( '.licover .lipath' ).text();
		if ( path.slice( -4 ) === '.cue' ) path = path.substr( 0, path.lastIndexOf( '/' ) );
		var coverfile = path +'/cover.jpg';
		var artist = $( '.licover .liartist' ).text();
		var album = $( '.licover .lialbum' ).text();
	}
	info( {
		  icon    : 'coverart'
		, title   : 'Save Album CoverArt'
		, message : '<img src="'+ src +'">'
					   +'<p class="imgname"><w>'+ album +'</w>'
					   +'<br>'+ artist +'</p>'
		, ok      : function() { 
			$.post( cmdphp, {
				  cmd       : 'imagefile'
				, imagefile : coverfile
				, base64    : base64
			}, function( std ) {
				coverartSuccess( 'Save', src, std );
				$( '.cover-save' ).remove();
			} );
		}
	} );
}
function coverartSuccess( title, src, std ) {
	$( '.edit' ).remove();
	$( '#coverart, .licoverimg img' ).css( 'opacity', '' );
	if ( std == 13 ) {
		info( {
			  icon    : 'coverart'
			, title   : '<i class="fa fa-warning fa-lg"></i>&ensp;'+ title +' Album CoverArt'
			, message : 'Save file denied.'
					   +'<br>Set directory+file <w>permission</w> and try again.'
		} );
	} else if ( std == -1 ) {
		info( {
			  icon    : 'coverart'
			, title   : title +' Album CoverArt'
			, message : '<i class="fa fa-warning fa-lg"></i>&ensp;Upload image failed.'
		} );
	} else {
		if ( title === 'Save' ) {
			notify( 'Album Coverart', 'Saved.', 'coverart' );
		} else {
			var currentpath = G.status.file.substr( 0, G.status.file.lastIndexOf( '/' ) );
			var licoverpath = $( '.licover .lipath' ).text();
			if ( currentpath === licoverpath ) {
				var $img = $( '#coverart, .licoverimg img' );
			} else {
				var $img = G.playback ? $( '#coverart' ) : $( '.licoverimg img' );
			}
			$img.prop( 'src', src || coverrune );
			getPlaybackStatus();
		}
	}
}
function cssKeyframes( name, trx0, trx100 ) {
	var moz = '-moz-'+ trx0;
	var moz100 = '-moz-'+ trx100;
	var webkit = '-webkit-'+ trx0;
	var webkit100 = '-webkit-'+ trx100;
	$( 'head' ).append(
		 '<style id="'+ name +'">'
			+'@-moz-keyframes '+    name +' { 0% { '+ moz +' }    100% { '+ moz100 +' } }'
			+'@-webkit-keyframes '+ name +' { 0% { '+ webkit +' } 100% { '+ webkit100 +' } }'
			+'@keyframes '+         name +' { 0% { '+ trx0 +'}    100% { '+ trx100 +'} }'
		+'</style>'
	);
}
function curl( channel, key, value ) {
	return 'curl -s -X POST http://127.0.0.1/pub?id='+ channel +' -d \'{ "'+ key +'": "'+ value +'" }\''
}
function curlPackage( pkg, active, enabled ) {
	return 'curl -s -X POST http://127.0.0.1/pub?id=package -d \'[ "'+ pkg +'", '+ active +', '+ enabled +' ]\''
}
function disableCheckbox( name, enable, check ) {
	$( 'input[name="'+ name +'"]' )
		.prop( 'disabled', !enable )
		.prop( 'checked', check )
		.parent().toggleClass( 'gr', !enable );
}
function displayCheckbox( checkboxes ) {
	var html = '';
	var col,br;
	$.each( checkboxes, function( key, val ) {
		if ( val[ 0 ] === '_' ) {
			col = ' class="infocol"';
			br = '';
			val = val.slice( 1 );
		} else if ( key === 'hr' ) {
			html += val;
			return
		} else {
			col = '';
			br = '<br>';
		}
		html += '<label'+ col +'><input name="'+ key +'" type="checkbox" '+ ( G.display[ key ] ? 'checked' : '' ) +'>&ensp;'+ val +'</label>'+ br;
	} );
	return html;
}
function displayPlayback() {
	$( '#time-knob' ).toggleClass( 'hide', !G.display.time );
	$( '#coverart-block' )
		.toggleClass( 'hide', !G.display.cover )
		.toggleClass( 'coversmall', G.display.coversmall );
	$( '#coverart' ).css( 'width', G.display.coversmall ? '230px' : '' );
	var volume = ( G.display.volumenone || !G.display.volume ) ? 0 : 1;
	$( '#volume-knob' ).toggleClass( 'hide', volume === 0 );
	var column = ( G.display.time ? 1 : 0 ) + ( G.display.cover ? 1 : 0 ) + volume;
	var $elements = $( '#time-knob, #coverart-block, #volume-knob, #play-group, #vol-group' );
	if ( column === 2 ) {
		$elements.css( 'width', '' );
		$( '#coverart-block' ).addClass( 'coverlarge' );
		$( '#time-knob, #volume-knob, #play-group, #vol-group' ).addClass( 'knobsmall' );
		$( '#time-knob' ).css( 'margin-right', '20px' );
		$( '#volume-knob' ).css( 'margin-left', '20px' );
	} else {
		$elements.css( 'width', column === 1 ? '100%' : '' );
		$( '#playback-row' ).css( 'max-width', '' );
		$( '#coverart-block' ).removeClass( 'coverlarge' );
		$( '#time-knob, #volume-knob, #play-group, #vol-group' ).removeClass( 'knobsmall' );
		$( '#time-knob' ).css( 'margin-right', '' );
		$( '#volume-knob' ).css( 'margin-left', '' );
	}
	$( '#play-group, #vol-group' ).toggleClass( 'hide', !G.status.mpd || !G.display.buttons );
	if ( G.display.time ) {
		$( '#time' ).roundSlider( G.status.webradio || !G.status.mpd ? 'disable' : 'enable' );
		$( '#time-bar, #time-band' ).addClass( 'hide' );
		$( '#progress' ).empty();
	} else {
		$( '#time-bar, #time-band' ).toggleClass( 'hide', !G.display.progressbar || G.status.webradio );
	}
	$( '.volumeband' ).toggleClass( 'hide', G.display.volume );
	$( '#time, #volume, .timemap, .covermap, .volmap, .volumeband' ).toggleClass( 'disabled', !G.status.mpd );
	$( '.covermap.r1, #coverB' ).removeClass( 'disabled' );
	$( '#timemap' ).toggleClass( 'hide', G.display.cover );
	displayTopBottom();
}
function displayGet( callback ) {
	$.post( cmdphp, { cmd: 'displayget' }, function( data ) {
		callback( data );
	}, 'json' );
}
function displaySave( page, thumbbyartist ) {
	$( '#displaysave'+ page +' input' ).each( function() {
		G.display[ this.name ] = $( this ).prop( 'checked' );
	} );
	var display = G.display;
	[ 'color', 'order', 'updating_db', 'update', 'volumenone' ].forEach( function( el ) {
		delete display[ el ];
	} );
	G.local = 1;
	setTimeout( function() { G.local = 0 }, 300 );
	$.post( cmdphp, {
		  cmd        : 'displayset'
		, displayset : JSON.stringify( display )
	}, function() {
		if ( page === 'library' && G.display.thumbbyartist !== thumbbyartist ) location.reload();
	} );
}
function displayTopBottom() {
	if ( !$( '#bio' ).hasClass( 'hide' ) ) return
	
	if ( !G.display.bars || ( G.screenS && !G.display.barsalways ) ) {
		G.bars = false;
		$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
		$( '#page-playback' ).addClass ( 'barshidden' );
		$( '#page-playback, #infoicon' ).removeClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).addClass( 'bars-off' );
		$( '.content-top' ).css( 'top', 0 );
		$( '.emptyadd' ).css( 'top', '90px' );
	} else {
		G.bars = true;
		$( '#bar-top, #bar-bottom' ).removeClass( 'hide' );
		$( '#page-playback' ).removeClass ( 'barshidden' );
		$( '#page-playback, #infoicon' ).addClass( 'barsalways' );
		$( '.list, #lib-index, #pl-index' ).removeClass( 'bars-off' );
		$( '.content-top' ).css( 'top', '40px' );
		$( '.emptyadd' ).css( 'top', '' );
		if ( G.status.mpd ) {
			$( '#tab-library, #tab-playlist, #swipeL, #swipeR' ).removeClass( 'hide' );
			$( '#tab-playback' )
				.css( 'width', '' )
				.removeAttr( 'class' )
				.addClass( 'fa fa-play-circle' );
			var page = G.playback ? 'playback' : ( G.library ? 'library' : 'playlist' );
			$( '#tab-'+ page ).addClass( 'active' );
		} else {
			var icon;
			[ 'airplay', 'snapclient', 'spotify', 'upnp' ].some( function( el ) {
				icon = el;
				return G.status[ el ]
			} );
			$( '#tab-playback' )
				.css( 'width', '100%' )
				.removeAttr( 'class' )
				.addClass( 'active fa fa-'+ icon );
			$( '#tab-library, #tab-playlist, #swipeL, #swipeR' ).addClass( 'hide' );
		}
	}
	$( '.menu' ).addClass( 'hide' );
}
/*function flag( iso ) { // from: https://stackoverflow.com/a/11119265
	var iso0 = ( iso.toLowerCase().charCodeAt( 0 ) - 97 ) * -15;
	var iso1 = ( iso.toLowerCase().charCodeAt( 1 ) - 97 ) * -20;
	return iso1 +'px '+ iso0 +'px';
}*/
function getBio( artist ) {
	if ( artist === $( '#biocontent .artist' ).text() ) {
		$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
		$( '#bio' )
			.scrollTop( 0 )
			.removeClass( 'hide' );
		return
	}
	
	setTimeout( function() { // suppress hide by info
		$( '#loader' ).removeClass( 'hide' );
	}, 0 );
	var url = 'http://ws.audioscrobbler.com/2.0/'
			+'?autocorrect=1'
			+'&format=json'
			+'&method=artist.getinfo'
			+'&api_key='+ G.apikeylastfm
			+'&artist='+ encodeURI( artist )
	$.post( url, function( data ) {
		if ( 'error' in data || ( !data.artist.bio.content ) ) {
			info( {
				  icon    : 'bio'
				, title   : 'Bio'
				, message : 'No data available.'
			} );
			return
		}
		
		var data = data.artist;
		var content = data.bio.content.replace( /\n/g, '<br>' ).replace( /Read more on Last.fm.*/, '</a>' );
		var genre = data.tags.tag[ 0 ].name;
		if ( genre ) genre = '<p class="genre"><i class="fa fa-genre fa-lg"></i>&ensp;'+ genre +'</p>';
		var similar =  data.similar.artist;
		if ( similar ) {
			similars = '<p><i class="fa fa-artist fa-lg"></i>&ensp;Similar Artists:<p><span>';
			similar.forEach( function( artist ) {
				similars += '<a class="biosimilar">'+ artist.name +'</a>,&ensp;';
			} );
			similars = similars.slice( 0, -7 ) +'</span><br><br>';
		}
		var html = '<p class="artist">'+ artist +'<i class="closebio fa fa-times close-root"></i></p>'
				+ genre
				+ similars
				+'<p>'+ content +'</p>'
				+'<div style="clear: both;"></div>'
				+'<br><br>'
				+'<p id="biosource">'
					+'<gr>Text:</gr> <a href="https://www.last.fm">last.fm</a>&emsp;'
					+'<gr>Image:</gr> <a href="https://www.fanart.tv">fanart.tv</a></p>';
		$( '#biocontent' ).html( html ).promise().done( function() {
			$( '#bar-top, #bar-bottom, #loader' ).addClass( 'hide' );
			$( '#bio' )
				.scrollTop( 0 )
				.removeClass( 'hide' );
			$( '#biobanner' ).removeAttr( 'src' );
			$( '#bioimg' ).empty();

			$.get( 'https://webservice.fanart.tv/v3/music/'+ data.mbid +'?api_key='+ G.apikeyfanart, function( data ) {
				if ( 'musicbanner' in data && data.musicbanner[ 0 ].url ) $( '#biobanner' ).prop( 'src', data.musicbanner[ 0 ].url );
				if ( 'artistthumb' in data && data.artistthumb[ 0 ].url ) {
					var thumbs = data.artistthumb;
					var images = '';
					thumbs.forEach( function( el ) {
						images += '<a href="'+ el.url +'" target="_blank"><img src="'+ el.url.replace( '/fanart/', '/preview/' )  +'"></a>';
					} );
					$( '#bioimg' ).html( images );
				}
			} );
		} );
	} );
}
function getOrientation( file, callback ) { // return: 1 - undefined
	var reader = new FileReader();
	reader.onload = function( e ) {
		var view = new DataView( e.target.result );
		if ( view.getUint16( 0, false ) != 0xFFD8 ) return callback( 1 ); // not jpeg
		
		var length = view.byteLength, offset = 2;
		while ( offset < length ) {
			if ( view.getUint16( offset + 2, false ) <= 8 ) return callback( 1 );
			
			var marker = view.getUint16( offset, false );
			offset += 2;
			if ( marker == 0xFFE1 ) {
				if ( view.getUint32( offset += 2, false ) != 0x45786966 ) return callback( 1 );
				
				var little = view.getUint16( offset += 6, false ) == 0x4949;
				offset += view.getUint32( offset + 4, little );
				var tags = view.getUint16( offset, little );
				offset += 2;
				for ( var i = 0; i < tags; i++ ) {
					if ( view.getUint16( offset + ( i * 12 ), little ) == 0x0112 ) {
						var ori = view.getUint16( offset + ( i * 12 ) + 8, little );
						return callback( ori );
					}
				}
			} else if ( ( marker & 0xFF00 ) != 0xFF00 ) {
				break;
			} else { 
				offset += view.getUint16( offset, false );
			}
		}
		return callback( 1 );
	};
	reader.readAsArrayBuffer( file.slice( 0, 64 * 1024 ) );
}
function getPlaybackStatus() {
	if ( G.status.librandom && G.playlist && !G.savedlist && G.status.mpd ) {
		list( { cmd: 'current' }, renderPlaylist, 'json' );
	}
	G.local = 1;
	setTimeout( function() { G.local = 0 }, 300 );
	bash( '/srv/http/bash/status.sh', function( status ) {
		if ( !status ) return
		
		$.each( status, function( key, value ) {
			G.status[ key ] = value;
		} );
		if ( G.status.snapclient ) {
			bash( 'sshpass -p '+ status.snapserverpw +' ssh -q root@'+ status.snapserverip +' /srv/http/bash/status.sh', function( status ) {
				$.each( status, function( key, value ) {
					G.status[ key ] = value;
				} );
				G.status.sampling = '16 bit 48 kHz 1.54 Mbit/s &bull; Snapcast';
				renderPlayback();
				setButtonControl();
				displayPlayback();
			}, 'json' );
		} else {
			G.plreplace = 0;
			setButtonControl();
			if ( G.playback ) {
				renderPlayback();
				displayPlayback();
			} else if ( G.library ) {
				renderPlayback();
			} else if ( G.playlist && !G.savedlist && !G.savedplaylist ) {
				setPlaylistScroll();
			}
		}
	}, 'json' );
}
function getPlaylist() {
	list( { cmd: 'current' }, renderPlaylist, 'json' );
}
function getTitleWidth() {
	var $liactive = $( '#pl-list li.active' ); 
	var $title = G.status.webradio ? $liactive.find( '.song' ) : $liactive.find( '.name' );
	plwW = $( window ).width();
	$title.css( {
		  'max-width' : 'none'
		, visibility  : 'hidden'
	} );
	pltW = $title.width();
	$title.removeAttr( 'style' );
}
function gpioCountdown( i, iL, delays ) {
	setTimeout( function() {
		$( '#device'+ i ).toggleClass( 'gr' );
		i++;
		i < iL ? gpioCountdown( i, iL, delays ) : setTimeout( infoReset, 1000 );
	}, delays[ i ] * 1000 );
	
}
function hideGuide() {
	G.guide = false;
	$( '.map' ).removeClass( 'mapshow' );
	$( '.band, #swipebar' ).addClass( 'transparent' );
	if ( !G.display.progressbar ) $( '#timebar' ).addClass( 'hide' );
	$( '#volume-bar, #volume-text' ).addClass( 'hide' );
	$( '.cover-save' ).css( 'z-index', '' );
}
function HMS2Second( HMS ) {
	var hhmmss = HMS.split( ':' ).reverse();
	if ( !hhmmss[ 1 ] ) return +hhmmss[ 0 ];
	if ( !hhmmss[ 2 ] ) return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60;
	return +hhmmss[ 0 ] + hhmmss[ 1 ] * 60 + hhmmss[ 2 ] * 3600;
}
function imgError( image ) {
	image.onerror = '';
	image.src = coverrune;
	return true;
}
function infoCoverartScan( path ) {
	if ( !G.librarylist ) {
		if ( !$( '#lib-cover-list' ).html() ) {
			var albumcount = Number( $( '#mode-album grl' ).text().replace( /,/g, '' ) );
			var time = ( albumcount > 60 ? '<br>( ±'+ Math.ceil( albumcount / 60 ) +' minutes for '+ albumcount +' albums)<br>&nbsp;' : '' )
		}
		var message = 'Find coverarts and create thumbnails.'
				   + time;
	} else {
		var message = 'Update thumbnails in:'
					+'<br><w>'+ path.replace( /\\/g, '' ) +'</w>'
					+'<br>&nbsp;'
	}
	info( {
		  icon     : 'coverart'
		, title    : 'CoverArt Thumbnails'
		, message  : message
		, checkbox : {
			  'Update Library database'         : 1
			, 'Replace existings'               : 1
			, 'Rebuild entire thumbnails'       : 1
			, 'Copy embedded to external files' : 1
		}
		, footer   : '<px30/>(Copy: write permission needed)'
		, preshow  : function() {
			if ( time ) $( '#infoCheckBox label:eq( 1 ), #infoCheckBox label:eq( 2 )' ).hide().prev().hide();
			if ( G.librarylist ) $( '#infoCheckBox label:eq( 2 )' ).hide().prev().hide();
			$( '#infoCheckBox input:eq( 3 )' ).prop( 'checked', 1 );
		}
		, ok       : function() {
			var opt = [ 'cove', 'Update', 'master', path ];
			$( '#infoCheckBox input' ).each( function() {
				opt.push( $( this ).prop( 'checked' ) );
			} );
			var form = '<form id="formtemp" action="addons-terminal.php" method="post">';
			var optL = opt.length;
			for ( i = 0; i < optL; i++ ) {
				form += '<input type="hidden" name="sh[]" value="'+ opt[ i ] +'">'
			}
			form += '</form>';
			$( 'body' ).append( form );
			$( '#formtemp' ).submit();
		}
	} );
}
function infoNoData() {
	$( '#loader' ).addClass( 'hide' );
	var keyword = $( '#lib-search-input' ).val();
	var message = !keyword
					? 'No data in this location.'
						 +'<br>Update for changes then try again:'
						 +'<br>Settings > MPD | <i class="fa fa-refresh-library wh"></i>'
					: 'Nothing found for <wh>'+ keyword +'</wh>';
	info( {
		  icon      : 'library'
		, title     : 'Library Database'
		, message   : message
		, autoclose : 10000
	} );
}
function menuPackage( $this, $target ) {
	var id = $this.prop( 'id' );
	var title = id.charAt( 0 ).toUpperCase() + id.slice( 1 );
	var active = $this.data( 'active' );
	var icon = '<img src="'+ $( '#'+ id +' img' ).prop( 'src' ) +'" class="iconimg">';
	if ( $target.hasClass( 'submenu' ) ) {
		info( {
			  icon        : icon
			, title       : title
			, checkbox    : { 'Enable on startup': 1 }
			, checked     : [ $this.data( 'enabled' ) ? 0 : 1 ]
			, buttonlabel : '<i class="fa fa-stop"></i>Stop'
			, buttoncolor : '#bb2828'
			, button      : function() {
				var active = 0;
				var enabled = $( '#infoCheckBox input' ).prop( 'checked' ) ? 1 : 0;
				menuPackageSet( id, active, enabled );
				notify( title, 'Stop ...', icon );
			}
			, ok          : function() {
				var active = $this.data( 'active' );
				var enabled = $( '#infoCheckBox input' ).prop( 'checked' ) ? 1 : 0;
				menuPackageSet( id, active, enabled );
			}
			, preshow     : function() {
				if ( !active ) $( '#infoButton' ).hide();
			}
		} );
	} else {
		$( '#settings' ).addClass( 'hide' );
		var url = {
			  aria2        : '/aria2/index.html'
			, transmission : 'http://'+ location.hostname +':9091'
		}
		if ( $this.data( 'active' ) ) {
			window.open( url[ id ] );
		} else {
			bash( [ 'packageenable', id, $this.data( 'enabled' ) ], window.open( url[ id ] ) );
		}
	}
}
function menuPackageSet( pkg, active, enable ) {
	G.local = 1;
	setTimeout( function() { G.local = 0 }, 1000 );
	bash( [ 'packageset', pkg, active, enable ] );
	$( '#'+ pkg )
		.data( 'enabled', enable )
		.data( 'active', active )
		.find( 'img' ).toggleClass( 'on', active );
}
function mpdSeek( seekto ) {
	var seektime = Math.round( seekto / 1000 * G.status.Time );
	if ( G.display.time ) {
		G.status.elapsed = seektime;
		elapsed = seektime;
		position = seekto;
		var elapsedhms = second2HMS( seektime );
		var timehms = second2HMS( G.status.Time );
		$( '#time' ).roundSlider( 'setValue', position );
		$( '#elapsed' ).html( elapsedhms );
		$( '#total' ).text( timehms );
	}
	if ( G.status.state === 'play' ) {
		bash( 'mpc seek '+ seektime );
	} else {
		if ( G.bars ) {
			$( '#playback-controls i' ).removeClass( 'active' );
			$( '#pause' ).addClass( 'active' );
			$( '#song' ).addClass( 'gr' );
		}
		G.local = 1;
		setTimeout( function() { G.local = 0 }, 600 );
		bash( [ 'playseek', seektime ] );
	}
}
function mpdSeekBar( pageX, set ) {
	var $timeband = $( '#time-band' );
	var posX = pageX - $timeband.offset().left;
	var bandW = $timeband.width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var pos = posX / bandW;
	var position = Math.round( pos * 1000 );
	var elapsedhms = second2HMS( Math.round( pos * G.status.Time ) );
	if ( G.status.state === 'pause' ) elapsedhms = '<bl>'+ elapsedhms +'</bl>';
	var timehms = second2HMS( Math.round( G.status.Time ) );
	$( '#progress' ).html( '<i class="fa fa-'+ G.status.state +'"></i><w>'+ elapsedhms +'</w> / '+ timehms );
	$( '#time-bar' ).css( 'width', ( position / 10 ) +'%' );
	if ( set ) mpdSeek( position );
}
function muteColor( volumemute ) {
	$volumetooltip
		.text( volumemute )
		.addClass( 'bl' )
//		.css( 'margin-left', '-23px' ); // fix - posistion
	$volumehandle.addClass( 'bgr' );
	$( '#volmute' ).addClass( 'active' )
		.find( 'i' ).removeClass( 'fa-volume' ).addClass( 'fa-mute' );
}
function orderLibrary() {
	if ( G.display.order ) {
		$.each( G.display.order, function( i, name ) {
			var $libmode = $( '.lib-mode' ).filter( function() {
				return $( this ).find( '.lipath' ).text() === name;
			} );
			$libmode.detach();
			$( '#lib-mode-list' ).append( $libmode );
		} );
	}
}
function playlistInsert( indextarget ) {
	var plname = $( '#pl-path .lipath' ).text();
	list( {
		  cmd         : 'edit'
		, name        : plname
		, index       : G.pladd.index
		, indextarget : indextarget
	}, function() {
		renderSavedPlaylist( plname );
		if ( G.pladd.select === 'last' ) {
			setTimeout( function() {
				$( 'html, body' ).animate( { scrollTop: ( $( '#pl-savedlist li' ).length - 3 ) * 49 } );
			}, 300 );
		}
		G.pladd = {};
	} );
}
function playlistInsertSelect( $this ) {
	info( {
		  icon        : 'list-ul'
		, title       : 'Add to playlist'
		, message     : 'Insert'
				   +'<br><w>'+ G.pladd.name +'</w>'
				   +'<br>before'
				   +'<br><w>'+ $this.find( '.name' ).text() +'</w>'
		, buttonlabel : 'i class="fa fa-undo"></i>Reselect'
		, button  : function() {
			playlistInsertTarget();
		}
		, cancel      : function() {
			G.plappend = {};
		}
		, ok          : function() {
			playlistInsert( $this.index() )
		}
	} );
}
function playlistInsertTarget() {
	info( {
		  icon    : 'list-ul'
		, title   : 'Add to playlist'
		, message : 'Select where to add:'
				   +'<br><w>'+ G.list.name +'</w>'
		, radio   : { First : 'first', Select: 'select', Last: 'last' }
		, cancel  : function() {
			G.pladd = {};
		}
		, ok      : function() {
			var target = $( '#infoRadio input:checked' ).val();
			G.pladd.select = target;
			if ( target !== 'select' ) {
				playlistInsert( target );
			}
		}
	} );
}
function playlistFilter() {
	var keyword = $( '#pl-search-input' ).val();
	var regex = new RegExp( keyword, 'i' );
	var count = 0;
	$( '#pl-list li' ).each( function() {
		var $this = $( this );
		var match = ( $this.text().search( regex ) !== -1 ) ? 1 : 0;
		count = match ? ( count + 1 ) : count;
		$this.toggleClass( 'hide', !match );
		if ( !$this.hasClass( 'hide' ) ) {
			var name = $this.find( '.name' ).text().replace( regex, function( match ) { return '<bl>'+ match +'</bl>' } );
			var li2 = $this.find( '.li2' ).text().replace( regex, function( match ) { return '<bl>'+ match +'</bl>' } );
			$this.find( '.name' ).html( name );
			$this.find( '.li2' ).html( li2 );
		}
	} );
	$( 'html, body' ).scrollTop( 0 );
	if ( keyword ) {
		$( '#pl-search-close' ).html( '<i class="fa fa-times"></i><span>'+ count +' <grl>of</grl> </span>' );
	} else {
		$( '#pl-search-close' ).empty();
	}
}
function playlistProgress() {
	clearInterval( G.intElapsedPl );
	var $this = $( '#pl-list li.active' );
	var $elapsed = $this.find( '.elapsed' );
	var $name = $this.find( '.name' );
	var $song = $this.find( '.song' );
	var webradio = $this.find( '.fa-webradio' ).length;
	var slash = webradio ? '' : ' <gr>/</gr>';
	$( '.li1 .radioname' ).removeClass( 'hide' );
	$( '.li2 .radioname' ).addClass( 'hide' );
	if ( G.status.state === 'pause' ) {
		elapsedtxt = second2HMS( G.status.elapsed );
		$elapsed.html( '<i class="fa fa-pause"></i>'+ elapsedtxt + slash );
		getTitleWidth();
		setTitleWidth();
	} else if ( G.status.state === 'play' ) {
		$this.find( '.li1 .radioname' ).addClass( 'hide' );
		$this.find( '.li2 .radioname' ).removeClass( 'hide' );
		if ( webradio ) {
			$name.addClass( 'hide' );
			$this.find( '.li2 .radioname' ).removeClass( 'hide' );
			$song.html( G.status.Title || blinkdot );
		} else {
			$name.removeClass( 'hide' );
			$song.empty();
		}
		getTitleWidth();
		var time = $this.find( '.time' ).data( 'time' );
		G.intElapsedPl = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === time ) {
				clearInterval( G.intElapsedPl );
				$elapsed.empty();
				G.status.elapsed = 0;
				if ( G.status.state === 'play' ) {
					$( '#pl-list li.active .elapsed' ).empty();
					$( '#pl-list li.active' )
						.removeClass( 'active' )
						.next( 'li' ).addClass( 'active' );
					setPlaylistScroll();
				}
				return
			}
			
			elapsedtxt = second2HMS( G.status.elapsed );
			$elapsed.html( '<i class="fa fa-play"></i>'+ elapsedtxt + slash );
			setTitleWidth();
		}, 1000 );
	} else { // stop
		$song
			.empty()
			.css( 'max-width', '' );
		$elapsed.empty();
	}
}
function renderLibrary() {
	G.query = [];
	$( '#lib-path' ).css( 'max-width', '' );
	$( '#lib-breadcrumbs, #lib-path>i, #button-lib-search' ).removeClass( 'hide' );
	$( '#lib-path .lipath' ).empty()
	$( '#button-lib-back' ).toggleClass( 'button-lib-back-left', G.display.backonleft );
	$( '#lib-search, #lib-index, #button-lib-back' ).addClass( 'hide' );
	$( '#lib-search-close' ).empty();
	$( '#lib-search-input' ).val( '' );
	if ( G.librarylist || G.mode === 'coverart' ) {
		$( 'html, body' ).scrollTop( G.liscrolltop );
		return
	}
	
	$( '#page-library .content-top, #lib-list' ).addClass( 'hide' );
	var titlehtml = '<span class="title">LIBRARY</span>&emsp;';
	if ( G.display.count ) {
		titlehtml += '<span id="li-count">'+ ( $( '#lib-mode-list' ).data( 'count' ) ).toLocaleString() +' <i class="fa fa-music gr"></i></span>';
	}
	$( '#lib-breadcrumbs' ).html( titlehtml );
	$( '#page-library .content-top, #lib-mode-list' ).removeClass( 'hide' );
	$( '.mode:not( .mode-bookmark )' ).each( function() {
		var name = this.id.replace( 'mode-', '' );
		$( this ).parent().toggleClass( 'hide', !G.display[ name ] );
	} );
	$( '.mode grl' ).toggleClass( 'hide', !G.display.count );
	if ( G.display.label ) {
		$( '#lib-mode-list a.label' ).show();
		$( '.mode' ).removeClass( 'nolabel' );
	} else {
		$( '#lib-mode-list a.label' ).hide();
		$( '.mode:not( .mode-bookmark )' ).addClass( 'nolabel' );
	}
	$( '#lib-cover-list' ).addClass( 'hide' );
	$( '#lib-list' ).empty().addClass( 'hide' );
	$( '#lib-mode-list' ).removeClass( 'hide' );
	$( '.mode-bookmark' ).children()
		.add( '.coverart img' ).css( 'opacity', '' );
	$( '.edit' ).remove();
	$( '#coverart' ).css( 'opacity', '' );
	orderLibrary();
	displayTopBottom();
	$( 'html, body' ).scrollTop( G.modescrolltop );
}
function renderLibraryList( data ) {
	if ( data == -1 ) {
		infoNoData();
		return
	}
	
	G.librarylist = 1;
	$( '#lib-mode-list, .menu, #lib-cover-list' ).addClass( 'hide' );
	$( '#button-lib-back' ).toggleClass( 'hide', data.modetitle === 'search' );
	$( '#lib-path .lipath' ).text( data.path );
	var libpath = $( '#lib-path .lipath' ).text();
	if ( 'count' in data ) {
		$( '#lib-path' ).css( 'max-width', '40px' );
		$( '#lib-list' ).css( 'width', '100%' );
		$( '#lib-search-close' ).html( '<i class="fa fa-times"></i><span>' + data.count + ' <grl>of</grl></span>&ensp;' );
		var htmlpath = '';
	} else if ( [ 'file', 'sd', 'nas', 'usb' ].indexOf( G.mode ) === -1 ) {
		if ( data.modetitle === 'COVERART' ) {
			var htmlpath = '<i class="fa fa-coverart"></i> <span id="mode-title">COVERART</span>';
		} else if ( 'index' in data ) { // track view - keep previous title
			var htmlpath = '<i class="fa fa-'+ G.mode +'"></i> <span id="mode-title">'+ data.modetitle +'</span>';
		}
		if ( G.mode === 'webradio' ) {
			htmlpath += ' <i class="button-webradio-new fa fa-plus-circle"></i>';
			$( '#button-lib-search' ).addClass( 'hide' );
		}
	} else { // dir breadcrumbs
		var dir = data.modetitle.split( '/' );
		var dir0 = dir[ 0 ];
		var htmlpath = '<i class="fa fa-'+ dir0.toLowerCase() +'"></i>';
		htmlpath += '<a>'+ dir0 +'/<span class="lidir">'+ dir0 +'</span></a>';
		var lidir = dir0;
		var iL = dir.length;
		for ( i = 1; i < iL; i++ ) {
			lidir += '/'+ dir[ i ];
			htmlpath += '<a>'+ dir[ i ] +'/<span class="lidir">'+ lidir +'</span></a>';
		}
	}
	if ( htmlpath ) $( '#lib-breadcrumbs' ).html( htmlpath );
	$( '#lib-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		if ( G.color ) {
			if ( G.color === 1 ) {
				G.color = 2;
				$( '#lib-list li:eq( 0 )' ).tap();
			} else {
				colorSet();
			}
		}
		if ( $( '.radiothumb' ).length && ( libpath === 'Webradio' ) ) new LazyLoad( { elements_selector: '.radiothumb' } );
		if ( $( '.licover' ).length ) setTrackCoverart();
		$( '#lib-list p' ).toggleClass( 'fixedcover', $( '#lib-list li:eq( 1 )' ).hasClass( 'track1' ) );
		$( '.list p' ).toggleClass( 'bars-on', G.bars );
		setTimeout( function() {
			if ( 'index' in data ) {
				$( '#lib-list' ).css( 'width', '' );
				$( '#lib-index' )
					.html( data.index )
					.removeClass( 'hide' );
			} else {
				$( '#lib-list' ).css( 'width', '100%' );
				$( '#lib-index' ).addClass( 'hide' );
			}
			$( 'html, body' ).scrollTop( G.scrolltop[ libpath ] || 0 );
			$( '#lib-list' ).removeClass( 'hide' );
			$( '#loader' ).addClass( 'hide' );
		}, 0 );
	} );
}
function renderPlayback() {
	clearIntervalAll();
	$( '#loader' ).addClass( 'hide' );
	var status = G.status;
	// song and album before update for song/album change detection
	var previousartist = $( '#artist' ).text();
	var prevtitle = $( '#song' ).text();
	var previousalbum = $( '#album' ).text();
	// volume
	if ( !G.display.volumenone ) {
		if ( G.display.volume ) {
			$volumeRS.setValue( status.volume );
			$volumehandle.rsRotate( - $volumeRS._handle1.angle );
			status.volumemute != 0 ? muteColor( status.volumemute ) : unmuteColor();
		} else {
			$( '#volume-bar' ).css( 'width', status.volume +'%' );
		}
	}
	// empty queue
	if ( !status.playlistlength && G.status.mpd && status.state === 'stop' ) {
		renderPlaybackBlank();
		return
	}
	
	if ( $( '#qrwebui' ).html() ) {
		$( '.emptyadd' ).addClass( 'hide' );
		$( '#qrwebui' ).empty();
		$( '#coverTR' ).removeClass( 'blankTR' );
		$( '#coverart' ).removeClass( 'hide' );
	}
	$( '.playback-controls' ).css( 'visibility', 'visible' );
	$( '#artist, #song, #album' ).css( 'width', '' );
	$( '#artist' ).text( status.Artist );
	$( '#song' ).text( status.Title );
	$( '#album' )
		.toggleClass( 'albumradio', status.webradio )
		.text( status.Album ).promise().done( function() {
		scrollLongText();
	} );
	[ 'airplay', 'snapclient', 'spotify', 'upnp', 'webradio' ].forEach( function( el ) {
		$( '#i-'+ el ).toggleClass( 'hide', !status[ el ] );
	} );
	$( '#sampling' ).html( status.sampling );
	if ( !G.coversave ) $( '.cover-save' ).remove();
	if ( status.webradio ) {
		G.coversave = 0;
		$( '.cover-save' ).remove();
		// webradio coverart
		if ( !status.Title || status.Title !== prevtitle ) {
			if ( status.coverart ) {
				$( '#divcover, #coverart' ).removeClass( 'vu' );
				$( '#coverart' ).prop( 'src', status.coverart );
			} else {
				if ( status.state === 'stop' || !$( '#coverart' ).prop( 'src' ) ) {
					$( '#divcover, #coverart' )
						.prop( 'src', status.state === 'play' ? vu : vustop )
						.addClass( 'vu' );
				} else {
					G.coverdefault = setTimeout( function() {
						$( '#divcover, #coverart' )
							.prop( 'src', status.state === 'play' ? vu : vustop )
							.addClass( 'vu' );
					}, 2000 );
				}
			}
			if ( status.Title ) {
				if ( status.Title.indexOf( ': ' ) !== -1 ) {
					var artist_title = status.Title.split( ': ' );
				} else {
					var artist_title = status.Title.split( ' - ' );
				}
				if ( artist_title.length === 2 ) {
					var artist = artist_title[ 0 ]
					var title = artist_title[ 1 ].replace( / $| \(.*$/, '' ) // remove trailing space and extra tag
					coverartGet( artist, title, 'title' );
				}
			}
		}
		$( '#time' ).roundSlider( 'setValue', 0 );
		$( '#time-bar' ).addClass( 'hide' );
		if ( status.state === 'play' ) {
			if ( !status.Title ) $( '#song' ).html( blinkdot );
			$( '#elapsed' ).html( status.state === 'play' ? blinkdot : '' );
			if ( G.display.time ) {
				if ( G.display.radioelapsed || G.localhost ) {
					G.intElapsed = setInterval( function() {
						G.status.elapsed++;
						elapsedhms = second2HMS( G.status.elapsed );
						$( '#total' ).text( elapsedhms ).addClass( 'gr' );
					}, 1000 );
				} else {
					$( '#total' ).empty();
				}
			} else {
				$( '#total' ).empty();
				if ( G.display.radioelapsed ) {
					G.intElapsed = setInterval( function() {
						G.status.elapsed++;
						elapsedhms = second2HMS( G.status.elapsed );
					$( '#progress' ).html( '<i class="fa fa-play"></i><w>'+ elapsedhms +'</w>' );
					}, 1000 );
				} else {
					$( '#progress' ).empty();
				}
			}
		} else {
			$( '#song' ).html( '·&ensp;·&ensp;·' );
			$( '#progress, #elapsed, #total' ).empty();
		}
		return
	}
	if ( status.Artist !== previousartist || status.Album !== previousalbum || status.airplay ) {
		G.coversave = 0;
		$( '.cover-save' ).remove();
		$( '#divcover, #coverart' ).removeClass( 'vu' );
		if ( status.coverart ) {
			$( '#coverart' ).prop( 'src', status.coverart );
		} else {
			G.local = 1;
			$.post( cmdphp, { cmd: 'sh', sh: [ 'cmd-coverart.sh', status.file ] }, function( url ) {
				G.local = 0;
				if ( url ) {
					G.status.coverart = url;
					$( '#coverart' ).prop( 'src', url );
				} else {
					$( '#coverart' ).prop( 'src', coverrune );
					coverartGet( status.Artist, status.Album );
				}
			} );
		}
	}
	// time
	time = 'Time' in status ? status.Time : '';
	var timehms = time ? second2HMS( time ) : '';
	$( '#total' ).text( timehms );
	// stop <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
	if ( status.state === 'stop' ) {
		if ( status.upnp ) $( '#sampling' ).empty();
		$( '#song' ).removeClass( 'gr' );
		if ( G.display.time ) {
			$( '#time' ).roundSlider( 'setValue', 0 );
			$( '#elapsed' )
				.text( timehms )
				.addClass( 'gr' );
			$( '#total' ).empty();
		} else {
			$( '#progress' ).html( '<i class="fa fa-stop"></i><w>'+ timehms +'</w>' );
			$( '#time-bar' ).css( 'width', 0 );
		}
		return
	}
	
	$( '#elapsed, #total' ).removeClass( 'bl gr wh' );
	$( '#song' ).toggleClass( 'gr', status.state === 'pause' );
	var elapsedhms = second2HMS( G.status.elapsed );
	var position = Math.round( G.status.elapsed / time * 1000 );
	// pause <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
	if ( status.state === 'pause' ) {
		if ( G.display.time ) {
			$( '#time' ).roundSlider( 'setValue', position );
			$( '#elapsed' ).text( elapsedhms ).addClass( 'bl' );
			$( '#total' ).addClass( 'wh' );
		} else {
			$( '#progress' ).html( '<i class="fa fa-pause"></i><bl>'+ elapsedhms +'</bl> / <w>'+ timehms +'</w>' );
			$( '#time-bar' ).css( 'width', position / 10 +'%' );
		}
		return
	}
	
	if ( G.display.time ) {
		if ( G.status.mpd && G.status.elapsed ) $( '#elapsed' ).text( second2HMS( G.status.elapsed ) );
		G.intElapsed = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === status.Time ) {
				G.status.elapsed = 0;
				clearIntervalAll();
				$( '#elapsed' ).empty();
				$( '#time' ).roundSlider( 'setValue', 0 );
			} else {
				elapsedhms = second2HMS( G.status.elapsed );
				$( '#elapsed' ).text( elapsedhms );
			}
		}, 1000 );
		if ( G.localhost ) { // fix: high cpu - interval each 1 sec
			G.intKnob = setInterval( function() {
				position = Math.round( G.status.elapsed / time * 1000 );
				$( '#time' ).roundSlider( 'setValue', position );
			}, 1000 );
		} else {
			G.intKnob = setInterval( function() {
				position++;
				$( '#time' ).roundSlider( 'setValue', position );
			}, time );
		}
	} else {
		G.intElapsed = setInterval( function() {
			G.status.elapsed++;
			if ( G.status.elapsed === status.Time ) {
				G.status.elapsed = 0;
				clearIntervalAll();
				$( '#time-bar' ).css( 'width', 0 );
				$( '#progress' ).html( '<i class="fa fa-play"></i>' );
			} else {
				elapsedhms = second2HMS( G.status.elapsed );
				$( '#progress' ).html( '<i class="fa fa-play"></i><w>'+ elapsedhms +'</w> / '+ timehms );
			}
		}, 1000 );
		G.intKnob = setInterval( function() {
			position++;
			$( '#time-bar' ).css( 'width', position / 10 +'%' );
		}, time );
	}
}
function renderPlaybackBlank() {
	bash( "ip r | awk '/default/ {print $9}'", function( ip ) {
		var webui = ip ? 'http://'+ ip : 'No connection - Click&ensp;<i class="fa fa-gear"></i>&ensp;to setup'
		$( '#sampling' ).html( webui );
		$( '#playback-controls, #infoicon i' ).addClass( 'hide' );
		$( '#page-playback .emptyadd' ).toggleClass( 'hide', !G.status.mpd );
		$( '#divartist, #divsong, #divalbum' ).removeClass( 'scroll-left' );
		$( '#artist, #song, #album, #progress, #elapsed, #total' ).empty();
		if ( G.display.time ) $( '#time' ).roundSlider( 'setValue', 0 );
		$( '#time-bar' ).css( 'width', 0 );
		$( '#coverart' ).addClass( 'hide' );
		$( '#splash' ).remove();
		var qrweb = new QRCode( {
			  msg : ip ? webui : 'No connection'
			, dim : 230
			, pad : 10
		} );
		$( '#qrwebui' ).html( qrweb );
		$( '#coverTR' ).toggleClass( 'blankTR', !G.bars );
	} );
}
renderPlaylist = function( data ) {
	G.status.playlistlength = data.playlistlength;
	$( '#pl-search-input' ).val( '' );
	$( '#pl-path, #button-pl-back, #pl-savedlist, #pl-index, #pl-search' ).addClass( 'hide' );
	$( '#lib-path>span, #button-pl-search' ).removeClass( 'hide' );
	$( '#button-pl-open' ).toggleClass( 'disable', G.status.playlists === 0 );
	if ( data == -1 ) {
		$( '#playback-controls' ).addClass( 'hide' );
		$( '#pl-count' ).html( '<span class="title">PLAYLIST</span>' );
		$( '.pllength' ).addClass( 'disable' );
		$( '#pl-list' ).empty();
		$( '.playlist, #page-playlist .emptyadd' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( 0 );
		$( '#loader' ).addClass( 'hide' );
		return
	}
	
	$( '.playlist' ).removeClass( 'hide' );
	$( '.emptyadd' ).addClass( 'hide' );
	$( '#pl-count' ).html( '<span class="title">PLAYLIST</span>&emsp;'+ data.counthtml );
	$( '#button-pl-save, #button-pl-clear, #button-pl-search' ).removeClass( 'disable' );
	$( '#button-pl-crop, #button-pl-shuffle' ).toggleClass( 'disable', G.status.playlistlength < 2 );
	$( '#button-pl-consume' ).toggleClass( 'bl', G.status.consume );
	$( '#button-pl-random' ).toggleClass( 'bl', G.status.librandom );
	var plremove = $( '#pl-list .pl-remove' ).length;
	$( '#pl-list' ).html( data.html +'<p></p>' ).promise().done( function() {
		$( '.list p' ).toggleClass( 'bars-on', G.bars );
		$( '#loader' ).addClass( 'hide' );
		setPlaylistScroll();
		if ( plremove ) $( '#pl-list .li1' ).before( '<i class="fa fa-minus-circle pl-remove"></i>' );
	} );
}
function renderPlaylistList() {
	$( '#loader' ).removeClass( 'hide' );
	list( { cmd: 'list' }, function( data ) {
		$( '.playlist, #button-pl-search, #menu-plaction' ).addClass( 'hide' );
		$( '#menu-plaction' ).addClass( 'hide' );
		
		$( '#pl-path' ).html( data.counthtml );
		$( '#pl-path, #button-pl-back, #pl-savedlist, #pl-index' ).removeClass( 'hide' );
		$( '.emptyadd' ).addClass( 'hide' );
		$( '#button-pl-back' ).css( 'float', G.display.backonleft ? 'left' : '' );
		$( '#pl-savedlist' ).html( data.html +'<p></p>' ).promise().done( function() {
			$( '.list p' ).toggleClass( 'bars-on', G.bars );
			$( '#pl-savedlist' ).css( 'width', '' );
			$( '#pl-index' ).html( data.index );
			$( '#pl-index' ).removeClass( 'hide' );
			$( 'html, body' ).scrollTop( 0 );
			$( '#loader' ).addClass( 'hide' );
		} );
	}, 'json' );
}
function renderSavedPlaylist( name ) {
	$( '.menu' ).addClass( 'hide' );
	$( '#loader' ).removeClass( 'hide' );
	$( '#pl-count' ).empty();
	list( { cmd: 'get', name: name }, function( data ) {
		$( '#pl-path' ).html( data.counthtml );
		$( '#button-pl-back' ).css( 'float', G.display.backonleft ? 'left' : '' );
		$( '#pl-path, #button-pl-back, #pl-savedlist' ).removeClass( 'hide' );
		$( '#pl-path bl' ).removeClass( 'title' );
		$( '#pl-savedlist' ).html( data.html +'<p></p>' ).promise().done( function() {
			$( '.list p' ).toggleClass( 'bars-on', G.bars );
			$( '#pl-savedlist' ).css( 'width', '100%' );
			$( '#loader, #pl-index' ).addClass( 'hide' );
			$( 'html, body' ).scrollTop( 0 );
		} );
	}, 'json' );
}
function resetOrientation( file, ori, callback ) {
	var reader = new FileReader();
	reader.onload = function( e ) {
		var img = new Image();
		img.src = e.target.result;
		img.onload = function() {
			var imgW = img.width,
				imgH = img.height,
				canvas = document.createElement( 'canvas' ),
				ctx = canvas.getContext( '2d' );
			// set proper canvas dimensions before transform
			if ( 4 < ori && ori < 9 ) {
				canvas.width = imgH;
				canvas.height = imgW;
			} else {
				canvas.width = imgW;
				canvas.height = imgH;
			}
			// transform context before drawing image
			switch ( ori ) {
				// transform( Hscale, Hskew, Vscale, Vskew, Hmove, Vmove )
				case 2: ctx.transform( -1,  0,  0,  1, imgW,    0 ); break; // mirror up
				case 3: ctx.transform( -1,  0,  0, -1, imgW, imgH ); break; // down
				case 4: ctx.transform(  1,  0,  0, -1,    0, imgH ); break; // mirror down
				case 5: ctx.transform(  0,  1,  1,  0,    0,    0 ); break; // mirror on left side
				case 6: ctx.transform(  0,  1, -1,  0, imgH,    0 ); break; // on left side
				case 7: ctx.transform(  0, -1, -1,  0, imgH, imgW ); break; // mirror on right side
				case 8: ctx.transform(  0, -1,  1,  0,    0, imgW ); break; // on right side
				default: break;
			}
			ctx.drawImage( img, 0, 0 );
			callback( canvas, imgW, imgH );
		}
	}
	reader.readAsDataURL( file );
}
function scrollLongText() {
	var $el = $( '#artist, #song, #album' );
	var wW = window.innerWidth;
	var tWmax = 0;
	$el.each( function() {
		var $this = $( this );
		var tW = $this.width() * G.scale;
		if ( tW > wW * 0.98 ) {
			if ( tW > tWmax ) tWmax = tW; // same width > scroll together (same speed)
			$this.addClass( 'scrollleft' );
		} else {
			$this
				.removeClass( 'scrollleft' )
				.removeAttr( 'style' ); // fix - iOS needs whole style removed
		}
	} );
	$el.css( 'visibility', 'visible' ); // from initial hidden
	if ( !$( '.scrollleft' ).length ) return
	
	// varied width only when scaled
	var cssanimate = ( wW + tWmax ) / G.scrollspeed +'s infinite scrollleft linear'; // calculate to same speed
	$( '.scrollleft' ).css( {
		  width               : tWmax +'px'
		, animation           : cssanimate
		, '-moz-animation'    : cssanimate
		, '-webkit-animation' : cssanimate
	} );
}
function second2HMS( second ) {
	if ( second <= 0 ) return 0;
	
	var second = Math.round( second );
	var hh = Math.floor( second / 3600 );
	var mm = Math.floor( ( second % 3600 ) / 60 );
	var ss = second % 60;
	
	hh = hh ? hh +':' : '';
	mm = hh ? ( mm > 9 ? mm +':' : '0'+ mm +':' ) : ( mm ? mm +':' : '' );
	ss = mm ? ( ss > 9 ? ss : '0'+ ss ) : ss;
	return hh + mm + ss;
}
function setButtonControl() {
	if ( G.bars ) {
		$( '#playback-controls' ).toggleClass( 'hide', G.status.playlistlength === 0 );
		$( '#previous, #next' ).toggleClass( 'hide', G.status.playlistlength < 2 || !G.status.mpd );
		$( '#play, #pause' ).toggleClass( 'disabled', !G.status.mpd );
		$( '#pause' ).toggleClass( 'hide', G.status.webradio || G.status.airplay );
		[ 'previous', 'stop', 'play', 'pause', 'next' ].forEach( function( el ) {
			$( '#'+ el ).toggleClass( 'active', G.status.state === el );
		} );
	}
	setButtonOptions();
}
function setButtonOptions() {
	var prefix = G.display.time ? 'ti' : 'i';
	if ( !G.bars ) {
		$( '#'+ prefix +'-update' ).toggleClass( 'hide', !G.status.updating_db );
		$( '#'+ prefix +'-addons' ).toggleClass( 'hide', !$( '#badge' ).length );
	}
	if ( G.status.updating_db ) {
		$( '#tab-library, #button-library' ).addClass( 'blink' );
	} else {
		$( '#tab-library, #button-library' ).removeClass( 'blink' );
		$( '.lib-icon.blink' )
			.removeClass( 'fa-refresh-library blink' )
			.addClass( 'fa-folder' );
	}
	$( '#'+ ( G.display.time ? 'ti' : 'i' ) +'-gpio' ).toggleClass( 'hide', !G.status.gpioon );
	$( '#snapclient' ).toggleClass( 'on', G.status.snapclient );
	$( '#gpio .fa-gpio' ).toggleClass( 'on', G.status.gpioon );
	if ( !G.status.mpd ) return
	
	$( '#modeicon' ).toggleClass( 'hide', G.display.time );
	$( '#timeicon' ).toggleClass( 'hide', !G.display.time );
	if ( G.display.buttons ) {
		$( '#i-random, #i-repeat, #i-repeat1, #ti-random, #ti-repeat, #ti-repeat1' ).addClass( 'hide' );
		[ 'random', 'repeat', 'single' ].forEach( function( el ) {
			$( '#'+ el ).toggleClass( 'active', G.status[ el ] );
		} );
	} else {
		$( '#'+ prefix +'-random' ).toggleClass( 'hide', !G.status.random );
		$( '#'+ prefix +'-repeat' ).toggleClass( 'hide', !G.status.repeat || G.status.single );
		$( '#'+ prefix +'-repeat1' ).toggleClass( 'hide', !G.status.repeat || !G.status.single );
	}
	$( '#'+ prefix +'-consume' ).toggleClass( 'hide', !G.status.consume );
	$( '#'+ prefix +'-librandom' ).toggleClass( 'hide', !G.status.librandom );
}
function setTrackCoverart() {
	if ( G.display.hidecover ) {
		$( '.licover' ).addClass( 'hide' );
		$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
	} else {
		if ( !G.display.fixedcover ) {
			$( '.licover' ).addClass( 'nofixed' );
			$( '#lib-list li:eq( 1 )' ).removeClass( 'track1' );
		}
		if ( $( '.licoverimg' ).hasClass( 'nocover' ) ) {
			coverartGet( $( '.liartist' ).text(), $( '.lialbum' ).text(), 'licover' );
		} else {
			$( '.licoverimg img' ).on( 'load', function() {
				$( '.liinfo' ).css( 'width', ( window.innerWidth - $( this ).width() - 50 ) +'px' );
			} );
		}
	}
}
function setNameWidth() {
	var wW = window.innerWidth;
	$.each( $( '#pl-list .name' ), function() {
		var $name = $( this );
		var $dur =  $name.next();
		// pl-icon + margin + duration + margin
		var iWdW = 40 + 10 + $dur.width();
		if ( iWdW + $name.width() < wW ) {
			$dur.removeClass( 'duration-right' );
			$name.css( 'max-width', '' );
		} else {
			$dur.addClass( 'duration-right' );
			$name.css( 'max-width', wW - iWdW +'px' );
		}
	} );
}
function setPlaylistScroll() {
	if ( !G.playlist || !G.status.playlistlength || G.sortable ) return // skip if empty or Sortable
	
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		displayTopBottom();
		$( '#menu-plaction' ).addClass( 'hide' );
		$( '#pl-list li' ).removeClass( 'updn' );
		setNameWidth();
		bash( '/srv/http/bash/status.sh statusonly', function( status ) {
			$.each( status, function( key, value ) {
				G.status[ key ] = value;
			} );
			if ( G.bars ) setButtonControl();
			$( '#pl-list li:eq( 0 )' ).addClass( 'active' );
			$( 'html, body' ).scrollTop( 0 );
			var $linotactive = $( '#pl-list li:not(:eq( '+ status.song +' ) )' );
			$linotactive.removeClass( 'active activeplay' ).find( '.elapsed, .song' ).empty();
			$linotactive.find( '.name' ).removeClass( 'hide' );
			$linotactive.find( '.song' ).css( 'max-width', '' );
			var $liactive = $( '#pl-list li' ).eq( status.song );
			$liactive.addClass( 'active' );
			playlistProgress();
			var scrollpos = $liactive.offset().top - $( '#pl-list' ).offset().top - ( G.bars ? 80 : 40 ) - ( 49 * 3 );
			$( 'html, body' ).scrollTop( scrollpos );
		}, 'json' );
	}, G.debouncems );
}
function setTitleWidth() {
	// pl-icon + margin + duration + margin
	var $liactive = $( '#pl-list li.active' ); 
	var $duration = $liactive.find( '.duration' );
	var $title = G.status.webradio ? $liactive.find( '.song' ) : $liactive.find( '.name' );
	var iWdW = 40 + 10 + $duration.width() + 10;
	if ( iWdW + pltW < plwW ) {
		$title.css(  'max-width', '' );
		$duration.removeClass( 'duration-right' );
	} else {
		$title.css( 'max-width', plwW - iWdW +'px' );
		$duration.addClass( 'duration-right' );
	}
	$( '.duration-right' ).css( 'right', '' );
}
function stopAirplay() {
	info( {
		  icon    : 'airplay'
		, title   : 'AirPlay'
		, message : 'AirPlay is playing.'
				   +'<br>Stop AirPlay?'
		, ok      : function() {
			$( '#stop' ).click();
		}
	} );
}
function switchPage( page ) {
	clearIntervalAll();
	// get scroll position before changed
	if ( G.library ) {
		if ( G.librarylist || G.mode === 'coverart' ) {
			G.liscrolltop = $( window ).scrollTop();
		} else {
			G.modescrolltop = $( window ).scrollTop();
		}
	} else if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) G.plscrolltop = $( window ).scrollTop();
	}
	$( '#bar-bottom i' ).removeClass( 'active' );
	$( '.page, .menu' ).addClass( 'hide' );
	$( '#page-'+ page ).removeClass( 'hide' );
	$( '#tab-'+ page ).addClass( 'active' );
	$( '#pl-search-close, #pl-search-close' ).addClass( 'hide' );
	G.library = G.playback = G.playlist = 0;
	G[ page ] = 1;
	// restore page scroll
	if ( G.playback ) {
		$timeRS.setValue( 0 );
		$( 'html, body' ).scrollTop( 0 );
		if ( G.status.state === 'play' && !G.status.webradio ) $( '#elapsed' ).empty(); // hide flashing
	} else if ( G.library ) {
		if ( G.librarylist || G.mode === 'coverart' ) {
			$( 'html, body' ).scrollTop( G.liscrolltop );
		} else {
			renderLibrary();
		}
	} else if ( G.playlist ) {
		if ( G.savedlist || G.savedplaylist ) $( 'html, body' ).scrollTop( G.plscrolltop );
	}
}
function unmuteColor() {
	$volumetooltip.removeClass( 'bl' );
	$volumehandle.removeClass( 'bgr' );
	$( '#volmute' ).removeClass( 'active' )
		.find( 'i' ).removeClass( 'fa-mute' ).addClass( 'fa-volume' );
}
function updatePlaylist() {
	if ( G.playlist && !G.savedlist && !G.savedplaylist && !G.sortable ) getPlaylist();
}
function volumeSet( pageX ) {
	var $volumeband = $( '#volume-band' );
	var posX = pageX - $volumeband.offset().left;
	var bandW = $volumeband.width();
	posX = posX < 0 ? 0 : ( posX > bandW ? bandW : posX );
	var vol = Math.round( posX / bandW * 100 );
	if ( G.drag ) $( '#volume-bar' ).css( 'width', vol +'%' );
	$( '#volume-text' ).text( vol );
	clearTimeout( G.debounce );
	G.debounce = setTimeout( function() {
		if ( !G.drag ) $( '#volume-bar' ).animate( { width: vol +'%' }, 600 );
		G.local = 1;
		$( '.volumeband' ).addClass( 'disabled' );
		bash( [ 'volume', G.status.volume, vol ], function() {
			G.local = 0;
			G.status.volume = vol;
			$( '.volumeband' ).removeClass( 'disabled' );
		} );
	}, G.drag ? 50 : 300 );
}
