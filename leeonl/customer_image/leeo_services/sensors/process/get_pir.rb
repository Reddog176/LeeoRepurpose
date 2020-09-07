#! /usr/bin/ruby

pir_read = `./sensors/read/read_pir.sh`

r_temp = pir_read.split("\n").first
r_c1 = (pir_read.split("\n"))[1]
r_c0 = (pir_read.split("\n"))[2]



puts r_temp.hex
puts r_c1.hex
puts r_c0.hex

