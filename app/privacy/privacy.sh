#!/bin/sh
# Slopium privacy switches.
# The engine beside this file is Life's Good Without Spying (MIT, Lewis Wood).
# Apply and boot do nothing while that app's own boot link is still installed.

# init.d runs this through a symlink, so $0 is not the privacy directory.
self=$0
if [ -L "$self" ]; then
    link=$(readlink "$self") || link=$self
    case "$link" in
        /*) self=$link ;;
        *) self=$(dirname "$self")/$link ;;
    esac
fi
DIR=$(CDPATH= cd -- "$(dirname "$self")" && pwd)
CONF="/var/lib/webosbrew/slopium-privacy.conf"
LGWS_CONF="/var/lib/webosbrew/lifesgoodwithoutspying.conf"
LGWS_LINK="/var/lib/webosbrew/init.d/50-lifesgoodwithoutspying"
MANIFEST="/var/luna-service2/manifests.d/update-block.manifest.json"
STUB='{"id":"update","version":"1.0.1"}'
JOB="/var/lib/webosbrew/slopium-privacy.job"
JOB_OUT="/var/lib/webosbrew/slopium-privacy.job-out"
APPLIED="/var/lib/webosbrew/slopium-privacy.applied"
LOG="/var/lib/webosbrew/slopium-privacy.log"
KEYS="domains.acr domains.smartad domains.dashboard domains.telemetry domains.sdp domains.wiselg domains.thinq domains.lgrecommends domains.lgchannels domains.quickset domains.updates voice.stop ads.stop lan.block purge.boot dns.filter dns.disable_ipv6 clock.ntp"

default_of() {
    case "$1" in
        domains.acr|domains.smartad|domains.dashboard|domains.telemetry|domains.sdp|voice.stop|ads.stop|purge.boot) echo on ;;
        *) echo off ;;
    esac
}

value_in() {
    file=$1
    key=$2
    if [ -f "$file" ]; then
        v=$(grep "^$key=" "$file" 2>/dev/null | tail -n 1 | cut -d= -f2-)
        case "$v" in
            on|off) echo "$v"; return ;;
        esac
    fi
    default_of "$key"
}

active_file() {
    if [ -f "$CONF" ]; then
        echo "$CONF"
    else
        echo "$LGWS_CONF"
    fi
}

cmd_status() {
    if [ -f "$CONF" ]; then echo source=slopium; else echo source=lifesgood; fi
    if [ -e "$LGWS_LINK" ]; then echo owner=lifesgood; else echo owner=slopium; fi
    file=$(active_file)
    pending=no
    if [ ! -f "$CONF" ] || [ ! -f "$APPLIED" ]; then
        pending=yes
    else
        for key in $KEYS; do
            if [ "$(value_in "$CONF" "$key")" != "$(value_in "$APPLIED" "$key")" ]; then
                pending=yes
                break
            fi
        done
    fi
    if [ "$(cat "$JOB" 2>/dev/null)" = "running" ]; then
        pending=yes
    fi
    echo "pending=$pending"
    for key in $KEYS; do
        printf '%s=%s\n' "$key" "$(value_in "$file" "$key")"
    done
}

cmd_save() {
    tmp="$CONF.new.$$"
    mkdir -p /var/lib/webosbrew || exit 1
    printf '%s' "$2" | base64 -d > "$tmp" || { rm -f "$tmp"; echo "Could not read the switches."; exit 1; }
    for key in $KEYS; do
        v=$(grep "^$key=" "$tmp" | tail -n 1 | cut -d= -f2-)
        case "$v" in
            on|off) ;;
            *) rm -f "$tmp"; echo "Missing $key."; exit 1 ;;
        esac
    done
    mv "$tmp" "$CONF"
    echo saved
}

# Uninstalling Life's Good leaves its boot link and its DNS helper behind.
# The helper holds the filter port, so a new apply cannot start.
reap_leftovers() {
    if [ -L "$LGWS_LINK" ] && [ ! -e "$LGWS_LINK" ]; then
        rm -f "$LGWS_LINK"
    fi
    for cmd in /proc/[0-9]*/cmdline; do
        [ -r "$cmd" ] || continue
        line=$(tr '\0' ' ' < "$cmd" 2>/dev/null) || continue
        case "$line" in
            *nospy-dns-filter.js*)
                pid=${cmd#/proc/}
                pid=${pid%/cmdline}
                kill "$pid" 2>/dev/null || true
                ;;
        esac
    done
}

sync_manifest() {
    if [ "$(value_in "$CONF" domains.updates)" = "on" ]; then
        mkdir -p /var/luna-service2/manifests.d
        printf '%s\n' "$STUB" > "$MANIFEST"
        return
    fi
    if [ -f "$MANIFEST" ]; then
        now=$(tr -d '[:space:]' < "$MANIFEST")
        want=$(printf '%s' "$STUB" | tr -d '[:space:]')
        if [ "$now" = "$want" ]; then
            rm -f "$MANIFEST"
        fi
    fi
}

start_job() {
    echo running > "$JOB"
    : > "$JOB_OUT"
    cp "$CONF" "$JOB.snapshot"
    # Detach so a settings call, and a boot script, can return at once.
    nohup sh -c "
        sh '$DIR/nospy-apply.sh' > '$JOB_OUT' 2>&1
        rc=\$?
        sh '$DIR/privacy.sh' sync-manifest
        if [ \"\$rc\" -eq 0 ]; then
            cp '$JOB.snapshot' '$APPLIED'
            echo done > '$JOB'
        else
            echo failed > '$JOB'
        fi
    " </dev/null >/dev/null 2>&1 &
}

cmd_apply() {
    reap_leftovers
    if [ -e "$LGWS_LINK" ]; then
        echo "state=blocked"
        echo "Life's Good is still the boot applier. Nothing was changed."
        exit 0
    fi
    if [ ! -f "$CONF" ]; then
        echo "state=failed"
        echo "Nothing is saved yet."
        exit 1
    fi
    if [ "$(cat "$JOB" 2>/dev/null)" = "running" ]; then
        echo "state=running"
        echo "Already applying."
        exit 0
    fi
    start_job
    echo "state=running"
}

cmd_job() {
    state=$(cat "$JOB" 2>/dev/null || echo idle)
    echo "state=$state"
    if [ "$state" = "failed" ]; then
        grep '\[-\]' "$LOG" 2>/dev/null | tail -n 1
    fi
}

cmd_boot() {
    # Homebrew clears a boot script that does not return.
    reap_leftovers
    if [ -e "$LGWS_LINK" ]; then
        exit 0
    fi
    if [ ! -f "$CONF" ]; then
        exit 0
    fi
    if [ "$(cat "$JOB" 2>/dev/null)" = "running" ]; then
        exit 0
    fi
    start_job
    exit 0
}

case "${1:-boot}" in
    status) cmd_status ;;
    save) cmd_save "$@" ;;
    apply) cmd_apply ;;
    job) cmd_job ;;
    sync-manifest) sync_manifest ;;
    boot) cmd_boot ;;
    *) echo "Use status, save, apply, or boot."; exit 1 ;;
esac
