/* CS 3350A practice page: nested text menu, problem rendering, answer checking.
   Problems come from generators.js. Each problem type keeps its own seed and typed answers
   (in sessionStorage), so switching topics and coming back restores the same problem. */
(function () {
  "use strict";

  var data = window.CS3350, P = window.CS3350_PRACTICE;
  var menu = document.getElementById("practice-menu");
  var titleEl = document.getElementById("problem-title");
  var crumbEl = document.getElementById("problem-topic");
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
  function renderMenu() {
    var html = "<ol>";
    data.topics.forEach(function (t, i) {
      var active = t === state.topic;
      var target = store.last[t.slug] || t.problems[0].id;
      html += "<li class=\"menu-topic-item" + (active ? " is-open" : "") + "\">" +
        "<a class=\"menu-topic\" href=\"?t=" + t.slug + "&amp;p=" + target + "\" data-t=\"" + t.slug + "\" data-p=\"" + target + "\"" +
        (active ? " aria-expanded=\"true\"" : " aria-expanded=\"false\"") + ">" +
        "<span class=\"menu-num\">" + String(i + 1).padStart(2, "0") + "</span> " + esc(t.title) + "</a>";
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
    history.replaceState(null, "", "?t=" + t.slug + "&p=" + p.id);
    renderMenu();
    renderProblem(false);
    toggleLabel.textContent = t.title + " › " + p.title;
    panel.scrollTop = 0;
  }

  /* ---------- problem ---------- */
  function inputHtml(f, inline) {
    var id = "ans-" + f.id, size = f.size || (f.kind === "number" ? 9 : f.kind === "bits" && f.width === 1 ? 2 : 14);
    var label = inline ? " aria-label=\"" + esc(f.label || "Answer") + "\"" : "";
    var ctl;
    if (f.kind === "choice") {
      ctl = "<select id=\"" + id + "\" data-f=\"" + f.id + "\"" + label + "><option value=\"\">—</option>" +
        f.options.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("") + "</select>";
    } else {
      ctl = "<input id=\"" + id + "\" data-f=\"" + f.id + "\" type=\"text\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\"" +
        (f.kind === "number" ? " inputmode=\"decimal\"" : f.kind === "bits" || f.kind === "set" ? " inputmode=\"numeric\"" : "") +
        " style=\"width:" + (size + 2) + "ch\"" + label + ">";
    }
    return "<span class=\"answer-cell\">" + ctl + (f.suffix ? " <span class=\"meta\">" + esc(f.suffix) + "</span>" : "") +
      "<span class=\"mark\" id=\"mark-" + f.id + "\" aria-hidden=\"true\"></span></span>";
  }

  function renderProblem(focus) {
    var key = state.topic.slug + "/" + state.problem.id;
    var item = state.item = itemFor(key);
    var gen = state.gen = P.generate(key, item.seed);
    titleEl.textContent = state.problem.title;
    crumbEl.innerHTML = "<a href=\"../topic/?t=" + state.topic.slug + "\">" + esc(state.topic.title) + "</a>";

    var byId = {}, placed = {};
    gen.fields.forEach(function (f) { byId[f.id] = f; });
    var html = "<div class=\"problem-grid\" id=\"problem-grid\"><div class=\"problem-work\"><div class=\"problem-prompt\">" + gen.prompt + "</div><form class=\"answer-form\" id=\"answer-form\" novalidate>";

    html += "<div class=\"answer-area\">";
    if (gen.table) {
      html += "<div class=\"table-wrap\"><table class=\"problem-table answer-table\"><thead><tr>" +
        gen.table.head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" +
        gen.table.rows.map(function (r) {
          return "<tr>" + r.map(function (c) {
            if (c && typeof c === "object") { placed[c.f] = true; return "<td>" + inputHtml(byId[c.f], true) + "</td>"; }
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
    if (loose.length) {
      /* one shared grid, so every answer box lines up in the same column */
      html += "<div class=\"answer-grid\">" + loose.map(function (f) {
        return "<label class=\"" + (f.wide ? "is-wide" : "") + "\" for=\"ans-" + f.id + "\">" + esc(f.label) + "</label>" +
          "<div class=\"answer-slot" + (f.wide ? " is-wide" : "") + "\">" + inputHtml(f, false) + "</div>";
      }).join("") + "</div>";
    }
    html += "</div><div class=\"actions\">" +
      "<button class=\"button primary\" type=\"submit\">Check answer</button>" +
      "<button class=\"button\" type=\"button\" id=\"new-problem\">New problem</button>" +
      "<button class=\"button\" type=\"button\" id=\"show-solution\">Show solution</button>" +
      "</div></form><div class=\"feedback\" id=\"feedback\" role=\"status\" aria-live=\"polite\"></div></div>" +
      "<aside class=\"solution\" id=\"solution\" hidden></aside></div>";
    body.innerHTML = html;

    // restore typed answers
    gen.fields.forEach(function (f) {
      var el = document.getElementById("ans-" + f.id);
      if (el && item.values[f.id] !== undefined) el.value = item.values[f.id];
    });
    if (item.checked) check(true);
    if (item.shown) reveal();

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
      item.shown = true; save(); reveal();
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
    state.item.values[id] = e.target.value;
    if (state.item.checked) {
      state.item.checked = false;
      document.getElementById("feedback").className = "feedback";
      document.getElementById("feedback").innerHTML = "";
    }
    e.target.classList.remove("is-right", "is-wrong");
    var mark = document.getElementById("mark-" + id);
    if (mark) mark.textContent = "";
    save();
  }

  function check(quiet) {
    var gen = state.gen, right = 0, blank = 0, notes = [];
    gen.fields.forEach(function (f) {
      var el = document.getElementById("ans-" + f.id);
      var res = P.check(f, el.value);
      el.classList.toggle("is-right", res.ok);
      el.classList.toggle("is-wrong", !res.ok);
      el.setAttribute("aria-invalid", res.ok ? "false" : "true");
      document.getElementById("mark-" + f.id).textContent = res.ok ? "✓" : res.blank ? "" : "✗";
      if (res.ok) right++;
      if (res.blank) blank++;
      if (res.note && notes.indexOf(res.note) === -1) notes.push(res.note);
    });
    var n = gen.fields.length, fb = document.getElementById("feedback");
    state.item.checked = true;
    save();
    if (right === n) {
      if (!quiet && !state.item.scored) {
        state.item.scored = true;
        store.streak = (store.streak || 0) + 1;
        save();
        popRank(store.streak);
      }
      fb.className = "feedback is-right";
      fb.innerHTML = "<strong>Correct!</strong>";
      if (!quiet) { state.item.shown = true; save(); }
      reveal();
      if (!quiet) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (!quiet && !blank && !state.item.scored) { store.streak = 0; save(); }
    fb.className = "feedback is-wrong";
    var msg = "<strong>Not quite.</strong> " + (n > 1 ? right + " of " + n + " correct." : "") +
      (blank ? " Fill in every answer." : "");
    if (notes.length) msg += "<ul>" + notes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
    fb.innerHTML = msg;
    if (!quiet) fb.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function reveal() {
    var sol = document.getElementById("solution");
    sol.innerHTML = "<h4>Solution</h4>" + state.gen.solution;
    sol.hidden = false;
    /* wide answer tables need the full width, so their solution goes underneath instead */
    if (!(state.gen.table && state.gen.table.head.length >= 5)) document.getElementById("problem-grid").classList.add("has-solution");
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
