#!/bin/sh

### BEGIN INIT INFO
# Provides: check-updates
# Required-Start: check-reset-button image-update-reset networking
# Required-Stop: 
# Should-Start: 
# Should-Stop: 
# Default-Start: 2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: check server for updates
# Description: check server for image update and initiate background download
### END INIT INFO

case "$1" in
  start)
    mount /dev/mmcblk0p4 /mnt/data
    
    # Redundant safety measure: abort if reset or update flag are set
    if [ $(cat /mnt/data/update_flag) -ne 0 ]; then
      exit 1
    fi
    
    if [ $(cat /mnt/data/factory_reset_flag) -ne 0 ]; then
      exit 1
    fi
    
    # Initiate the update check in the background
    /usr/lib/leeonl/sw-update/download-update.sh &
    ;;
  stop)
    ;;
  restart)
    $0 stop
    $0 start
    ;;
esac

exit 0
