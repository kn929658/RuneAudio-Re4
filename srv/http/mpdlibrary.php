<?php
/*
find, list, ls, search, track, webradio

Album
	album list: mpc list album
		album-artist list: mpc find -f %album%^^%artist% album
			- album list: again for albums with the same name as album-artist
			- track list: mpc find -f %*% album $album artist $artist
Artist
	artist list: mpc list artist
		album list: mpc find -f %artist%^^%album% artist $artist
			track list: mpc find -f %*% album $album artist $artist
AlbumArtist
	albumartist list: mpc list albumartist
		album list: mpc find -f %albumartist%^^%album% albumartist $albumartist
			track list: mpc find -f %*% album $album albumartist $albumartist
Composer
	composer list: mpc list composer
		album list: mpc find -f %composer%^^%album% composer composer
			track list: mpc find -f %*% album $album composer composer
Genre
	genre list: mpc list genre
		artist-album list: mpc find -f %artist%^^%album% genre $genre
			track list: mpc find -f %*% album $album artist $artist
File
		directory list: mpc ls -f %file% $path
			track list: mpc ls -f %*% $path
search
		track list: mpc search -f %*% any $keyword
*/
$query = $_POST[ 'query' ];
$mode = $_POST[ 'mode' ] ?? null;
$string = $_POST[ 'string' ] ?? null;
$formatall = [ 'album', 'albumartist', 'artist', 'composer', 'date', 'file', 'genre', 'time', 'title', 'track' ];
$f = $_POST[ 'format' ] ?? $formatall;
$format = '%'.implode( '%^^%', $f ).'%';
$indexarray = range( 'A', 'Z' );
$indexbar = '<a class="wh">#</a>';

