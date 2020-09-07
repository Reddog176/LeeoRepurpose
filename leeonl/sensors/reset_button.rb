#! /usr/bin/ruby

r_read = `#{File.dirname(__FILE__)}/reset-button.sh`

r_result = r_read.split("\n").first

puts r_result.hex
