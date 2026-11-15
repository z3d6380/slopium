#!/bin/sh
# Runs at the start of devmode, before Homebrew's later startup scripts.
# The bind mounts do not survive a reboot, so this has to happen before
# the TV finishes opening LG Home and the update program.
LOG=/tmp/slopium-early.log
echo "$(date '+%H:%M:%S') early" >> "$LOG"

# Homebrew sets a failsafe flag for the whole startup script and removes it
# only at the end. Slopium is already on screen by then, so a reboot to test
# the picture leaves the flag set and the next boot shows failsafe mode.
# If the flag is already there, the previous startup did not finish: leave it
# for Homebrew's own check. Otherwise remove it as soon as this boot creates it.
(
    flag=/var/luna/preferences/webosbrew_failsafe
    if [ -f "$flag" ]; then
        exit 0
    fi
    i=0
    while [ "$i" -lt 40 ]; do
        if [ -f "$flag" ]; then
            sleep 2
            rm -f "$flag"
            sync -f /var/luna/preferences 2>/dev/null || true
            echo "$(date '+%H:%M:%S') cleared failsafe flag" >> "$LOG"
            exit 0
        fi
        i=$((i + 1))
        sleep 1
    done
) </dev/null >/dev/null 2>&1 &

STAGE=/var/lib/webosbrew/slopium-direct-home/app
HOMEAPP=/usr/palm/applications/com.webos.app.home
DIRECT=/var/lib/webosbrew/slopium-direct-home/direct-home.sh
if [ -f "$DIRECT" ]; then
    sh "$DIRECT" sync >> "$LOG" 2>&1 \
        && echo "$(date '+%H:%M:%S') synced home" >> "$LOG"
fi
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
