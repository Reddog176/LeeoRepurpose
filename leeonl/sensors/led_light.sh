#!/bin/sh

#CONTROL LEDs.

#Change WHITE LED Duty Cycle
i2cset -y 1 0x4c 0x02 0xFFFF w

#Change RED LED Duty Cycle
i2cset -y 1 0x4c 0x03 0xFFFF w

#Change Green LED Duty Cycle
i2cset -y 1 0x4c 0x04 0xFFFF w

#Change Blue LED Duty Cycle
i2cset -y 1 0x4c 0x05 0xFFFF w

#Turn off all LEDs
#i2cset -y 1 0x4c 0x02 0x0000 w
#i2cset -y 1 0x4c 0x03 0x0000 w
#i2cset -y 1 0x4c 0x04 0x0000 w
#i2cset -y 1 0x4c 0x05 0x0000 w
