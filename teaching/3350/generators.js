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
    return { expr: expr, literals: best.lits, terms: best.terms };
  }

  /* Print an expression the way the course writes it: NOT as a bar over the negated part.
     html → <span class="ov">…</span>; text (for dropdown options) → combining overline U+0305. */
  function boolVars(src) { var v = []; src.replace(/[a-z]/g, function (c) { if (v.indexOf(c) === -1) v.push(c); }); return v; }
  function printBool(n, html) {
    function flat(node, op) { return node.op === op ? flat(node.a, op).concat(flat(node.b, op)) : [node]; }
    function bar(inner) { return html ? "<span class=\"ov\">" + inner + "</span>" : inner.replace(/\s+/g, "").split("").map(function (ch) { return ch + "\u0305"; }).join(""); }
    switch (n.op) {
      case "or": return flat(n, "or").map(function (k) { return printBool(k, html); }).join(" + ");
      /* in plain text, bars on neighbouring letters would merge, so separate factors with · */
      case "and": return flat(n, "and").map(function (k) { return k.op === "or" ? "(" + printBool(k, html) + ")" : printBool(k, html); }).join(html ? "" : "·");
      case "not": return bar(printBool(n.a, html));
      case "const": return n.v ? "1" : "0";
      default: return n.v;
    }
  }
  function exprHtml(src) { return printBool(parseBool(src, boolVars(src)).tree, true); }
  function exprText(src) { return printBool(parseBool(src, boolVars(src)).tree, false); }
  function specText(spec, vars) {
    var t = spec.map(function (v, k) { return v === 2 ? "" : vars[k] + (v ? "" : "'"); }).join("");
    return t || "1";
  }
  /* Boolean-algebra steps from the sum of minterms to the simplest sum of products. */
  function deriveSteps(tt, vars, best) {
    var ms = minterms(tt), n = vars.length;
    var mSpec = function (m) { var sp = []; for (var k = 0; k < n; k++) sp.push((m >> (n - 1 - k)) & 1); return sp; };
    var line = function (terms) { return terms.map(function (t) { return exprHtml(t); }).join(" + "); };
    var out = [p("Start from the sum of minterms: F = " + line(ms.map(function (m) { return specText(mSpec(m), vars); })))];
    if (!best.terms || !best.terms.length) return out.join("") + p("So F = <strong>" + best.expr + "</strong>.");
    var uses = {};
    best.terms.forEach(function (t) { t.cover.forEach(function (m) { uses[m] = (uses[m] || 0) + 1; }); });
    var twice = ms.filter(function (m) { return uses[m] > 1; });
    if (twice.length) out.push(p("Some minterms are needed by more than one group, so repeat them using the idempotent law (a + a = a): " +
      twice.map(function (m) { return exprHtml(specText(mSpec(m), vars)); }).join(", ") + "."));
    best.terms.forEach(function (t) {
      var free = [];
      t.spec.forEach(function (v, k) { if (v === 2) free.push(k); });
      if (!free.length) { out.push(p(exprHtml(specText(t.spec, vars)) + " has no neighbour to combine with, so it stays as it is.")); return; }
      var cur = t.cover.map(mSpec), steps = [line(cur.map(function (sp) { return specText(sp, vars); }))];
      for (var i = free.length - 1; i >= 0; i--) {
        var f = free[i], groups = {}, order = [];
        cur.forEach(function (sp) { var key = sp.map(function (v, k) { return k === f ? 2 : v; }).join(""); if (!groups[key]) { groups[key] = sp.map(function (v, k) { return k === f ? 2 : v; }); order.push(key); } });
        var lit0 = exprHtml(vars[f] + "'"), lit1 = exprHtml(vars[f]);
        steps.push("= " + order.map(function (key) {
          var common = specText(groups[key], vars);
          return (common === "1" ? "" : exprHtml(common)) + "(" + lit0 + " + " + lit1 + ")";
        }).join(" + ") + "   <span class=\"meta\">(distributive law)</span>");
        cur = order.map(function (key) { return groups[key]; });
        steps.push("= " + line(cur.map(function (sp) { return specText(sp, vars); })) + "   <span class=\"meta\">(" + lit0 + " + " + lit1 + " = 1, and a·1 = a)</span>");
      }
      out.push("<div class=\"derive\">" + steps.map(function (st) { return "<div>" + st + "</div>"; }).join("") + "</div>");
    });
    out.push(p("So F = <strong>" + exprHtml(best.expr) + "</strong>" + " (" + best.literals + " literal" + (best.literals === 1 ? "" : "s") + ")."));
    return out.join("");
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
  function classifySharing(steps, loaded) {
    var has = [!!loaded, !!loaded], valid = [!!loaded, !!loaded], written = [{}, {}], out = [];
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
  /* mode: "none" (basic datapath), "alu" (ALU-ALU and MEM-ALU forwarding) or "mem" (also MEM-MEM forwarding,
     which feeds a loaded or computed value straight into a sw's data). true/false mean "alu"/"none". */
  function pipelineStalls(ins, mode) {
    if (mode === true) mode = "alu";
    if (!mode) mode = "none";
    var D = [], lastWriter = {};
    for (var i = 0; i < ins.length; i++) {
      var d = i === 0 ? 1 : D[i - 1] + 1;
      ins[i].src.forEach(function (r) {
        var j = lastWriter[r];
        if (j === undefined) return;
        var need;
        if (mode === "none") need = D[j] + 3;
        else if (mode === "mem" && ins[i].data === r && ins[i].base !== r) need = D[j] + 1;
        else need = ins[j].load ? D[j] + 2 : D[j] + 1;
        if (need > d) d = need;
      });
      D.push(d);
      if (ins[i].dst) lastWriter[ins[i].dst] = i;
    }
    var stalls = D[D.length - 1] - ins.length;
    return { stalls: stalls, cycles: 5 + ins.length - 1 + stalls, D: D };
  }
  /* The 2-issue VLIW from lecture: one ALU/branch slot and one lw/sw slot per cycle. All forwarding, but a
     loaded value needs one instruction (cycle) between the load and its use; other results are usable the
     next cycle. If `last` is given, that instruction (the loop's branch) must issue in the final cycle.
     Returns one shortest schedule as [[aluInstr|null, memInstr|null], ...]. */
  function vliwSchedule(preds, types, loads, last) {
    var n = preds.length, full = (1 << n) - 1, start = "0:0", prev = {}, queue = [[0, 0]], end = null;
    if (last === undefined) last = -1;
    prev[start] = null;
    while (queue.length) {
      var st = queue.shift(), done = st[0], recent = st[1], key = done + ":" + recent;
      if (done === full) { end = key; break; }
      var ready = [];
      for (var i = 0; i < n; i++) {
        if (done & (1 << i)) continue;
        if (preds[i].every(function (q) { return (done & (1 << q)) && !(recent & (1 << q)); })) ready.push(i);
      }
      var alu = ready.filter(function (x) { return types[x] === "alu"; }), mem = ready.filter(function (x) { return types[x] === "mem"; });
      var moves = [];
      (alu.length ? alu.concat([null]) : [null]).forEach(function (a) { (mem.length ? mem.concat([null]) : [null]).forEach(function (m) { moves.push([a, m]); }); });
      moves.forEach(function (mv) {
        var a = mv[0], m = mv[1], t = done;
        if (a !== null) t |= 1 << a;
        if (m !== null) t |= 1 << m;
        if (last >= 0 && a === last && t !== full) return;
        var rec = 0;
        if (a !== null && loads[a]) rec |= 1 << a;
        if (m !== null && loads[m]) rec |= 1 << m;
        if (t === done && !recent) return;            /* an all-nop cycle only helps while waiting on a load */
        var k2 = t + ":" + rec;
        if (prev[k2] === undefined) { prev[k2] = { from: key, pick: [a, m] }; queue.push([t, rec]); }
      });
    }
    var out = [], cur = end;
    while (cur && prev[cur]) { out.unshift(prev[cur].pick); cur = prev[cur].from; }
    return out;
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

  G["cpu/effective-cpi"] = variants([
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
      /* as in lecture: one improvement, then "2.2 versus 1.6 means 37.5% faster" */
      var m, newCpi, desc, eff2, pct;
      R.until(function () {
        m = mixTable(R); newCpi = m.cpi.slice();
        var k = R.int(0, 2);
        if (k === 0) { if (m.cpi[1] < 3) return false; var v = R.int(1, m.cpi[1] - 1); newCpi[1] = v; desc = "a better data cache reduces the average load time to " + v + " cycle" + (v > 1 ? "s" : ""); }
        else if (k === 1) { if (m.cpi[3] < 2) return false; newCpi[3] = m.cpi[3] - 1; desc = "branch prediction saves one cycle off the branch time"; }
        else { newCpi[0] = m.cpi[0] / 2; desc = "two ALU instructions can be executed at once (the ALU CPI halves)"; }
        eff2 = sum(m.freq.map(function (f, i) { return f / 100 * newCpi[i]; }));
        pct = (m.eff / eff2 - 1) * 100;
        return true;
      }, function (ok) { return ok && exact(eff2, 2) && pct > 0 && exact(pct, 1); });
      return {
        prompt: p("A program has the instruction mix below. Suppose " + desc + ". The instruction count and clock cycle do not change.") +
          table(["Op", "Freq", "CPI<sub>i</sub>"], mixRows(m)) + p("What is the new effective CPI, and how much faster does the program run?"),
        fields: [num("cpi", "New effective CPI", round(eff2, 2)), num("pct", "Faster by", round(pct, 1), { suffix: "%" })],
        solution: p("Old CPI = " + cpiTerms(m) + " = " + fmt(m.eff) + ".") +
          p("New CPI = " + newCpi.map(function (c, i) { return fmt(c) + " × " + fmt(m.freq[i] / 100, 1); }).join(" + ") + " = <strong>" + fmt(eff2) + "</strong>.") +
          p("CPU time<sub>new</sub> = " + fmt(eff2) + " × IC × CC, so " + fmt(m.eff) + " versus " + fmt(eff2) + ": " + fmt(m.eff) + " ÷ " + fmt(eff2) + " = " + fmt(m.eff / eff2, 4) + ", which means <strong>" + fmt(pct, 1) + "% faster</strong>.")
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
  G["cpu/cpu-time"] = variants([
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
      /* CR = 1 / CC */
      var ps = R.pick([200, 250, 400, 500, 1000, 2000]), ghz = 1000 / ps, toRate = R.chance(0.5);
      return toRate ? {
        prompt: p("A processor's clock period is " + ps + " ps. What is its clock rate?"),
        fields: [num("f", "Clock rate", ghz, { suffix: "GHz" })],
        solution: p("Clock rate = 1 ÷ clock period = 1 ÷ (" + ps + " × 10⁻¹² s) = " + fmt(1000 / ps) + " × 10⁹ Hz = <strong>" + fmt(ghz) + " GHz</strong>")
      } : {
        prompt: p("A processor runs at " + fmt(ghz) + " GHz. What is its clock period?"),
        fields: [num("t", "Clock period", ps, { suffix: "ps" })],
        solution: p("Clock period = 1 ÷ clock rate = 1 ÷ (" + fmt(ghz) + " × 10⁹ Hz) = <strong>" + ps + " ps</strong> (" + fmt(ps / 1000) + " ns)")
      };
    }
  ]);

  G["cpu/compare"] = variants([
    function (R) {
      var o = R.until(function () { return { fa: R.pick([1, 2, 4, 5]), fb: R.pick([1, 2, 4, 5]), ca: R.int(2, 12) * 2, cb: R.int(2, 12) * 2 }; },
        function (x) { var a = x.ca / x.fa, b = x.cb / x.fb; return x.fa !== x.fb && exact(a, 2) && exact(b, 2) && Math.abs(a - b) > 0.01; });
      var op = R.pick(["a division", "a multiplication", "a square root"]), ta = o.ca / o.fa, tb = o.cb / o.fb, faster = ta < tb ? "CPU A" : "CPU B";
      return {
        prompt: p("CPU A runs at " + o.fa + " GHz and " + op + " takes " + o.ca + " cycles. CPU B runs at " + o.fb + " GHz and " + op + " takes " + o.cb + " cycles.") +
          p("How long does " + op + " take on each CPU, and which one is faster at it?"),
        fields: [num("a", "Time on A", ta, { suffix: "ns" }), num("b", "Time on B", tb, { suffix: "ns" }), choice("w", "Faster", ["CPU A", "CPU B"], faster)],
        solution: p("Time = cycles ÷ clock rate. A: " + o.ca + " ÷ " + o.fa + " GHz = <strong>" + fmt(ta) + " ns</strong>; B: " + o.cb + " ÷ " + o.fb + " GHz = <strong>" + fmt(tb) + " ns</strong>.") +
          p("<strong>" + faster + "</strong> is faster, even though " + (o.fa > o.fb ? "A" : "B") + " has the " + (faster === (o.fa > o.fb ? "CPU A" : "CPU B") ? "faster clock too." : "faster clock: the clock rate alone does not decide performance."))
      };
    },
    function (R) {
      var o = R.until(function () { return { r1: R.pick([1, 2, 2.5, 4, 5]), r2: R.pick([1, 2, 2.5, 4, 5]), c1: R.pick(NICE_CPI), c2: R.pick(NICE_CPI) }; },
        function (x) { var a = x.c1 / x.r1, b = x.c2 / x.r2, r = Math.max(a, b) / Math.min(a, b); return r > 1.01 && exact(r, 2); });
      var t1 = o.c1 / o.r1, t2 = o.c2 / o.r2, faster = t1 < t2 ? "P1" : "P2", sp = Math.max(t1, t2) / Math.min(t1, t2);
      return {
        prompt: p("Two processors implement the same instruction set and run the same program.") + table(["Processor", "Clock rate", "CPI"], [["P1", o.r1 + " GHz", o.c1], ["P2", o.r2 + " GHz", o.c2]]) +
          p("Which one is faster, and by what factor?"),
        fields: [choice("w", "Faster processor", ["P1", "P2"], faster), num("sp", "Speedup", round(sp, 2))],
        solution: p("Time per instruction = CPI ÷ clock rate: P1 " + o.c1 + " ÷ " + o.r1 + " = " + fmt(t1, 3) + " ns, P2 " + o.c2 + " ÷ " + o.r2 + " = " + fmt(t2, 3) + " ns.") +
          p("If X is n times faster than Y, n = execution time<sub>Y</sub> ÷ execution time<sub>X</sub>. <strong>" + faster + "</strong> is faster by " + fmt(Math.max(t1, t2), 3) + " ÷ " + fmt(Math.min(t1, t2), 3) + " = <strong>" + fmt(sp) + "</strong>")
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


  /* The table from lecture: what each level of the system can affect */
  var FACTORS = [["Algorithm", [1, 1, 0]], ["Programming language", [1, 1, 0]], ["Compiler", [1, 1, 0]], ["ISA", [1, 1, 1]], ["Processor organization", [0, 1, 1]]];
  var TERMS = ["Instruction count", "CPI", "Clock cycle"];
  G["cpu/factors"] = variants([
    function (R) {
      var rows = R.shuffle(FACTORS.slice()).slice(0, R.pick([3, 4, 5])), fields = [], trows = [];
      rows.forEach(function (fc, i) {
        var row = [fc[0]];
        TERMS.forEach(function (t, k) { fields.push(choice("f" + i + "_" + k, fc[0] + ": " + t, ["X", "—"], fc[1][k] ? "X" : "—")); row.push({ f: "f" + i + "_" + k }); });
        trows.push(row);
      });
      return {
        prompt: p("CPU time = Instruction_count × CPI × clock_cycle. Mark with X each term that the item can affect (— if it cannot)."),
        table: { head: [""].concat(TERMS), rows: trows },
        fields: fields,
        solution: table([""].concat(TERMS), rows.map(function (fc) { return [fc[0]].concat(fc[1].map(function (v) { return v ? "<strong>X</strong>" : ""; })); })) +
          p("The algorithm, language and compiler decide which instructions run (instruction count and CPI); the ISA affects all three; the processor organization affects CPI and the clock cycle.")
      };
    },
    function (R) {
      var k = R.int(0, 2), fields = FACTORS.map(function (fc, i) { return choice("g" + i, fc[0], YN, fc[1][k] ? "yes" : "no"); });
      return {
        prompt: p("CPU time = Instruction_count × CPI × clock_cycle. Which of these can change the <strong>" + TERMS[k].toLowerCase() + "</strong>" + (k === 1 ? "" : " of a program") + "?"),
        fields: fields,
        solution: p(TERMS[k] + " can be affected by: <strong>" + FACTORS.filter(function (fc) { return fc[1][k]; }).map(function (fc) { return fc[0].toLowerCase(); }).join(", ") + "</strong>.") +
          table([""].concat(TERMS), FACTORS.map(function (fc) { return [fc[0]].concat(fc[1].map(function (v) { return v ? "X" : ""; })); }))
      };
    }
  ]);

  /* SPEC ratios with a whole-number geometric mean */
  function specRatios(R) {
    var g = R.pick([2, 3, 4, 6, 8, 10, 12]), ks = [2, 3, 4].filter(function (k) { return g % k === 0; });
    var k = R.pick(ks.length ? ks : [1]), three = R.chance(0.5) && g / k >= 1;
    return { g: g, ratios: R.shuffle(three ? [g / k, g, g * k] : [g / k, g * k]) };
  }
  G["cpu/power"] = variants([
    function (R) {
      var o = R.until(function () { return { c: R.pick([50, 80, 85, 90, 100]), v: R.pick([10, 15, 20, 50]), f: R.pick([0, 10, 15, 20, 50]) }; },
        function (x) { var r = x.c / 100 * Math.pow(1 - x.v / 100, 2) * (1 - x.f / 100); return exact(r, 2); });
      var r = o.c / 100 * Math.pow(1 - o.v / 100, 2) * (1 - o.f / 100);
      return {
        prompt: p("Power = capacitive load × voltage² × frequency switched. A new CPU has " + o.c + "% of the capacitive load of the old CPU, a " + o.v + "% voltage reduction" + (o.f ? " and a " + o.f + "% frequency reduction" : " and the same frequency") + ".") +
          p("What is P<sub>new</sub> ÷ P<sub>old</sub>?"),
        fields: [num("r", "P_new ÷ P_old", round(r, 2))],
        solution: p("P<sub>new</sub> ÷ P<sub>old</sub> = " + fmt(o.c / 100) + " × " + fmt(1 - o.v / 100) + "² × " + fmt(1 - o.f / 100) + " = <strong>" + fmt(r) + "</strong>")
      };
    },
    function (R) {
      var o = R.pick([{ c: 30, a: 5, b: 1, f: 1000 }, { c: 10, a: 5, b: 1, f: 100 }, { c: 20, a: 4, b: 2, f: 50 }, { c: 8, a: 3, b: 1, f: 90 }, { c: 4, a: 2, b: 1, f: 10 }, { c: 25, a: 5, b: 1, f: 200 }]);
      var r = o.c * Math.pow(o.b / o.a, 2) * o.f;
      return {
        prompt: p("Power = capacitive load × voltage² × frequency switched. Between two CPU generations, the capacitive load grew ×" + o.c + ", the voltage dropped from " + o.a + " V to " + o.b + " V, and the frequency grew ×" + o.f + ". By what factor did the power grow?"),
        fields: [num("r", "Power factor", round(r, 2))],
        solution: p("Factor = " + o.c + " × (" + o.b + "/" + o.a + ")² × " + o.f + " = " + o.c + " × " + fmt(Math.pow(o.b / o.a, 2), 4) + " × " + o.f + " = <strong>" + fmt(r) + "</strong>")
      };
    },
    function (R) {
      var s = specRatios(R), names = R.shuffle(["bzip2", "gcc", "mcf", "gobmk", "hmmer", "sjeng", "astar", "xalancbmk"]).slice(0, s.ratios.length);
      var times = s.ratios.map(function () { return R.pick([10, 20, 25, 40, 50, 100]); });
      var fields = s.ratios.map(function (r, i) { return num("r" + i, names[i] + " ratio", r, { size: 5 }); });
      fields.push(num("g", "Geometric mean", s.g));
      return {
        prompt: p("SPEC normalizes each execution time to a reference machine (ratio = reference time ÷ measured time) and summarizes the ratios with their geometric mean. Fill in the ratios and the geometric mean."),
        table: { head: ["Benchmark", "Reference time (s)", "Measured time (s)", "Ratio"], rows: s.ratios.map(function (r, i) { return [names[i], fmt(r * times[i]), times[i], { f: "r" + i }]; }) },
        fields: fields,
        solution: p("Ratios: " + s.ratios.map(function (r, i) { return fmt(r * times[i]) + " ÷ " + times[i] + " = " + fmt(r); }).join("; ") + ".") +
          p("Geometric mean = " + (s.ratios.length === 2 ? "√" : "∛") + "(" + s.ratios.map(function (r) { return fmt(r); }).join(" × ") + ") = " + (s.ratios.length === 2 ? "√" : "∛") + fmt(s.ratios.reduce(function (a, b) { return a * b; }, 1)) + " = <strong>" + s.g + "</strong>")
      };
    }
  ]);


  /* ----- 2. Memory hierarchy ----- */
  G["hierarchy/amat"] = variants([
    function (R) {
      /* the lecture example: AMAT without and with an L2 cache, in cycles and in ps */
      var o = R.until(function () { return { ps: R.pick([200, 250, 500]), m1: R.pick([2, 4, 5, 10]), h2: R.pick([5, 10]), m2: R.pick([5, 10, 20]), mem: R.pick([100, 200]) }; },
        function (x) { var a = 1 + x.m1 / 100 * x.mem, b = 1 + x.m1 / 100 * (x.h2 + x.m2 / 100 * x.mem); return exact(a, 2) && exact(b, 2) && exact(b * x.ps, 2); });
      var a = 1 + o.m1 / 100 * o.mem, b = 1 + o.m1 / 100 * (o.h2 + o.m2 / 100 * o.mem);
      return {
        prompt: p("Calculate the AMAT given: " + o.ps + " ps clock cycle, 1 cycle L1 hit time, " + o.m1 + "% L1 miss rate, " + o.h2 + " cycle L2 hit time, " + o.m2 + "% L2 miss rate, " + o.mem + " cycle main memory access time.") +
          p("What is the AMAT without the L2 cache, and with it? Give the second one in ps too."),
        fields: [num("a", "Without L2", round(a, 2), { suffix: "cycles" }), num("b", "With L2", round(b, 2), { suffix: "cycles" }), num("ps", "With L2", round(b * o.ps, 2), { suffix: "ps" })],
        solution: p("Without L2: AMAT = 1 + " + fmt(o.m1 / 100) + " × " + o.mem + " = <strong>" + fmt(a) + " cycles</strong>.") +
          p("With L2: L1 miss penalty = " + o.h2 + " + " + fmt(o.m2 / 100) + " × " + o.mem + " = " + fmt(o.h2 + o.m2 / 100 * o.mem) + ", so AMAT = 1 + " + fmt(o.m1 / 100) + " × " + fmt(o.h2 + o.m2 / 100 * o.mem) + " = <strong>" + fmt(b) + " cycles</strong> = " + fmt(b) + " × " + o.ps + " = <strong>" + fmt(b * o.ps) + " ps</strong>.")
      };
    },
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

  G["hierarchy/stall-cpi"] = variants([
    function (R) {
      /* the lecture example: CPI_ideal 2, 100-cycle penalty, 36% loads/stores, 4% miss rate */
      var o = R.until(function () { return { base: R.pick([1, 1.5, 2, 3]), ls: R.pick([20, 25, 30, 36, 40, 50]), mr: R.pick([2, 4, 5, 10]), pen: R.pick([20, 50, 100, 200]) }; },
        function (x) { return exact(x.ls / 100 * x.mr / 100 * x.pen, 2); });
      var st = o.ls / 100 * o.mr / 100 * o.pen;
      return {
        prompt: p("A program running on a processor has a CPI<sub>ideal</sub> of " + o.base + ", a " + o.pen + "-cycle miss penalty, " + o.ls + "% load/store instructions and a " + o.mr + "% miss rate on those data accesses. What are the average memory stall cycles, and what is CPI<sub>stall</sub>?"),
        fields: [num("m", "Memory-stall cycles", round(st, 2)), num("c", "CPI_stall", round(o.base + st, 2))],
        solution: p("Memory-stall cycles = access rate × miss rate × miss penalty = " + o.ls + "% × " + o.mr + "% × " + o.pen + " = <strong>" + fmt(st) + "</strong>") +
          p("CPI<sub>stall</sub> = CPI<sub>ideal</sub> + stall cycles = " + o.base + " + " + fmt(st) + " = <strong>" + fmt(o.base + st) + "</strong>")
      };
    },
    function (R) {
      var o = R.until(function () { return { base: R.pick([1, 2]), mi: R.pick([1, 2, 4]), md: R.pick([2, 4, 5]), ls: R.pick([20, 25, 36, 40, 50]), pen: R.pick([50, 100]), up: R.pick([1, 2]) }; },
        function (x) { return exact(x.ls / 100 * x.md / 100 * x.pen, 2) && exact(x.ls / 100 * (x.md + x.up) / 100 * x.pen, 2); });
      var is = o.mi / 100 * o.pen, ds = o.ls / 100 * o.md / 100 * o.pen, ds2 = o.ls / 100 * (o.md + o.up) / 100 * o.pen;
      return {
        prompt: p("A processor has a CPI<sub>ideal</sub> of " + o.base + " and a " + o.pen + "-cycle miss penalty; " + o.ls + "% of instructions are loads or stores. The instruction cache misses " + o.mi + "% of the time and the data cache " + o.md + "% of the time.") +
          p("What is CPI<sub>stall</sub>? What does it become if the data-cache miss rate goes up by " + o.up + "%?"),
        fields: [num("c", "CPI_stall", round(o.base + is + ds, 2)), num("c2", "New CPI_stall", round(o.base + is + ds2, 2))],
        solution: p("Memory-stall cycles = 1 × " + o.mi + "% × " + o.pen + " + " + o.ls + "% × " + o.md + "% × " + o.pen + " = " + fmt(is) + " + " + fmt(ds) + " = " + fmt(is + ds) + ", so CPI<sub>stall</sub> = " + o.base + " + " + fmt(is + ds) + " = <strong>" + fmt(o.base + is + ds) + "</strong>.") +
          p("With a " + (o.md + o.up) + "% data miss rate: " + fmt(is) + " + " + o.ls + "% × " + (o.md + o.up) + "% × " + o.pen + " = " + fmt(is + ds2) + ", so CPI<sub>stall</sub> = <strong>" + fmt(o.base + is + ds2) + "</strong>.")
      };
    },
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
  G["hierarchy/locality"] = variants([
    function (R) {
      /* "advanced spatial locality": one cold miss per block for a stride-1 walk */
      var k = R.pick([4, 4, 8]), B = R.pick([16, 32, 64]), N = R.pick([1024, 2048, 4096, 16384]), perBlock = B / k, misses = N / perBlock, row = R.chance(0.6);
      var lines = row ? ["int i, sum = 0, N = " + N + ";", "for (i = 0; i < N; i++)", "    sum += a[i];"] : ["int i, sum = 0, N = " + N + ";", "for (i = 0; i < N; i++)", "    sum += a[i][0];"];
      return row ? {
        prompt: p("a has row-major " + (k === 4 ? "INT4" : "8-byte") + " elements and is cache-aligned. The cache block is " + B + " bytes and all local variables are in registers. How many cache misses and hits does this loop have?") + pre(lines),
        fields: [num("m", "Misses", misses), num("h", "Hits", N - misses)],
        solution: p("Stride-1 access to a. Each block holds " + B + "/" + k + " = " + perBlock + " elements, so there is one cold miss per block: (1/" + perBlock + ") × " + N + " = <strong>" + misses + "</strong> misses and " + N + " − " + misses + " = <strong>" + (N - misses) + "</strong> hits.")
      } : {
        prompt: p("a is a row-major array of " + (k === 4 ? "INT4" : "8-byte") + " elements with many more than " + B / k + " columns, and is cache-aligned. The cache block is " + B + " bytes and all local variables are in registers. How many cache misses and hits does this loop have?") + pre(lines),
        fields: [num("m", "Misses", N), num("h", "Hits", 0)],
        solution: p("Stepping through rows in one column accesses distant elements: no spatial locality, so every access is a cold miss (cold miss rate 100%): <strong>" + N + "</strong> misses and <strong>0</strong> hits.")
      };
    },
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

  G["hierarchy/miss-types"] = variants([
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
    var hitList = full.steps.filter(function (st) { return st.hit; }).map(function (st) { return st.addr; });
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
    fields.push({ id: "hits", label: "Addresses that hit", kind: "multiset", answer: hitList.slice().sort(function (a, b) { return a - b; }), size: 16 });
    var head = ["Set"];
    for (var b2 = 0; b2 < c.block; b2++) head.push("Byte " + b2);
    head.push("");
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. " + alignNote(c.block) + " These byte addresses are accessed in order:") +
        table(["Access"].concat(addrs.map(function (_, i) { return i + 1; })), [["Address"].concat(addrs)]) +
        p("Fill in the cache " + (stop < 10 ? "<strong>after access " + stop + "</strong> (address " + addrs[stop - 1] + ")" : "<strong>after all accesses</strong>") +
          ": write the byte addresses held in each line (lines and bytes in any order; leave unused lines blank). Then list the addresses that hit, over all 10 accesses (an address that hits twice is listed twice)."),
      table: { head: head, rows: rows, groups: c.ways },
      wide: true,
      fields: fields,
      solution: simSolution(c, full) + p("Cache " + (stop < 10 ? "after access " + stop : "at the end") + ": " + sim.sets.map(function (l, si) {
        return "set " + si + ": " + (l.length ? l.map(function (st) { return st + "–" + (st + c.block - 1); }).join(", ") : "empty");
      }).join("; ") + ". Addresses that hit: <strong>" + (hitList.length ? hitList.join(", ") : "none") + "</strong>.")
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
    var helped = R.chance(0.7);                 /* as on many exams, give the tag / set / offset of each access */
    var helpCols = function (a) { var blk = Math.floor(a / c.block); return [Math.floor(blk / c.sets), blk % c.sets, a % c.block]; };
    return {
      prompt: p("Consider " + cfgText(c) + ". It starts empty. " + alignNote(c.block) + " Mark each access below as a hit or a miss, then give the hit rate and the number of cold misses."),
      table: helped
        ? { head: ["Access", "Address", "Tag", "Set", "Offset", "Result"], rows: addrs.map(function (a, i) { return [i + 1, a].concat(helpCols(a)).concat([{ f: "h" + i }]); }) }
        : { head: ["Access", "Address", "Result"], rows: addrs.map(function (a, i) { return [i + 1, a, { f: "h" + i }]; }) },
      fields: fields,
      solution: simSolution(c, sim) + p("Hit rate = " + hits + " ÷ 10 = <strong>" + hits * 10 + "%</strong>; cold misses (first touch of a block): <strong>" + cold + "</strong>")
    };
  };


  /* L4: organization of a cache (C = B × N × R), word vs byte addresses */
  G["caches/organization"] = variants([
    function (R) {
      var N = R.pick([2, 4, 8]), toByte = R.chance(0.6), X = R.int(1, 31), bits = N === 8 ? "64" : N === 4 ? "32" : "16";
      return toByte ? {
        prompt: p("A " + bits + "-bit computer has " + N + "-byte words. What byte address does word address " + X + " refer to? Give it in decimal and in 8-bit binary."),
        fields: [num("d", "Byte address", N * X), { id: "b", label: "In binary", kind: "bits", width: 8, answer: bin(N * X, 8), size: 12 }],
        solution: p("An " + N + "-byte word with word address X is at byte address " + N + " × X = " + N + " × " + X + " = <strong>" + N * X + "</strong> = <strong>" + bin(N * X, 8) + "</strong>. (Word address " + X + " = " + bin(X, 8) + "; multiplying by " + N + " = 2^" + Math.log2(N) + " appends " + Math.log2(N) + " zeros.)")
      } : {
        prompt: p("A " + bits + "-bit computer has " + N + "-byte words. Byte address " + N * X + " is the start of which word address?"),
        fields: [num("w", "Word address", X)],
        solution: p("Word address = byte address ÷ " + N + " = " + N * X + " ÷ " + N + " = <strong>" + X + "</strong>")
      };
    },
    function (R) {
      var m = R.pick([16, 32]), b = R.int(2, 6), c = R.int(b + 3, b + 8), C = Math.pow(2, c), Bk = Math.pow(2, b), lines = C / Bk, nw = R.pick([2, 4, 8].filter(function (x) { return x < lines; }));
      var orgs = [["Direct-mapped", 1], [nw + "-way set associative", nw], ["Fully associative", lines]], fields = [], rows = [], sol = [];
      orgs.forEach(function (o, i) {
        var sets = lines / o[1], sb = Math.log2(sets), tb = m - sb - b;
        fields.push(num("r" + i, o[0] + " sets", sets, { size: 5 }), num("n" + i, o[0] + " lines per set", o[1], { size: 5 }), num("s" + i, o[0] + " index bits", sb, { size: 4 }), num("t" + i, o[0] + " tag bits", tb, { size: 4 }));
        rows.push([o[0], { f: "r" + i }, { f: "n" + i }, { f: "s" + i }, { f: "t" + i }]);
        sol.push([o[0], sets, o[1], sb, tb]);
      });
      return {
        prompt: p("A cache holds C = " + (C >= 1024 ? C / 1024 + " KiB" : C + " bytes") + " with B = " + Bk + "-byte blocks, and addresses are m = " + m + " bits. Fill in the number of sets R, the lines per set N (also the number of tag comparisons per lookup), and the set-index and tag sizes for each organization."),
        table: { head: ["Organization", "Sets R", "Lines per set N", "Index bits s", "Tag bits t"], rows: rows },
        fields: fields,
        solution: p("b = log₂(" + Bk + ") = " + b + "; there are C ÷ B = " + pow2(c) + " ÷ " + pow2(b) + " = " + pow2(c - b) + " = " + lines + " lines. R = C ÷ (B × N), s = log₂(R), t = m − s − b.") +
          table(["Organization", "R", "N", "s", "t"], sol)
      };
    },
    function (R) {
      var m = 32, b = R.int(2, 6), c = R.int(b + 4, b + 10), N = R.pick([1, 2, 4]), R0 = Math.pow(2, c - b) / N, s0 = Math.log2(R0);
      var org = function (n) { return n === 1 ? "direct-mapped" : n + "-way set associative"; };
      return {
        prompt: p("A " + (Math.pow(2, c) >= 1024 ? Math.pow(2, c) / 1024 + " KiB" : Math.pow(2, c) + "-byte") + " " + org(N) + " cache has " + Math.pow(2, b) + "-byte blocks and 32-bit addresses. Its size and block size stay fixed while its associativity doubles to " + org(2 * N) + ". Give the number of sets and the tag size, before and after."),
        fields: [num("r0", "Sets before", R0), num("t0", "Tag bits before", m - s0 - b), num("r1", "Sets after", R0 / 2), num("t1", "Tag bits after", m - s0 + 1 - b)],
        solution: p("Before: R = " + pow2(c) + " ÷ (" + pow2(b) + " × " + N + ") = <strong>" + R0 + "</strong> sets, s = " + s0 + ", t = 32 − " + s0 + " − " + b + " = <strong>" + (m - s0 - b) + "</strong>.") +
          p("Each doubling of associativity doubles the blocks per set, halves the number of sets (<strong>" + R0 / 2 + "</strong>), shrinks the set index by 1 bit and grows the tag by 1 bit (<strong>" + (m - s0 + 1 - b) + "</strong>).")
      };
    }
  ]);


  /* ----- 4. Numbers and logic ----- */
  function sx(n, w) { n &= (1 << w) - 1; return n >= (1 << (w - 1)) ? n - (1 << w) : n; }
  G["numbers/signed"] = variants([
    function (R) {
      var w = R.pick([4, 6, 8]), lim = 1 << (w - 1), v = R.until(function () { return R.int(-lim, lim - 1); }, function (x) { return x !== 0; }), b = bin(v & ((1 << w) - 1), w);
      return {
        prompt: p("Write " + v + " as " + aN(w) + "-bit two's complement number."),
        fields: [{ id: "b", label: "Binary", kind: "bits", width: w, answer: b, size: 12 }],
        solution: v >= 0 ? p(v + " = <strong>" + b + "</strong>") : p(-v + " = " + bin(-v, w) + "; complement: " + bin(~(-v) & ((1 << w) - 1), w) + "; add one: <strong>" + b + "</strong>")
      };
    },
    function (R) {
      var w = R.pick([4, 6, 8]), lim = 1 << (w - 1), v = R.int(-lim, lim - 1), b = bin(v & ((1 << w) - 1), w);
      return {
        prompt: p("What decimal value does the " + w + "-bit two's complement number " + code(b) + " represent?"),
        fields: [num("d", "Decimal", v)],
        solution: p(b[0] === "1" ? "Leading bit 1: −1 × 2^" + (w - 1) + " + (" + b.slice(1) + ")₂ = −" + lim + " + " + (v + lim) + " = <strong>" + v + "</strong>" : "Leading bit 0: same as unsigned, <strong>" + v + "</strong>")
      };
    },
    function (R) {
      var w = 8, u = R.int(129, 255), sv = u - 256, b = bin(u, 8);
      return {
        prompt: p("The same bits can represent different numbers. What is " + code(b.slice(0, 4) + " " + b.slice(4)) + " interpreted as an unsigned integer, and as a two's complement integer?"),
        fields: [num("u", "Unsigned", u), num("s", "Two's complement", sv)],
        solution: p("Unsigned: <strong>" + u + "</strong>. Two's complement: −128 + " + (u - 128) + " = <strong>" + sv + "</strong>.")
      };
    },
    function (R) {
      var n = R.int(4, 16), lo = -Math.pow(2, n - 1), hi = Math.pow(2, n - 1) - 1, uns = R.chance(0.35);
      return uns ? { prompt: p("What range of values can an unsigned " + n + "-bit integer hold?"), fields: [num("lo", "Smallest", 0), num("hi", "Largest", Math.pow(2, n) - 1)], solution: p("0 to 2^" + n + " − 1: <strong>0</strong> to <strong>" + (Math.pow(2, n) - 1) + "</strong>") }
        : { prompt: p("What range of values can " + aN(n) + "-bit two's complement number hold?"), fields: [num("lo", "Smallest", lo), num("hi", "Largest", hi)], solution: p("−2^" + (n - 1) + " to 2^" + (n - 1) + " − 1: <strong>" + lo + "</strong> to <strong>" + hi + "</strong>") };
    },
    function (R) {
      var w = R.pick([4, 6, 8]), mask = (1 << w) - 1, toBits = R.chance(0.5);
      if (toBits) {
        var v = -R.int(1, (1 << (w - 1)) - 1), b = bin(~(-v) & mask, w);
        return {
          prompt: p("Write " + v + " as " + aN(w) + "-bit <strong>one's complement</strong> number."),
          fields: [{ id: "b", label: "Binary", kind: "bits", width: w, answer: b, size: 12 }],
          solution: p("Write " + -v + " = " + bin(-v, w) + " and invert all bits: <strong>" + b + "</strong> (no +1, unlike two's complement).")
        };
      }
      var x = R.int(1 << (w - 1), mask - 1), val = -((~x) & mask), bx = bin(x, w);
      return {
        prompt: p("What decimal value does the " + w + "-bit <strong>one's complement</strong> number " + code(bx) + " represent?"),
        fields: [num("d", "Decimal", val)],
        solution: p("Leading bit 1, so it is negative: invert all bits (" + bin((~x) & mask, w) + " = " + -val + ") and multiply by −1: <strong>" + val + "</strong>")
      };
    },
    function (R) {
      var w = R.pick([4, 8]), mask = (1 << w) - 1, v = R.until(function () { return R.int(-(1 << (w - 1)) + 1, (1 << (w - 1)) - 1); }, function (x) { return x !== 0; });
      var b = bin(v & mask, w), nb = bin(-v & mask, w);
      return {
        prompt: p(code(b) + " is " + aN(w) + "-bit two's complement number. Compute its opposite (signed negation), in binary."),
        fields: [{ id: "b", label: "Negation", kind: "bits", width: w, answer: nb, size: 12 }],
        solution: p("Bit-wise complement then add 1: " + b + " → " + bin(~(v & mask) & mask, w) + " → <strong>" + nb + "</strong> (" + v + " becomes " + -v + ").")
      };
    }
  ]);

  G["numbers/shifts"] = variants([
    function (R) {
      var byte = R.int(0, 255), ext = byte >= 128 ? (0xff00 | byte) : byte, asBits = R.chance(0.5);
      return asBits ? {
        prompt: p("Sign-extend the 8-bit two's complement number " + code(bin(byte, 8).slice(0, 4) + " " + bin(byte, 8).slice(4)) + " to 16 bits."),
        fields: [{ id: "b", label: "16 bits", kind: "bits", width: 16, answer: bin(ext, 16), size: 20 }],
        solution: p("Copy the sign bit (" + (byte >> 7) + ") to the left: <strong>" + bin(ext, 16) + "</strong>")
      } : {
        prompt: p("Sign-extend the 8-bit value " + code(hex(byte, 2)) + " to 16 bits, in hexadecimal."),
        fields: [{ id: "h", label: "16-bit value", kind: "hex", answer: ext, size: 10 }],
        solution: p("The sign bit of " + bin(byte, 8) + " is " + (byte >> 7) + ", so the new upper byte is " + (byte >> 7 ? "FF" : "00") + ": <strong>" + hex(ext, 4) + "</strong>")
      };
    },
    function (R) {
      var v = R.int(-100, 100), sh = R.int(1, 3), u = v & 0xff, arith = R.chance(0.5);
      var res = arith ? ((v >> sh) & 0xff) : (u >>> sh);
      return {
        prompt: p("An 8-bit register holds " + code(bin(u, 8)) + ". What does it hold after " + (arith ? "an <strong>arithmetic</strong>" : "a <strong>logical</strong>") + " right shift by " + sh + "?"),
        fields: [{ id: "b", label: "Result", kind: "bits", width: 8, answer: bin(res, 8), size: 12 }],
        solution: p((arith ? "An arithmetic right shift fills the vacancies with the sign bit (" + (u >> 7) + ")" : "A logical shift fills the vacancies with 0s") + ": <strong>" + bin(res, 8) + "</strong>")
      };
    },
    function (R) {
      /* the lecture's examples: 2 << 3 = 16, 8 >> 2 = 2, -4 >> 1 = 126 (logical) or -2 (arithmetic) */
      var kind = R.int(0, 2), sh = R.int(1, 3), v, res, op, why;
      if (kind === 0) { v = R.int(1, 15); res = (v << sh) & 0xff; op = v + " << " + sh; why = "shift left fills with 0s: " + bin(v, 8) + " → " + bin(res, 8) + " (× " + Math.pow(2, sh) + ")"; }
      else if (kind === 1) { v = -R.int(1, 16) * 2; res = ((v & 0xff) >>> sh); op = v + " >> " + sh + " (logical)"; why = "a logical right shift fills with 0s: " + bin(v & 0xff, 8) + " → " + bin(res, 8); }
      else { v = -R.int(1, 16) * Math.pow(2, sh); res = v >> sh; op = v + " >> " + sh + " (arithmetic)"; why = "an arithmetic right shift of a negative number fills with 1s: " + bin(v & 0xff, 8) + " → " + bin(res & 0xff, 8) + " (÷ " + Math.pow(2, sh) + ")"; }
      return {
        prompt: p("In 8 bits, what is " + code(op) + "? Read the result as " + (kind === 1 ? "an unsigned" : "a two's complement") + " number and give it in decimal."),
        fields: [num("v", "Result", res)],
        solution: p("In 8 bits, " + why + " = <strong>" + res + "</strong>.")
      };
    }
  ]);

  G["combinational/binary-add"] = function (R) {
    var w = R.pick([4, 6, 8]), lim = 1 << (w - 1), mask = (1 << w) - 1, a = R.int(-lim, lim - 1), b = R.int(-lim, lim - 1), sub = R.chance(0.4);
    var ua = a & mask, ub = b & mask, addend = sub ? ((~ub) & mask) : ub, cin = sub ? 1 : 0;
    var carries = [cin], c = cin;
    for (var k = 0; k < w; k++) { var s2 = ((ua >> k) & 1) + ((addend >> k) & 1) + c; c = s2 >> 1; carries.push(c); }
    var res = (ua + addend + cin) & mask, cn = carries[w], cn1 = carries[w - 1];
    var exactSum = sub ? a - b : a + b, ovf = exactSum < -lim || exactSum > lim - 1;
    var fields = [{ id: "r", label: w + "-bit result", kind: "bits", width: w, answer: bin(res, w), size: 12 },
      choice("cn", "c" + w + " (carry out)", ["0", "1"], String(cn)), choice("cn1", "c" + (w - 1) + " (carry into the leftmost bit)", ["0", "1"], String(cn1)),
      choice("o", "Overflow?", YN, ovf ? "yes" : "no")];
    return {
      prompt: p((sub ? "An n-bit subtractor computes" : "Add") + " these " + w + "-bit two's complement numbers: " + code(bin(ua, w)) + (sub ? " − " : " + ") + code(bin(ub, w)) + "." +
        (sub ? " (It adds the bits of the second number XOR SUB, with SUB = 1 as the carry-in c0.)" : "") + " Give the result, the last two carry bits, and whether overflow occurs."),
      fields: fields,
      solution: p("In decimal: " + a + (sub ? " − " : " + ") + b + " = " + exactSum + ".") +
        (sub ? p("Subtraction: " + bin(ua, w) + " + " + bin(addend, w) + " (b inverted by XOR) + 1 (carry-in).") : "") +
        p("Carry bits c" + w + "…c0: " + code(carries.slice().reverse().join("")) + ". Result <strong>" + bin(res, w) + "</strong> (" + sx(res, w) + "); c" + w + " = <strong>" + cn + "</strong>, c" + (w - 1) + " = <strong>" + cn1 + "</strong>.") +
        p("Overflow = c" + w + " XOR c" + (w - 1) + " = <strong>" + (ovf ? "yes" : "no") + "</strong>" + (ovf ? " (" + exactSum + " is outside " + -lim + " to " + (lim - 1) + ")." : "."))
    };
  };

  /* MUX and DEMUX: the control signal is an index, not a value */
  G["combinational/mux"] = variants([
    function (R) {
      var four = R.chance(0.6), n = four ? 4 : 2, names = four ? ["a", "b", "c", "d"] : ["a", "b"], wide = R.chance(0.5);
      var vals = names.map(function () { return wide ? R.int(0, 255) : R.int(0, 1); }), rows = [], fields = [];
      var sels = R.shuffle([0, 1, 2, 3].slice(0, n).concat([R.int(0, n - 1), R.int(0, n - 1)])).slice(0, 4);
      sels.forEach(function (sv, k) {
        var out = vals[sv];
        fields.push(wide ? { id: "o" + k, label: "output", kind: "hex", answer: out, size: 6 } : bit("o" + k, out));
        rows.push([four ? bin(sv, 2).split("").join(" ") : String(sv), { f: "o" + k }]);
      });
      return {
        prompt: p("A " + n + "-way " + (wide ? "8-bit (big data) " : "") + "multiplexer has inputs " + names.map(function (nm, i) { return nm + " = " + (wide ? code(hex(vals[i], 2)) : vals[i]); }).join(", ") +
          " (input " + names[0] + " has index 0). Give the output for each value of the control signal."),
        table: { head: [four ? "s1 s0" : "s", "Output"], rows: rows },
        fields: fields,
        solution: p(four ? "e ≡ MUX(a, b, c, d, S): the control bits s1 s0 give the index (0–3) of the chosen input." : "c ≡ MUX(a, b, s) ≡ <span class=\"ov\">s</span>a + sb: s = 0 chooses a and s = 1 chooses b.") +
          table([four ? "s1 s0" : "s", "Output"], sels.map(function (sv) { return [four ? bin(sv, 2) : sv, "<strong>" + (wide ? hex(vals[sv], 2) : vals[sv]) + "</strong>"]; }))
      };
    },
    function (R) {
      var four = R.chance(0.7), n = four ? 4 : 2, x = 1, sv = R.int(0, n - 1), fields = [], rows = [];
      for (var k = 0; k < n; k++) { fields.push(bit("y" + k, k === sv ? x : 0)); rows.push(["y" + k, { f: "y" + k }]); }
      return {
        prompt: p("A 1-to-" + n + " demultiplexer gets input x = " + x + " and control " + (four ? "s1 s0 = " + bin(sv, 2) : "s = " + sv) + ". What is on each of its outputs?"),
        table: { head: ["Output", "Value"], rows: rows },
        fields: fields,
        solution: p("A DEMUX sends its input to the output chosen by the control (y" + sv + "); un-selected outputs are set to 0.")
      };
    },
    function (R) {
      var four = R.chance(0.5), vars = four ? ["s1", "s0"] : ["s"], ins = four ? ["a", "b", "c", "d"] : ["a", "b"], k = R.int(0, ins.length - 1);
      var term = four ? (k >> 1 ? "s1" : "<span class=\"ov\">s1</span>") + (k & 1 ? "s0" : "<span class=\"ov\">s0</span>") + ins[k] : (k ? "s" : "<span class=\"ov\">s</span>") + ins[k];
      var opts = four ? ["00", "01", "10", "11"] : ["0", "1"];
      return {
        prompt: p("In the sum-of-products formula for a " + ins.length + "-way multiplexer, one product term contains input " + ins[k] + ". For which value of the control signal" + (four ? "s s1 s0" : " s") + " does that term pass " + ins[k] + " to the output?"),
        fields: [choice("v", four ? "s1 s0" : "s", opts, four ? bin(k, 2) : String(k))],
        solution: p("The term is " + term + ", which is 1 only when " + (four ? "s1 s0 = " + bin(k, 2) : "s = " + k) + " (and " + ins[k] + " = 1): input " + ins[k] + " has index <strong>" + k + "</strong>.")
      };
    }
  ]);

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
  G["boolean/boolean-simplify"] = variants([
    function (R) {
      var vars = ["x", "y", "z"], target = remapExpr(R.pick(SIMPLE_FORMS), randomRemap(R, vars)), tt = ttOf(target, vars), best = minSop(tt, vars);
      var given = minterms(tt).map(function (m) { return mintermText(m, vars); }).join(" + ");
      return {
        prompt: p("Simplify") + p("<span class=\"expr\">F = " + exprHtml(given) + "</span>") + p("Type " + code("x'") + " for " + exprHtml("x'") + ", " + code("+") + " for OR, and put variables side by side for AND."),
        fields: [{ id: "e", label: "F =", kind: "bool", vars: vars, table: tt, maxLiterals: best.literals, example: best.expr, size: 22 }],
        solution: deriveSteps(tt, vars, best)
      };
    },
    function (R) {
      var vars = ["a", "b", "c"], cond = R.pick(NUM_CONDS), two = cond.two, tt = [];
      for (var m = 0; m < 8; m++) tt.push(cond.f(two ? sx(m, 3) : m) ? 1 : 0);
      var best = minSop(tt, vars);
      return {
        prompt: p("The bits a b c (a is the most significant) represent a 3-bit " + (two ? "<strong>two's complement</strong>" : "<strong>unsigned</strong>") + " number. Write a simplest Boolean expression for y, where y = 1 exactly when " + cond.t + ". (Type " + code("a'") + " for " + exprHtml("a'") + ".)"),
        fields: [{ id: "e", label: "y =", kind: "bool", vars: vars, table: tt, maxLiterals: best.literals, example: best.expr, size: 22 }],
        solution: table(["a b c", "value", "y"], tt.map(function (v, k) { return [bin(k, 3), two ? sx(k, 3) : k, v]; })) + deriveSteps(tt, vars, best).replace(/F = /g, "y = ")
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
        prompt: p("Which expression is equivalent to <span class=\"expr\">F = " + exprHtml(given) + "</span>?"),
        fields: [choice("c", "F =", R.shuffle(opts).map(exprText), exprText(right), { wide: true })],
        solution: deriveSteps(tt, vars, minSop(tt, vars))
      };
    }
  ]);

  var TT_FORMS = ["(x+y')z", "x'y+yz'", "(x+y)(y'+z)", "(xy)'+z", "x(y+z')", "x'y'z+xz", "(x+z)'+y", "xy'+yz+x'z'", "(x+y+z)(x'+y')"];
  G["boolean/truth-table"] = variants([
    function (R) {
      var vars = ["x", "y", "z"], e = remapExpr(R.pick(TT_FORMS), randomRemap(R, vars)), tt = ttOf(e, vars), ms = minterms(tt);
      var fields = tt.map(function (v, i) { return bit("r" + i, v); });
      fields.push({ id: "m", label: "Minterms where F = 1", kind: "set", answer: ms, size: 16 });
      return {
        prompt: p("Complete the truth table for <span class=\"expr\">F = " + exprHtml(e) + "</span>, then list the rows where F = 1."),
        table: { head: ["Row", "x", "y", "z", "F"], rows: tt.map(function (v, i) { return [i, (i >> 2) & 1, (i >> 1) & 1, i & 1, { f: "r" + i }]; }) },
        fields: fields,
        solution: p("F = Σm(" + ms.join(", ") + ") = " + exprHtml(ms.map(function (m) { return mintermText(m, vars); }).join(" + ")))
      };
    },
    function (R) {
      var vars = ["a", "b", "c"], tt = R.until(function () { var t = []; for (var i = 0; i < 8; i++) t.push(R.int(0, 1)); return t; }, function (t) { var k = sum(t); return k >= 2 && k <= 6; });
      var best = minSop(tt, vars);
      return {
        prompt: p("Write a simplest Boolean expression for F from its truth table.") + table(["a", "b", "c", "F"], tt.map(function (v, m) { return [(m >> 2) & 1, (m >> 1) & 1, m & 1, v]; })),
        fields: [{ id: "e", label: "F =", kind: "bool", vars: vars, table: tt, maxLiterals: best.literals, example: best.expr, size: 22 }],
        solution: deriveSteps(tt, vars, best)
      };
    },
    function (R) {
      var vars = ["a", "b", "c"], forms = R.shuffle(TT_FORMS.map(function (f) { return f.replace(/x/g, "a").replace(/y/g, "b").replace(/z/g, "c"); }));
      var right = forms[0], tt = ttOf(right, vars), opts = [right];
      for (var i = 1; i < forms.length && opts.length < 4; i++) if (ttOf(forms[i], vars).join("") !== tt.join("")) opts.push(forms[i]);
      return {
        prompt: p("Which formula has this truth table?") + table(["a", "b", "c", "F"], tt.map(function (v, m) { return [(m >> 2) & 1, (m >> 1) & 1, m & 1, v]; })),
        fields: [choice("c", "F =", R.shuffle(opts).map(exprText), exprText(right), { wide: true })],
        solution: p("<strong>F = " + exprHtml(right) + "</strong>: it is 1 exactly in rows " + minterms(tt).join(", ") + ".") + deriveSteps(tt, vars, minSop(tt, vars))
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
  var FF_RULE = { JK: "Q<sub>next</sub> = J·<span class=\"ov\">Q</span> + <span class=\"ov\">K</span>·Q (J = K = 1 toggles)", T: "Q<sub>next</sub> = T xor Q", D: "Q<sub>next</sub> = D", SR: "Q<sub>next</sub> = S + <span class=\"ov\">R</span>·Q (S sets, R resets, S = R = 1 not allowed)" };
  /* One flip-flop per problem. Sequences use a vertical table: one row per clock cycle. */
  G["state/flip-flops"] = variants([
    function (R) {
      var type = R.pick(["JK", "T", "D", "SR"]), q = R.int(0, 1), q0 = q, n = 5, ins = [], cur = [], next = [];
      for (var c = 0; c < n; c++) { var i = ffInputs(R, type), nq = ffNext(type, q, i); ins.push(i); cur.push(q); next.push(nq); q = nq; }
      var names = Object.keys(ins[0]), fields = [], rows = [];
      for (var c2 = 0; c2 < n; c2++) {
        var row = [c2];
        if (c2 === 0) row.push(cur[0]); else { fields.push(bit("q" + c2, cur[c2])); row.push({ f: "q" + c2 }); }
        names.forEach(function (nm) { row.push(ins[c2][nm]); });
        fields.push(bit("n" + c2, next[c2])); row.push({ f: "n" + c2 });
        rows.push(row);
      }
      return {
        prompt: p((type === "SR" ? "An " : "A ") + type + " flip-flop starts with Q = " + q0 + ". Fill in Q and Q<sub>next</sub> for each clock cycle; Q<sub>next</sub> in one row becomes Q in the next row."),
        table: { head: ["Cycle", "Q"].concat(names).concat(["Q<sub>next</sub>"]), rows: rows },
        fields: fields,
        solution: p(FF_RULE[type] + ".") + table(["Cycle", "Q"].concat(names).concat(["Q<sub>next</sub>"]), ins.map(function (x, c3) {
          return [c3, cur[c3]].concat(names.map(function (nm) { return x[nm]; })).concat(["<strong>" + next[c3] + "</strong>"]);
        }))
      };
    },
    function (R) {
      var type = R.pick(["JK", "T", "D", "SR"]), q = R.int(0, 1), i = ffInputs(R, type), nq = ffNext(type, q, i);
      var inText = Object.keys(i).map(function (nm) { return nm + " = " + i[nm]; }).join(", ");
      return {
        prompt: p((type === "SR" ? "An " : "A ") + type + " flip-flop holds Q = " + q + ". Its inputs are " + inText + ". What is Q after the next clock edge?"),
        fields: [{ id: "n", label: "Q after the edge", kind: "bits", width: 1, answer: String(nq), size: 2 }],
        solution: p(FF_RULE[type] + ", so Q<sub>next</sub> = <strong>" + nq + "</strong>.")
      };
    }
  ]);

  G["state/clock-period"] = variants([
    function (R) {
      /* pipelining for performance: split the adder and the shifter with a register */
      var o = R.until(function () { return { add: R.int(3, 9) * 50, shf: R.int(2, 8) * 50, cq: R.pick([20, 30, 50]), su: R.pick([20, 30, 50]) }; }, function (x) { return x.add !== x.shf; });
      var before = o.cq + o.add + o.shf + o.su, after = o.cq + Math.max(o.add, o.shf) + o.su;
      return {
        prompt: p("A synchronous circuit has an adder (" + o.add + " ps) feeding a shifter (" + o.shf + " ps) between two registers, whose clk-to-q delay is " + o.cq + " ps and setup time " + o.su + " ps.") +
          p("What is the minimum clock period? A register is inserted between the adder and the shifter to pipeline them; what is the minimum clock period now?"),
        fields: [num("a", "Before", before, { suffix: "ps" }), num("b", "Pipelined", after, { suffix: "ps" })],
        solution: p("Min. clock period = combinational delay + setup time + clk-to-q.") +
          p("Before: " + o.add + " + " + o.shf + " + " + o.su + " + " + o.cq + " = <strong>" + before + " ps</strong>. After: the slower stage limits the clock: " + Math.max(o.add, o.shf) + " + " + o.su + " + " + o.cq + " = <strong>" + after + " ps</strong>.")
      };
    },
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

  /* Shift registers made of D flip-flops: SIPO (serial in) and PISO (parallel load, serial out) */
  G["state/registers"] = variants([
    function (R) {
      var n = 4, q = []; for (var k = 0; k < n; k++) q.push(R.int(0, 1));
      var startBits = q.join(" "), ins = [], cyc = R.int(4, 5), fields = [], rows = [], states = [];
      for (var c = 0; c < cyc; c++) { var x = R.int(0, 1); ins.push(x); q = [x].concat(q.slice(0, n - 1)); states.push(q.slice()); }
      states.forEach(function (st, c2) {
        fields.push({ id: "q" + c2, label: "after edge " + (c2 + 1), kind: "cells", parts: ["0", "1", "2", "3"], answer: st.map(String), size: 2 });
        rows.push([c2 + 1, ins[c2]].concat([0, 1, 2, 3].map(function (j) { return { f: "q" + c2, part: String(j) }; })).concat([{ mark: "q" + c2 }]));
      });
      return {
        prompt: p("A 4-bit serial-in, parallel-out (SIPO) register is a chain of D flip-flops Q3 → Q2 → Q1 → Q0: on each rising edge the serial input enters Q3 and every bit moves one place right (Q0's bit is dropped).") +
          p("It starts as Q3 Q2 Q1 Q0 = <strong>" + startBits + "</strong>. Fill in the register after each clock edge."),
        table: { head: ["Edge", "Input", "Q3", "Q2", "Q1", "Q0", ""], rows: rows },
        fields: fields,
        solution: table(["Edge", "Input", "Q3 Q2 Q1 Q0"], states.map(function (st, c3) { return [c3 + 1, ins[c3], "<strong>" + st.join(" ") + "</strong>"]; }))
      };
    },
    function (R) {
      var n = R.pick([4, 4, 8]), bits = []; for (var k = 0; k < n; k++) bits.push(R.int(0, 1));
      var cyc = R.int(2, n - 1), out = bits.slice(n - cyc).reverse(), left = [];
      for (var j = 0; j < cyc; j++) left.push(0);
      var after = left.concat(bits.slice(0, n - cyc));
      return {
        prompt: p("A " + n + "-bit parallel-in, serial-out (PISO) register loads " + code(bits.join("")) + " (leftmost bit in the leftmost flip-flop). It then shifts right once per clock, outputting its rightmost bit each cycle and shifting in 0s on the left.") +
          p("Which bits come out during the first " + cyc + " cycles (in order), and what does the register hold afterwards?"),
        fields: [{ id: "o", label: "Bits out, in order", kind: "bits", width: cyc, answer: out.join(""), size: 10 }, { id: "r", label: "Register afterwards", kind: "bits", width: n, answer: after.join(""), size: 12 }],
        solution: p("Data is output in serial, rightmost bit first: <strong>" + out.join("") + "</strong>. After " + cyc + " shifts the register holds <strong>" + after.join("") + "</strong>.")
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
  G["state/fsm-table"] = variants([
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
      var n = R.int(3, 7), step = R.pick([1, 1, 2]), useSlt = R.chance(0.5), total = 0, iters = 0, k = n;
      while (k > 0) { total += k; iters++; k -= step; }
      var lines = useSlt
        ? ["      add  $t0, $zero, $zero", "      addi $t1, $zero, " + n, "Loop: slt  $t2, $zero, $t1", "      beq  $t2, $zero, Exit", "      add  $t0, $t0, $t1", "      addi $t1, $t1, -" + step, "      j    Loop", "Exit:"]
        : ["      add  $t0, $zero, $zero", "      addi $t1, $zero, " + n, "Loop: beq  $t1, $zero, Exit", "      add  $t0, $t0, $t1", "      addi $t1, $t1, -" + step, "      j    Loop", "Exit:"];
      if (!useSlt && n % step) { n += 1; lines[1] = "      addi $t1, $zero, " + n; total = 0; iters = 0; k = n; while (k > 0) { total += k; iters++; k -= step; } }
      return {
        prompt: p("What are " + code("$t0") + " and " + code("$t1") + " when this code reaches Exit?") + pre(lines),
        fields: [num("a", "$t0", total), num("b", "$t1", k)],
        solution: p(code("$t1") + " counts down from " + n + " by " + step + (useSlt ? " while it is positive (" + code("slt $t2, $zero, $t1") + " sets $t2 = 1 when 0 < $t1)" : " until it reaches 0") + ", and " + code("$t0") + " adds up its values: " +
          Array.apply(null, Array(iters)).map(function (_, q) { return n - q * step; }).join(" + ") + " = <strong>" + total + "</strong>. At Exit, " + code("$t1") + " = <strong>" + k + "</strong>.")
      };
    }
  ]);

  /* Procedures: register usage, jal/jr, and saving registers on the stack */
  G["mips/procedures"] = variants([
    function (R) {
      var nS = R.int(1, 3), nonLeaf = R.chance(0.5), saved = [], k;
      for (k = nS - 1; k >= 0; k--) saved.push("$s" + k);
      if (nonLeaf) saved.unshift("$ra");
      var n = saved.length, lines = [], fields = [];
      lines.push(["proc: addi $sp, $sp, ", { f: "a" }]);
      saved.forEach(function (r, q) { lines.push(["      sw   " + r + ", ", { f: "s" + q }, "($sp)"]); fields.push(num("s" + q, "offset of " + r, 4 * (n - 1 - q), { size: 3 })); });
      lines.push(["      ...            # procedure body" + (nonLeaf ? " (calls another procedure)" : "")]);
      lines.push(["      addi $sp, $sp, ", { f: "b" }]);
      lines.push(["      jr   $ra"]);
      fields.unshift(num("a", "stack adjustment", -4 * n, { size: 4 }));
      fields.push(num("b", "stack restore", 4 * n, { size: 4 }));
      return {
        prompt: p("A " + (nonLeaf ? "non-leaf" : "leaf") + " procedure uses " + saved.filter(function (r) { return r !== "$ra"; }).join(", ") + (nonLeaf ? " and calls another procedure" : "") + ". Fill in the blanks so it saves " + (nonLeaf ? "its return address and " : "") + "those registers on the stack" + (n > 1 ? ", in the order shown, from the highest offset down (as in lecture)" : "") + ". The restores are not shown."),
        code: lines,
        fields: fields,
        solution: pre(["proc: addi $sp, $sp, " + -4 * n + "    # make room for " + n + " register" + (n > 1 ? "s" : "")].concat(saved.map(function (r, q) { return "      sw   " + r + ", " + 4 * (n - 1 - q) + "($sp)"; }))
          .concat(["      ...", "      addi $sp, $sp, " + 4 * n + "     # pop " + n + " item" + (n > 1 ? "s" : ""), "      jr   $ra"])) +
          p("$s registers must be saved and restored by the callee" + (nonLeaf ? "; a non-leaf procedure must also save $ra, because its own jal overwrites it." : "; a leaf procedure never overwrites $ra, so it need not save it."))
      };
    },
    function (R) {
      var pc = (0x00400000 + 4 * R.int(4, 300)) >>> 0, target = (0x00400000 + 4 * R.int(400, 900)) >>> 0;
      return {
        prompt: p(code("jal Proc") + " is at address " + code(hex(pc, 8)) + " and Proc starts at " + code(hex(target, 8)) + ". After the " + code("jal") + " executes, what is in $ra and in the PC? Where does Proc's " + code("jr $ra") + " return to?"),
        fields: [{ id: "ra", label: "$ra", kind: "hex", answer: pc + 4, size: 12 }, { id: "pc", label: "PC", kind: "hex", answer: target, size: 12 }, { id: "back", label: "jr $ra returns to", kind: "hex", answer: pc + 4, size: 12 }],
        solution: p(code("jal") + " puts the address of the following instruction in $ra (" + hex(pc, 8) + " + 4 = <strong>" + hex(pc + 4, 8) + "</strong>) and jumps to the target (<strong>" + hex(target, 8) + "</strong>). " + code("jr $ra") + " copies $ra to the PC, returning to <strong>" + hex(pc + 4, 8) + "</strong>.")
      };
    },
    function (R) {
      var names = R.shuffle(["g", "h", "i", "j", "x", "y"]).slice(0, R.int(2, 4)), k = R.int(0, names.length - 1), fn = R.pick(["leaf_example", "compute", "combine"]);
      var regOpts = ["$a0", "$a1", "$a2", "$a3", "$v0", "$s0", "$t0", "$ra"];
      return {
        prompt: p("Following the MIPS register conventions, the procedure " + code("int " + fn + "(" + names.map(function (nm) { return "int " + nm; }).join(", ") + ")") + " is called. Which register holds argument " + code(names[k]) + ", which register holds the result when it returns, and which one holds the return address?"),
        fields: [choice("arg", names[k] + " is in", regOpts, "$a" + k), choice("res", "Result in", regOpts, "$v0"), choice("ret", "Return address in", regOpts, "$ra")],
        solution: p("Arguments go in $a0–$a3 in order, so " + names[k] + " is in <strong>$a" + k + "</strong>; results go in <strong>$v0</strong> (and $v1); " + code("jal") + " leaves the return address in <strong>$ra</strong>.")
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
  /* Semantic control-signal values, as on the exam cheat sheet. Order: nPC_sel RegDst RegWr ExtOp ALUSrc MemWr MemToReg ALUCtr */
  var CONTROL = {
    add: ["+4", "rd", "write", "x", "rt", "no-write", "ALU", "add"], sub: ["+4", "rd", "write", "x", "rt", "no-write", "ALU", "sub"],
    and: ["+4", "rd", "write", "x", "rt", "no-write", "ALU", "and"], or: ["+4", "rd", "write", "x", "rt", "no-write", "ALU", "or"],
    slt: ["+4", "rd", "write", "x", "rt", "no-write", "ALU", "<"], addi: ["+4", "rt", "write", "signed", "imm", "no-write", "ALU", "add"],
    ori: ["+4", "rt", "write", "zero", "imm", "no-write", "ALU", "or"], lw: ["+4", "rt", "write", "signed", "imm", "no-write", "Mem", "add"],
    sw: ["+4", "x", "no-write", "signed", "imm", "write", "x", "add"], beq: ["branch", "x", "no-write", "x", "rt", "no-write", "x", "=="]
  };
  var SIGNALS = [["nPC_sel", ["+4", "branch"]], ["RegDst", ["rd", "rt", "x"]], ["RegWr", ["write", "no-write"]], ["ExtOp", ["zero", "signed", "x"]],
    ["ALUSrc", ["rt", "imm"]], ["MemWr", ["write", "no-write"]], ["MemToReg", ["ALU", "Mem", "x"]], ["ALUCtr", ["add", "sub", "<", "==", "or", "and"]]];
  var SAMPLE = { add: "add $t0, $t1, $t2", sub: "sub $s1, $s2, $s3", and: "and $t3, $t4, $t5", or: "or $s0, $s1, $t0", slt: "slt $t2, $s0, $s1",
    addi: "addi $t0, $t1, -12", ori: "ori $s2, $s3, 255", lw: "lw $t1, 8($s0)", sw: "sw $t2, 16($sp)", beq: "beq $t0, $t1, loop", j: "j loop" };
  G["control/control-signals"] = variants([
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
  var STAGES = { add: [1, 1, 1, 0, 1], addi: [1, 1, 1, 0, 1], lw: [1, 1, 1, 1, 1], sw: [1, 1, 1, 1, 0], beq: [1, 1, 1, 0, 0] };
  var WRITES = { add: "rd", addi: "rt", lw: "rt", sw: "none", beq: "none" };
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
      else i = { text: "sw " + a + ", " + 4 * R.int(0, 8) + "(" + b + ")", dst: null, src: a === b ? [a] : [a, b], data: a, base: b };
      ins.push(i);
    }
    return ins;
  }
  function numbered(ins) { return pre(ins.map(function (i, k) { return (k + 1) + ": " + i.text; })); }
  var PIPE_RULES = "Classic 5-stage pipeline (IF ID EX MEM WB). The register file is written in the first half of a cycle and read in the second half, and instruction and data memory are separate, so there are no structural hazards.";
  var FWD_TEXT = { none: "on the basic datapath (no forwarding)", alu: "with ALU-ALU and MEM-ALU forwarding", mem: "with ALU-ALU, MEM-ALU and MEM-MEM forwarding" };

  G["pipelining/pipeline-time"] = variants([
    function (R) {
      /* lecture: memory 200 ps, ALU 200 ps, registers 100 ps; 3 lw take 2400 ps vs 1400 ps */
      var mem = R.pick([200, 250, 300]), alu = R.pick([150, 200, 250]), reg = R.pick([50, 100, 150]), n = R.pick([2, 3, 4, 5, 10]);
      var t = [mem, reg, alu, mem, reg], total = sum(t), cc = maxOf(t), single = n * total, fill = 4 * cc, piped = fill + n * cc;
      return {
        prompt: p("Accessing memory takes " + mem + " ps (IF, MEM), the ALU takes " + alu + " ps (EX) and accessing registers takes " + reg + " ps (ID, WB). A program runs " + n + " lw instructions with no hazards.") +
          p("How long does it take on a single-cycle datapath, and on a pipelined one? What is the actual speedup? (A fraction is fine.)"),
        fields: [num("s", "Single-cycle", single, { suffix: "ps" }), num("p", "Pipelined", piped, { suffix: "ps" }), num("sp", "Actual speedup", single / piped, { tol: 0.005, frac: true })],
        solution: p("Single-cycle clock = sum of all stages = " + t.join(" + ") + " = " + total + " ps, so " + n + " × " + total + " = <strong>" + single + " ps</strong>.") +
          p("Pipelined clock = slowest stage = " + cc + " ps. Time = fill time + IC × clock = 4 × " + cc + " + " + n + " × " + cc + " = <strong>" + piped + " ps</strong>.") +
          p("Actual speedup = " + single + " ÷ " + piped + " = <strong>" + fmt(single / piped, 3) + "</strong> (the ideal speedup would be 5, the number of stages).")
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

  G["hazards/dependencies"] = variants([
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
    var mode = R.pick(["none", "none", "alu", "mem"]), ins, res;
    R.until(function () { ins = randomDepCode(R, 3, ["$t0", "$t1", "$t2", "$s0"]); res = pipelineStalls(ins, mode); return true; },
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
      prompt: p("These instructions run on the 5-stage pipeline <strong>" + FWD_TEXT[mode] + "</strong>. The register file is written in the first half of a cycle and read in the second half.") +
        p("Fill in each instruction's stage in every cycle (IF, ID, EX, MEM, WB). A stalled instruction repeats ID, and the instruction behind it repeats IF. Leave a cell blank when the instruction is not in the pipeline."),
      table: { head: head.concat([""]), rows: rows },
      fields: fields, wide: true,
      solution: table(head, solRows) + p(res.stalls + " stall cycle" + (res.stalls === 1 ? "" : "s") + "; " + total + " cycles in total.")
    };
  }

  G["hazards/stalls"] = variants([pipelineDiagram,
    function (R) {
      /* in the style of the hazard examples: count nops on the basic datapath, then with forwarding added */
      var ins, a, b, c;
      R.until(function () { ins = randomDepCode(R, R.int(4, 5), ["$t0", "$t1", "$t2", "$s0"]); a = pipelineStalls(ins, "none"); b = pipelineStalls(ins, "alu"); c = pipelineStalls(ins, "mem"); return true; }, function () { return a.stalls > 0; });
      return {
        prompt: p(PIPE_RULES) + numbered(ins) +
          p("How many cycles does the code take on the basic datapath (no forwarding), including stalls? How many stalls (nops) are needed with ALU-ALU and MEM-ALU forwarding, and how many if MEM-MEM forwarding is added too?"),
        fields: [num("c", "Cycles, basic datapath", a.cycles), num("f", "Stalls with ALU-ALU + MEM-ALU", b.stalls), num("m", "Stalls with MEM-MEM too", c.stalls)],
        solution: p("Basic datapath: a dependent instruction right after its producer needs 2 nops, and one two instructions later needs 1 (the register file writes then reads in one cycle). " +
          "ALU-ALU and MEM-ALU forwarding leave only the load-use stall (1 nop). MEM-MEM forwarding also feeds a loaded or computed value straight into a sw's data, with no stall.") +
          table(["Instruction", "ID cycle, basic", "ALU forwarding", "MEM-MEM too"], ins.map(function (i, k) { return [code(i.text), a.D[k] + 1, b.D[k] + 1, c.D[k] + 1]; })) +
          p("Basic: 5 + (" + ins.length + " − 1) + " + a.stalls + " nops = <strong>" + a.cycles + "</strong> cycles. Stalls with forwarding: <strong>" + b.stalls + "</strong>; with MEM-MEM too: <strong>" + c.stalls + "</strong>.")
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
  var VLIW_RULES = "A 2-issue extension of MIPS: the first slot of each issue packet must be an arithmetic instruction or a branch, the second a lw or sw. Instructions in the same packet must be independent. The datapath has all forwarding, but a load needs one instruction (cycle) between it and the use of the loaded value; insert nop where no instruction fits.";
  function typedCode(R) {
    var n = R.int(5, 6), ins = [], preds = [], types = [], loads = [], lines = [], free = ["$t0", "$t1", "$t2", "$t3", "$t4", "$t5"];
    for (var k = 0; k < n; k++) {
      var mem = R.chance(0.45), cand = [];
      for (var q = 0; q < k; q++) if (ins[q].dst && R.chance(0.35)) cand.push(q);
      cand = cand.slice(-2);
      var srcs = cand.map(function (q2) { return ins[q2].dst; }), dst = free[k], text, isLoad = false;
      if (mem && srcs.length && R.chance(0.5)) { text = "sw " + srcs[0] + ", " + 4 * R.int(0, 4) + "($s0)"; ins.push({ dst: null }); cand = cand.slice(0, 1); }
      else if (mem) { text = "lw " + dst + ", " + 4 * R.int(0, 4) + "($s0)"; ins.push({ dst: dst }); cand = []; isLoad = true; }
      else {
        while (srcs.length < 2) srcs.push(R.pick(["$s1", "$s2"]));
        text = R.pick(["add", "sub", "or"]) + " " + dst + ", " + srcs[0] + ", " + srcs[1]; ins.push({ dst: dst });
      }
      preds.push(cand); types.push(mem ? "mem" : "alu"); loads.push(isLoad); lines.push((k + 1) + ": " + text);
    }
    return { n: n, preds: preds, types: types, loads: loads, lines: lines, last: -1 };
  }
  /* The loop from lecture (A[i] += s2), optionally unrolled twice with $t0/$t1 */
  function loopCode(R) {
    var u = R.pick([1, 2, 2]), regs = ["$t0", "$t1"].slice(0, u), lines = [], preds = [], types = [], loads = [];
    var add = function (text, type, pr, load) { lines.push(text); types.push(type); preds.push(pr); loads.push(!!load); return lines.length - 1; };
    var lw = regs.map(function (r, k) { return add("lw   " + r + ", " + -4 * k + "($s1)", "mem", [], true); });
    var ad = regs.map(function (r, k) { return add("addu " + r + ", " + r + ", $s2", "alu", [lw[k]]); });
    regs.forEach(function (r, k) { add("sw   " + r + ", " + -4 * k + "($s1)", "mem", [ad[k]]); });
    var ai = add("addi $s1, $s1, " + -4 * u, "alu", []);
    var br = add("bne  $s1, $0, loop", "alu", [ai]);
    return { n: lines.length, preds: preds, types: types, loads: loads, last: br, u: u,
      lines: lines.map(function (l, k) { return (k + 1) + ": " + (k === 0 ? "loop: " : "      ") + l; }) };
  }
  /* Exam style: fill in the schedule table itself. Any valid schedule with the minimum number of cycles is accepted. */
  function scheduleTable(R, loop) {
    var c = loop ? loopCode(R) : typedCode(R), sched = vliwSchedule(c.preds, c.types, c.loads, c.last), best = sched.length, parts = [], rows = [];
    var nRows = best + 1;
    for (var r = 0; r < nRows; r++) {
      parts.push(r + "_0", r + "_1");
      rows.push([r + 1, { f: "s", part: r + "_0" }, { f: "s", part: r + "_1" }]);
    }
    var answer = [];
    for (var r2 = 0; r2 < nRows; r2++) { var cy = sched[r2] || [null, null]; answer.push(cy[0] === null ? "" : String(cy[0] + 1), cy[1] === null ? "" : String(cy[1] + 1)); }
    rows[0].push({ mark: "s" });
    return {
      prompt: p(VLIW_RULES + (loop ? " Assume perfect branch prediction; the bne must be in the last packet, and addi may move above the loads and stores (their offsets get adjusted)." : " Reorder freely as long as dependencies are respected.")) + pre(c.lines) +
        p("Fill in a schedule with as few cycles as possible: write instruction numbers in the slots and leave a slot blank for a nop. Then give the CPI (nops do not count as instructions)."),
      table: { head: ["CC", "ALU or branch", "Data transfer", ""], rows: rows },
      fields: [{ id: "s", label: "schedule", kind: "schedule", parts: parts, answer: answer, n: c.n, preds: c.preds, types: c.types, loads: c.loads, last: c.last, best: best, size: 3 },
        num("cpi", "CPI", best / c.n, { tol: 0.005 })],
      solution: table(["CC", "ALU or branch", "Data transfer"], sched.map(function (cy, i) { return [i + 1, cy[0] === null ? "nop" : cy[0] + 1, cy[1] === null ? "nop" : cy[1] + 1]; })) +
        p("Scheduled " + c.n + " instructions in <strong>" + best + "</strong> cycles (other orders can tie), so CPI = " + best + "/" + c.n + " = <strong>" + fmt(best / c.n) + "</strong>.")
    };
  }
  function vliwTyped(R) {
    var c = typedCode(R), best = vliwSchedule(c.preds, c.types, c.loads).length;
    return {
      prompt: p(VLIW_RULES + " Instructions may be reordered as long as dependencies are respected.") + pre(c.lines) +
        p("What is the minimum number of cycles, and the resulting CPI? (Fractions are fine.)"),
      fields: [num("c", "Minimum cycles", best), num("cpi", "CPI", best / c.n, { tol: 0.005 })],
      solution: p("Arithmetic: " + c.types.filter(function (t) { return t === "alu"; }).length + "; loads/stores: " + c.types.filter(function (t) { return t === "mem"; }).length + ".") +
        table(["CC", "ALU or branch", "Data transfer"], vliwSchedule(c.preds, c.types, c.loads).map(function (cy, i) { return [i + 1, cy[0] === null ? "nop" : cy[0] + 1, cy[1] === null ? "nop" : cy[1] + 1]; })) +
        p("The best schedule takes <strong>" + best + "</strong> cycles, so CPI = " + best + "/" + c.n + " = <strong>" + fmt(best / c.n) + "</strong>.")
    };
  }
  G["ilp/vliw"] = variants([function (R) { return scheduleTable(R, false); }, function (R) { return scheduleTable(R, true); }, vliwTyped]);

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
      /* the lecture's example: x1 and x2 in one block, both processors start with it loaded */
      var steps, kinds;
      R.until(function () { steps = []; for (var k = 0; k < 5; k++) steps.push({ p: R.int(0, 1), op: R.chance(0.6) ? "W" : "R", w: R.int(1, 2) }); kinds = classifySharing(steps, true); return true; },
        function () { return kinds.indexOf("true sharing miss") !== -1 && kinds.indexOf("false sharing miss") !== -1; });
      var opts = ["hit", "true sharing miss", "false sharing miss"];
      return {
        prompt: p("Let x1 and x2 belong to the same cache block. Processors 1 and 2 have private caches with write-invalidate coherence, and both begin with the block loaded. Classify each access as a hit, a true sharing miss or a false sharing miss."),
        table: { head: ["Time", "P1", "P2", "True, false, hit?"], rows: steps.map(function (st, k) { var a = (st.op === "R" ? "Read x" : "Write x") + st.w; return [k + 1, st.p === 0 ? a : "", st.p === 1 ? a : "", { f: "k" + k }]; }) },
        fields: kinds.map(function (kd, k) { return choice("k" + k, "", opts, kd); }),
        solution: table(["Time", "Access", "Result"], steps.map(function (st, k) { return [k + 1, "P" + (st.p + 1) + (st.op === "R" ? " reads" : " writes") + " x" + st.w, "<strong>" + kinds[k] + "</strong>"]; })) +
          p("A write invalidates the other copy. The next miss on that copy is a true miss if it touches the word the other processor wrote (it would still miss with 1-word blocks), and a false miss otherwise.")
      };
    },
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
  /* Data races, written like the lecture's std::thread examples */
  G["multicore/races"] = variants([
    function (R) {
      var n = R.int(2, 4), v = R.pick([0, 0, 10, 100]), k = R.pick([1, 1, 2, 5]), vals = [];
      for (var i = 1; i <= n; i++) vals.push(v + i * k);
      var ts = []; for (var t = 1; t <= n; t++) ts.push("std::thread t" + t + "(incrAddr, p);");
      return {
        prompt: p(n + " threads run " + code("incrAddr") + " on the same address with no synchronization. " + code("*p") + " starts at " + v + ".") +
          pre(["void incrAddr(int* address) {", "    int val = *address;", "    val " + (k === 1 ? "++" : "+= " + k) + ";", "    *address = val;", "}", ""].concat(ts)) +
          p("After all threads are joined, list every value " + code("*p") + " could hold."),
        fields: [{ id: "v", label: "Possible values", kind: "set", answer: vals, size: 16 }],
        solution: p("Each thread reads, adds " + k + " and writes back. If threads read before the others write, their updates overwrite each other, so anywhere from 1 to " + n + " updates survive: <strong>" + vals.join(", ") + "</strong>. A lock (mutual exclusion) around the critical section would always give " + (v + n * k) + ".")
      };
    },
    function (R) {
      var n = R.int(2, 4), vals = R.shuffle([1, 2, 3, 5, 7, 9]).slice(0, n), init = R.pick([0, -1]), ts = [];
      vals.forEach(function (x, t) { ts.push("std::thread t" + (t + 1) + "(setAddress, p, " + x + ");"); });
      return {
        prompt: p("Each thread writes its own value to the same address; " + code("*p") + " starts at " + init + ".") +
          pre(["void setAddress(int* addr, int val) {", "    *addr = val;", "}", ""].concat(ts)) +
          p("After all threads are joined, list every value " + code("*p") + " could hold."),
        fields: [{ id: "v", label: "Possible values", kind: "set", answer: vals.slice().sort(function (a, b) { return a - b; }), size: 16 }],
        solution: p("The writes are serialized, but in no fixed order: whichever thread writes last wins, so <strong>" + vals.slice().sort(function (a, b) { return a - b; }).join(", ") + "</strong> are all possible (but not " + init + ", since every thread writes).")
      };
    }
  ]);

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
  /* Coalescing: transactions between device memory and L2 are 48 bytes (pre-Pascal) or 512 bytes (post-Pascal) */
  G["gpu/coalescing"] = variants([
    function (R) {
      var o = R.until(function () {
        var seg = R.pick([48, 512, 512]), size = R.pick([4, 4, 8]), s = R.pick([1, 1, 2, 4, 8, 16, 32]), segs = {};
        for (var t = 0; t < 32; t++) segs[Math.floor(size * s * t / seg)] = true;
        return { seg: seg, size: size, s: s, n: Object.keys(segs).length };
      }, function (x) { return x.seg === 512 || x.s === 1 || x.size * x.s >= 48; });
      var span = o.size * o.s * 31 + o.size, ty = o.size === 4 ? "float" : "double";
      return {
        prompt: p("Each of the 32 threads in a warp reads one " + o.size + "-byte " + ty + ":") + pre([ty + " v = a[" + (o.s === 1 ? "" : o.s + " * ") + "threadIdx.x];"]) +
          p("a[] is aligned, and memory transactions between device memory and L2 are " + o.seg + " bytes (" + (o.seg === 48 ? "pre-Pascal" : "post-Pascal") + "). How many transactions does the warp need?"),
        fields: [num("n", "Transactions", o.n)],
        solution: p("Thread t reads bytes " + o.size * o.s + "t to " + o.size * o.s + "t + " + (o.size - 1) + ". " +
          (o.size * o.s >= o.seg ? "Consecutive threads are at least " + o.seg + " bytes apart, so every thread needs its own transaction (the worst case): <strong>32</strong>."
            : "The warp touches bytes 0 to " + (span - 1) + (o.s > 1 ? ", with gaps" : ", which are contiguous") + ", spread over <strong>" + o.n + "</strong> aligned " + o.seg + "-byte transaction" + (o.n > 1 ? "s" : "") + ".")) +
          (o.s > 1 ? p("Access contiguous and aligned data for coalesced transactions (\"inter-thread spatial locality\").") : "")
      };
    },
    function (R) {
      var size = R.pick([4, 8]), seg = R.pick([48, 512]), bytes = 32 * size, best = Math.ceil(bytes / seg);
      return {
        prompt: p("A warp of 32 threads reads 32 " + size + "-byte values with memory transactions of " + seg + " bytes (" + (seg === 48 ? "pre-Pascal" : "post-Pascal") + "). How many transactions are needed when the data is contiguous and aligned, and how many in the worst case, when no two threads' data are close together?"),
        fields: [num("b", "Contiguous and aligned", best), num("w", "Worst case", 32)],
        solution: p("Contiguous: 32 × " + size + " = " + bytes + " bytes, which fill ⌈" + bytes + " ÷ " + seg + "⌉ = <strong>" + best + "</strong> aligned transaction" + (best > 1 ? "s" : "") + ". Worst case: one serialized transaction per thread, <strong>32</strong>.")
      };
    }
  ]);

  /* Warps on a streaming multiprocessor: instruction replay and tensor cores */
  G["gpu/warps"] = variants([
    function (R) {
      var units = { "load/store": R.pick([8, 16]), "SFU (sin, cos, log, …)": R.pick([4, 8]), "double-precision FP": R.pick([16, 32]) }, kinds = Object.keys(units);
      var seq = [], total = 0;
      for (var k = 0; k < R.int(2, 3); k++) { var kd = R.pick(kinds); seq.push(kd); total += 32 / units[kd]; }
      return {
        prompt: p("A warp of 32 threads issues these instructions on an SM whose execution units are: " + kinds.map(function (kd) { return units[kd] + " " + kd + " units"; }).join(", ") + ". An instruction that cannot run for all 32 threads at once is replayed. How many cycles does each take, and how many in total?") +
          ul(seq.map(function (kd, i) { return (i + 1) + ". a " + kd + " instruction"; })),
        fields: seq.map(function (kd, i) { return num("c" + i, (i + 1) + ". " + kd, 32 / units[kd], { size: 4 }); }).concat([num("t", "Total", total)]),
        solution: ul(seq.map(function (kd, i) { return kd + ": 32 threads ÷ " + units[kd] + " units = <strong>" + 32 / units[kd] + "</strong> cycle" + (32 / units[kd] > 1 ? "s" : ""); })) + p("Total: <strong>" + total + "</strong> cycles.")
      };
    },
    function (R) {
      var n = R.pick([8, 16, 32]), per = n / 4, ops = per * per * per;
      return {
        prompt: p("A tensor core organizes its 64 FMA units as a 4×4×4 grid, computing a 4×4 matrix FMA (D = A × B + C) per instruction. A warp computes a " + n + "×" + n + "×" + n + " FMA by repeating tensor-core 4×4×4 instructions. How many are needed, and how many FMA operations is that?"),
        fields: [num("i", "4×4×4 instructions", ops), num("f", "FMA operations", ops * 64)],
        solution: p("Each dimension splits into " + n + " ÷ 4 = " + per + " pieces, so " + per + " × " + per + " × " + per + " = <strong>" + ops + "</strong> instructions, each doing 64 FMAs: " + ops + " × 64 = <strong>" + ops * 64 + "</strong>.")
      };
    }
  ]);

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
    /* numbers in any order, duplicates count */
    multiset: function (f, raw) {
      var vals = parseNums(raw);
      if (vals.some(isNaN)) return { ok: false, note: "Use numbers separated by commas." };
      vals.sort(function (a, b) { return a - b; });
      return { ok: vals.length === f.answer.length && vals.every(function (v, i) { return v === f.answer[i]; }) };
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
          var pr = f.preds[j][q];
          if (where[j + 1] <= where[pr + 1]) return { ok: false, note: "Instruction " + (j + 1) + " issues before instruction " + (pr + 1) + " has produced its value." };
          if (f.loads && f.loads[pr] && where[j + 1] === where[pr + 1] + 1) return { ok: false, note: "Instruction " + (j + 1) + " uses the value loaded by instruction " + (pr + 1) + " in the very next cycle; a load needs one cycle between it and the use." };
        }
      }
      if (f.last >= 0 && f.last !== undefined && where[f.last + 1] !== last) return { ok: false, note: "The branch (instruction " + (f.last + 1) + ") must be in the last packet." };
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
    if (raw.trim() === "" && field.kind !== "set" && field.kind !== "multiset") return { ok: false, blank: true };
    return CHECKERS[field.kind](field, raw);
  }
  function sampleAnswer(f) {
    switch (f.kind) {
      case "number": return exact(f.answer, 2) ? String(f.answer) : String(round(f.answer, 4));
      case "text": return f.accept[0];
      case "choice": return f.answer;
      case "set": case "list": case "multiset": return f.answer.join(", ");
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
      findDependencies: findDependencies, pipelineStalls: pipelineStalls, vliwSchedule: vliwSchedule, parseBool: parseBool, truthTable: truthTable,
      encode: encode, minSop: minSop, parseNum: parseNum, exprHtml: exprHtml, exprText: exprText, deriveSteps: deriveSteps }
  };
})(typeof window !== "undefined" ? window : globalThis);
