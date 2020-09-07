#!/bin/sh

### BEGIN INIT INFO
# Provides: check-reset-button
# Required-Start: 
# Required-Stop: 
# Should-Start: 
# Should-Stop: 
# Default-Start: S
# Default-Stop: 0 6
# Short-Description: check if reset button held
# Description: check if reset button held, if so enter factory reset mode
### END INIT INFO

case "$1" in
  start)
    if [ $(cat /sys/class/gpio/gpio17/value) -eq 1 ]; then
      # Button is pressed: blink blue lights
      sleep 7
      if [ $(cat /sys/class/gpio/gpio17/value) -eq 0 ]; then
        echo "Setting /mnt/data/factory_reset_flag = 1..."
        /usr/local/sbin/i2cset -y 1 0x4c 0x02 0x0000 w
        /usr/local/sbin/i2cset -y 1 0x4c 0x03 0x0000 w
        /usr/local/sbin/i2cset -y 1 0x4c 0x04 0x0000 w
        /usr/local/sbin/i2cset -y 1 0x4c 0x05 0x0000 w
        for i1 in 1 2 3 4 5; do
            /usr/local/sbin/i2cset -y 1 0x4c 0x05 0xFFFF w
            #sleep 1
            perl -e 'select(undef,undef,undef,.2)'
            /usr/local/sbin/i2cset -y 1 0x4c 0x05 0x0000 w
            #sleep 1
            perl -e 'select(undef,undef,undef,.2)'
        done
        /usr/local/sbin/i2cset -y 1 0x4c 0x02 0x0000 w
        /usr/local/sbin/i2cset -y 1 0x4c 0x03 0x0000 w
        /usr/local/sbin/i2cset -y 1 0x4c 0x04 0x0000 w
        /usr/local/sbin/i2cset -y 1 0x4c 0x05 0x0000 w

        mount /dev/mmcblk0p4 /mnt/data
        echo 1 > /mnt/data/factory_reset_flag
        echo 0 > /mnt/data/update_flag
        sync

        # Set factory_reset_flag = 1 to trigger mmcblk0p2 boot in reset mode (partition 2)
        mount /dev/mmcblk0p1 /mnt/boot
        cp /mnt/boot/p2uEnv.txt /mnt/boot/uEnv.txt
        sync
        umount /mnt/boot

        echo "REBOOTING NOW..."
        reboot
      else
        echo "Stuck button, not performing a factory reset"
      fi

    fi
    ;;
  stop)
    ;;
  restart)
    $0 stop
    $0 start
    ;;
esac

exit 0
