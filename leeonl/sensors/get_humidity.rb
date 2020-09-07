#! /usr/bin/ruby

def convert_humidity(hex_string)
  msb = ('0x' + hex_string.slice(4, 2)).hex
  lsb = (hex_string.slice(0, 4)).hex
  result = (msb << 8) | lsb
#  result &= ~0x03
 result =  -6.0 + 125.0 / 65536.0 * result.to_f
end

humidity = `#{File.dirname(__FILE__)}/read_sht_humidity.sh`

humidity = convert_humidity(humidity)

puts '%.5f' % humidity
