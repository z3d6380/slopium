#!/bin/sh
# Fallback when the page cannot call the power service itself.
# Restart prefers Homebrew Channel's reboot method, which tries
# luna://com.webos.service.tvpower/power/reboot {"reason":"cpuCommand"}
# and then the reboot command. Do not call that method from here:
# this script is already running inside Homebrew's exec service.
case "${1:-}" in
    reboot)
        reboot
        ;;
    shutdown)
        python3 - << 'PY'
import json, subprocess, sys

def luna(method, reason):
    cmd = "luna-send -n 1 -w 8000 -f 'luna://com.webos.service.tvpower/%s' '{\"reason\":\"%s\"}'" % (method, reason)
    try:
        out = subprocess.run(["script", "-qc", cmd, "/dev/null"], capture_output=True, text=True, timeout=14)
        text = out.stdout or ""
    except Exception:
        return {}
    try:
        start = text.find("{")
        return json.loads(text[start:]) if start >= 0 else {}
    except Exception:
        return {}

for method, reason in (
    ("power/powerOff", "cpuCommand"),
    ("power/powerOff", "remoteKey"),
    ("power2/powerOff", "cpuCommand"),
):
    if luna(method, reason).get("returnValue"):
        sys.exit(0)
sys.exit(1)
PY
        ;;
    *)
        echo "Use reboot or shutdown."
        exit 1
        ;;
esac
