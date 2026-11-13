#!/bin/sh
# Each HDMI ad overlay can be allowed or stopped. The HDMI inputs stay.
# AI subtitle popups are not part of this list.
CONF=/var/lib/webosbrew/slopium-hdmi-ads.conf
IDS="
com.webos.app.adhdmi1
com.webos.app.adhdmi2
com.webos.app.adhdmi3
com.webos.app.adhdmi4
com.webos.app.overlaycontainerhdmi1
com.webos.app.overlaycontainerhdmi2
com.webos.app.overlaycontainerhdmi3
com.webos.app.overlaycontainerhdmi4
com.webos.app.fooddeliveryhdmi1
com.webos.app.fooddeliveryhdmi2
com.webos.app.fooddeliveryhdmi3
com.webos.app.fooddeliveryhdmi4
"

luna() {
    script -qc "luna-send -n 1 -w 4000 -f 'luna://com.webos.applicationManager/$1' '$2'" /dev/null 2>/dev/null
}

known() {
    for id in $IDS; do
        [ "$id" = "$1" ] && return 0
    done
    return 1
}

state_of() {
    if [ -f "$CONF" ] && grep -qxF "$1=on" "$CONF"; then
        echo on
    else
        echo off
    fi
}

ready() {
    luna getAppInfo '{"id":"com.webos.app.hdmi1"}' | grep -q '"returnValue": *true'
}

apply_one() {
    id=$1
    if [ "$(state_of "$id")" = "on" ]; then
        luna releaseBlockSystemApp "{\"id\":\"$id\"}" >/dev/null
    else
        luna blockSystemApp "{\"id\":\"$id\",\"forceBlockSystemApp\":true}" >/dev/null
        luna closeByAppId "{\"id\":\"$id\"}" >/dev/null
    fi
}

cmd_status() {
    for id in $IDS; do
        printf '%s\t%s\n' "$id" "$(state_of "$id")"
    done
}

cmd_set() {
    id=$2
    on=$3
    known "$id" || exit 1
    [ "$on" = "on" ] || [ "$on" = "off" ] || exit 1
    mkdir -p /var/lib/webosbrew
    touch "$CONF"
    grep -vxF "$id=on" "$CONF" | grep -vxF "$id=off" > "$CONF.new" || true
    echo "$id=$on" >> "$CONF.new"
    mv "$CONF.new" "$CONF"
    apply_one "$id"
    echo saved
}

cmd_once() {
    n=0
    while [ "$n" -lt 40 ]; do
        ready && break
        n=$((n + 1))
        sleep 1
    done
    for id in $IDS; do
        apply_one "$id"
    done
}

case "${1:-boot}" in
    boot)
        nohup sh "$0" once </dev/null >/tmp/slopium-hdmi-ads.log 2>&1 &
        exit 0
        ;;
    once) cmd_once ;;
    status) cmd_status ;;
    set) cmd_set "$@" ;;
    *) echo "Use boot, once, status, or set."; exit 1 ;;
esac
