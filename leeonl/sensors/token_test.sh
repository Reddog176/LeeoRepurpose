#! /bin/bash

rm /usr/lib/leeonl/sensors/token_log.txt
touch /usr/lib/leeonl/sensors/token_log.txt

string=abcd123x

emmc_result=null
eeprom_result=null
humid_result=null
temp_result=null
ofn_result=null
als_result=null
reset_result=null
/usr/lib/leeonl/sensors/get_light2.rb

	echo $string > /usr/lib/leeonl/sensors/emmc_test.txt
	read var_emmc < /usr/lib/leeonl/sensors/emmc_test.txt
	if [ "$var_emmc" = $string ]
	then
		emmc_result=PASS
	else
		emmc_result=FAILED
	fi	

	/usr/local/bin/eeprom_read 0x40 16 0 > /usr/lib/leeonl/sensors/eeprom_test.txt
	read eeprom_result < /usr/lib/leeonl/sensors/eeprom_test.txt

	/usr/lib/leeonl/sensors/get_humidity.rb > /usr/lib/leeonl/sensors/humid.txt
	read humid_result < /usr/lib/leeonl/sensors/humid.txt

	/usr/lib/leeonl/sensors/get_temperature.rb > /usr/lib/leeonl/sensors/temp.txt
	read temp_result < /usr/lib/leeonl/sensors/temp.txt
	
	/usr/lib/leeonl/sensors/thermapile.rb > /usr/lib/leeonl/sensors/therm.txt
	read therm_result < therm.txt
	
	/usr/lib/leeonl/sensors/get_ofn.rb > /usr/lib/leeonl/sensors/ofn.txt
	read var_ofn < /usr/lib/leeonl/sensors/ofn.txt
	if [ "$var_ofn" -eq 0 ]
	then
		ofn_result=PASS
	else
		ofn_result=FAILED
	fi

	/usr/lib/leeonl/sensors/reset-button.sh > /usr/lib/leeonl/sensors/reset.txt
	read var_reset < /usr/lib/leeonl/sensors/reset.txt
	if [ "$var_reset" -eq 0 ]
	then
		reset_result=PASS
	else
		reset_result=FAILED
	fi


	/usr/lib/leeonl/sensors/get_light2.rb > /usr/lib/leeonl/sensors/als.txt
	read als_result < /usr/lib/leeonl/sensors/als.txt


echo "EMMC_Result="$emmc_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "EEPROM_Result="$eeprom_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "Humidity_Result="$humid_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "Temperature_Result="$temp_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "Thermopile_Result"=$therm_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "OFN_Result="$ofn_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "ALS_Result="$als_result >> /usr/lib/leeonl/sensors/token_log.txt
echo "Reset_Result="$reset_result >> /usr/lib/leeonl/sensors/token_log.txt 

