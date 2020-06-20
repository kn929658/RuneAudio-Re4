<?php
$sudo = '/usr/bin/sudo ';
$sudobin = '/usr/bin/sudo /usr/bin/';
$dirsystem = '/srv/http/data/system';
$dirwebradios = '/srv/http/data/webradios';

if ( isset( $_POST[ 'backuprestore' ] ) ) {
	$type = $_POST[ 'backuprestore' ];
	$backupfile = '/srv/http/data/tmp/backup.xz';
	if ( $type === 'backup' ) {
		exec( $sudobin.'bsdtar \
				--exclude "./system/version" \
				--exclude "./tmp" \
				-czf '.$backupfile.' \
				-C /srv/http data' );
		echo 'ready';
	} else if ( $type === 'restore' ) {
		if ( $_FILES[ 'file' ][ 'error' ] == UPLOAD_ERR_OK ) {
			move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $backupfile ); // full path
			exec( $sudo.'/srv/http/bash/data-restore.sh restore' );
			$reboot = @file_get_contents( '/tmp/reboot' );
			echo $reboot ?: 'restored';
		}
	} else {
		exec( $sudo.'/srv/http/bash/data-restore.sh '.$type );
	}

} else if ( isset( $_POST[ 'bash' ] ) ) {
	$bash = $_POST[ 'bash' ];
	$command = '';
	if ( !is_array( $bash ) ) $bash = [ $bash ];
	foreach( $bash as $cmd ) {
		if ( $cmd[ 0 ] === '/' ) {
			$command.= $sudo.$cmd.';';
		} else {
			$command.= $sudobin.$cmd.';';
		}
	}
	if ( isset( $_POST[ 'string' ] ) ) {
		echo shell_exec( $command );
		exit;
		
	} else {
		exec( $command, $output, $std );
	}
	if ( $std !== 0 && $std !== 3 ) { // systemctl status: inactive $std = 3
		echo -1;
	} else {
		echo json_encode( $output, JSON_NUMERIC_CHECK );
	}
	if ( isset( $_POST[ 'pushstream' ] ) ) pushstream( 'notify', $_POST[ 'pushstream' ] );
	
} else if ( isset( $_POST[ 'bookmarks' ] ) ) { // delete, new, rename
	$name = $_POST[ 'bookmarks' ];
	$path = $_POST[ 'path' ];
	$data[ 'path' ] = $path; // for pushstream
	$pathname = str_replace( '/', '|', $path );
	$file = '/srv/http/data/bookmarks/'.$pathname;
	$fileorder = $dirsystem.'/order';
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
				rename( '/srv/http/data/tmp/base64', $file );
				$html.='<img class="bkcoverart" src="'.file_get_contents( $file ).'">';
			} else if ( $base64 === 1 ) {
				$cover = exec( $sudo.'/srv/http/bash/getcover.sh "/mnt/MPD/'.$path.'" 200' );
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
	
} else if ( isset( $_POST[ 'coverart' ] ) ) {
	$coverart = exec( $sudo.'/srv/http/bash/getcover.sh "/mnt/MPD/'.$_POST[ 'coverart' ].'"' );
	if ( $coverart ) {
		echo $coverart;
		pushstream( 'coverart', [ 'coverart' => $coverart ] );
	}
	
} else if ( isset( $_POST[ 'displayget' ] ) ) {
	$data = json_decode( file_get_contents( $dirsystem.'/display' ) );
	$data->color = rtrim( @file_get_contents( $dirsystem.'/color' ) ) ?: '200 100 35';
	$data->order = json_decode( file_get_contents( $dirsystem.'/order' ) );
	$data->volumenone = exec( $sudobin.'sed -n "/$( cat /srv/http/data/system/audio-output )/,/mixer_type/ p" /etc/mpd.conf | tail -1 | cut -d\" -f2' ) === 'none' ? true : false;
	echo json_encode( $data );
	
} else if ( isset( $_POST[ 'displayset' ] ) ) {
	$data = json_decode( $_POST[ 'displayset' ] );
	file_put_contents( $dirsystem.'/display', json_encode( $data, JSON_PRETTY_PRINT ) );
	pushstream( 'display', $data );
	
} else if ( isset( $_POST[ 'getbookmarks' ] ) ) {
	$dirbookmarks = '/srv/http/data/bookmarks';
	$files = array_slice( scandir( $dirbookmarks ), 2 );
	if ( !count( $files ) ) $data = 0;
	
	foreach( $files as $file ) {
		$content = file_get_contents( $dirbookmarks.'/'.$file );
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
	
} else if ( isset( $_POST[ 'getbootlog' ] ) ) {
	$logfile = "/tmp/bootlog";
	if ( !file_exists( $logfile ) ) exec( $sudobin."journalctl -b | sed -n '1,/Startup finished.*kernel/ p' | grep -v 'is already registered' > ".$logfile ); // omit bcm8235 driver error
	$lines = file( $logfile );
	$errors = preg_grep( '/Error:.*|Under-voltage/', $lines );
	$errors = count( $errors ) ? "<red>Warnings:</red>\n".implode( $errors )."<hr>\n" : '';
	$finished = preg_replace( '/.*Startup.*in/' , 'Startup:', end( $lines ) )."\n";
	echo $errors.$finished.implode( $lines );
	
} else if ( isset( $_POST[ 'getjson' ] ) ) {
	$script = $_POST[ 'getjson' ];
	$output = exec( $sudo.$script );
	$array = json_decode( $output, true );
	echo json_encode( $array, JSON_NUMERIC_CHECK );
	
} else if ( isset( $_POST[ 'getnetctl' ] ) ) {
	exec( $sudobin.'netctl list', $profiles );
	if ( count( $profiles ) ) {
		$data = '';
		foreach( $profiles as $profile ) {
			$profile = ltrim( $profile );
			$data.= $profile."\n";
			$data.= "------------------------------\n";
			$data.= file_get_contents( '/etc/netctl/'.$profile )."\n";
		}
	} else {
		$data = '(none)';
	}
	echo $data;
	
} else if ( isset( $_POST[ 'getwifi' ] ) ) {
	//if ( exec( 'grep "^IP"
	$profile = shell_exec( "cat /etc/netctl/".$_POST[ 'getwifi' ]." | grep '^Address\|^Gateway\|^IP\|Security' | tr -d '\"' | sed 's/^/\"/ ;s/=/\":\"/; s/\$/\",/'" );
	exec( 'resolvectl status | sed -n "/wlan0/,/^\n\$/ p" | grep -A1 "DNS Servers:" | awk "{print \$NF}"', $dns );
	$dns= '"dns1":"'.$dns[ 0 ].'", "dns2":"'.$dns[ 1 ].'"';
	echo '{'.$profile.$dns'}';
	
} else if ( isset( $_POST[ 'imagefile' ] ) ) {
	$imagefile = $_POST[ 'imagefile' ];
	if ( isset( $_POST[ 'base64bookmark' ] ) ) {
		$imagefile = '/srv/http/data/bookmarks/'.str_replace( '/', '|', $imagefile );
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
		$imagefile = $dirwebradios.'/'.$imagefile;
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
		$thumbnail = exec( $sudo.'/srv/http/bash/getcover.sh "'.$imagefile.'" 200' );
		file_put_contents( $bookmarkfile, $thumbnail ? $thumbnail : $_POST[ 'label' ] );
		echo $thumbnail;
		exit;
	}
	
	// coverart or thumbnail
	$coverfile = isset( $_POST[ 'coverfile' ] );
	$srcfile = $_POST[ 'srcfile' ] ?? '';
	if ( $srcfile ) {
		exec( $sudobin.'mv -f "'.$srcfile.'"{,.backup}', $output, $std );
		if ( isset( $_POST[ 'remove' ] ) ) {
			echo exec( $sudo.'/srv/http/bash/getcover.sh "'.$imagefile.'"' );
			exit;
		}
	} else {
		unlink( $imagefile );
	}
	if ( isset( $_POST[ 'base64' ] ) ) {
		if ( !isset( $_FILES[ 'file' ] ) ) {
			$tmpfile = '/srv/http/data/tmp/tmp.jpg';
			file_put_contents( $tmpfile, base64_decode( preg_replace( '/^.*,/', '', $_POST[ 'base64' ] ) ) ) || exit( '-1' );
			if ( !$coverfile ) $imagefile = substr( $imagefile, 0, -3 ).'jpg'; // if existing is 'cover.svg'
			exec( $sudobin.'mv -f "'.$tmpfile.'" "'.$imagefile.'"', $output, $std );
			if ( substr( $imagefile, -3 ) === 'gif' ) unlink( substr( $imagefile, 0, -3 ).'gif' );
		} else {
			if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
			
			gifSave(
				  $imagefile
				, $_FILES[ 'file' ][ 'tmp_name' ]
				, $_POST[ 'resize' ] ?? false
			);
		}
	} else if ( isset( $_FILES[ 'file' ] ) ) {
		if ( $_FILES[ 'file' ][ 'error' ] == UPLOAD_ERR_OK ) {
			// fix: "move_uploaded_file" permission
			exec( $sudobin.'mv -f "'.$_FILES[ 'file' ][ 'tmp_name' ].'" "'.$imagefile.'"', $output, $std );
		}
	}
	echo $std;	
	
} else if ( isset( $_POST[ 'login' ] ) ) {
	$passwordfile = $dirsystem.'/password';
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
	
} else if ( isset( $_POST[ 'logout' ] ) ) {
	session_start();
	session_destroy();
	
} else if ( isset( $_POST[ 'screenoff' ] ) ) {
	exec( 'DISPLAY=:0 '.$sudobin.'xset dpms force off' );
	
} else if ( isset( $_POST[ 'setorder' ] ) ) {
	$order = $_POST[ 'setorder' ]; 
	file_put_contents( $dirsystem.'/order', json_encode( $order, JSON_PRETTY_PRINT ) );
	pushstream( 'order', $order );
	
} else if ( isset( $_POST[ 'status' ] ) ) { // for previous/next
	$output = exec( $sudo.'/srv/http/bash/status.sh' );
	$array = json_decode( $output, true );
	pushstream( 'mpdplayer', $array );
	
} else if ( isset( $_POST[ 'volume' ] ) ) {
	$volume = $_POST[ 'volume' ];
	$current = $_POST[ 'current' ] ?? '';
	$filevolumemute = $dirsystem.'/volumemute';
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
	
} else if ( isset( $_POST[ 'webradios' ] ) ) {
	$name = $_POST[ 'webradios' ].'^^Radio';
	$url = $_POST[ 'url' ];
	$urlname = str_replace( '/', '|', $url );
	$filewebradios = $dirwebradios.'/'.$urlname;
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
		file_put_contents( $dirwebradios.'/'.$urlnamenew, $name ); // name, thumbnail, coverart
		$count = 0;
	} else if ( isset( $_POST[ 'delete' ] ) ) {
		unlink( $filewebradios );
		$count = -1;
	}
	pushstream( 'webradio', [ 'webradio' => $count ] );
	
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
		exec( $sudobin.'convert "'.$tmpfile.'" -coalesce -resize 200x200 "'.$imagefile.'"' );
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
	$ch = curl_init( 'http://127.0.0.1/pub?id='.$channel );
	curl_setopt( $ch, CURLOPT_HTTPHEADER, [ 'Content-Type:application/json' ] );
	curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $data, JSON_NUMERIC_CHECK ) );
	curl_exec( $ch );
	curl_close( $ch );
}
function volumeIncrement( $volume, $current = null ) {
	if ( $current === null || abs( $volume - $current ) < 10 ) {
		exec( 'mpc volume '.$volume );
	} else {
		foreach( range( $current, $volume, 5 ) as $val ) {
			usleep( 0.2 * 1000000 );
			exec( 'mpc volume '.$val );
		}
		if ( $val !== $volume ) exec( 'mpc volume '.$volume );
	}
}
