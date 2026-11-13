/* HDMI ad overlays. Off stops that overlay. The HDMI input stays. */
(function () {
  "use strict";

  var EXEC = "luna://org.webosbrew.hbchannel.service/exec";
  var PORTS = ["HDMI 1", "HDMI 2", "HDMI 3", "HDMI 4"];
  var KINDS = [
    ["adhdmi", "Ads", "The ad card on this HDMI picture."],
    ["overlaycontainerhdmi", "Commercials", "The commercial overlay on this HDMI picture."],
    ["fooddeliveryhdmi", "Food delivery", "The food-delivery card on this HDMI picture."]
  ];
  var state = null;
  var root = null;
  var styleNode = null;
  var swallowUp = false;
  var hiddenHome = [];

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function scriptPath() {
    var path = String(location.href || "").split("?")[0].replace(/^file:\/\//, "");
    return path.replace(/\/index\.html$/, "") + "/hdmi-ads.sh";
  }

  function shellQuote(text) {
    return "'" + String(text).replace(/'/g, "'\\''") + "'";
  }

  function exec(command) {
    return new Promise(function (resolve, reject) {
      if (typeof window.PalmServiceBridge !== "function") {
        reject(new Error("Not running on webOS"));
        return;
      }
      var bridge = new window.PalmServiceBridge();
      var done = false;
      var timer = window.setTimeout(function () { finish(function () { reject(new Error("Timed out")); }); }, 12000);
      function finish(fn) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
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

  function isOpen() { return !!(state && state.open); }

  function appId(kind) {
    return "com.webos.app." + kind + (state.port + 1);
  }

  function rows() {
    return KINDS.map(function (kind) {
      var id = appId(kind[0]);
      return { id: id, title: kind[1], detail: kind[2], on: !!state.values[id] };
    });
  }

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = ".slopium-hdmiads{z-index:42}.slopium-hdmiads .options{height:var(--hdmiads-h,640px)}";
    document.head.appendChild(styleNode);
  }

  function hideHome() {
    var nodes = document.querySelectorAll("#root .screen");
    var i;
    hiddenHome = [];
    for (i = 0; i < nodes.length; i++) {
      hiddenHome.push([nodes[i], nodes[i].style.visibility]);
      nodes[i].style.visibility = "hidden";
    }
  }

  function showHome() {
    var i;
    for (i = 0; i < hiddenHome.length; i++) hiddenHome[i][0].style.visibility = hiddenHome[i][1];
    hiddenHome = [];
  }

  function render() {
    if (!isOpen() || !root) return;
    var listRows = rows();
    if (state.row > listRows.length - 1) state.row = 0;
    root.textContent = "";
    var wrap = el("div", "settings");
    var title = el("h1", "settings__title");
    title.textContent = "HDMI ads";
    var hint = el("p", "settings__hint");
    hint.textContent = state.note || "Off stops that overlay. The HDMI input stays. Left and right change the port. OK toggles.";
    var tabs = el("div", "settings__tabs");
    PORTS.forEach(function (name, index) {
      var tab = el("div", ["tab", index === state.port && "tab--active", index === state.port && "tab--focused"].filter(Boolean).join(" "));
      tab.textContent = name;
      tabs.appendChild(tab);
    });
    var list = el("div", "options");
    var track = el("div", "options__track");
    listRows.forEach(function (row, index) {
      var node = el("div", "option" + (index === state.row ? " option--focused" : ""));
      var text = el("div", "option__text");
      var name = el("div", "option__label");
      name.textContent = row.title;
      text.appendChild(name);
      var detail = el("div", "option__description");
      detail.textContent = row.detail;
      text.appendChild(detail);
      node.appendChild(text);
      var sw = el("div", "switch" + (row.on ? " switch--on" : ""));
      sw.appendChild(el("div", "switch__knob"));
      node.appendChild(sw);
      node.addEventListener("click", function () {
        state.row = index;
        toggle();
      });
      track.appendChild(node);
    });
    list.appendChild(track);
    wrap.appendChild(title);
    wrap.appendChild(hint);
    wrap.appendChild(tabs);
    wrap.appendChild(list);
    root.appendChild(wrap);
    window.requestAnimationFrame(function () {
      if (!root || !window.SlopiumGlide) return;
      var box = root.querySelector(".options");
      var head = root.querySelector(".settings__tabs");
      var tr = root.querySelector(".options__track");
      var row = root.querySelectorAll(".option")[state.row];
      if (box && head) box.style.height = Math.max(360, window.innerHeight - head.getBoundingClientRect().bottom - 48) + "px";
      if (!box || !tr || !row) return;
      var view = box.clientHeight;
      var anchor = Math.round(Math.min(view * 0.34, 220));
      var top = row.offsetTop;
      var y = Math.max(0, top - anchor);
      var max = Math.max(0, tr.scrollHeight - view);
      window.SlopiumGlide.to(tr, Math.max(0, Math.min(max, y)));
    });
  }

  function load() {
    exec("sh " + shellQuote(scriptPath()) + " status").then(function (out) {
      if (!isOpen()) return;
      state.loading = false;
      state.values = {};
      String(out || "").split("\n").forEach(function (line) {
        var p = line.split("\t");
        if (p[0]) state.values[p[0]] = p[1] === "on";
      });
      render();
    }, function () {
      if (!isOpen()) return;
      state.loading = false;
      state.note = "The overlay list did not load.";
      render();
    });
  }

  function toggle() {
    var row = rows()[state.row];
    if (!row || state.busy || state.loading) return;
    var next = !row.on;
    state.values[row.id] = next;
    state.busy = true;
    state.note = "";
    render();
    exec("sh " + shellQuote(scriptPath()) + " set " + shellQuote(row.id) + " " + (next ? "on" : "off")).then(function () {
      if (!isOpen()) return;
      state.busy = false;
      state.note = next ? row.title + " on " + PORTS[state.port] + " can show." : row.title + " on " + PORTS[state.port] + " is stopped.";
      render();
    }, function () {
      if (!isOpen()) return;
      state.values[row.id] = !next;
      state.busy = false;
      state.note = "That change was not saved.";
      render();
    });
  }

  function open() {
    if (isOpen()) return;
    state = { open: true, port: 0, row: 0, values: {}, loading: true, busy: false, note: "" };
    ensureStyle();
    hideHome();
    root = el("div", "slopium-hdmiads screen screen--settings");
    document.body.appendChild(root);
    render();
    load();
  }

  function close() {
    if (!state) return;
    state.open = false;
    state = null;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    showHome();
  }

  var KEYS = { 37: "left", 39: "right", 38: "up", 40: "down", 13: "enter", 461: "back", 27: "back" };
  window.addEventListener("keydown", function (event) {
    if (!isOpen()) return;
    var act = KEYS[event.keyCode];
    if (!act) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (act === "back") { swallowUp = true; close(); return; }
    if (act === "left") state.port = (state.port + PORTS.length - 1) % PORTS.length;
    if (act === "right") state.port = (state.port + 1) % PORTS.length;
    if (act === "up" && state.row > 0) state.row -= 1;
    if (act === "down" && state.row < KINDS.length - 1) state.row += 1;
    if (act === "enter") toggle();
    else render();
  }, true);
  window.addEventListener("keyup", function (event) {
    if (isOpen() || swallowUp) {
      swallowUp = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener("webOSRelaunch", function () {
    if (isOpen()) close();
  });

  window.SlopiumHdmiAds = { open: open, close: close, isOpen: isOpen };
})();
