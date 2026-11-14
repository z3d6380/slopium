#!/bin/sh
# If the Home button opens the Home copy while the Slopium app is already
# on screen, bring that same app back. One process, no second page.
PID=/tmp/slopium-home-guard.pid
if [ -f "$PID" ] && kill -0 "$(cat "$PID" 2>/dev/null)" 2>/dev/null; then
    exit 0
fi
nohup python3 - >>/tmp/slopium-home-guard.log 2>&1 << 'PY' &
import json, subprocess, time
pid_path = "/tmp/slopium-home-guard.pid"
open(pid_path, "w").write(str(__import__("os").getpid()))
home = "com.webos.app.home"
slop = "io.github.batmanrises.slopium"
last = ""
bounced = 0.0

def luna(method, payload):
    cmd = "luna-send -n 1 -w 4000 luna://com.webos.applicationManager/%s '%s'" % (method, json.dumps(payload))
    subprocess.run(["script", "-qc", cmd, "/dev/null"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

proc = subprocess.Popen(
    ["script", "-qc", "luna-send -i luna://com.webos.applicationManager/getForegroundAppInfo '{\"subscribe\":true}'", "/dev/null"],
    stdout=subprocess.PIPE,
    text=True,
    bufsize=1,
)
for line in proc.stdout:
    start = line.find("{")
    if start < 0:
        continue
    try:
        msg = json.loads(line[start:])
    except Exception:
        continue
    app = msg.get("appId") or ""
    if not app:
        continue
    now = time.time()
    if app == home and last == slop and now - bounced > 0.8:
        bounced = now
        luna("launch", {"id": slop})
        continue
    last = app
PY
echo $! > "$PID"
exit 0
