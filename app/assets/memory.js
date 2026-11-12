/* Per-app choice: stay loaded when idle, or unload until the next launch.
   An app the user opened and left in the background is not unloaded. */
(function () {
  "use strict";

  var EXEC = "luna://org.webosbrew.hbchannel.service/exec";
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
    return path.replace(/\/index\.html$/, "") + "/resident.sh";
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
      var timer = window.setTimeout(function () { finish(function () { reject(new Error("Timed out")); }); }, 8000);
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

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = ".slopium-memory{z-index:42}.slopium-memory .options{height:var(--mem-h,640px)}";
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
    var rows = state.rows;
    if (state.row > rows.length - 1) state.row = Math.max(0, rows.length - 1);
    root.textContent = "";
    var wrap = el("div", "settings");
    var title = el("h1", "settings__title");
    title.textContent = "Memory";
    var hint = el("p", "settings__hint");
    hint.textContent = state.note || "Off unloads the app unless it is open or left in the background. On lets it stay loaded. OK toggles.";
    var list = el("div", "options");
    var track = el("div", "options__track");
    if (!rows.length) {
      var empty = el("div", "option");
      var label = el("div", "option__label");
      label.textContent = state.loading ? "Reading the apps." : "No apps to list.";
      empty.appendChild(label);
      track.appendChild(empty);
    }
    rows.forEach(function (row, index) {
      var node = el("div", "option" + (index === state.row ? " option--focused" : ""));
      var text = el("div", "option__text");
      var name = el("div", "option__label");
      name.textContent = row.title;
      text.appendChild(name);
      node.appendChild(text);
      var sw = el("div", "switch" + (row.keep ? " switch--on" : ""));
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
    wrap.appendChild(list);
    root.appendChild(wrap);
    window.requestAnimationFrame(function () {
      if (!root) return;
      var box = root.querySelector(".options");
      var head = root.querySelector(".settings__hint");
      if (box && head) box.style.height = Math.max(360, window.innerHeight - head.getBoundingClientRect().bottom - 48) + "px";
      var row = root.querySelectorAll(".option")[state.row];
      var tr = root.querySelector(".options__track");
      if (!row || !tr || !box) return;
      var view = box.clientHeight;
      place(box, tr, row);
    });
  }

  function place(box, tr, row) {
    var view = box.clientHeight;
    var anchor = Math.round(Math.min(view * 0.34, 220));
    var top = row.offsetTop;
    var y = Math.max(0, top - anchor);
    var max = Math.max(0, tr.scrollHeight - view);
    var bottom = top + row.offsetHeight;
    if (row.offsetHeight < view && bottom - y > view - 12) y = bottom - (view - 12);
    window.SlopiumGlide.to(tr, Math.max(0, Math.min(max, y)));
  }

  function follow() {
    if (!root) return;
    var nodes = root.querySelectorAll(".options__track .option");
    var i;
    for (i = 0; i < nodes.length; i++) {
      nodes[i].className = "option" + (i === state.row ? " option--focused" : "");
    }
    var box = root.querySelector(".options");
    var tr = root.querySelector(".options__track");
    var row = nodes[state.row];
    if (box && tr && row) place(box, tr, row);
  }

  function toggle() {
    var row = state.rows[state.row];
    if (!row || state.busy) return;
    var next = !row.keep;
    row.keep = next;
    state.busy = true;
    render();
    exec("sh " + shellQuote(scriptPath()) + " set " + shellQuote(row.id) + " " + (next ? "on" : "off")).then(function () {
      if (!isOpen()) return;
      state.busy = false;
      state.note = next ? row.title + " may stay loaded." : row.title + " unloads unless it is open or in the background.";
      render();
      if (!next) exec("sh " + shellQuote(scriptPath()) + " once").catch(function () {});
    }, function () {
      if (!isOpen()) return;
      row.keep = !next;
      state.busy = false;
      state.note = "That change was not saved.";
      render();
    });
  }

  function open() {
    if (isOpen()) return;
    state = { open: true, row: 0, rows: [], loading: true, busy: false, note: "" };
    ensureStyle();
    hideHome();
    root = el("div", "slopium-memory screen screen--settings");
    document.body.appendChild(root);
    render();
    exec("sh " + shellQuote(scriptPath()) + " list").then(function (out) {
      if (!isOpen()) return;
      state.loading = false;
      state.rows = String(out || "").split("\n").map(function (line) {
        var p = line.split("\t");
        if (p.length < 3 || !p[0]) return null;
        return { id: p[0], title: p[1], keep: p[2] === "yes" };
      }).filter(Boolean);
      render();
    }, function () {
      if (!isOpen()) return;
      state.loading = false;
      state.note = "The app list did not load.";
      render();
    });
  }

  function close() {
    if (!state) return;
    state.open = false;
    state = null;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    showHome();
  }

  var KEYS = { 38: "up", 40: "down", 13: "enter", 461: "back", 27: "back" };
  window.addEventListener("keydown", function (event) {
    if (!isOpen()) return;
    var act = KEYS[event.keyCode];
    if (!act) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (act === "back") { swallowUp = true; close(); return; }
    if (act === "up" && state.row > 0) state.row -= 1;
    if (act === "down" && state.row < state.rows.length - 1) state.row += 1;
    if (act === "enter") toggle();
    else follow();
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

  window.SlopiumMemory = { open: open, close: close, isOpen: isOpen };
})();
