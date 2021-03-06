#!/usr/bin/python
from gpio import *

state != ON and exit()

# broadcast pushstream
pushstream( 'gpio', { 'state': False, 'delay': offd, 'order': offorder } )

if off1 != 0:
    GPIO.output( off1, OFF )
if off2 != 0:
    time.sleep( offd1 )
    GPIO.output( off2, OFF )
if off3 != 0:
    time.sleep( offd2 )
    GPIO.output( off3, OFF )
if off4 != 0:
    time.sleep( offd3 )
    GPIO.output( off4, OFF )

sys.stderr = object
os.remove( gpiofile )
os.remove( '/srv/http/data/system/usbdac' )
