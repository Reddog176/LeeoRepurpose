#! /usr/bin/ruby

def convert_sht(hex_string)
  msb = ('0x' + hex_string.slice(4, 2)).hex
  lsb = (hex_string.slice(0, 4)).hex
  result = (msb << 8) | lsb
#  result &= ~0x03
  result =  -46.85 + 175.72 / 65536.00 * result.to_f
end

#def convert_tmp(hex_string)
#  msb = ('0x' + hex_string.slice(4, 2)).hex
#  lsb = (hex_string.slice(0, 4)).hex
#  result = (msb << 4) + (lsb >> 4)
#  result * 0.0625
#end

sht_result = `./sensors/read/read_sht_temp.sh`
#tmp_result = `#{File.dirname(__FILE__)}/read_tmp.sh`

sht_final = convert_sht(sht_result)
#tmp_final = convert_tmp(tmp_result)

#average = (sht_final + tmp_final) / 2
#fahrenheit = average * 9 / 5 + 32
puts '%.5f' % sht_final
