#!/bin/sh
# Helper script for rc.local to install Leeo device packages

# TODO: Continue only if wi-fi is setup
# Also consider connection interruption 

leeo_packages_list='node ruby1.9.3 python alsa-utils libsamplerate0-dev libsndfile1-dev jackd uptimed leeonl'

# Install wget to copy over the s3 method needed for the leeo apt repo
dpkg -s wget 2>&1 /dev/null
ret_code=$?
if [ $ret_code -ne  0 ]; then
    apt-get -y install wget
fi

# Copy over the s3 method binary if it doesn't already exist
if [ ! -e /usr/lib/apt/methods/s3 ]; then
    wget https://updates.leeo.com.s3-us-west-1.amazonaws.com/s3 -O /usr/lib/apt/methods/s3
    chmod +x /usr/lib/apt/methods/s3
    echo "Finished installing S3 method for apt" >> /var/log/leeo/system.log
else
    echo "S3 method found." >> /var/log/leeo/system.log
fi

# Add the leeo repo to the apt sources list if it does not already exist
if [ ! -e /etc/apt/sources.list.d/leeo.list ]; then
	touch /etc/apt/sources.list.d/leeo.list
fi

ret_code=$(grep -Fxq 'deb s3://AKIAJJMNQCVBRPFYCOJA:[vkTTOxjH4QVmzcemBI5WCSLEzqmTAxz83+L2g2iv]@s3-us-west-1.amazonaws.com/updates.leeo.com leeo-production main' /etc/apt/sources.list.d/leeo.list)$?

if [ $ret_code -ne 0 ]; then
    echo "deb s3://AKIAJJMNQCVBRPFYCOJA:[vkTTOxjH4QVmzcemBI5WCSLEzqmTAxz83+L2g2iv]@s3-us-west-1.amazonaws.com/updates.leeo.com leeo-production main" >> /etc/apt/sources.list.d/leeo.list
    echo "Finished installing Leeo repository" >> /var/log/leeo/system.log
else
    echo "Leeo repository already exists" >> /var/log/leeo/system.log
fi

# Install the leeo apt public signing key
wget -O - https://s3-us-west-1.amazonaws.com/updates.leeo.com/updates.leeo.com.gpg.key | apt-key add -

# Update apt cache to pick up the new repo and install the necessary files for the leeo device
echo "Updating Leeo apt sources..." >> /var/log/leeo/system.log
apt-key update >> /var/log/leeo/system.log 2>&1
apt-get update -o Dir::Etc::sourcelist="sources.list.d/leeo.list" -o Dir::Etc::sourceparts="-" -o APT::Get::List-Cleanup="0" >> /var/log/leeo/system.log 2>&1
echo "Finished updating Leeo apt sources" >> /var/log/leeo/system.log

    for pkg_name in $leeo_packages_list; do
    dpkg -s "$pkg_name" > /dev/null 2>&1
        installed_status=$?
        if [ $installed_status -eq 1 ]; then
            echo "$pkg_name is not installed. Installing..." >> /var/log/leeo/system.log
            apt-get -y --force-yes --allow-unauthenticated install $pkg_name >> /var/log/leeo/system.log 2>&1
            ret_code=$?
            if [ $ret_code -ne 0 ]; then
                echo "Leeo setup failed to install $pkg_name" >> /var/log/leeo/system.log
            else
                echo "Finshed installing $pkg_name" >> /var/log/leeo/system.log
            fi  
        else
            echo "$pkg_name is already installed." >> /var/log/leeo/system.log
        fi  
    done

# Create symbolic links for libraries needed by jackd
if [ ! -e /usr/lib/libjack.so.0 ]; then
    ln -s /usr/local/lib/libjack.so.0 /usr/lib/libjack.so.0
fi
if [ ! -e /usr/lib/libjackserver.so.0 ]; then
    ln -s /usr/local/lib/libjackserver.so.0 /usr/lib/libjackserver.so.0
fi
echo "Finished installing all Leeo packages" >> /var/log/leeo/system.log

# maybe send something here to indicate finished or the other program can check for the existence of the libjackserver.so.0
exit 0
