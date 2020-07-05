<?php
$timezone = exec( "timedatectl | awk '/zone:/ {print $3}'" );
date_default_timezone_set( $timezone );
$timezonelist = timezone_identifiers_list();
$selecttimezone = '<select id="timezone">';
foreach( $timezonelist as $key => $zone ) {
	$datetime = new DateTime( 'now', new DateTimeZone( $zone ) );
	$offset = $datetime->format( 'P' );
	$zonename = preg_replace( [ '/_/', '/\//' ], [ ' ', ' <gr>&middot;</gr> ' ], $zone );
	$selecttimezone.= '<option value="'.$zone.'">'.$zonename.'&ensp;'.$offset.'</option>\n';
}
$selecttimezone.= '</select>';

$i2slist = json_decode( file_get_contents( '/srv/http/settings/system-i2s.json' ) );
$optioni2s = '';
foreach( $i2slist as $name => $sysname ) {
	$optioni2s.= '<option value="'.$sysname.'">'.$name.'</option>';
}
$regdomlist = json_decode( file_get_contents( '/srv/http/settings/regdom.json' ) );
$optionregdom = '';
foreach( $regdomlist as $country => $code ) {
	$optionregdom.= '<option value="'.$code.'">'.$country.'</option>';
}
?>
<div>
<heading>System<?=$help?></heading>
<div id="systemlabel" class="col-l text gr"></div>
<div id="system" class="col-r text"></div>
<div class="col-r">
	<span class="help-block hide"><br><i class="fa fa-gear"></i>&ensp;Shortcut to each setting</span>
</div>
</div>

<div>
<heading id="refresh" class="status">Status<i class="fa fa-refresh"></i><?=$help?></heading>
<div id="statuslabel" class="col-l text gr"></div>
<div id="status" class="col-r text"></div>

<div class="col-l"></div>
<div class="col-r">
	<span class="help-block hide">
		<br><gr><i class="fa fa-refresh"></i>&emsp;Toggle refresh every 10 seconds.</gr>
		<br>
		<br>CPU Load: Average number of processes which are being executed and in waiting calculated over 1, 5 and 15 minutes. Each one should not be constantly over 0.75 x CPU cores.
		<br>CPU temperature:
		<div style="margin-left: 20px">
			- 80-84°C: ARM cores throttled.
			<br>- 85°C: ARM cores and GPU throttled.
			<br>- RPi 3B+: 60°C soft limit (optimized throttling)
		</div>
	</span>
</div>
</div>

<div>
<heading>Renderer<?=$help?></heading>
	<?php if ( file_exists( '/usr/bin/shairport-sync' ) ) { ?>
<div class="col-l double"><a>AirPlay<br><gr>Shairport-sync</gr></a><i class="fa fa-airplay fa-lg"></i></div>
<div class="col-r">
	<input id="airplay" type="checkbox">
	<div class="switchlabel" for="airplay"></div>
	<span class="help-block hide">RuneAudio as AirPlay rendering device.
		<br>(Note: Enable AirPlay will also enable URL by Name.)</span>
</div>
	<?php }
		  if ( file_exists( '/usr/bin/snapserver' ) ) { ?>
<div id="divsnapclient">
	<div class="col-l double"><a>SnapClient<br><gr>Snapcast</gr></a><i class="fa fa-snapcast fa-lg"></i></div>
	<div class="col-r">
		<input id="snapclient" type="checkbox">
		<div class="switchlabel" for="snapclient"></div>
		<i id="setting-snapclient" class="setting fa fa-gear hide"></i>
		<span class="help-block hide">
			Connect: Menu >&ensp;<i class="fa fa-folder-cascade"></i>&ensp;Sources |&ensp;<i class="fa fa-snapcast"></i>
			<br>(Note: Not available while Snapcast server enabled.)
		</span>
	</div>
</div>
	<?php }
		  if ( file_exists( '/usr/bin/spotifyd' ) ) { ?>
<div class="col-l double"><a>Spotify<br><gr>Spotifyd</gr></a><i class="fa fa-spotify fa-lg"></i></div>
<div class="col-r">
	<input id="spotify" type="checkbox">
	<div class="switchlabel" for="spotify"></div>
	<i id="setting-spotify" class="setting fa fa-gear hide"></i>
	<span class="help-block hide">
		RuneAudio as Spotify Connect device.(For Premium account only)
		<br><i class="fa fa-gear"></i>&ensp;Manually select audio output (when default not working only)
	</span>
</div>
	<?php }
		  if ( file_exists( '/usr/bin/upmpdcli' ) ) { ?>
<div class="col-l double"><a>UPnP<br><gr>upmpdcli</gr></a><i class="fa fa-upnp fa-lg"></i></div>
<div class="col-r">
	<input id="upnp" type="checkbox">
	<div class="switchlabel" for="upnp"></div>
	<i id="setting-upnp" class="setting fa fa-gear hide"></i>
	<span class="help-block hide">RuneAudio as UPnP / DLNA rendering device.</span>
</div>
	<?php } ?>
