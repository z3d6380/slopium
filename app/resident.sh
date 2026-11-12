#!/bin/sh
# Unload apps webOS started on its own. An app the user has brought to the
# front, including one left in the background by going Home, is left alone.
# Apps listed in the keep file may stay loaded even when they were only preloaded.
# AirPlay is treated as idle unless it is open, in that keep file, or was on screen.
DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
KEEP=/var/lib/webosbrew/slopium-keep-loaded.txt
PIDFILE=/tmp/slopium-resident.pid
SEEN=/tmp/slopium-resident.seen

keep_has() {
    [ -f "$KEEP" ] || return 1
    grep -qxF "$1" "$KEEP"
}

cmd_list() {
    script -qc "luna-send -n 1 -w 8000 luna://com.webos.applicationManager/listLaunchPoints '{}'" /dev/null \
        | python3 -c '
import json,sys
raw=sys.stdin.read()
i=raw.find("{")
data=json.loads(raw[i:]) if i>=0 else {}
keep=set()
try:
    keep=set(l.strip() for l in open("/var/lib/webosbrew/slopium-keep-loaded.txt") if l.strip() and not l.startswith("#"))
except Exception:
    pass
protect=("com.webos.app.home","io.github.batmanrises.slopium","com.webos.app.starfish_flutter_systemui","com.webos.app.screensaver")
seen=set()
rows=[]
for p in data.get("launchPoints") or []:
    i=p.get("id") or ""
    if not i or i in seen or i in protect:
        continue
    seen.add(i)
    title=(p.get("title") or i).replace("\t"," ").replace("\n"," ")
    rows.append((i, title))
if "airplay" not in seen:
    rows.append(("airplay","AirPlay"))
rows.sort(key=lambda r: r[1].lower())
for i,title in rows:
    print("%s\t%s\t%s"%(i, title, "yes" if i in keep else "no"))
'
}

cmd_set() {
    id=$2
    on=$3
    [ -n "$id" ] || exit 1
    case "$id" in
        *[!A-Za-z0-9._-]*) exit 1 ;;
    esac
    mkdir -p /var/lib/webosbrew
    touch "$KEEP"
    grep -vxF "$id" "$KEEP" > "$KEEP.new" || true
    if [ "$on" = "on" ]; then
        echo "$id" >> "$KEEP.new"
    fi
    mv "$KEEP.new" "$KEEP"
    echo saved
}

