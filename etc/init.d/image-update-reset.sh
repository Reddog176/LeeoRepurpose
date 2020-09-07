#!/bin/sh

### BEGIN INIT INFO
# Provides: image-update-reset
# Required-Start: check-reset-button
# Required-Stop: 
# Should-Start: 
# Should-Stop: 
# Default-Start: S
# Default-Stop: 0 6
# Short-Description: Restore factory image or install update image
# Description: Restore factory image or install update image
### END INIT INFO

# Do nothing in this version of this script
# This version is to replace the real version on the user partition
# Image replacement can only occur from p2
case "$1" in
  start)
    ;;
  stop)
    ;;
  restart)
    ;;
esac

exit 0
