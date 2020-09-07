#! /usr/bin/ruby

#Function to switch high and low byte
def convert_therm_temp(hex_string)
	msb=('0x'+hex_string.slice(4,2)).hex
	lsb=(hex_string.slice(0,4)).hex
	result=(msb<<8)|lsb
end

temp1=`i2cget -y 1 0x45 0x01 w`
temp2=convert_therm_temp(temp1)
temp3=(temp2>>2)
temp4=temp3/32.0
puts temp4
