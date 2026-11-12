/* Quiet status row for the home screen: network, processor, memory, storage.
   The Status tab in Settings decides what is shown and where it sits.
   Readings come from the TV. The row hides while the screen is resting,
   and while another Slopium page is open. */
(function () {
  "use strict";

  var KEY = "slopium-config-v1";
  var EXEC = "luna://org.webosbrew.hbchannel.service/exec";
  var EVERY = 4000;
  var root = null;
  var styleNode = null;
  var cfg = null;
  var lastCpu = null;
  var snap = null;
  var timer = 0;
  var busy = false;
  var preview = /[?&]metricsPreview=1(?:&|$)/.test(String(location.search));

  var PY = [
    "import json,os,subprocess",
    "def kv(p):",
    " d={}",
    " f=open(p)",
    " ",
    " for line in f:",
    "  if ':' not in line: continue",
    "  k,v=line.split(':',1)",
    "  d[k]=int(v.split()[0])",
    " f.close()",
    " return d",
    "m=kv('/proc/meminfo')",
    "parts=open('/proc/stat').readline().split()[1:8]",
    "nums=[int(x) for x in parts]",
    "idle=nums[3]+(nums[4] if len(nums)>4 else 0)",
    "def disk(path):",
    " s=os.statvfs(path)",
    " return [s.f_frsize*s.f_blocks, s.f_frsize*s.f_bavail]",
    "path='/mnt/lg/appstore' if os.path.isdir('/mnt/lg/appstore') else '/media'",
    "out={'cpu':[sum(nums),idle],'mem':[m.get('MemTotal',0),m.get('MemAvailable',m.get('MemFree',0))],'disk':disk(path)}",
    "print(json.dumps(out))",
    "try:",
    " r=subprocess.run(['luna-send','-n','1','-w','2500','luna://com.webos.service.connectionmanager/getstatus','{}'],capture_output=True,text=True,timeout=4)",
    " t=(r.stdout or '').strip()",
    " i=t.find('{')",
    " print(t[i:] if i>=0 else '{}')",
    "except Exception:",
    " print('{}')",
  ].join("\n");

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function num(value, min, max, step, fallback) {
    if (typeof value !== "number" || !isFinite(value)) return fallback;
    var next = min + Math.round((Math.min(max, Math.max(min, value)) - min) / step) * step;
    return Math.min(max, next);
  }

  function readCfg() {
    var raw = null;
    var all = {};
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    try { all = raw ? JSON.parse(raw) : {}; } catch (e) { all = {}; }
    var m = all && all.metrics || {};
    return {
      on: m.on !== false,
      net: m.net !== false,
      cpu: m.cpu !== false,
      mem: m.mem !== false,
      disk: m.disk !== false,
      name: m.name === true,
      size: num(m.size, 70, 160, 10, 100),
      top: num(m.top, 0, 80, 2, 5),
      left: num(m.left, 0, 80, 2, 4)
    };
  }

  function covered() {
    if (preview) return false;
    if (document.hidden) return true;
    if (document.querySelector(".slopium-system, .slopium-privacy, .screen--settings, .screen--picker, .screen--recents, .screen--dialog")) return true;
    if (document.querySelector(".screen--qhide, .rows--quiet")) return true;
    return false;
  }

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = [
      ".mx{position:absolute;z-index:4;left:var(--mx-left,4%);top:var(--mx-top,5%);transform:scale(var(--mx-scale,1));transform-origin:top left;pointer-events:none;color:var(--color-text-primary,#fff);font-family:var(--font-family,Inter,sans-serif);-webkit-font-smoothing:antialiased;transition:opacity .5s ease}",
      ".mx--hide{opacity:0}",
      ".mx__row{display:flex;align-items:center;padding:7px 8px 7px 10px;border-radius:18px;background:var(--color-tile-bg,rgba(8,12,16,.55));box-shadow:0 0 0 1px var(--color-tile-border,rgba(255,255,255,.16));text-shadow:0 1px 8px rgba(0,0,0,.35)}",
      ".mx__net{display:flex;align-items:center;gap:8px;padding:2px 12px 2px 4px;color:var(--color-text-primary,#fff)}",
      ".mx__net svg{display:block;width:22px;height:22px}",
      ".mx__net--dim{opacity:.42}",
      ".mx__name{max-width:148px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:400;letter-spacing:.01em}",
      ".mx__cell{display:flex;flex-direction:column;justify-content:center;min-width:78px;padding:1px 14px 2px 12px;border-left:1px solid var(--color-tile-border,rgba(255,255,255,.16))}",
      ".mx__k{font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--color-text-muted,rgba(255,255,255,.66))}",
      ".mx__v{margin-top:1px;font-size:18px;font-weight:400;line-height:1.15;letter-spacing:.02em;font-variant-numeric:tabular-nums}",
      ".mx__bar{margin-top:5px;height:2px;width:56px;border-radius:2px;background:var(--color-tile-border,rgba(255,255,255,.18));overflow:hidden}",
      ".mx__bar>span{display:block;height:100%;border-radius:2px;background:var(--color-tile-border-focus,var(--color-text-primary,#fff));opacity:.9}"
    ].join("");
    document.head.appendChild(styleNode);
  }

  function icon(kind, up) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    function path(d) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    }
    if (kind === "ethernet") {
      path("M8 4h8v6h3v10H5V10h3V4z");
      path("M9 14h2M13 14h2M9 17h2M13 17h2");
    } else {
      path("M4.5 9.2a11 11 0 0 1 15 0");
      path("M7.5 12.6a7 7 0 0 1 9 0");
      path("M10.6 16.2h2.8");
      if (!up) path("M5 19L19 5");
    }
    return svg;
  }

  function cell(label, value, used) {
    var node = el("div", "mx__cell");
    var k = el("div", "mx__k");
    k.textContent = label;
    var v = el("div", "mx__v");
    v.textContent = value;
    var bar = el("div", "mx__bar");
    var fill = el("span");
    var pct = typeof used === "number" ? Math.max(0, Math.min(100, used)) : 0;
    fill.style.width = pct + "%";
    bar.appendChild(fill);
    node.appendChild(k);
    node.appendChild(v);
    node.appendChild(bar);
    return node;
  }

  function gb(bytes) {
    if (!bytes && bytes !== 0) return "—";
    var n = bytes / 1073741824;
    if (n >= 10) return Math.round(n) + " GB";
    var tenths = Math.round(n * 10) / 10;
    return tenths.toFixed(1) + " GB";
  }

  function pct(part, total) {
    if (!total) return null;
    return Math.max(0, Math.min(100, Math.round(part / total * 100)));
  }

  function render() {
    ensureStyle();
    if (!root) {
      root = el("div", "mx");
      root.setAttribute("aria-hidden", "true");
      document.body.appendChild(root);
    }
    var show = cfg && cfg.on && !covered() && (cfg.net || cfg.cpu || cfg.mem || cfg.disk);
    root.className = show ? "mx" : "mx mx--hide";
    root.style.setProperty("--mx-top", (cfg ? cfg.top : 5) + "%");
    root.style.setProperty("--mx-left", (cfg ? cfg.left : 4) + "%");
    root.style.setProperty("--mx-scale", String((cfg ? cfg.size : 100) / 100));
    root.textContent = "";
    if (!show) return;
    var row = el("div", "mx__row");
    var data = snap || {};
    if (cfg.net) {
      var net = data.net || {};
      var up = !!net.up;
      var wrap = el("div", "mx__net" + (up && net.internet !== false ? "" : " mx__net--dim"));
      wrap.appendChild(icon(net.kind === "ethernet" ? "ethernet" : "wifi", up));
      if (cfg.name && net.name) {
        var name = el("div", "mx__name");
        name.textContent = net.name;
        wrap.appendChild(name);
      }
      row.appendChild(wrap);
    }
    if (cfg.cpu) row.appendChild(cell("CPU", data.cpuPct == null ? "—" : data.cpuPct + "%", data.cpuPct || 0));
    if (cfg.mem) row.appendChild(cell("RAM", data.memPct == null ? "—" : data.memPct + "%", data.memPct || 0));
    if (cfg.disk) row.appendChild(cell("Free", data.diskFree == null ? "—" : gb(data.diskFree), data.diskPct || 0));
    root.appendChild(row);
  }

  function applySample(cpu, mem, disk, net) {
    var cpuPct = null;
    if (cpu && lastCpu) {
      var dTotal = cpu[0] - lastCpu[0];
      var dIdle = cpu[1] - lastCpu[1];
      if (dTotal > 0) cpuPct = Math.max(0, Math.min(100, Math.round((1 - dIdle / dTotal) * 100)));
    }
    if (cpu) lastCpu = cpu;
    var memPct = mem ? pct(Math.max(0, mem[0] - mem[1]), mem[0]) : null;
    var diskPct = disk ? pct(Math.max(0, disk[0] - disk[1]), disk[0]) : null;
    snap = {
      cpuPct: cpuPct,
      memPct: memPct,
      diskFree: disk ? disk[1] : null,
      diskPct: diskPct,
      net: net || snap && snap.net || { kind: "wifi", up: false, internet: false, name: "" }
    };
    render();
  }

  function parseNet(msg) {
    var wifi = msg && msg.wifi || {};
    var wired = msg && msg.wired || {};
    if (wired.state === "connected") {
      return { kind: "ethernet", up: true, internet: msg.isInternetConnectionAvailable !== false, name: "" };
    }
    if (wifi.state === "connected") {
      return {
        kind: "wifi",
        up: true,
        internet: wifi.onInternet === "yes" || msg.isInternetConnectionAvailable === true,
        name: wifi.ssid || wifi.displayName || ""
      };
    }
    return { kind: "wifi", up: false, internet: false, name: "" };
  }

  function exec(command) {
    return new Promise(function (resolve, reject) {
      if (typeof window.PalmServiceBridge !== "function") {
        reject(new Error("not webos"));
        return;
      }
      var bridge = new window.PalmServiceBridge();
      var done = false;
      var timerId = window.setTimeout(function () { finish(function () { reject(new Error("timeout")); }); }, 8000);
      function finish(fn) {
        if (done) return;
        done = true;
        window.clearTimeout(timerId);
        try { bridge.cancel(); } catch (e) {}
        fn();
      }
      bridge.onservicecallback = function (body) {
        var msg;
        try { msg = JSON.parse(body); } catch (e) { finish(function () { reject(e); }); return; }
        if (!msg || msg.returnValue === false) finish(function () { reject(new Error("exec")); });
        else finish(function () { resolve(msg.stdoutString || msg.stdout || ""); });
      };
      try { bridge.call(EXEC, JSON.stringify({ command: command })); }
      catch (e) { finish(function () { reject(e); }); }
    });
  }

  function shellQuote(text) {
    return "'" + String(text).replace(/'/g, "'\\''") + "'";
  }

  function tick() {
    if (busy) return;
    if (!cfg || !cfg.on || document.hidden) return;
    busy = true;
    exec("python3 -c " + shellQuote(PY)).then(function (out) {
      busy = false;
      var lines = String(out || "").split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
      var stats = null;
      var netMsg = null;
      var i;
      for (i = 0; i < lines.length; i++) {
        if (lines[i].charAt(0) !== "{") continue;
        try {
          var parsed = JSON.parse(lines[i]);
          if (parsed && parsed.cpu) stats = parsed;
          else if (parsed && (parsed.wifi || parsed.wired || parsed.returnValue)) netMsg = parsed;
        } catch (e) {}
      }
      if (stats) applySample(stats.cpu, stats.mem, stats.disk, netMsg ? parseNet(netMsg) : snap && snap.net);
      schedule();
    }, function () {
      busy = false;
      schedule();
    });
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!cfg || !cfg.on || document.hidden || preview) return;
    timer = window.setTimeout(tick, EVERY);
  }

  function sync() {
    cfg = readCfg();
    render();
    if (cfg.on && !preview) {
      if (!timer && !busy) tick();
    } else {
      window.clearTimeout(timer);
      timer = 0;
    }
  }

  window.SlopiumMetrics = { sync: sync };

  window.addEventListener("slopium-config", sync);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      window.clearTimeout(timer);
      timer = 0;
      render();
    } else sync();
  });

  function watch() {
    if (!document.body) return;
    var queued = false;
    var observer = new MutationObserver(function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; render(); });
    });
    var home = document.getElementById("root");
    if (home) observer.observe(home, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
    observer.observe(document.body, { childList: true });
  }

  function start() {
    watch();
    if (preview) {
      cfg = readCfg();
      cfg.on = true;
      applySample([200, 100], [2018728, 578624], [6180319232, 3621597184], { kind: "wifi", up: true, internet: true, name: "Home Wi-Fi" });
      snap.cpuPct = 14;
      render();
      return;
    }
    sync();
  }

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start);
})();
