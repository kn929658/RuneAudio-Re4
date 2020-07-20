<?php
$sudo = '/usr/bin/sudo ';
$sudobin = $sudo.'/usr/bin/';
$dirbash = '/srv/http/bash/';
$dirdata = '/srv/http/data/';
$dirbookmarks = $dirdata.'bookmarks/';
$dirsystem = $dirdata.'system/';
$dirtmp = $dirdata.'tmp/';
$dirwebradios = $dirdata.'webradios/';

switch( $_POST[ 'cmd' ] ) {

case 'sh': // multiple commands / scripts: no pre-escaped characters - js > php > bash
	$sh = $_POST[ 'sh' ];                                // 1 - get js array
	$script = '/srv/http/bash/'.array_shift( $sh ).' "'; // 2 - extract script from 1st element
	$script.= escape( implode( "\n", $sh ) ).'"';        // 3 - convert array to multi-line string and escape ` "
	echo shell_exec( $sudo.$script );                    // 4 - pass string to bash > convert each line to each args
	break;
case 'bash': // single / one-line command - return string
	$cmd = $_POST[ 'bash' ];
	echo shell_exec( $cmd[ 0 ] === '/' ? $sudo.$cmd : $sudobin.$cmd );
	break;
case 'exec': // single / one-line command - return array of lines to js
	exec( $sudobin.$_POST[ 'exec' ], $output, $std );
	echo json_encode( $output );
	break;
case 'backuprestore':
	$type = $_POST[ 'backuprestore' ];
	$scriptfile = $dirbash.'backup-restore.sh ';
	if ( $type === 'backup' ) {
		exec( $sudo.$scriptfile.'backup' );
		echo 'ready';
	} else if ( $type === 'restore' ) {
		if ( $_FILES[ 'file' ][ 'error' ] == UPLOAD_ERR_OK ) {
			$ext = pathinfo( $_FILES[ 'file' ][ 'name' ], PATHINFO_EXTENSION );
			$backupfile = $dirtmp.'backup.'.$ext;
			move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $backupfile ); // full path
			exec( $sudo.$scriptfile.'restore '.$ext );
			$reboot = @file_get_contents( '/tmp/reboot' );
			echo $reboot ?: 'restored';
		}
	} else {
		exec( $sudo.$scriptfile.$type );
	}
	break;
case 'bookmarks':
	$name = $_POST[ 'bookmarks' ];
	$path = $_POST[ 'path' ];
	$data[ 'path' ] = $path; // for pushstream
	$pathname = str_replace( '/', '|', $path );
	$file = $dirbookmarks.$pathname;
	$fileorder = $dirsystem.'order';
	$order = json_decode( file_get_contents( $fileorder ) );
	if ( isset( $_POST[ 'delete' ] ) ) {
		array_diff( $order, [ $path ] );
	} else {
		$order[] = $path;
	}
	file_put_contents( $fileorder, json_encode( $order, JSON_PRETTY_PRINT ) );
	pushstream( 'order', $order );
	if ( isset( $_POST[ 'new' ] ) ) {
		$base64 = $_POST[ 'base64' ] ?? '';
		$html = '<div class="lib-mode bookmark">'
				.'<div class="mode mode-bookmark">'
				.'<a class="lipath">'.$path.'</a>';
		if ( $base64 ) {
			if ( $base64 === 'tmp' ) {
				rename( $dirtmp.'base64', $file );
				$html.='<img class="bkcoverart" src="'.file_get_contents( $file ).'">';
			} else if ( $base64 === 1 ) {
				$cover = cmdsh( [ 'coverartthumb', $path, 200 ] );
				file_put_contents( $file, $cover );
				$html.='<img class="bkcoverart" src="'.$cover.'">';
			} else {
				file_put_contents( $file, $base64 );
				$html.='<img class="bkcoverart" src="'.$base64.'">';
			}
		} else if ( isset( $_POST[ 'gif' ] ) ) {
			$giffile = $_POST[ 'gif' ];
			gifSave(
				  $file
				, $giffile
				, $_POST[ 'resize' ]
			);
			$html.='<img class="bkcoverart" src="'.preg_replace( '/gif$/', time().'.gif', $giffile ).'">';
		} else {
			file_put_contents( $file, $name );
			$html.='<i class="fa fa-bookmark"></i><div class="divbklabel"><span class="bklabel label" style="">'.$name.'</span></div>';
		}
		$data[ 'html' ] = $html.'</div></div>';
	} else if ( isset( $_POST[ 'delete' ] ) ) {
		unlink( $file );
		$data = [ 'type' => 'delete' ];
	} else if ( isset( $_POST[ 'rename' ] ) ) {
		file_put_contents( $file, $name );
		$data = [
			  'type' => 'rename'
			, 'name' => $name
		];
	}
	pushstream( 'bookmark', $data );
	break;
