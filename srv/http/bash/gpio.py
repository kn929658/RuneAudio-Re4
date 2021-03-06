#!/usr/bin/python
import RPi.GPIO as GPIO
import json
import sys
import os
import subprocess
import time
from urllib.request import urlopen
from urllib.request import Request

ON = 1
OFF = 0

with open( '/srv/http/data/system/gpio.json' ) as jsonfile:
    gpio = json.load( jsonfile )

name = gpio[ 'name' ]
pin = name.keys();
pin = [ int( n ) for n in pin ]

GPIO.setwarnings( 0 )
GPIO.setmode( GPIO.BOARD )
GPIO.setup( pin, GPIO.OUT )

on   = gpio[ 'on' ]
on1  = on[ 'on1' ]
ond1 = on[ 'ond1' ]
on2  = on[ 'on2' ]
ond2 = on[ 'ond2' ]
on3  = on[ 'on3' ]
ond3 = on[ 'ond3' ]
on4  = on[ 'on4' ]
onpins = [ on1, on2, on3, on4 ]
onenable = [ n for n in onpins if n != 0 ]

ond = ond1 + ond2 + ond3

state = GPIO.input( onenable[ 0 ] )

onoff = 'ON' if state == 1 else 'OFF'
print( onoff )

len( sys.argv ) > 1 and sys.argv[ 1 ] == 'state' and exit()

gpiofile = '/srv/http/data/tmp/gpiotimer'

off   = gpio[ 'off' ]
off1  = off[ 'off1' ]
offd1 = off[ 'offd1' ]
off2  = off[ 'off2' ]
offd2 = off[ 'offd2' ]
off3  = off[ 'off3' ]
offd3 = off[ 'offd3' ]
off4  = off[ 'off4' ]
offpins = [ off1, off2, off3, off4 ]
offenable = [ n for n in offpins if n != 0 ]

offd = offd1 + offd2 + offd3

timer = gpio[ 'timer' ]

onorder = []
on1 != 0 and onorder.append( name[ str( on1 ) ] ) # name[ key ] - keys are strings
on2 != 0 and onorder.extend( [ ond1, name[ str( on2 ) ] ] )
on3 != 0 and onorder.extend( [ ond2, name[ str( on3 ) ] ] )
on4 != 0 and onorder.extend( [ ond3, name[ str( on4 ) ] ] )

offorder = []
off1 != 0 and offorder.append( name[ str( off1 ) ] )
off2 != 0 and offorder.extend( [ offd1, name[ str( off2 ) ] ] )
off3 != 0 and offorder.extend( [ offd2, name[ str( off3 ) ] ] )
off4 != 0 and offorder.extend( [ offd3, name[ str( off4 ) ] ] )

# broadcast pushstream
def pushstream( channel, data ):
    req = Request(
        'http://127.0.0.1/pub?id='+ channel,
        json.dumps( data ).encode( 'utf-8' ),
        { 'Content-type': 'application/json' }
    )
    urlopen( req )
    