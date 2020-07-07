$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var dirsystem = '/srv/http/data/system';
var wlcurrent = '';
var wlconnected = '';
var accesspoint = $( '#accesspoint' ).length;

$( '.back' ).click( function() {
	wlcurrent = '';
	clearTimeout( intervalscan );
	$( '#divinterface, #divwebui, #divaccesspoint' ).removeClass( 'hide' );
	$( '#divwifi, #divbluetooth' ).addClass( 'hide' );
	$( '#listwifi, #listbt' ).empty();
	nicsStatus();
	if ( 'bluetooth' in G ) $.post( 'commands.php', { bash: 'bluetoothctl scan off' } );
} );
$( '#listinterfaces' ).on( 'click', 'li', function() {
	var $this = $( this );
	wlcurrent = $this.prop( 'class' );
	if ( wlcurrent !== 'eth0' ) {
		if ( wlcurrent !== 'bt' ) {
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
		if ( !$this.find( 'grn' ).length ) return
		
		editLAN( $this );
		$( '#infoCheckBox' ).on( 'click', 'input', function() {
			$( '#infoText' ).toggle( $( this ).prop( 'checked' ) );
		} );
	}
} );
$( '#listwifi' ).on( 'click', 'li', function( e ) {
	var $this = $( this );
	var connected = $this.data( 'connected' );
	var profile = $this.data( 'profile' ) || connected;
	var ssid = $this.data( 'ssid' );
	var ip = $this.data( 'ip' );
	var gw = $this.data( 'gateway' );
	var wpa = $this.data( 'wpa' );
	var dhcp = $this.data( 'dhcp' ) == 1 ? 'DHCP' : 'Static'
	var encrypt = $this.data( 'encrypt' ) === 'on';
	var password = $this.data( 'password' );
	if ( !profile ) {
		if ( encrypt ) {
			newWiFi( $this );
		} else {
			var data = 'Interface='+ wlcurrent
					  +'\nConnection=wireless'
					  +'\nIP=dhcp'
					  +'\nESSID="'+ ssid +'"'
					  +'\nSecurity=none';
			connect( ssid, data );
		}
		return
	}
	
	info( {
		  icon        : 'wifi-3'
		, title       : ssid
		, message     : !connected ? 'Saved connection' : '<div class="colL">'
				+ dhcp +' IP :<br>'
				+'Gateway :'
			+'</div>'
			+'<div class="colR wh" style="text-align: left;">'
				+ ip +'<br>'
				+ gw
			+'</div>'
		, buttonwidth : 1
		, buttonlabel : [
			  '<i class="fa fa-minus-circle"></i> Forget'
			, '<i class="fa fa-edit-circle"></i> IP'
		]
		, buttoncolor : [
			  '#bb2828'
			, ''
		]
		, button      : [
			  function() {
				var ssidfilename = escapeSingleQuote( ssid )
				clearTimeout( intervalscan );
				banner( ssid, 'Forget ...', 'wifi-3' );
				$.post( 'commands.php', { bash: [
					  "netctl stop '"+ ssidfilename +"'"
					, 'systemctl disable netctl-auto@'+ wlcurrent
					, "rm '/etc/netctl/"+ ssidfilename +"' '/srv/http/data/system/netctl-"+ ssidfilename +"'"
					, curlPage( 'network' )
					] }, refreshData );
			}
			, function() {
				if ( connected ) {
					var data = {
						  Address  : ip
						, Gateway  : gw
						, Security : wpa
						, Key      : password
						, dhcp     : dhcp
					}
					editWiFi( ssid, data );
				} else {
					editWiFi( ssid, 0 );
				}
			}
		]
		, oklabel : connected ? 'Disconnect' : 'Connect'
		, okcolor : connected ? '#de810e' : ''
		, ok      : function() {
			if ( !connected ) {
				connect( ssid, false );
				return
			}
			
			clearTimeout( intervalscan );
			banner( ssid, 'Disconnect ...', 'wifi-3' );
			$.post( 'commands.php', { bash: [
				  "netctl stop '"+ escapeSingleQuote( ssid ) +"'"
				, 'killall wpa_supplicant'
				, 'ifconfig '+ wlcurrent +' up'
				, curlPage( 'network' )
			] }, refreshData );
		}
	} );
} );
$( '#add' ).click( function() {
	editWiFi();
} );
$( '#listbt' ).on( 'click', 'li', function( e ) {
	$this = $( this );
	var mac = $this.data( 'mac' );
	var name = '<wh>'+ $this.find( '.liname' ).text() +'</wh>';
	var connected = $this.data( 'connected' ) === 'yes';
	if ( $( e.target ).hasClass( 'fa-edit-circle' ) ) {
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
		if ( $this.find( 'fa-edit-circle' ).length ) {
			$.post( 'commands.php', { bash: 'bluetoothctl connect '+ mac }, btScan );
		} else {
			$.post( 'commands.php', { bash: [
				  '/srv/http/bash/network-btscan.sh disconnect'
				, 'bluetoothctl trust '+ mac
				, 'bluetoothctl pair '+ mac
				, 'bluetoothctl connect '+ mac
			] }, function( data ) {
				btScan();
				if ( data != -1 ) {
					notify( 'Bluetooth', name +' paired', 'bluetooth' );
				} else {
					info( {
						  icon      : 'bluetooth'
						, title     : 'Bluetooth'
						, message   : 'Pair '+ name +' failed'
					} );
				}
			} );
			banner( 'Bluetooth', 'Pair ...', 'bluetooth' );
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
	banner( 'RPi Access Point', G.hostapd, 'wifi-3' );
	$.post( 'commands.php', { bash: cmd }, refreshData );
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
			banner( 'RPi Access Point', 'Change ...', 'wifi-3' );
			$.post( 'commands.php', { bash: cmd }, refreshData );
		}
	} );
} );
$( '#ifconfig' ).click( function( e ) {
	codeToggle( e.target, this.id, getIfconfig );
} );
$( '#netctl' ).click( function( e ) {
	codeToggle( e.target, this.id, getNetctl );
} );

