#!/bin/sh

#This gets the VOC reading (0x09). Gets 2byte
i2cget -y 1 0x4c 0x09 w

#This gets the Ux reading (0x0A). Gets 2bytes
i2cget -y 1 0x4c 0x0a w

#This gets the RH resistor value (0x0B). Gets 2bytes
i2cget -y 1 0x4c 0x0b w

#This gets the PWM value (0x0C). Gets 2bytes
i2cget -y 1 0x4c 0x0c w

#This gets the SetpointRH Value (0x0D). Gets 2bytes
i2cget -y 1 0x4c 0x0d w
