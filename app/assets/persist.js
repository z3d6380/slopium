/* Keeps one Slopium layout for the tile and for the Home button.
   The Home page's own localStorage does not survive a reboot on this TV,
   and a failed read makes the app paint its built-in defaults (Singapore).
   A richer layout is kept in /var/lib/webosbrew/slopium-config.json and in
   config-seed.js, which this file applies before app.js reads storage. */
(function () {
  var KEY = "slopium-config-v1";
  var REVKEY = "slopium-config-rev";
  var FILE = "/var/lib/webosbrew/slopium-config.json";
  var REVFILE = "/var/lib/webosbrew/slopium-config.rev";
  var SCRIPT = "/media/developer/apps/usr/palm/applications/io.github.batmanrises.slopium/direct-home.sh";
  var EXEC = "luna://org.webosbrew.hbchannel.service/exec";
  var origGet = localStorage.getItem.bind(localStorage);
  var origSet = localStorage.setItem.bind(localStorage);
  var overlay = null;
  var protect = false;
  var mirrorTimer = 0;
  var hydrating = false;

  function parse(raw) {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function cityName(cfg) {
    var city = cfg && cfg.weather && cfg.weather.city;
    return city && typeof city.name === "string" ? city.name : "";
  }

  function rich(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    if (cityName(cfg) && cityName(cfg) !== "Singapore") return true;
    if (cfg.clockFormat === "24h") return true;
    if (cfg.hiddenIds && cfg.hiddenIds.length) return true;
    if (cfg.wallpaper && cfg.wallpaper.mode === "builtin" && cfg.wallpaper.path) return true;
    if (cfg.theme && cfg.theme !== "clear" && cfg.theme !== "black") return true;
    return false;
  }

  function decodeSeed() {
    var b64 = window.__slopiumSeedB64;
    if (!b64) return null;
    try {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      var i;
      for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 255;
      var text = typeof TextDecoder === "function" ? new TextDecoder().decode(bytes) : bin;
      return parse(text);
    } catch (e) {
      return null;
    }
  }

  function readRaw(key) {
    try {
      return origGet(key);
    } catch (e) {
      return null;
    }
  }

  function encodeB64(text) {
    var bytes = typeof TextEncoder === "function" ? new TextEncoder().encode(text) : null;
    var bin = "";
    var i;
    if (!bytes) return btoa(unescape(encodeURIComponent(text)));
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function exec(command, done) {
    var Bridge = window.PalmServiceBridge;
    if (typeof Bridge !== "function") {
      if (done) done(false, "");
      return;
    }
    var bridge = new Bridge();
    var finished = false;
    var timer = setTimeout(function () {
      if (finished) return;
      finished = true;
      if (done) done(false, "");
    }, 8000);
    bridge.onservicecallback = function (body) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (done) done(true, body || "");
    };
    try {
      bridge.call(EXEC, JSON.stringify({ command: command }));
    } catch (e) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        if (done) done(false, "");
      }
    }
  }

  function adopt(cfg) {
    if (!rich(cfg)) return;
    overlay = JSON.stringify(cfg);
    protect = true;
    try {
      origSet(KEY, overlay);
    } catch (e) {}
  }

  var localCfg = parse(readRaw(KEY));
  var seedCfg = decodeSeed();
  var seedRev = Number(window.__slopiumSeedRev) || 0;
  var localRev = Number(readRaw(REVKEY)) || 0;
  if (rich(seedCfg) && seedRev > localRev) {
    adopt(seedCfg);
    try {
      origSet(REVKEY, String(seedRev));
    } catch (e) {}
  } else if (rich(localCfg)) {
    adopt(localCfg);
  } else if (rich(seedCfg)) {
    adopt(seedCfg);
  } else {
    protect = true;
  }

  localStorage.getItem = function (key) {
    if (key === KEY && overlay !== null) return overlay;
    try {
      return origGet(key);
    } catch (e) {
      return null;
    }
  };

  localStorage.setItem = function (key, value) {
    if (key === KEY) {
      var next = parse(value);
      if (protect && !rich(next)) return;
      overlay = value;
      protect = true;
      try {
        origSet(key, value);
      } catch (e) {}
      scheduleMirror(value);
      return;
    }
    try {
      origSet(key, value);
    } catch (e) {}
  };

  function scheduleMirror(raw) {
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(function () {
      mirror(raw);
    }, 400);
  }

  function mirror(raw) {
    if (!rich(parse(raw))) return;
    var rev = Date.now();
    var b64 = encodeB64(raw);
    var cmd =
      "python3 -c 'import sys,base64,pathlib; p=pathlib.Path(sys.argv[1]); new=int(sys.argv[2]); cur=int(p.read_text().strip() or 0) if p.is_file() else 0; cur<=new and pathlib.Path(\"" +
      FILE +
      "\").write_bytes(base64.b64decode(sys.argv[3])) and p.write_text(str(new)+chr(10))' '" +
      REVFILE +
      "' '" +
      rev +
      "' '" +
      b64 +
      "' && sh '" +
      SCRIPT +
      "' write-seed";
    exec(cmd, function (ok) {
      if (!ok) return;
      try {
        origSet(REVKEY, String(rev));
      } catch (e) {}
      window.__slopiumSeedRev = rev;
      window.__slopiumSeedB64 = b64;
    });
  }

  function pullShared() {
    if (hydrating || document.hidden) return;
    exec("cat '" + REVFILE + "' 2>/dev/null; echo; echo __SEP__; cat '" + FILE + "' 2>/dev/null", function (ok, body) {
      if (!ok || hydrating) return;
      var text = "";
      try {
        text = JSON.parse(body).stdoutString || "";
      } catch (e) {
        return;
      }
      var parts = text.split("__SEP__");
      if (parts.length < 2) return;
      var rev = Number(String(parts[0]).trim()) || 0;
      var raw = parts.slice(1).join("__SEP__").trim();
      var cfg = parse(raw);
      if (!rich(cfg) || rev <= (Number(readRaw(REVKEY)) || 0)) return;
      if (overlay !== null && JSON.stringify(parse(overlay)) === JSON.stringify(cfg)) return;
      hydrating = true;
      adopt(cfg);
      try {
        origSet(REVKEY, String(rev));
      } catch (e) {}
      try {
        sessionStorage.setItem("slopium-hydrated", String(rev));
      } catch (e) {}
      if (sessionStorage.getItem("slopium-hydrated-once") === String(rev)) return;
      try {
        sessionStorage.setItem("slopium-hydrated-once", String(rev));
      } catch (e) {}
      location.reload();
    });
  }

  if (!rich(localCfg) && !rich(seedCfg)) {
    exec("cat '" + FILE + "' 2>/dev/null", function (ok, body) {
      var raw = "";
      try {
        raw = JSON.parse(body).stdoutString || "";
      } catch (e) {
        protect = rich(parse(overlay));
        return;
      }
      var cfg = parse(String(raw).trim());
      if (!rich(cfg)) {
        protect = false;
        return;
      }
      adopt(cfg);
      var seen = "";
      try {
        seen = sessionStorage.getItem("slopium-file-once") || "";
      } catch (e) {}
      if (seen === "1") return;
      try {
        sessionStorage.setItem("slopium-file-once", "1");
      } catch (e) {}
      exec("sh '" + SCRIPT + "' write-seed", function () {
        location.reload();
      });
    });
  }

  document.addEventListener("visibilitychange", pullShared);
})();
