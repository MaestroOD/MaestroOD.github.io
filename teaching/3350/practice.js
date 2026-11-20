/* CS 3350A practice problems.

   A generator returns a fresh problem:
     {
       prompt:   HTML string shown to the student,
       fields:   [{ id, label, kind: "number", answer, tolerance, suffix? }
                  | { id, label, kind: "text", accept: [strings...] }],
       solution: HTML string shown after checking (or on "Show solution")
     }
   Register generators in GENERATORS under "topicSlug/problemId". Problem types without a
   generator show a "coming soon" placeholder. Generators must build new problems from
   random parameters: this file is public, so it must never contain questions copied
   from course quizzes or exams. */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function round(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }
  function fmt(x, d) { return String(round(x, d)); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  /* Split 100% into k parts, each a positive multiple of `step`. */
  function randomPercentages(k, step) {
    var units = 100 / step, parts = [];
    for (var i = 0; i < k; i++) parts.push(1);
    for (var left = units - k; left > 0; left--) parts[randInt(0, k - 1)]++;
    return parts.map(function (u) { return u * step; });
  }

  /* ---------- generators ---------- */
  var GENERATORS = {
    "performance/effective-cpi": function () {
      var classes = ["ALU", "Load", "Store", "Branch"];
      var freq = randomPercentages(4, 5);
      var cpi = classes.map(function () { return randInt(1, 6); });
      var total = 0, terms = [];
      for (var i = 0; i < 4; i++) {
        total += (freq[i] / 100) * cpi[i];
        terms.push(cpi[i] + " × " + fmt(freq[i] / 100, 2));
      }
      var rows = classes.map(function (c, i) {
        return "<tr><td>" + c + "</td><td>" + freq[i] + "%</td><td>" + cpi[i] + "</td></tr>";
      }).join("");
      return {
        prompt:
          "<p>A program runs on a processor with the instruction mix below. Each instruction class " +
          "has the given relative frequency and number of clock cycles per instruction.</p>" +
          "<table class=\"problem-table\"><thead><tr><th>Class</th><th>Frequency</th><th>CPI</th></tr></thead>" +
          "<tbody>" + rows + "</tbody></table>" +
          "<p>What is the effective CPI of the program? Give your answer to two decimal places.</p>",
        fields: [{ id: "cpi", label: "Effective CPI", kind: "number", answer: round(total, 2), tolerance: 0.005 }],
        solution:
          "<p>Effective CPI is the frequency-weighted average of the CPIs:</p>" +
          "<p class=\"work\">CPI = " + terms.join(" + ") + " = <strong>" + fmt(total, 2) + "</strong></p>"
      };
    }
  };

  /* ---------- page wiring ---------- */
  var data = window.CS3350;
  var topicGroup = document.getElementById("topic-choices");
  var problemGroup = document.getElementById("problem-choices");
  var panel = document.getElementById("problem-panel");
  var state = { topic: null, problem: null, current: null };

  function chip(name, value, label, checked, onChange) {
    var wrap = document.createElement("label");
    wrap.className = "chip";
    var input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.checked = !!checked;
    input.addEventListener("change", onChange);
    var span = document.createElement("span");
    span.textContent = label;
    wrap.appendChild(input);
    wrap.appendChild(span);
    return wrap;
  }

  function updateUrl() {
    var q = "?t=" + state.topic.slug + (state.problem ? "&p=" + state.problem.id : "");
    history.replaceState(null, "", q);
  }

  var topicSelect = document.getElementById("topic-select");
  topicSelect.addEventListener("change", function () {
    selectTopic(data.find(topicSelect.value).topic, null);
  });

  function renderTopics() {
    topicSelect.innerHTML = "";
    data.topics.forEach(function (t, i) {
      var o = document.createElement("option");
      o.value = t.slug;
      o.textContent = (i + 1) + ". " + t.title;
      topicSelect.appendChild(o);
    });
    topicGroup.innerHTML = "";
    data.topics.forEach(function (t, i) {
      topicGroup.appendChild(chip("topic", t.slug, (i + 1) + ". " + t.title, t === state.topic, function () {
        selectTopic(t, null);
      }));
    });
  }

  function renderProblems() {
    problemGroup.innerHTML = "";
    state.topic.problems.forEach(function (p) {
      var label = p.title + (p.ready ? "" : " (soon)");
      problemGroup.appendChild(chip("problem", p.id, label, p === state.problem, function () {
        selectProblem(p);
      }));
    });
    document.getElementById("topic-link").href = "../topic/?t=" + state.topic.slug;
    document.getElementById("topic-link").textContent = "Read the " + state.topic.title + " summary";
  }

  function selectTopic(t, p) {
    state.topic = t;
    topicSelect.value = t.slug;
    var radios = topicGroup.querySelectorAll("input");
    for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === t.slug;
    state.problem = p || t.problems[0];
    renderProblems();
    renderPanel();
    updateUrl();
  }

  function selectProblem(p) {
    state.problem = p;
    renderPanel();
    updateUrl();
  }

  function renderPanel() {
    var p = state.problem;
    var gen = GENERATORS[state.topic.slug + "/" + p.id];
    document.getElementById("problem-title").textContent = p.title;
    var body = document.getElementById("problem-body");

    if (!gen) {
      state.current = null;
      body.innerHTML =
        "<div class=\"placeholder-box\"><p><strong>Coming soon.</strong> A generator for this problem type " +
        "is in progress. In the meantime, try <a href=\"?t=performance&amp;p=effective-cpi\">Effective CPI</a>.</p></div>";
      return;
    }

    var prob = state.current = gen();
    var html = "<div class=\"problem-prompt\">" + prob.prompt + "</div><form class=\"answer-form\" id=\"answer-form\" novalidate>";
    prob.fields.forEach(function (f) {
      html +=
        "<div class=\"answer-row\"><label for=\"ans-" + f.id + "\">" + esc(f.label) + "</label>" +
        "<input id=\"ans-" + f.id + "\" name=\"" + f.id + "\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\"" +
        (f.kind === "number" ? " inputmode=\"decimal\"" : "") + ">" +
        (f.suffix ? "<span class=\"meta\">" + esc(f.suffix) + "</span>" : "") +
        "<span class=\"mark\" id=\"mark-" + f.id + "\" aria-hidden=\"true\"></span></div>";
    });
    html +=
      "<div class=\"actions\">" +
      "<button class=\"button primary\" type=\"submit\">Check answer</button>" +
      "<button class=\"button\" type=\"button\" id=\"new-problem\">New problem</button>" +
      "<button class=\"button\" type=\"button\" id=\"show-solution\">Show solution</button>" +
      "</div></form>" +
      "<div class=\"feedback\" id=\"feedback\" role=\"status\" aria-live=\"polite\"></div>" +
      "<div class=\"solution\" id=\"solution\" hidden></div>";
    body.innerHTML = html;

    document.getElementById("answer-form").addEventListener("submit", function (e) {
      e.preventDefault();
      check();
    });
    document.getElementById("new-problem").addEventListener("click", renderPanel);
    document.getElementById("show-solution").addEventListener("click", function () { reveal(); });
    var first = body.querySelector("input");
    if (first) first.focus({ preventScroll: true });
  }

  function parseNumber(s) {
    s = String(s).trim().replace(/,/g, "");
    if (s === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }
  function normalize(s) { return String(s).trim().toLowerCase().replace(/\s+/g, " "); }

  function check() {
    var prob = state.current;
    if (!prob) return;
    var allRight = true, anyBlank = false;
    prob.fields.forEach(function (f) {
      var input = document.getElementById("ans-" + f.id);
      var mark = document.getElementById("mark-" + f.id);
      var raw = input.value;
      var ok;
      if (raw.trim() === "") { anyBlank = true; ok = false; }
      else if (f.kind === "number") {
        var v = parseNumber(raw);
        ok = !isNaN(v) && Math.abs(v - f.answer) <= (f.tolerance || 0);
      } else {
        ok = f.accept.map(normalize).indexOf(normalize(raw)) !== -1;
      }
      input.classList.toggle("is-right", ok);
      input.classList.toggle("is-wrong", !ok);
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      mark.textContent = ok ? "✓" : "✗";
      if (!ok) allRight = false;
    });

    var fb = document.getElementById("feedback");
    fb.className = "feedback " + (allRight ? "is-right" : "is-wrong");
    if (allRight) {
      fb.innerHTML = "<strong>Correct!</strong> Try a new problem, or read the worked solution below.";
      reveal();
    } else if (anyBlank) {
      fb.innerHTML = "<strong>Not quite.</strong> Fill in every answer box, then check again.";
    } else {
      fb.innerHTML = "<strong>Not quite.</strong> Have another go, or use “Show solution” to see the working.";
    }
  }

  function reveal() {
    var sol = document.getElementById("solution");
    if (!sol || !state.current) return;
    sol.innerHTML = "<h4>Solution</h4>" + state.current.solution;
    sol.hidden = false;
  }

  /* ---------- start ---------- */
  var params = new URLSearchParams(location.search);
  var found = data.find(params.get("t"));
  var topic = found ? found.topic : data.topics[0];
  var problem = null;
  topic.problems.forEach(function (p) { if (p.id === params.get("p")) problem = p; });
  state.topic = topic;
  renderTopics();
  selectTopic(topic, problem);
})();
