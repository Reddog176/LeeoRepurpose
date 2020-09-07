#! /bin/bash

var=1
while [ "$var" -gt 0 ]
do
/usr/lib/leeonl/sensors/led_off.sh
i2cset -y 1 0x4c 0x03 0x7878 w
sleep 1
/usr/lib/leeonl/sensors/led_off.sh
i2cset -y 1 0x4c 0x04 0xD2D2 w
sleep 1
/usr/lib/leeonl/sensors/led_off.sh
i2cset -y 1 0x4c 0x05 0xFFFF w
sleep 1
/usr/lib/leeonl/sensors/led_off.sh
done
