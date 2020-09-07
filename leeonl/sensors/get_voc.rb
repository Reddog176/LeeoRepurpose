#! /usr/bin/ruby

voc_read = `#{File.dirname(__FILE__)}/read_voc.sh`

r_voc = voc_read.split("\n").first
r_ux = (voc_read.split("\n"))[1]
r_rh = (voc_read.split("\n"))[2]
r_pwm = (voc_read.split("\n"))[3]
r_set = (voc_read.split("\n"))[4]

puts r_voc.hex
puts r_ux.hex
puts r_rh.hex
puts r_pwm.hex
puts r_set.hex
