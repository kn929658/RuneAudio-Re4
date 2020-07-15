var stopwatch = '<span class="stopwatch">'
				+'<i class="fa fa-stopwatch-i fa-spin"></i>'
				+'<i class="fa fa-stopwatch-o"></i>'
				+'</span>';
var timer = false; // for 'setInterval' status check

$( '#gpio' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'submenu' ) ) {
		location.href = 'gpiosettings.php';
	} else {
		bash( '/usr/local/bin/'+ ( G.gpio ? 'gpiooff.py' : 'gpioon.py' ) );
	}
} );

onVisibilityChange( function( visible ) {
	if ( visible ) gpioOnOff();
} );
function gpioCountdown( i, iL, delays ) {
	setTimeout( function() {
		$( '#device'+ i ).toggleClass( 'gr' );
		i++;
		i < iL ? gpioCountdown( i, iL, delays ) : setTimeout( infoReset, 1000 );
	}, delays[ i ] * 1000 );
	
}
function gpioOnOff() {
	bash( 'test -e /srv/http/data/tmp/gpiotimer && echo true || echo false', function( state ) {
		G.gpio = state;
		var prefix = G.display.time ? 'ti' : 'i';
		$( '#'+ prefix +'-gpio' ).toggleClass( 'hide', !G.gpio );
		$( '#gpio .fa-gpio' ).toggleClass( 'on', G.gpio );
	}, 'json' );
}
gpioOnOff();
function psGPIO( response ) { // on receive broadcast
	var state = response.state;
	G.gpio = state;
	var delay = response.delay;
	if ( timer ) { // must clear before pnotify can remove
		clearInterval( timer );
		timer = false;
	}
	if ( state === 'RESET' ) {
		$( '#infoX' ).click();
	} else if ( state === 'IDLE' ) {
		info( {
			  icon        : 'gpio'
			, title       : 'GPIO Idle Timer'
			, message     : 'Power Off Countdown:<br><br>'
						   + stopwatch +'&ensp;<white>'+ delay +'</white>'
			, oklabel     : 'Reset'
			, ok          : function() {
				sh( [ 'gpiotimerreset' ] );
			}
		} );
		timer = setInterval( function() {
			if ( delay === 1 ) {
				G.gpio = false;
				setButtonToggle();
				$( '#infoX' ).click();
				clearInterval( timer );
			}
			$( '#infoMessage white' ).text( delay-- );
		}, 1000 );
	} else {
		var onoff = state === true ? 'ON' : 'OFF';
		var order = response.order;
		var delays = [ 0 ];
		var devices = ''
		$.each( order, function( i, val ) {
			if ( i % 2 ) {
				delays.push( val );
			} else {
				devices += '<br><a id="device'+ i / 2 +'" class="'+ ( state ? 'gr' : '' ) +'">'+ val +'</a>';
			}
		} );
		info( {
			  icon      : 'gpio'
			, title     : 'GPIO'
			, message   : stopwatch +' <wh>Power '+ onoff +'</wh><hr>'
						+ devices
			, nobutton  : 1
		} );
		var iL = delays.length;
		var i = 0
		gpioCountdown( i, iL, delays );
		setTimeout( function() {
			setButtonToggle();
		}, delay * 1000 );
	}
}
