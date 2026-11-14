/* Arrow focus for the status row, HDMI chips, and power icons.
   Up from the top app row opens the weather card when that card is on.
   Up again, or Up when the card is off, moves here. Left and right move
   between the widgets. OK uses the same action as a click. Down or Back
   returns to the app row. */
(function () {
  "use strict";

  var KEYS = { 37: "left", 38: "up", 39: "right", 40: "down", 13: "enter", 461: "back", 27: "back" };
  var on = false;
  var focusId = "";

  function shown(node) {
    var el = node;
    while (el && el !== document.documentElement) {
      if (el.classList && (el.classList.contains("pw--hide") || el.classList.contains("in--hide") || el.classList.contains("mx--hide"))) return false;
      var st = window.getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) return false;
      el = el.parentElement;
    }
    var rect = node.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  }

  function blocked() {
    if (document.hidden) return true;
    if (document.querySelector(".slopium-system, .slopium-privacy, .slopium-memory, .slopium-hdmiads, .screen--settings, .screen--picker, .screen--recents, .screen--dialog")) return true;
    return false;
  }

  function targets() {
    var nodes = document.querySelectorAll("[data-chrome-id]");
    var list = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (!shown(nodes[i])) continue;
      list.push({ node: nodes[i], rect: nodes[i].getBoundingClientRect() });
    }
    list.sort(function (a, b) { return a.rect.left - b.rect.left; });
    return list;
  }

  function focusNode(node) {
    if (!node || !node.focus) return;
    try { node.focus({ preventScroll: true }); }
    catch (e) { node.focus(); }
  }

  function enter() {
    if (blocked()) return false;
    var items = targets();
    if (!items.length) return false;
    var ref = document.querySelector(".tile--focused") || document.querySelector(".wxc--focus");
    var x = ref ? ref.getBoundingClientRect().left + ref.getBoundingClientRect().width / 2 : items[0].rect.left;
    var best = items[0];
    var bestD = Infinity;
    var i;
    for (i = 0; i < items.length; i++) {
      var cx = items[i].rect.left + items[i].rect.width / 2;
      var d = Math.abs(cx - x);
      if (d < bestD) {
        bestD = d;
        best = items[i];
      }
    }
    on = true;
    focusId = best.node.getAttribute("data-chrome-id") || "";
    focusNode(best.node);
    return true;
  }

  function restored() {
    if (!on) return;
    var node = focusId ? document.querySelector('[data-chrome-id="' + focusId + '"]') : null;
    if (node && shown(node)) {
      focusNode(node);
      return;
    }
    var items = targets();
    if (!items.length) {
      on = false;
      focusId = "";
      return;
    }
    focusId = items[0].node.getAttribute("data-chrome-id") || "";
    focusNode(items[0].node);
  }

  function move(dir) {
    var items = targets();
    if (!items.length) {
      on = false;
      return;
    }
    var i;
    var at = 0;
    for (i = 0; i < items.length; i++) {
      if (items[i].node.getAttribute("data-chrome-id") === focusId) at = i;
    }
    var next = at + (dir === "left" ? -1 : 1);
    if (next < 0 || next >= items.length) return;
    focusId = items[next].node.getAttribute("data-chrome-id") || "";
    focusNode(items[next].node);
  }

  function leave() {
    on = false;
    focusId = "";
    var active = document.activeElement;
    if (active && active.blur && active.hasAttribute && active.hasAttribute("data-chrome-id")) active.blur();
  }

  function press() {
    if (!focusId) return;
    var node = document.querySelector('[data-chrome-id="' + focusId + '"]');
    if (node && node.click) node.click();
  }

  window.addEventListener("keydown", function (event) {
    if (!on) return;
    var act = KEYS[event.keyCode];
    if (!act) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (act === "left" || act === "right") move(act);
    else if (act === "down" || act === "back") leave();
    else if (act === "enter") press();
  }, true);

  window.SlopiumChrome = {
    active: function () { return on; },
    enter: enter,
    restored: restored
  };
})();
