/* Slopium's own system pages. The System tile used to open the TV's settings app.
   These pages use the same type, tabs and rows as Slopium Settings, and they
   read and write the TV's settings service. System metrics are a later page. */
(function () {
  "use strict";

  var GET = "luna://com.webos.settingsservice/getSystemSettings";
  var DESC = "luna://com.webos.settingsservice/getSystemSettingDesc";
  var SET = "luna://com.webos.settingsservice/setSystemSettings";
  var EXEC = "luna://org.webosbrew.hbchannel.service/exec";

  var LABELS = {
    pictureMode: {
      personalized: "Personalized",
      vivid: "Vivid",
      normal: "Standard",
      eco: "Eco",
      cinema: "Cinema",
      sports: "Sports",
      game: "Game Optimizer",
      filmMaker: "Filmmaker",
      expert1: "Expert, bright room",
      expert2: "Expert, dark room"
    },
    energySaving: { auto: "Auto", off: "Off", min: "Minimum", med: "Medium", max: "Maximum" },
    gamma: { low: "Low", medium: "Medium", high1: "High 1", high2: "High 2" },
    truMotionMode: {
      off: "Off",
      cinemaClear: "Cinema Clear",
      natural: "Natural",
      smooth: "Smooth",
      user: "User",
      clear: "Clear"
    },
    soundMode: {
      aiSoundPlus: "AI Sound Pro",
      standard: "Standard",
      movie: "Cinema",
      news: "Clear Voice",
      sports: "Sports",
      music: "Music",
      game: "Game Optimizer"
    },
    soundOutput: {
      tv_speaker: "TV speaker",
      tv_speakerbar: "TV and soundbar",
      external_optical: "Optical",
      external_arc: "HDMI ARC",
      bt_soundbar: "Bluetooth soundbar",
      wisa_speaker: "WiSA speakers",
      mobile_phone: "Phone",
      lineout: "Line out",
      builtin_soundbar: "Built-in soundbar",
      headphone: "Headphones",
      bt_audio: "Bluetooth audio",
      tv_external_speaker: "TV and external speaker",
      tv_speaker_headphone: "TV speaker and headphones",
      tv_speaker_bluetooth: "TV speaker and Bluetooth",
      tv_speakerbar_headphone: "Soundbar and headphones",
      tv_speaker_external_arc: "TV speaker and HDMI ARC",
      usb_speaker: "USB speaker",
      wow_cast: "WOW Cast",
      tv_speaker_wow_cast: "TV speaker and WOW Cast",
      flex_connector: "Flex connector"
    },
    pointerSpeed: { "very slow": "Very slow", slow: "Slow", normal: "Normal", fast: "Fast" },
    pointerSize: { small: "Small", medium: "Medium", large: "Large" },
    logoLight: { off: "Off", low: "Low", medium: "Medium", high: "High" },
    volumeControl: { low: "Low", medium: "Medium", high: "High" }
  };

  var LEVEL = { off: "Off", on: "On", low: "Low", medium: "Medium", high: "High", auto: "Auto" };

  var PICTURE = [
    spec("picture", "pictureMode", "Picture mode", "The look of the picture on this input."),
    spec("picture", "backlight", "OLED light", "How bright the panel is."),
    spec("picture", "contrast", "Contrast", "The difference between light and dark."),
    spec("picture", "brightness", "Brightness", "Raises or lowers the black level."),
    spec("picture", "sharpness", "Sharpness", "Edge crispness. High values look harsh."),
    spec("picture", "color", "Color", "How strong the colour is."),
    spec("picture", "tint", "Tint", "Green toward the left, red toward the right."),
    spec("picture", "colorTemperature", "Color temperature", "Warm toward the left, cool toward the right."),
    spec("picture", "gamma", "Gamma", "How the midtones are shaped."),
    spec("picture", "peakBrightness", "Peak brightness", "Extra brightness on small highlights."),
    spec("picture", "dynamicContrast", "Dynamic contrast", "Lifts contrast scene by scene."),
    spec("picture", "superResolution", "Super resolution", "Sharpens fine detail."),
    spec("picture", "noiseReduction", "Noise reduction", "Softens noise in the picture."),
    spec("picture", "mpegNoiseReduction", "MPEG noise reduction", "Softens blockiness in compressed video."),
    spec("picture", "smoothGradation", "Smooth gradation", "Smooths banding in skies and walls."),
    spec("picture", "realCinema", "Real cinema", "Keeps the judder a film was shot with."),
    spec("picture", "truMotionMode", "TruMotion", "Frame interpolation. Off keeps the original motion."),
    spec("picture", "motionEyeCare", "Motion eye care", "Softens flicker for some people."),
    spec("picture", "eyeComfortMode", "Eye comfort", "Warms the picture to ease eye strain."),
    spec("picture", "filmMakerMode", "Filmmaker mode", "Switches to Filmmaker when a film asks for it."),
    spec("picture", "energySaving", "Energy saving", "Dims the panel to use less power.")
  ];

  var SOUND = [
    spec("sound", "soundMode", "Sound mode", "The character of the sound."),
    spec("sound", "soundOutput", "Sound output", "Where the audio is played."),
    spec("sound", "aiSound", "AI Sound", "Adjusts the sound to the room."),
    spec("sound", "smartSoundMode", "Smart sound", "Picks a sound mode from what is playing."),
    spec("sound", "autoVolume", "Auto volume", "Evens out loud and quiet passages."),
    spec("sound", "avSync", "AV sync", "Lines the sound up with the picture."),
    spec("sound", "audioBalance", "Balance", "Left toward the left, right toward the right."),
    spec("sound", "eArcSupport", "eARC", "Lets a soundbar receive full HDMI audio."),
    spec("sound", "volumeControl", "Volume steps", "How far each press of volume moves.")
  ];

  var GENERAL = [
    spec("option", "quickStartMode", "Quick Start+", "The TV turns on faster, and uses a little power while it is off."),
    spec("option", "logoLight", "Logo light", "The brightness of the logo on the set."),
    spec("option", "standByLight", "Standby light", "The small light while the TV is off."),
    spec("option", "pointerSize", "Pointer size", "The size of the magic remote pointer."),
    spec("option", "pointerSpeed", "Pointer speed", "How fast the pointer moves."),
    spec("option", "audioGuidance", "Audio guidance", "Speaks the focused item."),
    spec("option", "menuTransparency", "Menu transparency", "Lets the picture show through menus."),
    spec("option", "screenOffTime", "Screen off", "Turns the panel off when the TV is left idle."),
    spec("option", "screenSaverTimer", "Screensaver", "How long until the screensaver starts.")
  ];

  var HINT = "← → change a value · ↑ pages · Back returns home";

  var state = null;
  var root = null;
  var swallowUp = false;
  var styleNode = null;
  var hiddenHome = [];

  function spec(category, key, label, description) {
    return { category: category, key: key, label: label, description: description, locked: category === "picture" ? "Locked for this picture mode." : "Unavailable right now." };
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function norm(value) {
    if (value === true) return "true";
    if (value === false) return "false";
    if (value == null) return "";
    return String(value);
  }

  function choiceLabel(key, value) {
    var map = LABELS[key];
    if (map && map[value]) return map[value];
    if (key === "screenOffTime" || key === "screenSaverTimer") return durationLabel(value);
    if (LEVEL[value]) return LEVEL[value];
    var text = String(value).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function durationLabel(value) {
    var n = parseInt(value, 10);
    if (n === 60) return "1 hour";
    if (n === 120) return "2 hours";
    if (n > 0) return n === 1 ? "1 minute" : n + " minutes";
    return String(value);
  }

  function format(control) {
    if (control.kind === "info" || control.kind === "action") return control.valueText || "";
    if (control.kind === "range") return String(control.value);
    var list = control.choices || [];
    var i;
    for (i = 0; i < list.length; i++) if (list[i].value === String(control.value)) return list[i].label;
    return choiceLabel(control.key, control.value);
  }

  function shellQuote(text) {
    return "'" + String(text).replace(/'/g, "'\\''") + "'";
  }

  function parseJson(text) {
    var raw = String(text || "");
    var start = raw.indexOf("{");
    if (start < 0) throw new Error("The TV sent an empty reply");
    return JSON.parse(raw.slice(start));
  }

  function palm(uri, payload, timeout) {
    return new Promise(function (resolve, reject) {
      if (typeof window.PalmServiceBridge !== "function") {
        reject(new Error("Not running on webOS"));
        return;
      }
      var bridge = new window.PalmServiceBridge();
      var done = false;
      var timer = window.setTimeout(function () {
        finish(function () { reject(new Error("Timed out")); });
      }, timeout || 4000);
      function finish(fn) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        try { bridge.cancel(); } catch (ignore) {}
        fn();
      }
      bridge.onservicecallback = function (raw) {
        var msg;
        try { msg = JSON.parse(raw); }
        catch (err) { finish(function () { reject(err); }); return; }
        if (msg && msg.returnValue === false && !msg.settings && !msg.results) {
          finish(function () { reject(new Error(msg.errorText || "The TV refused that call")); });
          return;
        }
        finish(function () { resolve(msg || {}); });
      };
      try { bridge.call(uri, JSON.stringify(payload || {})); }
      catch (err) { finish(function () { reject(err); }); }
    });
  }

  function denied(err) {
    var message = String(err && err.message || err);
    return /denied|permission|not allowed|insufficient|not running on webos/i.test(message);
  }

  function viaExec(uri, payload) {
    var command = "luna-send -n 1 -w 4000 " + uri + " " + shellQuote(JSON.stringify(payload || {}));
    return palm(EXEC, { command: command }, 8000).then(function (msg) {
      return parseJson(msg && (msg.stdoutString || msg.stdout || ""));
    });
  }

  function luna(uri, payload) {
    return palm(uri, payload).catch(function (err) {
      if (!denied(err)) throw err;
      return viaExec(uri, payload);
    });
  }

  function pickDimension(names, source) {
    var out = {};
    var i;
    if (!names || !source) return null;
    for (i = 0; i < names.length; i++) {
      if (source[names[i]] != null) out[names[i]] = source[names[i]];
    }
    return Object.keys(out).length ? out : null;
  }

  function controlFrom(itemSpec, item, value, dimension) {
    if (!item) return null;
    var ui = item.ui || {};
    if (ui.visible === false) return null;
    if (value && typeof value === "object") return null;
    var current = norm(value);
    if (current === "") return null;
    var control = {
      id: itemSpec.key,
      key: itemSpec.key,
      category: itemSpec.category,
      label: itemSpec.label,
      description: itemSpec.description,
      disabled: ui.active === false,
      dimension: pickDimension(item.dimension, dimension),
      currentApp: item.dbtype === "M",
      saved: current,
      value: current,
      choices: null
    };
    if (item.vtype === "Range" && item.values && item.values.range) {
      control.kind = "range";
      control.min = item.values.range.min;
      control.max = item.values.range.max;
      control.step = item.values.range.interval || 1;
    } else if (item.values && item.values.arrayExt) {
      var choices = [];
      item.values.arrayExt.forEach(function (entry) {
        if (entry.visible === false) return;
        var entryValue = norm(entry.value);
        if (entry.active === false && entryValue !== current) return;
        choices.push({ value: entryValue, label: choiceLabel(itemSpec.key, entryValue) });
      });
      if (!choices.length) return null;
      var flags = choices.map(function (choice) { return choice.value; }).sort().join(",");
      control.kind = (flags === "off,on" || flags === "false,true") ? "switch" : "enum";
      control.choices = choices;
    } else {
      return null;
    }
    if (control.disabled) control.description = itemSpec.locked;
    control.valueText = format(control);
    return control;
  }

  function buildList(specs, results, settings, dimensions) {
    var byKey = {};
    (results || []).forEach(function (item) { if (item && item.key) byKey[item.key] = item; });
    var controls = [];
    specs.forEach(function (itemSpec) {
      var dimension = dimensions[itemSpec.key] || dimensions["*"];
      var control = controlFrom(itemSpec, byKey[itemSpec.key], settings[itemSpec.key], dimension);
      if (control) controls.push(control);
    });
    return controls;
  }

  function loadCategory(specs) {
    var keys = specs.map(function (item) { return item.key; });
    var category = specs[0].category;
    var tru = category === "picture";
    var mainKeys = tru ? keys.filter(function (key) { return key !== "truMotionMode"; }) : keys;
    var reads = [
      luna(GET, { category: category, keys: mainKeys }),
      luna(DESC, { category: category, keys: keys })
    ];
    if (tru) reads.push(luna(GET, { category: "picture", keys: ["truMotionMode"], current_app: true }).catch(function () { return {}; }));
    return Promise.all(reads).then(function (parts) {
      var main = parts[0] || {};
      var desc = parts[1] || {};
      var extra = parts[2] || {};
      var settings = {};
      var key;
      if (main.settings) for (key in main.settings) settings[key] = main.settings[key];
      if (extra.settings) for (key in extra.settings) settings[key] = extra.settings[key];
      var dimensions = { "*": main.dimension || null };
      if (extra.dimension) dimensions.truMotionMode = extra.dimension;
      return buildList(specs, desc.results, settings, dimensions);
    });
  }

  function info(id, label, value, description) {
    return {
      id: id,
      kind: "info",
      label: label,
      description: description || "",
      valueText: value == null || value === "" ? "—" : String(value),
      disabled: false
    };
  }

  function loadNetwork() {
    return Promise.all([
      luna("luna://com.webos.service.connectionmanager/getstatus", {}).catch(function () { return {}; }),
      luna(GET, { category: "network", keys: ["deviceName", "wolwowlOnOff"] }).catch(function () { return {}; }),
      luna(DESC, { category: "network", keys: ["deviceName", "wolwowlOnOff"] }).catch(function () { return {}; })
    ]).then(function (parts) {
      var net = parts[0] || {};
      var got = parts[1] || {};
      var desc = parts[2] || {};
      var wifi = net.wifi || {};
      var wired = net.wired || {};
      var controls = [];
      if (!net.returnValue && wired.state !== "connected" && wifi.state !== "connected") {
        controls.push(info("link", "Connection", "Unavailable", "The TV did not report a network."));
      } else if (wired.state === "connected") {
        controls.push(info("link", "Connection", "Ethernet"));
        if (wired.ipAddress) controls.push(info("ip", "Address", wired.ipAddress));
        controls.push(info("net", "Internet", net.isInternetConnectionAvailable ? "Connected" : "No connection"));
      } else if (wifi.state === "connected") {
        var freq = parseInt(wifi.connectedFrequency, 10);
        var band = freq >= 5000 ? "5 GHz" : freq > 0 ? "2.4 GHz" : "";
        var channel = wifi.connectedChannel ? "channel " + wifi.connectedChannel : "";
        controls.push(info("link", "Connection", "Wi-Fi"));
        controls.push(info("ssid", "Network", wifi.ssid || wifi.displayName || "Connected"));
        controls.push(info("net", "Internet", wifi.onInternet === "yes" || net.isInternetConnectionAvailable ? "Connected" : "No connection"));
        if (wifi.ipAddress) controls.push(info("ip", "Address", wifi.ipAddress));
        if (band || channel) controls.push(info("band", "Band", [band, channel].filter(Boolean).join(" · ")));
      } else {
        controls.push(info("link", "Connection", "Not connected", "Wi-Fi and Ethernet are both down."));
      }
      var settings = got.settings || {};
      var wol = controlFrom(spec("network", "wolwowlOnOff", "Wake on LAN", "Wakes the TV when another device asks."), findResult(desc.results, "wolwowlOnOff"), settings.wolwowlOnOff, got.dimension);
      if (wol) controls.push(wol);
      if (settings.deviceName) controls.push(info("name", "Device name", settings.deviceName, "The name other devices on the network see."));
      return controls;
    });
  }

  function findResult(results, key) {
    var i;
    for (i = 0; results && i < results.length; i++) if (results[i].key === key) return results[i];
    return null;
  }

  function loadSupport() {
    return luna("luna://com.webos.service.tv.systemproperty/getSystemInfo", {
      keys: ["modelName", "firmwareVersion", "sdkVersion"]
    }).then(function (msg) {
      return supportRows(msg || {});
    }, function () {
      return supportRows({});
    });
  }

  function supportRows(msg) {
    var rows = [];
    if (msg.modelName) rows.push(info("model", "Model", msg.modelName));
    if (msg.sdkVersion) rows.push(info("os", "webOS", msg.sdkVersion));
    if (msg.firmwareVersion) rows.push(info("software", "Software", msg.firmwareVersion));
    rows.push({
      id: "lg",
      kind: "action",
      label: "LG settings",
      description: "OK opens the TV's own menu for channels, accounts and everything else.",
      valueText: "Open",
      disabled: false,
      run: openLg
    });
    return rows;
  }

  function openLg() {
    close();
    luna("luna://com.webos.applicationManager/launch", { id: "com.palm.app.settings", params: {} }).catch(function () {
      return luna("luna://com.webos.applicationManager/launch", { id: "com.webos.app.settings", params: {} });
    });
  }

  var PAGE_DEFS = [
    { id: "picture", label: "Picture", load: function () { return loadCategory(PICTURE); } },
    { id: "sound", label: "Sound", load: function () { return loadCategory(SOUND); } },
    { id: "network", label: "Network", load: loadNetwork },
    { id: "general", label: "General", load: function () { return loadCategory(GENERAL); } },
    { id: "support", label: "Support", load: loadSupport }
  ];

  function isOpen() {
    return !!(state && state.open);
  }

  function ensureStyle() {
    if (styleNode) return;
    styleNode = el("style");
    styleNode.textContent = ".slopium-system{z-index:40}.slopium-system .options{height:var(--slopium-system-h,640px)}";
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

  function mount() {
    ensureStyle();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = el("div", "slopium-system screen screen--settings");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "System");
    document.body.appendChild(root);
    hideHome();
  }

  function open() {
    if (isOpen()) return;
    state = {
      open: true,
      tab: 0,
      zone: "rows",
      row: 0,
      note: "",
      pages: PAGE_DEFS.map(function (page) {
        return { id: page.id, label: page.label, status: "loading", controls: [] };
      })
    };
    mount();
    render();
    if (window.__SLOPIUM_SYSTEM_PREVIEW) {
      window.__SLOPIUM_SYSTEM_PREVIEW.forEach(function (controls, index) {
        state.pages[index].controls = controls;
        state.pages[index].status = "ready";
      });
      render();
      return;
    }
    PAGE_DEFS.forEach(function (page, index) {
      page.load().then(function (controls) {
        if (!isOpen()) return;
        state.pages[index].controls = controls;
        state.pages[index].status = controls.length ? "ready" : "empty";
        if (state.tab === index && state.row > controls.length - 1) state.row = 0;
        render();
      }, function () {
        if (!isOpen()) return;
        state.pages[index].status = "error";
        state.pages[index].controls = [];
        render();
      });
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

  function pageRows(page) {
    if (page.status === "loading") return [info("loading", "Reading", "One moment", "Asking the TV for this page.")];
    if (page.status === "error") return [info("error", "Unavailable", "Try again", "This page did not answer. The other pages are unaffected.")];
    if (page.status === "empty" || !page.controls.length) return [info("empty", "Nothing here", "—", "This TV has none of these controls.")];
    return page.controls;
  }

  function render() {
    if (!isOpen() || !root) return;
    var page = state.pages[state.tab];
    var rows = pageRows(page);
    if (state.zone === "rows" && state.row > rows.length - 1) state.row = Math.max(0, rows.length - 1);
    root.textContent = "";
    var wrap = el("div", "settings");
    var title = el("h1", "settings__title");
    title.textContent = "System";
    var hint = el("p", "settings__hint");
    hint.textContent = state.note || HINT;
    var tabs = el("div", "settings__tabs");
    state.pages.forEach(function (item, index) {
      var tab = el("div", ["tab", index === state.tab && "tab--active", state.zone === "tabs" && index === state.tab && "tab--focused"].filter(Boolean).join(" "));
      tab.textContent = item.label;
      tab.addEventListener("mouseenter", function () {
        if (state.zone === "tabs" && state.tab === index) return;
        state.zone = "tabs";
        state.tab = index;
        state.row = 0;
        render();
      });
      tab.addEventListener("click", function () {
        state.zone = "rows";
        state.tab = index;
        state.row = 0;
        render();
      });
      tabs.appendChild(tab);
    });
    var list = el("div", "options");
    var track = el("div", "options__track");
    rows.forEach(function (control, index) {
      var focused = state.zone === "rows" && index === state.row;
      var row = el("div", "option" + (focused ? " option--focused" : "") + (control.disabled ? " option--disabled" : ""));
      var text = el("div", "option__text");
      var label = el("div", "option__label");
      label.textContent = control.label;
      text.appendChild(label);
      if (control.description) {
        var description = el("div", "option__description" + (control.disabled ? " option__description--reason" : ""));
        description.textContent = control.description;
        text.appendChild(description);
      }
      row.appendChild(text);
      if (control.kind === "switch") {
        var on = control.value === "on" || control.value === "true";
        var knobWrap = el("div", "switch" + (on ? " switch--on" : ""));
        knobWrap.appendChild(el("div", "switch__knob"));
        row.appendChild(knobWrap);
      } else {
        var value = el("div", "option__value");
        if (!control.disabled && (control.kind === "enum" || control.kind === "range")) {
          var left = el("span", "option__chevron");
          left.textContent = "‹";
          var valueText = el("span", "option__value-text");
          valueText.textContent = format(control);
          var right = el("span", "option__chevron");
          right.textContent = "›";
          value.appendChild(left);
          value.appendChild(valueText);
          value.appendChild(right);
        } else {
          value.textContent = control.valueText || "";
        }
        row.appendChild(value);
      }
      row.addEventListener("mouseenter", function () {
        if (state.zone === "rows" && state.row === index) return;
        state.zone = "rows";
        state.row = index;
        paintFocus();
      });
      row.addEventListener("click", function () {
        state.zone = "rows";
        state.row = index;
        activate();
      });
      track.appendChild(row);
    });
    list.appendChild(track);
    wrap.appendChild(title);
    wrap.appendChild(hint);
    wrap.appendChild(tabs);
    wrap.appendChild(list);
    root.appendChild(wrap);
    window.requestAnimationFrame(layout);
  }

  function paintFocus() {
    if (!isOpen() || !root) return;
    var tabs = root.querySelectorAll(".settings__tabs .tab");
    var i;
    for (i = 0; i < tabs.length; i++) {
      tabs[i].className = ["tab", i === state.tab && "tab--active", state.zone === "tabs" && i === state.tab && "tab--focused"].filter(Boolean).join(" ");
    }
    var page = state.pages[state.tab];
    var controls = pageRows(page);
    var rows = root.querySelectorAll(".options__track .option");
    for (i = 0; i < rows.length; i++) {
      var control = controls[i];
      var focused = state.zone === "rows" && i === state.row;
      rows[i].className = "option" + (focused ? " option--focused" : "") + (control && control.disabled ? " option--disabled" : "");
    }
  }

  function layout() {
    if (!isOpen() || !root) return;
    var tabs = root.querySelector(".settings__tabs");
    var list = root.querySelector(".options");
    var track = root.querySelector(".options__track");
    if (!tabs || !list || !track) return;
    var height = Math.max(360, window.innerHeight - tabs.getBoundingClientRect().bottom - 52);
    list.style.height = height + "px";
    if (state.zone !== "rows") {
      window.SlopiumGlide.to(track, 0);
      return;
    }
    var row = track.children[state.row];
    if (!row) return;
    var view = list.clientHeight;
    var anchor = Math.round(Math.min(view * 0.34, 220));
    var top = row.offsetTop;
    var y = Math.max(0, top - anchor);
    var max = Math.max(0, track.scrollHeight - view);
    var bottom = top + row.offsetHeight;
    if (row.offsetHeight < view && bottom - y > view - 12) y = bottom - (view - 12);
    window.SlopiumGlide.to(track, Math.max(0, Math.min(max, y)));
  }

  function stepRange(control, dir) {
    var current = parseFloat(control.value);
    if (!isFinite(current)) return control.value;
    var next = Math.min(control.max, Math.max(control.min, current + dir * (control.step || 1)));
    if (control.step % 1 === 0) next = Math.round(next);
    return String(next);
  }

  function stepEnum(control, dir) {
    var list = control.choices || [];
    if (!list.length) return control.value;
    var index = -1;
    var i;
    for (i = 0; i < list.length; i++) if (list[i].value === String(control.value)) index = i;
    if (index < 0) index = dir > 0 ? -1 : 0;
    return list[(index + dir + list.length) % list.length].value;
  }

  function commit(control, value, immediate) {
    if (control._from == null) control._from = control.saved;
    control.value = value;
    control.valueText = format(control);
    render();
    window.clearTimeout(control.timer);
    var send = function () {
      var from = control._from;
      control._from = null;
      if (value === from) return;
      var body = { category: control.category, settings: {} };
      body.settings[control.key] = value;
      if (control.dimension) body.dimension = control.dimension;
      if (control.currentApp) body.current_app = true;
      luna(SET, body).then(function () {
        if (!isOpen()) return;
        control.saved = value;
        if (control.key === "pictureMode") refreshPicture();
      }, function () {
        if (!isOpen()) return;
        control.value = from;
        control.saved = from;
        control.valueText = format(control);
        note("The TV kept the previous " + control.label.toLowerCase() + ".");
        render();
      });
    };
    if (immediate) send();
    else control.timer = window.setTimeout(send, 280);
  }

  function note(text) {
    state.note = text;
    window.clearTimeout(state.noteTimer);
    state.noteTimer = window.setTimeout(function () {
      if (!isOpen()) return;
      state.note = "";
      render();
    }, 2400);
  }

  function refreshPicture() {
    var keep = state.row;
    var zone = state.zone;
    loadCategory(PICTURE).then(function (controls) {
      if (!isOpen()) return;
      state.pages[0].controls = controls;
      state.pages[0].status = controls.length ? "ready" : "empty";
      if (state.tab === 0) {
        state.zone = zone;
        state.row = Math.min(keep, Math.max(0, controls.length - 1));
      }
      render();
    }, function () {});
  }

  function currentControl() {
    var page = state.pages[state.tab];
    if (!page || page.status !== "ready") return null;
    return page.controls[state.row] || null;
  }

  function nudge(dir) {
    var control = currentControl();
    if (!control || control.disabled) return;
    if (control.kind === "switch") {
      toggle(control);
      return;
    }
    var next = control.value;
    if (control.kind === "range") next = stepRange(control, dir);
    else if (control.kind === "enum") next = stepEnum(control, dir);
    else return;
    if (next === String(control.value)) return;
    commit(control, next, false);
  }

  function toggle(control) {
    var on = control.value === "on" || control.value === "true";
    var choices = control.choices || [];
    var offValue = "off";
    var onValue = "on";
    var i;
    for (i = 0; i < choices.length; i++) {
      if (choices[i].value === "off" || choices[i].value === "false") offValue = choices[i].value;
      if (choices[i].value === "on" || choices[i].value === "true") onValue = choices[i].value;
    }
    commit(control, on ? offValue : onValue, true);
  }

  function activate() {
    var control = currentControl();
    if (!control || control.disabled) return;
    if (control.kind === "switch") toggle(control);
    else if (control.kind === "action" && control.run) control.run();
    else if (control.kind === "enum" || control.kind === "range") nudge(1);
  }

  function move(act) {
    var page = state.pages[state.tab];
    var count = pageRows(page).length;
    if (act === "left" || act === "right") {
      if (state.zone === "tabs") {
        var dir = act === "right" ? 1 : -1;
        state.tab = (state.tab + dir + state.pages.length) % state.pages.length;
        state.row = 0;
        render();
        return;
      }
      nudge(act === "right" ? 1 : -1);
      return;
    }
    if (act === "up") {
      if (state.zone === "tabs") return;
      if (state.row <= 0) {
        state.zone = "tabs";
        render();
        return;
      }
      state.row -= 1;
      paintFocus();
      layout();
      return;
    }
    if (act === "down") {
      if (state.zone === "tabs") {
        if (count) state.zone = "rows";
        state.row = 0;
        render();
        return;
      }
      if (state.row < count - 1) {
        state.row += 1;
        paintFocus();
        layout();
      }
      return;
    }
    if (act === "enter") {
      if (state.zone === "tabs") {
        if (count) state.zone = "rows";
        state.row = 0;
        render();
        return;
      }
      activate();
    }
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

  document.addEventListener("webOSRelaunch", function () {
    if (isOpen()) close();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && isOpen()) close();
  });
  window.addEventListener("resize", function () {
    if (isOpen()) layout();
  });

  window.SlopiumSystem = { open: open, close: close, isOpen: isOpen };

  if (/[?&]systemPreview=1(?:&|$)/.test(String(location.search))) {
    window.__SLOPIUM_SYSTEM_PREVIEW = previewPages();
    window.addEventListener("load", function () {
      window.setTimeout(open, 500);
    });
  }

  function previewControl(kind, label, description, valueText, extra) {
    var control = {
      id: label,
      kind: kind,
      label: label,
      description: description,
      valueText: valueText,
      value: extra && extra.value || valueText,
      saved: extra && extra.value || valueText,
      disabled: !!(extra && extra.disabled),
      choices: extra && extra.choices || null,
      min: extra && extra.min,
      max: extra && extra.max,
      step: extra && extra.step || 1,
      key: extra && extra.key || label
    };
    if (control.disabled) control.description = "Locked for this picture mode.";
    return control;
  }

  function previewPages() {
    return [
      [
        previewControl("enum", "Picture mode", "The look of the picture on this input.", "Expert, dark room", { value: "expert2", key: "pictureMode", choices: [{ value: "expert2", label: "Expert, dark room" }, { value: "filmMaker", label: "Filmmaker" }] }),
        previewControl("range", "OLED light", "How bright the panel is.", "50", { value: "50", min: 0, max: 100 }),
        previewControl("range", "Contrast", "The difference between light and dark.", "80", { value: "80", min: 0, max: 100 }),
        previewControl("range", "Brightness", "Raises or lowers the black level.", "50", { value: "50", min: 0, max: 100 }),
        previewControl("range", "Sharpness", "Edge crispness. High values look harsh.", "10", { value: "10", min: 0, max: 50 }),
        previewControl("range", "Color", "How strong the colour is.", "50", { value: "50", min: 0, max: 100 }),
        previewControl("range", "Color temperature", "Warm toward the left, cool toward the right.", "-20", { value: "-20", min: -50, max: 50, disabled: true }),
        previewControl("enum", "Gamma", "How the midtones are shaped.", "High 2", { value: "high2", choices: [{ value: "high2", label: "High 2" }] }),
        previewControl("switch", "Real cinema", "Keeps the judder a film was shot with.", "", { value: "on", choices: [{ value: "off" }, { value: "on" }] }),
        previewControl("enum", "TruMotion", "Frame interpolation. Off keeps the original motion.", "Off", { value: "off", choices: [{ value: "off", label: "Off" }, { value: "smooth", label: "Smooth" }] }),
        previewControl("enum", "Energy saving", "Dims the panel to use less power.", "Auto", { value: "auto", choices: [{ value: "auto", label: "Auto" }, { value: "off", label: "Off" }] })
      ],
      [
        previewControl("enum", "Sound mode", "The character of the sound.", "AI Sound Pro", { value: "aiSoundPlus", choices: [{ value: "aiSoundPlus", label: "AI Sound Pro" }] }),
        previewControl("enum", "Sound output", "Where the audio is played.", "TV speaker", { value: "tv_speaker", choices: [{ value: "tv_speaker", label: "TV speaker" }] }),
        previewControl("switch", "Auto volume", "Evens out loud and quiet passages.", "", { value: "off", choices: [{ value: "off" }, { value: "on" }] }),
        previewControl("range", "Balance", "Left toward the left, right toward the right.", "0", { value: "0", min: -50, max: 50 })
      ],
      [
        info("link", "Connection", "Wi-Fi"),
        info("ssid", "Network", "Home Wi-Fi"),
        info("net", "Internet", "Connected"),
        info("ip", "Address", "192.168.1.20"),
        info("band", "Band", "5 GHz · channel 40"),
        previewControl("switch", "Wake on LAN", "Wakes the TV when another device asks.", "", { value: "true", choices: [{ value: "false" }, { value: "true" }] }),
        info("name", "Device name", "Living room", "The name other devices on the network see.")
      ],
      [
        previewControl("switch", "Quick Start+", "The TV turns on faster, and uses a little power while it is off.", "", { value: "off", choices: [{ value: "off" }, { value: "on" }] }),
        previewControl("enum", "Logo light", "The brightness of the logo on the set.", "Off", { value: "off", choices: [{ value: "off", label: "Off" }, { value: "low", label: "Low" }] }),
        previewControl("enum", "Pointer size", "The size of the magic remote pointer.", "Medium", { value: "medium", choices: [{ value: "medium", label: "Medium" }] })
      ],
      [
        info("model", "Model", "OLED77C3PUA"),
        info("os", "webOS", "11.2.0"),
        info("software", "Software", "43.21.84"),
        { id: "lg", kind: "action", label: "LG settings", description: "OK opens the TV's own menu for channels, accounts and everything else.", valueText: "Open", disabled: false, run: function () {} }
      ]
    ];
  }
})();
