/* Restart and Power off, shown on the home screen when the settings allow. */
(function () {
  "use strict";

  var KEY = "slopium-config-v1";
  var root = null;
  var styleNode = null;
  var cfg = null;
  var armed = "";
  var armTimer = 0;

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
    var p = all.power || {};
    return {
      on: p.on !== false,
      reboot: p.reboot !== false,
      shutdown: p.shutdown !== false,
      size: num(p.size, 70, 160, 10, 100),
      top: num(p.top, 0, 80, 2, 4),
      left: num(p.left, 0, 92, 2, 78)
    };
  }

  function covered() {
    if (document.hidden) return true;
    if (document.querySelector(".slopium-system, .slopium-privacy, .slopium-memory, .slopium-hdmiads, .screen--settings, .screen--picker, .screen--recents, .screen--dialog")) return true;
    return false;
  }

  function run(action) {
    var dir = "/var/lib/webosbrew/slopium-direct-home/app/power.sh";
    var alt = "/media/developer/apps/usr/palm/applications/io.github.batmanrises.slopium/power.sh";
    var cmd = "sh " + dir + " " + action + " || sh " + alt + " " + action;
    if (window.webOS && window.webOS.service && window.webOS.service.request) {
      window.webOS.service.request("luna://org.webosbrew.hbchannel.service", {
        method: "exec",
        parameters: { command: cmd },
        onSuccess: function () {},
        onFailure: function () {}
      });
      return;
    }
    if (typeof window.PalmServiceBridge !== "function") return;
    var bridge = new window.PalmServiceBridge();
    bridge.onservicecallback = function () {};
    bridge.call("luna://org.webosbrew.hbchannel.service/exec", JSON.stringify({ command: cmd }));
  }

  function press(action) {
    if (armed === action) {
      window.clearTimeout(armTimer);
      armed = "";
      render();
      run(action);
      return;
    }
    armed = action;
    window.clearTimeout(armTimer);
    armTimer = window.setTimeout(function () {
      armed = "";
      render();
    }, 4000);
    render();
  }

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = [
      ".pw{position:absolute;z-index:4;left:var(--pw-left,78%);top:var(--pw-top,4%);transform:scale(var(--pw-scale,1));transform-origin:top left;color:var(--color-text-primary,#fff);font-family:var(--font-family,Inter,sans-serif)}",
      ".screen--shift .pw{transform:translate3d(var(--shift-x),var(--shift-y),0) scale(var(--pw-scale,1))}",
      ".pw--hide{opacity:0;pointer-events:none}",
      ".pw__row{display:flex;gap:8px}",
      ".pw__b{margin:0;padding:8px 14px;border:0;border-radius:14px;background:var(--color-tile-bg,rgba(8,12,16,.55));box-shadow:0 0 0 1px var(--color-tile-border,rgba(255,255,255,.16));color:inherit;font:inherit;font-size:15px;cursor:pointer}",
      ".pw__b:focus{outline:none;background:var(--color-tile-bg-focus,rgba(255,255,255,.08))}",
      ".pw__b--arm{box-shadow:0 0 0 1px var(--color-tile-border-focus,#fff)}"
    ].join("");
    document.head.appendChild(styleNode);
  }

  function button(action, label) {
    var node = el("button", "pw__b" + (armed === action ? " pw__b--arm" : ""));
    node.type = "button";
    node.textContent = armed === action ? (action === "reboot" ? "Restart?" : "Power off?") : label;
    node.addEventListener("click", function () { press(action); });
    return node;
  }

  function render() {
    ensureStyle();
    if (!root) {
      root = el("div", "pw");
      document.body.appendChild(root);
    }
    var show = cfg && cfg.on && !covered() && (cfg.reboot || cfg.shutdown);
    root.className = show ? "pw" : "pw pw--hide";
    root.style.setProperty("--pw-top", (cfg ? cfg.top : 4) + "%");
    root.style.setProperty("--pw-left", (cfg ? cfg.left : 78) + "%");
    root.style.setProperty("--pw-scale", String((cfg ? cfg.size : 100) / 100));
    root.textContent = "";
    if (!show) return;
    var row = el("div", "pw__row");
    if (cfg.reboot) row.appendChild(button("reboot", "Restart"));
    if (cfg.shutdown) row.appendChild(button("shutdown", "Power off"));
    root.appendChild(row);
  }

  function sync() {
    cfg = readCfg();
    render();
  }

  window.addEventListener("slopium-config", sync);
  document.addEventListener("visibilitychange", sync);

  function start() {
    var home = document.getElementById("root");
    if (home && window.MutationObserver) {
      var queued = false;
      var observer = new MutationObserver(function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () { queued = false; render(); });
      });
      observer.observe(home, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
    }
    sync();
  }

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start);
})();
