#!/bin/sh
# Restart or power off the TV. Called from the home-screen buttons.
case "${1:-}" in
    reboot)
        script -qc "luna-send -n 1 -w 8000 luna://com.webos.service.tvpower/power2/reboot '{}'" /dev/null
        ;;
    shutdown)
        script -qc "luna-send -n 1 -w 8000 luna://com.webos.service.tvpower/power/shutDown '{\"reason\":\"remoteKey\"}'" /dev/null
        ;;
    *)
        echo "Use reboot or shutdown."
        exit 1
        ;;
esac
