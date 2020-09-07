#!/usr/bin/ruby
data_reading = `#{File.dirname(__FILE__)}/read_dust.sh` # get sensor reading
sanitized_data_value = data_reading.gsub(/0x/,"").gsub(/\n/,"").hex
normalize_sanitized_data_value = 1000 * (0.172 * ((sanitized_data_value.to_f / 10000) * 1.515))
puts normalize_sanitized_data_value
