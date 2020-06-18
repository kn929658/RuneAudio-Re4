$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var dirsystem = '/srv/http/data/system';
var wlcurrent = '';
var wlconnected = '';
var accesspoint = $( '#accesspoint' ).length;
var backdelay = 0;

$( '.back' ).click( function() {
	wlcurrent = '';
	clearTimeout( intervalscan );
	$.post( 'commands.php', { bash: 'bluetoothctl scan off' } );
	$( '#divinterface, #divwebui, #divaccesspoint' ).removeClass( 'hide' );
	$( '#divwifi, #divbluetooth' ).addClass( 'hide' );
	$( '#listwifi, #listbt' ).empty();
	setTimeout( nicsStatus, backdelay );
} );
$( '#listinterfaces' ).on( 'click', 'li', function() {
	var $this = $( this );
	var inf = $this.prop( 'class' );
	wlcurrent = inf;
	if ( inf !== 'eth0' ) {
		if ( inf !== 'bt' ) {
			if ( G.hostapd && wlcurrent === 'wlan0' ) {
				info( {
					  icon    : 'wifi-3'
					, title   : 'Wi-Fi'
					, message : 'Access Point must be disabled.'
				} );
				return
			} else {
				wlanStatus();
			}
		} else {
			$.post( 'commands.php', { bash: 'bluetoothctl scan on' } );
			btStatus();
		}
	} else {
		editIP( $this );
		$( '#infoCheckBox' ).on( 'click', 'input', function() {
			$( '#infoText' ).toggle( $( this ).prop( 'checked' ) );
		} );
	}
} );
$( '#listwifi' ).on( 'click', '.fa-info-circle', function() {
	var $this = $( this ).parent();
	if ( !$this.data( 'profile' ) ) return
	
	var wlan = $this.data( 'wlan' );
	var ssid = $this.data( 'ssid' );
	info( {
		  icon        : 'wifi-3'
		, title       : 'Saved Wi-Fi'
		, message     : 'Forget / Connect <wh>'+ ssid +'</wh> ?'
		, buttonwidth : 1
		, buttonlabel : '<i class="fa fa-minus-circle"></i> Forget'
		, buttoncolor : '#bb2828'
		, button      : function() {
			local = 1;
			$.post( 'commands.php', { bash: [
				  'netctl stop "'+ ssid +'"'
				, 'systemctl disable netctl-auto@'+ wlan
				, 'rm "/etc/netctl/'+ ssid +'" "/srv/http/data/system/netctl-'+ ssid +'"'
				, 'killall wpa_supplicant'
				, 'ifconfig '+ wlan +' up'
				, curlPage( 'network' )
				] }, function() {
				wlconnected = '';
				wlanScan();
				resetlocal();
			} );
			banner( 'Wi-Fi', 'Forget ...', 'wifi-3' );
		}
		, oklabel     : 'Connect'
		, ok          : function() {
			connect( wlan, ssid, 0 );
		}
	} );
} );
$( '#listwifi' ).on( 'click', 'li', function( e ) {
	if ( $( e.target ).hasClass( 'fa-info-circle' ) ) return
	
	var $this = $( this );
	var wlan = $this.data( 'wlan' );
	var ssid = $this.data( 'ssid' );
	var encrypt = $this.data( 'encrypt' );
	var wpa = $this.data( 'wpa' );
	var eth0ip = $( '#listinterfaces li.eth0' ).data( 'ip' );
	if ( location.host === eth0ip ) {
		var msgreconnect = '';
	} else {
		var msgreconnect = '<br>Reconnect with IP: <wh>'+ eth0ip +'</wh>';
	}
	if ( $this.data( 'connected' ) ) {
		var connected = $this.data( 'connected' );
		info( {
			  icon    : 'wifi-3'
			, title   : ssid
			, message : !connected ? 'Saved Wi-Fi connection:' :
				'<div class="colL">'
					+'IP :<br>'
					+'Gateway :'
				+'</div>'
				+'<div class="colR wh" style="text-align: left;">'
					+ $this.data( 'ip' ) +'<br>'
					+ $this.data( 'gateway' )
				+'</div>'
			, buttonwidth : 1
			, buttonlabel : '<i class="fa fa-minus-circle"></i> Forget'
			, buttoncolor : '#bb2828'
			, button      : function() {
				clearTimeout( intervalscan );
				local = 1;
				$.post( 'commands.php', { bash: [
					  'netctl stop "'+ ssid +'"'
					, 'systemctl disable netctl-auto@'+ wlan
					, 'rm "/etc/netctl/'+ ssid +'" "/srv/http/data/system/netctl-'+ ssid +'"'
					, curlPage( 'network' )
					] }, function() {
					wlconnected = '';
					wlanScan();
					resetlocal();
				} );
				banner( 'Wi-Fi', 'Forget ...', 'wifi-3' );
			}
			, oklabel     : !connected ? 'Connect' : 'Disconnect'
			, ok          : function() {
				if ( !connected ) {
					connect( wlan, ssid, 0 );
				} else {
					clearTimeout( intervalscan );
					local = 1;
					$.post( 'commands.php', { bash: [
						  'netctl stop "'+ ssid +'"'
						, 'killall wpa_supplicant'
						, 'ifconfig '+ wlan +' up'
						, curlPage( 'network' )
						] }, function() {
							wlconnected = '';
							wlanScan();
							resetlocal();
					} );
					banner( 'Wi-Fi', 'Disconnect ...', 'wifi-3' );
				}
			}
		} );
	} else if ( $this.data( 'profile' ) ) { // saved wi-fi
		connect( wlan, ssid, 0 );
	} else if ( encrypt === 'on' ) { // new wi-fi
		newWiFi( $this );
	} else { // no password
		var data = 'Interface='+ wlan
				  +'\nConnection=wireless'
				  +'\nIP=dhcp'
				  +'\nESSID="'+ ssid +'"'
				  +'\nSecurity=none';
		connect( wlan, ssid, data );
	}
} );
$( '#add' ).click( function() {
	$this = $( this );
	info( {
		  icon          : 'wifi-3'
		, title         : 'Add Wi-Fi'
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, checkbox      : { 'Static IP': 1, 'Hidden SSID': 1, 'WEP': 1 }
		, passwordlabel : 'Password'
		, preshow       : function() {
			$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).hide();
		}
		, footer        : '<br><px50/><code>"</code> double quotes not allowed'
		, ok            : function() {
			var ssid = $( '#infoTextBox' ).val();
			var wlan = $( '#listwifi li:eq( 0 )' ).data( 'wlan' );
			var password = $( '#infoPasswordBox' ).val();
			var ip = $( '#infoTextBox2' ).val();
			var gw = $( '#infoTextBox3' ).val();
			var hidden = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' );
			var wpa = $( '#infoCheckBox input:eq( 2 )' ).prop( 'checked' ) ? 'wep' : 'wpa';
			var data = 'Interface='+ wlan
					  +'\nConnection=wireless'
					  +'\nIP=dhcp'
					  +'\nESSID=\\"'+ escapeString( ssid ) +'\\"';
			if ( hidden ) {
				data += '\nHidden=yes';
			}
			if ( password ) {
				data += '\nSecurity='+ wpa
					   +'\nKey=\\"'+ escapeString( password ) +'\\"';
			}
			if ( ip ) {
				data += '\nAddress='+ ip
					   +'\nGateway='+ gw;
			}
			connect( wlan, ssid, data );
		}
	} );
	$( '#infoCheckBox' ).on( 'click', 'input:eq( 0 )', function() {
		$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).toggle( $( this ).prop( 'checked' ) );
	} );
} );
$( '#listbt' ).on( 'click', 'li', function( e ) {
	$this = $( this );
	var mac = $this.data( 'mac' );
	var name = '<wh>'+ $this.find( '.liname' ).text() +'</wh>';
	var connected = $this.data( 'connected' ) === 'yes';
	if ( $( e.target ).hasClass( 'fa-info-circle' ) ) {
		var jsoninfo = {
			  icon        : 'bluetooth'
			, title       : 'Bluetooth'
			, message     : name
			, buttonlabel : '<i class="fa fa-minus-circle"></i>Remove'
			, buttoncolor : '#bb2828'
			, buttonwidth : 1
			, button      : function() {
				$this.remove();
				$.post( 'commands.php', { bash: 'bluetoothctl remove '+ mac } );
			}
		}
		if ( connected ) {
			jsoninfo.oklabel = 'Disconnect';
			jsoninfo.ok      = function() {
				$this.find( 'grn' ).remove();
				$.post( 'commands.php', { bash: 'bluetoothctl disconnect '+ mac } );
			}
		} else {
			jsoninfo.oklabel = 'Connect';
			jsoninfo.ok      = function() {
				$.post( 'commands.php', { bash: 'bluetoothctl connect '+ mac }, btScan );
			}
		}
		info( jsoninfo );
		return
	}
	
	if ( connected ) {
		info( {
			  icon    : 'bluetooth'
			, title   : 'Bluetooth'
			, message : 'Disconnect <wh>'+ name +'</wh> ?'
			, oklabel : 'Disconnect'
			, ok      : function() {
				$this.find( 'grn' ).remove();
				$.post( 'commands.php', { bash: 'bluetoothctl disconnect '+ mac } );
			}
		} );
	} else {
		if ( $this.find( 'fa-info-circle' ).length ) {
			$.post( 'commands.php', { bash: 'bluetoothctl connect '+ mac }, btScan );
		} else {
			$.post( 'commands.php', { bash: [
				  '/srv/http/bash/network-btscan.sh disconnect'
				, 'bluetoothctl trust '+ mac
				, 'bluetoothctl pair '+ mac
				, 'bluetoothctl connect '+ mac
			] }, function( data ) {
				btScan();
				notify( 'Bluetooth', ( data != -1 ? name +' paired' : 'Pair failed' ), 'bluetooth' );
			} );
			banner( 'Bluetooth', 'Pair ...', 'bluetooth', -1 );
		}
	}
} );
$( '#accesspoint' ).change( function() {
	if ( !$( '#divinterface li.wlan0' ).length ) {
		info( {
			  icon    : 'wifi-3'
			, title   : 'Wi-Fi'
			, message : 'Wi-Fi device not available.'
					   +'<br>Enable in Sysytem settings.'
		} );
		$( this ).prop( 'checked', 0 );
		return
	}
	
	G.hostapd = $( this ).prop( 'checked' );
	if ( G.hostapd ) {
		if ( $( '#divinterface li.wlan0' ).data( 'gateway' ) ) {
			info( {
				  icon    : 'network'
				, title   : 'Access Point'
				, message : 'Wi-Fi wlan0 must be disconnected.'
			} );
			$( this ).prop( 'checked', 0 );
			G.hostapd = false;
			return
		}
		
		var cmd = [
				  'ifconfig wlan0 '+ G.hostapdip
				, 'systemctl start hostapd dnsmasq'
				, 'touch '+ dirsystem +'/accesspoint'
				, curlPage( 'network' )
		];
	} else {
		$( '#boxqr, #settings-accesspoint' ).addClass( 'hide' );
		var cmd = [
			  'systemctl stop hostapd dnsmasq'
			, 'rm -f '+ dirsystem +'/accesspoint'
			, 'ifconfig wlan0 0.0.0.0'
			, curlPage( 'network' )
		];
	}
	local = 1;
	$.post( 'commands.php', { bash: cmd }, function() {
		nicsStatus();
		resetlocal();
		if ( G.hostapd ) renderQR();
	} );
	banner( 'RPi Access Point', G.hostapd, 'wifi-3' );
});
$( '#settings-accesspoint' ).click( function() {
	info( {
		  icon      : 'network'
		, title     : 'Access Point Settings'
		, message   : 'Password - at least 8 characters'
		, textlabel : [ 'Password', 'IP' ]
		, textvalue : [ G.passphrase, G.hostapdip ]
		, textrequired : [ 0, 1 ]
		, ok      : function() {
			var ip = $( '#infoTextBox1' ).val();
			var passphrase = $( '#infoTextBox' ).val();
			if ( ip === G.hostapdip && passphrase === G.passphrase ) return
			
			if ( passphrase.length < 8 ) {
				info( 'Password must be at least 8 characters.' );
				return
			}
			
			G.hostapdip = ip;
			G.passphrase = passphrase;
			var ips = ip.split( '.' );
			var ip3 = ips.pop();
			var ip012 = ips.join( '.' );
			var iprange = ip012 +'.'+ ( +ip3 + 1 ) +','+ ip012 +'.254,24h';
			
			var cmd = [
				  "sed -i"
					+" -e 's/^\\(dhcp-range=\\).*/\\1"+ iprange +"/'"
					+" -e 's/^\\(.*option:router,\\).*/\\1"+ ip +"/'"
					+" -e 's/^\\(.*option:dns-server,\\).*/\\1"+ ip +"/'"
					+" /etc/dnsmasq.conf"
				, "sed -i"
					+" -e '/wpa\\|rsn_pairwise/ s/^#\\+//'"
					+" -e 's/\\(wpa_passphrase=\\).*/\\1"+ passphrase +"/'"
					+" /etc/hostapd/hostapd.conf"
				, 'systemctl restart hostapd dnsmasq'
				, curlPage( 'network' )
			];
			if ( ip === '192.168.5.1' ) {
				cmd.push( 'rm -f '+ dirsystem +'/accesspoint-ip*' );
			} else {
				cmd.push(
					  'echo '+ ip +' > '+ dirsystem +'/accesspoint-ip'
					, 'echo '+ iprange +' > '+ dirsystem +'/accesspoint-iprange'
				);
			}
			cmd.push( ( passphrase === 'RuneAudio' ? 'rm -f ' : 'echo '+ passphrase +' > ' ) + dirsystem +'/accesspoint-passphrase' )
			local = 1;
			$.post( 'commands.php', { bash: cmd }, resetlocal );
			banner( 'RPi Access Point', 'Change ...', 'wifi-3' );
			$( '#passphrase' ).text( passphrase || '(No password)' );
			$( '#ipwebuiap' ).text( ip );
			renderQR();
		}
	} );
} );
$( '#ifconfig' ).click( function() {
	$( '#codeifconfig' ).hasClass( 'hide' ) ? getIfconfig() : $( '#codeifconfig' ).addClass( 'hide' );
} );
$( '#netctl' ).click( function() {
	$( '#codenetctl' ).hasClass( 'hide' ) ? getNetctl() : $( '#codenetctl' ).addClass( 'hide' );
} );

