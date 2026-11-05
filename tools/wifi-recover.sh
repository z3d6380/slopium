#!/bin/sh
# If Wi-Fi is still down a little after boot, turn it off and on once.
# This is the same toggle as the TV's network settings. It does nothing when
# Wi-Fi or Ethernet is already connected, and it does not change DNS filtering.
#
# Installed on a set by linking it from Homebrew's init.d:
#   cp tools/wifi-recover.sh /var/lib/webosbrew/wifi-recover.sh
#   chmod 755 /var/lib/webosbrew/wifi-recover.sh
#   ln -sf /var/lib/webosbrew/wifi-recover.sh /var/lib/webosbrew/init.d/46-wifi-recover
#
#   sh wifi-recover.sh check     print the decision, do not toggle
#   sh wifi-recover.sh now       toggle immediately if still down

LOG=/var/lib/webosbrew/wifi-recover.log

luna() {
  script -qc "luna-send -n 1 -w 5000 -f 'luna://$1' '$2'" /dev/null 2>/dev/null
}

recover() {
  python3 - "$1" << 'PY'
import json, subprocess, sys, time

check_only = len(sys.argv) > 1 and sys.argv[1] == "check"

def luna(uri, payload):
    cmd = "luna-send -n 1 -w 5000 -f 'luna://%s' '%s'" % (uri, payload)
    out = subprocess.run(["script", "-qc", cmd, "/dev/null"], capture_output=True, text=True, timeout=12)
    text = out.stdout or ""
    try:
        start = text.find("{")
        return json.loads(text[start:]) if start >= 0 else {}
    except Exception:
        return {}

def connected(wifi_body, conn_body):
    info = (wifi_body or {}).get("networkInfo") or {}
    state = info.get("connectState") or ""
    wifi = (conn_body or {}).get("wifi") or {}
    wired = (conn_body or {}).get("wired") or {}
    if wired.get("state") == "connected":
        return True, "ethernet"
    if state in ("ipConfigured", "connected", "online"):
        return True, state or "wifi"
    if wifi.get("state") == "connected":
        return True, "wifi"
    return False, state or wifi.get("state") or "down"

def maybe_wait(state):
    return state in ("connecting", "associating", "associated", "config", "ipConfig")

wifi = luna("com.webos.service.wifi/getstatus", "{}")
conn = luna("com.webos.service.connectionmanager/getstatus", "{}")
if not wifi.get("returnValue") and not conn.get("returnValue"):
    print("wifi status did not answer; left it alone")
    raise SystemExit(0)
up, why = connected(wifi, conn)
if not up and maybe_wait(why) and not check_only:
    time.sleep(20)
    wifi = luna("com.webos.service.wifi/getstatus", "{}")
    conn = luna("com.webos.service.connectionmanager/getstatus", "{}")
    up, why = connected(wifi, conn)
if up:
    print("already connected (%s); left it alone" % why)
    raise SystemExit(0)
if check_only:
    print("still down (%s); a boot run would toggle Wi-Fi" % why)
    raise SystemExit(0)
off = luna("com.webos.service.wifi/setstate", '{"wifi":"disabled"}')
if not off.get("returnValue"):
    print("could not turn Wi-Fi off (%s); left it alone" % why)
    raise SystemExit(0)
time.sleep(3)
on = luna("com.webos.service.wifi/setstate", '{"wifi":"enabled"}')
if not on.get("returnValue"):
    luna("com.webos.service.wifi/setstate", '{"wifi":"enabled"}')
    print("turned Wi-Fi off but the first enable was refused; tried again")
    raise SystemExit(0)
print("Wi-Fi was %s; turned it off and on once" % why)
PY
}

case ${1:-boot} in
  check)
    recover check
    ;;
  now)
    recover
    ;;
  boot)
    (
      sleep 25
      echo "$(date '+%Y-%m-%d %H:%M:%S') check"
      recover
    ) </dev/null >> "$LOG" 2>&1 &
    exit 0
    ;;
  *)
    echo "usage: $0 [check|now]" >&2
    exit 2
    ;;
esac
