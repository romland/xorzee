#!/bin/bash

# PREPARING THE OS
# ================
# Using Raspberry Pi Imager
# 1. Select image
#		Raspberry Pi OS (Other)
#			Raspberry Pi OS Lite (Legacy)
# 2. Select the storage device
# 3. Write it.
# 4. On the written FAT32 partition called 'boot', add the following files:
# 		4.1 ssh
#			Completely empty file
#		4.2 wpa_supplicant.conf
#			ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
#			update_config=1
#			country=YOUR-country-iso-code
#
#			network={
#        		ssid="YOUR-wifi-network"
#		        psk="YOUR-wifi-password"
#			}
#
# 			IMPORTANT: Make sure you replaced all "YOUR-" with your own settings.
#			IMPORTANT: Make sure the wpa_supplicant.conf has normal linebreaks (LF) and not Windows (CRLF).
# 5. Insert SD card into your device.
# 
# CONFIGURE OS FOR XORZEE
# =======================
# 1. Power it on -- wait a minute or two
# 2. Find out what IP your router assigned to it (log in to your router or so), it is called 'raspberrypi'
# 3. ssh pi@<ip> (password raspberry)
# 4. Change the default password:
#		passwd
# 5. Configure:
#		sudo raspi-config
#			System Options
#				Hostname
#					<set a hostname for the device so you know what it is>
#			Interface Options
#				Camera
#					<Yes> (enabled)
#			Localization Options
#				Timezone
#					<Select your timezone>
#			Finish (it will ask you to reboot, select yes)
#
# INSTALLING XORZEE
# =================
# 1. ssh pi@<ip> (use your new password)
# 2. Run the contents in this file


# Install a few Debian packages we need
sudo apt-get -y install screen curl libpng12-dev git-core

# Install node 16 (LTS)
curl -sL https://deb.nodesource.com/setup_16.x | sudo bash -
sudo apt -y install nodejs

# Fetch/compile/install raspi2png (for dispmanx to png)
# TODO: Perhaps just include this tiny binary in the repository? (dep: libpng12-dev)
cd /tmp
git clone https://github.com/AndrewFromMelbourne/raspi2png.git
cd raspi2png
make
sudo make install
cd ..
rm -rf raspi2png

cd ~

echo "Dependencies are installed."

# Now we _can_ run install_xorzee.sh
