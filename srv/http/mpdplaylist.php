<?php
// current, delete, edit, get, list, load, save
if ( isset( $_POST[ 'current' ] ) || $argv[ 1 ] === 'current' ) {
	$lists = playlist();
	$array = htmlPlaylist( $lists );
	echo json_encode( $array );
	
} else if ( isset( $_POST[ 'delete' ] ) ) {
	unlink( '/srv/http/data/playlists/'.$_POST[ 'delete' ] );

} else if ( isset( $_POST[ 'edit' ] ) ) {
	$name = $_POST[ 'edit' ];
	$file = '/srv/http/data/playlists/'.$name;
	$contents = file_get_contents( $file );
	$list = json_decode( $contents );
	
	$remove = $_POST[ 'remove' ] ?? null;
	$index = $_POST[ 'index' ] ?? null;
	if ( $remove !== null ) { // remove
		array_splice( $list, $remove, 1 );
	} else if ( $index !== null ) { // insert
		$trackdata = playlistInfo( $index );
		$indextarget = $_POST[ 'indextarget' ];
		if ( $indextarget === 'first' ) {
			array_unshift( $list, $trackdata[ 0 ] );
		} else if ( $indextarget === 'last' ) {
			$list[] = $trackdata[ 0 ];
		} else {
			array_splice( $list, $indextarget, 0, $trackdata );
		}
	} else { // arrange
		$data = array_splice( $list, $_POST[ 'old' ], 1 );
		array_splice( $list, $_POST[ 'new' ], 0, $data );
	}
	$newlist = json_encode( $list, JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT );
	file_put_contents( $file, $newlist );
	pushstream( 'playlist', [ 'playlist' => $name ] );
	
} else if ( isset( $_POST[ 'get' ] ) ) {
	$name = str_replace( '"', '\"', $_POST[ 'get' ] );
	$lists = json_decode( file_get_contents( '/srv/http/data/playlists/'.$name ) );
	$array = htmlPlaylist( $lists, $name );
	echo json_encode( $array );
	
} else if ( isset( $_POST[ 'list' ] ) ) {
	$lists = array_slice( scandir( '/srv/http/data/playlists' ), 2 );
	$count = count( $lists );
	if ( !$count ) exit( '-1' );
	
	$each = ( object )[];
	foreach( $lists as $list ) {
		$each->name = $list;
		$each->sort = stripLeading( $list );
		$array[] = $each;
		unset( $each );
	}
	usort( $array, function( $a, $b ) {
		return strnatcmp( $a->sort, $b->sort );
	} );
	$html = '';
	foreach( $array as $each ) {
		$index = mb_substr( $each->sort, 0, 1, 'UTF-8' );
		$indexes[] = $index;
		$html.= '<li class="pl-folder" data-index="'.$index.'">'
					.'<i class="fa fa-list-ul pl-icon" data-target="#menu-playlist">'
					.'<a class="liname">'.$each->name.'</a></i>'
					.'<a class="lipath">'.$each->name.'</a></i>'
					.'<span class="plname">'.$each->name.'</span>'
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
	$counthtml = '<wh><i class="fa fa-microsd"></i></wh><span class="pl-title">PLAYLISTS</span>&emsp;'
				.'<whl id="pl-savedlist-count">'.number_format( $count ).'</whl>'
				.'<i class="fa fa-list-ul"></i>';
	echo json_encode( [
		  'html'      => $html
		, 'index'     => $indexbar
		, 'counthtml' => $counthtml
	] );
	
} else if ( isset( $_POST[ 'load' ] ) ) { // load saved playlist to current
	// load normal and individual cue tracks - use only file and track
	// 1. alternate cue <-> normal
	// 2. exec cumulative commands
	// 3. append commands while in the same type
	//   3.1  cue:
	//     change file extension to cue
	//     mpc --range=RANGE load mpd/path/file.cue (N = track# - 1)
	//     $RANGE = 'N0:N1'; - increment consecutive tracks to single command
	//     $RANGE = N;       - each track per command
	//   3.2  normal:
	//     echo -e $FILES | mpd add
	//     $FILES = 'mpd/path/file.ext\n'; - each track per line
	// 4. increment exec if cumulative commands reach limit to avoid errors
	
	if ( $_POST[ 'replace' ] ) exec( 'mpc clear' );
	
	$lines = file_get_contents( '/srv/http/data/playlists/'.$_POST[ 'load' ] );
	$lines = json_decode( $lines );
	$list = $range = $fileprev = '';
	$track0prev = $trackprev = $i = $j = 0;
	foreach( $lines as $line ) {
		$file = $line->file;
		if ( !empty( $line->Range ) ) { // cue
			if ( $list ) { // alternate exec cumulative commands
				exec( 'echo -e "'.rtrim( $list, '\n' ).'" | mpc add' );
				$list = '';
				$i = 0;
			}
			$file = substr_replace( $file , 'cue', strrpos( $file , '.' ) + 1 ); // replace ext
			$track = $line->Track;
			if ( $track === $trackprev + 1 && $file === $fileprev ) {
				$track0 = $track0prev;
				$ranges = explode( ';', $range );
				array_pop( $ranges );
				$range = implode( ';', $ranges );
			} else {
				$track0 = $track - 1;
			}
			$rangetrack = $track0 === $track - 1 ? $track0 : "$track0:$track";
			$range.= ';mpc --range='.$rangetrack.' load "'.$file.'"';
			$track0prev = $track0;
			$trackprev = $track;
			$fileprev = $file;
			$j++;
			if ( $j === 100 ) { // limit exec commands length
				exec( ltrim( $range, ';' ) );
				$range = $fileprev = '';
				$track0prev = $trackprev = 0;
				$j = 0;
			}
		} else {
			if ( $range ) { // alternate exec cumulative commands
				exec( ltrim( $range, ';' ) );
				$range = $fileprev = '';
				$track0prev = $trackprev = $j = 0;
			}
			$list.= $file.'\n';
			$i++;
			if ( $i === 500 ) { // limit list commands length
				exec( 'echo -e "'.rtrim( $list, '\n' ).'" | mpc add' );
				$list = '';
				$i = 0;
			}
		}
	}
	if( $list ) exec( 'echo -e "'.rtrim( $list, '\n' ).'" | mpc add' );
	if ( $range ) exec( ltrim( $range, ';' ) );
	
	if ( $_POST[ 'play' ] ) exec( 'sleep 1; mpc play' );
	echo exec( 'mpc playlist | wc -l' );
	
} else if ( isset( $_POST[ 'save' ] ) || $argv[ 1 ] === 'save' ) {
	$name = !count( $argv ) ? $_POST[ 'save' ] : $argv[ 2 ];
	$file = '/srv/http/data/playlists/'.$name;
	if ( file_exists( $file ) ) exit( '-1' );
	
	$list = json_encode( playlistInfo(), JSON_NUMERIC_CHECK | JSON_PRETTY_PRINT );
	file_put_contents( $file, $list );
	pushstream( 'playlist', [ 'playlist' => 'save' ] );
	
}

//-------------------------------------------------------------------------------------
function htmlPlaylist( $lists, $name = '' ) {
	$count = count( $lists );
	if ( !$count ) exit( '-1' );
	
	$countradio = 0;
	$countsong = 0;
	$counttime = 0;
	$i = 0;
	$html = '';
	foreach( $lists as $list ) {
		$sec = 0;
		$i++;
		$http = substr( $list->file, 0, 4 ) === 'http';
		$upnp = substr( $list->file, 7, 3 ) === '192';
		if ( !$http || $upnp ) {
			$sec = HMS2Second( $list->Time );
			$track = preg_replace( '/^#*0*/', '', $list->Track );
			$li2 = $i.' • ';
			if ( $track ) $li2.= $track.' - ';
			$artist = $list->Artist ?: $list->Albumartist;
			if ( $artist ) $li2.= '<a class="artist">'.$artist.'</a> - ';
			if ( $list->Album ) $li2.= $list->Album;
			if ( !$artist && !$list->Album ) $li2.= $list->file;
			$datatrack = '';
			$file = $list->file;
			if ( isset( $list->Range ) && $list->Range ) {
				$datatrack = 'data-track="'.$track.'"'; // for cue in edit
				$file = substr_replace( $file , '.cue', strrpos( $file , '.' ) );
			}
			$title = $list->Title ?: pathinfo( $list->file, PATHINFO_FILENAME );
			$html.= '<li class="file" '.$datatrack.'>'
						.'<i class="fa fa-music pl-icon" data-target="#menu-filesavedpl"></i>'
						.'<a class="lipath">'.$file.'</a>'
						.'<span class="li1"><a class="name">'.$title.'</a>'
						.'<span class="duration"><a class="elapsed"></a>'
						.'<a class="time" data-time="'.$sec.'">'.$list->Time.'</a></span>'
						.'</span>'
						.'<span class="li2">'.$li2.'</span>'
					.'</li>';
			$countsong++;
			$counttime += $sec;
		} else {
			$stationname = $list->Name;
			$html.= '<li>'
						.'<i class="fa fa-webradio pl-icon'.( $stationname ? '' : ' wh' ).'" data-target="#menu-filesavedpl"></i>'
						.'<a class="lipath">'.$list->file.'</a>'
						.'<a class="liname">'.$stationname.'</a>'
						.'<span class="li1"><span class="radioname">'.$stationname.'</span><a class="song"></a><span class="duration"><a class="elapsed"></a></span></span>'
						.'<span class="li2">'.$i.' • <span class="radioname hide">'.$stationname.' • </span>'.$list->file.'</span>'
					.'</li>';
			$countradio++;
		}
	}
	$counthtml = $name ? '<a class="lipath">'.$name.'</a><span class="pl-title">&ensp;'.$name.'<gr> · </gr></span>' : '';
	$countradiohtml = $countradio ? '<i class="fa fa-webradio"></i><whl>'.$countradio.'</whl>' : '';
	if ( $countsong ) {
		$counthtml.= '<whl>'.number_format( $countsong ).'</whl><i class="fa fa-music"></i>'
					.'<grl id="pl-time" data-time="'.$counttime.'">'.second2HMS( $counttime ).'</grl>'.$countradiohtml;
		if ( !$countradio ) str_replace( 'grl', 'whl', $counthtml );
	} else if ( $countradio ) {
		$counthtml.= $countradiohtml;
	}
	return [ 'html' => $html, 'counthtml' => $counthtml, 'playlistlength' => $count ];
}
function playlist() { // current playlist
	$f = [ 'album', 'albumartist', 'artist', 'file', 'time', 'title', 'track' ];
	$format = '%'.implode( '%^^%', $f ).'%';
	exec( 'mpc playlist -f '.$format, $lists ); // avoid json literal issue with escape double quotes
	if ( !count( $lists ) ) exit( '-1' );
	
	$fL = count( $f );
	foreach( $lists as $list ) {
		$list = explode( '^^', $list );
		$each = ( object )[];
		for ( $i = 0; $i < $fL; $i++ ) {
			$key = $f[ $i ];
			if ( $key !== 'file' ) $key = ucfirst( $key ); // mpd protocol keys
			$each->$key = $list[ $i ];
		}
		if ( substr( $each->file, 0, 4 ) === 'http' ) {
			$radiofile = '/srv/http/data/webradios/'.str_replace( '/', '|', $each->file );
			$name = file( $radiofile )[ 0 ];
			$each->Name = explode( '^^', $name )[ 0 ];
		}
		$array[] = $each;
	}
	return $array;
}
function playlistInfo( $index = '' ) { // mpd protocol
	// 2nd sleep: varied with length, 1000track/0.1s
	exec( '{ sleep 0.05'
		.'; echo playlistinfo '.$index
		.'; sleep $( awk "BEGIN { printf \"%.1f\n\", $( mpc playlist | wc -l ) / 10000 + 0.1 }" ); }'
		.' | telnet 127.0.0.1 6600 2> /dev/null'
		.' | grep "^Album:\|^Artist\|^file\|^Range\|^Time\|^Title\|^Track"'
		.' |  sed "s/^\(file:\)/---\n\1/"' // file: as start track set
		, $lists );
	if ( !count( $lists ) ) exit( '-1' );
	
	array_shift( $lists ); // remove 1st track delimiter
	$lists[] = '---';      // append last track delimiter
	$each = ( object )[];
	foreach( $lists as $line ) {
		if ( $line === '---' ) {
			if ( substr( $each->file, 0, 4 ) === 'http' ) {
				$urlname = str_replace( '/', '|', $each->file );
				$name = file( '/srv/http/data/webradios/'.$urlname )[ 0 ];
				$each->Name = explode( '^^', $name )[ 0 ];
				unset( $each->Title );
			}
			$array[] = $each;
			$each = ( object )[];
			continue;
		}
		$kv = explode( ': ', $line );
		$key = $kv[ 0 ];
		$val = $kv[ 1 ];
		$value = $key === 'Time' ? second2HMS( $val ) : $val;
		$each->$key = $value;
	}
	return $array;
}
function pushstream( $channel, $data ) {
	$ch = curl_init( 'http://127.0.0.1/pub?id='.$channel );
	curl_setopt( $ch, CURLOPT_HTTPHEADER, [ 'Content-Type:application/json' ] );
	curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $data, JSON_NUMERIC_CHECK ) );
	curl_exec( $ch );
	curl_close( $ch );
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
