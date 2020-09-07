#!/bin/bash

/usr/lib/leeonl/sensors/led_off.sh
while [ 1 -lt 2 ]
do
	/usr/lib/leeonl/sensors/led_red.sh
	sleep 1
	/usr/lib/leeonl/sensors/led_off.sh
	/usr/lib/leeonl/sensors/led_green.sh
	sleep 1
	/usr/lib/leeonl/sensors/led_off.sh
	/usr/lib/leeonl/sensors/led_blue.sh
	sleep 1
	/usr/lib/leeonl/sensors/led_off.sh
	i2cset -y 1 0x4c 0x02 0x0F0F w
	sleep 1
	/usr/lib/leeonl/sensors/led_off.sh

done

