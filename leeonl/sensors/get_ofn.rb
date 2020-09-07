#! /usr/bin/ruby


ofn_read = `#{File.dirname(__FILE__)}/read_ofn.sh`

r_x = ofn_read.split("\n").first
r_y = (ofn_read.split("\n"))[1]


puts r_x.hex
puts r_y.hex

