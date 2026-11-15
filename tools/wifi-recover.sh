#!/bin/sh
# If the Wi-Fi radio is still off a little after boot, turn it on.
# A connection that is already up is left alone, and so is a radio that is
# already on but not associated yet. Turning that radio off was followed by
# a reboot before Homebrew finished startup, which trips failsafe mode.
# A connection that is already up is left alone. A missing choice means on,
# so a fresh install still recovers Wi-Fi. Settings → Options → Wi-Fi recovery
# writes the choice and keeps this boot link.
#
#   sh wifi-recover.sh set on|off
#   sh wifi-recover.sh check
#   sh wifi-recover.sh now

CONF=/var/lib/webosbrew/slopium-wifi.conf
LOG=/var/lib/webosbrew/wifi-recover.log

SELF=$0
if [ -L "$SELF" ]; then
  SELF=$(readlink "$SELF")
fi
case "$SELF" in
  /*) ;;
  *) SELF=$(CDPATH= cd -- "$(dirname "$0")" && pwd)/$(basename "$SELF") ;;
esac
DIR=$(CDPATH= cd -- "$(dirname "$SELF")" && pwd)

install_link() {
  mkdir -p /var/lib/webosbrew/init.d
  chmod 755 "$DIR/wifi-recover.sh"
  ln -sfn "$DIR/wifi-recover.sh" /var/lib/webosbrew/init.d/46-wifi-recover
}

wanted() {
  [ ! -f "$CONF" ] && return 0
  [ "$(cat "$CONF" 2>/dev/null)" != "off" ]
}

recover() {
  python3 - "$1" << 'PY'
import json, subprocess, sys, time

check_only = len(sys.argv) > 1 and sys.argv[1] == "check"

def luna(uri, payload):
    cmd = "luna-send -n 1 -w 5000 -f 'luna://%s' '%s'" % (uri, payload)
    try:
        out = subprocess.run(["script", "-qc", cmd, "/dev/null"], capture_output=True, text=True, timeout=12)
        text = out.stdout or ""
    except Exception:
        return {}
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
    status = (wifi_body or {}).get("status") or ""
    if status == "serviceDisabled":
        return False, "disabled"
    known = state or wifi.get("state") or ""
    if not known:
        return False, "unknown"
    return False, known

def maybe_wait(state):
    return state in ("connecting", "associating", "associated", "config", "ipConfig")

def already(body):
    text = ((body or {}).get("errorText") or "").lower()
    return "already" in text

def radio_on():
    wifi = luna("com.webos.service.wifi/setstate", '{"state":"enabled"}')
    if wifi.get("returnValue") or already(wifi):
        return True
    conn = luna("com.webos.service.connectionmanager/setstate", '{"wifi":"enabled"}')
    return bool(conn.get("returnValue") or already(conn))

wifi = luna("com.webos.service.wifi/getstatus", "{}")
conn = luna("com.webos.service.connectionmanager/getstatus", "{}")
if not wifi.get("returnValue") and not conn.get("returnValue"):
    print("wifi status did not answer; left it alone")
    raise SystemExit(0)
up, why = connected(wifi, conn)
if not up and (maybe_wait(why) or why == "unknown") and not check_only:
    time.sleep(45)
    wifi = luna("com.webos.service.wifi/getstatus", "{}")
    conn = luna("com.webos.service.connectionmanager/getstatus", "{}")
    up, why = connected(wifi, conn)
if why == "unknown":
    print("wifi state unknown; left it alone")
    raise SystemExit(0)
if up:
    print("already connected (%s); left it alone" % why)
    raise SystemExit(0)
# A disconnected radio that is already on is still associating. Turning it
# off and on here drops that attempt and has been followed by a reboot
# before Homebrew finishes startup, which trips failsafe and skips this
# script on the next boot. Only turn the radio on when it is actually off.
if why != "disabled" and not check_only:
    for _ in range(4):
        time.sleep(15)
        wifi = luna("com.webos.service.wifi/getstatus", "{}")
        conn = luna("com.webos.service.connectionmanager/getstatus", "{}")
        up, why = connected(wifi, conn)
        if up or why == "disabled" or why == "unknown":
            break
if why == "unknown":
    print("wifi state unknown; left it alone")
    raise SystemExit(0)
if up:
    print("already connected (%s); left it alone" % why)
    raise SystemExit(0)
if why != "disabled":
    print("Wi-Fi is %s but the radio is already on; left it alone" % why)
    raise SystemExit(0)
if check_only:
    print("radio is off; a boot run would turn it on")
    raise SystemExit(0)
brought = False
for _ in range(3):
    if radio_on():
        brought = True
        break
    time.sleep(8)
if brought:
    print("Wi-Fi radio was off; turned it on")
else:
    print("Wi-Fi radio was off; could not turn it on")
PY
}

case ${1:-boot} in
  set)
    mode=$2
    [ "$mode" = "on" ] || [ "$mode" = "off" ] || exit 1
    mkdir -p /var/lib/webosbrew
    printf '%s\n' "$mode" > "$CONF"
    install_link
    echo saved
    ;;
  check)
    if wanted; then
      recover check
    else
      echo "Wi-Fi recovery is off"
    fi
    ;;
  now)
    if wanted; then
      recover
    else
      echo "Wi-Fi recovery is off"
    fi
    ;;
  boot)
    wanted || exit 0
    install_link
    # Homebrew removes its failsafe flag about ten seconds after init.d
    # returns. Wait until that window has passed before touching the radio.
    (
      sleep 75
      echo "$(date '+%Y-%m-%d %H:%M:%S') check"
      recover
    ) </dev/null >> "$LOG" 2>&1 &
    exit 0
    ;;
  *)
    echo "usage: $0 [set on|off|check|now]" >&2
    exit 2
    ;;
esac
