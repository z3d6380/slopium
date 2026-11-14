#!/bin/sh
# Runs at the start of devmode, before Homebrew's later startup scripts.
# The bind mounts do not survive a reboot, so this has to happen before
# the TV finishes opening LG Home and the update program.
LOG=/tmp/slopium-early.log
echo "$(date '+%H:%M:%S') early" >> "$LOG"

STAGE=/var/lib/webosbrew/slopium-direct-home/app
HOMEAPP=/usr/palm/applications/com.webos.app.home
if [ -f "$STAGE/index.html" ] && ! mountpoint -q "$HOMEAPP"; then
    mount --bind "$STAGE" "$HOMEAPP" \
        && echo "$(date '+%H:%M:%S') mounted home" >> "$LOG"
fi

CONF=/var/lib/webosbrew/slopium-privacy.conf
STUB=/var/lib/webosbrew/slopium-privacy.stub
if [ -f "$CONF" ] && grep -qx 'domains.updates=on' "$CONF" && [ -f "$STUB" ]; then
    if ! mountpoint -q /usr/sbin/update; then
        mount --bind "$STUB" /usr/sbin/update
    fi
    for pid in /proc/[0-9]*; do
        comm=$(cat "$pid/comm" 2>/dev/null) || continue
        [ "$comm" = "update" ] || continue
        exe=$(readlink "$pid/exe" 2>/dev/null) || continue
        case "$exe" in
            /usr/sbin/update) kill "${pid#/proc/}" 2>/dev/null || true ;;
        esac
    done
    echo "$(date '+%H:%M:%S') update stub" >> "$LOG"
fi
exit 0