if ( $query === 'find' ) {
	$format = str_replace( '%artist%', '[%artist%|%albumartist%]', $format );
	if ( is_array( $mode ) ) {
		exec( 'mpc find -f "'.$format.'" '.$mode[ 0 ].' "'.$string[ 0 ].'" '.$mode[ 1 ].' "'.$string[ 1 ].'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
			, $lists );
		if ( !count( $lists ) ) { // find with albumartist
			exec( 'mpc find -f "'.$format.'" '.$mode[ 0 ].' "'.$string[ 0 ].'" albumartist "'.$string[ 1 ].'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
			, $lists );
		}
	} else if ( $mode === 'album' ) {
		exec( 'mpc find -f "'.$format.'" album "'.$string.'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
			, $lists );                // multiple albums with the same name
		if ( count( $lists ) === 1 ) { // no other albums with the same name - track list
			$lists = []; // must be cleared otherwise appended by exec
			$f = $formatall; // set all fields for single matched album
			$format = '%'.implode( '%^^%', $f ).'%';
			exec( 'mpc find -f "'.$format.'" album "'.$string.'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
				, $lists );
		}
	} else {
		exec( 'mpc find -f "'.$format.'" '.$mode.' "'.$string.'" 2> /dev/null'." | awk 'NF && !a[$0]++'"
			, $lists);
	}
	if ( count( $f ) > 2 ) {
		$array = htmlTracks( $lists, $f );
	} else { // modes - album, artist, albumartist, composer, genre: 2 fields format
		$array = htmlFind( $mode, $lists, $f );
	}
	
} else if ( $query === 'list' ) {
	exec( 'mpc list '.$mode.' | awk NF'
		, $lists );
	$array = htmlList( $mode, $lists );
	
} else if ( $query === 'ls' ) {
	$dirs = exec( '/srv/http/bash/mpdls.sh "'.$string.'" count' );
	if ( $dirs  ) {
		exec( 'mpc ls -f %file% "'.$string.'" 2> /dev/null'
			, $lists );
		if ( !count( $lists ) ) exit( '-1' );
		
		foreach( $lists as $list ) {
			$dir = str_replace( $string.'/', '', $list );
			$each = ( object )[];
			$each->path = $list;
			$each->dir  = $dir;
			$each->sort = stripLeading( $dir );
			$array[] = $each;
		}
		usort( $array, function( $a, $b ) {
			return strnatcmp( $a->sort, $b->sort );
		} );
		$html = '';
		foreach( $array as $each ) {
			$icon = is_file( '/mnt/MPD/'.$each->path ) ? 'music' : 'folder';
			$index = mb_substr( $each->sort, 0, 1, 'UTF-8' );
			$indexes[] = $index;
			$html.= '<li data-mode="file" data-index="'.$index.'">'
						.'<a class="lipath">'.$each->path.'</a>'
						.'<i class="fa fa-'.$icon.' lib-icon" data-target="#menu-'.( $icon === 'folder' ? 'folder' : 'file' ).'"></i>'
						.'<span class="single">'.$each->dir.'</span>'
					.'</li>';
		}
		$indexes = array_keys( array_flip( $indexes ) );
		foreach( $indexarray as $i => $char ) {
			$white = in_array( $char, $indexes ) ? 'wh' : '';
			$half = $i % 2 ? ' half' : '';
			$indexbar.= '<a class="'.$white.$half.'">'.$char."</a>\n";
		}
		$array = [ 'html' => $html, 'index' => $indexbar ];
	} else {
		$f = $formatall; // set format for directory with files only - album view
		$format = '%'.implode( '%^^%', $f ).'%';
		// parse if cue|m3u,|pls files
		exec( 'mpc ls "'.$string.'" | grep ".cue$\|.m3u$\|.m3u8$\|.pls$"', $plfiles );
		if ( count( $plfiles ) ) {
			asort( $plfiles );
			$ext = end( explode( '.', $plfiles[ 0 ] ) );
			$lists = [];
			foreach( $plfiles as $file ) {
				exec( 'mpc -f "'.$format.'" playlist "'.$file.'"'
					, $lists ); // exec appends to existing array
			}
			$array = htmlTracks( $lists, $f, $ext, $file );
		} else {
			exec( 'mpc ls -f "'.$format.'" "'.$string.'" 2> /dev/null'
				, $lists );
			$array = htmlTracks( $lists, $f, $mode !== 'coverart' ? 'file' : '' );
		}
	}
	
} else if ( $query === 'search' ) {
	exec( 'mpc search -f "'.$format.'" any "'.$string.'" | awk NF'
		, $lists );
	$array = htmlTracks( $lists, $f, 'search', $string );
	
} else if ( $query === 'track' ) { // for tag editor
	$track = $_POST[ 'track' ] ?? '';
	$file = $_POST[ 'file' ];
	if ( $track ) { // cue
		if ( $track === 'cover' ) {
			$filter = 'head -1';
		} else {
			$filter = 'grep "\^\^'.$track.'"';
		}
		$lists = exec( 'mpc playlist -f "'.$format.'" "'.$file.'" | '.$filter );
		$array = explode( '^^', $lists );
	} else {
		if ( is_dir( '/mnt/MPD/'.$file ) ) {
			exec( 'mpc ls -f "'.$format.'" "'.$file.'"'
				, $lists );
			foreach( $lists as $list ) {
				$each = explode( '^^', $list );
				$artist[]   = $each[ 2 ];
				$composer[] = $each[ 3 ];
				$date[]     = $each[ 4 ];
				$genre[]    = $each[ 5 ];
				$array[]    = $each;
			}
			$array = $array[ 0 ];
			if ( count( array_unique( $artist ) )   > 1 ) $array[ 2 ] = '*';
			if ( count( array_unique( $composer ) ) > 1 ) $array[ 3 ] = '*';
			if ( count( array_unique( $date ) )     > 1 ) $array[ 3 ] = '*';
			if ( count( array_unique( $genre ) )    > 1 ) $array[ 4 ] = '*';
		} else {
			$lists = exec( 'mpc ls -f "'.$format.'" "'.$file.'"' );
			$array = explode( '^^', $lists );
			if ( isset( $_POST[ 'coverart' ] ) ) $array[] = shell_exec( '/srv/http/bash/getcover.sh "/mnt/MPD/'.$file.'"' );
		}
	}
	
} else if ( $query === 'webradio' ) {
	$dirwebradios = '/srv/http/data/webradios';
	$lists = array_slice( scandir( $dirwebradios ), 2 );
	if ( !count( $lists ) ) exit( '-1' );
	foreach( $lists as $list ) {
		$nameimg = file( "$dirwebradios/$list", FILE_IGNORE_NEW_LINES ); // name, base64thumbnail, base64image
		$name = explode( '^^', $nameimg[ 0 ] )[ 0 ];
		$each = ( object )[];
		$each->name  = $name;
		$each->url   = str_replace( '|', '/', $list );
			if ( !empty( $nameimg[ 1 ] ) ) {
		$each->thumb = $nameimg[ 1 ];
			}
		$each->sort  = stripLeading( $name );
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$indexes[] = mb_substr( $each->sort, 0, 1, 'UTF-8' );
		if ( empty( $each->thumb ) ) {
			$iconhtml = '<i class="fa fa-webradio lib-icon" data-target="#menu-webradio"></i>';
		} else {
			$iconhtml = '<img class="radiothumb lib-icon" src="'.$each->thumb.'" onerror="imgError(this);" data-target="#menu-webradio">';
		}
		$html.= '<li class="file">'
					.'<a class="lipath">'.$each->url.'</a>'
					.'<a class="liname">'.$each->name.'</a>'
					.$iconhtml
					.'<span class="li1">'.$each->name.'</span>'
					.'<span class="li2">'.$each->url.'</span>'
				.'</li>';
	}
	$indexes = array_keys( array_flip( $indexes ) );
	foreach( $indexarray as $i => $char ) {
		$white = in_array( $char, $indexes ) ? 'wh' : '';
		$half = $i % 2 ? ' half' : '';
		$indexbar.= '<a class="'.$white.$half.'">'.$char."</a>\n";
	}
	$array = [ 'html' => $html, 'index' => $indexbar ];
}