</div>

<div>
<heading>Streamer<?=$help?></heading>
<div class="col-l double"><a>For browsers<br><gr>MPD http</gr></a><i class="fa fa-webradio fa-lg"></i></div>
<div class="col-r">
	<input id="streaming" type="checkbox">
	<div class="switchlabel" for="streaming"></div>
	<span class="help-block hide">Asynchronous streaming for browsers via <code id="ip"></code> (Latency - several seconds)</span>
</div>
	<?php if ( file_exists( '/usr/bin/snapserver' ) ) { ?>
<div class="col-l double"><a>Synchronous<br><gr>Snapcast</gr></a><i class="fa fa-snapcast fa-lg"></i></div>
<div class="col-r">
	<input id="snapcast" type="checkbox">
	<div class="switchlabel" for="snapcast"></div>
	<span class="help-block hide">
		Synchronous streaming for multiroom audio
		<br>Clients can be either RPis with RuneAudio+R e or Snapcast capable devices.
		<br>(Note: Enable Snapcast will disable SnapClient.)
	</span>
</div>
	<?php } ?>
</div>

<div>
<heading>Features<?=$help?></heading>
	<?php if ( file_exists( '/usr/bin/chromium' ) ) { ?>
<div class="col-l double"><a>Browser on RPi<br><gr>Chromium</gr></a><i class="fa fa-chromium fa-lg"></i></div>
<div class="col-r">
	<input id="localbrowser" type="checkbox">
	<div class="switchlabel" for="localbrowser"></div>
	<i id="setting-localbrowser" class="setting fa fa-gear"></i>
	<span class="help-block hide">Browser on RPi connected screen. (Overscan change needs reboot.)</span>
</div>
	<?php } 
		if ( file_exists( '/usr/bin/smbd' ) ) { ?>
<div class="col-l double"><a>File Sharing<br><gr>Samba</gr></a><i class="fa fa-network fa-lg"></i></div>
<div class="col-r">
	<input id="samba" type="checkbox">
	<div class="switchlabel" for="samba"></div>
	<i id="setting-samba" class="setting fa fa-gear"></i>
	<span class="help-block hide">
		Share files on RuneAudio.
		<br>Set sources permissions for read+write - directory: <code>0777</code> file: <code>0555</code>
		<br><i class="fa fa-gear"></i>&ensp;Enable/disable write.
	</span>
</div>
	<?php } ?>
<div class="col-l double"><a>Password Login<br><gr>Blowfish</gr></a><i class="fa fa-lock-circle fa-lg"></i></div>
<div class="col-r">
	<input id="login" type="checkbox"<?=( password_verify( 'rune', file_get_contents( '/srv/http/data/system/password' ) ) ? ' data-default="1"' : '' )?>>
	<div class="switchlabel" for="password"></div>
	<i id="setting-login" class="setting fa fa-gear"></i>
	<span class="help-block hide">Browser interface login. (Default: <code>rune</code>)</span>
</div>
<div class="col-l double"><a>Play on Startup<br><gr>System</gr></a><i class="fa fa-refresh-play fa-lg"></i></div>
<div class="col-r">
	<input id="autoplay" type="checkbox">
	<div class="switchlabel" for="autoplay"></div>
	<span class="help-block hide">Start playing automatically after boot.</span>
</div>
</div>

<div>
<heading>Audio<?=$help?></heading>
<div class="col-l">I&#178;S Module</div>
<div class="col-r i2s">
	<div id="divi2smodulesw">
		<input id="i2smodulesw" type="checkbox">
		<div class="switchlabel" for="i2smodulesw"></div>
	</div>
	<div id="divi2smodule">
		<select id="i2smodule" data-style="btn-default btn-lg">
			<?=$optioni2s?>
		</select>
	</div>
	<span class="help-block hide">I&#178;S modules are not plug-and-play capable. Select a driver for installed device.</span>
