#!/bin/sh
# Restart or power off. Runs as root through Homebrew's exec service.
luna() {
    script -qc "luna-send -n 1 -w 8000 -f 'luna://com.webos.service.tvpower/$1' '$2'" /dev/null
}

case "${1:-}" in
    reboot)
        luna "power2/reboot" '{"reason":"remoteKey"}' \
            || luna "power/reboot" '{"reason":"remoteKey"}'
        ;;
    shutdown)
        luna "power/powerOff" '{"reason":"remoteKey"}' \
            || luna "power/shutDown" '{"reason":"remoteKey"}'
        ;;
    *)
        echo "Use reboot or shutdown."
        exit 1
        ;;
esac
