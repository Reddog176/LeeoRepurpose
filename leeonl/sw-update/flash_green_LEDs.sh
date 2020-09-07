/usr/local/sbin/i2cset -y 1 0x4c 0x02 0x0000 w                          
/usr/local/sbin/i2cset -y 1 0x4c 0x03 0x0000 w                          
/usr/local/sbin/i2cset -y 1 0x4c 0x04 0x0000 w                          
/usr/local/sbin/i2cset -y 1 0x4c 0x05 0x0000 w                          

while :; do                                                   
  /usr/local/sbin/i2cset -y 1 0x4c 0x04 0xFFFF w                          
  #sleep 1                                                                
  perl -e 'select(undef,undef,undef,.2)'                                  
  /usr/local/sbin/i2cset -y 1 0x4c 0x04 0x0000 w                          
  #sleep 1                                                                
  perl -e 'select(undef,undef,undef,.2)'                                  
done
