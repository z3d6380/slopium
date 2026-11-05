#!/bin/sh
# Put this Slopium install on the Home button.
# LG's own Home files stay underneath a bind mount. The mount is lost on
# reboot; the boot link puts it back. On a TV where the app manager cannot
# reread Home, this prints "legacy" and leaves the older helper in place.
#
#   sh direct-home.sh apply
#   sh direct-home.sh restore
#   sh direct-home.sh status

STATE=/var/lib/webosbrew/slopium-direct-home
STAGE=$STATE/app
SRC=/media/developer/apps/usr/palm/applications/io.github.batmanrises.slopium
HOMEAPP=/usr/palm/applications/com.webos.app.home
BOOTLINK=/var/lib/webosbrew/init.d/47-slopium-direct-home
WATCHLINK=/var/lib/webosbrew/init.d/48-slopium-homehook
LOG=$STATE/boot.log
CFG=/var/lib/webosbrew/slopium-config.json
REV=$STATE/../slopium-config.rev
HOOK=/media/developer/slopium-homehook

log() {
  mkdir -p "$STATE"
  echo "$(date '+%H:%M:%S') $*" >> "$LOG"
}

luna() {
  # luna-send prints nothing unless its stdout is a terminal, and it must not
  # wait forever when the app manager is not up yet.
  script -qc "luna-send -n 1 -w 4000 -f 'luna://com.webos.applicationManager/$1' '$2'" /dev/null 2>/dev/null
}

ok() {
  grep -q '"returnValue": *true'
}

inode() {
  ls -di "$1" 2>/dev/null | awk '{print $1}'
}

mounted() {
  [ -n "$(inode "$STAGE")" ] && [ "$(inode "$HOMEAPP")" = "$(inode "$STAGE")" ]
}

maybe_update_self() {
  [ -f "$SRC/direct-home.sh" ] || return 0
  mkdir -p "$STATE"
  if cmp -s "$SRC/direct-home.sh" "$STATE/direct-home.sh" 2>/dev/null; then
    return 0
  fi
  cp "$SRC/direct-home.sh" "$STATE/direct-home.sh"
  chmod 755 "$STATE/direct-home.sh"
  if [ "$0" = "$STATE/direct-home.sh" ]; then
    exec sh "$STATE/direct-home.sh" "$@"
  fi
}