</div>

<div class="col-l">Sound Profile</div>
<div class="col-r">
	<input id="soundprofile" type="checkbox">
	<div class="switchlabel" for="soundprofile"></div>
	<i id="setting-soundprofile" class="setting fa fa-gear"></i>
	<span class="help-block hide">Tweak system parameters:
		<br><code>sysctl vm.swappiness=N</code>
		<br><code>sysctl kernel.sched_latency_ns=NS</code>
		<div id="eth0help">
			<code>ip link set eth0 mtu BYTE</code>
			<br><code>ip link set eth0 txqueuelen N</code>
		</div>
	</span>
</div>
</div>

<div>
<heading>On-board Devices<?=$help?></heading>
<div id="divonboardaudio">
	<div class="col-l">Audio</div>
	<div class="col-r">
		<input id="onboardaudio" type="checkbox">
		<div class="switchlabel" for="onboardaudio"></div>
		<span class="help-block hide">Should be disabled if use other devices as audio output.</span>
	</div>
</div>
	<?php $hwcode = exec( '/usr/bin/sudo /usr/bin/awk \'/Revision/ {print substr($NF, 4, 2)}\' /proc/cpuinfo' );
		if ( in_array( $hwcode, [ '0c', '08', '0e', '0d', '11' ] ) ) { # rpi with wireless
			if ( file_exists( '/usr/bin/bluetoothctl' ) ) { ?>
<div class="col-l">Bluetooth</div>
<div class="col-r">
	<input id="bluetooth" type="checkbox">
	<div class="switchlabel" for="bluetooth"></div>
	<span class="help-block hide">Should be disabled if not used.</span>
</div>
		<?php } ?>
<div class="col-l">Wi-Fi</div>
<div class="col-r">
	<input id="wlan" type="checkbox">
	<div class="switchlabel" for="wlan"></div>
	<span class="help-block hide">Should be disabled if not used.</span>
</div>
	<?php } ?>
</div>

<div>
<heading>Environment<?=$help?></heading>
<div class="col-l">Name</div>
<div class="col-r">
	<input type="text" id="hostname" readonly style="cursor: pointer">
	<span class="help-block hide">Name for Bluetooth, Renderers, RPi access point and system.</span>
</div>
<div class="col-l">Timezone</div>
<div class="col-r">
	<?=$selecttimezone?>
	<i id="setting-ntp" class="settingedit fa fa-gear"></i>
	<span class="help-block hide"><i class="fa fa-gear"></i>&ensp;Set Network Time Protocol (NTP) server.</span>
</div>
	<?php $wlan = exec( 'ifconfig | grep -q ^wlan && echo 1 || echo 0' );
		if ( $wlan ) { ?>
<div class="regdom">
<div class="col-l">Regulatory Domain</div>
<div class="col-r">
	<select id="regdom" data-style="btn-default btn-lg">
		<?=$optionregdom?>
	</select>
	<span class="help-block hide">For wireless - set available channels and transmit power permitted by local regulations.
	<br>Default: (Generic / World) - Least common denominator settings, channels and transmit power are permitted in all countries.
	<br>Note: Active regulatory domian may be negotiated and set by connected router.
	</span>
</div>
</div>
	<?php } ?>
</div>
	<?php if ( $wlan ) { ?>
<div class="regdom">
<heading id="iwregget" class="status">Active regdom<i class="fa fa-code"></i><?=$help?></heading>
<span class="help-block hide"><code>iw reg get</code></span>
<pre id="codeiwregget" class="hide"></pre>
</div>
	<?php } ?>
<div>
<heading id="journalctl" class="status">Boot Log<i id="journalctlicon" class="fa fa-code"></i><?=$help?></heading>
<span class="help-block hide"><code>journalctl -b | sed -n '1,/Startup finished/ p'</code></span>
<pre id="codejournalctl" class="hide"></pre>
</div>

<div>
<heading id="configtxt" class="status">/boot/config.txt<i class="fa fa-code"></i><?=$help?></heading>
<span class="help-block hide"><code>cat /boot/config.txt</code></span>
<pre id="codeconfigtxt" class="hide"></pre>
</div>

<div>
<heading id="backuprestore" class="status">Backup/Restore Settings<i class="fa fa-gear"></i><?=$help?></heading>
<span class="help-block hide">Backup or restore all settings and  MPD database.</span>
</div>

<div style="clear: both"></div>