function btRender( data ) {
	var html = '';
	data.forEach( function( list ) {
		html += '<li data-mac="'+ list.mac +'" data-connected="'+ list.connected +'" data-saved="'+ list.saved +'"><i class="fa fa-bluetooth"></i>'
				+ ( list.connected === 'yes' ? '<grn>&bull;&ensp;</grn>' : '' )
				+'<a class="liname wh">'+ list.name +'</a>';
		html += list.saved ? '&ensp;<i class="fa fa-info-circle wh"></i>' : '';
		html += '</li>';
	} );
	$( '#listbt' ).html( html ).promise().done( function() {
		$( '#scanning-bt' ).addClass( 'hide' );
	} );
}
function btScan() {
	clearTimeout( intervalscan );
	$( '#scanning-bt' ).removeClass( 'hide' );
	$.post( 'commands.php', { getjson: '/srv/http/bash/network-btscan.sh' }, function( data ) {
		btRender( data );
		intervalscan = setTimeout( btScan, 12000 );
	}, 'json' );
}
function btStatus() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divbluetooth' ).removeClass( 'hide' );
	$.post( 'commands.php', { getjson: '/srv/http/bash/network-btscan.sh list' }, function( data ) {
		if ( data.length ) btRender( data );
		btScan();
	}, 'json' );
}
function connect( wlan, ssid, data ) {
	clearTimeout( intervalscan );
	wlcurrent = wlan;
	$( '#scanning-wifi' ).removeClass( 'hide' );
	var cmd = [
		  'echo -e "'+ data +'" > "/srv/http/data/system/netctl-'+ ssid +'"'
		, 'cp "/srv/http/data/system/netctl-'+ ssid +'" "/etc/netctl/'+ ssid +'"'
		, 'netctl stop-all'
		, 'ifconfig '+ wlan +' down'
		, 'netctl start "'+ ssid +'"'
	];
	if ( !data ) cmd.shift();
	local = 1;
	$.post( 'commands.php', { bash: cmd }, function( std ) {
		if ( std != -1 ) {
			wlconnected = wlan;
			$.post( 'commands.php', { bash: [
				  'systemctl enable netctl-auto@'+ wlan
				, curlPage( 'network' )
			] }, function() {
				wlanScan();
				resetlocal();
				$( 'li.'+ wlan +' .fa-search')
					.removeClass( 'fa-search' )
					.addClass( 'fa-refresh blink' )
					.next().remove();
				backdelay = 6000;
				var delayint = setInterval( function() {
					backdelay -= 1000;
					if ( !backdelay ) clearTimeout( delayint );
				}, 1000 );
			} );
			banner( 'Wi-Fi', 'Connect ...', 'wifi-3' );
		} else {
			$( '#scanning-wifi' ).addClass( 'hide' );
			wlconnected =  '';
			info( {
				  icon      : 'wifi-3'
				, title     : 'Wi-Fi'
				, message   : 'Connect to <wh>'+ ssid +'</wh> failed.'
			} );
			resetlocal();
		}
	} );
}
function editIP( data ) {
	if ( 'context' in data ) {
		var data = {
			  ip      : data.data( 'ip' ) || ''
			, gateway : data.data( 'gateway' ) || ''
			, dns0    : data.data( 'dns0' ) || ''
			, dns1    : data.data( 'dns1' ) || ''
			, dhcp    : data.data( 'dhcp' ) || ''
		}
		var textvalue = [ data.ip, data.gateway, data.dns0, data.dns1 ];
	} else {
		var textvalue = [];
	}
	info( {
		  icon         : 'lan'
		, title        : 'Edit LAN IP'
		, textlabel    : [ 'IP', 'Gateway', 'Primary DNS', 'Secondary DNS' ]
		, textvalue    : textvalue
		, textrequired : [ 0 ]
		, checkbox     : { 'Static IP': 1 }
		, preshow      : function() {
			$( '#infoText' ).toggle( !data.dhcp );
			$( '#infoCheckBox input' ).prop( 'checked', !data.dhcp );
		}
		, ok           : function() {
			var data1 = {}
			var eth0 =     '[Match]'
							+'\nName=eth0'
							+'\n[Network]'
							+'\nDNSSEC=no';
			var checked = $( '#infoCheckBox input' ).prop( 'checked' );
			if ( !checked ) {
				if ( data.dhcp ) return
				
				data1.ip = G.hostname +'.local';
				eth0 +=  '\nDHCP=yes';
			} else {
				data1.ip = $( '#infoTextBox' ).val();
				data1.gateway = $( '#infoTextBox1' ).val();
				data1.dns0 = $( '#infoTextBox2' ).val();
				data1.dns1 = $( '#infoTextBox3' ).val();
				if ( data1.ip === data.ip && data1.gateway === data.gateway && data1.dns0 === data.dns0 && data1.dns1 === data.dns1 ) return
				
				eth0 +=  '\nAddress='+ data1.ip +'/24'
							+'\nGateway='+ data1.gateway
							+'\nDNS='+ data1.dns0;
				if ( data1.dns1 ) eth0 += '\nDNS='+ data1.dns1;
			}
			$.post( 'commands.php', { bash: 'arp -n | grep -v Address | cut -d" " -f1 | grep -q '+ data1.ip +'$ && echo 1 || echo 0', string: 1 }, function( used ) {
				if ( used == 1 ) {
					info( {
						  icon    : 'lan'
						, title   : 'Edit LAN IP'
						, message : 'IP <wh>'+ data1.ip +'</wh> already in use.'
						, ok      : function() {
							data1.ip = data.ip;
							editIP( data1 );
						}
					} );
				} else {
					$.post( 'commands.php', { bash: [
						  'curl -s -X POST "http://127.0.0.1/pub?id=ip" -d \'{ "ip": "'+ data1.ip +'" }\''
						, 'echo -e "'+ eth0 +'" > /etc/systemd/network/eth0.network'
						, ( checked ? 'echo -e "'+ eth0 +'" >' : 'rm -f' ) +' /srv/http/data/system/eth0.network'
						, 'systemctl restart systemd-networkd'
					] }, nicsStatus );
					notify( 'LAN IP Address', 'Change ...', 'lan blink', -1 );
				}
			} );
			
		}
	} );
}
function escape_string( string ) {
	var to_escape = [ '\\', ';', ',', ':', '"' ];
	var hex_only = /^[0-9a-f]+$/i;
	var output = "";
	for ( var i = 0; i < string.length; i++ ) {
		if ( $.inArray( string[ i ], to_escape ) != -1 ) {
			output += '\\'+string[ i ];
		} else {
			output += string[ i ];
		}
	}
	return output;
};
function getIfconfig() {
	var cmd = 'ifconfig';
	if ( 'bluetooth' in G ) cmd += "; bluetoothctl show | sed 's/^\\(Controller.*\\)/bluetooth: \\1/'";
	$.post( 'commands.php', { bash: cmd, string: 1 }, function( status ) {
		$( '#codeifconfig' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function getNetctl() {
	$.post( 'commands.php', { bash: 'netctl list', string: 1 }, function( status ) {
		if ( !status ) status = '(none)';
		$( '#codenetctl' )
			.html( status )
			.removeClass( 'hide' );
	} );
}
function newWiFi( $this ) {
	var wlan = $this.data( 'wlan' );
	var ssid = $this.data( 'ssid' );
	var wpa = $this.data( 'wpa' );
	info( {
		  icon          : 'wifi-3'
		, title         : 'Wi-Fi'
		, message       : 'Connect: <wh>'+ ssid +'</wh>'
		, passwordlabel : 'Password'
		, footer        : '<br><px50/><code>"</code> double quotes not allowed'
		, ok            : function() {
			var data = 'Interface='+ wlan
					  +'\nConnection=wireless'
					  +'\nIP=dhcp'
					  +'\nESSID=\\"'+ escapeString( ssid ) +'\\"'
					  +'\nSecurity='+ ( wpa || 'wep' )
					  +'\nKey=\\"'+ escapeString( $( '#infoPasswordBox' ).val() ) +'\\"';
			connect( wlan, ssid, data );
		}
	} );
}
function escapeString( str ) {
	return str.replace( /([&()]\\)/g, '\$1' );
}
function nicsStatus() {
	$.post( 'commands.php', { getjson: '/srv/http/bash/network-data.sh' }, function( list ) {
		var extra = list.pop();
		$( '#divaccesspoint' ).toggleClass( 'hide', !extra.wlan );
		if ( 'hostapd' in extra ) {
			G = extra.hostapd;
			$( '#ssid' ).text( G.ssid );
			$( '#passphrase' ).text( G.passphrase )
			$( '#ipwebuiap' ).text( G.hostapdip );
			$( '#accesspoint' ).prop( 'checked', G.hostapd );
			$( '#settings-accesspoint, #boxqr' ).toggleClass( 'hide', !G.hostapd );
		}
		if ( 'bluetooth' in extra ) G.bluetooth = extra.bluetooth;
		G.hostname = extra.hostname;
		G.reboot = extra.reboot ? extra.reboot.split( '\n' ) : [];
		var html = '';
		$.each( list, function( i, val ) {
			html += '<li class="'+ val.interface +'"';
			html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
			html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
			html += val.dhcp ? ' data-dhcp="1"' : '';
			html += val.dns0 ? ' data-dns0="'+ val.dns0 +'"' : '';
			html += val.dns1 ? ' data-dns1="'+ val.dns1 +'"' : '';
			html += '><i class="fa fa-';
			html += val.interface === 'eth0' ? 'lan"></i>LAN' : 'wifi-3"></i>Wi-Fi';
			if ( val.interface === 'eth0' ) {
				html += val.ip ? '&ensp;<grn>&bull;</grn>&ensp;'+ val.ip : '';
				html += val.gateway ? '<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;</gr>' : '';
			} else if ( val.gateway ) {
				wlconnected = val.interface;
				html += '&ensp;<grn>&bull;</grn>&ensp;'+ val.ip +'<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;&bull;&ensp;</gr>'+ val.ssid;
			} else if ( accesspoint && G.hostapd && val.ip === G.hostapdip ) {
				html += '&ensp;<grn>&bull;</grn>&ensp;<gr>RPi access point&ensp;&raquo;&ensp;</gr>'+ G.hostapdip
			} else {
				html += '&emsp;<i class="fa fa-search"></i><gr>Scan</gr>';
			}
			html += '</li>';
		} );
		if ( 'bluetooth' in G ) {
			if ( G.bluetooth ) {
				G.bluetooth.forEach( function( list ) {
					html += '<li class="bt"><i class="fa fa-bluetooth"></i>Bluetooth&ensp;';
					html += ( list.connected === 'yes' ? '<grn>&bull;</grn>&ensp;' : '<gr>&bull;</gr>&ensp;' ) + list.name +'</li>';
				} );
			} else {
				html += '<li class="bt"><i class="fa fa-bluetooth"></i>Bluetooth&ensp;<i class="fa fa-search"></i></i><gr>Scan</gr></li>';
			}
			$( '#ifconfig' ).next().find( 'code' ).text( 'ifconfig; bluetoothctl show' );
		}
		$( '#refreshing' ).addClass( 'hide' );
		$( '#listinterfaces' ).html( html );
		renderQR();
		bannerHide();
		if ( !$( '#codeifconfig' ).hasClass( 'hide' ) ) getIfconfig();
		if ( !$( '#codenetctl' ).hasClass( 'hide' ) ) getNetctl();
		showContent();
	}, 'json' );
}
function renderQR() {
	var qroptions = { width  : 120, height : 120 }
	$( 'li' ).each( function() {
		var ip = $( this ).data( 'ip' );
		var gateway = $( this ).data( 'gateway' );
		if ( ip && gateway ) {
			$( '#qrwebui' ).empty();
			$( '#ipwebui' ).text( ip );
			qroptions.text = 'http://'+ ip;
			$( '#qrwebui' ).qrcode( qroptions );
			$( '#divwebui' ).removeClass( 'hide' );
			return false
		}
	} );
	if ( !accesspoint || !G.hostapd ) return
	
	$( '#qraccesspoint, #qrwebuiap' ).empty();
	qroptions.text = 'WIFI:S:'+ escape_string( G.ssid ) +';T:WPA;P:'+ escape_string( G.passphrase ) +';';
	$( '#qraccesspoint' ).qrcode( qroptions );
	qroptions.text = 'http://'+ G.hostapdip;
	$( '#qrwebuiap' ).qrcode( qroptions );
	$( '#boxqr' ).removeClass( 'hide' );
}
function wlanScan() {
	clearTimeout( intervalscan );
	$( '#scanning-wifi' ).removeClass( 'hide' );
	$.post( 'commands.php', { getjson: '/srv/http/bash/network-wlanscan.sh' }, function( list ) {
		var good = -60;
		var fair = -67;
		var html = '';
		if ( list.length ) {
			$.each( list, function( i, val ) {
				html += '<li data-db="'+ val.dbm +'" data-ssid="'+ val.ssid +'" data-encrypt="'+ val.encrypt +'" data-wpa="'+ val.wpa +'" data-wlan="'+ val.wlan +'"';
				html += val.connected  ? ' data-connected="1"' : '';
				html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
				html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
				html += val.profile ? ' data-profile="1"' : '';
				html += '><i class="fa fa-wifi-'+ ( val.dbm > good ? 3 : ( val.dbm < fair ? 1 : 2 ) ) +'"></i>';
				html += val.connected ? '<grn>&bull;</grn>&ensp;' : '';
				html += val.dbm < fair ? '<gr>'+ val.ssid +'</gr>' : val.ssid;
				html += val.encrypt === 'on' ? ' <i class="fa fa-lock"></i>' : '';
				html += '<gr>'+ val.dbm +' dBm</gr>';
				html += val.connected ? '&ensp;<i class="fa fa-info-circle wh"></i>' : '';
			} );
		} else {
			html += '<li><i class="fa fa-lock"></i><gr>(no accesspoints found)</gr></li>';
		}
		$( '#listwifi' ).html( html +'</li>' ).promise().done( function() {
			bannerHide();
			$( '#scanning-wifi' ).addClass( 'hide' );
		} );
		intervalscan = setTimeout( wlanScan, 12000 );
	}, 'json' );
}
function wlanStatus() {
	$( '#divinterface, #divwebui, #divaccesspoint' ).addClass( 'hide' );
	$( '#divwifi' ).removeClass( 'hide' );
	wlanScan();
}

refreshData = function() {
	if ( !$( '#divwifi' ).hasClass( 'hide' ) ) {
		wlanStatus();
	} else if ( !$( '#divbluetooth' ).hasClass( 'hide' ) ) {
		btStatus();
	} else {
		nicsStatus();
	}
}
refreshData();

} );