echo json_encode( $array );

//-------------------------------------------------------------------------------------
function htmlFind( $mode, $lists, $f ) { // non-file 'find' command
	if ( !count( $lists ) ) exit( '-1' );
	
	$fL = count( $f );
	foreach( $lists as $list ) {
		$list = explode( '^^', $list ); // album^^artist 
		$sort = in_array( $mode, [ 'artist', 'albumartist' ] ) ? $list[ 0 ] : $list[ 1 ]; // sort by artist
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key = $f[ $i ];
			$each->$key = $list[ $i ];
			$each->sort = stripLeading( $sort );
		}
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$key0 = $f[ 0 ];
		$key1 = $f[ 1 ];
		$val0 = $each->$key0;
		$val1 = $each->$key1;
		$index = mb_substr( $each->sort, 0, 1, 'UTF-8' );
		$indexes[] = $index;
		if ( in_array( $mode, [ 'artist', 'albumartist' ] ) ) { // display as artist - album
			$name = $fL > 1 ? $val0.'<gr> • </gr>'.$val1 : $val0;
		} else {
			$name = $fL > 1 ? $val1.'<gr> • </gr>'.$val0 : $val0;
		}
		if ( $name === '<gr> • </gr>' || !name ) continue;
		
		$html.= '<li data-mode="album" data-index="'.$index.'">'
					.'<a class="lipath">'.$val1.'</a>'
					.'<a class="liname">'.$val0.'</a>'
					.'<i class="fa fa-'.$mode.' lib-icon"></i>'
					.'<span class="single">'.$name.'</span>'
				.'</li>';
	}
	$indexes = array_keys( array_flip( $indexes ) );
	$indexarray = range( 'A', 'Z' );
	$indexbar = '<a class="wh">#</a>';
	foreach( $indexarray as $i => $char ) {
		$white = in_array( $char, $indexes ) ? 'wh' : '';
		$half = $i % 2 ? ' half' : '';
		$indexbar.= '<a class="'.$white.$half.'">'.$char."</a>\n";
	}
	return [ 'html' => $html, 'index' => $indexbar ];
}
function htmlList( $mode, $lists ) { // non-file 'list' command
	if ( !count( $lists ) ) exit( '-1' );
	
	foreach( $lists as $list ) {
		$sort = stripLeading( $list );
		$each = ( object )[];  // or: new stdClass()
		$each->$mode = $list;
		$each->sort  = $sort;
		$array[] = $each;
	}
	usort( $array, function( $a, $b ) {
		return strnatcmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$index = mb_substr( $each->sort, 0, 1, 'UTF-8' );
		$indexes[] = $index;
		$html.= '<li data-mode="'.$mode.'" data-index="'.$index.'">'
					.'<a class="lipath">'.$each->$mode.'</a>'
					.'<i class="fa fa-'.$mode.' lib-icon"></i>'
					.'<span class="single">'.$each->$mode.'</span>'
				.'</li>';
	}
	$indexes = array_keys( array_flip( $indexes ) ); // faster than array_unique
	$indexarray = range( 'A', 'Z' );
	$indexbar = '<a class="wh">#</a>';
	foreach( $indexarray as $i => $char ) {
		$white = in_array( $char, $indexes ) ? 'wh' : '';
		$half = $i % 2 ? ' half' : '';
		$indexbar.= '<a class="'.$white.$half.'">'.$char."</a>\n";
	}
	return [ 'html' => $html, 'index' => $indexbar ];
}
function htmlTracks( $lists, $f, $filemode = '', $string = '' ) { // track list - no sort ($string: cuefile or search)
	if ( !count( $lists ) ) exit( '-1' );
	
	$fL = count( $f );
	foreach( $lists as $list ) {
		$list = explode( '^^', $list );
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key = $f[ $i ];
			$each->$key = $list[ $i ];
		}
		$array[] = $each;
	}
	$each0 = $array[ 0 ];
	$file0 = $each0->file;
	$litime = 0;
	$coverart = htmlspecialchars( exec( '/srv/http/bash/getcover.sh "/mnt/MPD/'.str_replace( '"', '\"', $file0 ).'"' ) );
	$nocover = '';
	if ( !$coverart ) {
		$coverart = '/assets/img/cover.'.( time() ).'.svg';
		$nocover = ' nocover';
	}
	
	$searchmode = $filemode === 'search';
	$cue = $filemode === 'cue';
	$i = 0;
	$html = '';
	foreach( $array as $each ) {
		$litime += HMS2second( $each->time );
		$title = $each->title;
		if ( $cue ) {
			$file = $string;
			$datatrack = 'data-track="'.$each->track.'"';
		} else {
			$file = $each->file;
			$datatrack = '';
		}
		if ( $searchmode ) {
			$title = preg_replace( "/($string)/i", '<bl>$1</bl>', $title );
			$name = $each->artist.' - '.$each->album;
			$trackname = preg_replace( "/($string)/i", '<bl>$1</bl>', $name );
		} else {
			$trackname = basename( $file );
		}
		if ( !$title ) $title = pathinfo( $file, PATHINFO_FILENAME );
		$li0 = $i || $searchmode ? '' : ' class="track1"';
		$i++;
		$html.= '<li data-mode="file" '.$datatrack.$li0.'>'
					.'<a class="lipath">'.$file.'</a>'
					.'<i class="fa fa-music lib-icon" data-target="#menu-file"></i>'
					.'<span class="li1">'.$title.'<span class="time">'.$each->time.'</span></span>'
					.'<span class="li2">'.$i.' • '.$trackname.'</span>'
				.'</li>';
	}
	if ( $searchmode ) return [ 'html' => $html, 'count' => count( $array ) ];
	
	if ( $each0->albumartist ) {
		$artist = $each0->albumartist;
		$icon = 'albumartist';
	} else {
		$artist = $each0->artist;
		$icon = 'artist';
	}
	$dir = dirname( $file0 );
	$coverhtml.= '<li data-mode="file" class="licover">'
			.'<a class="lipath">'.( $cue ? $file : $dir ).'</a>'
			.'<div class="licoverimg'.$nocover.'"><img src="'.$coverart.'"></div>'
			.'<div class="liinfo">'
			.'<div class="lialbum">'.$each0->album.'</div>'
			.'<div class="liartist"><i class="fa fa-'.$icon.'"></i>'.$artist.'</div>';
		if ( $each0->composer ) {
	$coverhtml.= '<div class="licomposer"><i class="fa fa-composer"></i>'.$each0->composer.'</div>';
		}
		if ( $each0->genre ) {
	$coverhtml.= '<span class="ligenre"><i class="fa fa-genre"></i>'.$each0->genre.'</span>&emsp;';
		}
		if ( $each0->date ) {
	$coverhtml.= '<span class="lidate"><i class="fa fa-date"></i>'.$each0->date.'</span>';
		}
		if ( $each0->genre || $each0->date ) {
	$coverhtml.= '<br>';
		}
		if ( !$filemode ) {
	$coverhtml.= '<div class="liinfopath"><i class="fa fa-folder"></i>'.str_replace( '\"', '"', $dir ).'</div>';
		}
	$coverhtml.= '<i class="fa fa-music lib-icon" data-target="#menu-folder"></i>'.( count( $array ) )
				.'<gr> • </gr>'.second2HMS( $litime )
				.'<gr> • </gr>'.strtoupper( pathinfo( $file0, PATHINFO_EXTENSION ) );
		$plfile = exec( 'mpc ls "'.$dir.'" 2> /dev/null | grep ".cue$\|.m3u$\|.m3u8$\|.pls$"' );
		if ( $plfile ) {
	$coverhtml.= '&emsp;<i class="fa fa-list-ul"></i><gr>'.pathinfo( $plfile, PATHINFO_EXTENSION ).'</gr>';
		}
	$coverhtml.= '</div></li>';
	
	return [ 'html' => $coverhtml.$html ];
}
function HMS2second( $time ) {
	$HMS = explode( ':', $time );
	$count = count( $HMS );
	switch( $count ) {
		case 1: return $HMS[ 0 ]; break;
		case 2: return $HMS[ 0 ] * 60 + $HMS[ 1 ]; break;
		case 3: return $HMS[ 0 ] * 60 * 60 + $HMS[ 1 ] * 60 + $HMS[ 0 ]; break;
	}
}
function second2HMS( $second ) {
	$hh = floor( $second / 3600 );
	$mm = floor( ( $second % 3600 ) / 60 );
	$ss = $second % 60;
	
	$hh = $hh ? $hh.':' : '';
	$mm = $hh ? ( $mm > 9 ? $mm.':' : '0'.$mm.':' ) : ( $mm ? $mm.':' : '' );
	$ss = $mm ? ( $ss > 9 ? $ss : '0'.$ss ) : $ss;
	return $hh.$mm.$ss;
}
function stripLeading( $string ) {
	$names = strtoupper( strVal( $string ) ); // strVal make all as string for strtoupper
	return preg_replace(
		  [ '/^A\s+|^AN\s+|^THE\s+|[^\w\p{L}\p{N}\p{Pd} ~]/u',
			'/\s+|^_/'
		  ]
		, [ '',  // strip articles | non utf-8 normal alphanumerics | tilde(blank data)
			'-'  // fix: php strnatcmp ignores spaces | sort underscore to before 0
		  ]
		, $names
	);
}
