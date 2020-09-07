#! /bin/bash

runtime=$1
cyclenum=$(($runtime/40))
rm /usr/lib/leeonl/sensors/pir_loop.txt
touch /usr/lib/leeonl/sensors/pir_loop.txt

i=0
while [ $i -lt $cyclenum ]
do
	/usr/lib/leeonl/sensors/pirmain >> /usr/lib/leeonl/sensors/pir_loop.txt
	sleep 0.04
	i=$(($i+1))
done