stop_watcher() {
  pid=$(cat /tmp/slopium-homehook-watch.pid 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 "$pid" 2>/dev/null
  fi
  pkill -9 -f '[s]lopium-homehook/watch.sh' 2>/dev/null
  rm -f "$WATCHLINK" /tmp/slopium-homehook-watch.pid /tmp/slopium-allow-stock-home
}

src_stamp() {
  python3 -c 'import hashlib,sys
h=hashlib.sha256()
for p in sys.argv[1:]:
    try:
        h.update(open(p,"rb").read())
    except FileNotFoundError:
        pass
print(h.hexdigest())' \
    "$SRC/assets/app.js" "$SRC/assets/persist.js" "$SRC/index.html" "$SRC/direct-home.sh"
}

write_appinfo() {
  python3 - "$SRC/appinfo.json" "$STAGE/appinfo.json" << 'PY'
import json, sys
src, dest = sys.argv[1], sys.argv[2]
try:
    version = json.load(open(src)).get("version") or "1.0.2"
except Exception:
    version = "1.0.2"
info = {
    "id": "com.webos.app.home",
    "version": version,
    "vendor": "Slopium",
    "type": "web",
    "main": "index.html",
    "title": "Home",
    "icon": "icon.png",
    "largeIcon": "largeIcon.png",
    "iconColor": "#050505",
    "bgColor": "#000000",
    "resolution": "1920x1080",
    "visible": False,
    "disableBackHistoryAPI": True,
    "handlesRelaunch": False,
    "noSplashOnLaunch": True,
    "spinnerOnLaunch": False,
    "transparent": False,
    "splashBackground": "splash.png",
    "inspectable": True,
    "closeOnBackground": False,
    "appCategory": ["home"],
    "class": {"hidden": True},
}
open(dest, "w").write(json.dumps(info, indent=2) + "\n")
PY
  chmod 644 "$STAGE/appinfo.json"
}

write_seed() {
  python3 - "$CFG" "$REV" "$STAGE" "$SRC" << 'PY'
import base64, json, os, sys
cfg, rev_path, stage, src = sys.argv[1:5]
if not os.path.isfile(cfg):
    raise SystemExit(0)
raw = open(cfg, "rb").read().strip()
json.loads(raw)
try:
    rev = int(open(rev_path).read().strip() or "0")
except Exception:
    rev = 0
b64 = base64.b64encode(raw).decode()
js = 'window.__slopiumSeedB64 = "%s";\nwindow.__slopiumSeedRev = %d;\n' % (b64, rev)
for root in (stage, src):
    dest = os.path.join(root, "assets", "config-seed.js")
    if os.path.isdir(os.path.dirname(dest)):
        open(dest, "w").write(js)
        os.chmod(dest, 0o644)
PY
}

refresh_files() {
  if [ ! -f "$SRC/appinfo.json" ] || [ ! -f "$SRC/index.html" ]; then
    log "Slopium is not installed at $SRC"
    return 1
  fi
  mkdir -p "$STAGE"
  cp -a "$SRC/." "$STAGE/" || return 1
  write_appinfo || return 1
  write_seed
  echo slopium > "$STAGE/.slopium-direct-home"
  chmod 644 "$STAGE/.slopium-direct-home"
  src_stamp > "$STATE/content-stamp"
}

block() {
  luna blockSystemApp '{"id":"com.webos.app.home","forceBlockSystemApp":false}'
}

release() {
  answer=
  i=0
  while [ "$i" -lt 3 ]; do
    answer=$(block_release_once)
    printf '%s' "$answer" | ok && return 0
    printf '%s' "$answer" | grep -qi 'not[^"]*blocked' && return 0
    i=$((i + 1))
    sleep 1
  done
  log "release of Home refused"
  return 1
}

block_release_once() {
  luna releaseBlockSystemApp '{"id":"com.webos.app.home"}'
}

reread() {
  answer=$(block)
  printf '%s' "$answer" | ok || printf '%s' "$answer" | grep -qi 'already[^"]*blocked' || log "block of Home refused"
  release
}

home_type_is() {
  want=$1
  i=0
  while [ "$i" -lt 10 ]; do
    luna getAppInfo '{"id":"com.webos.app.home"}' | grep -q "\"type\": *\"$want\"" && return 0
    i=$((i + 1))
    sleep 1
  done
  return 1
}

kill_flutter_home() {
  for cmd in /proc/[0-9]*/cmdline; do
    [ -r "$cmd" ] || continue
    line=$(tr '\0' ' ' < "$cmd" 2>/dev/null) || continue
    printf '%s' "$line" | grep -q 'flutter-client .*-i com\.webos\.app\.home ' || continue
    pid=${cmd#/proc/}
    pid=${pid%/cmdline}
    kill "$pid" 2>/dev/null
  done
}

kill_web_home() {
  script -qc "luna-send -n 1 -w 4000 -f luna://com.webos.service.webappmanager/killApp '{\"appId\":\"com.webos.app.home\"}'" /dev/null 2>/dev/null
  luna closeByAppId '{"id":"com.webos.app.home"}' >/dev/null
}

give_back() {
  if mounted; then
    block >/dev/null
    kill_web_home
    if ! umount "$HOMEAPP"; then
      release
      log "could not unmount Home"
      return 1
    fi
  fi
  reread || return 1
  if home_type_is flutter; then
    log "LG Home given back"
  else
    log "Home files are LG's again, but the app manager still reports the other type"
    kill_web_home
    rm -f "$BOOTLINK" "$STATE/enabled" "$STATE/just-mounted"
    return 1
  fi
  kill_web_home
  rm -f "$BOOTLINK" "$STATE/enabled" "$STATE/just-mounted"
}

stage_current() {
  [ -f "$STAGE/index.html" ] && [ -f "$STAGE/assets/persist.js" ] || return 1
  stamp=$(src_stamp)
  [ -n "$stamp" ] && [ "$stamp" = "$(cat "$STATE/content-stamp" 2>/dev/null)" ]
}

prepare_stage() {
  if stage_current; then
    write_seed
    return 0
  fi
  refresh_files
}

apply() {
  launch_now=$1
  mkdir -p "$STATE"
  rm -f "$STATE/just-mounted"
  if ! mounted && grep -q " $HOMEAPP " /proc/mounts; then
    log "another mount is already on LG Home; leaving it alone"
    echo failed
    return 1
  fi
  if ! mounted; then
    [ -f "$STATE/home-type-orig" ] || echo flutter > "$STATE/home-type-orig"
    prepare_stage || { echo failed; return 1; }
    stop_watcher
    if ! mount --bind "$STAGE" "$HOMEAPP"; then
      log "mount failed; LG Home left as it was"
      echo legacy
      return 1
    fi
    if ! reread || ! home_type_is web; then
      log "the app manager did not take Slopium"
      if give_back; then
        echo legacy
      else
        echo failed
      fi
      return 1
    fi
    kill_flutter_home
    touch "$STATE/just-mounted"
  else
    stop_watcher
    prepare_stage || { echo failed; return 1; }
  fi
  ln -sf "$STATE/direct-home.sh" "$BOOTLINK"
  chmod 755 "$STATE/direct-home.sh"
  touch "$STATE/enabled"
  if [ "$launch_now" = "launch" ]; then
    luna launch '{"id":"com.webos.app.home"}' >/dev/null
  fi
  log "Slopium is in LG Home's place"
  echo applied
}

boot() {
  [ -f "$STATE/enabled" ] || exit 0
  (
    if mounted; then
      stamp=$(src_stamp)
      if [ -n "$stamp" ] && [ "$stamp" = "$(cat "$STATE/content-stamp" 2>/dev/null)" ]; then
        write_seed
        exit 0
      fi
      sh "$STATE/direct-home.sh" apply quiet
      exit 0
    fi
    i=0
    while [ "$i" -lt 15 ]; do
      luna getAppInfo '{"id":"com.webos.app.home"}' | ok && break
      i=$((i + 1))
    done
    sh "$STATE/direct-home.sh" apply quiet
    if [ -f "$STATE/just-mounted" ]; then
      rm -f "$STATE/just-mounted"
      front=$(luna getForegroundAppInfo '{}')
      case "$front" in
        *'"appId":"com.webos.app.home"'*)
          luna launch '{"id":"com.webos.app.home"}' >/dev/null
          ;;
      esac
    fi
  ) </dev/null >> "$LOG" 2>&1 &
  exit 0
}

maybe_update_self "$@"

case ${1:-boot} in
  boot) boot ;;
  apply) apply "${2:-launch}" ;;
  write-seed) write_seed ;;
  applied-check)
    if mounted; then
      echo applied
    elif [ -f "$HOOK/watch.sh" ] && [ -f /tmp/slopium-homehook-watch.pid ]; then
      echo legacy-ready
    else
      echo absent
    fi
    ;;
  boot-link)
    mkdir -p "$STATE"
    if mounted || [ -f "$STATE/enabled" ]; then
      ln -sf "$STATE/direct-home.sh" "$BOOTLINK"
      touch "$STATE/enabled"
      echo linked
    elif [ -f "$HOOK/apply.sh" ]; then
      ln -sf "$HOOK/apply.sh" "$WATCHLINK"
      echo linked
    else
      echo files-missing
    fi
    ;;
  boot-unlink)
    rm -f "$BOOTLINK" "$WATCHLINK" "$STATE/enabled"
    echo unlinked
    ;;
  hook-status)
    if mounted; then
      echo running
    elif [ -f /tmp/slopium-homehook-watch.pid ] && kill -0 "$(cat /tmp/slopium-homehook-watch.pid)" 2>/dev/null; then
      echo running
    fi
    if [ -L "$BOOTLINK" ] || [ -L "$WATCHLINK" ]; then
      echo linked
    fi
    ;;
  status)
    if mounted; then echo "Slopium mounted over LG Home"; else echo "LG Home files"; fi
    luna getAppInfo '{"id":"com.webos.app.home"}' | tr -d '\n ' | sed -n 's/.*"type":"\([a-z]*\)".*/type \1/p'
    echo
    echo "boot link: $(ls -l "$BOOTLINK" 2>/dev/null || echo none)"
    echo "watcher link: $(ls -l "$WATCHLINK" 2>/dev/null || echo none)"
    ;;
  restore)
    stop_watcher
    rm -rf "$HOOK"
    if mounted; then
      give_back
    else
      rm -f "$BOOTLINK" "$STATE/enabled"
      echo removed
    fi
    ;;
  *)
    echo "usage: $0 apply|restore|status" >&2
    exit 2
    ;;
esac
