/* CS 3350A practice page: nested text menu, problem rendering, answer checking.
   Problems come from generators.js. Each problem type keeps its own seed and typed answers
   (in sessionStorage), so switching topics and coming back restores the same problem. */
(function () {
  "use strict";

  var data = window.CS3350, P = window.CS3350_PRACTICE;
  var menu = document.getElementById("practice-menu");
  var titleEl = document.getElementById("problem-title");
  var cheatPop = document.getElementById("cheat-pop");
  var body = document.getElementById("problem-body");
  var panel = document.getElementById("problem-panel");
  var toggle = document.getElementById("menu-toggle");
  var toggleLabel = document.getElementById("menu-toggle-label");
  /* Phones: the menu is a drop-down opened by the ☰ button. */
  function setMenuOpen(open) {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  toggle.addEventListener("click", function () { setMenuOpen(!menu.classList.contains("is-open")); });
  var STORE_KEY = "cs3350-practice-v1";

  /* ---------- saved state ---------- */
  var store = { last: {}, items: {}, current: null };
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    if (saved && saved.items) store = saved;
  } catch (e) {}
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  function newSeed() { return (Math.random() * 4294967296) >>> 0; }
  function itemFor(key) {
    if (!store.items[key]) { store.items[key] = { seed: newSeed(), values: {}, checked: false, shown: false }; save(); }
    return store.items[key];
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function topicOf(slug) { var f = data.find(slug); return f ? f.topic : null; }
  function problemOf(topic, id) {
    for (var i = 0; i < topic.problems.length; i++) if (topic.problems[i].id === id) return topic.problems[i];
    return null;
  }
  var state = { topic: null, problem: null, gen: null, item: null };

  /* ---------- menu ---------- */
  /* Brightspace categories, each with its lecture subtopics; only the open subtopic lists its problems */
  function renderMenu() {
    var html = "<ol>";
    data.categories.forEach(function (cat, ci) {
      html += "<li class=\"menu-cat\"><span class=\"menu-cat-title\">" + esc(cat.title) + "</span><ol>";
      data.topics.forEach(function (t) {
        if (t.category !== ci) return;
        var active = t === state.topic;
        var target = store.last[t.slug] || t.problems[0].id;
        html += "<li class=\"menu-topic-item" + (active ? " is-open" : "") + "\">" +
          "<a class=\"menu-topic\" href=\"?t=" + t.slug + "&amp;p=" + target + "\" data-t=\"" + t.slug + "\" data-p=\"" + target + "\"" +
          (active ? " aria-expanded=\"true\"" : " aria-expanded=\"false\"") + ">" + esc(t.title) + "</a>";
        if (active) {
          html += "<ul>";
          t.problems.forEach(function (p) {
            var cur = p === state.problem;
            html += "<li><a class=\"menu-problem\" href=\"?t=" + t.slug + "&amp;p=" + p.id + "\" data-t=\"" + t.slug + "\" data-p=\"" + p.id + "\"" +
              (cur ? " aria-current=\"true\"" : "") + ">" + esc(p.title) + "</a></li>";
          });
          html += "</ul>";
        }
        html += "</li>";
      });
      html += "</ol></li>";
    });
    menu.innerHTML = html + "</ol>";
  }
  menu.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-t]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    var isTopic = a.classList.contains("menu-topic");
    select(a.getAttribute("data-t"), a.getAttribute("data-p"));
    if (!isTopic) setMenuOpen(false);
  });

  function select(slug, pid) {
    var t = topicOf(slug) || data.topics[0];
    var p = problemOf(t, pid) || problemOf(t, store.last[t.slug]) || t.problems[0];
    state.topic = t; state.problem = p;
    store.last[t.slug] = p.id;
    store.current = { t: t.slug, p: p.id };
    save();
    try { history.replaceState(null, "", "?t=" + t.slug + "&p=" + p.id); } catch (e) { /* browsers rate-limit this; the link is a convenience */ }
    renderMenu();
    renderProblem(false);
    toggleLabel.textContent = t.title + " › " + p.title;
    panel.scrollTop = 0;
  }

  /* ---------- problem ---------- */
  function defaultSize(f) { return f.size || (f.kind === "number" ? 9 : f.kind === "bits" && f.width === 1 ? 2 : 14); }
  /* width: a shared width (in ch) for every box in the answer grid; part: one cell of a composite field */
  function inputHtml(f, inline, width, part) {
    var id = "ans-" + f.id + (part ? "__" + part : ""), size = width || defaultSize(f);
    var label = inline ? " aria-label=\"" + esc((f.label || "Answer") + (part ? " " + part.replace("_", ", byte ") : "")) + "\"" : "";
    var data = " data-f=\"" + f.id + "\"" + (part ? " data-part=\"" + part + "\"" : "");
    var style = " style=\"width:" + (size + 2) + "ch\"";
    var ctl;
    if (f.kind === "choice") {
      ctl = "<select id=\"" + id + "\"" + data + label + (width ? style : "") + "><option value=\"\">—</option>" +
        f.options.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("") + "</select>";
    } else {
      ctl = "<input id=\"" + id + "\"" + data + " type=\"text\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\"" +
        (f.kind === "number" ? " inputmode=\"decimal\"" : f.kind === "bits" || f.kind === "set" || f.kind === "cacheset" ? " inputmode=\"numeric\"" : "") +
        style + label + ">";
    }
    if (part) return ctl;
    return "<span class=\"answer-cell\">" + ctl + (f.suffix ? " <span class=\"meta\">" + esc(f.suffix) + "</span>" : "") +
      "<span class=\"mark\" id=\"mark-" + f.id + "\" aria-hidden=\"true\"></span></span>";
  }
  function valueKey(el) { return el.getAttribute("data-f") + (el.getAttribute("data-part") ? "__" + el.getAttribute("data-part") : ""); }
  function inputsOf(f) { return body.querySelectorAll("[data-f=\"" + f.id + "\"]"); }
  /* What the student typed for a field: a string, or for a cache set one array of cells per line */
  function rawValue(f) {
    if (f.parts) return f.parts.map(function (pt) { var el = document.getElementById("ans-" + f.id + "__" + pt); return el ? el.value : ""; });
    if (f.kind !== "cacheset") { var el = document.getElementById("ans-" + f.id); return el ? el.value : ""; }
    var lines = [];
    for (var w = 0; w < f.ways; w++) {
      var cells = [];
      for (var b = 0; b < f.block; b++) { var c = document.getElementById("ans-" + f.id + "__" + w + "_" + b); cells.push(c ? c.value : ""); }
      lines.push(cells);
    }
    return lines;
  }

  function renderProblem(focus) {
    var key = state.topic.slug + "/" + state.problem.id;
    var item = state.item = itemFor(key);
    var gen = state.gen = P.generate(key, item.seed);
    titleEl.textContent = state.problem.title;
    setCheat(key);

    var byId = {}, placed = {};
    gen.fields.forEach(function (f) { byId[f.id] = f; });
    var html = "<div class=\"problem-grid\" id=\"problem-grid\"><div class=\"problem-work\"><div class=\"problem-prompt\">" + gen.prompt + "</div><form class=\"answer-form\" id=\"answer-form\" novalidate>";

    html += "<div class=\"answer-area\">";
    if (gen.table) {
      html += "<div class=\"table-wrap\"><table class=\"problem-table answer-table\"><thead><tr>" +
        gen.table.head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
        gen.table.rows.map(function (r, ri) {
          var groupStart = gen.table.groups > 1 && ri % gen.table.groups === 0 && ri > 0;
          return "<tr" + (groupStart ? " class=\"group-start\"" : "") + ">" + r.map(function (c) {
            if (c && typeof c === "object" && c.mark) return "<td class=\"mark-cell\"><span class=\"mark\" id=\"mark-" + c.mark + "\" aria-hidden=\"true\"></span></td>";
            if (c && typeof c === "object") { placed[c.f] = true; return "<td>" + inputHtml(byId[c.f], true, c.part ? defaultSize(byId[c.f]) : 0, c.part) + "</td>"; }
            return "<td>" + c + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }
    if (gen.code) {
      html += "<div class=\"problem-code code-blanks\">" + gen.code.map(function (line) {
        return "<div class=\"code-line\">" + line.map(function (s) {
          if (s && typeof s === "object") { placed[s.f] = true; return inputHtml(byId[s.f], true); }
          return esc(s);
        }).join("") + "</div>";
      }).join("") + "</div>";
    }
    var loose = gen.fields.filter(function (f) { return !placed[f.id]; });
    /* every box in the grid gets the same width, so the column looks even */
    var gridWidth = Math.min(30, Math.max.apply(null, [9].concat(loose.filter(function (f) { return !f.wide; }).map(function (f) {
      return f.kind === "choice" ? Math.max.apply(null, f.options.map(function (o) { return o.length; })) + 3 : defaultSize(f);
    }))));
    if (loose.length) {
      /* one shared grid, so every answer box lines up in the same column */
      html += "<div class=\"answer-grid\">" + loose.map(function (f) {
        return "<label class=\"" + (f.wide ? "is-wide" : "") + "\" for=\"ans-" + f.id + "\">" + esc(f.label) + "</label>" +
          "<div class=\"answer-slot" + (f.wide ? " is-wide" : "") + "\">" + inputHtml(f, false, f.wide ? 0 : gridWidth) + "</div>";
      }).join("") + "</div>";
    }
    html += "</div><div class=\"actions\">" +
      "<button class=\"button primary\" type=\"submit\">check answer</button>" +
      "<button class=\"button\" type=\"button\" id=\"new-problem\">new problem</button>" +
      "<button class=\"button\" type=\"button\" id=\"show-solution\">show solution</button>" +
      "</div></form><div class=\"feedback\" id=\"feedback\" role=\"status\" aria-live=\"polite\"></div></div>" +
      "<aside class=\"solution\" id=\"solution\" hidden></aside></div>";
    body.innerHTML = html;
    markUnits(body.querySelector(".problem-work"));

    // restore typed answers
    body.querySelectorAll("[data-f]").forEach(function (el) {
      var k = valueKey(el);
      if (item.values[k] !== undefined) el.value = item.values[k];
    });
    if (item.checked) check(true);
    if (item.shown) reveal();
    fitLayout();

    var form = document.getElementById("answer-form");
    form.addEventListener("submit", function (e) { e.preventDefault(); check(false); });
    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    form.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button[type=submit]")) lastPointer = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    document.getElementById("new-problem").addEventListener("click", function () {
      store.items[key] = { seed: newSeed(), values: {}, checked: false, shown: false };
      save();
      renderProblem(true);
    });
    document.getElementById("show-solution").addEventListener("click", function () {
      item.shown = true; item.scored = true; save(); reveal();
      document.getElementById("solution").scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    if (focus) {
      var first = body.querySelector("input, select");
      if (first) first.focus({ preventScroll: true });
    }
  }

  function onEdit(e) {
    var id = e.target.getAttribute("data-f");
    if (!id) return;
    state.item.values[valueKey(e.target)] = e.target.value;
    if (state.item.checked) {
      state.item.checked = false;
      document.getElementById("feedback").className = "feedback";
      document.getElementById("feedback").innerHTML = "";
    }
    inputsOf({ id: id }).forEach(function (el) { el.classList.remove("is-right", "is-wrong"); });
    var mark = document.getElementById("mark-" + id);
    if (mark) mark.textContent = "";
    save();
  }

  function check(quiet) {
    var gen = state.gen, right = 0, blank = 0, notes = [];
    gen.fields.forEach(function (f) {
      var res = P.check(f, rawValue(f));
      inputsOf(f).forEach(function (el) {
        el.classList.toggle("is-right", res.ok);
        el.classList.toggle("is-wrong", !res.ok);
        el.setAttribute("aria-invalid", res.ok ? "false" : "true");
      });
      var mk = document.getElementById("mark-" + f.id);
      if (mk) mk.textContent = res.ok ? "✓" : res.blank ? "" : "✗";
      if (res.ok) right++;
      if (res.blank) blank++;
      if (res.note && notes.indexOf(res.note) === -1) notes.push(res.note);
    });
    var n = gen.fields.length, fb = document.getElementById("feedback");
    state.item.checked = true;
    save();
    if (right === n) {
      /* first answer on this problem is right: +5 rings and the next rank */
      if (!quiet && !state.item.scored) {
        state.item.scored = true;
        store.streak = (store.streak || 0) + 1;
        store.rings = (store.rings || 0) + RING_GAIN;
        save();
        popRank(store.streak);
        collectRings(RING_GAIN);
      }
      fb.className = "feedback is-right";
      fb.innerHTML = "<strong>correct!</strong>";
      if (!quiet) { state.item.shown = true; save(); }
      reveal();
      if (!quiet) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    /* first answer on this problem has a wrong value in it: the streak resets and half the rings
       (rounded up) spill out. Blank boxes alone don't count as a miss. */
    if (!quiet && right + blank < n && !state.item.scored) {
      state.item.scored = true;
      var lost = Math.ceil((store.rings || 0) / 2);
      store.streak = 0;
      store.rings = (store.rings || 0) - lost;
      save();
      spillRings(lost);
      loseRings();
    }
    fb.className = "feedback is-wrong";
    var msg = "<strong>not quite.</strong> " + (n > 1 ? right + " of " + n + " correct." : "") +
      (blank ? " fill in every answer." : "");
    if (notes.length) msg += "<ul>" + notes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    fb.innerHTML = msg;
    fitLayout();
    if (!quiet) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function reveal() {
    var sol = document.getElementById("solution");
    sol.innerHTML = "<h4>solution</h4>" + state.gen.solution;
    markUnits(sol);
    sol.hidden = false;
    fitLayout();
  }

  /* ---------- fit the problem to the screen ----------
     Answer boxes go under the question. Only when the bare problem (no feedback, no solution) would
     need scrolling do they move beside the question ("split"), and that choice is made once, so the
     boxes never jump when the feedback or solution appears. The solution then goes beside the work
     ("has-solution") only when it does not fit below. Re-run after rendering, checking, revealing and
     resizing. */
  function overflowOf() {
    var grid = document.getElementById("problem-grid"), sideways = 0;
    grid.querySelectorAll(".problem-table, .problem-code, .table-wrap, .answer-grid, svg").forEach(function (e) {
      sideways = Math.max(sideways, e.scrollWidth - e.clientWidth, e.getBoundingClientRect().right - e.parentElement.getBoundingClientRect().right);
    });
    /* how far the student's own work (answers, buttons, feedback) runs below the visible panel */
    var work = grid.querySelector(".problem-work"), pr = panel.getBoundingClientRect();
    var workHidden = Math.max(0, work.getBoundingClientRect().bottom - (pr.bottom - 12));
    return { down: panel.scrollHeight - panel.clientHeight, sideways: sideways, workHidden: workHidden };
  }
  function badness(o) { return Math.max(0, o.down) + o.workHidden * 50 + (o.sideways > 2 ? 1e7 : 0); }
  function fitLayout() {
    var grid = document.getElementById("problem-grid");
    if (!grid) return;
    var work = grid.querySelector(".problem-work"), sol = document.getElementById("solution"), fb = document.getElementById("feedback");
    var canSplit = !!work.querySelector(".table-wrap, .code-blanks, .answer-grid") && !!work.querySelector(".problem-prompt :is(table, pre, svg)");
    var phone = window.innerWidth <= 640, keepTop = panel.scrollTop;
    panel.scrollTop = 0;
    grid.classList.remove("has-solution", "split");

    /* 1. split or not, judged on the bare problem */
    var split = false;
    if (canSplit && !phone) {
      var solHidden = sol.hidden, fbDisplay = fb.style.display;
      sol.hidden = true; fb.style.display = "none";
      var stacked = overflowOf();
      if (stacked.down > 0 || stacked.workHidden > 0) {
        grid.classList.add("split");
        split = badness(overflowOf()) < badness(stacked);
        grid.classList.remove("split");
      }
      sol.hidden = solHidden; fb.style.display = fbDisplay;
    }
    if (split) grid.classList.add("split");

    /* 2. the solution beside the work, or under it */
    if (!sol.hidden && !phone) {
      var below = badness(overflowOf());
      if (below > 0) {
        grid.classList.add("has-solution");
        if (badness(overflowOf()) >= below) grid.classList.remove("has-solution");
      }
    }
    panel.scrollTop = keepTop;
  }
  var fitTimer = null;
  window.addEventListener("resize", function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitLayout, 120); });

  /* ---------- units: hover (or tap) GHz, ns, ps, … to see what they stand for ---------- */
  var UNITS = {
    GHz: "gigahertz, 10⁹ cycles per second", MHz: "megahertz, 10⁶ cycles per second", kHz: "kilohertz, 10³ cycles per second",
    ms: "millisecond, 10⁻³ s", "μs": "microsecond, 10⁻⁶ s", "µs": "microsecond, 10⁻⁶ s", ns: "nanosecond, 10⁻⁹ s", ps: "picosecond, 10⁻¹² s"
  };
  var UNIT_NOTE = "know these units for the exam. the cheat sheet may not list them.";
  var UNIT_RE = /(^|[^A-Za-z0-9_$])(GHz|MHz|kHz|ms|μs|µs|ns|ps)(?![A-Za-z0-9_])/g;
  var unitTip = document.createElement("div");
  unitTip.className = "unit-tip";
  unitTip.setAttribute("role", "tooltip");
  unitTip.hidden = true;
  document.body.appendChild(unitTip);
  function markUnits(el) {
    if (!el) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.parentElement.closest("pre, code, select, option, .unit, .problem-code") ? NodeFilter.FILTER_REJECT :
          (UNIT_RE.lastIndex = 0, UNIT_RE.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var span = document.createElement("span");
      span.innerHTML = esc(n.nodeValue).replace(UNIT_RE, function (m, pre, u) {
        return pre + "<span class=\"unit\" tabindex=\"0\" data-unit=\"" + u + "\">" + u + "</span>";
      });
      while (span.firstChild) n.parentNode.insertBefore(span.firstChild, n);
      n.parentNode.removeChild(n);
    });
  }
  function showUnit(u) {
    unitTip.innerHTML = "<strong>" + esc(u.getAttribute("data-unit")) + "</strong> = " + esc(UNITS[u.getAttribute("data-unit")]) + "<span>" + UNIT_NOTE + "</span>";
    unitTip.hidden = false;
    var r = u.getBoundingClientRect(), w = unitTip.offsetWidth, h = unitTip.offsetHeight;
    unitTip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
    unitTip.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + "px";
  }
  function hideUnit() { unitTip.hidden = true; }
  body.addEventListener("mouseover", function (e) { var u = e.target.closest(".unit"); if (u) showUnit(u); });
  body.addEventListener("mouseout", function (e) { if (e.target.closest(".unit")) hideUnit(); });
  body.addEventListener("focusin", function (e) { var u = e.target.closest(".unit"); if (u) showUnit(u); });
  body.addEventListener("focusout", function (e) { if (e.target.closest(".unit")) hideUnit(); });
  panel.addEventListener("scroll", hideUnit);

  /* ---------- exam cheat sheet: the [Cheat Sheet] button beside the title ---------- */
  var CHEAT = window.CS3350_CHEAT || { sections: {}, map: {} }, cheatTimer = null, cheatPinned = false;
  var cheatBtn = document.getElementById("cheat-btn");
  function setCheat(key) {
    var ids = CHEAT.map[key] || [];
    hideCheat(true);
    cheatBtn.hidden = !ids.length;
    cheatPop.innerHTML = ids.map(function (id) {
      var s = CHEAT.sections[id];
      return "<img src=\"" + CHEAT.base + s.img + "\" width=\"" + Math.round(s.w / 2) + "\" height=\"" + Math.round(s.h / 2) +
        "\" alt=\"Exam cheat sheet: " + esc(s.title) + "\" loading=\"lazy\">";
    }).join("");
  }
  function showCheat() {
    if (cheatBtn.hidden) return;
    clearTimeout(cheatTimer);
    cheatPop.hidden = false;
    cheatBtn.setAttribute("aria-expanded", "true");
  }
  function hideCheat(now) {
    clearTimeout(cheatTimer);
    var close = function () { cheatPop.hidden = true; cheatPinned = false; cheatBtn.setAttribute("aria-expanded", "false"); };
    if (now === true) close(); else if (!cheatPinned) cheatTimer = setTimeout(close, 200);
  }
  cheatBtn.addEventListener("mouseenter", showCheat);
  cheatBtn.addEventListener("mouseleave", hideCheat);
  cheatPop.addEventListener("mouseenter", showCheat);
  cheatPop.addEventListener("mouseleave", hideCheat);
  cheatBtn.addEventListener("click", function () {
    if (cheatPinned) { hideCheat(true); return; }
    showCheat(); cheatPinned = true;
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideCheat(true); });
  document.addEventListener("pointerdown", function (e) {
    if (cheatPinned && !cheatPop.contains(e.target) && e.target !== cheatBtn) hideCheat(true);
  });

  /* ---------- wrong answer: a burst of gold rings scatters, bounces, and blinks out ---------- */
  function reducedMotion() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function spillRings(count) {
    if (!count || reducedMotion()) return;
    var x0, y0;
    if (lastPointer && Date.now() - lastPointer.t < 1500) { x0 = lastPointer.x; y0 = lastPointer.y; }
    else { var r = document.querySelector("#answer-form button[type=submit]").getBoundingClientRect(); x0 = r.left + r.width / 2; y0 = r.top + r.height / 2; }
    var layer = document.createElement("div"), rings = [], n = Math.min(count, 32), floor = Math.min(window.innerHeight - 16, y0 + 150);
    layer.className = "ring-layer";
    document.body.appendChild(layer);
    for (var i = 0; i < n; i++) {
      var el = document.createElement("span"), spin = document.createElement("span");
      el.className = "ring"; spin.className = "ring-spin";
      spin.style.animationDelay = (-Math.random() * 0.5) + "s";
      el.appendChild(spin); layer.appendChild(el);
      /* fan out over the upper half-circle, a little random */
      var a = Math.PI + (i + 0.5) / n * Math.PI + (Math.random() - 0.5) * 0.25, speed = 280 + Math.random() * 260;
      rings.push({ el: el, x: x0, y: y0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 120 });
    }
    var start = null, last = null, life = 1700;
    function frame(ts) {
      if (start === null) { start = ts; last = ts; }
      var dt = Math.min(0.05, (ts - last) / 1000), age = ts - start;
      last = ts;
      rings.forEach(function (g) {
        g.vy += 1500 * dt;
        g.x += g.vx * dt; g.y += g.vy * dt;
        if (g.y > floor && g.vy > 0) { g.y = floor; g.vy *= -0.55; g.vx *= 0.8; }
        g.el.style.transform = "translate(" + (g.x - 11) + "px," + (g.y - 11) + "px)";
        g.el.style.opacity = age > life - 650 ? (Math.floor(age / 55) % 2 ? 0 : 1) : 1;
      });
      if (age < life) requestAnimationFrame(frame); else layer.remove();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- ring counter (top right): +5 for a right answer, a miss loses half (rounded up) ---------- */
  var RING_GAIN = 5;
  var ringBox = document.getElementById("ring-count"), ringNum = document.getElementById("ring-num");
  var shownRings = store.rings || 0;
  function showRings(n) { shownRings = n; ringNum.textContent = n; }
  showRings(shownRings);
  function bump(cls) {
    ringBox.classList.remove("is-gain", "is-loss");
    void ringBox.offsetWidth;   /* restart the animation */
    ringBox.classList.add(cls);
  }
  function loseRings() { showRings(store.rings || 0); bump("is-loss"); }
  /* little rings fly from the button to the counter, which ticks up as each one lands */
  function collectRings(k) {
    var target = store.rings || 0;
    if (reducedMotion()) { showRings(target); bump("is-gain"); return; }
    var from = lastPointer && Date.now() - lastPointer.t < 1500 ? lastPointer :
      (function () { var r = document.querySelector("#answer-form button[type=submit]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; })();
    var to = ringBox.querySelector(".ring-icon").getBoundingClientRect(), tx = to.left + to.width / 2, ty = to.top + to.height / 2;
    var layer = document.createElement("div");
    layer.className = "ring-layer";
    document.body.appendChild(layer);
    var landed = 0;
    for (var i = 0; i < k; i++) (function (i) {
      var el = document.createElement("span"), spin = document.createElement("span");
      el.className = "ring is-small"; spin.className = "ring-spin";
      el.appendChild(spin); layer.appendChild(el);
      var sx = from.x + (i - (k - 1) / 2) * 18, sy = from.y - 6, start = null, dur = 620, delay = i * 70;
      var cx = (sx + tx) / 2 + (Math.random() - 0.5) * 120, cy = Math.min(sy, ty) - 80 - Math.random() * 60;
      el.style.transform = "translate(" + (sx - 8) + "px," + (sy - 8) + "px)";
      function frame(ts) {
        if (start === null) start = ts + delay;
        var u = Math.max(0, Math.min(1, (ts - start) / dur)), e = u * u * (3 - 2 * u);
        var x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * tx, y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ty;
        el.style.transform = "translate(" + (x - 8) + "px," + (y - 8) + "px)";
        if (u < 1) { requestAnimationFrame(frame); return; }
        el.remove();
        landed++;
        showRings(Math.min(target, shownRings + 1));
        bump("is-gain");
        if (landed === k) { showRings(target); layer.remove(); }
      }
      requestAnimationFrame(frame);
    })(i);
  }

  /* ---------- streak ranks: each right answer in a row pops the next rank ---------- */
  var RANKS = ["0-good", "1-nice", "2-jammin", "3-radical", "4-tight", "5-awesome", "6-extreme", "7-perfect"];
  var RANK_WORDS = ["Good!", "Nice!", "Jammin'!", "Radical!", "Tight!", "Awesome!", "Extreme!", "Perfect!"];
  RANKS.forEach(function (r) { var img = new Image(); img.src = "../../../images/ranks/" + r + ".png"; });
  var lastPointer = null;
  function popRank(streak) {
    var k = Math.min(streak, RANKS.length) - 1, x, y;
    if (lastPointer && Date.now() - lastPointer.t < 1500) { x = lastPointer.x; y = lastPointer.y; }
    else {
      var btn = document.querySelector("#answer-form button[type=submit]").getBoundingClientRect();
      x = btn.left + btn.width / 2; y = btn.top;
    }
    var img = document.createElement("img");
    img.className = "rank-pop" + (k === RANKS.length - 1 ? " is-max" : "");
    img.src = "../../../images/ranks/" + RANKS[k] + ".png";
    img.alt = RANK_WORDS[k];
    img.style.left = Math.max(120, Math.min(window.innerWidth - 120, x)) + "px";
    img.style.top = Math.max(70, y - 12) + "px";
    document.body.appendChild(img);
    img.addEventListener("animationend", function () { img.remove(); });
  }

  /* ---------- start ---------- */
  var params = new URLSearchParams(location.search);
  var startT = params.get("t") || (store.current && store.current.t);
  var startP = params.get("p") || (store.current && store.current.t === startT ? store.current.p : null);
  select(startT, startP);
})();
