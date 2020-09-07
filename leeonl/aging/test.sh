#! /bin/bash

	/usr/local/bin/eeprom_read 0 16 0 > /usr/lib/leeonl/aging/eeprom_test.txt
	read var_eeprom < /usr/lib/leeonl/aging/eeprom_test.txt
	substring=${var_eeprom:0:5}
	echo $substring
	if [ "$substring" = "     " ]
	then
		eeprom_result=PASS
	else
		eeprom_result=FAILED
	fi
echo $eeprom_result