cmd_once() {
    python3 - << 'PY'
import json, os, signal, subprocess

PROTECT = {
    "com.webos.app.home",
    "io.github.batmanrises.slopium",
    "com.webos.app.starfish_flutter_systemui",
    "com.webos.app.screensaver",
}
KEEP = "/var/lib/webosbrew/slopium-keep-loaded.txt"
SEEN = "/tmp/slopium-resident.seen"

def call(uri, payload="{}"):
    quoted = payload if payload == "{}" else "'" + payload.replace("'", "'\\''") + "'"
    cmd = "luna-send -n 1 -w 4000 %s %s" % (uri, quoted)
    try:
        r = subprocess.run(["script", "-qc", cmd, "/dev/null"], capture_output=True, text=True, timeout=12)
    except Exception:
        return {}
    raw = r.stdout or ""
    i = raw.find("{")
    if i < 0:
        return {}
    try:
        return json.loads(raw[i:])
    except Exception:
        return {}

def cmdline(pid):
    path = "/proc/%s/cmdline" % pid
    try:
        return open(path, "rb").read().replace(b"\0", b" ").decode("utf-8", "replace")
    except Exception:
        return ""

def load_seen():
    found = {}
    try:
        lines = open(SEEN)
    except Exception:
        return found
    for line in lines:
        parts = line.strip().split("\t")
        if len(parts) != 2 or not parts[1].isdigit():
            continue
        app_id, pid = parts
        if app_id not in cmdline(pid):
            continue
        found.setdefault(app_id, set()).add(pid)
    return found

def save_seen(found):
    lines = []
    for app_id, pids in found.items():
        for pid in sorted(pids):
            lines.append("%s\t%s\n" % (app_id, pid))
    tmp = SEEN + ".tmp"
    try:
        open(tmp, "w").write("".join(lines))
        os.rename(tmp, SEEN)
    except Exception:
        pass

def comm_pids(name):
    found = []
    for pid in os.listdir("/proc"):
        if not pid.isdigit():
            continue
        try:
            comm = open("/proc/%s/comm" % pid).read().strip()
        except Exception:
            continue
        if comm == name:
            found.append(pid)
    return found

keep = set()
try:
    keep = set(l.strip() for l in open(KEEP) if l.strip() and not l.startswith("#"))
except Exception:
    pass
seen = load_seen()
fg_info = call("luna://com.webos.applicationManager/getForegroundAppInfo")
fg = fg_info.get("appId") or ""
running = call("luna://com.webos.applicationManager/running").get("running") or []
preload_off = set()
policy = call("luna://com.webos.service.preloadmanager/getPreloadPolicy").get("applications") or []
for item in policy:
    app_id = item.get("id") or ""
    if not app_id:
        continue
    # Home's preloaded copy is a blank page. The Home button restores that
    # blank page, so the real screen has to load again. Keep the live page.
    if app_id == "com.webos.app.home":
        if item.get("isEnabled"):
            print("preload", app_id, "off")
            call(
                "luna://com.webos.service.preloadmanager/setPreloadPolicy",
                json.dumps({"application": {"id": app_id, "isEnabled": False}, "permanent": True}),
            )
        continue
    if app_id in PROTECT:
        continue
    want = app_id in keep
    if bool(item.get("isEnabled")) != want:
        print("preload", app_id, "on" if want else "off")
        call(
            "luna://com.webos.service.preloadmanager/setPreloadPolicy",
            json.dumps({"application": {"id": app_id, "isEnabled": want}, "permanent": True}),
        )
    if not want:
        preload_off.add(app_id)
for app in running:
    if (app.get("id") or "") == fg and str(app.get("processid") or "").isdigit():
        seen.setdefault(fg, set()).add(str(app.get("processid")))
save_seen(seen)

for app in running:
    app_id = app.get("id") or ""
    if not app_id or app_id in PROTECT or app_id == fg or app_id in keep:
        continue
    if app.get("defaultWindowType") in ("system_ui", "screenSaver"):
        continue
    pid = str(app.get("processid") or "")
    if pid in seen.get(app_id, ()):
        continue
    cmd = cmdline(pid) if pid.isdigit() else ""
    preloaded = (
        '"reason":"preload"' in cmd
        or "'reason':'preload'" in cmd
        or app_id in preload_off
    )
    idle_airplay = app_id == "airplay" and (
        '"reason":"undefined"' in cmd or '"reason":"preload"' in cmd or "preload" in cmd or not cmd
    )
    if not preloaded and not idle_airplay:
        continue
    print("close", app_id)
    call("luna://com.webos.applicationManager/closeByAppId", json.dumps({"id": app_id}))
    # Some preloads answer the close and keep the process. End that process.
    still = cmdline(pid) if pid.isdigit() else ""
    if app_id in still:
        try:
            os.kill(int(pid), signal.SIGTERM)
            print("kill", app_id)
        except Exception:
            pass

air_wanted = fg == "airplay" or "airplay" in keep or bool(seen.get("airplay"))
active = subprocess.run(["systemctl", "is-active", "airplay-adaptor.service"], capture_output=True, text=True)
adaptor_up = (active.stdout or "").strip() == "active"
daemon_pids = comm_pids("airplay") + comm_pids("airplay-adaptor")
if air_wanted:
    if not adaptor_up:
        print("start", "airplay")
        subprocess.run(["systemctl", "start", "airplay-adaptor.service"], capture_output=True)
elif adaptor_up or daemon_pids:
    print("stop", "airplay")
    subprocess.run(["systemctl", "stop", "airplay-adaptor.service"], capture_output=True)
    for pid in daemon_pids:
        try:
            os.kill(int(pid), signal.SIGTERM)
        except Exception:
            pass
PY
}

cmd_boot() {
    if [ -f "$PIDFILE" ]; then
        old=$(cat "$PIDFILE" 2>/dev/null || true)
        if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
            exit 0
        fi
    fi
    nohup sh "$0" loop </dev/null >/tmp/slopium-resident.log 2>&1 &
    echo $! > "$PIDFILE"
    exit 0
}

cmd_loop() {
    while true; do
        cmd_once
        sleep 20
    done
}

case "${1:-boot}" in
    boot) cmd_boot ;;
    loop) cmd_loop ;;
    once) cmd_once ;;
    list) cmd_list ;;
    set) cmd_set "$@" ;;
    *) echo "Use boot, once, list, or set."; exit 1 ;;
esac
