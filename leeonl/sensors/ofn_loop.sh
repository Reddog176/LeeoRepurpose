#! /bin/bash

runtime=$1
cyclenum=$(($runtime/20))
rm /usr/lib/leeonl/sensors/ofn_loop.txt
touch /usr/lib/leeonl/sensors/ofn_loop.txt

i=0
while [ $i -lt $cyclenum ]
do
	/usr/lib/leeonl/sensors/read_ofn.sh >> /usr/lib/leeonl/sensors/ofn_loop.txt
	i=$(($i+1))
done