case 'displayget':
	$data = json_decode( file_get_contents( $dirsystem.'display' ) );
	$data->color = rtrim( @file_get_contents( $dirsystem.'color' ) ) ?: '200 100 35';
	$data->order = json_decode( file_get_contents( $dirsystem.'order' ) );
	$audiooutputfile = file_exists( $dirsystem.'usbdac' ) ? 'usbdac' : 'audio-output';
	$data->volumenone = cmdsh( [ 'volumenone', $audiooutputfile ] ) === 'none';
	echo json_encode( $data );
	break;
case 'displayset':
	$data = json_decode( $_POST[ 'displayset' ] );
	file_put_contents( $dirsystem.'display', json_encode( $data, JSON_PRETTY_PRINT ) );
	pushstream( 'display', $data );
	break;
case 'getbookmarks':
	$files = array_slice( scandir( $dirbookmarks ), 2 );
	if ( !count( $files ) ) $data = 0;
	
	foreach( $files as $file ) {
		$content = file_get_contents( $dirbookmarks.$file );
		$isimage = substr( $content, 0, 10 ) === 'data:image';
		if ( $isimage ) {
			$name = '';
			$coverart = $content;
		} else {
			$name = $content;
			$coverart = '';
		}
		$data[] = [
			  'name'     => $name
			, 'path'     => str_replace( '|', '/', $file )
			, 'coverart' => $coverart
		];
	}
	echo json_encode( $data );
	break;
