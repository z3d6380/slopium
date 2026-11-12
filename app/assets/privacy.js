/* Privacy switches, from Life's Good Without Spying, drawn like Slopium Settings.
   Saving writes Slopium's own copy. Apply does nothing while Life's Good
   is still the boot applier, so the two do not rewrite the same hosts file. */
(function () {
  "use strict";

  var EXEC = "luna://org.webosbrew.hbchannel.service/exec";
  var PAGES = [
    {
      id: "hosts",
      label: "Hosts",
      hint: "Blocking a name stops uploads to it. The TV can still collect the data.",
      rows: [
        ["domains.acr", "ACR / Alphonso", "Content recognition."],
        ["domains.smartad", "SmartAd", "Ad delivery."],
        ["domains.dashboard", "Home recommendations", "Suggestions on the home screen."],
        ["domains.telemetry", "Telemetry", "Crash reports and diagnostics."],
        ["domains.sdp", "LG service platform", "Breaks the Content Store. With NTP on, this is blocked from boot."],
        ["domains.wiselg", "App usage", "Breaks Home previews."],
        ["domains.thinq", "ThinQ", "Also stops the ThinQ services. Breaks the ThinQ app."],
        ["domains.lgrecommends", "Content Store", "Breaks the Content Store."],
        ["domains.lgchannels", "LG Channels", "Breaks LG Channels."],
        ["domains.quickset", "Remote codes", "Breaks remote setup."],
        ["domains.updates", "Firmware updates", "Breaks firmware updates, and stops the update service before boot finishes."]
      ]
    },
    {
      id: "services",
      label: "Services",
      hint: "These stop processes on the TV. The microphone hardware stays available.",
      rows: [
        ["voice.stop", "Voice", "Stops the wake-word services and the voice app."],
        ["ads.stop", "Ads and ACR", "Stops the ad and content-recognition services."],
        ["lan.block", "LAN discovery", "Breaks casting."],
        ["purge.boot", "Boot purge", "Deletes stored ACR and voice files at boot."]
      ]
    },
    {
      id: "network",
      label: "Network",
      hint: "The DNS filter catches lookups that skip the hosts file.",
      rows: [
        ["dns.filter", "DNS filter", "Catches lookups that skip the hosts file."],
        ["dns.disable_ipv6", "Turn off IPv6", "Without this, IPv6 lookups skip the DNS filter."],
        ["clock.ntp", "Clock from NTP", "Lets the LG service platform be blocked from boot."]
      ]
    }
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
    return path.replace(/\/index\.html$/, "") + "/privacy/privacy.sh";
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
      var timer = window.setTimeout(function () { finish(function () { reject(new Error("Timed out")); }); }, 20000);
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
        if (!msg || msg.returnValue === false) finish(function () { reject(new Error(msg && msg.errorText || "The TV refused that call")); });
        else finish(function () { resolve(msg.stdoutString || msg.stdout || ""); });
      };
      try { bridge.call(EXEC, JSON.stringify({ command: command })); }
      catch (e) { finish(function () { reject(e); }); }
    });
  }

  function parseStatus(text) {
    var out = { source: "", owner: "", pending: true, values: {} };
    String(text || "").split("\n").forEach(function (line) {
      var i = line.indexOf("=");
      if (i < 1) return;
      var key = line.slice(0, i).trim();
      var value = line.slice(i + 1).trim();
      if (key === "source" || key === "owner") out[key] = value;
      else if (key === "pending") out.pending = value !== "no";
      else out.values[key] = value === "on";
    });
    return out;
  }

  function body() {
    var lines = [];
    PAGES.forEach(function (page) {
      page.rows.forEach(function (row) {
        lines.push(row[0] + "=" + (state.values[row[0]] ? "on" : "off"));
      });
    });
    return lines.join("\n") + "\n";
  }

  function b64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function isOpen() {
    return !!(state && state.open);
  }

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = ".slopium-privacy{z-index:42}.slopium-privacy .options{height:var(--privacy-h,640px)}";
    document.head.appendChild(styleNode);
  }

  function snapshot() {
    var copy = {};
    var key;
    for (key in state.values) {
      if (Object.prototype.hasOwnProperty.call(state.values, key)) copy[key] = !!state.values[key];
    }
    return copy;
  }

  function dirty() {
    if (!state.clean) return true;
    var key;
    for (key in state.values) {
      if (!Object.prototype.hasOwnProperty.call(state.values, key)) continue;
      if (!!state.values[key] !== !!state.clean[key]) return true;
    }
    for (key in state.clean) {
      if (!Object.prototype.hasOwnProperty.call(state.values, key)) return true;
    }
    return false;
  }

  function hint() {
    if (state.loading) return "Reading the switches.";
    if (state.busy) return "Applying.";
    if (state.note) return state.note;
    if (!dirty()) return "Applied";
    return "OK on Apply writes these switches.";
  }

  function render() {
    if (!isOpen() || !root) return;
    var page = PAGES[state.tab];
    root.textContent = "";
    var wrap = el("div", "settings");
    var title = el("h1", "settings__title");
    title.textContent = "Privacy";
    var sub = el("p", "settings__hint");
    sub.textContent = state.loading ? "Reading the switches." : hint();
    var tabs = el("div", "settings__tabs");
    PAGES.forEach(function (item, index) {
      var tab = el("div", ["tab", index === state.tab && "tab--active", state.zone === "tabs" && index === state.tab && "tab--focused"].filter(Boolean).join(" "));
      tab.textContent = item.label;
      tab.addEventListener("click", function () {
        state.tab = index;
        state.zone = "rows";
        state.row = 0;
        render();
      });
      tabs.appendChild(tab);
    });
    var applyTab = el("div", ["tab", state.tab === PAGES.length && "tab--active", state.zone === "tabs" && state.tab === PAGES.length && "tab--focused"].filter(Boolean).join(" "));
    applyTab.textContent = "Apply";
    applyTab.addEventListener("click", function () {
      state.tab = PAGES.length;
      state.zone = "rows";
      state.row = 0;
      render();
    });
    tabs.appendChild(applyTab);
    var list = el("div", "options");
    var track = el("div", "options__track");
    var rows = state.tab === PAGES.length ? [["apply", "Apply these switches", applyDetail(), "Open"]] : page.rows;
    rows.forEach(function (row, index) {
      var focused = state.zone === "rows" && index === state.row;
      var locked = row[0] === "apply" && !dirty() && !state.busy;
      var node = el("div", "option" + (focused ? " option--focused" : "") + (locked ? " option--disabled" : ""));
      var text = el("div", "option__text");
      var label = el("div", "option__label");
      label.textContent = row[1];
      text.appendChild(label);
      var description = el("div", "option__description");
      description.textContent = row[2];
      text.appendChild(description);
      node.appendChild(text);
      if (row[0] === "apply") {
        var value = el("div", "option__value");
        value.textContent = state.busy ? "Applying" : (dirty() ? "Run" : "Applied");
        node.appendChild(value);
      } else {
        var on = !!state.values[row[0]];
        var sw = el("div", "switch" + (on ? " switch--on" : ""));
        sw.appendChild(el("div", "switch__knob"));
        node.appendChild(sw);
      }
      node.addEventListener("click", function () {
        state.zone = "rows";
        state.row = index;
        activate();
      });
      track.appendChild(node);
    });
    if (!rows.length) {
      var empty = el("div", "option");
      var emptyText = el("div", "option__text");
      var emptyLabel = el("div", "option__label");
      emptyLabel.textContent = state.loading ? "Reading" : "Nothing here";
      emptyText.appendChild(emptyLabel);
      empty.appendChild(emptyText);
      track.appendChild(empty);
    }
    list.appendChild(track);
    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(tabs);
    wrap.appendChild(list);
    root.appendChild(wrap);
    window.requestAnimationFrame(layout);
  }

  function applyDetail() {
    if (state.busy) return "Writing the switches now.";
    if (!dirty()) return "These switches are already applied. Change one to apply again.";
    return "Writes the hosts file, services, DNS filter and the early update block to match these switches.";
  }

  function layout() {
    if (!isOpen() || !root) return;
    var tabs = root.querySelector(".settings__tabs");
    var list = root.querySelector(".options");
    var track = root.querySelector(".options__track");
    if (!tabs || !list || !track) return;
    list.style.height = Math.max(360, window.innerHeight - tabs.getBoundingClientRect().bottom - 52) + "px";
    if (state.zone !== "rows") {
      track.style.transform = "translateY(0)";
      return;
    }
    var row = track.children[state.row];
    if (!row) return;
    var view = list.clientHeight;
    var target = row.offsetTop - (view - row.offsetHeight) / 2;
    var max = Math.max(0, track.scrollHeight - view);
    track.style.transform = "translateY(" + (-Math.max(0, Math.min(max, target))) + "px)";
  }

  function note(text, sticky) {
    state.note = text;
    window.clearTimeout(state.noteTimer);
    if (sticky) return;
    state.noteTimer = window.setTimeout(function () {
      if (!isOpen()) return;
      state.note = "";
      render();
    }, 6000);
  }

  function lastLine(text) {
    var lines = String(text || "").split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
    var i;
    for (i = lines.length - 1; i >= 0; i--) {
      if (lines[i].indexOf("state=") === 0) continue;
      return lines[i];
    }
    return "";
  }

  function pollJob() {
    exec("sh " + shellQuote(scriptPath()) + " job").then(function (out) {
      if (!isOpen()) return;
      var first = String(out || "").split("\n")[0].trim();
      var line = lastLine(out);
      if (first === "state=running") {
        state.busy = true;
        note("Applying.", true);
        render();
        state.poll = window.setTimeout(pollJob, 2000);
        return;
      }
      state.busy = false;
      if (first === "state=done") {
        state.clean = state.sending || snapshot();
        state.note = "";
      } else {
        note(line && line.indexOf("state=") !== 0 ? line.replace(/^\[-\]\s*/, "") : "Apply failed.", true);
      }
      render();
    }, function () {
      if (!isOpen()) return;
      state.busy = false;
      note("Could not read whether apply finished.");
      render();
    });
  }

  function save() {
    var encoded = b64(body());
    return exec("sh " + shellQuote(scriptPath()) + " save " + shellQuote(encoded)).then(function () {
      state.source = "slopium";
    });
  }

  function toggle() {
    var page = PAGES[state.tab];
    if (!page) return;
    var row = page.rows[state.row];
    if (!row || state.busy) return;
    var key = row[0];
    var previous = !!state.values[key];
    state.values[key] = !previous;
    state.note = "";
    render();
    save().catch(function () {
      if (!isOpen()) return;
      state.values[key] = previous;
      note("The switch was not saved.");
      render();
    });
  }

  function runApply() {
    if (state.busy || !dirty()) return;
    state.busy = true;
    state.sending = snapshot();
    note("Applying.", true);
    render();
    save().then(function () {
      return exec("sh " + shellQuote(scriptPath()) + " apply");
    }).then(function () {
      if (!isOpen()) return;
      pollJob();
    }, function (err) {
      state.busy = false;
      if (!isOpen()) return;
      note(String(err && err.message || "Nothing was changed."));
      render();
    });
  }

  function activate() {
    if (state.tab === PAGES.length) runApply();
    else toggle();
  }

  function rowCount() {
    if (state.tab === PAGES.length) return 1;
    return PAGES[state.tab].rows.length;
  }

  function move(act) {
    var count = rowCount();
    if (act === "left" || act === "right") {
      if (state.zone === "tabs") {
        var total = PAGES.length + 1;
        state.tab = (state.tab + (act === "right" ? 1 : -1) + total) % total;
        state.row = 0;
        render();
        return;
      }
      if (state.tab !== PAGES.length) toggle();
      return;
    }
    if (act === "up") {
      if (state.zone === "rows" && state.row <= 0) state.zone = "tabs";
      else if (state.zone === "rows") state.row -= 1;
      render();
      return;
    }
    if (act === "down") {
      if (state.zone === "tabs") {
        state.zone = "rows";
        state.row = 0;
      } else if (state.row < count - 1) state.row += 1;
      render();
      return;
    }
    if (act === "enter") {
      if (state.zone === "tabs") {
        state.zone = "rows";
        state.row = 0;
        render();
        return;
      }
      activate();
    }
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

  function open() {
    if (isOpen()) return;
    state = { open: true, tab: 0, zone: "rows", row: 0, note: "", loading: true, busy: false, source: "", owner: "", values: {} };
    ensureStyle();
    hideHome();
    root = el("div", "slopium-privacy screen screen--settings");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Privacy");
    document.body.appendChild(root);
    render();
    exec("sh " + shellQuote(scriptPath()) + " status").then(function (out) {
      if (!isOpen()) return;
      var parsed = parseStatus(out);
      state.loading = false;
      state.source = parsed.source;
      state.owner = parsed.owner;
      state.values = parsed.values;
      state.clean = parsed.pending ? null : snapshot();
      render();
    }, function () {
      if (!isOpen()) return;
      state.loading = false;
      note("The TV did not list the switches.");
      render();
    });
  }

  function close() {
    if (!state) return;
    window.clearTimeout(state.poll);
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
    if (act === "back") {
      swallowUp = true;
      close();
      return;
    }
    move(act);
  }, true);
  window.addEventListener("keyup", function (event) {
    if (isOpen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (swallowUp) {
      swallowUp = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.SlopiumPrivacy = { open: open, close: close, isOpen: isOpen };
})();