function arp( ip ) {
	return 'arp -n | grep -q ^'+ ip +' && echo 1 || echo 0'
}
function btRender( data ) {
	var html = '';
	data.forEach( function( list ) {
		html += '<li data-mac="'+ list.mac +'" data-connected="'+ list.connected +'" data-saved="'+ list.saved +'"><i class="fa fa-bluetooth"></i>'
				+ ( list.connected === 'yes' ? '<grn>&bull;&ensp;</grn>' : '' )
				+'<a class="liname wh">'+ list.name +'</a>';
		html += list.saved ? '&ensp;<i class="fa fa-edit-circle wh"></i>' : '';
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
function connect( ssid, data, ip ) { // ip - static
	clearTimeout( intervalscan );
	$( '#scanning-wifi' ).removeClass( 'hide' );
	var cmd = [
		  'netctl stop-all'
		, 'ifconfig '+ wlcurrent +' down'
	];
	var ssidfilename = escapeSingleQuote( ssid );
	if ( data ) cmd.push(
		  "echo '"+ data +"' > '/srv/http/data/system/netctl-"+ ssidfilename +"'"
		, "cp '/srv/http/data/system/netctl-"+ ssidfilename +"' '/etc/netctl/"+ ssidfilename +"'"
	);
	if ( ip ) {
		cmd.push( "echo '"+ data +"' > '/etc/netctl/"+ ssidfilename +"'" );
		$( '#loader' ).removeClass( 'hide' );
		location.href = 'http://'+ ip +'/index-settings.php?p=network';
	}
	cmd.push( "netctl start '"+ ssidfilename +"'" );
	banner( ssid, ( ip ? 'Static IP ...' : 'Connect ...' ), 'wifi-3' );
	$.post( 'commands.php', { bash: cmd }, function( std ) {
		if ( std != -1 ) {
			wlconnected = wlcurrent;
			$.post( 'commands.php', { bash: [ 
				  'systemctl enable netctl-auto@'+ wlcurrent
				, curlPage( 'network' )
			] }, refreshData );
		} else {
			$( '#scanning-wifi' ).addClass( 'hide' );
			wlconnected =  '';
			info( {
				  icon      : 'wifi-3'
				, title     : 'Wi-Fi'
				, message   : 'Connect to <wh>'+ ssid +'</wh> failed.'
			} );
		}
	} );
}
function editCheckIP( data ) {
	$.post( 'commands.php', { bash: arp( data.ip ), string: 1 }, function( used ) {
		if ( used == 1 ) {
			info( {
				  icon    : 'lan'
				, title   : 'Duplicate IP'
				, message : 'IP <wh>'+ data1.ip +'</wh> already in use.'
				, ok      : function() {
					editLAN( data );
				}
			} );
		} else {
			
		}
	} );
}
function editLAN( data ) {
	var data0 = data;
	if ( 'context' in data ) {
		var data = {
			  ip      : data.data( 'ip' ) || ''
			, gateway : data.data( 'gateway' ) || ''
			, dhcp    : data.data( 'dhcp' ) || ''
		}
		var textvalue = [ data.ip, data.gateway ];
	} else {
		var textvalue = [];
	}
	var eth0 = '[Match]'
			  +'\nName=eth0'
			  +'\n[Network]'
			  +'\nDNSSEC=no';
	info( {
		  icon         : 'edit-circle'
		, title        : 'LAN IP'
		, message      : 'Current: <wh>'+ ( data.dhcp ? 'DHCP' : 'Static IP' ) +'</wh><br>&nbsp;'
		, textlabel    : [ 'IP', 'Gateway' ]
		, textvalue    : textvalue
		, textrequired : [ 0 ]
		, preshow      : function() {
			if ( data.dhcp ) $( '#infoButton' ).addClass( 'hide' );
		}
		, buttonlabel  : '<i class="fa fa-undo"></i>DHCP'
		, buttonwidth  : 1
		, button       : function() {
			eth0 +=  '\nDHCP=yes';
			banner( 'LAN IP Address', 'DHCP ...', 'lan' );
			$( '#loader' ).removeClass( 'hide' );
			location.href = 'http://'+ G.hostname +'.local/index-settings.php?p=network';
			$.post( 'commands.php', { bash: [
				  "echo '"+ eth0 +"' > /etc/systemd/network/eth0.network"
				, 'rm -f /srv/http/data/system/eth0.network'
				, 'systemctl restart systemd-networkd'
			] } );
		}
		, ok           : function() {
			var data1 = {}
			data1.ip = $( '#infoTextBox' ).val();
			data1.gateway = $( '#infoTextBox1' ).val();
			if ( data1.ip === data.ip && data1.gateway === data.gateway ) return
			
			eth0 +=  '\nAddress='+ data1.ip +'/24'
					+'\nGateway='+ data1.gateway;
			$.post( 'commands.php', { bash: arp( data1.ip ), string: 1 }, function( used ) {
				if ( used == 1 ) {
					info( {
						  icon    : 'lan'
						, title   : 'Duplicate IP'
						, message : 'IP <wh>'+ data1.ip +'</wh> already in use.'
						, ok      : function() {
							editLAN( data0 );
						}
					} );
				} else {
					banner( 'LAN IP Address', 'Static IP ...', 'lan' );
					$( '#loader' ).removeClass( 'hide' );
					location.href = 'http://'+ data1.ip +'/index-settings.php?p=network';
					$.post( 'commands.php', { bash: [
						  "echo '"+ eth0 +"' > /etc/systemd/network/eth0.network"
						, "echo '"+ eth0 +"' > /srv/http/data/system/eth0.network"
						, 'systemctl restart systemd-networkd'
					] } );
				}
			} );
			
		}
	} );
}
function editWiFi( ssid, data ) {
	var data0 = data;
	var icon = ssid ? 'edit-circle' : 'wifi-3';
	var title = ssid ? 'Wi-Fi IP' : 'Add Wi-Fi';
	info( {
		  icon          : icon
		, title         : title
		, textlabel     : [ 'SSID', 'IP', 'Gateway' ]
		, checkbox      : { 'Static IP': 1, 'Hidden SSID': 1, 'WEP': 1 }
		, passwordlabel : 'Password'
		, preshow       : function() {
			if ( !ssid ) {
				$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).hide();
			} else {
				if ( data ) {
					editWiFiSet( ssid, data );
				} else {
					$.post( 'commands.php', { getwifi: escapeSingleQuote( ssid ) }, function( data ) {
						data.dhcp = data.IP === 'static' ? 'Static IP' : 'DHCP';
						data.Address = 'Address' in data ? data.Address.replace( '/24', '' ) : '';
						editWiFiSet( ssid, data );
					}, 'json' );
				}
			}
		}
		, ok            : function() {
			var ssidadd = $( '#infoTextBox' ).val();
			var password = $( '#infoPasswordBox' ).val();
			var ip = $( '#infoTextBox1' ).val();
			var gw = $( '#infoTextBox2' ).val();
			var static = $( '#infoCheckBox input:eq( 0 )' ).prop( 'checked' );
			var hidden = $( '#infoCheckBox input:eq( 1 )' ).prop( 'checked' );
			var security = $( '#infoCheckBox input:eq( 2 )' ).prop( 'checked' );
			if ( data0 && ip === data0.Address && gw === data0.Gateway ) return
			
			var data =   'Interface='+ wlcurrent
						+'\nConnection=wireless'
						+'\nESSID="'+ escapeString( ssid || ssidadd ) +'"'
						+'\nIP='+ ( static ? 'static' : 'dhcp' );
			if ( password ) {
				data +=  '\nSecurity='+ ( security ?  'wep' : 'wpa' )
						+'\nKey="'+ escapeString( password ) +'"';
			} else {
				data +=  '\nSecurity=none'
			}
			if ( hidden ) {
				data +=  '\nHidden=yes';
			}
			if ( static ) {
				data +=  '\nAddress='+ ip +'/24'
						+'\nGateway='+ gw;
			}
			if ( ssid ) {
				$.post( 'commands.php', { bash: arp( ip ), string: 1 }, function( used ) {
					if ( used == 1 ) {
						info( {
							  icon    : 'wifi-3'
							, title   : 'Duplicate IP'
							, message : 'IP <wh>'+ ip +'</wh> already in use.'
							, ok      : function() {
								editWiFi( ssid, data0 );
							}
						} );
					} else {
						connect( ssid, data, ip );
					}
				} );
			} else {
				connect( ssidadd, data );
			}
		}
	} );
	$( '#infoCheckBox' ).on( 'click', 'input:eq( 0 )', function() {
		$( '#infotextlabel a:eq( 1 ), #infoTextBox1, #infotextlabel a:eq( 2 ), #infoTextBox2' ).toggle( $( this ).prop( 'checked' ) );
	} );
}
function editWiFiSet( ssid, data ) {
	$( '#infoMessage' ).html(
		 '<i class="fa fa-wifi-3"></i>&ensp;<wh>'+ ssid +'</wh>'
		+'<br>Current: <wh>'+ data.dhcp +'</wh><br>&nbsp;'
	).css( 'text-align', 'center' );
	$( '#infoTextBox1' ).val( data.Address );
	$( '#infoTextBox2' ).val( data.Gateway );
	$( '#infoPasswordBox' ).val( data.Key );
	$( '#infoCheckBox input:eq( 0 )' ).prop( 'checked', 1 );
	$( '#infoCheckBox input:eq( 2 )' ).prop( 'checked', data.Security === 'wep' );
	$( '#infoTextBox' ).val( ssid );
	$( '#infotextlabel a:eq( 0 ), #infoTextBox, #infotextlabel a:eq( 3 ), #infoPasswordBox, #infotextbox .eye, #infoCheckBox' ).hide();
	if ( data.Address ) {
		$( '#infoFooter' ).hide();
	} else {
		$( '#infoFooter' ).html( '<br>*Connect to get DHCP IPs' );
	}
	if ( data.dhcp === 'Static IP' ) {
		$( '#infoOk' ).before( '<a id="infoButton" class="infobtn extrabtn infobtn-default"><i class="fa fa-undo"></i>DHCP</a>' );
		$( '#infoButton' ).click( function() {
			$( '#infoX' ).click();
			$( '#loader' ).removeClass( 'hide' );
			banner( ssid, 'DHCP ...', 'wifi-3' );
			location.href = 'http://'+ G.hostname +'.local/index-settings.php?p=network';
			var ssidfilename = escapeSingleQuote( ssid );
			$.post( 'commands.php', { bash: [
				  "netctl stop '"+ ssidfilename +"'"
				, "sed -i "
					+" -e '/^Address\\|^Gateway/ d'"
					+" -e 's/^IP.*/IP=dhcp/' '/srv/http/data/system/netctl-"+ ssidfilename +"'"
				, "cp '/srv/http/data/system/netctl-"+ ssidfilename +"' '/etc/netctl/"+ ssidfilename +"'"
				, "netctl start '"+ ssidfilename +"'"
			] } );
		} );
	}
}
function escapeString( str ) {
	var string = str
			.replace( /([&()\\])/g, '\$1' )
			.replace( /"/g, '\\\"' );
	return escapeSingleQuote( string )
}
function escapeSingleQuote( str ) {
	return str.replace( /'/g, '\'"\'"\'' );
}
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
	$.post( 'commands.php', { getnetctl: 1 }, function( data ) {
		$( '#codenetctl' )
			.html( data )
			.removeClass( 'hide' );
	} );
}
function newWiFi( $this ) {
	var ssid = $this.data( 'ssid' );
	var wpa = $this.data( 'wpa' );
	info( {
		  icon          : 'wifi-3'
		, title         : ssid
		, passwordlabel : 'Password'
		, oklabel       : 'Connect'
		, ok            : function() {
			var password = $( '#infoPasswordBox' ).val();
			var data = 'Interface='+ wlcurrent
					  +'\nConnection=wireless'
					  +'\nIP=dhcp'
					  +'\nESSID="'+ escapeString( ssid ) +'"'
					  +'\nSecurity='+ ( wpa || 'wep' )
					  +'\nKey="'+ escapeString( password ) +'"';
			connect( ssid, data );
		}
	} );
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
			html += '><i class="fa fa-';
			html += val.interface === 'eth0' ? 'lan"></i>LAN' : 'wifi-3"></i>Wi-Fi';
			if ( val.interface === 'eth0' ) {
				html += val.ip ? '&ensp;<grn>&bull;</grn>&ensp;'+ val.ip : '';
				html += val.gateway ? '<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;</gr>' : '';
			} else if ( val.ip ) {
				if ( accesspoint && G.hostapd && val.ip === G.hostapdip ) {
					html += '&ensp;<grn>&bull;</grn>&ensp;<gr>RPi access point&ensp;&raquo;&ensp;</gr>'+ G.hostapdip
				} else {
					wlconnected = val.interface;
					html += '&ensp;<grn>&bull;</grn>&ensp;'+ val.ip +'<gr>&ensp;&raquo;&ensp;'+ val.gateway +'&ensp;&bull;&ensp;</gr>'+ val.ssid;
				}
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
	qroptions.text = 'WIFI:S:'+ escapeString( G.ssid ) +';T:WPA;P:'+ escapeString( G.passphrase ) +';';
	$( '#qraccesspoint' ).qrcode( qroptions );
	qroptions.text = 'http://'+ G.hostapdip;
	$( '#qrwebuiap' ).qrcode( qroptions );
	$( '#boxqr' ).removeClass( 'hide' );
}
function wlanScan() {
	clearTimeout( intervalscan );
	$( '#scanning-wifi' ).removeClass( 'hide' );
	$.post( 'commands.php', { getjson: '/srv/http/bash/network-wlanscan.sh '+ wlcurrent, nonumeric: 1 }, function( list ) {
		var good = -60;
		var fair = -67;
		var html = '';
		if ( list.length ) {
			$.each( list, function( i, val ) {
				var profile = val.profile;
				html += '<li data-db="'+ val.dbm +'" data-ssid="'+ val.ssid +'" data-encrypt="'+ val.encrypt +'" data-wpa="'+ val.wpa +'"';
				html += val.connected  ? ' data-connected="1"' : '';
				html += val.gateway ? ' data-gateway="'+ val.gateway +'"' : '';
				html += val.ip ? ' data-ip="'+ val.ip +'"' : '';
				html += val.dhcp ? ' data-dhcp="'+ val.dhcp +'"' : '';
				html += val.password ? ' data-password="'+ val.password +'"' : '';
				html += profile ? ' data-profile="'+ profile +'"' : '';
				html += '><i class="fa fa-wifi-'+ ( val.dbm > good ? 3 : ( val.dbm < fair ? 1 : 2 ) ) +'"></i>';
				html += val.connected ? '<grn>&bull;</grn>&ensp;' : '';
				html += val.dbm < fair ? '<gr>'+ val.ssid +'</gr>' : val.ssid;
				html += val.encrypt === 'on' ? ' <i class="fa fa-lock"></i>' : '';
				html += '<gr>'+ val.dbm +' dBm</gr>';
				html += profile && !val.connected ? '&ensp;<i class="fa fa-save"></i>' : '';
			} );
		} else {
			html += '<li><i class="fa fa-lock"></i><gr>(no accesspoints found)</gr></li>';
		}
		$( '#listwifi' ).html( html +'</li>' ).promise().done( function() {
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
	resetLocal();
}
refreshData();

} );
