function infoReplace( callback ) {
	info( {
		  icon    : 'list-ul'
		, title   : 'Playlist Replace'
		, message : 'Replace current playlist?'
		, ok      : callback
	} );
}
function addReplace( cmd, command, title ) {
	var playbackswitch = G.display.playbackswitch && ( cmd === 'addplay' || cmd === 'replaceplay' );
	bash( command, function() {
		if ( playbackswitch ) {
			$( '#tab-playback' ).click();
		} else {
			getPlaybackStatus();
		}
	} );
	if ( G.list.li.hasClass( 'licover' ) ) {
		var msg = G.list.li.find( '.lialbum' ).text()
				+'<a class="li2">'+ G.list.li.find( '.liartist' ).text() +'</a>';
	} else if ( G.list.li.find( '.li1' ).length ) {
		var msg = G.list.li.find( '.li1' )[ 0 ].outerHTML
				+ G.list.li.find( '.li2' )[ 0 ].outerHTML;
		msg = msg.replace( '<bl>', '' ).replace( '</bl>', '' );
	} else {
		var msg = G.list.li.find( '.lipath' ).text();
	}
	notify( title, msg, 'list-ul' );
}
function bookmarkDelete( path, name, $block ) {
	var $img = $block.find( 'img' );
	var src = $img.prop( 'src' );
	if ( src ) {
		var icon = '<img src="'+ src +'">'
	} else {
		var icon = '<i class="fa fa-bookmark bookmark"></i>'
				  +'<br><a class="bklabel">'+ name +'</a>'
	}
	info( {
		  icon    : 'bookmark'
		, title   : 'Remove Bookmark'
		, message : icon
		, oklabel : '<i class="fa fa-minus-circle"></i>Remove'
		, okcolor : '#bb2828'
		, ok      : function() {
			G.bookmarkedit = 1;
			$.post( cmdphp, {
				  cmd       : 'bookmarks'
				, bookmarks : name
				, path      : path
				, delete    : 1
			} );
			$block.parent().remove();
		}
	} );
}
function bookmarkNew() {
	var path = G.list.path;
	if ( path.slice( -4 ) === '.cue' ) path = path.substring( 0, path.lastIndexOf( '/' ) );
	var name = path.split( '/' ).pop();
	var $el = $( '.mode-bookmark' );
	if ( $el.length ) {
		var $exist = $el.filter( function() {
			return $( this ).find( '.lipath' ).text() === path;
		} );
		if ( $exist.length ) {
			if ( $exist.find( '.fa-bookmark' ).length ) {
				var msghtml = '<i class="fa fa-bookmark bookmark"></i>'
							  +'<br><a class="bklabel">'+ $exist.find( '.bklabel' ).text() +'</a>'
							  + path;
			} else {
				var msghtml = '<img src="'+ $exist.find( 'img' ).prop( 'src' ) +'">'
							  +'<br><w>'+ path +'</w>';
			}
			info( {
				  icon    : 'bookmark'
				, title   : 'Add Bookmark'
				, message : msghtml
						   +'<br><br>Already exists.'
			} );
			return
		}
	}
	if ( G.list.licover ) {
		$img = $( '.licover img' );
		if ( $img.prop( 'src' ).slice( -3 ) !== 'gif' ) {
			var canvas = document.createElement( 'canvas' );
			canvas.height = 200; // size of resized image
			canvas.width = Math.round( $img.width() / $img.height() * canvas.height );
			pica.resize( $img[ 0 ], canvas, picaOption ).then( function() {
				var base64 = canvas.toDataURL( 'image/jpeg' ); // canvas -> base64
				info( {
					  icon    : 'bookmark'
					, title   : 'Add Bookmark'
					, message : '<img src="'+ base64 +'">'
							   +'<br><w>'+ path +'</w>'
					, ok      : function() {
						$.post( cmdphp, {
							  cmd       : 'bookmarks'
							, bookmarks : 1
							, path      : path
							, base64    : base64
							, new       : 1
						} );
						notify( 'Bookmark Added', path, 'bookmark' );
					}
				} );
			} );
		} else {
			var src = $img.prop( 'src' );
			var giffile = '/mnt/MPD/'+ G.list.path +'/'+ src.split( '/' ).pop().split( '.' )[ 0 ] +'.gif';
			info( {
				  icon    : 'bookmark'
				, title   : 'Add Bookmark'
				, message : '<img src="'+ src +'">'
						   +'<br><w>'+ path +'</w>'
				, ok      : function() {
					var img0 = $( '#infoMessage img' )[ 0 ];
					$.post( cmdphp, {
						  cmd       : 'bookmarks'
						, bookmarks : 1
						, path      : path
						, gif       : giffile
						, new       : 1
						, resize    : img0.naturalWidth > 200 || img0.naturalHeight > 200
					} );
				}
			} );
		}
		return
	}
	
	$.post( 'cmd.php', { cmd: 'coverartget', path: path, thumbnail: 'thumbnail' }, function( coverart ) {
		if ( coverart ) {
			if ( coverart.slice( -3 ) !== 'gif' ) {
				info( {
					  icon    : 'bookmark'
					, title   : 'Add Bookmark'
					, message : '<img src="'+ coverart +'">'
							   +'<br><w>'+ path +'</w>'
					, ok      : function() {
						var $img = $( '#infoMessage img' );
						var canvas = document.createElement( 'canvas' );
						canvas.height = 200; // size of resized image
						canvas.width = Math.round( $img.width() / $img.height() * canvas.height );
						pica.resize( $img[ 0 ], canvas, picaOption ).then( function() {
							var base64 = canvas.toDataURL( 'image/jpeg' ); // canvas -> base64
							$.post( cmdphp, {
								  cmd       : 'bookmarks'
								, bookmarks : 1
								, path      : path
								, base64    : base64
								, new       : 1
							} );
							notify( 'Bookmark Added', path, 'bookmark' );
						} );
					}
				} );
			} else {
				var giffile = coverart.substr( 0, coverart.lastIndexOf( '.' ) );
				giffile = giffile.substr( 0, giffile.lastIndexOf( '.' ) ) +'.gif';
				info( {
					  icon    : 'bookmark'
					, title   : 'Add Bookmark'
					, message : '<img src="'+ coverart +'">'
							   +'<br><w>'+ path +'</w>'
					, ok      : function() {
						var img0 = $( '#infoMessage img' )[ 0 ];
						$.post( cmdphp, {
							  cmd       : 'bookmarks'
							, bookmarks : 1
							, path      : path
							, gif       : giffile
							, new       : 1
							, resize    : img0.naturalWidth > 200 || img0.naturalHeight > 200
						} );
					}
				} );
			}
		} else {
			info( {
				  icon         : 'bookmark'
				, title        : 'Add Bookmark'
				, width        : 500
				, message      : '<i class="fa fa-bookmark bookmark"></i>'
								+'<br>'
								+'<br><w>'+ path +'</w>'
								+'<br>As:'
				, textvalue    : name
				, textrequired : 0
				, boxwidth     : 'max'
				, ok           : function() {
					$.post( cmdphp, {
						  cmd       : 'bookmarks'
						, bookmarks : $( '#infoTextBox' ).val()
						, path      : path
						, new       : 1
					} );
					notify( 'Bookmark Added', path, 'bookmark' );
				}
			} );
		}
	} );
}
function bookmarkRename( name, path, $block ) {
	info( {
		  icon         : 'bookmark'
		, title        : 'Rename Bookmark'
		, width        : 500
		, message      : '<i class="fa fa-bookmark bookmark"></i>'
						+'<br><a class="bklabel">'+ name +'</a>'
						+'To:'
		, textvalue    : name
		, textrequired : 0
		, boxwidth     : 'max'
		, oklabel      : '<i class="fa fa-flash"></i>Rename'
		, ok           : function() {
			var newname = $( '#infoTextBox' ).val();
			$.post( cmdphp, {
				  cmd       : 'bookmarks'
				, bookmarks : newname
				, path      : path
				, rename    : 1
			} );
			$block.find( '.bklabel' ).text( newname );
		}
	} );
}
function playlistAdd( name, oldname ) {
	if ( oldname ) {
		bash( [ 'plrename', oldname, name ] );
	} else {
		list( { cmd: 'save', name: name }, function( data ) {
			if ( data == -1 ) {
				info( {
					  icon        : 'list-ul'
					, title       : oldname ? 'Rename Playlist' : 'Add Playlist'
					, message     : '<i class="fa fa-warning fa-lg"></i>&ensp;<w>'+ name +'</w>'
								   +'<br>Already exists.'
					, buttonlabel : '<i class="fa fa-arrow-left"></i>Back'
					, button      : playlistNew
					, oklabel     : '<i class="fa fa-flash"></i>Replace'
					, ok          : function() {
						oldname ? playlistAdd( name, oldname ) : playlistAdd( name );
					}
				} );
			} else {
				G.status.playlists++;
				notify( 'Playlist Saved', name, 'list-ul' );
				$( '#button-pl-open' ).removeClass( 'disable' );
			}
		} );
	}
}
function playlistDelete() {
	info( {
		  icon    : 'list-ul'
		, title   : 'Delete Playlist'
		, message : 'Delete?'
				   +'<br><w>'+ G.list.name +'</w>'
		, oklabel : '<i class="fa fa-minus-circle"></i>Delete'
		, okcolor : '#bb2828'
		, ok      : function() {
			G.status.playlists--;
			if ( !G.status.playlists ) $( '#tab-playlist' ).click();
			G.list.li.remove();
			list( { cmd: 'delete', name: G.list.name } );
		}
	} );
}
function playlistLoad( path, play, replace ) {
	G.local = 1;
	notify( 'Saved Playlist', 'Load ...', 'list-ul blink', -1 );
	list( {
		  cmd     : 'load'
		, name    : path
		, play    : play
		, replace : replace
	}, function( data ) {
		G.local = 0;
		G.status.playlistlength = +data;
		G.savedlist = 0;
		notify( ( replace ? 'Playlist Replaced' : 'Playlist Added' ), 'Done', 'list-ul' );
	} );
}
function playlistNew() {
	info( {
		  icon         : 'list-ul'
		, title        : 'Add Playlist'
		, message      : 'Save current playlist as:'
		, textlabel    : 'Name'
		, textrequired : 0
		, boxwidth     : 'max'
		, ok           : function() {
			playlistAdd( $( '#infoTextBox' ).val() );
		}
	} );
}
function playlistRename() {
	var name = G.list.name;
	info( {
		  icon         : 'list-ul'
		, title        : 'Rename Playlist'
		, message      : 'Rename:'
						+'<br><w>'+ name +'</w>'
						+'<br>To:'
		, textvalue    : name
		, textrequired : 0
		, boxwidth     : 'max'
		, oklabel      : '<i class="fa fa-flash"></i>Rename'
		, ok           : function() {
			var newname = $( '#infoTextBox' ).val();
			playlistAdd( newname, name );
			G.list.li.find( '.plname' ).text( newname );
		}
	} );
}
function tagEditor() {
	var file = G.list.path;
	var cue = file.slice( -4 ) === '.cue';
	var format = [ 'album', 'albumartist', 'artist', 'composer', 'genre', 'date' ];
	if ( !G.list.licover ) {
		if ( !cue ) {
			format.push( 'title', 'track' );
		} else {
			format = [ 'artist', 'title', 'track' ];
		}
	}
	var query = {
		  query  : 'track'
		, file   : file
		, format : format
	}
	if ( cue ) query.track = G.list.track || 'cover';
	if ( G.playlist ) query.coverart = 1;
	list( query, function( value ) {
		var label = [];
		format.forEach( function( el, i ) {
			label.push( '<i class="fa fa-'+ el +' wh" data-mode="'+ el +'"></i>' );
		} );
		var src = G.playlist ? value.pop() : $( '.licoverimg img' ).prop( 'src' );
		var filepath = '<ib>'+ file.replace( /\//g, '</ib>/<ib>' ) +'</ib>';
		var fileicon = cue ? 'list-ul' : ( G.list.licover ? 'folder' : 'file-music' );
		var message = '<img src="'+ src +'"><br>'
					 +'<i class="fa fa-'+ fileicon +' wh"></i>&ensp;'+ filepath;
		var footer = 'Tap icons: Browse by that mode - value';
		if ( G.list.licover ) footer += '<br>* Changes: All tracks in this directory';
		info( {
			  icon         : G.playlist ? 'info-circle' : 'tag'
			, title        : G.playlist ? 'Track Info' : 'Tag Editor'
			, width        : 500
			, message      : message
			, messagealign : 'left'
			, footer       : footer
			, textlabel    : label
			, textvalue    : value
			, boxwidth     : 'max'
			, preshow      : function() {
				$( '#infoMessage' )
					.css( 'width', 'calc( 100% - 40px )' )
					.find( 'img' ).css( 'margin', 0 );
				$( '.infoinput' ).each( function( i, $el ) {
					var $el = $( this );
					if ( $el.val() === '*' ) $el.val( '' ).prop( 'placeholder', '*various' );
					if ( G.playlist && !$el.val() ) $( '.infolabel:eq( '+ i +' ), .infoinput:eq( '+ i +' )' ).hide();
				} );
				if ( cue ) $( '.infolabel:eq( 2 ), .infoinput:eq( 2 )' ).hide();
				var plcue = !$( '.infoinput' ).filter( function() {
					return $( this ).val() !== '';
				} ).length
				if ( plcue ) {
					$( 'ib:last').remove();
					$( '#infoFooter' ).text( 'Tap coverart to browse that album' );
				}
				$( '#infoMessage' ).click( function() {
					if ( G.library ) return
					
					var path = $( '#infoMessage .fa-folder' ).length ? file : file.substr( 0, file.lastIndexOf( '/' ) );
					var query = {
						  query  : 'ls'
						, string : path
						, format : [ 'file' ]
					}
					$( '#tab-library' ).click();
					list( query, function( data ) {
						G.mode = 'file';
						data.path = path;
						data.modetitle = path;
						renderLibraryList( data );
						$( '#infoX' ).click();
					}, 'json' );
					query.path = path;
					query.modetitle = path;
					G.query = [ 'playlist', 'playlist', query ];
					
				} );
				$( '#infoMessage, #infotextlabel' ).children().css( 'cursor', 'pointer' );
				$( '.infolabel' ).click( function() {
					var mode = $( this ).find( 'i' ).data( 'mode' );
					var path = $( '.infoinput' ).eq( $( this ).index() ).val();
					if ( !path || mode === 'title' || mode === 'track' || ( G.library && mode === 'album' ) ) return
					
					if ( mode !== 'album' ) {
						var query = {
							  query  : 'find'
							, mode   : mode
							, string : path
							, format : [ 'genre', 'composer', 'date' ].indexOf( mode ) !== -1 ? [ 'album', 'artist' ] : [ 'album' ]
						}
					} else {
						if ( G.library ) {
							$( '#infoX' ).click();
							return
						}
						
						var albumartist = $( '.infoinput' ).eq( 1 ).val();
						var artist = $( '.infoinput' ).eq( 2 ).val();
						var query = {
							  query  : 'find'
							, mode   : [ 'album', albumartist ? 'albumartist' : 'artist' ]
							, string : [ path, albumartist || artist ]
						}
					}
					G.mode = mode;
					query.path = path;
					query.modetitle = mode.toUpperCase() +'<gr> • </gr><wh>'+ path +'</wh>';
					if ( G.library ) {
						G.query.push( query );
					} else {
						$( '#tab-library' ).click();
						G.query = [ 'playlist', 'playlist', query ];
					}
					list( query, function( data ) {
						data.path = path;
						data.modetitle = mode.toUpperCase();
						if ( mode !== 'album' ) {
							data.modetitle += '<gr> • </gr><wh>'+ path +'</wh>';
						} else { // fix - no title from playlist
							$( '#lib-breadcrumbs' ).html( '<i class="fa fa-album"></i> <span id="mode-title">ALBUM</span>' );
						}
						renderLibraryList( data );
						$( '#infoX' ).click();
					}, 'json' );
				} );
			}
			, nobutton     : G.playlist
			, nofocus      : 1
			, ok           : function() {
				var diff = 0;
				var fL = format.length;
				var tag = [ 'cmd-tageditor.sh', file, G.list.licover, cue ];
				for ( i = 0; i < fL; i++ ) {
					var val = $( '.infoinput:eq( '+ i +' )' ).val();
					tag.push( val );
					if ( val !== value[ i ] ) diff++;
				}
				if ( diff === 0 ) return
				
				notify( 'Tag Editor', 'Change ...', 'tag blink', -1 );
				$.post( 'cmd.php', { cmd: 'sh', sh: tag } );
			}
		} );
	}, 'json' );
}
function updateThumbnails() {
	// enclosed in double quotes entity &quot;
	var path = G.list.path.slice( -4 ) !== '.cue' ? G.list.path : G.list.path.substr( 0, G.list.path.lastIndexOf( '/' ) );
	infoCoverartScan( path );
}
function webRadioCoverart() {
	if ( G.library ) {
		var name = G.list.name;
		var urlname = G.list.path.toString().replace( /\//g, '|' );
		var sampling = 'Radio';
	} else {
		var name = G.status.Name;
		var urlname = G.status.file.replace( /\//g, '|' );
		var sampling = $( '#sampling' ).text();
	}
	var infojson = {
		  icon        : 'coverart'
		, title       : 'Change WebRadio CoverArt'
		, fileoklabel : '<i class="fa fa-flash"></i>Replace'
		, filetype    : 'image/*'
		, ok          : function() {
			var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
			var $imgnew = $( '#imgnew' );
			var canvas = document.createElement( 'canvas' );
			canvas.height = 100;
			canvas.width = Math.round( $imgnew.width() / $imgnew.height() * canvas.height );
			var newimg = $imgnew.prop( 'src' );
			pica.resize( $imgnew[ 0 ], canvas, picaOption ).then( function() {
				var thumb = canvas.toDataURL( 'image/jpeg', 1 );
				if ( file.name.slice( -4 ) !== '.gif' ) {
					$.post( cmdphp, {
						  cmd            : 'imagefile'
						, imagefile      : urlname
						, base64webradio : name +'^^'+ sampling + "\n"+ thumb +"\n"+ newimg
					}, function() {
						webRadioCoverartSet( newimg, thumb );
					} );
				} else {
					var formData = new FormData();
					formData.append( 'cmd', 'imagefile' );
					formData.append( 'imagefile', urlname );
					formData.append( 'base64webradio', name +'^^'+ $( '#sampling' ).text() + "\n"+ thumb +"\n" );
					formData.append( 'file', file );
					$.ajax( {
						  url         : cmdphp
						, type        : 'POST'
						, data        : formData
						, processData : false  // no - process the data
						, contentType : false  // no - contentType
						, success     : function() {
							webRadioCoverartSet( $imgnew.prop( 'src' ), thumb );
						}
					} );
				}
			} );
		}
	}
	if ( ( G.playback && !$( '#coverart' ).hasClass( 'vu' ) )
		|| ( G.library && !G.list.li.find( '.lib-icon' ).hasClass( 'fa' ) )
	) {
		infojson.buttonlabel = '<i class="fa fa-webradio"></i>Reset';
		infojson.buttonwidth = 1;
		infojson.button      = function() {
			bash( "sed -i '2,$ d' '/srv/http/data/webradios/"+ urlname +"'" );
			if ( G.playback ) {
				$( '.edit' ).remove();
				$( '#coverart' )
					.prop( 'src', G.status.state === 'play' ? vu : vustop )
					.css( { 'border-radius': '18px', opacity: '' } );
			} else {
				G.list.li.find( 'img' ).remove();
				G.list.li.find( '.li1' ).before( '<i class="fa fa-webradio lib-icon" data-target="#menu-webradio"></i>' );
			}
		}
	}
	bash( "sed -n '3 p' '/srv/http/data/webradios/"+ urlname +"'", function( base64 ) {
		if ( base64 ) {
			infojson.message = '<img class="imgold" src="'+ base64 +'">';
		} else {
			infojson.message = '<img src="'+ vu +'" style="border-radius: 9px">';
		}
		infojson.message += '<p class="imgname"><w>'+ name +'</w></p>';
		
		info( infojson );
	} );
}
function webRadioCoverartSet( newimg, thumb ) {
	if ( G.playback ) {
		G.status.coverart = newimg;
		$( '.edit' ).remove();
		$( '#coverart' )
			.prop( 'src', newimg )
			.css( { 'border-radius': '', opacity: '' } );
	} else {
		G.list.li.find( '.lib-icon' ).remove();
		G.list.li.find( '.liname' ).after( '<img class="radiothumb lib-icon" src="'+ thumb +'" data-target="#menu-webradio">' );
	}
}
function webRadioDelete() {
	var name = G.list.name;
	var img = G.list.li.find( 'img' ).prop( 'src' );
	var url = G.list.path;
	var urlname = url.toString().replace( /\//g, '|' );
	info( {
		  icon    : 'webradio'
		, title   : 'Delete WebRadio'
		, width   : 500
		, message : ( img ? '<br><img src="'+ img +'">' : '<br><i class="fa fa-webradio bookmark"></i>' )
				   +'<br><w>'+ name +'</w>'
				   +'<br>'+ url
		, oklabel : '<i class="fa fa-minus-circle"></i>Delete'
		, okcolor : '#bb2828'
		, ok      : function() {
			G.list.li.remove();
			if ( !$( '#lib-list li' ).length ) $( '#button-library' ).click();
			bash( ['webradiodelete', url ] );
		}
	} );
}
function webRadioEdit() {
	var name = G.list.name;
	var img = G.list.li.find( 'img' ).prop( 'src' );
	var url = G.list.path;
	var urlname = url.toString().replace( /\//g, '|' );
	info( {
		  icon         : 'webradio'
		, title        : 'Edit WebRadio'
		, width        : 500
		, message      : ( img ? '<img src="'+ img +'">' : '<i class="fa fa-webradio bookmark"></i>' )
		, textlabel    : [ 'Name', 'URL' ]
		, textvalue    : [ name, url ]
		, textrequired : [ 0, 1 ]
		, boxwidth     : 'max'
		, oklabel      : '<i class="fa fa-save"></i>Save'
		, ok           : function() {
			var newname = $( '#infoTextBox' ).val();
			var newurl = $( '#infoTextBox1' ).val().toString().replace( /\/\s*$/, '' ); // omit trailling / and space
			if ( newname !== name || newurl !== url ) {
				bash( [ 'webradioedit', url, newname, newurl ], function( data ) {
					data ? webRadioExists( data, url ) : $( '#mode-webradio' ).click();
				} );
			}
		}
	} );
}
function webRadioExists( data, url ) {
	var nameimg = data.split( "\n" );
	var newname = nameimg[ 0 ].split( '^^' )[ 0 ];
	info( {
		  icon    : 'webradio'
		, title   : 'Add WebRadio'
		, message : ( nameimg[ 2 ] ? '<img src="'+ nameimg[ 2 ] +'">' : '<i class="fa fa-webradio bookmark"></i>' )
				   +'<br>'+ newname
				   +'<br><br>URL: <w>'+ url +'</w>'
				   +'<br>Already exists.'
		, ok      : function() {
			webRadioNew( newname, url );
		}
	} );
}
function webRadioNew( name, url ) {
	info( {
		  icon         : 'webradio'
		, title        : 'Add WebRadio'
		, width        : 500
		, message      : 'Add new WebRadio:'
		, textlabel    : [ 'Name', 'URL' ]
		, textvalue    : [ ( name || '' ), ( url || '' ) ]
		, textrequired : [ 0, 1 ]
		, footer       : '( *.m3u or *.pls is applicable)'
		, boxwidth     : 'max'
		, ok           : function() {
			var newname = $( '#infoTextBox' ).val().toString().replace( /\/\s*$/, '' ); // omit trailling / and space
			var url = $( '#infoTextBox1' ).val();
			bash( [ 'webradioadd',newname,url ], function( data ) {
				if ( data == -1 ) {
					info( {
						  icon    : 'webradio'
						, title   : 'Add WebRadio'
						, message : '<wh>'+ url +'</wh><br>contains no valid URL.'
						, ok      : function() {
							webRadioNew( newname, url );
						}
					} );
				} else if ( data ) {
					webRadioExists( data, url );
				}
				bannerHide();
			} );
			if ( [ 'm3u', 'pls' ].indexOf( url.slice( -3 ) ) ) notify( 'WebRadio', 'Add ...', 'webradio blink',  -1 );
		}
	} );
}
//----------------------------------------------------------------------------------------------
$( '.contextmenu a' ).click( function( e ) {
	var submenu = $( e.target ).hasClass( 'submenu' );
	if ( submenu ) {
		var $this = $( e.target );
	} else {
		var $this = $( this );
	}
	var cmd = $this.data( 'cmd' );
	$( '.menu' ).addClass( 'hide' );
	$( 'li.updn' ).removeClass( 'updn' );
	// playback //////////////////////////////////////////////////////////////
	if ( [ 'play', 'pause', 'stop' ].indexOf( cmd ) !== -1 ) {
		if ( cmd === 'play' ) {
			$( '#pl-list li' ).eq( G.list.li.index() ).click();
		} else {
			$( '#'+ cmd ).click();
		}
		return
	}
	
	if ( cmd === 'tag' ) {
		tagEditor();
		return
	} else if ( cmd === 'update' ) {
		G.list.li.find( '.lib-icon' )
			.removeClass( 'fa-folder' )
			.addClass( 'fa-refresh-library blink' );
		if ( G.list.path.slice( -3 ) === 'cue' ) G.list.path = G.list.path.substr( 0, G.list.path.lastIndexOf( '/' ) )
		bash( [ 'mpcupdate', G.list.path ] );
	} else if ( cmd === 'remove' ) {
		G.contextmenu = 1;
		setTimeout( function() { G.contextmenu = 0 }, 500 );
		bash( 'mpc del '+ (  G.list.li.index() + 1 ) );
	} if ( cmd === 'replace' ) {
		G.plreplace = 1;
	} else if ( cmd === 'savedpladd' ) {
		info( {
			  icon    : 'list-ul'
			, title   : 'Add to playlist'
			, message : 'Open target playlist to add:'
					   +'<br><w>'+ G.list.name +'</w>'
			, ok      : function() {
				G.pladd.index = G.list.li.index();
				G.pladd.name = G.list.name;
				$( '#button-pl-open' ).click();
			}
		} );
	} else if ( cmd === 'savedplremove' ) {
		var plname = $( '#pl-path .lipath' ).text();
		list( {
			  cmd    : 'edit'
			, name   : plname
			, remove : G.list.li.index()
		} );
		G.list.li.remove();
//	} else if ( cmd === 'saveradio' ) {
//		webRadioSave( '', G.list.path );
	} else if ( cmd === 'similar' ) {
		notify( 'Playlist - Add Similar', 'Fetch similar list ...', 'lastfm blink', -1 );
		var url = 'http://ws.audioscrobbler.com/2.0/?method=track.getsimilar'
				+'&artist='+ encodeURI( G.list.artist )
				+'&track='+ encodeURI( G.list.name )
				+'&api_key='+ G.apikeylastfm
				+'&format=json'
				+'&autocorrect=1';
		$.post( url, function( data ) {
			var title = 'Playlist - Add Similar';
			if ( 'error' in data || !data.similartracks.track.length ) {
				notify( title, 'Track not found.', 'lastfm' );
			} else {
				var val = data.similartracks.track;
				var iL = val.length;
				var similar = '';
				for ( i = 0; i < iL; i++ ) {
					similar += val[ i ].artist.name +'\n'+ val[ i ].name +'\n';
				}
				notify( title, 'Find similar tracks from Library ...', 'library blink',  -1 );
				bash( [ 'mpcsimilar', similar ], function( count ) {
					updatePlaylist();
					setButtonControl()
					notify( title, count +' tracks added.', 'library' );
				} );
			}
		}, 'json' );
	} else if ( cmd === 'exclude' ) {
		var path = G.list.path.split( '/' );
		G.local = 1;
		setTimeout( function() { G.local = 0 }, 2000 );
		bash( [ 'ignoredir', G.list.path ], function() {
			G.list.li.remove();
		} );
		notify( 'Exclude Directory', '<wh>'+ dir +'</wh> excluded from database.', 'folder' );
	}
	if ( [ 'savedpladd', 'savedplremove', 'similar', 'tag', 'remove', 'update' ].indexOf( cmd ) !== -1 ) return
	
	// functions with dialogue box ////////////////////////////////////////////
	var contextFunction = {
		  bookmark   : bookmarkNew
		, plrename   : playlistRename
		, pldelete   : playlistDelete
		, thumbnail  : updateThumbnails
		, wrcoverart : webRadioCoverart
		, wrdelete   : webRadioDelete
		, wredit     : webRadioEdit
	}
	if ( cmd in contextFunction ) {
		contextFunction[ cmd ]();
		return
	}
	
	// replaceplay|replace|addplay|add //////////////////////////////////////////
	var webradio = G.list.path.slice( 0, 4 ) === 'http';
	var path = G.list.path;
	var mpccmd;
	// must keep order otherwise replaceplay -> play, addplay -> play
	var mode = cmd.replace( /replaceplay|replace|addplay|add/, '' );
	if ( [ 'album', 'artist', 'composer', 'genre' ].indexOf( G.list.mode ) !== -1 ) {
		var artist = G.list.artist;
		mpccmd = [ 'mpcfindadd', G.list.mode, path ];
		if ( artist ) mpccmd.push( 'artist', artist );
	} else if ( !mode ) {
		if ( path.slice( -4 ) === '.cue' ) {
			if ( G.list.track ) { // only cue has data-track
				// individual with 'mpc --range=N load file.cue'
				mpccmd = [ 'mpcloadrange', ( G.list.track - 1 ), path ];
			} else {
				mpccmd = [ 'mpcload', path ];
			}
		} else if ( G.list.singletrack || webradio ) { // single track
			mpccmd = [ 'mpcadd', path ];
		} else { // directory or album
			mpccmd = [ 'mpcls', path ];
		}
	} else if ( mode === 'wr' ) {
		cmd = cmd.slice( 2 );
		mpccmd = [ 'mpcadd', path ];
	} else if ( mode === 'pl' ) {
		cmd = cmd.slice( 2 );
		if ( G.library ) {
			mpccmd = [ 'mpcload', path ];
		} else { // saved playlist
			var play = cmd.slice( -1 ) === 'y' ? 1 : 0;
			var replace = cmd.slice( 0, 1 ) === 'r' ? 1 : 0;
			if ( replace && G.display.plclear && G.status.playlistlength ) {
				infoReplace( function() {
					playlistLoad( path, play, replace );
				} );
			} else {
				playlistLoad( path, play, replace );
			}
			return
		}
	}
	
	cmd = cmd.replace( /album|artist|composer|genre/, '' );
	var sleep = webradio ? 1 : 0.2;
	var contextCommand = {
		  add         : mpccmd
		, addplay     : mpccmd.concat( [ 'addplay', sleep ] )
		, replace     : mpccmd.concat(  'replace' )
		, replaceplay : mpccmd.concat( [ 'replaceplay', sleep ] )
	}
	if ( cmd in contextCommand ) {
		var command = contextCommand[ cmd ];
		if ( [ 'add', 'addplay' ].indexOf( cmd ) !== -1 ) {
			var msg = 'Add to Playlist'+ ( cmd === 'add' ? '' : ' and play' )
			addReplace( cmd, command, msg );
		} else {
			var msg = 'Replace playlist'+ ( cmd === 'replace' ? '' : ' and play' );
			if ( G.display.plclear && G.status.playlistlength ) {
				infoReplace( function() {
					addReplace( cmd, command, msg );
				} );
			} else {
				addReplace( cmd, command, msg );
			}
		}
	}
} );
