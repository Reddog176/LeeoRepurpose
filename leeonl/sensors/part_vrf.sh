#! /bin/bash

if [ -d /usr/lib/leeonl/customer_image ];
then
	echo "partition=3" > /usr/lib/leeonl/sensors/part_wifi.txt
else
	echo "partition=2" > /usr/lib/leeonl/sensors/part_wifi.txt
fi

if [ -f /lib/firmware/ti-connectivity/wl1271-nvs.bin ];
then
	echo "wifi=success" >> /usr/lib/leeonl/sensors/part_wifi.txt
else
	echo "wifi=failed" >> /usr/lib/leeonl/sensors/part_wifi.txt
fi
