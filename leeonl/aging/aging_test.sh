#! /bin/bash

runtime=$1
led_pid=$2
((begin_time=10#`date +%H%M`))
end_time=$[$begin_time+$runtime]
echo "begin_time="$begin_time > /usr/lib/leeonl/aging/time.txt
echo "end_time="$end_time >> /usr/lib/leeonl/aging/time.txt
var_date=`date +%Y%m%d`
string=abcd123x

emmc_result=null
eeprom_result=null
humid_result=null
temp_result=null
therm_result=null
ofn_result=null
als_result=null
reset_result=null

hwclock --hctosys
echo "Begin_Date: "$var_date > /usr/lib/leeonl/aging/aging_log.txt
var_time=`date +%H%M`
echo "Begin_Time: "$var_time >> /usr/lib/leeonl/aging/aging_log.txt
((var_time=10#`date +%H%M`))
	/usr/lib/leeonl/sensors/get_light.rb | /usr/lib/leeonl/aging/als > /usr/lib/leeonl/aging/als.txt

while [ "$var_time" -lt "$end_time" ]
do 
	current_date=`date +%-d`
	if [ "$current_date" -gt 1 ]
	then
		hwclock --hctosys
		echo synchronism >> /usr/lib/leeonl/aging/led.txt
	fi
	echo $var_time >> /usr/lib/leeonl/aging/time.txt

	((var_time=10#`date +%H%M`))
	
	if [ "$var_time" -lt "$begin_time" ]
	then
		end_time=$[$begin_time+$runtime-2400]
	fi

	echo $string > /usr/lib/leeonl/aging/emmc_test.txt
	read var_emmc < /usr/lib/leeonl/aging/emmc_test.txt
	if [ "$var_emmc" = $string ]
	then
		emmc_result=PASS
	else
		emmc_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh
		break
	fi	

	/usr/local/bin/eeprom_read 0x40 16 0 > /usr/lib/leeonl/aging/eeprom_test.txt
	read var_eeprom < /usr/lib/leeonl/aging/eeprom_test.txt
	substring=${var_eeprom:0:5}
	if [ "$substring" = "QTFMM" ]
	then
		eeprom_result=PASS
	else
		eeprom_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi

	/usr/lib/leeonl/sensors/get_humidity.rb | /usr/lib/leeonl/aging/humid > /usr/lib/leeonl/aging/humid.txt
	read var_humid < /usr/lib/leeonl/aging/humid.txt
	if [ "$var_humid" -eq 1 ]
	then
		humid_result=PASS
	else
		humid_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi

	/usr/lib/leeonl/sensors/get_temperature.rb | /usr/lib/leeonl/aging/temp > temp.txt
	read var_temp < temp.txt
	if [ "$var_temp" -eq 1 ]
	then
		temp_result=PASS
	else
		temp_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi
	
	/usr/lib/leeonl/sensors/thermapile.rb | /usr/lib/leeonl/aging/temp > temp.txt
	read var_therm < temp.txt
	if [ "$var_therm" -eq 1 ]
	then
		therm_result=PASS
	else
		therm_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi

	/usr/lib/leeonl/sensors/get_ofn.rb > /usr/lib/leeonl/aging/ofn.txt
	read var_ofn < /usr/lib/leeonl/aging/ofn.txt
	if [ "$var_ofn" -ge 0 ] & [ "$var_ofn" -le 255 ]
	then
		ofn_result=PASS
	else
		ofn_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi

	/usr/lib/leeonl/sensors/reset-button.sh > /usr/lib/leeonl/aging/reset.txt
	read var_reset < /usr/lib/leeonl/aging/reset.txt
	if [ "$var_reset" -eq 0 ]
	then
		reset_result=PASS
	else
		reset_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi


	/usr/lib/leeonl/sensors/get_light.rb | /usr/lib/leeonl/aging/als > /usr/lib/leeonl/aging/als.txt
	read var_als < /usr/lib/leeonl/aging/als.txt
	if [ "$var_als" -eq 1 ]
	then
		als_result=PASS
	else
		als_result=FAILED
		kill -9 $led_pid
		/usr/lib/leeonl/sensors/led_off.sh
		/usr/lib/leeonl/sensors/led_red.sh

		break
	fi
done

if [ "$var_time" -eq "$end_time" ]
then
	kill -9 $led_pid
	/usr/lib/leeonl/sensors/led_off.sh
	i2cset -y 1 0x4c 0x04 0xFFFF w
fi
var_time=`date +%H%M`
echo "End_Time="$var_time >> /usr/lib/leeonl/aging/aging_log.txt
echo "EMMC_Result="$emmc_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "EEPROM_Result="$eeprom_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "Humidity_Result="$humid_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "Temperature_Result="$temp_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "Thermopile_Result"=$therm_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "OFN_Result="$ofn_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "ALS_Result="$als_result >> /usr/lib/leeonl/aging/aging_log.txt
echo "Reset_Result="$reset_result >> /usr/lib/leeonl/aging/aging_log.txt 

rm /usr/lib/leeonl/aging/non-aging.txt
