#! /usr/bin/ruby

`echo '1-004c' > /sys/bus/i2c/devices/1-004c/driver/unbind`

tmp = `#{File.dirname(__FILE__)}/set_ofn.sh`

tmp = `#{File.dirname(__FILE__)}/set_light.sh`


name_sensors = "Timestamp                   Humidity      Temperature     Ambient    Light       VOC  UX   RH   PWM  SetRH   Ofn_x   Ofn_y\n"

File.open("data_sensors.txt",'w') { |f| f.write(name_sensors) } 

puts  name_sensors

while true

humidity = `#{File.dirname(__FILE__)}/get_humidity.rb`

temperature = `#{File.dirname(__FILE__)}/get_temperature.rb`


light2 = `#{File.dirname(__FILE__)}/get_light.rb`

light = light2.gsub(/\n/,"   ")

voc2 = `#{File.dirname(__FILE__)}/get_voc.rb`

voc = voc2.gsub(/\n/,"    ")

ofn2 = `#{File.dirname(__FILE__)}/get_ofn.rb`

ofn = ofn2.gsub(/\n/,"    ")

#pir2 = `#{File.dirname(__FILE__)}/get_pir.rb`

#pir = pir2.gsub(/\n/,"    ")




time = Time.now

#Time.zone = 'Pacific Time (US & Canada)'

data = time.localtime("-08:00").to_s +  "    " + humidity.chomp + "      "+ temperature.chomp + "       " + light + "    " + voc + "     " + ofn


puts data 

File.open('data_sensors.txt', 'a') { |f| f.write(data+"\n") }

sleep 0.001

end
