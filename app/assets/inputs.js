/* HDMI chips on the home screen. Each chip shows the name the TV has for
   that port, whether a cable is in, and whether a picture is coming through.
   Pointing and clicking a chip opens that input. */
(function () {
  "use strict";

  var KEY = "slopium-config-v1";
  var EVERY = 4000;
  var root = null;
  var styleNode = null;
  var cfg = null;
  var timer = 0;
  var busy = false;
  var devices = [];

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function num(value, min, max, step, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    n = Math.min(max, Math.max(min, n));
    return min + Math.round((n - min) / step) * step;
  }

  function readCfg() {
    var all = {};
    try { all = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { all = {}; }
    var m = all.inputs || {};
    var edits = all.sourceEdits || {};
    return {
      on: m.on !== false,
      rest: m.rest === true,
      plugged: m.plugged === true,
      ports: {
        1: m.hdmi1 !== false,
        2: m.hdmi2 !== false,
        3: m.hdmi3 !== false,
        4: m.hdmi4 !== false
      },
      edits: edits,
      size: num(m.size, 70, 160, 10, 100),
      top: num(m.top, 0, 80, 2, 5),
      left: num(m.left, 0, 80, 2, 58)
    };
  }

  function covered() {
    if (document.hidden) return true;
    if (document.querySelector(".slopium-system, .slopium-privacy, .slopium-memory, .slopium-hdmiads, .screen--settings, .screen--picker, .screen--recents, .screen--dialog")) return true;
    if (document.querySelector(".rows--quiet, .screen--qhide") && !(cfg && cfg.rest)) return true;
    return false;
  }

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = [
      ".in{position:absolute;z-index:4;left:var(--in-left,58%);top:var(--in-top,5%);transform:scale(var(--in-scale,1));transform-origin:top left;color:var(--color-text-primary,#fff);font-family:var(--font-family,Inter,sans-serif);-webkit-font-smoothing:antialiased;transition:opacity .5s ease}",
      ".screen--shift .in{transform:translate3d(var(--shift-x),var(--shift-y),0) scale(var(--in-scale,1))}",
      ".screen--qglide .in{transition:opacity .5s ease,transform 5s ease-in-out}",
      ".screen--qhide .in{opacity:0}",
      ".in--hide{opacity:0;pointer-events:none}",
      ".in__row{display:flex;align-items:stretch;padding:4px;border-radius:18px;background:var(--color-tile-bg,rgba(8,12,16,.55));box-shadow:0 0 0 1px var(--color-tile-border,rgba(255,255,255,.16));text-shadow:0 1px 8px rgba(0,0,0,.35)}",
      ".in__chip{display:flex;flex-direction:column;justify-content:center;min-width:108px;max-width:168px;margin:0;padding:6px 14px 7px;border:0;border-left:1px solid var(--color-tile-border,rgba(255,255,255,.16));background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}",
      ".in__chip:first-child{border-left:0}",
      ".in__chip:focus{outline:none;background:var(--color-tile-bg-focus,rgba(255,255,255,.08));border-radius:14px}",
      ".in__chip--off{opacity:.42}",
      ".in__k{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--color-text-muted,rgba(255,255,255,.66))}",
      ".in__v{margin-top:1px;font-size:18px;font-weight:400;line-height:1.15}",
      ".in__bar{margin-top:5px;height:2px;width:56px;border-radius:2px;background:var(--color-tile-border,rgba(255,255,255,.18));overflow:hidden}",
      ".in__bar>span{display:block;height:100%;border-radius:2px;background:var(--color-tile-border-focus,var(--color-text-primary,#fff));opacity:.9}"
    ].join("");
    document.head.appendChild(styleNode);
  }

  function luna(uri, payload) {
    return new Promise(function (resolve, reject) {
      if (typeof window.PalmServiceBridge !== "function") {
        reject(new Error("not webos"));
        return;
      }
      var bridge = new window.PalmServiceBridge();
      var done = false;
      var timerId = window.setTimeout(function () { finish(function () { reject(new Error("timeout")); }); }, 5000);
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
        if (!msg || msg.returnValue === false) finish(function () { reject(new Error("luna")); });
        else finish(function () { resolve(msg); });
      };
      try { bridge.call(uri, JSON.stringify(payload || {})); }
      catch (e) { finish(function () { reject(e); }); }
    });
  }

  function labelFor(device) {
    var edit = cfg && cfg.edits && cfg.edits[device.appId];
    if (edit && edit.label) return String(edit.label);
    return device.label || ("HDMI " + device.port);
  }

  function shown(device) {
    if (!cfg || cfg.ports[device.port] === false) return false;
    if (cfg.plugged && !device.plugged && !device.on) return false;
    return true;
  }

  function render() {
    ensureStyle();
    if (!root) {
      root = el("div", "in");
      document.body.appendChild(root);
    }
    var list = (devices || []).filter(shown);
    var show = cfg && cfg.on && !covered() && list.length > 0;
    root.className = show ? "in" : "in in--hide";
    root.style.setProperty("--in-top", (cfg ? cfg.top : 5) + "%");
    root.style.setProperty("--in-left", (cfg ? cfg.left : 58) + "%");
    root.style.setProperty("--in-scale", String((cfg ? cfg.size : 100) / 100));
    root.textContent = "";
    if (!show) return;
    var row = el("div", "in__row");
    list.forEach(function (device) {
      var chip = el("button", "in__chip" + (device.on || device.plugged ? "" : " in__chip--off"));
      chip.type = "button";
      var k = el("div", "in__k");
      k.textContent = labelFor(device);
      var v = el("div", "in__v");
      v.textContent = device.on ? "On" : device.plugged ? "Plugged" : "Off";
      var bar = el("div", "in__bar");
      var fill = el("span");
      fill.style.width = (device.on ? 100 : device.plugged ? 42 : 0) + "%";
      bar.appendChild(fill);
      chip.appendChild(k);
      chip.appendChild(v);
      chip.appendChild(bar);
      chip.addEventListener("click", function () { openInput(device.appId); });
      row.appendChild(chip);
    });
    root.appendChild(row);
  }

  function openInput(appId) {
    if (!appId) return;
    luna("luna://com.webos.applicationManager/launch", { id: appId }).catch(function () {});
  }

  function apply(status, signal) {
    var byPort = {};
    var list = status && status.devices || [];
    var i;
    for (i = 0; i < list.length; i++) {
      var device = list[i];
      if (!device || device.port < 1 || device.port > 4) continue;
      if (String(device.id || "").indexOf("HDMI_") !== 0) continue;
      var key = "HDMI" + device.port;
      var sig = signal && signal[key] || {};
      var haveSig = !!(signal && signal[key]);
      var plugged = sig["5v"] === "TRUE" || device.hdmiPlugIn === true || (!haveSig && device.connected === true);
      var on = sig.signal === "TRUE" || device.hdmiSignalExist === true;
      byPort[device.port] = {
        port: device.port,
        appId: device.appId || ("com.webos.app.hdmi" + device.port),
        label: device.label || ("HDMI " + device.port),
        plugged: plugged,
        on: on
      };
    }
    devices = [1, 2, 3, 4].map(function (port) { return byPort[port]; }).filter(Boolean);
    render();
  }

  function tick() {
    if (busy) return;
    if (!cfg || !cfg.on || document.hidden) return;
    busy = true;
    Promise.all([
      luna("luna://com.webos.service.eim/getAllInputStatus", {}),
      luna("luna://com.webos.service.eim/getAllInputSignalInfo", {}).catch(function () { return null; })
    ]).then(function (pair) {
      busy = false;
      apply(pair[0], pair[1]);
      schedule();
    }, function () {
      busy = false;
      schedule();
    });
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!cfg || !cfg.on || document.hidden) return;
    timer = window.setTimeout(tick, EVERY);
  }

  function sync() {
    cfg = readCfg();
    render();
    if (cfg.on) {
      if (!timer && !busy) tick();
    } else {
      window.clearTimeout(timer);
      timer = 0;
    }
  }

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
    sync();
  }

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start);
})();
