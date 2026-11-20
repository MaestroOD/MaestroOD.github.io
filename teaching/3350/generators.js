/* CS 3350A practice problem generators and answer checkers.

   Every generator is a pure function of a seeded random source, so a problem can be rebuilt
   exactly from its seed (that is how the practice page keeps your problem and answers when you
   switch topics). Each problem type has several question styles ("variants").

   Numbers are chosen so that every answer can be worked out by hand: no calculators are allowed
   on the exams. Numeric answers are whole numbers or exact to at most two decimal places, and
   fractions such as 7/3 are accepted wherever a number is asked for.

   This file is public: generators build new problems from random parameters and must never
   contain questions copied from course quizzes or exams.

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
      },
      /* Draw from `make` until `ok` accepts (deterministic for a given seed). */
      until: function (make, ok) {
        for (var i = 0; i < 500; i++) { var v = make(); if (ok(v)) return v; }
        throw new Error("no acceptable value");
      }
    };
  }
  /* Pick a variant (a function of R) and run it. */
  function variants(list) { return function (R) { return R.pick(list)(R); }; }

  /* ---------- formatting helpers ---------- */
  function round(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }
  function fmt(x, d) { return String(round(x, d === undefined ? 2 : d)); }
  function exact(x, d) { var m = Math.pow(10, d === undefined ? 2 : d); return Math.abs(x * m - Math.round(x * m)) < 1e-9; }
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
  /* 2^n written as 2ⁿ */
  function pow2(n) { return "2" + String(n).split("").map(function (d) { return "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]; }).join(""); }
  /* blocks start at multiples of the block size */
  function alignNote(B) { return "Blocks are aligned: bytes 0–" + (B - 1) + " form block 0, bytes " + B + "–" + (2 * B - 1) + " form block 1, and so on."; }
  /* "a 6-bit" but "an 8-bit", "an 11-bit", "an 18-bit" */
  function aN(n) { return /^(8|11|18)/.test(String(n)) ? "an " + n : "a " + n; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function maxOf(a) { return Math.max.apply(null, a); }
  function percentSplit(R, k, step) {
    var parts = [], i;
    for (i = 0; i < k; i++) parts.push(1);
    for (var left = 100 / step - k; left > 0; left--) parts[R.int(0, k - 1)]++;
    return parts.map(function (u) { return u * step; });
  }

  /* ---------- field shorthands ---------- */
  function num(id, label, answer, opts) {
    var f = { id: id, label: label, kind: "number", answer: answer, tol: 0 };
    for (var k in opts || {}) f[k] = opts[k];
    if (!exact(answer, 2) && !f.tol && !f.rel) f.tol = 0.005;
    return f;
  }
  function choice(id, label, options, answer, opts) {
    var f = { id: id, label: label, kind: "choice", options: options, answer: answer };
    for (var k in opts || {}) f[k] = opts[k];
    return f;
  }
  function bit(id, answer) { return { id: id, label: "", kind: "bits", width: 1, answer: String(answer), size: 2 }; }
  var YN = ["yes", "no"];

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
  var OPCODE_NOTE = "Opcodes: R-type 0, addi 8, andi 12, ori 13, lw 35, sw 43. Funct: add 32, sub 34, and 36, or 37, slt 42, sll 0, srl 2.";

  function randomInstr(R) {
    var m = R.pick(MNEMONICS), f = MIPS[m], i = { m: m };
    var reg = function () { return R.pick(USER_REGS); };
    if (f.fmt === "R3") { i.rd = reg(); i.rs = reg(); i.rt = reg(); i.shamt = 0; }
    else if (f.fmt === "SH") { i.rd = reg(); i.rs = 0; i.rt = reg(); i.shamt = R.int(1, 8); }
    else if (f.fmt === "I") { i.rt = reg(); i.rs = reg(); i.imm = f.signed ? R.int(-20, 40) : R.int(1, 63); }
    else { i.rt = reg(); i.rs = R.pick([16, 17, 18, 19, 29, 4, 5]); i.imm = 4 * R.int(-4, 8); }
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

  /* ---------- Boolean expressions ---------- */
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
      else throw new Error("unexpected " + (c === undefined ? "end" : "“" + c + "”"));
      while (peek() === "'") { pos++; node = { op: "not", a: node }; }
      return node;
    }
    var tree = expr();
    if (peek() !== undefined) throw new Error("unexpected “" + peek() + "”");
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
  function ttOf(expr, vars) { return truthTable(parseBool(expr, vars).tree, vars); }
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
  /* Minimum sum of products by brute force (fine for up to 4 variables). */
  function minSop(tt, vars) {
    var n = vars.length, ones = minterms(tt);
    if (!ones.length) return { expr: "0", literals: 0 };
    if (ones.length === tt.length) return { expr: "1", literals: 0 };
    var cubes = [];
    for (var c = 0; c < Math.pow(3, n); c++) {
      var spec = [], x = c;
      for (var k = 0; k < n; k++) { spec.push(x % 3); x = Math.floor(x / 3); }
      var cover = [];
      for (var m = 0; m < tt.length; m++) {
        var ok = true;
        for (k = 0; k < n; k++) {
          var b = (m >> (n - 1 - k)) & 1;
          if (spec[k] !== 2 && spec[k] !== b) { ok = false; break; }
        }
        if (ok) cover.push(m);
      }
      if (cover.every(function (m2) { return tt[m2]; })) cubes.push({ spec: spec, cover: cover, lits: spec.filter(function (s2) { return s2 !== 2; }).length });
    }
    var primes = cubes.filter(function (a) {
      return !cubes.some(function (b2) { return b2 !== a && b2.cover.length > a.cover.length && a.cover.every(function (m3) { return b2.cover.indexOf(m3) !== -1; }); });
    });
    var best = null;
    for (var mask = 1; mask < (1 << primes.length); mask++) {
      var chosen = primes.filter(function (_, i) { return mask & (1 << i); });
      var covered = ones.every(function (m4) { return chosen.some(function (cb) { return cb.cover.indexOf(m4) !== -1; }); });
      if (!covered) continue;
      var lits = sum(chosen.map(function (cb) { return cb.lits; }));
      if (!best || lits < best.lits || (lits === best.lits && chosen.length < best.terms.length)) best = { lits: lits, terms: chosen };
    }
    var expr = best.terms.map(function (cb) {
      return cb.spec.map(function (s3, k2) { return s3 === 2 ? "" : vars[k2] + (s3 ? "" : "'"); }).join("");
    }).join(" + ");
    return { expr: expr, literals: best.lits };
  }

  /* ---------- simulators (also exported for tests) ---------- */
  function simulateCache(cfg, addrs) {
    var sets = [], steps = [], fifo = cfg.policy === "fifo";
    for (var s = 0; s < cfg.sets; s++) sets.push([]);
    var seen = {};
    addrs.forEach(function (a) {
      var block = Math.floor(a / cfg.block), set = block % cfg.sets, start = block * cfg.block;
      var lines = sets[set], k = lines.indexOf(start), hit = k !== -1;
      if (hit && !fifo) { lines.splice(k, 1); lines.unshift(start); }
      if (!hit) { lines.unshift(start); if (lines.length > cfg.ways) lines.pop(); }
      steps.push({ addr: a, set: set, start: start, hit: hit, cold: !hit && !seen[start] });
      seen[start] = true;
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
  function simulateMesi(reqs, cores) {
    cores = cores || 3;
    var st = [], rows = [];
    for (var c = 0; c < cores; c++) st.push("-");
    reqs.forEach(function (r) {
      var me = r.p, others = [];
      for (var q = 0; q < cores; q++) if (q !== me) others.push(q);
      var holders = others.filter(function (q2) { return st[q2] === "M" || st[q2] === "E" || st[q2] === "S"; });
      var mine = st[me], has = mine === "M" || mine === "E" || mine === "S", supplier;
      if (has) supplier = "-";
      else if (!holders.length) supplier = "Memory";
      else supplier = holders.map(function (q3) { return "P" + (q3 + 1); }).join(" or ");
      if (r.op === "R") {
        if (!has) {
          if (!holders.length) st[me] = "E";
          else { st[me] = "S"; holders.forEach(function (q4) { st[q4] = "S"; }); }
        }
      } else {
        st[me] = "M";
        holders.forEach(function (q5) { st[q5] = "I"; });
      }
      rows.push({ req: r, states: st.slice(), supplier: supplier, hit: has });
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
  /* Classic 5-stage pipeline. D = cycle the instruction is in ID. Registers are written in the first
     half of a cycle and read in the second half. Forwarding feeds EX only. */
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
    var stalls = D[D.length - 1] - ins.length;
    return { stalls: stalls, cycles: 5 + ins.length - 1 + stalls, D: D };
  }
  /* Minimum issue cycles. slots: { any: W } or { alu: 1, mem: 1 }; types[i] is "alu" or "mem". */
  function minSchedule(preds, slots, types) {
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
      var picks;
      if (slots.any) picks = combos(ready, Math.min(slots.any, ready.length));
      else {
        var alu = ready.filter(function (i2) { return types[i2] === "alu"; }), mem = ready.filter(function (i3) { return types[i3] === "mem"; });
        picks = [];
        (alu.length ? alu : [null]).forEach(function (a) { (mem.length ? mem : [null]).forEach(function (m) { picks.push([a, m].filter(function (x) { return x !== null; })); }); });
      }
      picks.forEach(function (c) {
        var t = s; c.forEach(function (i4) { t |= 1 << i4; });
        if (t !== s && dist[t] === undefined) { dist[t] = dist[s] + 1; queue.push(t); }
      });
    }
    return Infinity;
  }
  /* One optimal schedule for a two-issue machine (one ALU slot, one load/store slot):
     returns [[aluInstr|null, memInstr|null], ...] per cycle. */
  function bestSchedule(preds, types) {
    var n = preds.length, full = (1 << n) - 1, prev = {}, queue = [0];
    prev[0] = null;
    while (queue.length) {
      var s = queue.shift();
      if (s === full) break;
      var ready = [];
      for (var i = 0; i < n; i++) if (!(s & (1 << i)) && preds[i].every(function (q) { return s & (1 << q); })) ready.push(i);
      var alu = ready.filter(function (i2) { return types[i2] === "alu"; }), mem = ready.filter(function (i3) { return types[i3] === "mem"; });
      (alu.length ? alu : [null]).forEach(function (a) {
        (mem.length ? mem : [null]).forEach(function (m) {
          var t = s; if (a !== null) t |= 1 << a; if (m !== null) t |= 1 << m;
          if (t !== s && prev[t] === undefined) { prev[t] = { from: s, pick: [a, m] }; queue.push(t); }
        });
      });
    }
    var out = [], cur = full;
    while (prev[cur]) { out.unshift(prev[cur].pick); cur = prev[cur].from; }
    return out;
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
    return maxOf(depth);
  }

  /* =====================================================================
     Generators, keyed "topic/problem"
     ===================================================================== */
  var G = {};
  var CLASSES = ["ALU", "Load", "Store", "Branch"];

  /* ----- 1. Performance ----- */
  function mixTable(R) {
    var freq = percentSplit(R, 4, 10), cpi = CLASSES.map(function () { return R.int(1, 5); });
    return { freq: freq, cpi: cpi, eff: sum(freq.map(function (f, i) { return f / 100 * cpi[i]; })) };
  }
  function mixRows(m, hide) {
    return CLASSES.map(function (c, i) { return [c, m.freq[i] + "%", hide === i ? "?" : m.cpi[i]]; });
  }
  function cpiTerms(m) { return m.cpi.map(function (c, i) { return c + " × " + fmt(m.freq[i] / 100, 1); }).join(" + "); }

  G["performance/effective-cpi"] = variants([
    function (R) {
      var m = mixTable(R);
      return {
        prompt: p("A program runs on a processor with the instruction mix below. What is the effective CPI?") + table(["Class", "Frequency", "CPI"], mixRows(m)),
        fields: [num("cpi", "Effective CPI", round(m.eff, 2))],
        solution: p("Effective CPI = Σ CPI × frequency = " + cpiTerms(m) + " = <strong>" + fmt(m.eff) + "</strong>")
      };
    },
    function (R) {
      var m = mixTable(R), k = R.int(0, 3);
      var known = sum(m.freq.map(function (f, i) { return i === k ? 0 : f / 100 * m.cpi[i]; }));
      return {
        prompt: p("The effective CPI of a program is " + fmt(m.eff) + ". One CPI is missing from the table. What is it?") + table(["Class", "Frequency", "CPI"], mixRows(m, k)),
        fields: [num("c", CLASSES[k] + " CPI", m.cpi[k])],
        solution: p("The known classes contribute " + fmt(known) + " cycles per instruction, so " + fmt(m.freq[k] / 100, 1) + " × CPI = " + fmt(m.eff) + " − " + fmt(known) + " = " + fmt(m.eff - known) + ".") +
          p(CLASSES[k] + " CPI = " + fmt(m.eff - known) + " ÷ " + fmt(m.freq[k] / 100, 1) + " = <strong>" + m.cpi[k] + "</strong>")
      };
    },
    function (R) {
      var m = mixTable(R), total = R.pick([1000, 2000, 5000, 10000]);
      var counts = m.freq.map(function (f) { return f / 100 * total; }), cycles = sum(counts.map(function (c, i) { return c * m.cpi[i]; }));
      return {
        prompt: p("A program executes the instructions below. How many clock cycles does it take, and what is its effective CPI?") +
          table(["Class", "Instructions", "CPI"], CLASSES.map(function (c, i) { return [c, counts[i], m.cpi[i]]; })),
        fields: [num("cy", "Total cycles", cycles), num("cpi", "Effective CPI", round(cycles / total, 2))],
        solution: p("Cycles = " + counts.map(function (c, i) { return c + " × " + m.cpi[i]; }).join(" + ") + " = <strong>" + cycles + "</strong>") +
          p("CPI = cycles ÷ instructions = " + cycles + " ÷ " + total + " = <strong>" + fmt(cycles / total) + "</strong>")
      };
    },
    function (R) {
      var m, newCpi, desc;
      R.until(function () {
        m = mixTable(R);
        newCpi = m.cpi.slice();
        var opts = [
          function () { if (m.cpi[1] % 2) return false; newCpi[1] = m.cpi[1] / 2; return "loads run twice as fast (the Load CPI halves)"; },
          function () { var v = m.cpi[3] + R.int(1, 2); newCpi[3] = v; return "branches now take " + v + " cycles"; },
          function () { if (m.cpi[2] < 2) return false; newCpi[2] = m.cpi[2] - 1; return "stores take one cycle less"; },
          function () { newCpi[0] = m.cpi[0] * 2; return "ALU instructions take twice as many cycles"; }
        ];
        desc = R.shuffle([0, 1, 2, 3]).slice(0, 2).map(function (i) { return opts[i](); });
        return true;
      }, function () { return desc.every(Boolean); });
      var eff2 = sum(m.freq.map(function (f, i) { return f / 100 * newCpi[i]; }));
      var verdict = eff2 < m.eff - 1e-9 ? "faster" : eff2 > m.eff + 1e-9 ? "slower" : "the same";
      return {
        prompt: p("A program has the instruction mix below. A new processor design changes two things: " + desc.join(", and ") + ". The clock rate is unchanged.") +
          table(["Class", "Frequency", "CPI"], mixRows(m)) + p("What is the new effective CPI, and is the program faster or slower?"),
        fields: [num("cpi", "New effective CPI", round(eff2, 2)), choice("v", "The program is", ["faster", "slower", "the same"], verdict)],
        solution: p("Old CPI = " + cpiTerms(m) + " = " + fmt(m.eff) + ".") +
          p("New CPIs: " + CLASSES.map(function (c, i) { return c + " " + newCpi[i]; }).join(", ") + ". New CPI = " +
            newCpi.map(function (c, i) { return c + " × " + fmt(m.freq[i] / 100, 1); }).join(" + ") + " = <strong>" + fmt(eff2) + "</strong>, so the program is <strong>" + verdict + "</strong>.")
      };
    },
    function (R) {
      var m, a, b, ia, ib, gainA, gainB;
      R.until(function () {
        m = mixTable(R); ia = R.int(0, 3); ib = R.int(0, 3); a = R.int(1, 2); b = R.int(1, 3);
        gainA = m.freq[ia] / 100 * a; gainB = m.freq[ib] / 100 * b;
        return true;
      }, function () { return ia !== ib && m.cpi[ia] > a && m.cpi[ib] > b && Math.abs(gainA - gainB) > 0.05; });
      var best = gainA > gainB ? "A" : "B", newEff = m.eff - Math.max(gainA, gainB);
      return {
        prompt: p("A program has the instruction mix below. You can afford one improvement:") + table(["Class", "Frequency", "CPI"], mixRows(m)) +
          ul(["<strong>A</strong>: reduce the " + CLASSES[ia] + " CPI by " + a, "<strong>B</strong>: reduce the " + CLASSES[ib] + " CPI by " + b]) +
          p("Which improvement gives the lower effective CPI, and what is that CPI?"),
        fields: [choice("w", "Better improvement", ["A", "B"], best), num("cpi", "Resulting CPI", round(newEff, 2))],
        solution: p("Each improvement saves (frequency × cycles saved) cycles per instruction: A saves " + fmt(m.freq[ia] / 100, 1) + " × " + a + " = " + fmt(gainA) +
          ", B saves " + fmt(m.freq[ib] / 100, 1) + " × " + b + " = " + fmt(gainB) + ".") +
          p("<strong>" + best + "</strong> is better: CPI = " + fmt(m.eff) + " − " + fmt(Math.max(gainA, gainB)) + " = <strong>" + fmt(newEff) + "</strong>.")
      };
    }
  ]);

  var NICE_CPI = [1, 1.5, 2, 2.5, 3, 4];
  G["performance/cpu-time"] = variants([
    function (R) {
      var v = R.until(function () { return { ic: R.pick([1, 2, 3, 4, 5, 6, 8, 10]), cpi: R.pick(NICE_CPI), f: R.pick([1, 2, 4, 5]) }; },
        function (o) { return exact(o.ic * o.cpi / o.f, 2); });
      var t = v.ic * v.cpi / v.f;
      return {
        prompt: p("A program executes " + v.ic + " × 10⁹ instructions with an average CPI of " + v.cpi + " on a " + v.f + " GHz processor. What is its CPU time?"),
        fields: [num("t", "CPU time", t, { suffix: "s" })],
        solution: p("CPU time = instructions × CPI ÷ clock rate = " + v.ic + " × 10⁹ × " + v.cpi + " ÷ (" + v.f + " × 10⁹) = <strong>" + fmt(t) + " s</strong>")
      };
    },
    function (R) {
      var v = R.until(function () { return { ic: R.pick([1, 2, 3, 4, 6, 8]), cpi: R.pick(NICE_CPI), f: R.pick([1, 1.5, 2, 2.5, 3, 4]) }; },
        function (o) { var t = o.ic * o.cpi / o.f; return exact(t, 1) && t >= 1; });
      var t = v.ic * v.cpi / v.f;
      return {
        prompt: p("A processor runs a program of " + v.ic + " × 10⁹ instructions, with an average CPI of " + v.cpi + ", in " + fmt(t) + " seconds. What is its clock rate?"),
        fields: [num("f", "Clock rate", v.f, { suffix: "GHz" })],
        solution: p("Clock rate = instructions × CPI ÷ time = " + v.ic + " × 10⁹ × " + v.cpi + " ÷ " + fmt(t) + " s = <strong>" + v.f + " GHz</strong>")
      };
    },
    function (R) {
      var v = R.until(function () { return { ic: R.pick([1, 2, 4, 5, 8]), cpi: R.pick(NICE_CPI), f: R.pick([1, 2, 4]) }; },
        function (o) { return exact(o.ic * o.cpi / o.f, 2); });
      var t = v.ic * v.cpi / v.f;
      return {
        prompt: p("A " + v.f + " GHz processor runs a program of " + v.ic + " × 10⁹ instructions in " + fmt(t) + " seconds. What is the average CPI?"),
        fields: [num("c", "CPI", v.cpi)],
        solution: p("CPI = time × clock rate ÷ instructions = " + fmt(t) + " × " + v.f + " × 10⁹ ÷ (" + v.ic + " × 10⁹) = <strong>" + v.cpi + "</strong>")
      };
    },
    function (R) {
      var v = R.until(function () { return { ic: R.pick([1, 2, 4, 5, 10]), cpi: R.pick([1, 1.5, 2, 2.5, 3]), ps: R.pick([200, 250, 400, 500]) }; },
        function (o) { return exact(o.ic * o.cpi * o.ps / 1000, 2); });
      var ms = v.ic * v.cpi * v.ps / 1000;
      return {
        prompt: p("A processor has a clock cycle time of " + v.ps + " ps. A program executes " + v.ic + " million instructions with an average CPI of " + v.cpi + ". How many clock cycles does it take, and what is its CPU time in milliseconds?"),
        fields: [num("cy", "Clock cycles (millions)", v.ic * v.cpi), num("t", "CPU time", ms, { suffix: "ms" })],
        solution: p("Cycles = " + v.ic + " million × " + v.cpi + " = <strong>" + fmt(v.ic * v.cpi) + " million</strong>.") +
          p("Time = cycles × cycle time = " + fmt(v.ic * v.cpi) + " × 10⁶ × " + v.ps + " × 10⁻¹² s = <strong>" + fmt(ms) + " ms</strong>")
      };
    },
    function (R) {
      var v = R.until(function () { return { t: R.pick([10, 12, 15, 20, 30, 40, 60]), pIC: R.pick([50, 60, 75, 80, 90]), m: R.pick([1.1, 1.2, 1.25, 1.5, 2]) }; },
        function (o) { var t2 = o.t * o.pIC / 100 * o.m; return exact(t2, 2) && Math.abs(t2 - o.t) > 0.01; });
      var t2 = v.t * v.pIC / 100 * v.m, verdict = t2 < v.t ? "faster" : "slower";
      return {
        prompt: p("A program runs in " + v.t + " seconds. A new compiler generates only " + v.pIC + "% as many instructions, but the average CPI of the new code is " + v.m + " times higher. The clock rate is unchanged.") +
          p("How long does the program take now? Is it faster or slower?"),
        fields: [num("t", "New time", t2, { suffix: "s" }), choice("v", "The program is", ["faster", "slower"], verdict)],
        solution: p("Time is proportional to instructions × CPI, so new time = " + v.t + " × " + fmt(v.pIC / 100) + " × " + v.m + " = <strong>" + fmt(t2) + " s</strong>, which is <strong>" + verdict + "</strong>.")
      };
    },
    function (R) {
      var v = R.until(function () { return { f: R.pick([1, 2, 3, 4]), cpi: R.pick([0.5, 1, 1.25, 1.5, 2, 2.5, 4]) }; },
        function (o) { return exact(o.f * 1000 / o.cpi, 0); });
      var mips = v.f * 1000 / v.cpi;
      return {
        prompt: p("A " + v.f + " GHz processor has an average CPI of " + v.cpi + ". What is its MIPS rating (millions of instructions per second)?"),
        fields: [num("m", "MIPS", mips)],
        solution: p("MIPS = clock rate ÷ (CPI × 10⁶) = " + v.f + " × 10⁹ ÷ (" + v.cpi + " × 10⁶) = <strong>" + mips + "</strong>")
      };
    }
  ]);

  /* (f, s) pairs whose Amdahl speedup is exact to two decimals */
  var AMDAHL = [];
  [20, 25, 40, 50, 60, 75, 80, 90].forEach(function (f) {
    [2, 3, 4, 5, 8, 10, 16, 20].forEach(function (s) {
      var sp = 1 / ((1 - f / 100) + f / 100 / s);
      if (exact(sp, 2) && sp > 1.05) AMDAHL.push({ f: f, s: s, sp: round(sp, 2) });
    });
  });
  G["performance/amdahl"] = variants([
    function (R) {
      var c = R.pick(AMDAHL), fr = c.f / 100;
      return {
        prompt: p("An improvement makes " + c.f + "% of a program's execution time run " + c.s + " times faster. What is the overall speedup?"),
        fields: [num("sp", "Overall speedup", c.sp)],
        solution: p("Speedup = 1 ÷ ((1 − f) + f ÷ s) = 1 ÷ (" + fmt(1 - fr) + " + " + fmt(fr) + " ÷ " + c.s + ") = 1 ÷ " + fmt((1 - fr) + fr / c.s, 4) + " = <strong>" + fmt(c.sp) + "</strong>")
      };
    },
    function (R) {
      var f = R.pick([50, 75, 80, 90, 95, 60]), max = 1 / (1 - f / 100);
      return {
        prompt: p(f + "% of a program's execution time can be sped up; the rest cannot. What is the largest overall speedup possible, no matter how much the " + f + "% is improved?"),
        fields: [num("m", "Maximum speedup", round(max, 2))],
        solution: p("As the improved part's time shrinks to 0, speedup → 1 ÷ (1 − f) = 1 ÷ " + fmt(1 - f / 100) + " = <strong>" + fmt(max) + "</strong>")
      };
    },
    function (R) {
      var c = R.pick(AMDAHL);
      return {
        prompt: p(c.f + "% of a program's execution time can be sped up. By what factor must that part be sped up to make the whole program " + fmt(c.sp) + " times faster?"),
        fields: [num("s", "Required factor", c.s)],
        solution: p("Solve " + fmt(c.sp) + " = 1 ÷ ((1 − f) + f ÷ s): (1 − f) + f ÷ s = 1 ÷ " + fmt(c.sp) + " = " + fmt(1 / c.sp, 4) + ", so f ÷ s = " + fmt(1 / c.sp - (1 - c.f / 100), 4) + " and s = " + fmt(c.f / 100) + " ÷ " + fmt(1 / c.sp - (1 - c.f / 100), 4) + " = <strong>" + c.s + "</strong>")
      };
    },
    function (R) {
      var c = R.pick(AMDAHL.filter(function (x) { return [2, 4, 8, 16].indexOf(x.s) !== -1; }));
      return {
        prompt: p("A program spends " + c.f + "% of its time in code that can be split perfectly across cores; the rest runs on one core. What is the speedup on " + c.s + " cores?"),
        fields: [num("sp", "Speedup", c.sp)],
        solution: p("Amdahl's law with s = " + c.s + " cores: 1 ÷ (" + fmt(1 - c.f / 100) + " + " + fmt(c.f / 100) + " ÷ " + c.s + ") = <strong>" + fmt(c.sp) + "</strong>")
      };
    },
    function (R) {
      var c = R.pick(AMDAHL.filter(function (x) { return [2, 4, 5, 10].indexOf(x.s) !== -1; }));
      return {
        prompt: p("Running on " + c.s + " cores makes a program " + fmt(c.sp) + " times faster. Assuming the parallel part speeds up perfectly, what percentage of the original execution time was parallelizable?"),
        fields: [num("f", "Parallel fraction", c.f, { suffix: "%" })],
        solution: p("1 ÷ " + fmt(c.sp) + " = (1 − f) + f ÷ " + c.s + ", so " + fmt(1 / c.sp, 4) + " = 1 − f × (1 − 1/" + c.s + "), giving f = " + fmt(1 - 1 / c.sp, 4) + " ÷ " + fmt(1 - 1 / c.s, 4) + " = <strong>" + c.f + "%</strong>")
      };
    }
  ]);

  G["performance/compare"] = variants([
    function (R) {
      var o = R.until(function () { return { r1: R.pick([1, 2, 2.5, 4, 5]), r2: R.pick([1, 2, 2.5, 4, 5]), c1: R.pick(NICE_CPI), c2: R.pick(NICE_CPI) }; },
        function (x) { var a = x.c1 / x.r1, b = x.c2 / x.r2, r = Math.max(a, b) / Math.min(a, b); return r > 1.01 && exact(r, 2); });
      var t1 = o.c1 / o.r1, t2 = o.c2 / o.r2, faster = t1 < t2 ? "P1" : "P2", sp = Math.max(t1, t2) / Math.min(t1, t2);
      return {
        prompt: p("Two processors implement the same instruction set and run the same program.") + table(["Processor", "Clock rate", "CPI"], [["P1", o.r1 + " GHz", o.c1], ["P2", o.r2 + " GHz", o.c2]]) +
          p("Which one is faster, and by what factor?"),
        fields: [choice("w", "Faster processor", ["P1", "P2"], faster), num("sp", "Speedup", round(sp, 2))],
        solution: p("Time per instruction = CPI ÷ clock rate: P1 " + o.c1 + " ÷ " + o.r1 + " = " + fmt(t1, 3) + " ns, P2 " + o.c2 + " ÷ " + o.r2 + " = " + fmt(t2, 3) + " ns.") +
          p("<strong>" + faster + "</strong> is faster by " + fmt(Math.max(t1, t2), 3) + " ÷ " + fmt(Math.min(t1, t2), 3) + " = <strong>" + fmt(sp) + "</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { i1: R.pick([2, 3, 4, 5, 6]), i2: R.pick([2, 3, 4, 5, 6]), c1: R.pick([1, 1.5, 2, 3]), c2: R.pick([1, 1.5, 2, 3]), f: R.pick([1, 2]) }; },
        function (x) { var a = x.i1 * x.c1, b = x.i2 * x.c2, r = Math.max(a, b) / Math.min(a, b); return r > 1.01 && exact(r, 2) && x.i1 !== x.i2; });
      var t1 = o.i1 * o.c1 / o.f, t2 = o.i2 * o.c2 / o.f, faster = t1 < t2 ? "Compiler A" : "Compiler B", sp = Math.max(t1, t2) / Math.min(t1, t2);
      return {
        prompt: p("Two compilers produce different code for the same program, run on the same " + o.f + " GHz processor.") +
          table(["", "Instructions", "CPI"], [["Compiler A", o.i1 + " × 10⁹", o.c1], ["Compiler B", o.i2 + " × 10⁹", o.c2]]) + p("Which compiler's code runs faster, and by what factor?"),
        fields: [choice("w", "Faster code", ["Compiler A", "Compiler B"], faster), num("sp", "Speedup", round(sp, 2))],
        solution: p("Times: A " + o.i1 + " × " + o.c1 + " ÷ " + o.f + " = " + fmt(t1) + " s; B " + o.i2 + " × " + o.c2 + " ÷ " + o.f + " = " + fmt(t2) + " s.") +
          p("<strong>" + faster + "</strong> is faster by <strong>" + fmt(sp) + "</strong>.")
      };
    },
    function (R) {
      var o = R.until(function () { return { r1: R.pick([1, 2, 3, 4]), c1: R.pick(NICE_CPI), c2: R.pick(NICE_CPI) }; },
        function (x) { var r2 = x.r1 * x.c2 / x.c1; return x.c1 !== x.c2 && exact(r2, 2); });
      var r2 = o.r1 * o.c2 / o.c1;
      return {
        prompt: p("Processor P1 runs at " + o.r1 + " GHz with a CPI of " + o.c1 + ". Processor P2 runs the same program with a CPI of " + o.c2 + ". What clock rate does P2 need to match P1's execution time?"),
        fields: [num("f", "P2 clock rate", r2, { suffix: "GHz" })],
        solution: p("Equal times need CPI₁ ÷ f₁ = CPI₂ ÷ f₂, so f₂ = f₁ × CPI₂ ÷ CPI₁ = " + o.r1 + " × " + o.c2 + " ÷ " + o.c1 + " = <strong>" + fmt(r2) + " GHz</strong>")
      };
    },
    function (R) {
      var o = R.until(function () {
        var fr = percentSplit(R, 3, 10);
        return { fr: fr, a: [R.int(1, 4), R.int(1, 4), R.int(1, 4)], b: [R.int(1, 4), R.int(1, 4), R.int(1, 4)], fa: R.pick([1, 2, 4]), fb: R.pick([1, 2, 4]) };
      }, function (x) {
        var ca = sum(x.fr.map(function (f, i) { return f / 100 * x.a[i]; })), cb = sum(x.fr.map(function (f, i) { return f / 100 * x.b[i]; }));
        return Math.abs(ca / x.fa - cb / x.fb) > 0.01;
      });
      var names = ["ALU", "Load/Store", "Branch"];
      var ca = sum(o.fr.map(function (f, i) { return f / 100 * o.a[i]; })), cb = sum(o.fr.map(function (f, i) { return f / 100 * o.b[i]; }));
      var ta = ca / o.fa, tb = cb / o.fb, faster = ta < tb ? "P1" : "P2";
      return {
        prompt: p("A program's instruction mix and the CPI of each class on two processors are below.") +
          table(["Class", "Frequency", "CPI on P1 (" + o.fa + " GHz)", "CPI on P2 (" + o.fb + " GHz)"], names.map(function (n, i) { return [n, o.fr[i] + "%", o.a[i], o.b[i]]; })) +
          p("Give each processor's effective CPI, and say which runs the program faster."),
        fields: [num("a", "P1 CPI", round(ca, 2)), num("b", "P2 CPI", round(cb, 2)), choice("w", "Faster processor", ["P1", "P2"], faster)],
        solution: p("P1 CPI = " + o.a.map(function (c, i) { return c + " × " + fmt(o.fr[i] / 100, 1); }).join(" + ") + " = <strong>" + fmt(ca) + "</strong>; time per instruction " + fmt(ca) + " ÷ " + o.fa + " = " + fmt(ta, 3) + " ns.") +
          p("P2 CPI = " + o.b.map(function (c, i) { return c + " × " + fmt(o.fr[i] / 100, 1); }).join(" + ") + " = <strong>" + fmt(cb) + "</strong>; time per instruction " + fmt(cb) + " ÷ " + o.fb + " = " + fmt(tb, 3) + " ns.") +
          p("<strong>" + faster + "</strong> is faster.")
      };
    }
  ]);


  /* ----- 2. Memory hierarchy ----- */
  G["memory/amat"] = variants([
    function (R) {
      var o = R.until(function () { return { h: R.int(1, 2), m: R.pick([2, 4, 5, 10, 20]), pen: R.pick([20, 50, 100, 200]) }; }, function (x) { return exact(x.h + x.m / 100 * x.pen, 2); });
      var a = o.h + o.m / 100 * o.pen;
      return {
        prompt: p("A cache has a hit time of " + o.h + " cycle" + (o.h > 1 ? "s" : "") + ", a miss rate of " + o.m + "% and a miss penalty of " + o.pen + " cycles. What is the AMAT?"),
        fields: [num("a", "AMAT", round(a, 2), { suffix: "cycles" })],
        solution: p("AMAT = hit time + miss rate × miss penalty = " + o.h + " + " + fmt(o.m / 100) + " × " + o.pen + " = <strong>" + fmt(a) + " cycles</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { h1: 1, m1: R.pick([5, 10, 20]), h2: R.pick([10, 20]), m2: R.pick([10, 20, 25, 50]), mem: R.pick([100, 200]) }; },
        function (x) { return exact(x.h1 + x.m1 / 100 * (x.h2 + x.m2 / 100 * x.mem), 2); });
      var l2 = o.h2 + o.m2 / 100 * o.mem, a = o.h1 + o.m1 / 100 * l2;
      return {
        prompt: p("A processor has two cache levels. L1: hit time " + o.h1 + " cycle, miss rate " + o.m1 + "%. L2: hit time " + o.h2 + " cycles, local miss rate " + o.m2 + "%. Main memory takes " + o.mem + " cycles.") +
          p("What is the L1 miss penalty, and what is the AMAT?"),
        fields: [num("pen", "L1 miss penalty", round(l2, 2), { suffix: "cycles" }), num("a", "AMAT", round(a, 2), { suffix: "cycles" })],
        solution: p("L1 miss penalty = L2 hit time + L2 miss rate × memory time = " + o.h2 + " + " + fmt(o.m2 / 100) + " × " + o.mem + " = <strong>" + fmt(l2) + "</strong>") +
          p("AMAT = " + o.h1 + " + " + fmt(o.m1 / 100) + " × " + fmt(l2) + " = <strong>" + fmt(a) + " cycles</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { h: R.int(1, 2), m: R.pick([2, 5, 10]), pen: R.pick([50, 100, 200]), ps: R.pick([250, 500, 1000]) }; },
        function (x) { return exact((x.h + x.m / 100 * x.pen) * x.ps / 1000, 2); });
      var cyc = o.h + o.m / 100 * o.pen, ns = cyc * o.ps / 1000;
      return {
        prompt: p("A processor's clock cycle is " + o.ps + " ps. Its cache has a hit time of " + o.h + " cycle" + (o.h > 1 ? "s" : "") + ", a miss rate of " + o.m + "% and a miss penalty of " + o.pen + " cycles. What is the AMAT in nanoseconds?"),
        fields: [num("a", "AMAT", round(ns, 2), { suffix: "ns" })],
        solution: p("AMAT = " + o.h + " + " + fmt(o.m / 100) + " × " + o.pen + " = " + fmt(cyc) + " cycles = " + fmt(cyc) + " × " + o.ps + " ps = <strong>" + fmt(ns) + " ns</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { h: R.int(1, 2), m: R.pick([1, 2, 4, 5, 10]), pen: R.pick([50, 100, 200]) }; }, function (x) { return exact(x.h + x.m / 100 * x.pen, 2); });
      var target = o.h + o.m / 100 * o.pen;
      return {
        prompt: p("A cache has a hit time of " + o.h + " cycle" + (o.h > 1 ? "s" : "") + " and a miss penalty of " + o.pen + " cycles. What miss rate gives an AMAT of " + fmt(target) + " cycles?"),
        fields: [num("m", "Miss rate", o.m, { suffix: "%" })],
        solution: p("Miss rate = (AMAT − hit time) ÷ miss penalty = (" + fmt(target) + " − " + o.h + ") ÷ " + o.pen + " = <strong>" + o.m + "%</strong>")
      };
    }
  ]);

  G["memory/stall-cpi"] = variants([
    function (R) {
      var o = R.until(function () { return { base: R.pick([1, 1.5, 2]), mi: R.pick([1, 2, 4, 5]), md: R.pick([2, 4, 5, 10]), ls: R.pick([20, 25, 40, 50]), pen: R.pick([50, 100, 200]) }; },
        function (x) { return exact(x.base + x.mi / 100 * x.pen + x.ls / 100 * x.md / 100 * x.pen, 2); });
      var is = o.mi / 100 * o.pen, ds = o.ls / 100 * o.md / 100 * o.pen, cpi = o.base + is + ds;
      return {
        prompt: p("A processor has an ideal CPI of " + o.base + ". The instruction cache misses on " + o.mi + "% of instructions, the data cache misses on " + o.md + "% of data accesses, and " + o.ls + "% of instructions are loads or stores. Each miss costs " + o.pen + " cycles.") +
          p("What is the CPI including memory stalls?"),
        fields: [num("c", "CPI with stalls", round(cpi, 2))],
        solution: p("Instruction stalls = " + fmt(o.mi / 100) + " × " + o.pen + " = " + fmt(is) + "; data stalls = " + fmt(o.ls / 100) + " × " + fmt(o.md / 100) + " × " + o.pen + " = " + fmt(ds) + ".") +
          p("CPI = " + o.base + " + " + fmt(is) + " + " + fmt(ds) + " = <strong>" + fmt(cpi) + "</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { base: R.pick([1, 2]), stalls: R.pick([1, 2, 3, 4, 6]) }; }, function (x) { return exact((x.base + x.stalls) / x.base, 2); });
      var cpi = o.base + o.stalls;
      return {
        prompt: p("With a perfect cache a program would have a CPI of " + o.base + ". Memory stalls add " + o.stalls + " cycles per instruction on average. How many times faster would the program run with a perfect cache?"),
        fields: [num("s", "Speedup", round(cpi / o.base, 2))],
        solution: p("Actual CPI = " + o.base + " + " + o.stalls + " = " + cpi + ". Speedup = " + cpi + " ÷ " + o.base + " = <strong>" + fmt(cpi / o.base) + "</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { base: R.pick([1, 2]), mr: R.pick([1, 2, 4, 5]), pen: R.pick([50, 100]) }; },
        function (x) { var a = x.base + x.mr / 100 * x.pen, b = x.base + x.mr / 100 * x.pen * 2; return exact(b, 2) && exact(a / (b / 2), 2); });
      var a = o.base + o.mr / 100 * o.pen, b = o.base + o.mr / 100 * o.pen * 2, sp = a / (b / 2);
      return {
        prompt: p("A processor has an ideal CPI of " + o.base + " and " + o.mr + "% of instructions miss in the cache, each miss costing " + o.pen + " cycles. The clock rate is doubled, but memory is not faster, so a miss now costs " + 2 * o.pen + " cycles.") +
          p("What is the new CPI, and how much faster is the new processor?"),
        fields: [num("c", "New CPI", round(b, 2)), num("s", "Speedup", round(sp, 2))],
        solution: p("Old CPI = " + o.base + " + " + fmt(o.mr / 100) + " × " + o.pen + " = " + fmt(a) + "; new CPI = " + o.base + " + " + fmt(o.mr / 100) + " × " + 2 * o.pen + " = <strong>" + fmt(b) + "</strong>.") +
          p("The new cycle is half as long, so speedup = " + fmt(a) + " ÷ (" + fmt(b) + " ÷ 2) = <strong>" + fmt(sp) + "</strong> (well short of 2, because memory did not get faster).")
      };
    }
  ]);

  var LOC_FUNCS = [
    { lines: ["int max = a[0];", "for (int i = 1; i < n; i++)", "    if (a[i] > max) max = a[i];"], vars: ["a", "i", "n", "max"] },
    { lines: ["int sum = 0;", "for (int i = 0; i < n; i++)", "    sum += a[i];"], vars: ["a", "i", "n", "sum"] },
    { lines: ["int count = 0;", "for (int i = 0; i < n; i++)", "    if (a[i] % 2 == 0) count++;"], vars: ["a", "i", "n", "count"] }
  ];
  G["memory/locality"] = variants([
    function (R) {
      var s = R.pick(["sum", "total", "acc"]), M = R.pick([16, 32, 64]), N = R.pick([16, 32, 64, 128]), rowMajor = R.chance(0.5), gp = ["good", "poor"];
      var lines = ["int a[" + M + "][" + N + "];", "int " + s + " = 0;",
        rowMajor ? "for (int i = 0; i < " + M + "; i++)" : "for (int j = 0; j < " + N + "; j++)",
        rowMajor ? "    for (int j = 0; j < " + N + "; j++)" : "    for (int i = 0; i < " + M + "; i++)",
        "        " + s + " += a[i][j];"];
      var stride = rowMajor ? 1 : N, good = rowMajor ? "good" : "poor";
      return {
        prompt: p("Consider this C code (ints are 4 bytes, cache blocks are 64 bytes, C arrays are row-major):") + pre(lines),
        fields: [num("stride", "Stride between consecutive accesses to a (elements)", stride), choice("sp", "Spatial locality of a", gp, good),
          choice("ta", "Temporal locality of a", gp, "poor"), choice("ts", "Temporal locality of " + s, gp, "good")],
        solution: p(rowMajor ? "The inner loop walks along a row, which is contiguous: stride 1." : "The inner loop walks down a column; each row holds " + N + " ints, so the stride is " + N + ".") +
          p("Spatial locality of a is <strong>" + good + "</strong>; temporal locality of a is <strong>poor</strong> (each element is used once); " + s + " has <strong>good</strong> temporal locality (used every iteration).")
      };
    },
    function (R) {
      var fn = R.pick(LOC_FUNCS), opts = ["temporal", "spatial", "both", "neither"];
      return {
        prompt: p("Consider this C code, where a is an int array of n elements:") + pre(fn.lines) + p("For each variable, which kind of locality do its accesses have?"),
        fields: fn.vars.map(function (v) { return choice("v" + v, v, opts, v === "a" ? "spatial" : "temporal"); }),
        solution: p("<strong>a</strong>: spatial — consecutive elements are read in order (stride 1), but each element is read only once, so no temporal locality.") +
          p("<strong>" + fn.vars.slice(1).join("</strong>, <strong>") + "</strong>: temporal — each is accessed on every iteration.")
      };
    },
    function (R) {
      var colMajor = R.chance(0.6), vals = R.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]).slice(0, 9);
      var m = [vals.slice(0, 3), vals.slice(3, 6), vals.slice(6, 9)], order = [];
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) order.push(colMajor ? m[b][a] : m[a][b]);
      return {
        prompt: p("Write out how this 3 × 3 matrix is laid out in memory in a <strong>" + (colMajor ? "column" : "row") + "-major</strong> language, as a comma-separated list.") +
          table(["", "col 0", "col 1", "col 2"], m.map(function (r, i) { return ["row " + i].concat(r); })),
        fields: [{ id: "o", label: "Memory order", kind: "list", answer: order, size: 30 }],
        solution: p((colMajor ? "Column-major stores each column in turn" : "Row-major stores each row in turn") + ": <strong>" + order.join(", ") + "</strong>")
      };
    },
    function (R) {
      var N = R.pick([4, 8, 10, 16]), M = R.pick([4, 8, 10]), i = R.int(1, M - 1), j = R.int(0, N - 1), base = R.pick([0x1000, 0x2000, 0x4000, 0x8000]);
      var off = 4 * (i * N + j);
      return {
        prompt: p("An array " + code("int a[" + M + "][" + N + "]") + " (4-byte ints, row-major) starts at address " + code(hex(base, 4)) + ". At what byte offset from the start, and at what address, is " + code("a[" + i + "][" + j + "]") + "?"),
        fields: [num("o", "Byte offset (decimal)", off), { id: "a", label: "Address", kind: "hex", answer: base + off, size: 10 }],
        solution: p("Offset = 4 × (i × " + N + " + j) = 4 × (" + i + " × " + N + " + " + j + ") = <strong>" + off + "</strong> bytes; address = " + hex(base, 4) + " + " + off + " = <strong>" + hex(base + off, 4) + "</strong>")
      };
    }
  ]);

  G["memory/miss-types"] = variants([
    function (R) {
      var lines = 4, B = R.pick([2, 4]), seq, kinds;
      R.until(function () {
        seq = [];
        for (var i = 0; i < 8; i++) seq.push(seq.length && R.chance(0.5) ? R.pick(seq) : R.int(0, 11));
        kinds = classifyMisses(lines, seq); return true;
      }, function () { return kinds.indexOf("conflict miss") !== -1 && kinds.indexOf("hit") !== -1; });
      var addrs = seq.map(function (blk) { return blk * B + R.int(0, B - 1); });
      var opts = ["hit", "cold miss", "conflict miss", "capacity miss"];
      return {
        prompt: p("A direct-mapped cache holds 4 blocks of " + B + " bytes and starts empty. " + alignNote(B) + " Block k goes in line k mod 4. Classify each access to the byte addresses below.") +
          p("A miss is a <em>conflict</em> miss if a fully associative LRU cache of the same size would have hit, and a <em>capacity</em> miss otherwise. The first access to a block is a <em>cold</em> miss."),
        table: { head: ["Access", "Address", "Result"], rows: addrs.map(function (a2, i) { return [i + 1, a2, { f: "k" + i }]; }) },
        fields: kinds.map(function (k, i) { return choice("k" + i, "", opts, k); }),
        solution: table(["Access", "Address", "Block (bytes)", "Line", "Result"], seq.map(function (blk, i) {
          return [i + 1, addrs[i], blk + " (" + blk * B + "–" + (blk * B + B - 1) + ")", blk % lines, "<strong>" + kinds[i] + "</strong>"];
        }))
      };
    },
    function (R) {
      var lines = R.pick([2, 4]), B = R.pick([2, 4]), seq = [];
      for (var i = 0; i < 10; i++) seq.push(seq.length && R.chance(0.5) ? R.pick(seq) : R.int(0, 9));
      var addrs = seq.map(function (blk) { return blk * B + R.int(0, B - 1); });
      var kinds = classifyMisses(lines, seq), cnt = function (k) { return kinds.filter(function (x) { return x === k; }).length; };
      return {
        prompt: p("A direct-mapped cache holds " + lines + " blocks of " + B + " bytes and starts empty. " + alignNote(B) + " The processor accesses these byte addresses in order:") + p(code(addrs.join(", "))) +
          p("How many hits and how many cold misses occur? How many of the other misses are conflict misses (a fully associative LRU cache of the same size would have hit)?"),
        fields: [num("h", "Hits", cnt("hit")), num("c", "Cold misses", cnt("cold miss")), num("x", "Conflict misses", cnt("conflict miss"))],
        solution: table(["Address", "Block (bytes)", "Line", "Result"], seq.map(function (blk, i) { return [addrs[i], blk + " (" + blk * B + "–" + (blk * B + B - 1) + ")", blk % lines, kinds[i]]; })) +
          p("Hits " + cnt("hit") + ", cold " + cnt("cold miss") + ", conflict " + cnt("conflict miss") + ", capacity " + cnt("capacity miss") + ".")
      };
    }
  ]);

  /* ----- 3. Cache organization ----- */
  /* Exam style: break each address into tag / index / offset and say whether it hits. */
  function addressTable(R) {
    var m = R.pick([8, 12]), ob = R.int(1, 2), ib = R.int(2, 3), tb = m - ob - ib, sets = 1 << ib, block = 1 << ob;
    var addrs = [];
    for (var i = 0; i < 6; i++) {
      var a = addrs.length && R.chance(0.45) ? (R.pick(addrs) ^ R.int(0, block - 1)) : R.int(0, (1 << m) - 1);
      addrs.push(a & ((1 << m) - 1));
    }
    var sim = simulateCache({ ways: 1, sets: sets, block: block, policy: "lru" }, addrs), fields = [], rows = [];
    addrs.forEach(function (a, i) {
      var off = a & (block - 1), idx = (a >> ob) & (sets - 1), tag = a >> (ob + ib);
      fields.push({ id: "t" + i, label: "tag", kind: "bits", width: tb, answer: bin(tag, tb), size: Math.max(4, tb + 1) },
        { id: "i" + i, label: "index", kind: "bits", width: ib, answer: bin(idx, ib), size: Math.max(4, ib + 1) },
        { id: "o" + i, label: "offset", kind: "bits", width: ob, answer: bin(off, ob), size: Math.max(4, ob + 1) },
        choice("h" + i, "result", ["hit", "miss"], sim.steps[i].hit ? "hit" : "miss"));
      rows.push([code(hex(a, m / 4)), { f: "t" + i }, { f: "i" + i }, { f: "o" + i }, { f: "h" + i }]);
    });
    return {
      prompt: p("A direct-mapped cache uses " + m + "-bit byte addresses: a " + tb + "-bit tag, a " + ib + "-bit index and a " + ob + "-bit offset. It starts empty. For each address in order, write its tag, index and offset bits and say whether it hits."),
      table: { head: ["Address", "Tag", "Index", "Offset", "Hit/miss"], rows: rows },
      fields: fields, wide: true,
      solution: table(["Address", "Binary", "Tag", "Index", "Offset", "Result"], addrs.map(function (a, i) {
        return [hex(a, m / 4), code(bin(a >> (ob + ib), tb) + " " + bin((a >> ob) & (sets - 1), ib) + " " + bin(a & (block - 1), ob)),
          bin(a >> (ob + ib), tb), bin((a >> ob) & (sets - 1), ib), bin(a & (block - 1), ob), "<strong>" + (sim.steps[i].hit ? "hit" : "miss") + "</strong>"];
      })) + p("An access hits when its line already holds the same tag.")
    };
  }

  G["caches/address-bits"] = variants([addressTable, addressTable,
    function (R) {
      var abits = R.pick([16, 32]), size = Math.pow(2, abits === 16 ? R.int(8, 12) : R.int(10, 15));
      var block = Math.pow(2, R.int(2, 6)), blocks = size / block, assoc = R.pick([1, 2, 4, 8].filter(function (a) { return a <= blocks; }));
      var sets = blocks / assoc, ob = Math.log2(block), ib = Math.log2(sets), tb = abits - ob - ib;
      var kb = size >= 1024 ? (size / 1024) + " KiB" : size + "-byte";
      var org = assoc === 1 ? "direct-mapped" : assoc + "-way set-associative";
      return {
        prompt: p("A " + kb + " " + org + " cache has " + block + "-byte blocks. Addresses are " + abits + " bits and refer to bytes. How many bits are used for the offset, index and tag?"),
        fields: [num("o", "Offset bits", ob), num("i", "Index bits", ib), num("t", "Tag bits", tb)],
        solution: (function () {
          var c = Math.log2(size), a = Math.log2(assoc);
          return p("Capacity " + kb.replace("-byte", " bytes") + " = " + pow2(c) + " bytes; blocks are " + block + " = " + pow2(ob) + " bytes, so there are " + pow2(c) + " ÷ " + pow2(ob) + " = " + pow2(c - ob) + " = " + blocks + " blocks.") +
            p(assoc === 1 ? "Direct-mapped: one block per set, so " + pow2(ib) + " sets." : assoc + "-way: " + pow2(c - ob) + " ÷ " + pow2(a) + " = " + pow2(ib) + " = " + sets + " sets.") +
            p("Offset = <strong>" + ob + "</strong> bits (" + pow2(ob) + " bytes per block); index = <strong>" + ib + "</strong> bits (" + pow2(ib) + " sets); tag = " + abits + " − " + ob + " − " + ib + " = <strong>" + tb + "</strong> bits.");
        })()
      };
    },
    function (R) {
      var words = Math.pow(2, R.int(9, 12)), bw = R.pick([2, 4, 8]), assoc = R.pick([1, 2, 4, 16]);
      var bytes = words * 4, block = bw * 4, sets = bytes / block / assoc, ob = Math.log2(block), ib = Math.log2(sets), tb = 32 - ob - ib;
      return {
        prompt: p("A 32-bit machine has a " + (assoc === 1 ? "direct-mapped" : assoc + "-way set-associative") + " cache holding " + words + " words (1 word = 4 bytes). Each block holds " + bw + " words. Addresses refer to bytes. How long are the tag, set index and block offset?"),
        fields: [num("t", "Tag bits", tb), num("i", "Index bits", ib), num("o", "Offset bits", ob)],
        solution: (function () {
          var w = Math.log2(words), c = w + 2, a = Math.log2(assoc);
          return p("Capacity = " + pow2(w) + " words × " + pow2(2) + " bytes = " + pow2(c) + " bytes; a block is " + bw + " words = " + pow2(Math.log2(bw)) + " × " + pow2(2) + " = " + pow2(ob) + " bytes.") +
            p("Sets = " + pow2(c) + " ÷ " + pow2(ob) + (assoc > 1 ? " ÷ " + pow2(a) : "") + " = " + pow2(ib) + " = " + sets + ".") +
            p("Offset = <strong>" + ob + "</strong>, index = <strong>" + ib + "</strong>, tag = 32 − " + ob + " − " + ib + " = <strong>" + tb + "</strong>");
        })()
      };
    },
    function (R) {
      var ob = R.int(2, 6), ib = R.int(4, 10), assoc = R.pick([1, 2, 4]), tb = 32 - ob - ib;
      var size = Math.pow(2, ob) * Math.pow(2, ib) * assoc;
      return {
        prompt: p("A " + (assoc === 1 ? "direct-mapped" : assoc + "-way set-associative") + " cache uses 32-bit byte addresses with a " + tb + "-bit tag, a " + ib + "-bit index and a " + ob + "-bit offset. What is the block size, and what is the capacity in bytes?"),
        fields: [num("b", "Block size", Math.pow(2, ob), { suffix: "bytes" }), num("c", "Capacity", size, { suffix: "bytes" })],
        solution: p("Block = " + pow2(ob) + " = <strong>" + Math.pow(2, ob) + "</strong> bytes; sets = " + pow2(ib) + (assoc > 1 ? "; ways = " + pow2(Math.log2(assoc)) : "") + ".") +
          p("Capacity = " + pow2(ob) + " × " + pow2(ib) + (assoc > 1 ? " × " + pow2(Math.log2(assoc)) : "") + " = " + pow2(ob + ib + Math.log2(assoc)) + " = <strong>" + size + "</strong> bytes.")
      };
    }
  ]);

  function cacheCfg(R) {
    var ways = R.pick([1, 2, 2, 4]), sets = ways === 4 ? R.pick([1, 2]) : R.pick([2, 4]), block = R.pick([2, 4]);
    return { ways: ways, sets: sets, block: block, policy: ways > 1 && R.chance(0.35) ? "fifo" : "lru" };
  }
  function cfgText(c) {
    var org = c.ways === 1 ? "direct-mapped" : c.sets === 1 ? "fully associative" : c.ways + "-way set-associative";
    return "a " + org + " cache with " + c.block + "-byte blocks and a capacity of " + (c.ways * c.sets * c.block) + " bytes (" + c.sets + " set" + (c.sets > 1 ? "s" : "") + ")" +
      (c.ways > 1 ? ", using " + (c.policy === "fifo" ? "FIFO" : "LRU") + " replacement" : "");
  }
  function randomAddrs(R, n, max) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(a.length && R.chance(0.45) ? R.pick(a) + R.int(-1, 1) : R.int(0, max));
    return a.map(function (x) { return Math.max(0, Math.min(max, x)); });
  }
  function simSolution(c, sim) {
    return table(["Address", "Block", "Set", "Result"], sim.steps.map(function (s) {
      return [s.addr, s.start + "–" + (s.start + c.block - 1), s.set, s.hit ? "hit" : "miss"];
    }));
  }

  /* Exam style: fill in every line of the cache, byte by byte, then list the accesses that hit. */
  function cacheTableProblem(R) {
    var ways = R.pick([1, 2, 2]), sets = ways === 1 ? 4 : R.pick([2, 4]), block = ways * sets >= 8 ? R.pick([2, 4]) : R.pick([2, 4]);
    var c = { ways: ways, sets: sets, block: block, policy: ways > 1 && R.chance(0.3) ? "fifo" : "lru" };
    var addrs = randomAddrs(R, 10, 6 * c.sets * c.block - 1);
    var stop = R.chance(0.35) ? R.int(5, 8) : 10;           /* sometimes: the state part-way through */
    var sim = simulateCache(c, addrs.slice(0, stop)), full = simulateCache(c, addrs);
    var hitList = full.steps.map(function (st, i) { return st.hit ? i + 1 : null; }).filter(function (x) { return x !== null; });
    var fields = [], rows = [], setBits = Math.log2(c.sets);
    sim.sets.forEach(function (lines, si) {
      var answer = lines.map(function (start) { var b = []; for (var k = 0; k < c.block; k++) b.push(start + k); return b; });
      fields.push({ id: "c" + si, label: "Set " + si, kind: "cacheset", ways: c.ways, block: c.block, answer: answer, size: 3 });
      for (var w = 0; w < c.ways; w++) {
        var row = [w === 0 ? (setBits ? bin(si, setBits) : "0") : ""];
        for (var b = 0; b < c.block; b++) row.push({ f: "c" + si, part: w + "_" + b });
        row.push(w === 0 ? { mark: "c" + si } : "");
        rows.push(row);
      }
    });
    fields.push({ id: "hits", label: "Accesses that hit", kind: "set", answer: hitList, size: 16 });
    var head = ["Set"];
    for (var b2 = 0; b2 < c.block; b2++) head.push("Byte " + b2);
    head.push("");
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. " + alignNote(c.block) + " These byte addresses are accessed in order:") +
        table(["Access"].concat(addrs.map(function (_, i) { return i + 1; })), [["Address"].concat(addrs)]) +
        p("Fill in the cache " + (stop < 10 ? "<strong>after access " + stop + "</strong> (address " + addrs[stop - 1] + ")" : "<strong>after all accesses</strong>") +
          ": write the byte addresses held in each line (lines and bytes in any order; leave unused lines blank). Then list the numbers of the accesses that hit, over all 10 accesses."),
      table: { head: head, rows: rows, groups: c.ways },
      wide: true,
      fields: fields,
      solution: simSolution(c, full) + p("Cache " + (stop < 10 ? "after access " + stop : "at the end") + ": " + sim.sets.map(function (l, si) {
        return "set " + si + ": " + (l.length ? l.map(function (st) { return st + "–" + (st + c.block - 1); }).join(", ") : "empty");
      }).join("; ") + ". Hits on accesses <strong>" + (hitList.length ? hitList.join(", ") : "none") + "</strong>.")
    };
  }

  G["caches/cache-sim"] = variants([cacheTableProblem, function (R) {
    var c = cacheCfg(R), addrs = randomAddrs(R, 10, 6 * c.sets * c.block - 1), sim = simulateCache(c, addrs);
    var hits = sim.steps.filter(function (s) { return s.hit; }).length;
    var fields = sim.sets.map(function (lines, s) { return { id: "set" + s, label: "Set " + s, kind: "set", answer: lines.slice().sort(function (a, b) { return a - b; }), size: 10 }; });
    fields.push(num("hits", "Number of hits", hits));
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. " + alignNote(c.block) + " These byte addresses are accessed in order:") + p(code(addrs.join(", "))) +
        p("Which blocks are in each set at the end? Give the lowest byte address of each block, separated by commas (any order; blank if empty)."),
      fields: fields,
      solution: simSolution(c, sim) + p("Final contents: " + sim.sets.map(function (l, s) {
        return "set " + s + ": " + (l.length ? l.map(function (b) { return b + "–" + (b + c.block - 1); }).join(", ") : "empty");
      }).join("; ") + ". Hits: <strong>" + hits + "</strong>." + (c.policy === "fifo" ? " With FIFO, a hit does not change which block is evicted next." : ""))
    };
  }]);

  G["caches/hit-rate"] = function (R) {
    var c = cacheCfg(R), addrs = randomAddrs(R, 10, 5 * c.sets * c.block - 1), sim = simulateCache(c, addrs);
    var hits = sim.steps.filter(function (s) { return s.hit; }).length, cold = sim.steps.filter(function (s) { return s.cold; }).length;
    var fields = sim.steps.map(function (s, i) { return choice("h" + i, "", ["hit", "miss"], s.hit ? "hit" : "miss"); });
    fields.push(num("rate", "Hit rate", hits * 10, { suffix: "%" }), num("cold", "Cold misses", cold));
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. " + alignNote(c.block) + " Mark each access below as a hit or a miss, then give the hit rate and the number of cold misses."),
      table: { head: ["Access", "Address", "Result"], rows: addrs.map(function (a, i) { return [i + 1, a, { f: "h" + i }]; }) },
      fields: fields,
      solution: simSolution(c, sim) + p("Hit rate = " + hits + " ÷ 10 = <strong>" + hits * 10 + "%</strong>; cold misses (first touch of a block): <strong>" + cold + "</strong>")
    };
  };


  /* ----- 4. Numbers and logic ----- */
  function sx(n, w) { n &= (1 << w) - 1; return n >= (1 << (w - 1)) ? n - (1 << w) : n; }
  G["logic/twos-complement"] = variants([
    function (R) {
      var w = R.pick([6, 8]), lim = 1 << (w - 1), v = R.until(function () { return R.int(-lim, lim - 1); }, function (x) { return x !== 0; }), b = bin(v & ((1 << w) - 1), w);
      return {
        prompt: p("Write " + v + " as " + aN(w) + "-bit two's complement number."),
        fields: [{ id: "b", label: "Binary", kind: "bits", width: w, answer: b, size: 12 }],
        solution: v >= 0 ? p(v + " = <strong>" + b + "</strong>") : p(-v + " = " + bin(-v, w) + "; invert: " + bin(~(-v) & ((1 << w) - 1), w) + "; add 1: <strong>" + b + "</strong>")
      };
    },
    function (R) {
      var w = R.pick([6, 8]), lim = 1 << (w - 1), v = R.int(-lim, lim - 1), b = bin(v & ((1 << w) - 1), w);
      return {
        prompt: p("What decimal value does the " + w + "-bit two's complement number " + code(b) + " represent?"),
        fields: [num("d", "Decimal", v)],
        solution: p(b[0] === "1" ? "Sign bit 1: value = " + (v & ((1 << w) - 1)) + " − " + (1 << w) + " = <strong>" + v + "</strong>" : "Sign bit 0: value = <strong>" + v + "</strong>")
      };
    },
    function (R) {
      var byte = R.int(0, 255), ext = byte >= 128 ? (0xff00 | byte) : byte;
      return {
        prompt: p("Sign-extend the 8-bit value " + code(hex(byte, 2)) + " to 16 bits, in hexadecimal."),
        fields: [{ id: "h", label: "16-bit value", kind: "hex", answer: ext, size: 10 }],
        solution: p("The sign bit of " + bin(byte, 8) + " is " + (byte >> 7) + ", so the new upper byte is " + (byte >> 7 ? "FF" : "00") + ": <strong>" + hex(ext, 4) + "</strong>")
      };
    },
    function (R) {
      var n = R.int(4, 16), lo = -Math.pow(2, n - 1), hi = Math.pow(2, n - 1) - 1;
      return { prompt: p("What range of values can " + aN(n) + "-bit two's complement number hold?"), fields: [num("lo", "Smallest", lo), num("hi", "Largest", hi)], solution: p("−2^" + (n - 1) + " to 2^" + (n - 1) + " − 1: <strong>" + lo + "</strong> to <strong>" + hi + "</strong>") };
    },
    function (R) {
      var w = R.pick([6, 8]), v = -R.int(1, (1 << (w - 1)) - 1), kind = R.pick(["one's complement", "sign-magnitude"]), mask = (1 << w) - 1;
      var b = kind === "one's complement" ? bin(~(-v) & mask, w) : "1" + bin(-v, w - 1);
      return {
        prompt: p("Write " + v + " as " + aN(w) + "-bit <strong>" + kind + "</strong> number."),
        fields: [{ id: "b", label: "Binary", kind: "bits", width: w, answer: b, size: 12 }],
        solution: p(kind === "one's complement" ? "Write " + -v + " = " + bin(-v, w) + " and invert every bit: <strong>" + b + "</strong> (no +1, unlike two's complement)."
          : "Sign bit 1, then " + -v + " in the remaining " + (w - 1) + " bits: <strong>" + b + "</strong>")
      };
    },
    function (R) {
      var v = R.int(-100, 100), sh = R.int(1, 3), u = v & 0xff, arith = R.chance(0.5);
      var res = arith ? ((v >> sh) & 0xff) : (u >>> sh);
      return {
        prompt: p("An 8-bit register holds " + code(bin(u, 8)) + ". What does it hold after a <strong>" + (arith ? "arithmetic" : "logical") + "</strong> right shift by " + sh + "?"),
        fields: [{ id: "b", label: "Result", kind: "bits", width: 8, answer: bin(res, 8), size: 12 }],
        solution: p((arith ? "An arithmetic shift copies the sign bit (" + (u >> 7) + ") into the vacated bits" : "A logical shift fills the vacated bits with 0") + ": <strong>" + bin(res, 8) + "</strong>")
      };
    }
  ]);

  G["logic/binary-add"] = function (R) {
    var w = R.pick([6, 8]), lim = 1 << (w - 1), mask = (1 << w) - 1, a = R.int(-lim, lim - 1), b = R.int(-lim, lim - 1), sub = R.chance(0.4);
    var ua = a & mask, ub = b & mask, raw = sub ? ua + ((~ub) & mask) + 1 : ua + ub, res = raw & mask, carry = (raw >> w) & 1;
    var exactSum = sub ? a - b : a + b, ovf = exactSum < -lim || exactSum > lim - 1;
    var fields = [{ id: "r", label: w + "-bit result", kind: "bits", width: w, answer: bin(res, w), size: 12 }, choice("o", "Signed overflow?", YN, ovf ? "yes" : "no")];
    if (!sub) fields.push(choice("c", "Carry out", ["0", "1"], String(carry)));
    return {
      prompt: p((sub ? "Subtract" : "Add") + " these " + w + "-bit two's complement numbers: " + code(bin(ua, w)) + (sub ? " − " : " + ") + code(bin(ub, w)) + ". Does signed overflow occur?"),
      fields: fields,
      solution: p("In decimal: " + a + (sub ? " − " : " + ") + b + " = " + exactSum + ".") +
        (sub ? p("Subtraction adds the two's complement: " + bin(ua, w) + " + " + bin(((~ub) + 1) & mask, w) + ".") : "") +
        p("Result <strong>" + bin(res, w) + "</strong> (" + sx(res, w) + "). " + (ovf ? "<strong>Overflow</strong>: " + exactSum + " is outside " + -lim + " to " + (lim - 1) + "." : "<strong>No overflow</strong>.") + (sub ? "" : " Carry out <strong>" + carry + "</strong>."))
    };
  };

  var SIMPLE_FORMS = ["x", "xy", "x+y", "xy+z", "x'y+xz", "xy+yz+xz", "xy'+x'y", "x+yz", "x'z+y", "xyz+x'y'z'", "x'y'+z", "xz+y'z"];
  var NUM_CONDS = [
    { t: "the number is negative", two: true, f: function (n) { return n < 0; } },
    { t: "the number is odd", two: false, f: function (n) { return n % 2 !== 0; } },
    { t: "the number is at least 4", two: false, f: function (n) { return n >= 4; } },
    { t: "the number is greater than 2", two: false, f: function (n) { return n > 2; } },
    { t: "the number is 0", two: true, f: function (n) { return n === 0; } },
    { t: "the number is a multiple of 3", two: false, f: function (n) { return n % 3 === 0; } },
    { t: "the number is between −2 and 1 (inclusive)", two: true, f: function (n) { return n >= -2 && n <= 1; } },
    { t: "the number is 1 or 2", two: false, f: function (n) { return n === 1 || n === 2; } }
  ];
  G["logic/boolean-simplify"] = variants([
    function (R) {
      var vars = ["x", "y", "z"], target = remapExpr(R.pick(SIMPLE_FORMS), randomRemap(R, vars)), tt = ttOf(target, vars), best = minSop(tt, vars);
      var given = minterms(tt).map(function (m) { return mintermText(m, vars); }).join(" + ");
      return {
        prompt: p("Simplify") + p("<span class=\"expr\">F = " + esc(given) + "</span>") + p("Type " + code("x'") + " for NOT x, " + code("+") + " for OR, and put variables side by side for AND."),
        fields: [{ id: "e", label: "F =", kind: "bool", vars: vars, table: tt, maxLiterals: best.literals, example: best.expr, size: 22 }],
        solution: p("A simplest form is <strong>F = " + esc(best.expr) + "</strong> (" + best.literals + " literals). Combine minterms that differ in one variable using xy + xy' = x.")
      };
    },
    function (R) {
      var vars = ["a", "b", "c"], cond = R.pick(NUM_CONDS), two = cond.two, tt = [];
      for (var m = 0; m < 8; m++) tt.push(cond.f(two ? sx(m, 3) : m) ? 1 : 0);
      var best = minSop(tt, vars);
      return {
        prompt: p("The bits a b c (a is the most significant) represent a 3-bit " + (two ? "<strong>two's complement</strong>" : "<strong>unsigned</strong>") + " number. Write a simplest Boolean expression for y, where y = 1 exactly when " + cond.t + "."),
        fields: [{ id: "e", label: "y =", kind: "bool", vars: vars, table: tt, maxLiterals: best.literals, example: best.expr, size: 22 }],
        solution: table(["a b c", "value", "y"], tt.map(function (v, k) { return [bin(k, 3), two ? sx(k, 3) : k, v]; })) + p("Simplest form: <strong>y = " + esc(best.expr) + "</strong>")
      };
    },
    function (R) {
      var vars = ["x", "y", "z"], forms = R.shuffle(SIMPLE_FORMS), map = randomRemap(R, vars), right = remapExpr(forms[0], map), tt = ttOf(right, vars);
      var given = minterms(tt).map(function (m) { return mintermText(m, vars); }).join(" + "), opts = [right];
      for (var i = 1; i < forms.length && opts.length < 4; i++) {
        var e = remapExpr(forms[i], map);
        if (ttOf(e, vars).join("") !== tt.join("") && opts.indexOf(e) === -1) opts.push(e);
      }
      return {
        prompt: p("Which expression is equivalent to <span class=\"expr\">F = " + esc(given) + "</span>?"),
        fields: [choice("c", "F =", R.shuffle(opts), right, { wide: true })],
        solution: p("<strong>" + esc(right) + "</strong> is 1 for exactly the same minterms (" + minterms(tt).join(", ") + ").")
      };
    }
  ]);

  var TT_FORMS = ["(x+y')z", "x'y+yz'", "(x+y)(y'+z)", "(xy)'+z", "x(y+z')", "x'y'z+xz", "(x+z)'+y", "xy'+yz+x'z'", "(x+y+z)(x'+y')"];
  G["logic/truth-table"] = variants([
    function (R) {
      var vars = ["x", "y", "z"], e = remapExpr(R.pick(TT_FORMS), randomRemap(R, vars)), tt = ttOf(e, vars), ms = minterms(tt);
      var fields = tt.map(function (v, i) { return bit("r" + i, v); });
      fields.push({ id: "m", label: "Minterms where F = 1", kind: "set", answer: ms, size: 16 });
      return {
        prompt: p("Complete the truth table for <span class=\"expr\">F = " + esc(e) + "</span>, then list the rows where F = 1."),
        table: { head: ["Row", "x", "y", "z", "F"], rows: tt.map(function (v, i) { return [i, (i >> 2) & 1, (i >> 1) & 1, i & 1, { f: "r" + i }]; }) },
        fields: fields,
        solution: p("F = Σm(" + ms.join(", ") + ") = " + ms.map(function (m) { return mintermText(m, vars); }).join(" + "))
      };
    },
    function (R) {
      var vars = ["a", "b", "c"], tt = R.until(function () { var t = []; for (var i = 0; i < 8; i++) t.push(R.int(0, 1)); return t; }, function (t) { var k = sum(t); return k >= 2 && k <= 6; });
      var best = minSop(tt, vars);
      return {
        prompt: p("Write a simplest Boolean expression for F from its truth table.") + table(["a", "b", "c", "F"], tt.map(function (v, m) { return [(m >> 2) & 1, (m >> 1) & 1, m & 1, v]; })),
        fields: [{ id: "e", label: "F =", kind: "bool", vars: vars, table: tt, maxLiterals: best.literals, example: best.expr, size: 22 }],
        solution: p("Sum of minterms: F = " + minterms(tt).map(function (m) { return mintermText(m, vars); }).join(" + ") + ". Simplified: <strong>F = " + esc(best.expr) + "</strong>")
      };
    },
    function (R) {
      var vars = ["a", "b", "c"], forms = R.shuffle(TT_FORMS.map(function (f) { return f.replace(/x/g, "a").replace(/y/g, "b").replace(/z/g, "c"); }));
      var right = forms[0], tt = ttOf(right, vars), opts = [right];
      for (var i = 1; i < forms.length && opts.length < 4; i++) if (ttOf(forms[i], vars).join("") !== tt.join("")) opts.push(forms[i]);
      return {
        prompt: p("Which formula has this truth table?") + table(["a", "b", "c", "F"], tt.map(function (v, m) { return [(m >> 2) & 1, (m >> 1) & 1, m & 1, v]; })),
        fields: [choice("c", "F =", R.shuffle(opts), right, { wide: true })],
        solution: p("<strong>F = " + esc(right) + "</strong>: it is 1 exactly in rows " + minterms(tt).join(", ") + ".")
      };
    }
  ]);


  /* ----- 5. Sequential circuits ----- */
  function ffNext(type, q, i) {
    return type === "JK" ? ((i.J & (1 - q)) | ((1 - i.K) & q)) : type === "T" ? (i.T ^ q) : type === "D" ? i.D : (i.S | ((1 - i.R) & q));
  }
  function ffInputs(R, type) {
    if (type === "JK") return { J: R.int(0, 1), K: R.int(0, 1) };
    if (type === "T") return { T: R.int(0, 1) };
    if (type === "D") return { D: R.int(0, 1) };
    var s = R.int(0, 1); return { S: s, R: s ? 0 : R.int(0, 1) };
  }
  var FF_RULE = { JK: "Q<sub>next</sub> = J·Q' + K'·Q (J = K = 1 toggles)", T: "Q<sub>next</sub> = T xor Q", D: "Q<sub>next</sub> = D", SR: "Q<sub>next</sub> = S + R'·Q (S sets, R resets, S = R = 1 not allowed)" };
  G["sequential/flip-flops"] = variants([
    function (R) {
      var type = R.pick(["JK", "T", "D", "SR"]), q = R.int(0, 1), q0 = q, ins = [], cur = [], next = [];
      for (var c = 0; c < 5; c++) { var i = ffInputs(R, type), nq = ffNext(type, q, i); ins.push(i); cur.push(q); next.push(nq); q = nq; }
      var names = Object.keys(ins[0]), fields = [], rows = [];
      rows.push(["Q<sub>current</sub>"].concat(cur.map(function (v, c2) { if (c2 === 0) return v; fields.push(bit("q" + c2, v)); return { f: "q" + c2 }; })));
      names.forEach(function (nm) { rows.push([nm].concat(ins.map(function (x) { return x[nm]; }))); });
      rows.push(["Q<sub>next</sub>"].concat(next.map(function (v, c3) { fields.push(bit("n" + c3, v)); return { f: "n" + c3 }; })));
      return {
        prompt: p("A " + type + " flip-flop starts with Q = " + q0 + ". Complete the table; each cycle's Q<sub>next</sub> is the next cycle's Q<sub>current</sub>."),
        table: { head: ["Clock cycle", 0, 1, 2, 3, 4], rows: rows },
        fields: fields,
        solution: p(FF_RULE[type] + ".") + table(["Cycle", "Q"].concat(names).concat(["Q<sub>next</sub>"]), ins.map(function (x, c4) {
          return [c4, cur[c4]].concat(names.map(function (nm) { return x[nm]; })).concat(["<strong>" + next[c4] + "</strong>"]);
        }))
      };
    },
    function (R) {
      var rows = [], fields = [], sol = [];
      for (var k = 0; k < 4; k++) {
        var type = R.pick(["JK", "T", "D", "SR"]), q = R.int(0, 1), i = ffInputs(R, type), nq = ffNext(type, q, i);
        var inText = Object.keys(i).map(function (nm) { return nm + " = " + i[nm]; }).join(", ");
        rows.push([type, q, inText, { f: "n" + k }]); fields.push(bit("n" + k, nq));
        sol.push(type + ": Q = " + q + ", " + inText + " → <strong>" + nq + "</strong>");
      }
      return {
        prompt: p("Give the next state of each flip-flop after one clock edge."),
        table: { head: ["Flip-flop", "Q", "Inputs", "Q<sub>next</sub>"], rows: rows },
        fields: fields, solution: ul(sol)
      };
    }
  ]);

  G["sequential/clock-period"] = variants([
    function (R) {
      var o = R.until(function () { return { cq: R.pick([20, 30, 40, 50]), su: R.pick([20, 30, 40, 50]), hold: R.pick([10, 20, 30]), period: R.pick([200, 250, 400, 500, 1000]) }; },
        function (x) { return x.period - x.cq - x.su >= 100; });
      var worst = o.period - o.cq - o.su, others = [R.int(4, worst / 10 - 2) * 10, R.int(4, worst / 10 - 2) * 10], paths = R.shuffle([worst].concat(others));
      var ghz = 1000 / o.period;
      return {
        prompt: p("Registers A, B and C have a clk-to-q delay of " + o.cq + " ps, a setup time of " + o.su + " ps and a hold time of " + o.hold + " ps. The logic between them has these delays:") +
          table(["Path", "Delay"], [["A → B", paths[0] + " ps"], ["B → C", paths[1] + " ps"], ["A → C", paths[2] + " ps"]]) +
          p("What is the minimum clock period, and the maximum clock frequency?"),
        fields: [num("t", "Minimum period", o.period, { suffix: "ps" }), num("f", "Maximum frequency", round(ghz, 2), { suffix: "GHz" })],
        solution: p("Period = clk-to-q + longest path + setup = " + o.cq + " + " + worst + " + " + o.su + " = <strong>" + o.period + " ps</strong>; frequency = 1 ÷ " + o.period + " ps = <strong>" + fmt(ghz) + " GHz</strong>. Hold time does not limit the period.")
      };
    },
    function (R) {
      var o = R.until(function () { return { cq: R.pick([20, 30, 40, 50]), su: R.pick([20, 30, 40, 50]), f: R.pick([1, 2, 2.5, 4]) }; }, function (x) { return 1000 / x.f - x.cq - x.su > 0; });
      var period = 1000 / o.f, maxc = period - o.cq - o.su;
      return {
        prompt: p("A synchronous circuit must run at " + o.f + " GHz. Its registers have a clk-to-q delay of " + o.cq + " ps and a setup time of " + o.su + " ps. What is the longest the combinational logic between registers may take?"),
        fields: [num("c", "Longest logic delay", maxc, { suffix: "ps" })],
        solution: p("Period = 1 ÷ " + o.f + " GHz = " + period + " ps. Logic delay ≤ " + period + " − " + o.cq + " − " + o.su + " = <strong>" + maxc + " ps</strong>")
      };
    }
  ]);

  function fsmSvg(trans) {
    var pos = [[90, 70], [290, 70], [290, 230], [90, 230]], r = 26, out = [], grouped = {};
    trans.forEach(function (t) { var k = t.from + "-" + t.to; (grouped[k] = grouped[k] || []).push(t.input + "/" + t.out); });
    Object.keys(grouped).forEach(function (k) {
      var a = +k.split("-")[0], b = +k.split("-")[1], label = grouped[k].join(", ");
      if (a === b) {
        var cx = pos[a][0], cy = pos[a][1], dx = cx < 190 ? -1 : 1, dy = cy < 150 ? -1 : 1;
        out.push("<path d=\"M" + (cx + dx * r) + " " + cy + " C " + (cx + dx * 75) + " " + (cy + dy * 10) + ", " + (cx + dx * 10) + " " + (cy + dy * 75) + ", " + cx + " " + (cy + dy * r) + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" marker-end=\"url(#arr)\"/>");
        out.push("<text class=\"fsm-label\" x=\"" + (cx + dx * 52) + "\" y=\"" + (cy + dy * 52) + "\" text-anchor=\"middle\" font-size=\"13\" fill=\"currentColor\">" + label + "</text>");
        return;
      }
      var ax = pos[a][0], ay = pos[a][1], bx = pos[b][0], by = pos[b][1];
      var mx = (ax + bx) / 2, my = (ay + by) / 2, vx = bx - ax, vy = by - ay, len = Math.sqrt(vx * vx + vy * vy);
      var nx = -vy / len, ny = vx / len, cx2 = mx + nx * 28, cy2 = my + ny * 28;
      var lt = 0.32, lx = (1 - lt) * (1 - lt) * ax + 2 * (1 - lt) * lt * cx2 + lt * lt * bx, ly = (1 - lt) * (1 - lt) * ay + 2 * (1 - lt) * lt * cy2 + lt * lt * by;
      var sx2 = ax + (vx / len) * r + nx * 8, sy = ay + (vy / len) * r + ny * 8, ex = bx - (vx / len) * r + nx * 8, ey = by - (vy / len) * r + ny * 8;
      out.push("<path d=\"M" + sx2 + " " + sy + " Q " + cx2 + " " + cy2 + " " + ex + " " + ey + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" marker-end=\"url(#arr)\"/>");
      out.push("<text class=\"fsm-label\" x=\"" + (lx + nx * 14) + "\" y=\"" + (ly + ny * 14 + 4) + "\" text-anchor=\"middle\" font-size=\"13\" fill=\"currentColor\">" + label + "</text>");
    });
    pos.forEach(function (q, i) {
      out.push("<circle cx=\"" + q[0] + "\" cy=\"" + q[1] + "\" r=\"" + r + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/>");
      out.push("<text x=\"" + q[0] + "\" y=\"" + (q[1] + 5) + "\" text-anchor=\"middle\" font-size=\"15\" font-weight=\"700\" fill=\"currentColor\">" + i + "</text>");
    });
    return "<svg class=\"fsm\" viewBox=\"0 0 380 300\" role=\"img\" aria-label=\"State diagram\"><defs><marker id=\"arr\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0 L10 5 L0 10 z\" fill=\"currentColor\"/></marker></defs>" + out.join("") + "</svg>";
  }
  function randomFsm(R) {
    var trans = [];
    for (var s = 0; s < 4; s++) for (var x = 0; x < 2; x++) trans.push({ from: s, input: x, to: R.int(0, 3), out: R.int(0, 1) });
    return trans;
  }
  G["sequential/fsm-table"] = variants([
    function (R) {
      var trans = randomFsm(R), fields = [], rows = [];
      trans.forEach(function (t, i) {
        fields.push(bit("a" + i, t.to >> 1), bit("b" + i, t.to & 1), bit("o" + i, t.out));
        rows.push([t.from >> 1, t.from & 1, t.input, { f: "a" + i }, { f: "b" + i }, { f: "o" + i }]);
      });
      return {
        prompt: p("This finite state machine has states 0–3 (encoded as PS1 PS0) and a 1-bit input. Arrows are labelled <em>input/output</em>. Complete the truth table.") + fsmSvg(trans),
        table: { head: ["PS1", "PS0", "In", "NS1", "NS0", "Out"], rows: rows },
        fields: fields,
        solution: table(["PS1", "PS0", "In", "NS1", "NS0", "Out"], trans.map(function (t) { return [t.from >> 1, t.from & 1, t.input, "<strong>" + (t.to >> 1) + "</strong>", "<strong>" + (t.to & 1) + "</strong>", "<strong>" + t.out + "</strong>"]; }))
      };
    },
    function (R) {
      var trans = randomFsm(R), seq = [], s = 0, outs = [], path = [0];
      for (var k = 0; k < 6; k++) seq.push(R.int(0, 1));
      seq.forEach(function (x) { var t = trans[s * 2 + x]; outs.push(t.out); s = t.to; path.push(s); });
      return {
        prompt: p("This FSM starts in state 0. Arrows are labelled <em>input/output</em>.") + fsmSvg(trans) +
          p("The inputs " + code(seq.join(" ")) + " arrive, one per clock cycle. What outputs are produced, and which state does it end in?"),
        fields: [{ id: "o", label: "Outputs", kind: "bits", width: 6, answer: outs.join(""), size: 10 }, num("s", "Final state", s)],
        solution: p("States: " + path.join(" → ") + ". Outputs: <strong>" + outs.join("") + "</strong>; final state <strong>" + s + "</strong>.")
      };
    }
  ]);


  /* ----- 6. MIPS ----- */
  G["mips/encode"] = variants([
    function (R) {
      var i = randomInstr(R), w = encode(i);
      return {
        prompt: p("Encode " + code(asm(i)) + " as a 32-bit machine word in hexadecimal.") + p(OPCODE_NOTE),
        fields: [{ id: "w", label: "Machine code", kind: "hex", answer: w, size: 14 }],
        solution: fieldBreakdown(i) + p("Grouping the bits into hex digits: <strong>" + hex(w, 8) + "</strong>")
      };
    },
    function (R) {
      var i = randomInstr(R), f = MIPS[i.m], isR = f.fmt === "R3" || f.fmt === "SH", fields = [choice("fmt", "Format", ["R", "I", "J"], isR ? "R" : "I"), num("op", "op", isR ? 0 : f.op), num("rs", "rs", i.rs), num("rt", "rt", i.rt)];
      if (isR) fields.push(num("rd", "rd", i.rd), num("sh", "shamt", i.shamt), num("fn", "funct", f.funct));
      else fields.push(num("im", "immediate", i.imm));
      return {
        prompt: p("Give the instruction format and the decimal value of each field of " + code(asm(i)) + ".") + p(OPCODE_NOTE + " Registers: $v0–$v1 = 2–3, $a0–$a3 = 4–7, $t0–$t7 = 8–15, $s0–$s7 = 16–23, $sp = 29."),
        fields: fields, solution: fieldBreakdown(i)
      };
    }
  ]);

  G["mips/decode"] = function (R) {
    var i = randomInstr(R), w = encode(i), f = MIPS[i.m].fmt, fields = [choice("m", "Instruction", MNEMONICS, i.m)];
    if (f === "R3") fields.push({ id: "rd", label: "rd", kind: "reg", answer: i.rd }, { id: "rs", label: "rs", kind: "reg", answer: i.rs }, { id: "rt", label: "rt", kind: "reg", answer: i.rt });
    else if (f === "SH") fields.push({ id: "rd", label: "rd", kind: "reg", answer: i.rd }, { id: "rt", label: "rt", kind: "reg", answer: i.rt }, num("sh", "shamt", i.shamt));
    else fields.push({ id: "rt", label: "rt", kind: "reg", answer: i.rt }, { id: "rs", label: "rs", kind: "reg", answer: i.rs }, num("imm", "Immediate", i.imm));
    return {
      prompt: p("Decode " + code(hex(w, 8)) + ". Give the instruction and its operands (registers as " + code("$t0") + " or " + code("$8") + ").") + p(OPCODE_NOTE),
      fields: fields,
      solution: p("Binary: " + code(bin(w, 32)) + ".") + fieldBreakdown(i) + p("The instruction is <strong>" + esc(asm(i)) + "</strong>")
    };
  };

  G["mips/branch-target"] = variants([
    function (R) {
      var pc = (0x00400000 + 4 * R.int(4, 60)) >>> 0, imm = R.until(function () { return R.int(-12, 12); }, function (x) { return x !== 0; }), t = pc + 4 + imm * 4;
      return {
        prompt: p(code("beq $t0, $t1, label") + " is at address " + code(hex(pc, 8)) + " and its immediate field is " + imm + ". What is the branch target address?"),
        fields: [{ id: "a", label: "Target", kind: "hex", answer: t, size: 14 }],
        solution: p("Target = PC + 4 + imm × 4 = " + hex(pc, 8) + " + 4 + " + imm * 4 + " = <strong>" + hex(t, 8) + "</strong>")
      };
    },
    function (R) {
      var pc = (0x00400000 + 4 * R.int(4, 60)) >>> 0, imm = R.until(function () { return R.int(-12, 12); }, function (x) { return x !== 0; }), t = pc + 4 + imm * 4;
      return {
        prompt: p("A " + code("bne") + " at address " + code(hex(pc, 8)) + " branches to " + code(hex(t, 8)) + ". What is its immediate field, in decimal?"),
        fields: [num("imm", "Immediate", imm)],
        solution: p("Immediate = (target − (PC + 4)) ÷ 4 = (" + hex(t, 8) + " − " + hex(pc + 4, 8) + ") ÷ 4 = <strong>" + imm + "</strong>")
      };
    },
    function (R) {
      var pc = (0x00400000 + 4 * R.int(4, 400)) >>> 0, field = (0x0100000 + 4 * R.int(0, 0x3fff)) >>> 0, jt = (((pc + 4) & 0xf0000000) | (field << 2)) >>> 0;
      return R.chance(0.5) ? {
        prompt: p("A " + code("j") + " instruction at " + code(hex(pc, 8)) + " has 26-bit address field " + code(hex(field, 7)) + ". What is the jump target?"),
        fields: [{ id: "a", label: "Target", kind: "hex", answer: jt, size: 14 }],
        solution: p("Target = upper 4 bits of PC + 4, then the 26-bit field, then 00 — that is, the field × 4: <strong>" + hex(jt, 8) + "</strong>")
      } : {
        prompt: p("A " + code("j") + " instruction at " + code(hex(pc, 8)) + " jumps to " + code(hex(jt, 8)) + ". What is its 26-bit address field, in hex?"),
        fields: [{ id: "a", label: "Address field", kind: "hex", answer: field, size: 14 }],
        solution: p("Drop the top 4 bits and divide by 4: <strong>" + hex(field, 7) + "</strong>")
      };
    }
  ]);

  var MN = ["lw", "sw", "add", "addi", "sll", "slt", "beq", "bne", "j"];
  G["mips/c-to-mips"] = variants([
    function (R) {
      var regs = R.shuffle(["$s0", "$s1", "$s2", "$s3", "$s4"]), A = regs[0], i = regs[1], x = regs[2], t = R.pick(["$t0", "$t1"]);
      var load = R.chance(0.5), idx = R.chance(0.5) ? 0 : R.int(1, 5), cl = load ? "x = A[i" + (idx ? " + " + idx : "") + "];" : "A[i" + (idx ? " + " + idx : "") + "] = x;";
      return {
        prompt: p("Array A holds 4-byte ints; its base address is in " + code(A) + ", i is in " + code(i) + " and x is in " + code(x) + ". Fill in the blanks to translate:") + pre([cl]),
        code: [["sll " + t + ", " + i + ", ", { f: "sh" }], ["add " + t + ", " + A + ", " + t], [{ f: "op" }, " " + x + ", ", { f: "off" }, "(" + t + ")"]],
        fields: [num("sh", "shift amount", 2, { size: 3 }), choice("op", "instruction", MN, load ? "lw" : "sw"), num("off", "offset", 4 * idx, { size: 3 })],
        solution: pre(["sll " + t + ", " + i + ", 2      # i × 4", "add " + t + ", " + A + ", " + t + "    # &A[i]", (load ? "lw " : "sw ") + x + ", " + 4 * idx + "(" + t + ")"]) + p("Each int is 4 bytes, so indexes are multiplied by 4 (shift left 2) and a constant +" + idx + " becomes an offset of " + 4 * idx + ".")
      };
    },
    function (R) {
      var r = R.shuffle(["$s3", "$s4", "$s5", "$s6", "$s7"]), I = r[0], K = r[1], S = r[2], ne = R.chance(0.5), step = R.pick([1, 1, 2]);
      return {
        prompt: p("Translate the loop below; i is in " + code(I) + ", k in " + code(K) + " and the base address of save[] (4-byte ints) in " + code(S) + ". Fill in the blanks.") +
          pre(["while (save[i] " + (ne ? "!=" : "==") + " k)", "    i += " + step + ";"]),
        code: [["Loop: sll  $t1, " + I + ", ", { f: "sh" }], ["      add  $t1, $t1, " + S], ["      lw   $t0, 0($t1)"], ["      ", { f: "br" }, "  $t0, " + K + ", Exit"], ["      addi " + I + ", " + I + ", ", { f: "st" }], ["      ", { f: "jj" }, "    Loop"], ["Exit:"]],
        fields: [num("sh", "shift amount", 2, { size: 3 }), choice("br", "branch", MN, ne ? "beq" : "bne"), num("st", "step", step, { size: 3 }), choice("jj", "jump", MN, "j")],
        solution: p("The loop must exit when the condition fails, so the branch tests the opposite: " + code(ne ? "beq" : "bne") + ". The index is scaled by 4 (" + code("sll … 2") + "), i grows by " + step + ", and " + code("j Loop") + " goes back to the test.")
      };
    },
    function (R) {
      var r = R.shuffle(["$s0", "$s1", "$s2", "$s3"]), F = r[0], Gg = r[1], H = r[2], a = R.int(1, 3), b = R.int(2, 9);
      return {
        prompt: p("f, g and h are in " + code(F) + ", " + code(Gg) + " and " + code(H) + ". Fill in the blanks to translate:") + pre(["f = (g << " + a + ") + (h - " + b + ");"]),
        code: [["sll  $t0, " + Gg + ", ", { f: "a" }], ["addi $t1, " + H + ", ", { f: "b" }], [{ f: "op" }, "  " + F + ", $t0, $t1"]],
        fields: [num("a", "shift amount", a, { size: 3 }), num("b", "immediate", -b, { size: 4 }), choice("op", "instruction", MN, "add")],
        solution: pre(["sll  $t0, " + Gg + ", " + a, "addi $t1, " + H + ", " + -b + "   # subi is a pseudo-op for this", "add  " + F + ", $t0, $t1"])
      };
    },
    function (R) {
      var r = R.shuffle(["$s0", "$s1", "$s2", "$s3"]), A = r[0], B = r[1], X = r[2];
      return {
        prompt: p("a, b and x are in " + code(A) + ", " + code(B) + " and " + code(X) + ". Translate without a branch by filling in the blanks:") + pre(["x = (a < b) ? 1 : 0;"]),
        code: [[{ f: "op" }, " " + X + ", ", { f: "r1" }, ", ", { f: "r2" }]],
        fields: [choice("op", "instruction", MN, "slt"), { id: "r1", label: "first operand", kind: "reg", answer: REGS.indexOf(A), size: 5 }, { id: "r2", label: "second operand", kind: "reg", answer: REGS.indexOf(B), size: 5 }],
        solution: pre(["slt " + X + ", " + A + ", " + B]) + p(code("slt rd, rs, rt") + " sets rd to 1 exactly when rs < rt.")
      };
    }
  ]);

  G["mips/trace"] = variants([
    function (R) {
      var regs = ["$t0", "$t1", "$t2", "$t3"], v, lines, dst, init;
      R.until(function () {
        v = { $t0: R.int(1, 12), $t1: R.int(1, 12), $t2: 0, $t3: 0 }; lines = []; dst = "$t2";
        init = code("$t0") + " = " + v.$t0 + " and " + code("$t1") + " = " + v.$t1;
        var okRun = true, n = R.int(3, 4);
        for (var k = 0; k < n; k++) {
          var op = R.pick(["add", "sub", "and", "or", "sll", "srl", "slt", "addi"]), d = R.pick(["$t1", "$t2", "$t3"]), a = R.pick(regs), b = R.pick(regs);
          if (op === "sll" || op === "srl") {
            var sh = R.int(1, 3); if (v[a] < 0) okRun = false;
            lines.push(op + " " + d + ", " + a + ", " + sh); v[d] = op === "sll" ? (v[a] << sh) : (v[a] >>> sh);
          }
          else if (op === "addi") { var im = R.int(-8, 10); lines.push("addi " + d + ", " + a + ", " + im); v[d] = v[a] + im; }
          else {
            lines.push(op + " " + d + ", " + a + ", " + b);
            v[d] = op === "add" ? v[a] + v[b] : op === "sub" ? v[a] - v[b] : op === "and" ? v[a] & v[b] : op === "or" ? v[a] | v[b] : (v[a] < v[b] ? 1 : 0);
          }
          dst = d;
        }
        return okRun;
      }, function (ok) { return ok && Math.abs(v[dst]) <= 200; });
      return {
        prompt: p("Initially " + init + " (all other registers are 0). What does " + code(dst) + " hold after this code runs? Give the value in decimal.") + pre(lines),
        fields: [num("v", dst, v[dst])],
        solution: p("Work through the instructions one at a time, tracking every register. " + code(dst) + " ends up holding <strong>" + v[dst] + "</strong>.")
      };
    },
    function (R) {
      var x = R.int(1, 255), count = 0, y = x;
      while (y) { y >>>= 1; count++; }
      return {
        prompt: p("The word at the address in " + code("$s0") + " holds " + x + ". What is in " + code("$s1") + " when this code reaches Exit?") +
          pre(["      add  $s1, $zero, $zero", "      lw   $t2, 0($s0)", "Loop: beq  $t2, $zero, Exit", "      srl  $t2, $t2, 1", "      addi $s1, $s1, 1", "      j    Loop", "Exit:"]),
        fields: [num("v", "$s1", count)],
        solution: p(x + " = " + x.toString(2) + " in binary. Each iteration shifts out one bit until the value is 0, so the loop runs once per significant bit: <strong>" + count + "</strong>.")
      };
    },
    function (R) {
      var a = R.int(1, 15), sh = R.int(1, 4), left = R.chance(0.6), r = left ? a << sh : a >>> sh, op = left ? "sllv" : "srlv";
      return {
        prompt: p(code(op + " $t2, $t4, $t5") + " means " + code("$t2 = $t4 " + (left ? "<<" : ">>") + " $t5") + ". If " + code("$t4") + " = " + a + " and " + code("$t5") + " = " + sh + ", what is in " + code("$t2") + "?"),
        fields: [num("v", "$t2", r)],
        solution: p(a + " " + (left ? "<<" : ">>") + " " + sh + " = " + a + (left ? " × " : " ÷ ") + Math.pow(2, sh) + (left ? "" : " (rounded down)") + " = <strong>" + r + "</strong>")
      };
    }
  ]);

  G["mips/endianness"] = function (R) {
    var n = R.pick([4, 4, 6]), bytes = [];
    for (var i = 0; i < n; i++) bytes.push(R.int(0, 255));
    var little = R.chance(0.5), base = R.pick([0x1000, 0x2000, 0x8000]), word = bytes.map(function (b) { return hex(b, 2).slice(2); }).join("");
    var mem = little ? bytes.slice().reverse() : bytes.slice();
    return {
      prompt: p("The " + (n * 8) + "-bit value " + code("0x" + word) + " is stored at address " + code(hex(base, 4)) + " in <strong>" + (little ? "little" : "big") + "-endian</strong> order. Which byte is at each address?"),
      table: { head: ["Address", "Byte"], rows: mem.map(function (b, k) { return [hex(base + k, 4), { f: "b" + k }]; }) },
      fields: mem.map(function (b, k) { return { id: "b" + k, label: "Byte at " + hex(base + k, 4), kind: "hex", answer: b, size: 5 }; }),
      solution: p((little ? "Little-endian stores the least significant byte first" : "Big-endian stores the most significant byte first") + ": " + mem.map(function (b) { return "<strong>" + hex(b, 2) + "</strong>"; }).join(", "))
    };
  };


  /* ----- 7. Datapath ----- */
  var CONTROL = {
    add: ["+4", "rd", "x", "rt", "add", "0", "ALU", "1"], sub: ["+4", "rd", "x", "rt", "sub", "0", "ALU", "1"],
    and: ["+4", "rd", "x", "rt", "and", "0", "ALU", "1"], or: ["+4", "rd", "x", "rt", "or", "0", "ALU", "1"],
    slt: ["+4", "rd", "x", "rt", "slt", "0", "ALU", "1"], addi: ["+4", "rt", "signed", "imm", "add", "0", "ALU", "1"],
    ori: ["+4", "rt", "zero", "imm", "or", "0", "ALU", "1"], lw: ["+4", "rt", "signed", "imm", "add", "0", "memory", "1"],
    sw: ["+4", "x", "signed", "imm", "add", "1", "x", "0"], beq: ["br", "x", "x", "rt", "sub", "0", "x", "0"]
  };
  var SIGNALS = [["nPC_sel", ["+4", "br"]], ["RegDst", ["rd", "rt", "x"]], ["ExtOp", ["signed", "zero", "x"]], ["ALUSrc", ["rt", "imm"]],
    ["ALUctr", ["add", "sub", "and", "or", "slt"]], ["MemWr", ["0", "1"]], ["MemtoReg", ["ALU", "memory", "x"]], ["RegWr", ["0", "1"]]];
  var SAMPLE = { add: "add $t0, $t1, $t2", sub: "sub $s1, $s2, $s3", and: "and $t3, $t4, $t5", or: "or $s0, $s1, $t0", slt: "slt $t2, $s0, $s1",
    addi: "addi $t0, $t1, -12", ori: "ori $s2, $s3, 255", lw: "lw $t1, 8($s0)", sw: "sw $t2, 16($sp)", beq: "beq $t0, $t1, loop", j: "j loop" };
  G["datapath/control-signals"] = variants([
    function (R) {
      /* one row per signal, one column per instruction (like the control table on the cheat sheet) */
      var ms = R.shuffle(Object.keys(CONTROL)).slice(0, 3), fields = [], rows = [];
      SIGNALS.forEach(function (sg, k) {
        var row = [sg[0]];
        ms.forEach(function (m, r) {
          var vals = CONTROL[m], opts = sg[1].indexOf("x") === -1 && vals[k] === "x" ? sg[1].concat(["x"]) : sg[1];
          fields.push(choice("c" + r + "_" + k, m + " " + sg[0], opts, vals[k], { any: vals[k] === "x" }));
          row.push({ f: "c" + r + "_" + k });
        });
        rows.push(row);
      });
      return {
        prompt: p("For the single-cycle MIPS datapath from lecture, fill in every control signal for each instruction. Pick x where the value does not matter (any value is accepted there)."),
        table: { head: ["Signal"].concat(ms.map(function (m) { return code(SAMPLE[m]); })), rows: rows },
        fields: fields,
        solution: table(["Signal"].concat(ms.map(function (m) { return code(SAMPLE[m]); })), SIGNALS.map(function (sg, k) {
          return [sg[0]].concat(ms.map(function (m) { return "<strong>" + CONTROL[m][k] + "</strong>"; }));
        }))
      };
    },
    function (R) {
      var m = R.pick(Object.keys(CONTROL)), vals = CONTROL[m];
      return {
        prompt: p("For the single-cycle MIPS datapath from lecture, give every control signal while executing " + code(SAMPLE[m]) + ". Pick x where the value does not matter (any value is accepted there)."),
        fields: SIGNALS.map(function (s, k) { return choice("c" + k, s[0], s[1].indexOf("x") === -1 && vals[k] === "x" ? s[1].concat(["x"]) : s[1], vals[k], { any: vals[k] === "x" }); }),
        solution: table(SIGNALS.map(function (s) { return s[0]; }), [vals.map(function (v) { return "<strong>" + v + "</strong>"; })])
      };
    },
    function (R) {
      var keys = R.shuffle(Object.keys(CONTROL)), m = keys[0], vals = CONTROL[m], opts = [m];
      var differs = function (a, b) { return CONTROL[a].some(function (v, k) { var w = CONTROL[b][k]; return v !== "x" && w !== "x" && v !== w; }); };
      keys.slice(1).forEach(function (k) { if (opts.length < 4 && differs(k, m)) opts.push(k); });
      return {
        prompt: p("Which instruction is being executed when the control signals have these values? (x means the value does not matter.)") + table(SIGNALS.map(function (s) { return s[0]; }), [vals]),
        fields: [choice("m", "Instruction", R.shuffle(opts), m)],
        solution: p("<strong>" + m + "</strong> (for example " + code(SAMPLE[m]) + "). The other options differ in at least one signal that matters.")
      };
    }
  ]);
  var STAGES = { add: [1, 1, 1, 0, 1], addi: [1, 1, 1, 0, 1], lw: [1, 1, 1, 1, 1], sw: [1, 1, 1, 1, 0], beq: [1, 1, 1, 0, 0], j: [1, 1, 0, 0, 0] };
  var WRITES = { add: "rd", addi: "rt", lw: "rt", sw: "none", beq: "none", j: "none" };
  G["datapath/datapath-trace"] = function (R) {
    var m = R.pick(Object.keys(STAGES)), st = STAGES[m], names = ["Instruction fetch", "Decode / register read", "Execute (ALU)", "Memory access", "Write back"];
    var fields = names.map(function (n, k) { return choice("s" + k, n, ["used", "not used"], st[k] ? "used" : "not used"); });
    fields.push(choice("w", "Register written", ["rd", "rt", "none"], WRITES[m]));
    return {
      prompt: p("Which datapath stages does " + code(SAMPLE[m]) + " use, and which register field (if any) does it write?"),
      fields: fields,
      solution: table(["IF", "ID", "EX", "MEM", "WB", "Writes"], [st.map(function (u) { return u ? "used" : "—"; }).concat([WRITES[m]])])
    };
  };
  G["datapath/clock-cycle"] = variants([
    function (R) {
      var names = ["IF", "ID", "EX", "MEM", "WB"], t = R.until(function () { return names.map(function () { return R.int(1, 6) * 50; }); }, function (a) { var mx = maxOf(a); return a.filter(function (x) { return x === mx; }).length === 1; });
      var total = sum(t), mx = maxOf(t), slow = names[t.indexOf(mx)], rest = maxOf(t.filter(function (x, k) { return k !== t.indexOf(mx); })), split = Math.max(rest, mx / 2);
      return {
        prompt: p("The datapath stages take:") + table(names, [t.map(function (x) { return x + " ps"; })]) +
          p("Loads use every stage. What is the clock cycle for single-cycle and for multi-cycle clocking? If one stage could be split into two equal halves, which one, and what would the multi-cycle clock become?"),
        fields: [num("s", "Single-cycle", total, { suffix: "ps" }), num("m", "Multi-cycle", mx, { suffix: "ps" }), choice("st", "Stage to split", names, slow), num("n", "New multi-cycle", split, { suffix: "ps" })],
        solution: p("Single-cycle = slowest instruction (a load) = " + t.join(" + ") + " = <strong>" + total + " ps</strong>. Multi-cycle = slowest stage, " + slow + " = <strong>" + mx + " ps</strong>.") +
          p("Splitting " + slow + " gives two " + fmt(mx / 2, 1) + " ps halves; the clock becomes max(" + fmt(mx / 2, 1) + ", " + rest + ") = <strong>" + fmt(split, 1) + " ps</strong>")
      };
    },
    function (R) {
      var names = ["IF", "ID", "EX", "WB"], t = names.map(function () { return R.int(1, 5) * 50; }), use = { "R-type": [1, 1, 1, 1], "Branch": [1, 1, 1, 0], "Jump": [1, 1, 0, 0] };
      var times = Object.keys(use).map(function (k) { return sum(t.filter(function (_, i) { return use[k][i]; })); });
      return {
        prompt: p("A 4-stage datapath (no memory stage) has these stage times and instruction types:") +
          table(["Instr.", "IF", "ID", "EX", "WB"], Object.keys(use).map(function (k) { return [k].concat(t.map(function (x, i) { return use[k][i] ? x + " ps" : "—"; })); })) +
          p("What is the minimum clock cycle with single-cycle clocking, and with multi-cycle clocking?"),
        fields: [num("s", "Single-cycle", maxOf(times), { suffix: "ps" }), num("m", "Multi-cycle", maxOf(t), { suffix: "ps" })],
        solution: p("Single-cycle = the slowest instruction = <strong>" + maxOf(times) + " ps</strong> (R-type: " + t.join(" + ") + "). Multi-cycle = the slowest stage = <strong>" + maxOf(t) + " ps</strong>.")
      };
    },
    function (R) {
      var t = R.pick([100, 200, 250]), mix = percentSplit(R, 4, 10), cyc = [4, 5, 4, 3], names = ["R-type (4 stages)", "Load (5 stages)", "Store (4 stages)", "Branch (3 stages)"];
      var cpi = sum(mix.map(function (f, i) { return f / 100 * cyc[i]; })), multi = cpi * t, single = 5 * t, faster = multi < single ? "multi-cycle" : "single-cycle";
      return {
        prompt: p("Every stage of a 5-stage datapath takes " + t + " ps. A program has this instruction mix:") + table(["Class", "Frequency"], names.map(function (n, i) { return [n, mix[i] + "%"]; })) +
          p("With multi-cycle clocking (one stage per cycle), what is the average CPI and the average time per instruction? Which design is faster, given that single-cycle clocking needs " + 5 * t + " ps per instruction?"),
        fields: [num("c", "Average CPI", round(cpi, 2)), num("t", "Time per instruction", round(multi, 2), { suffix: "ps" }), choice("w", "Faster design", ["multi-cycle", "single-cycle"], faster)],
        solution: p("CPI = " + mix.map(function (f, i) { return fmt(f / 100, 1) + " × " + cyc[i]; }).join(" + ") + " = <strong>" + fmt(cpi) + "</strong>; time = " + fmt(cpi) + " × " + t + " = <strong>" + fmt(multi) + " ps</strong>, versus " + single + " ps single-cycle: <strong>" + faster + "</strong> is faster.")
      };
    }
  ]);

  /* ----- 8. Pipelining ----- */
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
  var PIPE_RULES = "Classic 5-stage pipeline (IF ID EX MEM WB). Registers are written in the first half of a cycle and read in the second half. Forwarding, when present, delivers results to the start of EX (a loaded value is ready after MEM).";

  G["pipelining/pipeline-time"] = variants([
    function (R) {
      var names = ["IF", "ID", "EX", "MEM", "WB"], t = names.map(function () { return R.int(2, 6) * 50; }), n = R.pick([5, 10, 20, 100]);
      var total = sum(t), mx = maxOf(t), single = n * total, piped = (5 + n - 1) * mx;
      return {
        prompt: p("Stage times:") + table(names, [t.map(function (x) { return x + " ps"; })]) +
          p(n + " instructions run with no hazards. How long do they take on a single-cycle processor, and on a pipelined one clocked at the slowest stage?"),
        fields: [num("s", "Single-cycle", single, { suffix: "ps" }), num("p", "Pipelined", piped, { suffix: "ps" })],
        solution: p("Single-cycle: " + n + " × " + total + " = <strong>" + single + " ps</strong>. Pipelined: (5 + " + n + " − 1) × " + mx + " = <strong>" + piped + " ps</strong>.")
      };
    },
    function (R) {
      var o = R.until(function () { return { s: R.pick([3, 4, 5, 6]), n: R.int(2, 20) }; }, function (x) { return exact(x.n * x.s / (x.s + x.n - 1), 2); });
      var sp = o.n * o.s / (o.s + o.n - 1);
      return {
        prompt: p("A pipeline has " + o.s + " stages of equal length. What is the speedup over a non-pipelined version when processing " + o.n + " tasks?"),
        fields: [num("sp", "Speedup", round(sp, 2))],
        solution: p("Non-pipelined: " + o.n + " × " + o.s + " = " + o.n * o.s + " stage-times. Pipelined: " + o.s + " + " + o.n + " − 1 = " + (o.s + o.n - 1) + ". Speedup = <strong>" + fmt(sp) + "</strong> (it approaches " + o.s + " as the number of tasks grows).")
      };
    },
    function (R) {
      var n = R.int(3, 6), k = R.int(0, 3), cyc = 4 + n + k;
      return {
        prompt: p(n + " instructions run on a 5-stage pipeline, and hazards cause " + k + " stall cycle" + (k === 1 ? "" : "s") + ". How many cycles from the first fetch to the last write back, and what is the CPI of the sequence? (A fraction such as 7/3 is fine.)"),
        fields: [num("c", "Cycles", cyc), num("cpi", "CPI", cyc / n, { tol: 0.005 })],
        solution: p("Cycles = 5 + (" + n + " − 1) + " + k + " = <strong>" + cyc + "</strong>. CPI = " + cyc + "/" + n + " = <strong>" + fmt(cyc / n) + "</strong>")
      };
    }
  ]);

  G["pipelining/dependencies"] = variants([
    function (R) {
      var ins, deps;
      R.until(function () { ins = randomDepCode(R, 5, ["$t0", "$t1", "$t2", "$s0", "$s1"]); deps = findDependencies(ins); return true; },
        function () { var c = function (t) { return deps.filter(function (d) { return d.type === t; }).length; }; return c("RAW") > 0 && c("WAR") + c("WAW") > 0; });
      var count = function (t) { return deps.filter(function (d) { return d.type === t; }).length; };
      return {
        prompt: p("Count the data dependencies of each type. Only count a dependency between two instructions when no instruction in between writes the same register; ignore read-after-read.") + numbered(ins),
        fields: [num("raw", "RAW (read after write)", count("RAW")), num("war", "WAR (write after read)", count("WAR")), num("waw", "WAW (write after write)", count("WAW"))],
        solution: ul(deps.map(function (d) { return "<strong>" + d.type + "</strong> on " + code(d.reg) + ": " + (d.from + 1) + " → " + (d.to + 1); }))
      };
    },
    function (R) {
      var ins, deps;
      R.until(function () { ins = randomDepCode(R, 5, ["$t0", "$t1", "$t2", "$s0"]); deps = findDependencies(ins); return true; }, function () { return deps.some(function (d) { return d.type === "RAW"; }); });
      var who = [];
      deps.forEach(function (d) { if (d.type === "RAW" && who.indexOf(d.to + 1) === -1) who.push(d.to + 1); });
      who.sort(function (a, b) { return a - b; });
      return {
        prompt: p("Which instructions read a register written by an earlier instruction (a RAW dependency)? List their numbers.") + numbered(ins),
        fields: [{ id: "w", label: "Instructions", kind: "set", answer: who, size: 12 }],
        solution: ul(deps.filter(function (d) { return d.type === "RAW"; }).map(function (d) { return "instruction " + (d.to + 1) + " reads " + code(d.reg) + " written by " + (d.from + 1); })) + p("Answer: <strong>" + who.join(", ") + "</strong>")
      };
    }
  ]);

  var HAZARD_CASES = [
    { t: "lw $t0, 0($s0) is followed immediately by add $t1, $t0, $t2.", a: "data hazard" },
    { t: "add $t3, $t1, $t2 is followed immediately by sub $t4, $t3, $t5.", a: "data hazard" },
    { t: "One memory holds both instructions and data, and a lw reaches MEM in the same cycle another instruction is fetched.", a: "structural hazard" },
    { t: "Two instructions need the register file in the same cycle, and it cannot read and write in one cycle.", a: "structural hazard" },
    { t: "beq $t0, $t1, Done is fetched, but its outcome is not known until EX, so the next instruction to fetch is unknown.", a: "control hazard" },
    { t: "add $t0, $t1, $t2 is followed by sub $t3, $t4, $t5.", a: "no hazard" },
    { t: "lw $t0, 0($s0) is followed by sw $t1, 4($s0) (neither uses the other's registers).", a: "no hazard" },
    { t: "j Loop is fetched, and the instruction after it in memory has already entered the pipeline.", a: "control hazard" }
  ];
  /* Exam style: fill in the stage of every instruction in every cycle. A stalled instruction waits
     in ID (repeating it) and the instruction behind it waits in IF. */
  function pipelineDiagram(R) {
    var fwd = R.chance(0.5), ins, res;
    R.until(function () { ins = randomDepCode(R, 3, ["$t0", "$t1", "$t2", "$s0"]); res = pipelineStalls(ins, fwd); return true; },
      function () { return res.stalls >= 1 && res.stalls <= 4; });
    var D = res.D, total = res.cycles, fields = [], rows = [], solRows = [], idStart = [];
    ins.forEach(function (it, i) {
      var ifStart = i === 0 ? 1 : idStart[i - 1];
      idStart[i] = i === 0 ? 2 : D[i - 1] + 2;
      var cells = [], parts = [];
      for (var c = 1; c <= total; c++) {
        var st = "";
        if (c >= ifStart && c < idStart[i]) st = "IF";
        else if (c >= idStart[i] && c <= D[i] + 1) st = "ID";
        else if (c === D[i] + 2) st = "EX";
        else if (c === D[i] + 3) st = "MEM";
        else if (c === D[i] + 4) st = "WB";
        cells.push(st); parts.push(String(c - 1));
      }
      fields.push({ id: "r" + i, label: it.text, kind: "cells", parts: parts, answer: cells, size: 3 });
      rows.push([code(it.text)].concat(parts.map(function (pt) { return { f: "r" + i, part: pt }; })).concat([{ mark: "r" + i }]));
      solRows.push([code(it.text)].concat(cells.map(function (x) { return x || "·"; })));
    });
    var head = ["Instruction"]; for (var c2 = 1; c2 <= total; c2++) head.push(c2);
    return {
      prompt: p("These instructions run on the classic 5-stage pipeline " + (fwd ? "<strong>with forwarding</strong> (results reach the start of EX; a loaded value is ready after MEM)" : "<strong>without forwarding</strong>") +
        ". Registers are written in the first half of a cycle and read in the second half.") +
        p("Fill in each instruction's stage in every cycle (IF, ID, EX, MEM, WB). A stalled instruction repeats ID, and the instruction behind it repeats IF. Leave a cell blank when the instruction is not in the pipeline."),
      table: { head: head.concat([""]), rows: rows },
      fields: fields, wide: true,
      solution: table(head, solRows) + p(res.stalls + " stall cycle" + (res.stalls === 1 ? "" : "s") + "; " + total + " cycles in total.")
    };
  }

  G["pipelining/stalls"] = variants([pipelineDiagram,
    function (R) {
      var ins, a, b;
      R.until(function () { ins = randomDepCode(R, 4, ["$t0", "$t1", "$t2", "$s0"]); a = pipelineStalls(ins, false); b = pipelineStalls(ins, true); return true; }, function () { return a.stalls > 0; });
      return {
        prompt: p(PIPE_RULES) + numbered(ins) + p("How many stall cycles are needed without forwarding, and with forwarding? How many cycles does the code take with forwarding?"),
        fields: [num("nf", "Stalls without forwarding", a.stalls), num("f", "Stalls with forwarding", b.stalls), num("c", "Cycles with forwarding", b.cycles)],
        solution: p("Without forwarding, a dependent instruction right after its producer waits 2 cycles, and one two instructions later waits 1. With forwarding, only a load followed immediately by a use stalls (1 cycle).") +
          table(["Instruction", "ID cycle, no forwarding", "ID cycle, forwarding"], ins.map(function (i, k) { return [code(i.text), a.D[k], b.D[k]]; })) +
          p("Stalls: <strong>" + a.stalls + "</strong> and <strong>" + b.stalls + "</strong>; cycles with forwarding = 5 + " + ins.length + " − 1 + " + b.stalls + " = <strong>" + b.cycles + "</strong>")
      };
    },
    function (R) {
      var cases = R.shuffle(HAZARD_CASES).slice(0, 3), opts = ["data hazard", "structural hazard", "control hazard", "no hazard"];
      return {
        prompt: p("What kind of hazard, if any, does each situation create in a 5-stage pipeline?"),
        fields: cases.map(function (c, k) { return choice("h" + k, (k + 1) + ". " + c.t, opts, c.a, { wide: true }); }),
        solution: ul(cases.map(function (c, k) { return (k + 1) + ". <strong>" + c.a + "</strong>"; })) + p("Data hazards come from dependencies, structural hazards from shared hardware, control hazards from branches and jumps."),
        layout: "stack"
      };
    }
  ]);

  /* ----- 9. ILP ----- */
  function renameRun(R) {
    var regs = R.shuffle(["$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6"]).slice(0, 4), map = {}, next = 4, ins = [];
    regs.forEach(function (r, k) { map[r] = "V" + k; });
    var n = R.int(4, 5);
    for (var k = 0; k < n; k++) {
      var d = R.pick(regs), s1 = R.pick(regs), s2 = R.pick(regs), op = R.pick(["add", "sub", "and", "or", "xor", "addi"]), text, ren, src;
      if (op === "addi") { var im = R.int(1, 30); text = "addi " + d + ", " + s1 + ", " + im; ren = "addi V" + next + ", " + map[s1] + ", " + im; src = [s1]; }
      else { text = op + " " + d + ", " + s1 + ", " + s2; ren = op + " V" + next + ", " + map[s1] + ", " + map[s2]; src = s1 === s2 ? [s1] : [s1, s2]; }
      map[d] = "V" + next; next++;
      ins.push({ text: text, ren: ren, dst: d, src: src, name: map[d] });
    }
    return { regs: regs, ins: ins, map: map };
  }
  /* Exam style: the value name each register gets, column by column, plus the renamed instruction. */
  function renameTable(R) {
    var run = renameRun(R), fields = [], rows = [["Initially"].concat(run.regs.map(function (r, k) { return "V" + k; })).concat(["", "—"])];
    run.ins.forEach(function (it, k) {
      var answer = run.regs.map(function (r) { return r === it.dst ? it.name : ""; });
      fields.push({ id: "v" + k, label: it.text, kind: "cells", parts: ["0", "1", "2", "3"], answer: answer, size: 3 });
      fields.push({ id: "r" + k, label: "renamed " + it.text, kind: "text", accept: [it.ren], size: 16 });
      rows.push([code(it.text)].concat([0, 1, 2, 3].map(function (j) { return { f: "v" + k, part: String(j) }; })).concat([{ mark: "v" + k }, { f: "r" + k }]));
    });
    return {
      prompt: p("Use register renaming: give each result a new value name (V4, V5, … in order). In each row, write the new name under the register that instruction writes (leave the other register columns blank), and write the renamed instruction."),
      table: { head: ["Instruction"].concat(run.regs).concat(["", "Renamed instruction"]), rows: rows },
      fields: fields, wide: true,
      solution: table(["Instruction"].concat(run.regs).concat(["Renamed"]), run.ins.map(function (it) {
        return [code(it.text)].concat(run.regs.map(function (r) { return r === it.dst ? "<strong>" + it.name + "</strong>" : ""; })).concat([esc(it.ren)]);
      }))
    };
  }

  G["ilp/renaming"] = variants([renameTable, function (R) {
    var regs = R.shuffle(["$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6"]).slice(0, 4), map = {}, next = 4, fields = [], rows = [], sol = [];
    regs.forEach(function (r, k) { map[r] = "V" + k; });
    var n = R.int(4, 5);
    for (var k = 0; k < n; k++) {
      var d = R.pick(regs), s1 = R.pick(regs), s2 = R.pick(regs), op = R.pick(["add", "sub", "and", "or", "xor", "addi"]), text, ren;
      if (op === "addi") { var im = R.int(1, 30); text = "addi " + d + ", " + s1 + ", " + im; ren = "addi V" + next + ", " + map[s1] + ", " + im; }
      else { text = op + " " + d + ", " + s1 + ", " + s2; ren = op + " V" + next + ", " + map[s1] + ", " + map[s2]; }
      map[d] = "V" + next; next++;
      fields.push({ id: "r" + k, label: "", kind: "text", accept: [ren], size: 20 });
      rows.push([code(text), { f: "r" + k }]); sol.push([code(text), "<strong>" + esc(ren) + "</strong>"]);
    }
    return {
      prompt: p("Rename the registers so every result gets a new value name. Initially " + regs.map(function (r, k) { return code(r) + " = V" + k; }).join(", ") + ". Name new results V4, V5, … in order (for example " + code("add V4, V0, V1") + ")."),
      table: { head: ["Instruction", "Renamed"], rows: rows },
      fields: fields,
      solution: table(["Instruction", "Renamed"], sol) + p("Sources use each register's current name; every destination gets a fresh one, which removes WAR and WAW dependencies.")
    };
  }, function (R) {
    var run = renameRun(R), deps = findDependencies(run.ins), falseDeps = deps.filter(function (d) { return d.type !== "RAW"; }).length;
    var fields = run.regs.map(function (r) { return { id: "m" + r.slice(1), label: r + " holds", kind: "text", accept: [run.map[r]], size: 5 }; });
    fields.push(num("f", "False (WAR + WAW) dependencies removed", falseDeps));
    return {
      prompt: p("Registers are renamed as each instruction issues: initially " + run.regs.map(function (r, k) { return code(r) + " = V" + k; }).join(", ") + ", and each new result gets the next name (V4, V5, …).") +
        pre(run.ins.map(function (i, k) { return (k + 1) + ": " + i.text; })) +
        p("Which value name does each register hold at the end? How many WAR and WAW dependencies does renaming remove?"),
      fields: fields,
      solution: table(["Instruction", "Renamed"], run.ins.map(function (i) { return [code(i.text), esc(i.ren)]; })) +
        p("Final names: " + run.regs.map(function (r) { return code(r) + " = <strong>" + run.map[r] + "</strong>"; }).join(", ") + ".") +
        (deps.length ? ul(deps.map(function (d) { return d.type + " on " + code(d.reg) + ": " + (d.from + 1) + " → " + (d.to + 1); })) : "") +
        p("False dependencies removed: <strong>" + falseDeps + "</strong> (RAW dependencies remain).")
    };
  }]);
  G["ilp/unrolling"] = variants([function (R) {
    var n = R.pick([64, 100, 128, 200, 256]), u = R.pick([2, 4]), body4 = R.chance(0.5), b = body4 ? 4 : 3;
    var lines = body4 ? ["Loop: lw   $t0, 0($s1)", "      sll  $t0, $t0, 1", "      addu $t0, $t0, $s2", "      sw   $t0, 0($s1)", "      addi $s1, $s1, -4", "      bne  $s1, $zero, Loop"]
      : ["Loop: lw   $t0, 0($s1)", "      addu $t0, $t0, $s2", "      sw   $t0, 0($s1)", "      addi $s1, $s1, -4", "      bne  $s1, $zero, Loop"];
    var orig = (b + 2) * n, unr = (b * u + 2) * n / u;
    return {
      prompt: p("This loop processes an array of " + n + " ints:") + pre(lines) +
        p("It is unrolled " + u + " times: the body is copied " + u + " times with adjusted offsets, and the pointer update and branch run once per new iteration. How many instructions run before and after unrolling, and how many branches run after?"),
      fields: [num("a", "Instructions before", orig), num("b", "Instructions after", unr), num("c", "Branches after", n / u)],
      solution: p("Before: " + (b + 2) + " × " + n + " = <strong>" + orig + "</strong>. After: (" + u + " × " + b + " + 2) × " + n / u + " = <strong>" + unr + "</strong>. Branches: <strong>" + n / u + "</strong>.")
    };
  }, function (R) {
    var n = R.pick([64, 100, 128, 200]), u = R.pick([2, 4]), c = R.int(2, u);
    return {
      prompt: p("This loop walks backwards through an array of " + n + " ints:") +
        pre(["Loop: lw   $t0, 0($s1)", "      addu $t0, $t0, $s2", "      sw   $t0, 0($s1)", "      addi $s1, $s1, -4", "      bne  $s1, $zero, Loop"]) +
        p("It is unrolled " + u + " times, so each new iteration handles " + u + " elements and updates " + code("$s1") + " once. How many times does the new loop run? What immediate does its " + code("addi") + " use? What offset does the " + c + (c === 2 ? "nd" : c === 3 ? "rd" : "th") + " copy's " + code("lw") + " use?"),
      fields: [num("i", "Iterations", n / u), num("a", "addi immediate", -4 * u), num("o", "Offset in copy " + c, -4 * (c - 1))],
      solution: p("Iterations: " + n + " ÷ " + u + " = <strong>" + n / u + "</strong>. The pointer moves " + u + " ints per iteration: <strong>" + -4 * u + "</strong>. Copy k uses offset −4(k − 1), so copy " + c + " uses <strong>" + -4 * (c - 1) + "</strong>.")
    };
  }]);
  function vliwAny(R) {
    var n = R.int(6, 8), preds = [], lines = [], W = R.pick([2, 3]);
    for (var k = 0; k < n; k++) {
      var cand = [];
      for (var q = 0; q < k; q++) if (R.chance(0.35)) cand.push(q);
      cand = cand.slice(-2); preds.push(cand);
      var srcs = cand.map(function (q2) { return "$t" + q2; });
      while (srcs.length < 2) srcs.push(R.pick(["$s0", "$s1", "$s2", "$s3"]));
      lines.push((k + 1) + ": " + R.pick(["add", "sub", "and", "or", "xor"]) + " $t" + k + ", " + srcs[0] + ", " + srcs[1]);
    }
    var cp = criticalPath(preds), best = minSchedule(preds, { any: W });
    return {
      prompt: p("Registers are already renamed, so only true dependencies remain. Each instruction takes 1 cycle; a dependent instruction can issue the cycle after its producer.") + pre(lines) +
        p("What is the critical path length, the minimum number of cycles on a " + W + "-issue VLIW machine (any instruction in any slot), and the resulting CPI? (Fractions are fine.)"),
      fields: [num("cp", "Critical path", cp), num("c", "Minimum cycles", best), num("cpi", "CPI", best / n, { tol: 0.005 })],
      solution: p("Longest chain: <strong>" + cp + "</strong> instructions. The schedule needs at least max(" + cp + ", ⌈" + n + " ÷ " + W + "⌉) cycles; the best one takes <strong>" + best + "</strong>, so CPI = " + best + "/" + n + " = <strong>" + fmt(best / n) + "</strong>.")
    };
  }
  function typedCode(R) {
    var n = R.int(5, 6), ins = [], preds = [], types = [], lines = [], free = ["$t0", "$t1", "$t2", "$t3", "$t4", "$t5"];
    for (var k = 0; k < n; k++) {
      var mem = R.chance(0.45), cand = [];
      for (var q = 0; q < k; q++) if (ins[q].dst && R.chance(0.35)) cand.push(q);
      cand = cand.slice(-2);
      var srcs = cand.map(function (q2) { return ins[q2].dst; }), dst = free[k], text;
      if (mem && srcs.length && R.chance(0.5)) { text = "sw " + srcs[0] + ", " + 4 * R.int(0, 4) + "($s0)"; ins.push({ dst: null }); cand = cand.slice(0, 1); }
      else if (mem) { text = "lw " + dst + ", " + 4 * R.int(0, 4) + "($s0)"; ins.push({ dst: dst }); cand = []; }
      else {
        while (srcs.length < 2) srcs.push(R.pick(["$s1", "$s2"]));
        text = R.pick(["add", "sub", "or"]) + " " + dst + ", " + srcs[0] + ", " + srcs[1]; ins.push({ dst: dst });
      }
      preds.push(cand); types.push(mem ? "mem" : "alu"); lines.push((k + 1) + ": " + text);
    }
    return { n: n, preds: preds, types: types, lines: lines };
  }
  /* Exam style: fill in the schedule table itself. Any valid schedule with the minimum number of cycles is accepted. */
  function scheduleTable(R) {
    var c = typedCode(R), sched = bestSchedule(c.preds, c.types), best = sched.length, parts = [], rows = [];
    for (var r = 0; r < c.n; r++) {
      parts.push(r + "_0", r + "_1");
      rows.push([r + 1, { f: "s", part: r + "_0" }, { f: "s", part: r + "_1" }]);
    }
    var answer = [];
    for (var r2 = 0; r2 < c.n; r2++) { var cy = sched[r2] || [null, null]; answer.push(cy[0] === null ? "" : String(cy[0] + 1), cy[1] === null ? "" : String(cy[1] + 1)); }
    rows[0].push({ mark: "s" });
    return {
      prompt: p("A two-issue processor can start one ALU instruction and one load/store in the same cycle. Each instruction takes 1 cycle, and a dependent instruction can issue the cycle after its producer. Reorder freely as long as dependencies are respected.") + pre(c.lines) +
        p("Fill in a schedule that uses as few cycles as possible: write instruction numbers in the slots and leave unused slots blank. Then give the CPI."),
      table: { head: ["Cycle", "ALU / branch", "Load / store", ""], rows: rows },
      fields: [{ id: "s", label: "schedule", kind: "schedule", parts: parts, answer: answer, n: c.n, preds: c.preds, types: c.types, best: best, size: 3 },
        num("cpi", "CPI", best / c.n, { tol: 0.005 })],
      solution: table(["Cycle", "ALU / branch", "Load / store"], sched.map(function (cy, i) { return [i + 1, cy[0] === null ? "" : cy[0] + 1, cy[1] === null ? "" : cy[1] + 1]; })) +
        p("One best schedule takes <strong>" + best + "</strong> cycles (other orders can tie), so CPI = " + best + "/" + c.n + " = <strong>" + fmt(best / c.n) + "</strong>.")
    };
  }
  function vliwTyped(R) {
    var n = R.int(5, 6), ins = [], preds = [], types = [], lines = [], free = ["$t0", "$t1", "$t2", "$t3", "$t4", "$t5"];
    for (var k = 0; k < n; k++) {
      var mem = R.chance(0.45), cand = [];
      for (var q = 0; q < k; q++) if (ins[q].dst && R.chance(0.35)) cand.push(q);
      cand = cand.slice(-2);
      var srcs = cand.map(function (q2) { return ins[q2].dst; }), dst = free[k], text;
      if (mem && srcs.length && R.chance(0.5)) { text = "sw " + srcs[0] + ", " + 4 * R.int(0, 4) + "($s0)"; ins.push({ dst: null }); cand = cand.slice(0, 1); }
      else if (mem) { text = "lw " + dst + ", " + 4 * R.int(0, 4) + "($s0)"; ins.push({ dst: dst }); cand = []; }
      else {
        while (srcs.length < 2) srcs.push(R.pick(["$s1", "$s2"]));
        text = R.pick(["add", "sub", "or"]) + " " + dst + ", " + srcs[0] + ", " + srcs[1]; ins.push({ dst: dst });
      }
      preds.push(cand); types.push(mem ? "mem" : "alu"); lines.push((k + 1) + ": " + text);
    }
    var best = minSchedule(preds, { alu: 1, mem: 1 }, types);
    return {
      prompt: p("A two-issue processor can start one ALU instruction and one load/store in the same cycle. Each instruction takes 1 cycle, a dependent instruction can issue the cycle after its producer, and instructions may be reordered as long as dependencies are respected.") + pre(lines) +
        p("What is the minimum number of cycles, and the resulting CPI? (Fractions are fine.)"),
      fields: [num("c", "Minimum cycles", best), num("cpi", "CPI", best / n, { tol: 0.005 })],
      solution: p("ALU instructions: " + types.filter(function (t) { return t === "alu"; }).length + "; loads/stores: " + types.filter(function (t) { return t === "mem"; }).length + ". The best schedule pairs independent ALU and memory instructions and takes <strong>" + best + "</strong> cycles, so CPI = " + best + "/" + n + " = <strong>" + fmt(best / n) + "</strong>.")
    };
  }
  G["ilp/vliw"] = variants([scheduleTable, vliwAny, vliwTyped]);

  /* ----- 10. Multicore ----- */
  G["multicore/mesi"] = variants([function (R) {
    var cores = R.pick([3, 3, 4]), reqs, rows, n = R.int(6, 7), c;
    R.until(function () {
      reqs = []; for (var k = 0; k < n; k++) reqs.push({ p: R.int(0, cores - 1), op: R.chance(0.55) ? "R" : "W" });
      rows = simulateMesi(reqs, cores); return true;
    }, function () { return rows.some(function (r) { return r.hit; }) && rows.some(function (r) { return r.supplier.indexOf("P") === 0; }); });
    var stOpts = ["M", "E", "S", "I", "-"], supOpts = ["-", "Memory"];
    for (c = 1; c <= cores; c++) supOpts.push("P" + c);
    rows.forEach(function (r) { if (supOpts.indexOf(r.supplier) === -1) supOpts.push(r.supplier); });
    var fields = [], init = ["Initially"], trows = [];
    for (c = 0; c < cores; c++) init.push("-");
    trows.push(init.concat(["-", "-"]));
    rows.forEach(function (r, k) {
      var cells = ["P" + (r.req.p + 1) + (r.req.op === "R" ? " reads" : " writes")];
      r.states.forEach(function (s, q) { fields.push(choice("s" + k + q, "", stOpts, s)); cells.push({ f: "s" + k + q }); });
      var accept = r.supplier.indexOf(" or ") !== -1 ? [r.supplier].concat(r.supplier.split(" or ")) : [r.supplier];
      fields.push(choice("d" + k, "", supOpts, r.supplier, { answers: accept }), choice("h" + k, "", ["hit", "miss"], r.hit ? "hit" : "miss"));
      cells.push({ f: "d" + k }, { f: "h" + k }); trows.push(cells);
    });
    var head = ["Request"]; for (c = 1; c <= cores; c++) head.push("P" + c);
    return {
      prompt: p(cores + " cores have private caches kept coherent with MESI, all starting empty (−). For each request to the same block, give every cache's state afterwards, who supplies the data, and whether it is a hit."),
      table: { head: head.concat(["Supplier", "Hit/miss"]), rows: trows },
      fields: fields,
      solution: table(head.concat(["Supplier", "Hit/miss"]), rows.map(function (r) { return ["P" + (r.req.p + 1) + (r.req.op === "R" ? " reads" : " writes")].concat(r.states).concat([r.supplier, r.hit ? "hit" : "miss"]); })) +
        ul(["A read miss gives E if no other cache has the block, otherwise S (other copies become S and one of them supplies it).", "A write leaves the writer in M and invalidates every other copy.", "Hits need no data (−)."])
    };
  }, function (R) {
    var cores = 3, reqs = [], n = R.int(5, 7);
    for (var k = 0; k < n; k++) reqs.push({ p: R.int(0, 2), op: R.chance(0.55) ? "R" : "W" });
    var rows = simulateMesi(reqs, cores), last = rows[rows.length - 1].states;
    var misses = rows.filter(function (r) { return !r.hit; }).length, mem = rows.filter(function (r) { return r.supplier === "Memory"; }).length;
    var fields = last.map(function (s, q) { return choice("f" + q, "P" + (q + 1) + " final state", ["M", "E", "S", "I", "-"], s); });
    fields.push(num("m", "Misses", misses), num("mm", "Times memory supplies the data", mem));
    return {
      prompt: p("Three cores with private MESI caches, all starting empty, make these requests to the same block:") +
        p(code(reqs.map(function (r) { return "P" + (r.p + 1) + (r.op === "R" ? " read" : " write"); }).join(", "))) +
        p("What is the block's final state in each cache? How many requests miss, and how many times does main memory supply the data?"),
      fields: fields,
      solution: table(["Request", "P1", "P2", "P3", "Supplier", "Hit/miss"], rows.map(function (r) { return ["P" + (r.req.p + 1) + (r.req.op === "R" ? " reads" : " writes")].concat(r.states).concat([r.supplier, r.hit ? "hit" : "miss"]); })) +
        p("Misses: <strong>" + misses + "</strong>; memory supplies the data <strong>" + mem + "</strong> time" + (mem === 1 ? "" : "s") + " (only when no other cache holds the block).")
    };
  }]);
  G["multicore/sharing"] = variants([
    function (R) {
      var steps, kinds;
      R.until(function () { steps = []; for (var k = 0; k < 6; k++) steps.push({ p: R.int(0, 1), op: R.chance(0.5) ? "W" : "R", w: R.int(0, 3) }); kinds = classifySharing(steps); return true; },
        function () { return kinds.indexOf("true sharing miss") !== -1 && kinds.indexOf("false sharing miss") !== -1; });
      var opts = ["hit", "cold miss", "true sharing miss", "false sharing miss"];
      return {
        prompt: p("Words x[0]–x[3] share one cache block. P1 and P2 have private caches (initially empty) with write-invalidate coherence; a write to a block the writer already holds is a hit. Classify each access.") +
          p("After a copy is invalidated, its next miss is a <em>true sharing</em> miss if it touches a word the other core wrote since the invalidation, otherwise a <em>false sharing</em> miss."),
        table: { head: ["Step", "Access", "Result"], rows: steps.map(function (s, k) { return [k + 1, "P" + (s.p + 1) + (s.op === "R" ? " reads" : " writes") + " x[" + s.w + "]", { f: "k" + k }]; }) },
        fields: kinds.map(function (kd, k) { return choice("k" + k, "", opts, kd); }),
        solution: table(["Step", "Access", "Result"], steps.map(function (s, k) { return [k + 1, "P" + (s.p + 1) + (s.op === "R" ? " reads" : " writes") + " x[" + s.w + "]", "<strong>" + kinds[k] + "</strong>"]; }))
      };
    },
    function (R) {
      var steps, kinds;
      R.until(function () { steps = []; for (var k = 0; k < 6; k++) steps.push({ p: R.int(0, 1), op: R.chance(0.5) ? "W" : "R", w: R.int(1, 2) }); kinds = classifySharing(steps); return true; },
        function () { return kinds.indexOf("true sharing miss") !== -1 || kinds.indexOf("false sharing miss") !== -1; });
      var c = function (k) { return kinds.filter(function (x) { return x === k; }).length; };
      return {
        prompt: p("x[1] and x[2] are in the same cache block. P1 and P2 (private caches, initially empty, write-invalidate; writing a block you already hold is a hit) perform:") +
          table(["Time", "Access"], steps.map(function (s, k) { return [k + 1, "P" + (s.p + 1) + (s.op === "R" ? " reads" : " writes") + " x[" + s.w + "]"]; })) +
          p("How many cold misses, true sharing misses and false sharing misses occur?"),
        fields: [num("c", "Cold misses", c("cold miss")), num("t", "True sharing misses", c("true sharing miss")), num("f", "False sharing misses", c("false sharing miss"))],
        solution: table(["Time", "Result"], kinds.map(function (k, i) { return [i + 1, k]; }))
      };
    }
  ]);
  G["multicore/races"] = function (R) {
    var n = R.int(2, 4), v = R.pick([0, 10, 50, 100]), k = R.pick([1, 1, 2, 5]), vals = [];
    for (var i = 1; i <= n; i++) vals.push(v + i * k);
    return {
      prompt: p(n + " threads run this code at the same time, with no synchronization. " + code("Mem[$s0]") + " starts at " + v + ".") +
        pre(["lw   $t0, 0($s0)", "addi $t0, $t0, " + k, "sw   $t0, 0($s0)"]) + p("List every value " + code("Mem[$s0]") + " could hold after all threads finish."),
      fields: [{ id: "v", label: "Possible values", kind: "set", answer: vals, size: 16 }],
      solution: p("Each thread reads, adds " + k + " and writes back. If threads read before others write, their updates overwrite each other, so anywhere from 1 to " + n + " updates survive: <strong>" + vals.join(", ") + "</strong>.")
    };
  };

  /* ----- 11. GPU ----- */
  G["gpu/divergence"] = variants([function (R) {
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
      total += cost; per.push("warp " + w + ": " + (anyT && anyF ? "both paths" : anyT ? "path A only" : "path B only") + ", " + cost + " cycles");
    }
    return {
      prompt: p("A block of " + T + " threads (warps of 32) runs:") + pre(["if (" + cond + ") {", "    // path A: " + a + " cycles", "} else {", "    // path B: " + b + " cycles", "}"]) +
        p("How many warps are there, how many diverge, and what is the total number of cycles summed over all warps?"),
      fields: [num("w", "Warps", warps), num("d", "Divergent warps", div), num("c", "Total warp-cycles", total)],
      solution: ul(per) + p("A warp runs every path that at least one of its threads takes, one after the other. Divergent warps: <strong>" + div + "</strong>; total <strong>" + total + "</strong> cycles.")
    };
  }, function (R) {
    var T = 128, c = R.pick([16, 40, 64, 72, 100, 112]), lo = R.pick([0, 8, 32]), test = function (t) { return t >= lo && t < c; }, rows = [], fields = [];
    for (var w = 0; w < 4; w++) {
      var anyT = false, anyF = false, active = 0;
      for (var t = 32 * w; t < 32 * w + 32; t++) { if (test(t)) { anyT = true; active++; } else anyF = true; }
      fields.push(choice("d" + w, "", YN, anyT && anyF ? "yes" : "no"), num("a" + w, "", active, { size: 3 }));
      rows.push(["warp " + w + " (threads " + 32 * w + "–" + (32 * w + 31) + ")", { f: "d" + w }, { f: "a" + w }]);
    }
    return {
      prompt: p("A block of 128 threads (4 warps of 32) runs:") + pre(["if (threadIdx.x >= " + lo + " && threadIdx.x < " + c + ") {", "    // do work", "}"]) +
        p("For each warp, does it diverge, and how many of its threads take the if-path?"),
      table: { head: ["Warp", "Diverges?", "Threads in the if-path"], rows: rows },
      fields: fields,
      solution: p("Threads " + lo + "–" + (c - 1) + " take the if-path. A warp diverges when some, but not all, of its 32 threads do.") +
        table(["Warp", "Diverges?", "Threads in the if-path"], [0, 1, 2, 3].map(function (w) { var f1 = fields[2 * w], f2 = fields[2 * w + 1]; return ["warp " + w, f1.answer, f2.answer]; }))
    };
  }]);
  G["gpu/coalescing"] = variants([function (R) {
    var o2 = R.until(function () {
      var s = R.pick([1, 2, 4, 8, 32]), o = R.chance(0.5) ? 0 : R.pick([1, 4, 8, 16]), seg = R.pick([32, 128]), segs = {};
      for (var t = 0; t < 32; t++) segs[Math.floor(4 * (o + s * t) / seg)] = true;
      var n = Object.keys(segs).length;
      return { s: s, o: o, seg: seg, n: n, eff: 128 / (n * seg) * 100 };
    }, function (x) { return exact(x.eff, 2); });
    var s = o2.s, o = o2.o, seg = o2.seg, n = o2.n, eff = o2.eff;
    return {
      prompt: p("Each of the 32 threads in a warp reads one 4-byte float:") + pre(["float v = a[" + (o ? o + " + " : "") + (s === 1 ? "" : s + " * ") + "threadIdx.x];"]) +
        p("a[] starts at a multiple of " + seg + " bytes, and memory is read in aligned " + seg + "-byte transactions. How many transactions does the warp need, and what percentage of the transferred bytes are used?"),
      fields: [num("n", "Transactions", n), num("e", "Efficiency", round(eff, 2), { suffix: "%" })],
      solution: p("Thread t reads byte " + (o ? 4 * o + " + " : "") + 4 * s + "t, so the warp spans bytes " + 4 * o + " to " + (4 * (o + 31 * s) + 3) + ", touching <strong>" + n + "</strong> " + seg + "-byte segments. Used 128 of " + n * seg + " bytes: <strong>" + fmt(eff) + "%</strong>.")
    };
  }, function (R) {
    var fieldsN = R.pick([2, 4, 8]), size = 4 * fieldsN, aos = 32 * size / 128, soa = 1;
    return {
      prompt: p("Each particle has " + fieldsN + " floats (4 bytes each). Each of the 32 threads in a warp reads the " + code("x") + " value of one particle (thread t reads particle t). Memory is read in aligned 128-byte transactions, and the arrays start at multiples of 128.") +
        pre(["// array of structs: struct P { float x, y" + (fieldsN > 2 ? ", …" : "") + "; } p[N];", "float v = p[threadIdx.x].x;", "", "// struct of arrays: float x[N], y[N]" + (fieldsN > 2 ? ", …" : "") + ";", "float v = x[threadIdx.x];"]) +
        p("How many transactions does the warp need with each layout?"),
      fields: [num("a", "Array of structs", aos), num("s", "Struct of arrays", soa)],
      solution: p("Array of structs: consecutive x values are " + size + " bytes apart, so the warp spans 32 × " + size + " = " + 32 * size + " bytes = <strong>" + aos + "</strong> transactions.") +
        p("Struct of arrays: the 32 x values are contiguous (128 bytes) = <strong>1</strong> transaction. This is why GPU code prefers struct-of-arrays layouts.")
    };
  }]);

  /* =====================================================================
     Answer checking
     ===================================================================== */
  function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ""); }
  function parseNum(s) {
    s = String(s).trim().replace(/,/g, "").replace(/%$/, "").trim();
    var fr = /^([-+]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s);
    if (fr) { var d = parseFloat(fr[2]); return d === 0 ? NaN : parseFloat(fr[1]) / d; }
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
  function parseNums(raw) {
    var toks = String(raw).split(/[\s,;]+/).filter(function (t) { return t && !/^(-|—|empty|none)$/i.test(t); });
    return toks.map(function (t) { return /^0x/i.test(t) ? parseInt(t, 16) : parseNum(t); });
  }
  var CHECKERS = {
    number: function (f, raw) {
      var v = parseNum(raw);
      if (isNaN(v)) return { ok: false, note: "“" + raw.trim() + "” isn't a number." };
      var tol = Math.max(f.tol || 0, f.rel ? f.rel * Math.abs(f.answer) : 0);
      return { ok: Math.abs(v - f.answer) <= tol + 1e-9 };
    },
    text: function (f, raw) { var r = norm(raw); return { ok: f.accept.some(function (a) { return norm(a) === r; }) }; },
    choice: function (f, raw) { if (f.any) return { ok: true }; return { ok: raw === f.answer || (f.answers || []).indexOf(raw) !== -1 }; },
    set: function (f, raw) {
      var vals = parseNums(raw);
      if (vals.some(isNaN)) return { ok: false, note: "Use numbers separated by commas." };
      var uniq = vals.filter(function (v, i) { return vals.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      return { ok: uniq.length === f.answer.length && uniq.every(function (v, i) { return v === f.answer[i]; }) };
    },
    list: function (f, raw) {
      var vals = parseNums(raw);
      if (vals.some(isNaN)) return { ok: false, note: "Use numbers separated by commas." };
      return { ok: vals.length === f.answer.length && vals.every(function (v, i) { return v === f.answer[i]; }) };
    },
    hex: function (f, raw) {
      var s = norm(raw).replace(/^0x/, "").replace(/_/g, "");
      if (!/^[0-9a-f]+$/.test(s)) return { ok: false, note: "Give the answer in hexadecimal, like 0x1A2B." };
      return { ok: s.length <= 8 && parseInt(s, 16) >>> 0 === f.answer >>> 0 };
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
    /* raw: one array of cell strings per line (way). Lines and bytes may be in any order. */
    /* raw: array of cell strings, one per part, compared cell by cell ("-" counts as blank) */
    cells: function (f, raw) {
      var clean = function (x) { x = norm(x); return /^(-|—)$/.test(x) ? "" : x; };
      return { ok: raw.length === f.answer.length && raw.every(function (x, i) { return clean(x) === norm(f.answer[i]); }) };
    },
    /* raw: two cells per cycle (ALU slot, load/store slot); any valid minimum-length schedule passes */
    schedule: function (f, raw) {
      var where = {}, last = -1, problem = null;
      for (var k = 0; k < raw.length; k++) {
        var x = String(raw[k]).trim();
        if (x === "" || /^(-|—)$/.test(x)) continue;
        var v = parseInt(x, 10), row = Math.floor(k / 2), col = k % 2;
        if (!(v >= 1 && v <= f.n) || String(v) !== x) return { ok: false, note: "Use instruction numbers 1–" + f.n + "." };
        if (where[v] !== undefined) return { ok: false, note: "Instruction " + v + " appears more than once." };
        if ((col === 0) !== (f.types[v - 1] === "alu")) problem = problem || "Instruction " + v + " is in the wrong kind of slot.";
        where[v] = row; last = Math.max(last, row);
      }
      for (var i = 1; i <= f.n; i++) if (where[i] === undefined) return { ok: false, note: "Instruction " + i + " is missing." };
      if (problem) return { ok: false, note: problem };
      for (var j = 0; j < f.n; j++) {
        for (var q = 0; q < f.preds[j].length; q++) {
          if (where[j + 1] <= where[f.preds[j][q] + 1]) return { ok: false, note: "Instruction " + (j + 1) + " issues before instruction " + (f.preds[j][q] + 1) + " has produced its value." };
        }
      }
      if (last + 1 > f.best) return { ok: false, note: "That schedule is valid but takes " + (last + 1) + " cycles; it can be done in " + f.best + "." };
      return { ok: true };
    },
    cacheset: function (f, raw) {
      var got = [], bad = false;
      raw.forEach(function (cells) {
        var vals = cells.map(function (x) { return String(x).trim(); }).filter(function (x) { return x !== "" && !/^(-|—)$/.test(x); });
        if (!vals.length) return;
        if (vals.length !== f.block) { bad = true; return; }
        var nums = vals.map(parseNum);
        if (nums.some(isNaN)) { bad = true; return; }
        got.push(nums.sort(function (a, b) { return a - b; }).join(","));
      });
      if (bad) return { ok: false, note: "Fill every byte of a line, or leave the whole line blank." };
      var want = f.answer.map(function (l) { return l.slice().sort(function (a, b) { return a - b; }).join(","); });
      got.sort(); want.sort();
      return { ok: got.length === want.length && got.every(function (g, i) { return g === want[i]; }) };
    },
    bool: function (f, raw) {
      var parsed;
      try { parsed = parseBool(raw, f.vars); } catch (e) { return { ok: false, note: "Couldn't read that expression (" + e.message + ")." }; }
      var tt = truthTable(parsed.tree, f.vars);
      for (var i = 0; i < tt.length; i++) {
        if (tt[i] !== f.table[i]) return { ok: false, note: "Not equivalent: the expressions differ when " + f.vars.join("") + " = " + bin(i, f.vars.length) + "." };
      }
      if (parsed.literals > f.maxLiterals) return { ok: false, note: "Equivalent, but it can be simplified further (aim for " + f.maxLiterals + " literal" + (f.maxLiterals === 1 ? "" : "s") + ")." };
      return { ok: true };
    }
  };
  function check(field, raw) {
    if (field.kind === "cells" || field.kind === "schedule") {
      raw = raw || [];
      var allBlank = raw.every(function (x) { return String(x).trim() === ""; });
      if (allBlank && field.answer.some(function (x) { return x !== ""; })) return { ok: false, blank: true };
      return CHECKERS[field.kind](field, raw);
    }
    if (field.kind === "cacheset") {
      var empty = !raw || raw.every(function (cells) { return cells.every(function (x) { return String(x).trim() === ""; }); });
      if (empty && field.answer.length) return { ok: false, blank: true };
      return CHECKERS.cacheset(field, raw || []);
    }
    raw = raw === undefined || raw === null ? "" : String(raw);
    if (raw.trim() === "" && field.kind !== "set") return { ok: false, blank: true };
    return CHECKERS[field.kind](field, raw);
  }
  function sampleAnswer(f) {
    switch (f.kind) {
      case "number": return exact(f.answer, 2) ? String(f.answer) : String(round(f.answer, 4));
      case "text": return f.accept[0];
      case "choice": return f.answer;
      case "set": case "list": return f.answer.join(", ");
      case "hex": return hex(f.answer, 1);
      case "bits": return f.answer;
      case "reg": return REGS[f.answer];
      case "bool": return f.example;
      case "cells": case "schedule": return f.answer.slice();
      case "cacheset":
        var lines = f.answer.map(function (l) { return l.map(String); });
        while (lines.length < f.ways) { var e = []; for (var k = 0; k < f.block; k++) e.push(""); lines.push(e); }
        return lines;
    }
  }
  function generate(key, seed) { var g = G[key]; return g ? g(Rng(seed >>> 0)) : null; }

  root.CS3350_PRACTICE = {
    has: function (key) { return !!G[key]; },
    keys: function () { return Object.keys(G); },
    generate: generate, check: check, sampleAnswer: sampleAnswer,
    _sim: { simulateCache: simulateCache, classifyMisses: classifyMisses, simulateMesi: simulateMesi, classifySharing: classifySharing,
      findDependencies: findDependencies, pipelineStalls: pipelineStalls, minSchedule: minSchedule, parseBool: parseBool, truthTable: truthTable,
      encode: encode, minSop: minSop, parseNum: parseNum }
  };
})(typeof window !== "undefined" ? window : globalThis);
