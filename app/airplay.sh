#!/bin/sh
# Turn AirPlay on or off. The resident watcher reads the same file, so a
# reboot does not bring the service back while this is off.
DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
AIR=/var/lib/webosbrew/slopium-airplay.conf

case "${1:-status}" in
    status)
        if [ -f "$AIR" ] && [ "$(cat "$AIR")" = "on" ]; then
            echo on
        else
            echo off
        fi
        ;;
    set)
        mode=$2
        [ "$mode" = "on" ] || [ "$mode" = "off" ] || exit 1
        mkdir -p /var/lib/webosbrew
        echo "$mode" > "$AIR"
        sh "$DIR/resident.sh" set airplay "$mode"
        sh "$DIR/resident.sh" once
        echo saved
        ;;
    *)
        echo "Use status or set on|off."
        exit 1
        ;;
esac