case 'imagefile':
	$imagefile = $_POST[ 'imagefile' ];
	if ( isset( $_POST[ 'base64bookmark' ] ) ) {
		$imagefile = $dirbookmarks.str_replace( '/', '|', $imagefile );
		if ( !isset( $_FILES[ 'file' ] ) ) {
			file_put_contents( $imagefile, $_POST[ 'base64bookmark' ] );
		} else {
			if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
			
			gifSave(
				  $imagefile
				, $_FILES[ 'file' ][ 'tmp_name' ]
				, $_POST[ 'resize' ]
			);
		}
		exit;
	} else if ( isset( $_POST[ 'base64webradio' ] ) ) {
		$imagefile = $dirwebradios.$imagefile;
		if ( !isset( $_FILES[ 'file' ] ) ) {
			file_put_contents( $imagefile, $_POST[ 'base64webradio' ] );
		} else {
			if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
			
			$img = file_get_contents( $_FILES[ 'file' ][ 'tmp_name' ] );
			file_put_contents(
				  $imagefile
				, $_POST[ 'base64webradio' ].'data:image/gif;base64,'.base64_encode( $img )
			);
		}
		exit;
	} else if ( isset( $_POST[ 'bookmarkfile' ] ) ) { // # bookmark thumbnail
		$bookmarkfile = $_POST[ 'bookmarkfile' ];
		$thumbnail = cmdsh( [ 'coverartthumb', $imagefile, 200 ] );
		file_put_contents( $bookmarkfile, $thumbnail ? $thumbnail : $_POST[ 'label' ] );
		echo $thumbnail;
		exit;
	}
	
	// coverart or thumbnail
	$coverfile = isset( $_POST[ 'coverfile' ] );
	$srcfile = $_POST[ 'srcfile' ] ?? '';
	if ( $srcfile ) {
		cmdsh( [ 'filemove', $srcfile, $srcfile.'.backup' ] );
		if ( isset( $_POST[ 'remove' ] ) ) {
			echo cmdsh( [ 'coverartget', $imagefile ] );
			exit;
		}
	} else {
		unlink( $imagefile );
	}
	if ( isset( $_POST[ 'base64' ] ) ) {
		if ( !isset( $_FILES[ 'file' ] ) ) {
			$tmpfile = $dirtmp.'tmp.jpg';
			file_put_contents( $tmpfile, base64_decode( preg_replace( '/^.*,/', '', $_POST[ 'base64' ] ) ) ) || exit( '-1' );
			if ( !$coverfile ) $imagefile = substr( $imagefile, 0, -3 ).'jpg'; // if existing is 'cover.svg'
			cmdsh( [ 'filemove', $tmpfile, $imagefile ] );
			if ( substr( $imagefile, -3 ) === 'gif' ) unlink( substr( $imagefile, 0, -3 ).'gif' );
		} else {
			if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
			
			gifSave(
				  $imagefile
				, $_FILES[ 'file' ][ 'tmp_name' ]
				, $_POST[ 'resize' ] ?? false
			);
		}
	} else if ( isset( $_FILES[ 'file' ] ) && $_FILES[ 'file' ][ 'error' ] == UPLOAD_ERR_OK ) {
		cmdsh( [ 'filemove', $_FILES[ 'file' ][ 'tmp_name' ], $imagefile ] );
	}
	break;
case 'login':
	$passwordfile = $dirsystem.'password';
	$hash = file_get_contents( $passwordfile );
	if ( !password_verify( $_POST[ 'login' ], $hash ) ) die();
	
	if ( isset( $_POST[ 'pwdnew' ] ) ) {
		$hash = password_hash( $_POST[ 'pwdnew' ], PASSWORD_BCRYPT, [ 'cost' => 12 ] );
		echo file_put_contents( $passwordfile, $hash );
	} else {
		echo 1;
		session_start();
		$_SESSION[ 'login' ] = 1;
	}
	break;
case 'logout':
	session_start();
	session_destroy();
	break;
case 'screenoff':
	exec( 'DISPLAY=:0 '.$sudobin.'xset dpms force off' );
	break;
case 'setorder':
	$order = $_POST[ 'setorder' ]; 
	file_put_contents( $dirsystem.'order', json_encode( $order, JSON_PRETTY_PRINT ) );
	pushstream( 'order', $order );
	break;
case 'volume':
	$volume = $_POST[ 'volume' ];
	$current = $_POST[ 'current' ] ?? '';
	$filevolumemute = $dirsystem.'volumemute';
	if ( $volume !== 'setmute' ) { // set
		pushstream( 'volume', [ 'volume' => [ 'set', $volume ] ] );
		volumeIncrement( $volume, $current );
		@unlink( $filevolumemute );
	} else {
		if ( $current ) { // mute
			pushstream( 'volume', [ 'volume' => [ 'mute', $current ] ] );
			file_put_contents( $filevolumemute, $current );
			volumeIncrement( 0, $current );
		} else { // unmute
			$volume = file_get_contents( $filevolumemute );
			pushstream( 'volume', [ 'volume' => [ 'unmute', $volume ] ] );
			volumeIncrement( $volume, 0 );
			@unlink( $filevolumemute );
		}
	}
	break;
