#!/bin/bash

# This script checks for a new Night Light image
# If a new version is available, this script will download
# the image and set update_flag = 1 and setup boot from p2
# on next reboot to install the update.

basedir="http://updates.leeo.com/fg400dg09dfg83ldgk99834j5kjdg9/"

# Call in-place update on boot
/usr/bin/software_update.sh

mount /dev/mmcblk0p4 /mnt/data

# Check for new_version.txt, update_patch, and update_patch.md5     
# on server. If any is missing, exit with error                             
curl -s --head $basedir"new_version.txt" | head -n 1 | grep 200 > /dev/null
if [ $? -ne 0 ]; then                                                       
  echo "Incomplete server update file set. Aborting update check"           
  exit 1                                                                    
fi                                                                          

curl -s --head $basedir"update_patch" | head -n 1 | grep 200 > /dev/null
if [ $? -ne 0 ]; then                                                       
  echo "Incomplete server update file set. Aborting update check"           
  exit 1                                                                    
fi                                                                          

curl -s --head $basedir"update_patch.md5" | head -n 1 | grep 200 > /dev/null
if [ $? -ne 0 ]; then                                                       
  echo "Incomplete server update file set. Aborting update check"           
  exit 1                                                                    
fi                                                                          

# Download new_version.txt
curl -s -o /mnt/data/new_version.txt $basedir"new_version.txt" 

echo "Checking if newer update is available from Leeo..."

# If not newer than current version, abort
if [ $(cat /mnt/data/new_version.txt) -le $(cat /mnt/data/version.txt) ]; then
  echo "Current software version is the latest"
  exit 2
fi

echo "New update available. Downloading..."

# Newer update is availabe. Download the update and checksum
curl -s -o /mnt/data/update_patch.md5 $basedir"update_patch.md5" 
curl -s -o /mnt/data/update_patch $basedir"update_patch" 

# Check the md5 to ensure a non-corrupt patch
md5sum -c /mnt/data/update_patch.md5
if [ $? -ne 0 ]; then
  # If the md5 check fails, delete the update and clear the flag
  echo "Update patch md5 checksum failed! Aborting update..."
        
  rm /mnt/data/update_patch                         
  rm /mnt/data/update_patch.md5                                           
  rm /mnt/data/new_version.txt
else
  # Set partition for next boot to p2 and set update flag

  mount /dev/mmcblk0p1 /mnt/boot
  cp /mnt/boot/p2uEnv.txt /mnt/boot/uEnv.txt
  umount /mnt/boot

  echo 1 > /mnt/data/update_flag

  `dirname $0`/flash_green_LEDs.sh &
fi

exit 0
