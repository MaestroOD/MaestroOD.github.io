/* CS 3350A exam cheat-sheet sections, shown when hovering over a practice problem's title.
   Transcribed from the cheat sheets handed out with the midterm and final exam (text and tables
   only; figures are left out). `map` says which sections go with which problem type; problem
   types with no matching cheat-sheet material have no entry. */
window.CS3350_CHEAT = {
  sections: {
    cpu: {
      title: "CPU time",
      html:
        "<p>CPU time = instruction count × CPI × clock cycle</p>" +
        "<p>CPU time = IC × (CPI<sub>ideal</sub> + average memory stall cycles) × CC</p>" +
        "<p>CPI<sub>ideal</sub> = Σ<sub>i</sub> (CPI<sub>i</sub> × IC<sub>i</sub>) ÷ IC</p>"
    },
    memory: {
      title: "Memory hierarchy",
      html:
        "<p>CPI<sub>stall</sub> = CPI<sub>ideal</sub> + average memory stall cycles</p>" +
        "<p>Average memory stall cycles = access rate × miss rate × miss penalty</p>" +
        "<p>Miss rate = number of cache misses ÷ total number of cache references; miss rate + hit rate = 1 (100%)</p>" +
        "<p>AMAT (average time to access memory, counting hits and misses) = time for a hit + miss rate × miss penalty</p>" +
        "<p>AMAT = L1 hit time + L1 miss rate × L1 miss penalty</p>"
    },
    writes: {
      title: "Write policies",
      html:
        "<ul><li><strong>Write-through:</strong> cache and backing memory are always consistent.</li>" +
        "<li><strong>Write-back:</strong> cache and backing memory may differ; lower memory is written only on eviction.</li>" +
        "<li><strong>Write allocate:</strong> on a write miss, fetch and install the block in the cache before writing.</li>" +
        "<li><strong>No-write allocate:</strong> on a write miss, skip fetching the block and write directly to lower memory.</li></ul>"
    },
    cache: {
      title: "Memory–cache mapping",
      html:
        "<ul><li>The cache is an array of R = 2<sup>s</sup> sets; each set holds N ≥ 1 lines; each line (block) holds B = 2<sup>b</sup> bytes.</li>" +
        "<li>Capacity C = B × N × R (bytes per line × lines per set × number of sets). All values are powers of 2.</li>" +
        "<li>The word at m-bit address A is in the cache if the tag of a valid line in set <em>set-index</em> matches <em>tag</em>; its contents start <em>block-offset</em> bytes into the block.</li>" +
        "<li>block-address = tag ‖ set-index; set # = block-address mod R</li>" +
        "<li>b = log<sub>2</sub>(B), R = C ÷ (B × N), s = log<sub>2</sub>(R), t = m − s − b</li></ul>"
    },
    boolean: {
      title: "Laws of Boolean algebra",
      html:
        "<table class=\"cheat-table\"><tbody>" +
        "<tr><td>x·x' = 0</td><td>x + x' = 1</td><td>complementarity</td></tr>" +
        "<tr><td>x·0 = 0</td><td>x + 1 = 1</td><td>laws of 0's and 1's</td></tr>" +
        "<tr><td>x·1 = x</td><td>x + 0 = x</td><td>identities</td></tr>" +
        "<tr><td>x·x = x</td><td>x + x = x</td><td>idempotent law</td></tr>" +
        "<tr><td>x·y = y·x</td><td>x + y = y + x</td><td>commutativity</td></tr>" +
        "<tr><td>(xy)z = x(yz)</td><td>(x + y) + z = x + (y + z)</td><td>associativity</td></tr>" +
        "<tr><td>x(y + z) = xy + xz</td><td>x + yz = (x + y)(x + z)</td><td>distribution</td></tr>" +
        "<tr><td>xy + x = x</td><td>(x + y)x = x</td><td>uniting theorem</td></tr>" +
        "<tr><td>x'y + x = x + y</td><td>(x' + y)x = xy</td><td>uniting theorem v.2</td></tr>" +
        "<tr><td>(x·y)' = x' + y'</td><td>(x + y)' = x'·y'</td><td>De Morgan's law</td></tr>" +
        "</tbody></table>"
    },
    flipflops: {
      title: "Flip-flops",
      html:
        "<div class=\"cheat-cols\">" +
        "<table class=\"cheat-table\"><caption>D</caption><thead><tr><th>D</th><th>Q</th><th>Q<sub>next</sub></th></tr></thead><tbody><tr><td>0</td><td>–</td><td>0</td></tr><tr><td>1</td><td>–</td><td>1</td></tr></tbody></table>" +
        "<table class=\"cheat-table\"><caption>T</caption><thead><tr><th>T</th><th>Q</th><th>Q<sub>next</sub></th></tr></thead><tbody><tr><td>0</td><td>0</td><td>0</td></tr><tr><td>0</td><td>1</td><td>1</td></tr><tr><td>1</td><td>0</td><td>1</td></tr><tr><td>1</td><td>1</td><td>0</td></tr></tbody></table>" +
        "<table class=\"cheat-table\"><caption>SR</caption><thead><tr><th>S</th><th>R</th><th>Q</th><th>Q<sub>next</sub></th></tr></thead><tbody><tr><td>0</td><td>0</td><td>–</td><td>Q</td></tr><tr><td>0</td><td>1</td><td>–</td><td>0</td></tr><tr><td>1</td><td>0</td><td>–</td><td>1</td></tr><tr><td>1</td><td>1</td><td>–</td><td>–</td></tr></tbody></table>" +
        "<table class=\"cheat-table\"><caption>JK</caption><thead><tr><th>J</th><th>K</th><th>Q</th><th>Q<sub>next</sub></th></tr></thead><tbody><tr><td>0</td><td>0</td><td>–</td><td>Q</td></tr><tr><td>0</td><td>1</td><td>–</td><td>0</td></tr><tr><td>1</td><td>0</td><td>–</td><td>1</td></tr><tr><td>1</td><td>1</td><td>–</td><td>Q'</td></tr></tbody></table>" +
        "</div>"
    },
    mips: {
      title: "MIPS",
      html:
        "<table class=\"cheat-table\"><thead><tr><th>Instruction</th><th>Example</th><th>Meaning in C</th></tr></thead><tbody>" +
        "<tr><td>load word</td><td><code>lw $s0, 4($s1)</code></td><td>$s0 = Memory($s1 + 4)</td></tr>" +
        "<tr><td>store word</td><td><code>sw $s0, 4($s1)</code></td><td>Memory($s1 + 4) = $s0</td></tr>" +
        "<tr><td>add</td><td><code>add $s0, $s1, $s2</code></td><td>$s0 = $s1 + $s2</td></tr>" +
        "<tr><td>subtract</td><td><code>sub $s0, $s1, $s2</code></td><td>$s0 = $s1 − $s2</td></tr>" +
        "<tr><td>add immediate</td><td><code>addi $s0, $s1, 2</code></td><td>$s0 = $s1 + 2</td></tr>" +
        "<tr><td>subtract immediate</td><td><code>subi $s0, $s1, 2</code></td><td>$s0 = $s1 − 2</td></tr>" +
        "<tr><td>shift left</td><td><code>sll $s0, $s1, 2</code></td><td>$s0 = $s1 &lt;&lt; 2 bits</td></tr>" +
        "<tr><td>shift right</td><td><code>srl $t2, $t2, 1</code></td><td>$t2 = $t2 / 2</td></tr>" +
        "<tr><td>branch on equal</td><td><code>beq $s0, $s1, L</code></td><td>if ($s0 == $s1) go to L</td></tr>" +
        "<tr><td>branch on not equal</td><td><code>bne $s0, $s1, L</code></td><td>if ($s0 != $s1) go to L</td></tr>" +
        "<tr><td>set on less than</td><td><code>slt $s0, $s1, $s2</code></td><td>if ($s1 &lt; $s2) $s0 = 1 else $s0 = 0</td></tr>" +
        "<tr><td>jump</td><td><code>j L</code></td><td>go to L</td></tr>" +
        "<tr><td>jump register</td><td><code>jr $s0</code></td><td>go to $s0</td></tr>" +
        "<tr><td>jump and link</td><td><code>jal 250</code></td><td>go to 1000; $ra = PC + 4</td></tr>" +
        "</tbody></table>" +
        "<table class=\"cheat-table\"><thead><tr><th>Name</th><th>Number</th><th>Usage</th><th>Preserve on call?</th></tr></thead><tbody>" +
        "<tr><td>$zero</td><td>0</td><td>constant 0 (hardware)</td><td>n.a.</td></tr>" +
        "<tr><td>$at</td><td>1</td><td>reserved for assembler</td><td>n.a.</td></tr>" +
        "<tr><td>$v0–$v1</td><td>2–3</td><td>returned values</td><td>no</td></tr>" +
        "<tr><td>$a0–$a3</td><td>4–7</td><td>arguments</td><td>yes</td></tr>" +
        "<tr><td>$t0–$t7</td><td>8–15</td><td>temporaries</td><td>no</td></tr>" +
        "<tr><td>$s0–$s7</td><td>16–23</td><td>saved values</td><td>yes</td></tr>" +
        "<tr><td>$t8–$t9</td><td>24–25</td><td>temporaries</td><td>no</td></tr>" +
        "<tr><td>$k0–$k1</td><td>26–27</td><td>interrupt/trap handler</td><td>yes</td></tr>" +
        "<tr><td>$gp</td><td>28</td><td>global pointer</td><td>yes</td></tr>" +
        "<tr><td>$sp</td><td>29</td><td>stack pointer</td><td>yes</td></tr>" +
        "<tr><td>$fp</td><td>30</td><td>frame pointer</td><td>yes</td></tr>" +
        "<tr><td>$ra</td><td>31</td><td>return address (hardware)</td><td>yes</td></tr>" +
        "</tbody></table>"
    },
    formats: {
      title: "Instruction formats",
      html:
        "<table class=\"cheat-table\"><tbody>" +
        "<tr><th>R</th><td>op (6)</td><td>rs (5)</td><td>rt (5)</td><td>rd (5)</td><td>shamt (5)</td><td>funct (6)</td></tr>" +
        "<tr><th>I</th><td>op (6)</td><td>rs (5)</td><td>rt (5)</td><td colspan=\"3\">immediate (16)</td></tr>" +
        "<tr><th>J</th><td>op (6)</td><td colspan=\"5\">target address (26)</td></tr>" +
        "</tbody></table>" +
        "<p>op: add/sub 00 0000 (funct 10 0000 / 10 0010), ori 00 1101, lw 10 0011, sw 10 1011, beq 00 0100, j 00 0010</p>"
    },
    control: {
      title: "Control signals",
      html:
        "<table class=\"cheat-table\"><thead><tr><th></th><th>add</th><th>sub</th><th>ori</th><th>lw</th><th>sw</th><th>beq</th><th>jump</th></tr></thead><tbody>" +
        "<tr><th>RegDst</th><td>1</td><td>1</td><td>0</td><td>0</td><td>x</td><td>x</td><td>x</td></tr>" +
        "<tr><th>ALUSrc</th><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td><td>0</td><td>x</td></tr>" +
        "<tr><th>MemtoReg</th><td>0</td><td>0</td><td>0</td><td>1</td><td>x</td><td>x</td><td>x</td></tr>" +
        "<tr><th>RegWrite</th><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td></tr>" +
        "<tr><th>MemWrite</th><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td></tr>" +
        "<tr><th>nPC_sel</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>?</td></tr>" +
        "<tr><th>Jump</th><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>" +
        "<tr><th>ExtOp</th><td>x</td><td>x</td><td>0</td><td>1</td><td>1</td><td>x</td><td>x</td></tr>" +
        "<tr><th>ALUctr</th><td>Add</td><td>Subtract</td><td>Or</td><td>Add</td><td>Add</td><td>Equal</td><td>x</td></tr>" +
        "</tbody></table>" +
        "<p>Semantic values: nPC_sel '+4', 'branch' · RegDst 'rd', 'rt' · RegWr 'write', 'no-write' · ExtOp 'zero', 'signed' · ALUSrc 'rt'/'busB', imm · MemWr 'write', 'no-write' · MemToReg 'ALU', 'Mem' · ALUCtr 'add', 'sub', '&lt;', '&gt;', '==', '!=', 'or', 'and', …</p>"
    },
    hazards: {
      title: "MIPS pipeline hazards",
      html:
        "<ul><li><strong>Structural hazards:</strong> two different instructions try to use the same resource at the same time.</li>" +
        "<li><strong>Data hazards:</strong> an instruction tries to use data before it is ready; its source operands are produced by an earlier instruction still in the pipeline.</li>" +
        "<li><strong>Control hazards:</strong> a decision about control flow is made before the condition has been evaluated and the new PC target computed (branches).</li></ul>" +
        "<p>Forwarding: ALU–ALU forwarding passes an ALU result straight to the next instruction's EX stage; MEM–ALU forwarding passes a loaded value from MEM to a later instruction's EX stage.</p>"
    },
    mesi: {
      title: "MESI protocol",
      html:
        "<p><strong>Local read hit:</strong> the line is in M, E or S; return the value; no state changes.</p>" +
        "<p><strong>Local read miss:</strong></p><ul>" +
        "<li>One cache has an E copy: it puts the value on the bus, the memory access is abandoned, both lines become S.</li>" +
        "<li>No other copy: the value comes from memory and is marked E.</li>" +
        "<li>Several caches have S copies: one of them supplies the value; the local line is S, the others stay S.</li>" +
        "<li>One cache has an M copy: it supplies the value and writes it back to memory; both lines become S.</li></ul>" +
        "<p><strong>Local write hit:</strong> M — update, no change. E — update, E → M. S — broadcast an invalidate (other S copies → I), update, S → M.</p>" +
        "<p><strong>Local write miss:</strong></p><ul>" +
        "<li>No other copies: local copy set to M.</li>" +
        "<li>Other copies in E or S: read with intent to modify (RWITM); other copies → I; local copy updated and set to M.</li>" +
        "<li>Another copy in M: that core writes its copy back and sets it to I; the value is then read from memory, updated locally and set to M.</li></ul>"
    },
    sync: {
      title: "Synchronization in MIPS",
      html:
        "<ul><li><strong>Load linked</strong> <code>ll rt, off(rs)</code>: load rt with Mem[off + rs] and reserve that address in a link register.</li>" +
        "<li><strong>Store conditional</strong> <code>sc rt, off(rs)</code>: if the reservation is still valid, write rt to Mem[off + rs] and set rt to 1 (success); otherwise store nothing and set rt to 0 (failure — the location changed since the ll).</li>" +
        "<li>sc overwrites rt, so keep a copy if you need the value again.</li></ul>"
    }
  },

  map: {
    "performance/effective-cpi": ["cpu"],
    "performance/cpu-time": ["cpu"],
    "performance/compare": ["cpu"],
    "memory/amat": ["memory"],
    "memory/stall-cpi": ["memory", "cpu"],
    "memory/miss-types": ["memory"],
    "memory/concepts": ["memory", "writes"],
    "caches/address-bits": ["cache"],
    "caches/cache-sim": ["cache"],
    "caches/hit-rate": ["cache", "memory"],
    "caches/concepts": ["cache", "writes"],
    "logic/boolean-simplify": ["boolean"],
    "logic/truth-table": ["boolean"],
    "logic/concepts": ["boolean"],
    "sequential/flip-flops": ["flipflops"],
    "sequential/concepts": ["flipflops"],
    "mips/encode": ["formats", "mips"],
    "mips/decode": ["formats", "mips"],
    "mips/branch-target": ["formats", "mips"],
    "mips/c-to-mips": ["mips"],
    "mips/trace": ["mips"],
    "mips/concepts": ["mips", "formats"],
    "datapath/control-signals": ["control"],
    "datapath/datapath-trace": ["control"],
    "datapath/concepts": ["control"],
    "pipelining/dependencies": ["hazards"],
    "pipelining/stalls": ["hazards"],
    "pipelining/concepts": ["hazards"],
    "multicore/mesi": ["mesi"],
    "multicore/sharing": ["mesi"],
    "multicore/races": ["sync"],
    "multicore/concepts": ["mesi"]
  }
};