case 'webradios':
	$name = $_POST[ 'webradios' ].'^^Radio';
	$url = $_POST[ 'url' ];
	$urlname = str_replace( '/', '|', $url );
	$filewebradios = $dirwebradios.$urlname;
	if ( ( isset( $_POST[ 'new' ] ) || isset( $_POST[ 'save' ] ) ) 
		&& file_exists( $filewebradios )
	) {
		echo file_get_contents( $filewebradios );
		exit;
	}
	
	if ( isset( $_POST[ 'new' ] ) ) {
		$ext = pathinfo( $url, PATHINFO_EXTENSION );
		if ( $ext === 'm3u' ) {
			$url = exec( $sudobin.'curl -s "'.$url.'" | grep ^http | head -1' );
			if ( !$url ) exit( '-1' );
			
			$urlname = str_replace( '/', '|', $url );
		} else if ( $ext === 'pls' ) {
			$url = exec( $sudobin.'curl -s "'.$url.'" | grep ^File | head -1 | cut -d= -f2' );
			if ( !$url ) exit( '-1' );
			
			$urlname = str_replace( '/', '|', $url );
		}
		file_put_contents( $filewebradios, $name );
		$count = 1;
	} else if ( isset( $_POST[ 'edit' ] ) ) {
		$content = file( $filewebradios, FILE_IGNORE_NEW_LINES );
		$urlnamenew = str_replace( '/', '|', $_POST[ 'newurl' ] );
		if ( count( $content ) > 1 ) $name.= "\n".$content[ 1 ]."\n".$content[ 2 ];
		@unlink( $filewebradios );
		file_put_contents( $dirwebradios.$urlnamenew, $name ); // name, thumbnail, coverart
		$count = 0;
	} else if ( isset( $_POST[ 'delete' ] ) ) {
		unlink( $filewebradios );
		$count = -1;
	}
	pushstream( 'webradio', [ 'webradio' => $count ] );
	break;
}

function cmdsh( $sh ) {
	$script = '/usr/bin/sudo /srv/http/bash/cmd.sh "';
	$script.= escape( implode( "\n", $sh ) ).'"';
	return shell_exec( $script );
}
function escape( $string ) {
	return preg_replace( '/(["`])/', '\\\\\1', $string );
}
function gifSave( $imagefile, $tmpfile, $resize ) {
	$type = explode( '/', $imagefile )[ 4 ];
	if ( $type === 'coverart' ) {
		if ( substr( $imagefile, -3 ) !== 'gif' ) {
			unlink( $imagefile );
			$imagefile = substr( $imagefile, 0, -3 ).'gif';
		}
	}
	if ( $resize ) {
		pushstream( 'notify', [ 
			  'title' => 'Thumbnail'
			, 'text'  => 'Resize animated GIF ...'
			, 'icon'  => 'coverart blink'
			, 'delay' => -1
		] );
		cmdsh( [ 'imageresize', $tmpfile, $imagefile ] );
		if ( $type === 'bookmarks' ) {
			$img = file_get_contents( $imagefile );
			file_put_contents( $imagefile, 'data:image/gif;base64,'.base64_encode( $img ) );
		}
		pushstream( 'notify', [ 
			  'title' => 'Thumbnail'
			, 'text'  => 'Done'
			, 'icon'  => 'coverart'
		] );
	} else {
		move_uploaded_file( $tmpfile, $imagefile );
	}
}
function pushstream( $channel, $data ) {
	exec( $sudobin.'curl -s -X POST http://127.0.0.1/pub?id='.$channel." -d '".json_encode( $data, JSON_NUMERIC_CHECK )."'" );
}
function volumeIncrement( $volume, $current = '' ) {
	if ( !$current || abs( $volume - $current ) < 10 ) {
		exec( 'mpc volume '.$volume );
	} else {
		foreach( range( $current, $volume, 5 ) as $val ) {
			usleep( 0.2 * 1000000 );
			exec( 'mpc volume '.$val );
		}
		if ( $val !== $volume ) exec( 'mpc volume '.$volume );
	}
}