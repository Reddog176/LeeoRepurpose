#! /usr/bin/ruby

`#{File.dirname(__FILE__)}/set_light.sh`

cpl = 0.83333333

light_read = `#{File.dirname(__FILE__)}/read_light.sh`

r14 = light_read.split("\n").first
r15 = (light_read.split("\n"))[1]
r16 = (light_read.split("\n"))[2]
r17 = (light_read.split("\n"))[3]

c0 = (r15.hex << 8) | r14.hex
c1 = (r17.hex << 8) | r16.hex

lux1 = (c0 - 1.87 * c1) / cpl
lux2 = (0.63 * c0 - c1) /cpl

out_max = [lux1,lux2,0].max

puts '%.5f' % out_max

