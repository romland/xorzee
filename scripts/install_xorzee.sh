#!/bin/bash

cd ~
git clone https://romland@github.com/romland/xorzee.git

cd xorzee/server
npm install
echo "Xorzee server is installed."

# Note: This can take very long on SD card (it installs dev-tools etc)
# Note: That it is also not needed on every client (only the one you will use as "main" instance)
# Note: This currently break on Material themes (scss/dart stuff), I fixed this with a monkeypatch, but forgot what I did!
# TODO: Should distribute a compiled package of client.
#cd ../client
#npm install
#echo "Xorzee client is installed."
echo "Xorzee client is NOT installed on this device."

cd ~

echo "Hurray! We are done."
