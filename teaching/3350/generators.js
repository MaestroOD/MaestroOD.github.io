/* CS 3350A practice problem generators and answer checkers.

   Every generator is a pure function of a seeded random source, so a problem can be
   rebuilt exactly from its seed (that is how the practice page keeps your problem and
   answers when you switch topics). This file is public: generators must build new
   problems from random parameters and never contain questions copied from course
   quizzes or exams.

   A generator returns:
     prompt   HTML shown above the answers
     table    optional { head: [...], rows: [[cell, ...]] }; a cell is HTML or { f: fieldId }
     code     optional [[segment, ...], ...]; a segment is text or { f: fieldId }
     fields   [{ id, label, kind, ... }]; kinds and their options are in CHECKERS below
     solution HTML shown after checking or on "Show solution"
*/
(function (root) {
  "use strict";

  /* ---------- seeded randomness ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function Rng(seed) {
    var r = mulberry32(seed);
    return {
      f: r,
      int: function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); },
      pick: function (a) { return a[Math.floor(r() * a.length)]; },
      chance: function (p) { return r() < p; },
      shuffle: function (a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      }
    };
  }

  /* ---------- formatting helpers ---------- */
  function round(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }
  function fmt(x, d) { return String(round(x, d === undefined ? 2 : d)); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function code(s) { return "<code>" + esc(s) + "</code>"; }
  function pre(lines) { return "<pre class=\"problem-code\">" + esc(lines.join("\n")) + "</pre>"; }
  function table(head, rows) {
    return "<table class=\"problem-table\"><thead><tr>" + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }
  function bin(n, w) { var s = (n >>> 0).toString(2); while (s.length < w) s = "0" + s; return s.slice(-w); }
  function hex(n, w) { var s = (n >>> 0).toString(16).toUpperCase(); while (s.length < w) s = "0" + s; return "0x" + s; }
  function p(s) { return "<p>" + s + "</p>"; }
  function ul(items) { return "<ul>" + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>"; }
  function percentSplit(R, k, step) {
    var parts = [], i;
    for (i = 0; i < k; i++) parts.push(1);
    for (var left = 100 / step - k; left > 0; left--) parts[R.int(0, k - 1)]++;
    return parts.map(function (u) { return u * step; });
  }

  /* ---------- MIPS tables ---------- */
  var REGS = ["$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
    "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
    "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
    "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra"];
  var USER_REGS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  var MIPS = {
    add: { fmt: "R3", funct: 0x20 }, sub: { fmt: "R3", funct: 0x22 }, and: { fmt: "R3", funct: 0x24 },
    or: { fmt: "R3", funct: 0x25 }, slt: { fmt: "R3", funct: 0x2a },
    sll: { fmt: "SH", funct: 0x00 }, srl: { fmt: "SH", funct: 0x02 },
    addi: { fmt: "I", op: 0x08, signed: true }, andi: { fmt: "I", op: 0x0c }, ori: { fmt: "I", op: 0x0d },
    lw: { fmt: "M", op: 0x23 }, sw: { fmt: "M", op: 0x2b }
  };
  var MNEMONICS = Object.keys(MIPS);

  function randomInstr(R) {
    var m = R.pick(MNEMONICS), f = MIPS[m], i = { m: m };
    var reg = function () { return R.pick(USER_REGS); };
    if (f.fmt === "R3") { i.rd = reg(); i.rs = reg(); i.rt = reg(); i.shamt = 0; }
    else if (f.fmt === "SH") { i.rd = reg(); i.rs = 0; i.rt = reg(); i.shamt = R.int(1, 31); }
    else if (f.fmt === "I") { i.rt = reg(); i.rs = reg(); i.imm = f.signed ? R.int(-200, 200) : R.int(0, 0xff); }
    else { i.rt = reg(); i.rs = R.pick([16, 17, 18, 19, 29, 4, 5]); i.imm = 4 * R.int(-8, 16); }
    return i;
  }
  function asm(i) {
    var f = MIPS[i.m].fmt;
    if (f === "R3") return i.m + " " + REGS[i.rd] + ", " + REGS[i.rs] + ", " + REGS[i.rt];
    if (f === "SH") return i.m + " " + REGS[i.rd] + ", " + REGS[i.rt] + ", " + i.shamt;
    if (f === "I") return i.m + " " + REGS[i.rt] + ", " + REGS[i.rs] + ", " + i.imm;
    return i.m + " " + REGS[i.rt] + ", " + i.imm + "(" + REGS[i.rs] + ")";
  }
  function encode(i) {
    var f = MIPS[i.m];
    if (f.fmt === "R3" || f.fmt === "SH") {
      return ((0 << 26) | (i.rs << 21) | (i.rt << 16) | (i.rd << 11) | (i.shamt << 6) | f.funct) >>> 0;
    }
    return ((f.op << 26) | (i.rs << 21) | (i.rt << 16) | (i.imm & 0xffff)) >>> 0;
  }
  function fieldBreakdown(i) {
    var f = MIPS[i.m];
    if (f.fmt === "R3" || f.fmt === "SH") {
      return table(["op", "rs", "rt", "rd", "shamt", "funct"], [
        ["0", i.rs, i.rt, i.rd, i.shamt, f.funct],
        [bin(0, 6), bin(i.rs, 5), bin(i.rt, 5), bin(i.rd, 5), bin(i.shamt, 5), bin(f.funct, 6)]
      ]);
    }
    return table(["op", "rs", "rt", "immediate"], [
      [f.op, i.rs, i.rt, i.imm],
      [bin(f.op, 6), bin(i.rs, 5), bin(i.rt, 5), bin(i.imm & 0xffff, 16)]
    ]);
  }

  /* ---------- Boolean expressions (parser shared with the checker) ---------- */
  function parseBool(src, vars) {
    var s = src.replace(/[·*&∧]/g, "*").replace(/[∨|]/g, "+").replace(/[¬!~]/g, "!").replace(/[’′]/g, "'");
    var pos = 0, literals = 0;
    function peek() { while (s[pos] === " ") pos++; return s[pos]; }
    function expr() {
      var node = term();
      while (peek() === "+") { pos++; node = { op: "or", a: node, b: term() }; }
      return node;
    }
    function startsFactor(c) { return c !== undefined && (vars.indexOf(c) !== -1 || c === "(" || c === "!" || c === "0" || c === "1"); }
    function term() {
      var node = factor();
      for (;;) {
        var c = peek();
        if (c === "*") { pos++; node = { op: "and", a: node, b: factor() }; }
        else if (startsFactor(c)) node = { op: "and", a: node, b: factor() };
        else return node;
      }
    }
    function factor() {
      var c = peek(), node;
      if (c === "!") { pos++; return { op: "not", a: factor() }; }
      if (c === "(") { pos++; node = expr(); if (peek() !== ")") throw new Error("missing )"); pos++; }
      else if (c === "0" || c === "1") { pos++; node = { op: "const", v: c === "1" }; }
      else if (c !== undefined && vars.indexOf(c) !== -1) { pos++; literals++; node = { op: "var", v: c }; }
      else throw new Error("unexpected " + (c === undefined ? "end" : c));
      while (peek() === "'") { pos++; node = { op: "not", a: node }; }
      return node;
    }
    var tree = expr();
    if (peek() !== undefined) throw new Error("unexpected " + peek());
    return { tree: tree, literals: literals };
  }
  function evalBool(n, env) {
    switch (n.op) {
      case "or": return evalBool(n.a, env) || evalBool(n.b, env);
      case "and": return evalBool(n.a, env) && evalBool(n.b, env);
      case "not": return !evalBool(n.a, env);
      case "const": return n.v;
      default: return env[n.v];
    }
  }
  function truthTable(tree, vars) {
    var out = [];
    for (var m = 0; m < (1 << vars.length); m++) {
      var env = {};
      vars.forEach(function (v, k) { env[v] = !!((m >> (vars.length - 1 - k)) & 1); });
      out.push(evalBool(tree, env) ? 1 : 0);
    }
    return out;
  }
  /* Rename and optionally complement variables in an expression string (single-letter vars). */
  function remapExpr(src, map) {
    var out = "";
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (map[c]) {
        var neg = map[c].neg, v = map[c].to;
        if (src[i + 1] === "'") { neg = !neg; i++; }
        out += v + (neg ? "'" : "");
      } else out += c;
    }
    return out;
  }
  function randomRemap(R, vars) {
    var perm = R.shuffle(vars), map = {};
    vars.forEach(function (v, k) { map[v] = { to: perm[k], neg: R.chance(0.35) }; });
    return map;
  }
  function minterms(tt) { var a = []; tt.forEach(function (v, i) { if (v) a.push(i); }); return a; }
  function mintermText(m, vars) {
    return vars.map(function (v, k) { return v + (((m >> (vars.length - 1 - k)) & 1) ? "" : "'"); }).join("");
  }

  /* ---------- simulators (also exported for tests) ---------- */
  function simulateCache(cfg, addrs) {
    var sets = [], steps = [];
    for (var s = 0; s < cfg.sets; s++) sets.push([]);
    addrs.forEach(function (a) {
      var block = Math.floor(a / cfg.block), set = block % cfg.sets, start = block * cfg.block;
      var lines = sets[set], k = lines.indexOf(start), hit = k !== -1;
      if (hit) lines.splice(k, 1);
      lines.unshift(start);
      if (lines.length > cfg.ways) lines.pop();
      steps.push({ addr: a, set: set, start: start, hit: hit });
    });
    return { steps: steps, sets: sets };
  }
  function classifyMisses(lines, blocks) {
    var dm = [], fa = [], seen = {}, out = [];
    for (var i = 0; i < lines; i++) dm.push(null);
    blocks.forEach(function (b) {
      var set = b % lines, hit = dm[set] === b, faHit = fa.indexOf(b) !== -1, kind;
      if (hit) kind = "hit";
      else if (!seen[b]) kind = "cold miss";
      else kind = faHit ? "conflict miss" : "capacity miss";
      dm[set] = b; seen[b] = true;
      if (faHit) fa.splice(fa.indexOf(b), 1);
      fa.unshift(b);
      if (fa.length > lines) fa.pop();
      out.push(kind);
    });
    return out;
  }
  function simulateMesi(reqs) {
    var st = ["-", "-", "-"], rows = [];
    reqs.forEach(function (r) {
      var me = r.p, others = [0, 1, 2].filter(function (q) { return q !== me; });
      var holders = others.filter(function (q) { return st[q] === "M" || st[q] === "E" || st[q] === "S"; });
      var mine = st[me], has = mine === "M" || mine === "E" || mine === "S", supplier, hit = has;
      if (has) supplier = "-";
      else if (!holders.length) supplier = "Memory";
      else supplier = holders.map(function (q) { return "P" + (q + 1); }).join(" or ");
      if (r.op === "R") {
        if (!has) {
          if (!holders.length) st[me] = "E";
          else { st[me] = "S"; holders.forEach(function (q) { st[q] = "S"; }); }
        }
      } else {
        st[me] = "M";
        holders.forEach(function (q) { st[q] = "I"; });
      }
      rows.push({ req: r, states: st.slice(), supplier: supplier, hit: hit });
    });
    return rows;
  }
  function classifySharing(steps) {
    var has = [false, false], valid = [false, false], written = [{}, {}], out = [];
    steps.forEach(function (s) {
      var me = s.p, other = 1 - me, kind;
      if (valid[me]) kind = "hit";
      else if (!has[me]) kind = "cold miss";
      else kind = written[me][s.w] ? "true sharing miss" : "false sharing miss";
      if (kind !== "hit") { valid[me] = true; has[me] = true; written[me] = {}; }
      if (s.op === "W") {
        if (valid[other]) { valid[other] = false; written[other] = {}; written[other][s.w] = true; }
        else if (has[other]) written[other][s.w] = true;
      }
      out.push(kind);
    });
    return out;
  }
  /* Dependencies between instructions given as { dst: reg|null, src: [regs] }. */
  function findDependencies(ins) {
    var deps = [];
    for (var j = 0; j < ins.length; j++) {
      for (var i = j - 1; i >= 0; i--) {
        var between = ins.slice(i + 1, j);
        var cleanWrite = function (r) { return !between.some(function (k) { return k.dst === r; }); };
        if (ins[i].dst && ins[j].src.indexOf(ins[i].dst) !== -1 && cleanWrite(ins[i].dst)) deps.push({ type: "RAW", reg: ins[i].dst, from: i, to: j });
        if (ins[j].dst && ins[i].src.indexOf(ins[j].dst) !== -1 && cleanWrite(ins[j].dst)) deps.push({ type: "WAR", reg: ins[j].dst, from: i, to: j });
        if (ins[j].dst && ins[i].dst === ins[j].dst && cleanWrite(ins[j].dst)) deps.push({ type: "WAW", reg: ins[j].dst, from: i, to: j });
      }
    }
    deps.sort(function (a, b) { return a.from - b.from || a.to - b.to; });
    return deps;
  }
  /* Classic 5-stage pipeline. D = cycle the instruction is in ID. Register file writes in the
     first half of a cycle and reads in the second half. Forwarding feeds EX only. */
  function pipelineStalls(ins, forwarding) {
    var D = [], lastWriter = {};
    for (var i = 0; i < ins.length; i++) {
      var d = i === 0 ? 1 : D[i - 1] + 1;
      ins[i].src.forEach(function (r) {
        var j = lastWriter[r];
        if (j === undefined) return;
        var need = !forwarding ? D[j] + 3 : (ins[j].load ? D[j] + 2 : D[j] + 1);
        if (need > d) d = need;
      });
      D.push(d);
      if (ins[i].dst) lastWriter[ins[i].dst] = i;
    }
    var stalls = D[D.length - 1] - (1 + ins.length - 1);
    return { stalls: stalls, cycles: 5 + ins.length - 1 + stalls, D: D };
  }
  function minSchedule(preds, width) {
    var n = preds.length, full = (1 << n) - 1, dist = {}, queue = [0];
    dist[0] = 0;
    while (queue.length) {
      var s = queue.shift();
      if (s === full) return dist[s];
      var ready = [];
      for (var i = 0; i < n; i++) {
        if (s & (1 << i)) continue;
        if (preds[i].every(function (q) { return s & (1 << q); })) ready.push(i);
      }
      var k = Math.min(width, ready.length);
      combos(ready, k).forEach(function (c) {
        var t = s; c.forEach(function (i) { t |= 1 << i; });
        if (dist[t] === undefined) { dist[t] = dist[s] + 1; queue.push(t); }
      });
    }
    return Infinity;
  }
  function combos(a, k) {
    if (k === 0) return [[]];
    if (a.length < k) return [];
    var first = a[0], rest = a.slice(1);
    return combos(rest, k - 1).map(function (c) { return [first].concat(c); }).concat(combos(rest, k));
  }
  function criticalPath(preds) {
    var depth = [];
    preds.forEach(function (ps, i) { depth[i] = 1 + ps.reduce(function (m, q) { return Math.max(m, depth[q]); }, 0); });
    return Math.max.apply(null, depth);
  }

  /* ---------- field shorthands ---------- */
  function num(id, label, answer, opts) {
    var f = { id: id, label: label, kind: "number", answer: answer, tol: 0 };
    for (var k in opts || {}) f[k] = opts[k];
    return f;
  }
  function choice(id, label, options, answer, opts) {
    var f = { id: id, label: label, kind: "choice", options: options, answer: answer };
    for (var k in opts || {}) f[k] = opts[k];
    return f;
  }
  function bit(id, answer) { return { id: id, label: "", kind: "bits", width: 1, answer: String(answer), size: 2 }; }

  /* =====================================================================
     Generators, keyed "topic/problem"
     ===================================================================== */
  var G = {};

  /* ----- 1. Performance ----- */
  G["performance/effective-cpi"] = function (R) {
    var classes = ["ALU", "Load", "Store", "Branch"], freq = percentSplit(R, 4, 5);
    var cpi = classes.map(function () { return R.int(1, 6); });
    var total = 0, terms = [];
    classes.forEach(function (c, i) { total += freq[i] / 100 * cpi[i]; terms.push(cpi[i] + " × " + fmt(freq[i] / 100)); });
    return {
      prompt: p("A program runs on a processor with the instruction mix below.") +
        table(["Class", "Frequency", "CPI"], classes.map(function (c, i) { return [c, freq[i] + "%", cpi[i]]; })) +
        p("What is the effective CPI of the program? Give your answer to two decimal places."),
      fields: [num("cpi", "Effective CPI", round(total, 2), { tol: 0.005 })],
      solution: p("Effective CPI is the frequency-weighted average of the CPIs:") +
        p("CPI = " + terms.join(" + ") + " = <strong>" + fmt(total) + "</strong>")
    };
  };

  G["performance/cpu-time"] = function (R) {
    var ic = R.int(10, 90) * 10, cpi = R.int(8, 30) / 10, ghz = R.pick([1, 1.5, 2, 2.5, 3, 3.5, 4]);
    var ms = ic * cpi / ghz;
    if (R.chance(0.5)) {
      return {
        prompt: p("A program executes " + ic + " million instructions with an average CPI of " + cpi +
          " on a " + ghz + " GHz processor.") + p("What is the CPU time of the program, in milliseconds?"),
        fields: [num("t", "CPU time", round(ms, 2), { rel: 0.005, suffix: "ms" })],
        solution: p("CPU time = instruction count × CPI ÷ clock rate") +
          p("= " + ic + " × 10⁶ × " + cpi + " ÷ (" + ghz + " × 10⁹ Hz) = <strong>" + fmt(ms) + " ms</strong>")
      };
    }
    var target = round(ms * R.pick([0.5, 0.6, 0.75, 0.8]), 1), need = ic * cpi / target;
    return {
      prompt: p("A program executes " + ic + " million instructions with an average CPI of " + cpi + ".") +
        p("What clock rate (in GHz) does the processor need for the program to finish in " + target + " ms?"),
      fields: [num("f", "Clock rate", round(need, 2), { rel: 0.005, suffix: "GHz" })],
      solution: p("Clock rate = instruction count × CPI ÷ CPU time") +
        p("= " + ic + " × 10⁶ × " + cpi + " ÷ (" + target + " × 10⁻³ s) = <strong>" + fmt(need) + " GHz</strong>")
    };
  };

  G["performance/amdahl"] = function (R) {
    var f = R.int(4, 18) * 5, fr = f / 100, max = 1 / (1 - fr);
    if (R.chance(0.5)) {
      var s = R.int(2, 20), sp = 1 / ((1 - fr) + fr / s);
      return {
        prompt: p("An enhancement makes " + f + "% of a program's execution time run " + s + " times faster.") +
          p("What is the overall speedup? What is the largest overall speedup possible if that part were made infinitely fast?"),
        fields: [num("sp", "Overall speedup", round(sp, 2), { tol: 0.01 }), num("max", "Maximum speedup", round(max, 2), { tol: 0.01 })],
        solution: p("Amdahl's law: speedup = 1 ÷ ((1 − f) + f ÷ s) = 1 ÷ (" + fmt(1 - fr) + " + " + fmt(fr) + " ÷ " + s + ") = <strong>" + fmt(sp) + "</strong>") +
          p("As s → ∞: speedup → 1 ÷ (1 − f) = 1 ÷ " + fmt(1 - fr) + " = <strong>" + fmt(max) + "</strong>")
      };
    }
    var goal = round(1.1 + R.f() * (0.8 * max - 1.1), 1);
    if (goal <= 1.1) goal = 1.2;
    var need = fr / (1 / goal - (1 - fr));
    return {
      prompt: p(f + "% of a program's execution time can be sped up.") +
        p("By what factor must that part be sped up to make the whole program " + goal + " times faster? What is the largest overall speedup possible?"),
      fields: [num("s", "Required factor", round(need, 2), { rel: 0.01 }), num("max", "Maximum speedup", round(max, 2), { tol: 0.01 })],
      solution: p("Solve " + goal + " = 1 ÷ ((1 − " + fmt(fr) + ") + " + fmt(fr) + " ÷ s) for s:") +
        p("s = f ÷ (1 ÷ " + goal + " − (1 − f)) = " + fmt(fr) + " ÷ (" + fmt(1 / goal, 4) + " − " + fmt(1 - fr) + ") = <strong>" + fmt(need) + "</strong>") +
        p("Maximum speedup = 1 ÷ (1 − f) = <strong>" + fmt(max) + "</strong>")
    };
  };

  G["performance/compare"] = function (R) {
    var r1, r2, c1, c2, t1, t2, tries = 0;
    do {
      r1 = R.pick([1, 1.5, 2, 2.5, 3, 3.5, 4]); r2 = R.pick([1, 1.5, 2, 2.5, 3, 3.5, 4]);
      c1 = R.int(10, 40) / 10; c2 = R.int(10, 40) / 10;
      t1 = c1 / r1; t2 = c2 / r2;
    } while (Math.abs(t1 / t2 - 1) < 0.05 && ++tries < 50);
    var faster = t1 < t2 ? "P1" : "P2", sp = Math.max(t1, t2) / Math.min(t1, t2);
    return {
      prompt: p("Two processors implement the same instruction set and run the same program.") +
        table(["Processor", "Clock rate", "CPI"], [["P1", r1 + " GHz", c1], ["P2", r2 + " GHz", c2]]) +
        p("Which processor is faster, and by what factor?"),
      fields: [choice("faster", "Faster processor", ["P1", "P2"], faster), num("sp", "Speedup", round(sp, 2), { tol: 0.01 })],
      solution: p("With the same instruction count, time per instruction = CPI ÷ clock rate:") +
        ul(["P1: " + c1 + " ÷ " + r1 + " = " + fmt(t1, 3) + " ns", "P2: " + c2 + " ÷ " + r2 + " = " + fmt(t2, 3) + " ns"]) +
        p("<strong>" + faster + "</strong> is faster by " + fmt(Math.max(t1, t2), 3) + " ÷ " + fmt(Math.min(t1, t2), 3) + " = <strong>" + fmt(sp) + "</strong>")
    };
  };

  /* ----- 2. Memory hierarchy ----- */
  G["memory/amat"] = function (R) {
    if (R.chance(0.5)) {
      var h = R.int(1, 3), m = R.int(2, 15), pen = R.int(5, 20) * 10, a = h + m / 100 * pen;
      return {
        prompt: p("A cache has a hit time of " + h + " cycle" + (h > 1 ? "s" : "") + ", a miss rate of " + m +
          "% and a miss penalty of " + pen + " cycles.") + p("What is the average memory access time (AMAT), in cycles?"),
        fields: [num("amat", "AMAT", round(a, 2), { tol: 0.01, suffix: "cycles" })],
        solution: p("AMAT = hit time + miss rate × miss penalty = " + h + " + " + fmt(m / 100) + " × " + pen + " = <strong>" + fmt(a) + " cycles</strong>")
      };
    }
    var h1 = R.int(1, 2), m1 = R.int(3, 12), h2 = R.int(6, 15), m2 = R.int(10, 40), pm = R.int(10, 30) * 10;
    var l2 = h2 + m2 / 100 * pm, amat = h1 + m1 / 100 * l2;
    return {
      prompt: p("A processor has two levels of cache:") +
        table(["", "Hit time", "Miss rate"], [["L1", h1 + " cycles", m1 + "%"], ["L2", h2 + " cycles", m2 + "% (local)"]]) +
        p("Main memory takes " + pm + " cycles. What is the AMAT, in cycles?"),
      fields: [num("amat", "AMAT", round(amat, 2), { tol: 0.01, suffix: "cycles" })],
      solution: p("AMAT = L1 hit time + L1 miss rate × (L2 hit time + L2 miss rate × memory time)") +
        p("= " + h1 + " + " + fmt(m1 / 100) + " × (" + h2 + " + " + fmt(m2 / 100) + " × " + pm + ") = " + h1 + " + " + fmt(m1 / 100) + " × " + fmt(l2) + " = <strong>" + fmt(amat) + " cycles</strong>")
    };
  };

  G["memory/stall-cpi"] = function (R) {
    var base = R.int(10, 20) / 10, mi = R.int(1, 5), md = R.int(2, 10), ls = R.int(20, 40), pen = R.int(4, 20) * 10;
    var istall = mi / 100 * pen, dstall = ls / 100 * md / 100 * pen, cpi = base + istall + dstall;
    return {
      prompt: p("A processor has a base CPI of " + base + " with a perfect cache. The instruction cache miss rate is " + mi +
        "%, the data cache miss rate is " + md + "%, and " + ls + "% of instructions are loads or stores. Every miss costs " + pen + " cycles.") +
        p("What is the actual CPI? How many times faster would the processor be with a perfect cache?"),
      fields: [num("cpi", "Actual CPI", round(cpi, 2), { tol: 0.01 }), num("sp", "Speedup with perfect cache", round(cpi / base, 2), { tol: 0.01 })],
      solution: p("Instruction stalls per instruction = " + fmt(mi / 100) + " × " + pen + " = " + fmt(istall)) +
        p("Data stalls per instruction = " + fmt(ls / 100) + " × " + fmt(md / 100) + " × " + pen + " = " + fmt(dstall, 3)) +
        p("CPI = " + base + " + " + fmt(istall) + " + " + fmt(dstall, 3) + " = <strong>" + fmt(cpi) + "</strong>") +
        p("Speedup = " + fmt(cpi) + " ÷ " + base + " = <strong>" + fmt(cpi / base) + "</strong>")
    };
  };

  G["memory/locality"] = function (R) {
    var s = R.pick(["sum", "total", "acc"]), gp = ["good", "poor"], lines, stride, why;
    if (R.chance(0.6)) {
      var M = R.pick([16, 32, 64]), N = R.pick([16, 32, 64, 128]), rowMajor = R.chance(0.5);
      lines = ["int a[" + M + "][" + N + "];", "int " + s + " = 0;",
        rowMajor ? "for (int i = 0; i < " + M + "; i++)" : "for (int j = 0; j < " + N + "; j++)",
        rowMajor ? "    for (int j = 0; j < " + N + "; j++)" : "    for (int i = 0; i < " + M + "; i++)",
        "        " + s + " += a[i][j];"];
      stride = rowMajor ? 1 : N;
      why = rowMajor ? "The inner loop walks along a row, and rows are stored contiguously, so consecutive accesses are 1 element apart."
        : "The inner loop walks down a column. Each row holds " + N + " ints, so consecutive accesses are " + N + " elements apart.";
    } else {
      var n = R.pick([256, 512, 1024]), k = R.pick([1, 1, 32, 64]);
      lines = ["int b[" + n + "];", "int " + s + " = 0;", "for (int i = 0; i < " + n + "; i += " + k + ")", "    " + s + " += b[i];"];
      stride = k;
      why = "The loop variable increases by " + k + ", so consecutive accesses are " + k + " element" + (k > 1 ? "s" : "") + " apart.";
    }
    var arr = lines[0].indexOf("a[") !== -1 ? "a" : "b", good = stride === 1 ? "good" : "poor";
    return {
      prompt: p("Consider the following C code (ints are 4 bytes; cache blocks are 64 bytes).") + pre(lines) +
        p("Answer the questions about the locality of the memory accesses."),
      fields: [
        num("stride", "Stride between consecutive accesses to " + arr + " (in elements)", stride),
        choice("sp", "Spatial locality of " + arr, gp, good),
        choice("ta", "Temporal locality of " + arr, gp, "poor"),
        choice("ts", "Temporal locality of " + s, gp, "good")
      ],
      solution: p(why) +
        p("Spatial locality of " + arr + " is <strong>" + good + "</strong>: " + (stride === 1 ? "a 64-byte block holds 16 ints, all used one after another." : "each access lands in a different cache block, so most of each block goes unused.")) +
        p("Temporal locality of " + arr + " is <strong>poor</strong>: each element is accessed only once.") +
        p("Temporal locality of " + s + " is <strong>good</strong>: it is accessed on every iteration.")
    };
  };

  G["memory/miss-types"] = function (R) {
    var lines = 4, seq, kinds, tries = 0;
    do {
      seq = [];
      for (var i = 0; i < 8; i++) seq.push(seq.length && R.chance(0.5) ? R.pick(seq) : R.int(0, 11));
      kinds = classifyMisses(lines, seq);
    } while ((kinds.indexOf("conflict miss") === -1 || kinds.indexOf("hit") === -1) && ++tries < 200);
    var opts = ["hit", "cold miss", "conflict miss", "capacity miss"];
    var fields = kinds.map(function (k, i) { return choice("k" + i, "", opts, k); });
    return {
      prompt: p("A direct-mapped cache holds " + lines + " blocks (block <em>b</em> goes in line <em>b</em> mod " + lines +
        "). It starts empty. Classify each access to the block addresses below.") +
        p("A miss is a <em>conflict</em> miss if a fully associative LRU cache of the same size would have hit, and a <em>capacity</em> miss otherwise. The first access to a block is a <em>cold</em> miss."),
      table: { head: ["Access", "Block", "Result"], rows: seq.map(function (b, i) { return [i + 1, b, { f: "k" + i }]; }) },
      fields: fields,
      solution: table(["Access", "Block", "Line", "Result"], seq.map(function (b, i) { return [i + 1, b, b % lines, "<strong>" + kinds[i] + "</strong>"]; }))
    };
  };

  /* ----- 3. Cache organization ----- */
  G["caches/address-bits"] = function (R) {
    var abits = R.pick([16, 32]), size = Math.pow(2, abits === 16 ? R.int(8, 12) : R.int(10, 16));
    var block = Math.pow(2, R.int(2, 6)), blocks = size / block;
    var assoc = R.pick([1, 2, 4, 8].filter(function (a) { return a <= blocks; }));
    var sets = blocks / assoc, ob = Math.log2(block), ib = Math.log2(sets), tb = abits - ob - ib;
    var addr = Math.floor(R.f() * Math.pow(2, abits)), set = Math.floor(addr / block) % sets;
    var kb = size >= 1024 ? (size / 1024) + " KiB" : size + " bytes";
    var org = assoc === 1 ? "direct-mapped" : assoc + "-way set-associative";
    return {
      prompt: p("A " + kb + " " + org + " cache has " + block + "-byte blocks. Addresses are " + abits + " bits and refer to bytes.") +
        p("How many bits are used for the block offset, set index and tag? Which set does address " + code(hex(addr, abits / 4)) + " map to?"),
      fields: [num("o", "Offset bits", ob), num("i", "Index bits", ib), num("t", "Tag bits", tb), num("s", "Set (decimal)", set)],
      solution: p("Blocks = " + size + " ÷ " + block + " = " + blocks + "; sets = " + blocks + " ÷ " + assoc + " = " + sets + ".") +
        p("Offset = log₂(" + block + ") = <strong>" + ob + "</strong>; index = log₂(" + sets + ") = <strong>" + ib + "</strong>; tag = " + abits + " − " + ob + " − " + ib + " = <strong>" + tb + "</strong>.") +
        p("Set = ⌊" + addr + " ÷ " + block + "⌋ mod " + sets + " = <strong>" + set + "</strong> (the " + ib + " bits just above the offset).")
    };
  };

  function cacheCfg(R, small) {
    var ways = R.pick(small ? [1, 2] : [1, 2, 4]), sets = R.pick([2, 4]), block = R.pick([2, 4]);
    return { ways: ways, sets: sets, block: block };
  }
  function cfgText(c) {
    var org = c.ways === 1 ? "direct-mapped" : c.ways + "-way set-associative";
    return "a " + org + " cache with " + c.sets + " sets, " + c.block + "-byte blocks and LRU replacement (capacity " + (c.ways * c.sets * c.block) + " bytes)";
  }
  function randomAddrs(R, n, max) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(a.length && R.chance(0.4) ? R.pick(a) + R.int(-1, 1) : R.int(0, max));
    return a.map(function (x) { return Math.max(0, Math.min(max, x)); });
  }

  G["caches/cache-sim"] = function (R) {
    var c = cacheCfg(R, true), addrs = randomAddrs(R, 10, 8 * c.sets * c.block - 1), sim = simulateCache(c, addrs);
    var hits = sim.steps.filter(function (s) { return s.hit; }).length;
    var fields = sim.sets.map(function (lines, s) {
      return { id: "set" + s, label: "Set " + s, kind: "set", answer: lines.slice().sort(function (a, b) { return a - b; }), size: 10 };
    });
    fields.push(num("hits", "Number of hits", hits));
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. The processor accesses these byte addresses in order:") +
        p(code(addrs.join(", "))) +
        p("After all accesses, which blocks are in each set? Give the lowest byte address of each block, separated by commas (any order; leave blank if empty)."),
      fields: fields,
      solution: table(["Address", "Block", "Set", "Result"], sim.steps.map(function (s) {
        return [s.addr, s.start + "–" + (s.start + c.block - 1), s.set, s.hit ? "hit" : "miss"];
      })) + p("Final contents: " + sim.sets.map(function (l, s) {
        return "set " + s + ": " + (l.length ? l.map(function (b) { return b + "–" + (b + c.block - 1); }).join(", ") : "empty");
      }).join("; ") + ". Hits: <strong>" + hits + "</strong>.")
    };
  };

  G["caches/hit-rate"] = function (R) {
    var c = cacheCfg(R, false), addrs = randomAddrs(R, 10, 6 * c.sets * c.block - 1), sim = simulateCache(c, addrs);
    var hits = sim.steps.filter(function (s) { return s.hit; }).length;
    var fields = sim.steps.map(function (s, i) { return choice("h" + i, "", ["hit", "miss"], s.hit ? "hit" : "miss"); });
    fields.push(num("rate", "Hit rate", hits * 10, { suffix: "%", tol: 0.5 }));
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. Mark each access to the byte addresses below as a hit or a miss, then give the hit rate."),
      table: { head: ["Access", "Address", "Result"], rows: addrs.map(function (a, i) { return [i + 1, a, { f: "h" + i }]; }) },
      fields: fields,
      solution: table(["Address", "Block", "Set", "Result"], sim.steps.map(function (s) {
        return [s.addr, s.start + "–" + (s.start + c.block - 1), s.set, "<strong>" + (s.hit ? "hit" : "miss") + "</strong>"];
      })) + p("Hit rate = " + hits + " ÷ 10 = <strong>" + hits * 10 + "%</strong>")
    };
  };

  /* ----- 4. Numbers and combinational logic ----- */
  function s8(n) { n &= 0xff; return n >= 128 ? n - 256 : n; }
  G["logic/twos-complement"] = function (R) {
    var v = 0;
    while (v === 0) v = R.int(-128, 127);
    var b = bin(v & 0xff, 8), variant = R.int(0, 4);
    if (variant === 0) return {
      prompt: p("Write " + v + " as an 8-bit two's complement number."),
      fields: [{ id: "b", label: "Binary", kind: "bits", width: 8, answer: b, size: 12 }],
      solution: v >= 0 ? p(v + " in binary is <strong>" + b + "</strong>.")
        : p(Math.abs(v) + " = " + bin(-v, 8) + "; invert the bits: " + bin(~(-v) & 0xff, 8) + "; add 1: <strong>" + b + "</strong>.")
    };
    if (variant === 1) return {
      prompt: p("What decimal value does the 8-bit two's complement number " + code(b) + " represent?"),
      fields: [num("d", "Decimal", v)],
      solution: p(b[0] === "1" ? "The sign bit is 1, so the value is " + (v & 0xff) + " − 256 = <strong>" + v + "</strong>." : "The sign bit is 0, so the value is <strong>" + v + "</strong>.")
    };
    if (variant === 2) {
      if (v === -128) v = -127;
      b = bin(v & 0xff, 8);
      var nb = bin(-v & 0xff, 8);
      return {
        prompt: p("The 8-bit two's complement number " + code(b) + " represents " + v + ". Write " + (-v) + " in 8-bit two's complement."),
        fields: [{ id: "b", label: "Binary", kind: "bits", width: 8, answer: nb, size: 12 }],
        solution: p("Invert the bits: " + bin(~v & 0xff, 8) + "; add 1: <strong>" + nb + "</strong>.")
      };
    }
    if (variant === 3) {
      var byte = v & 0xff, ext = byte >= 128 ? (0xff00 | byte) : byte;
      return {
        prompt: p("Sign-extend the 8-bit value " + code(hex(byte, 2)) + " to 16 bits. Give the answer in hexadecimal."),
        fields: [{ id: "h", label: "16-bit value", kind: "hex", answer: ext, size: 10 }],
        solution: p("The sign bit of " + bin(byte, 8) + " is " + (byte >> 7) + ", so the upper 8 bits are all " + (byte >> 7) + "s: <strong>" + hex(ext, 4) + "</strong>.")
      };
    }
    var n = R.int(4, 16), lo = -Math.pow(2, n - 1), hi = Math.pow(2, n - 1) - 1;
    return {
      prompt: p("What range of values can an " + n + "-bit two's complement number represent?"),
      fields: [num("lo", "Smallest", lo), num("hi", "Largest", hi)],
      solution: p("−2ⁿ⁻¹ to 2ⁿ⁻¹ − 1 = <strong>" + lo + "</strong> to <strong>" + hi + "</strong>.")
    };
  };

  G["logic/binary-add"] = function (R) {
    var a = R.int(-128, 127), b = R.int(-128, 127), sub = R.chance(0.4);
    var ua = a & 0xff, ub = b & 0xff, raw, res, ovf, carry;
    if (!sub) {
      raw = ua + ub; res = raw & 0xff; carry = (raw >> 8) & 1;
      ovf = (a < 0) === (b < 0) && (s8(res) < 0) !== (a < 0);
    } else {
      raw = ua + ((~ub) & 0xff) + 1; res = raw & 0xff; carry = (raw >> 8) & 1;
      ovf = (a < 0) !== (b < 0) && (s8(res) < 0) !== (a < 0);
    }
    var fields = [{ id: "r", label: "8-bit result", kind: "bits", width: 8, answer: bin(res, 8), size: 12 },
      choice("o", "Signed overflow?", ["yes", "no"], ovf ? "yes" : "no")];
    if (!sub) fields.push(choice("c", "Carry out", ["0", "1"], String(carry)));
    var exact = sub ? a - b : a + b;
    return {
      prompt: p((sub ? "Subtract" : "Add") + " these 8-bit two's complement numbers: " + code(bin(ua, 8)) + (sub ? " − " : " + ") + code(bin(ub, 8)) + ".") +
        p("Give the 8-bit result and say whether signed overflow occurs" + (sub ? "." : ", and give the carry out of the most significant bit.")),
      fields: fields,
      solution: p("In decimal: " + a + (sub ? " − " : " + ") + b + " = " + exact + ".") +
        (sub ? p("Subtracting adds the two's complement of the second number: " + bin(ua, 8) + " + " + bin(((~ub) + 1) & 0xff, 8) + ".") : "") +
        p("Result: <strong>" + bin(res, 8) + "</strong> (" + s8(res) + " as a signed number). " +
          (ovf ? "<strong>Overflow</strong>: " + exact + " is outside −128 to 127." : "<strong>No overflow</strong>: " + exact + " fits in 8 bits.") +
          (sub ? "" : " Carry out: <strong>" + carry + "</strong>."))
    };
  };

  var SIMPLE_FORMS = ["x", "xy", "x+y", "xy+z", "x'y+xz", "xy+yz+xz", "xy'+x'y", "x+yz", "x'z+y", "xyz+x'y'z'", "x'y'+z", "xz+y'z"];
  G["logic/boolean-simplify"] = function (R) {
    var vars = ["x", "y", "z"], target = remapExpr(R.pick(SIMPLE_FORMS), randomRemap(R, vars));
    var parsed = parseBool(target, vars), tt = truthTable(parsed.tree, vars), ms = minterms(tt);
    var given = ms.map(function (m) { return mintermText(m, vars); }).join(" + ");
    return {
      prompt: p("Simplify the Boolean expression") + p("<span class=\"expr\">F = " + esc(given) + "</span>") +
        p("Write a simplest equivalent expression. Type " + code("x'") + " for NOT x, " + code("+") + " for OR, and put variables side by side (or use " + code("*") + ") for AND."),
      fields: [{ id: "e", label: "F =", kind: "bool", vars: vars, table: tt, maxLiterals: parsed.literals, example: target, size: 22 }],
      solution: p("One simplest form is <strong>F = " + esc(target) + "</strong> (" + parsed.literals + " literal" + (parsed.literals > 1 ? "s" : "") + ").") +
        p("F is 1 for minterms " + ms.join(", ") + ". Group adjacent minterms (those differing in one variable) and drop the variable that changes, using xy + xy' = x.")
    };
  };

  var TT_FORMS = ["(x+y')z", "x'y+yz'", "(x+y)(y'+z)", "(xy)'+z", "x(y+z')", "x'y'z+xz", "(x+z)'+y", "xy'+yz+x'z'", "(x+y+z)(x'+y')"];
  G["logic/truth-table"] = function (R) {
    var vars = ["x", "y", "z"], e = remapExpr(R.pick(TT_FORMS), randomRemap(R, vars));
    var tt = truthTable(parseBool(e, vars).tree, vars), ms = minterms(tt);
    var fields = tt.map(function (v, i) { return bit("r" + i, v); });
    fields.push({ id: "m", label: "Minterms where F = 1", kind: "set", answer: ms, size: 16 });
    return {
      prompt: p("Complete the truth table for <span class=\"expr\">F = " + esc(e) + "</span>, then list the minterms (row numbers) where F = 1."),
      table: { head: ["Row", "x", "y", "z", "F"], rows: tt.map(function (v, i) { return [i, (i >> 2) & 1, (i >> 1) & 1, i & 1, { f: "r" + i }]; }) },
      fields: fields,
      solution: p("F = Σm(" + ms.join(", ") + ")") +
        p("Sum of products: F = " + ms.map(function (m) { return mintermText(m, vars); }).join(" + "))
    };
  };

  /* ----- 5. Sequential circuits ----- */
  G["sequential/flip-flops"] = function (R) {
    var type = R.pick(["JK", "T", "D", "SR"]), q = R.int(0, 1), q0 = q, n = 5;
    var ins = [], cur = [], next = [];
    for (var c = 0; c < n; c++) {
      var i = {};
      if (type === "JK") { i.J = R.int(0, 1); i.K = R.int(0, 1); }
      else if (type === "T") i.T = R.int(0, 1);
      else if (type === "D") i.D = R.int(0, 1);
      else { i.S = R.int(0, 1); i.R = i.S ? 0 : R.int(0, 1); }
      var nq = type === "JK" ? ((i.J & (1 - q)) | ((1 - i.K) & q))
        : type === "T" ? (i.T ^ q) : type === "D" ? i.D : (i.S | ((1 - i.R) & q));
      ins.push(i); cur.push(q); next.push(nq); q = nq;
    }
    var names = Object.keys(ins[0]), fields = [], rows = [];
    var cycleRow = ["Clock cycle"].concat([0, 1, 2, 3, 4]);
    rows.push(["Q<sub>current</sub>"].concat(cur.map(function (v, c) { if (c === 0) return v; fields.push(bit("q" + c, v)); return { f: "q" + c }; })));
    names.forEach(function (nm) { rows.push([nm].concat(ins.map(function (i) { return i[nm]; }))); });
    rows.push(["Q<sub>next</sub>"].concat(next.map(function (v, c) { fields.push(bit("n" + c, v)); return { f: "n" + c }; })));
    var rule = { JK: "Q<sub>next</sub> = J·Q' + K'·Q (J=K=1 toggles)", T: "Q<sub>next</sub> = T xor Q", D: "Q<sub>next</sub> = D", SR: "Q<sub>next</sub> = S + R'·Q (S sets, R resets)" }[type];
    return {
      prompt: p("A " + type + " flip-flop starts with Q<sub>current</sub> = " + q0 + ". Complete the table: Q<sub>next</sub> for each cycle becomes Q<sub>current</sub> for the next cycle."),
      table: { head: cycleRow, rows: rows },
      fields: fields,
      solution: p(rule + ".") + table(["Cycle", "Q<sub>current</sub>"].concat(names).concat(["Q<sub>next</sub>"]), ins.map(function (i, c) {
        return [c, cur[c]].concat(names.map(function (nm) { return i[nm]; })).concat(["<strong>" + next[c] + "</strong>"]);
      }))
    };
  };

  G["sequential/clock-period"] = function (R) {
    var cq = R.int(3, 8) * 10, setup = R.int(2, 6) * 10, hold = R.int(1, 4) * 10;
    var paths = [["A", "B"], ["B", "C"], ["A", "C"]].map(function (pr) { return { from: pr[0], to: pr[1], d: R.int(10, 90) * 10 }; });
    var worst = Math.max.apply(null, paths.map(function (x) { return x.d; })), period = cq + worst + setup, mhz = 1e6 / period;
    return {
      prompt: p("A synchronous circuit has registers A, B and C. Each register has a clk-to-q delay of " + cq + " ps, a setup time of " + setup +
        " ps and a hold time of " + hold + " ps. The combinational logic between registers has these delays:") +
        table(["Path", "Delay"], paths.map(function (x) { return [x.from + " → " + x.to, x.d + " ps"]; })) +
        p("What is the minimum clock period and the maximum clock frequency? Does the hold time affect the maximum frequency?"),
      fields: [num("t", "Minimum period", period, { suffix: "ps" }), num("f", "Maximum frequency", round(mhz, 1), { rel: 0.005, suffix: "MHz" }),
        choice("h", "Hold time affects it?", ["yes", "no"], "no")],
      solution: p("Period = clk-to-q + longest combinational delay + setup = " + cq + " + " + worst + " + " + setup + " = <strong>" + period + " ps</strong>.") +
        p("Frequency = 1 ÷ " + period + " ps = <strong>" + fmt(mhz, 1) + " MHz</strong>.") +
        p("Hold time constrains the <em>shortest</em> paths (data must not change too soon after the edge), not the clock period, so: <strong>no</strong>.")
    };
  };

  function fsmSvg(trans) {
    var pos = [[90, 70], [290, 70], [290, 230], [90, 230]], r = 26, out = [];
    var grouped = {};
    trans.forEach(function (t) { var k = t.from + "-" + t.to; (grouped[k] = grouped[k] || []).push(t.input + "/" + t.out); });
    Object.keys(grouped).forEach(function (k) {
      var a = +k.split("-")[0], b = +k.split("-")[1], label = grouped[k].join(", ");
      if (a === b) {
        var cx = pos[a][0], cy = pos[a][1], dx = cx < 190 ? -1 : 1, dy = cy < 150 ? -1 : 1;
        var x1 = cx + dx * r * 0.7, y1 = cy + dy * r * 0.7;
        out.push("<path d=\"M" + (cx + dx * r) + " " + cy + " C " + (cx + dx * 75) + " " + (cy + dy * 10) + ", " + (cx + dx * 10) + " " + (cy + dy * 75) + ", " + cx + " " + (cy + dy * r) + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" marker-end=\"url(#arr)\"/>");
        out.push("<text class=\"fsm-label\" x=\"" + (cx + dx * 58) + "\" y=\"" + (cy + dy * 58) + "\" text-anchor=\"middle\" font-size=\"13\" fill=\"currentColor\">" + label + "</text>");
        return;
      }
      var ax = pos[a][0], ay = pos[a][1], bx = pos[b][0], by = pos[b][1];
      var mx = (ax + bx) / 2, my = (ay + by) / 2, vx = bx - ax, vy = by - ay, len = Math.sqrt(vx * vx + vy * vy);
      var nx = -vy / len, ny = vx / len, bend = 28, cx2 = mx + nx * bend, cy2 = my + ny * bend;
      /* label a third of the way along the curve, so labels on crossing arrows don't collide */
      var lt = 0.32, lx = (1 - lt) * (1 - lt) * ax + 2 * (1 - lt) * lt * cx2 + lt * lt * bx, ly = (1 - lt) * (1 - lt) * ay + 2 * (1 - lt) * lt * cy2 + lt * lt * by;
      var sx = ax + (vx / len) * r + nx * 8, sy = ay + (vy / len) * r + ny * 8, ex = bx - (vx / len) * r + nx * 8, ey = by - (vy / len) * r + ny * 8;
      out.push("<path d=\"M" + sx + " " + sy + " Q " + cx2 + " " + cy2 + " " + ex + " " + ey + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" marker-end=\"url(#arr)\"/>");
      out.push("<text class=\"fsm-label\" x=\"" + (lx + nx * 14) + "\" y=\"" + (ly + ny * 14 + 4) + "\" text-anchor=\"middle\" font-size=\"13\" fill=\"currentColor\">" + label + "</text>");
    });
    pos.forEach(function (q, i) {
      out.push("<circle cx=\"" + q[0] + "\" cy=\"" + q[1] + "\" r=\"" + r + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/>");
      out.push("<text x=\"" + q[0] + "\" y=\"" + (q[1] + 5) + "\" text-anchor=\"middle\" font-size=\"15\" font-weight=\"700\" fill=\"currentColor\">" + i + "</text>");
    });
    return "<svg class=\"fsm\" viewBox=\"0 0 380 300\" role=\"img\" aria-label=\"State diagram\"><defs><marker id=\"arr\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0 L10 5 L0 10 z\" fill=\"currentColor\"/></marker></defs>" + out.join("") + "</svg>";
  }
  G["sequential/fsm-table"] = function (R) {
    var trans = [], fields = [], rows = [];
    for (var s = 0; s < 4; s++) for (var x = 0; x < 2; x++) trans.push({ from: s, input: x, to: R.int(0, 3), out: R.int(0, 1) });
    trans.forEach(function (t, i) {
      fields.push(bit("a" + i, t.to >> 1), bit("b" + i, t.to & 1), bit("o" + i, t.out));
      rows.push([t.from >> 1, t.from & 1, t.input, { f: "a" + i }, { f: "b" + i }, { f: "o" + i }]);
    });
    return {
      prompt: p("The state diagram below shows a finite state machine with states 0–3 and a 1-bit input. Each arrow is labelled <em>input/output</em>. States are encoded in binary as PS1 PS0.") +
        fsmSvg(trans) + p("Complete the truth table for the next state (NS1 NS0) and the output."),
      table: { head: ["PS1", "PS0", "In", "NS1", "NS0", "Out"], rows: rows },
      fields: fields,
      solution: table(["PS1", "PS0", "In", "NS1", "NS0", "Out"], trans.map(function (t) {
        return [t.from >> 1, t.from & 1, t.input, "<strong>" + (t.to >> 1) + "</strong>", "<strong>" + (t.to & 1) + "</strong>", "<strong>" + t.out + "</strong>"];
      }))
    };
  };

  /* ----- 6. MIPS ----- */
  G["mips/encode"] = function (R) {
    var i = randomInstr(R), w = encode(i);
    return {
      prompt: p("Encode this MIPS instruction as a 32-bit machine word in hexadecimal:") + p(code(asm(i))) +
        p("Opcodes: R-type 0, addi 8, andi 12, ori 13, lw 35, sw 43. Funct: add 32, sub 34, and 36, or 37, slt 42, sll 0, srl 2."),
      fields: [{ id: "w", label: "Machine code", kind: "hex", answer: w, size: 14 }],
      solution: fieldBreakdown(i) + p("Grouping the 32 bits into hex digits gives <strong>" + hex(w, 8) + "</strong>.")
    };
  };

  G["mips/decode"] = function (R) {
    var i = randomInstr(R), w = encode(i), f = MIPS[i.m].fmt, fields = [choice("m", "Instruction", MNEMONICS, i.m)];
    if (f === "R3") fields.push({ id: "rd", label: "rd", kind: "reg", answer: i.rd }, { id: "rs", label: "rs", kind: "reg", answer: i.rs }, { id: "rt", label: "rt", kind: "reg", answer: i.rt });
    else if (f === "SH") fields.push({ id: "rd", label: "rd", kind: "reg", answer: i.rd }, { id: "rt", label: "rt", kind: "reg", answer: i.rt }, num("sh", "shamt", i.shamt));
    else fields.push({ id: "rt", label: "rt", kind: "reg", answer: i.rt }, { id: "rs", label: "rs", kind: "reg", answer: i.rs }, num("imm", "Immediate (decimal)", i.imm));
    return {
      prompt: p("Decode the MIPS machine word " + code(hex(w, 8)) + ". Give the instruction and its operands (registers as names like " + code("$t0") + " or numbers).") +
        p("Opcodes: R-type 0, addi 8, andi 12, ori 13, lw 35, sw 43. Funct: add 32, sub 34, and 36, or 37, slt 42, sll 0, srl 2."),
      fields: fields,
      solution: p("In binary: " + code(bin(w, 32)) + ".") + fieldBreakdown(i) + p("The instruction is <strong>" + esc(asm(i)) + "</strong>.")
    };
  };

  G["mips/branch-target"] = function (R) {
    var pc = (0x00400000 + 4 * R.int(4, 400)) >>> 0, v = R.int(0, 3);
    if (v < 2) {
      var imm = 0;
      while (imm === 0) imm = R.int(-30, 30);
      var target = (pc + 4 + imm * 4) >>> 0;
      if (v === 0) return {
        prompt: p("The instruction " + code("beq $t0, $t1, label") + " is at address " + code(hex(pc, 8)) + " and its 16-bit immediate is " + imm + ". What is the branch target address?"),
        fields: [{ id: "a", label: "Target address", kind: "hex", answer: target, size: 14 }],
        solution: p("Target = PC + 4 + immediate × 4 = " + hex(pc, 8) + " + 4 + " + (imm * 4) + " = <strong>" + hex(target, 8) + "</strong>.")
      };
      return {
        prompt: p("A " + code("bne") + " instruction at address " + code(hex(pc, 8)) + " branches to " + code(hex(target, 8)) + ". What value goes in its 16-bit immediate field (in decimal)?"),
        fields: [num("imm", "Immediate", imm)],
        solution: p("Immediate = (target − (PC + 4)) ÷ 4 = (" + hex(target, 8) + " − " + hex(pc + 4, 8) + ") ÷ 4 = <strong>" + imm + "</strong>.")
      };
    }
    var field = (0x0100000 + R.int(0, 0xffff)) >>> 0, jt = (((pc + 4) & 0xf0000000) | (field << 2)) >>> 0;
    if (v === 2) return {
      prompt: p("A " + code("j") + " instruction at address " + code(hex(pc, 8)) + " has 26-bit address field " + code(hex(field, 7)) + ". What is the jump target address?"),
      fields: [{ id: "a", label: "Target address", kind: "hex", answer: jt, size: 14 }],
      solution: p("Target = upper 4 bits of PC + 4, then the 26-bit field, then 00: (" + hex((pc + 4) & 0xf0000000, 8) + ") | (" + hex(field, 7) + " × 4) = <strong>" + hex(jt, 8) + "</strong>.")
    };
    return {
      prompt: p("A " + code("j") + " instruction at address " + code(hex(pc, 8)) + " jumps to " + code(hex(jt, 8)) + ". What is its 26-bit address field, in hexadecimal?"),
      fields: [{ id: "a", label: "Address field", kind: "hex", answer: field, size: 14 }],
      solution: p("Drop the upper 4 bits and the low 2 bits: " + hex(jt, 8) + " ÷ 4, keeping 26 bits = <strong>" + hex(field, 7) + "</strong>.")
    };
  };

  G["mips/c-to-mips"] = function (R) {
    var regs = R.shuffle(["$s0", "$s1", "$s2", "$s3", "$s4"]), A = regs[0], i = regs[1], x = regs[2], y = regs[3];
    var t = R.pick(["$t0", "$t1", "$t2"]), v = R.int(0, 3), k = R.int(1, 6);
    var mn = ["lw", "sw", "add", "addi", "sll", "slt"];
    var ctx = "Assume " + code("A") + " is an array of ints (4 bytes each) whose base address is in " + code(A) + ".";
    if (v === 0 || v === 1) {
      var load = v === 0, idx = R.chance(0.5) ? 0 : k;
      var cline = load ? "x = A[i" + (idx ? " + " + idx : "") + "];" : "A[i" + (idx ? " + " + idx : "") + "] = x;";
      return {
        prompt: p(ctx + " Variable " + code("i") + " is in " + code(i) + " and " + code("x") + " is in " + code(x) + ". Fill in the blanks to translate:") + pre([cline]),
        code: [["sll " + t + ", " + i + ", ", { f: "sh" }], ["add " + t + ", " + A + ", " + t], [{ f: "op" }, " " + x + ", ", { f: "off" }, "(" + t + ")"]],
        fields: [num("sh", "shift", 2, { size: 4 }), choice("op", "", mn, load ? "lw" : "sw"), num("off", "offset", 4 * idx, { size: 4 })],
        solution: pre(["sll " + t + ", " + i + ", 2      # " + t + " = i × 4", "add " + t + ", " + A + ", " + t + "    # address of A[i]", (load ? "lw " : "sw ") + x + ", " + (4 * idx) + "(" + t + ")" + (idx ? "     # + " + idx + " ints = " + 4 * idx + " bytes" : "")]) +
          p("Indexes are scaled by 4 because each int is 4 bytes; a constant offset of " + idx + " element" + (idx === 1 ? "" : "s") + " becomes " + 4 * idx + " bytes in the " + (load ? "lw" : "sw") + ".")
      };
    }
    if (v === 2) {
      return {
        prompt: p(ctx + " Variable " + code("x") + " is in " + code(x) + ". Fill in the blanks to translate:") + pre(["x = A[" + k + "] + " + (k * 3) + ";"]),
        code: [[{ f: "op1" }, " " + t + ", ", { f: "off" }, "(" + A + ")"], [{ f: "op2" }, " " + x + ", " + t + ", " + (k * 3)]],
        fields: [choice("op1", "", mn, "lw"), num("off", "offset", 4 * k, { size: 4 }), choice("op2", "", mn, "addi")],
        solution: pre(["lw " + t + ", " + 4 * k + "(" + A + ")    # A[" + k + "] is " + 4 * k + " bytes from the base", "addi " + x + ", " + t + ", " + k * 3])
      };
    }
    return {
      prompt: p("Variables " + code("a") + ", " + code("b") + " and " + code("x") + " are in " + code(i) + ", " + code(y) + " and " + code(x) + ". Fill in the blanks to translate:") +
        pre(["if (a < b) x = 1;", "else       x = 0;"]),
      code: [[{ f: "op" }, " " + x + ", ", { f: "r1" }, ", ", { f: "r2" }]],
      fields: [choice("op", "", mn, "slt"), { id: "r1", label: "", kind: "reg", answer: REGS.indexOf(i), size: 5 }, { id: "r2", label: "", kind: "reg", answer: REGS.indexOf(y), size: 5 }],
      solution: pre(["slt " + x + ", " + i + ", " + y + "    # x = 1 if a < b, else 0"]) + p(code("slt rd, rs, rt") + " sets rd to 1 exactly when rs < rt, so no branch is needed.")
    };
  };

  /* ----- 7. Datapath and control ----- */
  var CONTROL = {
    add: ["+4", "rd", "x", "rt", "add", "0", "ALU", "1"], sub: ["+4", "rd", "x", "rt", "sub", "0", "ALU", "1"],
    and: ["+4", "rd", "x", "rt", "and", "0", "ALU", "1"], or: ["+4", "rd", "x", "rt", "or", "0", "ALU", "1"],
    slt: ["+4", "rd", "x", "rt", "slt", "0", "ALU", "1"], addi: ["+4", "rt", "signed", "imm", "add", "0", "ALU", "1"],
    ori: ["+4", "rt", "zero", "imm", "or", "0", "ALU", "1"], lw: ["+4", "rt", "signed", "imm", "add", "0", "memory", "1"],
    sw: ["+4", "x", "signed", "imm", "add", "1", "x", "0"], beq: ["br", "x", "x", "rt", "sub", "0", "x", "0"]
  };
  var SIGNALS = [["nPC_sel", ["+4", "br"]], ["RegDst", ["rd", "rt", "x"]], ["ExtOp", ["signed", "zero", "x"]], ["ALUSrc", ["rt", "imm"]],
    ["ALUctr", ["add", "sub", "and", "or", "slt"]], ["MemWr", ["0", "1"]], ["MemtoReg", ["ALU", "memory", "x"]], ["RegWr", ["0", "1"]]];
  function sampleOf(m) {
    return { add: "add $t0, $t1, $t2", sub: "sub $s1, $s2, $s3", and: "and $t3, $t4, $t5", or: "or $s0, $s1, $t0", slt: "slt $t2, $s0, $s1",
      addi: "addi $t0, $t1, -12", ori: "ori $s2, $s3, 255", lw: "lw $t1, 8($s0)", sw: "sw $t2, 16($sp)", beq: "beq $t0, $t1, loop", j: "j loop" }[m];
  }
  G["datapath/control-signals"] = function (R) {
    var m = R.pick(Object.keys(CONTROL)), vals = CONTROL[m];
    return {
      prompt: p("For the single-cycle MIPS datapath from lecture, give the value of every control signal while executing:") + p(code(sampleOf(m))) +
        p("Choose x where the value does not matter (any value is accepted there)."),
      fields: SIGNALS.map(function (s, k) { return choice("c" + k, s[0], s[1].indexOf("x") === -1 && vals[k] === "x" ? s[1].concat(["x"]) : s[1], vals[k], { any: vals[k] === "x" }); }),
      solution: table(SIGNALS.map(function (s) { return s[0]; }), [vals.map(function (v) { return "<strong>" + v + "</strong>"; })]) +
        p({ lw: "Loads use the sign-extended immediate as an address offset, read memory, and write the result to rt.",
          sw: "Stores compute an address like loads but write memory and no register, so RegDst and MemtoReg do not matter.",
          beq: "Branches subtract the registers to compare them and select the branch target; nothing is written.",
          addi: "addi adds the sign-extended immediate and writes the result to rt.",
          ori: "ori uses a zero-extended immediate (it is a logical operation) and writes to rt." }[m] ||
          "R-type instructions use two registers as ALU inputs and write the ALU result to rd; no immediate is used.")
    };
  };
  var STAGES = { add: [1, 1, 1, 0, 1], addi: [1, 1, 1, 0, 1], lw: [1, 1, 1, 1, 1], sw: [1, 1, 1, 1, 0], beq: [1, 1, 1, 0, 0], j: [1, 1, 0, 0, 0] };
  var WRITES = { add: "rd", addi: "rt", lw: "rt", sw: "none", beq: "none", j: "none" };
  G["datapath/datapath-trace"] = function (R) {
    var m = R.pick(Object.keys(STAGES)), st = STAGES[m], names = ["Instruction fetch", "Decode / register read", "Execute (ALU)", "Memory access", "Write back"];
    var fields = names.map(function (n, k) { return choice("s" + k, n, ["used", "not used"], st[k] ? "used" : "not used"); });
    fields.push(choice("w", "Register written", ["rd", "rt", "none"], WRITES[m]));
    return {
      prompt: p("Which of the five datapath stages does this instruction use, and which register field (if any) is written?") + p(code(sampleOf(m))),
      fields: fields,
      solution: table(["IF", "ID", "EX", "MEM", "WB", "Writes"], [st.map(function (u) { return u ? "used" : "—"; }).concat([WRITES[m]])]) +
        p({ add: "R-type: no memory access; the ALU result is written to rd.", addi: "Like R-type, but the result goes to rt.",
          lw: "Loads use all five stages and write the loaded value to rt.", sw: "Stores write memory and no register, so write back is unused.",
          beq: "Branches compare in the ALU and update the PC; they neither access memory nor write a register.",
          j: "Jumps only need the instruction itself to compute the new PC." }[m])
    };
  };
  G["datapath/clock-cycle"] = function (R) {
    var names = ["IF", "ID", "EX", "MEM", "WB"], t, mx, tries = 0;
    do {
      t = names.map(function () { return R.int(2, 8) * 50; });
      mx = Math.max.apply(null, t);
    } while (t.filter(function (x) { return x === mx; }).length > 1 && ++tries < 50);
    var total = t.reduce(function (a, b) { return a + b; }, 0), slow = names[t.indexOf(mx)];
    var rest = Math.max.apply(null, t.filter(function (x, k) { return k !== t.indexOf(mx); })), split = Math.max(rest, mx / 2);
    return {
      prompt: p("The stages of a MIPS datapath take:") + table(names, [t.map(function (x) { return x + " ps"; })]) +
        p("R-type instructions skip MEM, stores skip WB, branches skip MEM and WB, and loads use every stage.") +
        p("What is the minimum clock cycle with single-cycle clocking, and with multi-cycle clocking? If one stage could be split into two equal halves, which should it be, and what would the multi-cycle clock cycle become?"),
      fields: [num("s", "Single-cycle", total, { suffix: "ps" }), num("m", "Multi-cycle", mx, { suffix: "ps" }),
        choice("st", "Stage to split", names, slow), num("n", "New multi-cycle", split, { suffix: "ps" })],
      solution: p("Single-cycle: the clock must fit the slowest instruction, a load, which uses every stage: " + t.join(" + ") + " = <strong>" + total + " ps</strong>.") +
        p("Multi-cycle: the clock must fit the slowest stage, " + slow + ": <strong>" + mx + " ps</strong>.") +
        p("Splitting " + slow + " gives two " + fmt(mx / 2, 1) + " ps stages; the slowest stage is then max(" + fmt(mx / 2, 1) + ", " + rest + ") = <strong>" + fmt(split, 1) + " ps</strong>.")
    };
  };

  /* ----- 8. Pipelining ----- */
  G["pipelining/pipeline-time"] = function (R) {
    var names = ["IF", "ID", "EX", "MEM", "WB"], t = names.map(function () { return R.int(2, 6) * 50; });
    var n = R.pick([5, 10, 20, 100, 1000]), total = t.reduce(function (a, b) { return a + b; }, 0), mx = Math.max.apply(null, t);
    var single = n * total, piped = (5 + n - 1) * mx, sp = single / piped;
    return {
      prompt: p("A 5-stage datapath has these stage times:") + table(names, [t.map(function (x) { return x + " ps"; })]) +
        p("A program runs " + n + " instructions with no hazards. How long does it take on a pipelined processor (clocked at the slowest stage), and what is the speedup over a single-cycle processor?"),
      fields: [num("t", "Pipelined time", piped, { suffix: "ps" }), num("sp", "Speedup", round(sp, 2), { tol: 0.01 })],
      solution: p("Pipelined: (5 + " + n + " − 1) cycles × " + mx + " ps = <strong>" + piped + " ps</strong>.") +
        p("Single-cycle: " + n + " × " + total + " ps = " + single + " ps.") +
        p("Speedup = " + single + " ÷ " + piped + " = <strong>" + fmt(sp) + "</strong>" + (n >= 100 ? " (close to " + total + " ÷ " + mx + " = " + fmt(total / mx) + " for long programs)." : "."))
    };
  };

  function randomDepCode(R, n, pool) {
    var ins = [];
    for (var k = 0; k < n; k++) {
      var kind = R.pick(["r", "r", "addi", "lw", "sw"]), a = R.pick(pool), b = R.pick(pool), c = R.pick(pool), i;
      if (kind === "r") { var op = R.pick(["add", "sub", "and", "or", "xor"]); i = { text: op + " " + a + ", " + b + ", " + c, dst: a, src: b === c ? [b] : [b, c] }; }
      else if (kind === "addi") i = { text: "addi " + a + ", " + b + ", " + R.int(1, 40), dst: a, src: [b] };
      else if (kind === "lw") i = { text: "lw " + a + ", " + 4 * R.int(0, 8) + "(" + b + ")", dst: a, src: [b], load: true };
      else i = { text: "sw " + a + ", " + 4 * R.int(0, 8) + "(" + b + ")", dst: null, src: a === b ? [a] : [a, b] };
      ins.push(i);
    }
    return ins;
  }
  function numbered(ins) { return pre(ins.map(function (i, k) { return (k + 1) + ": " + i.text; })); }
  G["pipelining/dependencies"] = function (R) {
    var ins, deps, tries = 0, count;
    do {
      ins = randomDepCode(R, 5, ["$t0", "$t1", "$t2", "$s0", "$s1"]);
      deps = findDependencies(ins);
      count = function (t) { return deps.filter(function (d) { return d.type === t; }).length; };
    } while ((count("RAW") === 0 || count("WAR") + count("WAW") === 0) && ++tries < 200);
    return {
      prompt: p("How many data dependencies of each type are in this code? Count a dependency between two instructions only when no instruction in between writes the same register. Ignore read-after-read.") + numbered(ins),
      fields: [num("raw", "RAW (read after write)", count("RAW")), num("war", "WAR (write after read)", count("WAR")), num("waw", "WAW (write after write)", count("WAW"))],
      solution: (deps.length ? ul(deps.map(function (d) { return "<strong>" + d.type + "</strong> on " + code(d.reg) + ": " + (d.from + 1) + " → " + (d.to + 1); })) : p("No dependencies.")) +
        p("Totals: RAW " + count("RAW") + ", WAR " + count("WAR") + ", WAW " + count("WAW") + ".")
    };
  };
  G["pipelining/stalls"] = function (R) {
    var ins, a, b, tries = 0;
    do {
      ins = randomDepCode(R, 4, ["$t0", "$t1", "$t2", "$s0"]);
      a = pipelineStalls(ins, false); b = pipelineStalls(ins, true);
    } while ((a.stalls === 0 || (b.stalls === 0 && R.chance(0.5))) && ++tries < 200);
    return {
      prompt: p("This code runs on the classic 5-stage MIPS pipeline (IF ID EX MEM WB). Registers are written in the first half of a cycle and read in the second half. Forwarding, when available, delivers results to the start of EX (a loaded value is ready after MEM).") + numbered(ins) +
        p("How many stall cycles are needed without forwarding, and with forwarding? How many cycles does the code take with forwarding?"),
      fields: [num("nf", "Stalls without forwarding", a.stalls), num("f", "Stalls with forwarding", b.stalls), num("c", "Total cycles with forwarding", b.cycles)],
      solution: p("Without forwarding, an instruction can read a register in ID only in the same cycle (or later) that the producer is in WB, so a dependent instruction right after its producer waits 2 cycles, and one two instructions later waits 1.") +
        p("With forwarding, ALU results reach the next instruction in time; only a load followed immediately by a use needs 1 stall.") +
        table(["Instruction", "ID cycle (no forwarding)", "ID cycle (forwarding)"], ins.map(function (i, k) { return [code(i.text), a.D[k], b.D[k]]; })) +
        p("Stalls: <strong>" + a.stalls + "</strong> without forwarding, <strong>" + b.stalls + "</strong> with. Total with forwarding = 5 + " + ins.length + " − 1 + " + b.stalls + " = <strong>" + b.cycles + "</strong> cycles.")
    };
  };

  /* ----- 9. Instruction-level parallelism ----- */
  G["ilp/renaming"] = function (R) {
    var regs = R.shuffle(["$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6"]).slice(0, 4), map = {}, next = 4, fields = [], rows = [];
    regs.forEach(function (r, k) { map[r] = "V" + k; });
    var n = R.int(4, 5), sol = [];
    for (var k = 0; k < n; k++) {
      var d = R.pick(regs), s1 = R.pick(regs), s2 = R.pick(regs), op = R.pick(["add", "sub", "and", "or", "xor", "addi"]), text, ren;
      if (op === "addi") { var im = R.int(1, 30); text = "addi " + d + ", " + s1 + ", " + im; ren = "addi V" + next + ", " + map[s1] + ", " + im; }
      else { text = op + " " + d + ", " + s1 + ", " + s2; ren = op + " V" + next + ", " + map[s1] + ", " + map[s2]; }
      map[d] = "V" + next; next++;
      fields.push({ id: "r" + k, label: "", kind: "text", accept: [ren], size: 20 });
      rows.push([code(text), { f: "r" + k }]);
      sol.push([code(text), "<strong>" + esc(ren) + "</strong>"]);
    }
    return {
      prompt: p("Rename the registers in this code so that every result gets a new value name. Initially " + regs.map(function (r, k) { return code(r) + " = V" + k; }).join(", ") +
        ". Name new results V4, V5, … in order, and write each renamed instruction (for example " + code("add V4, V0, V1") + ")."),
      table: { head: ["Instruction", "Renamed instruction"], rows: rows },
      fields: fields,
      solution: table(["Instruction", "Renamed"], sol) + p("Sources use the register's current value name; the destination always gets a fresh name. This removes WAR and WAW dependencies, leaving only true (RAW) ones.")
    };
  };
  G["ilp/unrolling"] = function (R) {
    var n = R.pick([64, 100, 128, 200, 256, 1000]), u = R.pick([2, 4]);
    var orig = 5 * n, unr = (3 * u + 2) * n / u;
    return {
      prompt: p("This loop adds " + code("$s2") + " to each element of an array of " + n + " ints (" + code("$s1") + " starts at the last element):") +
        pre(["Loop: lw   $t0, 0($s1)", "      addu $t0, $t0, $s2", "      sw   $t0, 0($s1)", "      addi $s1, $s1, -4", "      bne  $s1, $zero, Loop"]) +
        p("The loop is unrolled " + u + " times: the body is copied " + u + " times with different offsets, and the pointer is updated once per iteration. How many instructions run before and after unrolling, and how many branches run after unrolling?"),
      fields: [num("a", "Instructions before", orig), num("b", "Instructions after", unr), num("c", "Branches after", n / u)],
      solution: p("Before: 5 instructions × " + n + " iterations = <strong>" + orig + "</strong>.") +
        p("After: each iteration has " + u + " × 3 = " + 3 * u + " body instructions plus addi and bne, so " + (3 * u + 2) + " × " + n / u + " iterations = <strong>" + unr + "</strong>.") +
        p("Branches: one per iteration = <strong>" + n / u + "</strong>.")
    };
  };
  G["ilp/vliw"] = function (R) {
    var n = R.int(6, 8), preds = [], lines = [], W = R.pick([2, 3]);
    for (var k = 0; k < n; k++) {
      var cand = [];
      for (var q = 0; q < k; q++) if (R.chance(0.35)) cand.push(q);
      cand = cand.slice(-2);
      preds.push(cand);
      var srcs = cand.map(function (q) { return "$t" + q; });
      while (srcs.length < 2) srcs.push(R.pick(["$s0", "$s1", "$s2", "$s3"]));
      lines.push((k + 1) + ": " + R.pick(["add", "sub", "and", "or", "xor"]) + " $t" + k + ", " + srcs[0] + ", " + srcs[1]);
    }
    var cp = criticalPath(preds), best = minSchedule(preds, W);
    return {
      prompt: p("Registers have already been renamed, so only true dependencies remain. Every instruction takes 1 cycle, and a dependent instruction can issue in the cycle after its producer.") + pre(lines) +
        p("What is the length of the critical path (in instructions)? What is the minimum number of cycles on a " + W + "-issue VLIW machine where any instruction can go in any slot, and what IPC does that give?"),
      fields: [num("cp", "Critical path", cp), num("c", "Minimum cycles", best), num("ipc", "IPC", round(n / best, 2), { tol: 0.01 })],
      solution: p("Dependencies: " + preds.map(function (ps, k) { return ps.length ? (k + 1) + " needs " + ps.map(function (q) { return q + 1; }).join(" and ") : null; }).filter(Boolean).join("; ") + ".") +
        p("The longest chain has <strong>" + cp + "</strong> instructions, so no schedule can be shorter than " + cp + " cycles; with " + n + " instructions and " + W + " slots it needs at least ⌈" + n + " ÷ " + W + "⌉ = " + Math.ceil(n / W) + ".") +
        p("Minimum cycles: <strong>" + best + "</strong>; IPC = " + n + " ÷ " + best + " = <strong>" + fmt(n / best) + "</strong>.")
    };
  };

  /* ----- 10. Multicore ----- */
  G["multicore/mesi"] = function (R) {
    var reqs = [], n = R.int(6, 8), rows, tries = 0;
    do {
      reqs = [];
      for (var k = 0; k < n; k++) reqs.push({ p: R.int(0, 2), op: R.chance(0.55) ? "R" : "W" });
      rows = simulateMesi(reqs);
    } while ((rows.filter(function (r) { return r.hit; }).length === 0 || rows.filter(function (r) { return r.supplier.indexOf("P") === 0; }).length === 0) && ++tries < 200);
    var stOpts = ["M", "E", "S", "I", "-"], supOpts = ["-", "Memory", "P1", "P2", "P3", "P1 or P2", "P1 or P3", "P2 or P3"];
    var fields = [], trows = [["Initially", "-", "-", "-", "-", "-"]];
    rows.forEach(function (r, k) {
      var cells = ["P" + (r.req.p + 1) + (r.req.op === "R" ? " reads" : " writes")];
      r.states.forEach(function (s, q) { fields.push(choice("s" + k + q, "", stOpts, s)); cells.push({ f: "s" + k + q }); });
      var accept = r.supplier.indexOf(" or ") !== -1 ? [r.supplier].concat(r.supplier.split(" or ")) : [r.supplier];
      fields.push(choice("d" + k, "", supOpts, r.supplier, { answers: accept }));
      fields.push(choice("h" + k, "", ["hit", "miss"], r.hit ? "hit" : "miss"));
      cells.push({ f: "d" + k }, { f: "h" + k });
      trows.push(cells);
    });
    return {
      prompt: p("Three cores P1, P2 and P3 have private caches kept coherent with the MESI protocol. All caches start empty (−). For each request to the same cache block, give the state of the block in every cache afterwards, which cache or memory supplies the data, and whether it is a hit or a miss."),
      table: { head: ["Request", "P1", "P2", "P3", "Supplier", "Hit/miss"], rows: trows },
      fields: fields,
      solution: table(["Request", "P1", "P2", "P3", "Supplier", "Hit/miss"], rows.map(function (r) {
        return ["P" + (r.req.p + 1) + (r.req.op === "R" ? " reads" : " writes")].concat(r.states).concat([r.supplier, r.hit ? "hit" : "miss"]);
      })) + ul(["A read miss loads the block as E if no other cache has it, otherwise as S (other copies become S, and a cache with the block supplies it).",
        "A write leaves the writer in M and invalidates (I) every other copy.", "Hits need no data from anywhere (−)."])
    };
  };
  G["multicore/sharing"] = function (R) {
    var steps, kinds, tries = 0;
    do {
      steps = [];
      for (var k = 0; k < 6; k++) steps.push({ p: R.int(0, 1), op: R.chance(0.5) ? "W" : "R", w: R.int(0, 3) });
      kinds = classifySharing(steps);
    } while ((kinds.indexOf("true sharing miss") === -1 || kinds.indexOf("false sharing miss") === -1) && ++tries < 400);
    var opts = ["hit", "cold miss", "true sharing miss", "false sharing miss"];
    return {
      prompt: p("Words x[0] … x[3] are in the same cache block. Cores P1 and P2 have private caches that start empty and use an invalidation protocol: a write by one core invalidates the other core's copy, and a write to a block the writer already has is a hit.") +
        p("Classify each access. After a core's copy has been invalidated, its next miss is a <em>true sharing</em> miss if it accesses a word the other core wrote since the invalidation, and a <em>false sharing</em> miss otherwise."),
      table: { head: ["Step", "Access", "Result"], rows: steps.map(function (s, k) { return [k + 1, "P" + (s.p + 1) + (s.op === "R" ? " reads" : " writes") + " x[" + s.w + "]", { f: "k" + k }]; }) },
      fields: kinds.map(function (kd, k) { return choice("k" + k, "", opts, kd); }),
      solution: table(["Step", "Access", "Result"], steps.map(function (s, k) { return [k + 1, "P" + (s.p + 1) + (s.op === "R" ? " reads" : " writes") + " x[" + s.w + "]", "<strong>" + kinds[k] + "</strong>"]; })) +
        p("False sharing misses happen only because different words share a block; with one word per block they would be hits.")
    };
  };

  /* ----- 11. GPU ----- */
  G["gpu/divergence"] = function (R) {
    var T = R.pick([64, 96, 128]), warps = T / 32, a = R.int(1, 5) * 10, b = R.int(1, 5) * 10, v = R.int(0, 2), cond, test;
    if (v === 0) { var c = R.int(1, T - 1); cond = "threadIdx.x < " + c; test = function (t) { return t < c; }; }
    else if (v === 1) { var m = R.pick([2, 4, 64]); cond = "threadIdx.x % " + m + " == 0"; test = function (t) { return t % m === 0; }; }
    else { cond = "(threadIdx.x / 32) % 2 == 0"; test = function (t) { return Math.floor(t / 32) % 2 === 0; }; }
    var div = 0, total = 0, per = [];
    for (var w = 0; w < warps; w++) {
      var anyT = false, anyF = false;
      for (var t = 32 * w; t < 32 * w + 32; t++) { if (test(t)) anyT = true; else anyF = true; }
      if (anyT && anyF) div++;
      var cost = (anyT ? a : 0) + (anyF ? b : 0);
      total += cost; per.push("warp " + w + ": " + (anyT && anyF ? "both paths, " : anyT ? "if path only, " : "else path only, ") + cost);
    }
    return {
      prompt: p("A thread block of " + T + " threads (warps of 32) runs:") +
        pre(["if (" + cond + ") {", "    // path A: " + a + " cycles", "} else {", "    // path B: " + b + " cycles", "}"]) +
        p("How many warps are there, how many of them diverge, and what is the total number of cycles summed over all warps?"),
      fields: [num("w", "Warps", warps), num("d", "Divergent warps", div), num("c", "Total warp-cycles", total)],
      solution: p("A warp runs path A if any of its threads takes it, and path B if any thread takes it; when both are needed they run one after the other.") +
        ul(per) + p("Divergent warps: <strong>" + div + "</strong>; total: <strong>" + total + "</strong> cycles.")
    };
  };
  G["gpu/coalescing"] = function (R) {
    var s = R.pick([1, 2, 4, 8, 16, 32]), o = R.chance(0.5) ? 0 : R.int(1, 31), seg = R.pick([32, 128]);
    var segs = {};
    for (var t = 0; t < 32; t++) segs[Math.floor(4 * (o + s * t) / seg)] = true;
    var n = Object.keys(segs).length, eff = 128 / (n * seg) * 100;
    return {
      prompt: p("Each of the 32 threads in a warp reads one 4-byte float:") + pre(["float v = a[" + (o ? o + " + " : "") + (s === 1 ? "" : s + " * ") + "threadIdx.x];"]) +
        p("The array starts at an address that is a multiple of " + seg + ". Memory is read in aligned " + seg + "-byte transactions. How many transactions does the warp need, and what percentage of the bytes transferred are actually used?"),
      fields: [num("n", "Transactions", n), num("e", "Efficiency", round(eff, 1), { tol: 0.1, suffix: "%" })],
      solution: p("Thread t reads byte address 4 × (" + (o ? o + " + " : "") + s + "t), so the warp spans bytes " + 4 * o + " to " + (4 * (o + 31 * s) + 3) + ".") +
        p("Those addresses touch <strong>" + n + "</strong> different " + seg + "-byte segments. Useful bytes = 32 × 4 = 128, transferred = " + n + " × " + seg + " = " + n * seg +
          ", so efficiency = <strong>" + fmt(eff, 1) + "%</strong>.")
    };
  };

  /* =====================================================================
     Answer checking
     ===================================================================== */
  function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ""); }
  function parseNum(s) {
    s = String(s).trim().replace(/,/g, "").replace(/%$/, "");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }
  function parseReg(s) {
    s = norm(s);
    if (/^\$?\d+$/.test(s)) { var n = parseInt(s.replace("$", ""), 10); return n < 32 ? n : NaN; }
    if (s[0] !== "$") s = "$" + s;
    if (s === "$0") return 0;
    var k = REGS.indexOf(s);
    return k === -1 ? NaN : k;
  }
  var CHECKERS = {
    number: function (f, raw) {
      var v = parseNum(raw);
      if (isNaN(v)) return { ok: false, note: "“" + raw.trim() + "” isn't a number." };
      var tol = Math.max(f.tol || 0, f.rel ? f.rel * Math.abs(f.answer) : 0);
      return { ok: Math.abs(v - f.answer) <= tol + 1e-9 };
    },
    text: function (f, raw) {
      var r = norm(raw);
      return { ok: f.accept.some(function (a) { return norm(a) === r; }) };
    },
    choice: function (f, raw) {
      if (f.any) return { ok: true };
      return { ok: raw === f.answer || (f.answers || []).indexOf(raw) !== -1 };
    },
    set: function (f, raw) {
      var toks = String(raw).split(/[\s,;]+/).filter(function (t) { return t && !/^(-|—|empty|none)$/i.test(t); });
      var vals = toks.map(function (t) { return /^0x/i.test(t) ? parseInt(t, 16) : parseNum(t); });
      if (vals.some(isNaN)) return { ok: false, note: "Use numbers separated by commas." };
      var uniq = vals.filter(function (v, i) { return vals.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      return { ok: uniq.length === f.answer.length && uniq.every(function (v, i) { return v === f.answer[i]; }) };
    },
    hex: function (f, raw) {
      var s = norm(raw).replace(/^0x/, "").replace(/_/g, "");
      if (!/^[0-9a-f]+$/.test(s)) return { ok: false, note: "Give the answer in hexadecimal, like 0x1A2B." };
      return { ok: parseInt(s, 16) >>> 0 === f.answer >>> 0 && s.length <= 8 };
    },
    bits: function (f, raw) {
      var s = norm(raw).replace(/^0b/, "").replace(/_/g, "");
      if (!/^[01]+$/.test(s)) return { ok: false, note: f.width === 1 ? "Enter 0 or 1." : "Use only 0s and 1s." };
      if (s.length !== f.width) return { ok: false, note: "Use exactly " + f.width + " bits." };
      return { ok: s === f.answer };
    },
    reg: function (f, raw) {
      var v = parseReg(raw);
      if (isNaN(v)) return { ok: false, note: "Give a register like $t0 or $8." };
      return { ok: v === f.answer };
    },
    bool: function (f, raw) {
      var parsed;
      try { parsed = parseBool(raw, f.vars); } catch (e) { return { ok: false, note: "Couldn't read that expression (" + e.message + ")." }; }
      var tt = truthTable(parsed.tree, f.vars);
      for (var i = 0; i < tt.length; i++) {
        if (tt[i] !== f.table[i]) return { ok: false, note: "Your expression isn't equivalent to F (they differ when xyz = " + bin(i, 3) + ")." };
      }
      if (parsed.literals > f.maxLiterals) return { ok: false, note: "That's equivalent to F, but it can be simplified further (aim for " + f.maxLiterals + " literal" + (f.maxLiterals > 1 ? "s" : "") + ")." };
      return { ok: true };
    }
  };
  function check(field, raw) {
    raw = raw === undefined || raw === null ? "" : String(raw);
    if (raw.trim() === "" && field.kind !== "set") return { ok: false, blank: true };
    return CHECKERS[field.kind](field, raw);
  }
  /* The canonical answer as a student would type it (used by tests). */
  function sampleAnswer(f) {
    switch (f.kind) {
      case "number": return String(f.answer);
      case "text": return f.accept[0];
      case "choice": return f.answer;
      case "set": return f.answer.join(", ");
      case "hex": return hex(f.answer, 1);
      case "bits": return f.answer;
      case "reg": return REGS[f.answer];
      case "bool": return f.example;
    }
  }

  function generate(key, seed) {
    var g = G[key];
    return g ? g(Rng(seed >>> 0)) : null;
  }

  root.CS3350_PRACTICE = {
    has: function (key) { return !!G[key]; },
    keys: function () { return Object.keys(G); },
    generate: generate,
    check: check,
    sampleAnswer: sampleAnswer,
    _sim: { simulateCache: simulateCache, classifyMisses: classifyMisses, simulateMesi: simulateMesi, classifySharing: classifySharing,
      findDependencies: findDependencies, pipelineStalls: pipelineStalls, minSchedule: minSchedule, parseBool: parseBool, truthTable: truthTable, encode: encode }
  };
})(typeof window !== "undefined" ? window : globalThis);
