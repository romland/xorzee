#!/bin/sh
/usr/bin/amixer sset 'PCM' 100%
/usr/bin/aplay $1
