/* Small restart and power icons in the top-right corner of the home screen. */
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
      size: num(p.size, 70, 140, 10, 100),
      top: num(p.top, 0, 40, 1, 3),
      right: num(p.right, 0, 40, 1, 3)
    };
  }

  function covered() {
    if (document.hidden) return true;
    if (document.querySelector(".slopium-system, .slopium-privacy, .slopium-memory, .slopium-hdmiads, .screen--settings, .screen--picker, .screen--recents, .screen--dialog")) return true;
    return false;
  }

  function icon(kind) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    if (kind === "reboot") {
      path.setAttribute("d", "M20 12a8 8 0 1 1-2.3-5.7");
      var head = document.createElementNS("http://www.w3.org/2000/svg", "path");
      head.setAttribute("fill", "none");
      head.setAttribute("stroke", "currentColor");
      head.setAttribute("stroke-width", "1.6");
      head.setAttribute("stroke-linecap", "round");
      head.setAttribute("stroke-linejoin", "round");
      head.setAttribute("d", "M20 4v5h-5");
      svg.appendChild(path);
      svg.appendChild(head);
      return svg;
    }
    path.setAttribute("d", "M12 3v7");
    var ring = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", "currentColor");
    ring.setAttribute("stroke-width", "1.6");
    ring.setAttribute("stroke-linecap", "round");
    ring.setAttribute("d", "M7.1 6.5a7 7 0 1 0 9.8 0");
    svg.appendChild(path);
    svg.appendChild(ring);
    return svg;
  }

  function press(action) {
    if (armed === action) {
      window.clearTimeout(armTimer);
      armed = "";
      render();
      window.dispatchEvent(new CustomEvent("slopium-power", { detail: action }));
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
      ".pw{position:absolute;z-index:4;right:var(--pw-right,3%);top:var(--pw-top,3%);transform:scale(var(--pw-scale,1));transform-origin:top right;color:var(--color-text-primary,#fff)}",
      ".screen--shift .pw{transform:translate3d(var(--shift-x),var(--shift-y),0) scale(var(--pw-scale,1))}",
      ".pw--hide{opacity:0;pointer-events:none}",
      ".pw__row{display:flex;gap:10px}",
      ".pw__b{display:flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;opacity:.42;cursor:pointer}",
      ".pw__b svg{width:18px;height:18px;display:block}",
      ".pw__b:focus{outline:none;opacity:.85}",
      ".pw__b--arm{opacity:1}"
    ].join("");
    document.head.appendChild(styleNode);
  }

  function button(action, label) {
    var node = el("button", "pw__b" + (armed === action ? " pw__b--arm" : ""));
    node.type = "button";
    node.setAttribute("aria-label", armed === action ? label + ", press again" : label);
    node.appendChild(icon(action));
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
    root.style.setProperty("--pw-top", (cfg ? cfg.top : 3) + "%");
    root.style.setProperty("--pw-right", (cfg ? cfg.right : 3) + "%");
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
