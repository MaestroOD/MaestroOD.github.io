/* CS 3350A topic data, shared by the course pages and the practice page.
   Organized like the Brightspace modules for fall 2026: five categories, each split into
   subtopics. Each problem type needs a matching generator in generators.js ("slug/id").
   Everything here comes from the 2026 lecture slides. */
window.CS3350 = {
  categories: [
    { slug: "cpu-and-memory", title: "CPU and memory" },
    { slug: "synchronous-circuits", title: "synchronous circuits" },
    { slug: "control-and-datapath", title: "CPU control & datapath" },
    { slug: "ilp", title: "instruction-level parallelism" },
    { slug: "parallel", title: "parallel architectures" }
  ],

  topics: [
    /* ---------- CPU and memory ---------- */
    {
      slug: "cpu",
      category: 0,
      title: "the CPU",
      blurb: "CPU time, CPI, and comparing performance.",
      summary:
        "measuring and comparing CPU performance. a program's CPU time depends on how many instructions " +
        "it runs, the average number of clock cycles each one takes (CPI), and the length of a clock " +
        "cycle. also latency and throughput, the power wall, benchmarks, and profiling.",
      keyIdeas: [
        "CPU time = instruction count × CPI × clock cycle = instruction count × CPI ÷ clock rate",
        "clock rate = 1 ÷ clock cycle",
        "effective CPI = Σ (CPI<sub>i</sub> × IC<sub>i</sub>) ÷ IC",
        "if X is n times faster than Y, then n = execution time<sub>Y</sub> ÷ execution time<sub>X</sub>"
      ],
      problems: [
        { id: "effective-cpi", title: "effective CPI" },
        { id: "cpu-time", title: "CPU time" },
        { id: "compare", title: "comparing performance" },
        { id: "factors", title: "what affects CPU time" }
      ]
    },
    {
      slug: "hierarchy",
      category: 0,
      title: "the memory hierarchy",
      blurb: "locality, cache misses, CPI with stalls, and AMAT.",
      summary:
        "the memory hierarchy puts small, fast caches between the CPU and large, slow main memory. this " +
        "only pays off because programs have locality, reusing data they touched recently and data stored " +
        "right next to it. also row-major arrays, the three kinds of misses (cold, conflict, and capacity), " +
        "CPU time with memory stalls, and average memory access time across one or more levels of cache.",
      keyIdeas: [
        "C arrays are row-major, so a[i][j] is element i × ncols + j",
        "CPI<sub>stall</sub> = CPI<sub>ideal</sub> + average memory stall cycles",
        "average memory stall cycles = access rate × miss rate × miss penalty",
        "AMAT = hit time + miss rate × miss penalty",
        "L1 miss penalty = L2 hit time + L2 miss rate × L2 miss penalty"
      ],
      problems: [
        { id: "stall-cpi", title: "CPI with memory stalls" },
        { id: "amat", title: "average memory access time" },
        { id: "locality", title: "locality" },
        { id: "miss-types", title: "cold, conflict, and capacity misses" }
      ]
    },
    {
      slug: "caches",
      category: 0,
      title: "cache implementations",
      blurb: "direct-mapped and set associative caches, LRU, and FIFO.",
      summary:
        "how a cache is laid out and where each address lands in it. direct-mapped, set associative, and " +
        "fully associative caches, splitting an address into tag, set index, and block offset, word versus " +
        "byte addresses, replacement (LRU and FIFO), write hits and misses (write-through, write-back, and " +
        "write allocate), and multilevel caches.",
      keyIdeas: [
        "C = B × N × R (bytes per line × lines per set × number of sets)",
        "b = log₂(B), s = log₂(R), and t = m − s − b",
        "set number = block address mod R",
        "each doubling of associativity halves the number of sets"
      ],
      problems: [
        { id: "address-bits", title: "tag, index, and offset" },
        { id: "organization", title: "cache organization" },
        { id: "cache-sim", title: "simulating a cache" },
        { id: "hit-rate", title: "counting hits and misses" }
      ]
    },

    /* ---------- synchronous circuits ---------- */
    {
      slug: "numbers",
      category: 1,
      title: "everything is a number",
      blurb: "unsigned and signed integers, sign extension, and shifts.",
      summary:
        "how integers are stored in binary. radix representations, unsigned integers, one's complement " +
        "and two's complement, negation, sign extension, and logical versus arithmetic shifts.",
      keyIdeas: [
        "an unsigned n-bit integer ranges from 0 to 2ⁿ − 1",
        "an n-bit two's complement integer ranges from −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1",
        "to negate in two's complement, flip every bit and add 1",
        "sign extension copies the sign bit to the left",
        "a logical right shift fills with 0s, and an arithmetic right shift fills with the sign bit"
      ],
      problems: [
        { id: "signed", title: "signed integers" },
        { id: "shifts", title: "sign extension and shifts" }
      ]
    },
    {
      slug: "boolean",
      category: 1,
      title: "gates and Boolean algebra",
      blurb: "logic gates, Boolean algebra, truth tables, and DNF.",
      summary:
        "logic gates (AND, OR, NOT, NAND, NOR, and XOR), the laws of Boolean algebra, simplifying " +
        "expressions, canonical forms, reading a disjunctive normal form off a truth table, and functional " +
        "completeness.",
      keyIdeas: [
        "De Morgan's laws say <span class=\"ov\">A + B</span> = <span class=\"ov\">A</span>·<span class=\"ov\">B</span> and <span class=\"ov\">A·B</span> = <span class=\"ov\">A</span> + <span class=\"ov\">B</span>",
        "A·(A + B) = A and A + A·B = A (absorption)",
        "the DNF of a truth table has one product term for every row where f = 1",
        "NAND alone is functionally complete, and so is NOR"
      ],
      problems: [
        { id: "boolean-simplify", title: "simplifying Boolean expressions" },
        { id: "truth-table", title: "truth tables and DNF" }
      ]
    },
    {
      slug: "combinational",
      category: 1,
      title: "combinational circuits",
      blurb: "adders, overflow, subtractors, MUX, and DEMUX.",
      summary:
        "circuits with no memory, built from gates. half and full adders, n-bit adders and overflow, the " +
        "n-bit subtractor, multiplexers and demultiplexers, the ALU, and programmable logic arrays.",
      keyIdeas: [
        "a full adder computes s = (a XOR b) XOR c<sub>in</sub> and c<sub>out</sub> = ab + (a XOR b)·c<sub>in</sub>",
        "two's complement overflow = c<sub>n</sub> XOR c<sub>n−1</sub>",
        "a subtractor XORs each bit of b with SUB and uses SUB as the carry-in",
        "a MUX's control signal is the index of the input it lets through, so MUX(a, b, s) = <span class=\"ov\">s</span>a + sb"
      ],
      problems: [
        { id: "binary-add", title: "addition and overflow" },
        { id: "mux", title: "MUX and DEMUX" }
      ]
    },
    {
      slug: "state",
      category: 1,
      title: "state circuits",
      blurb: "flip-flops, registers, clock timing, and FSMs.",
      summary:
        "circuits that remember. the clock, flip-flops (D, T, SR, and JK), registers (PIPO, SIPO, SISO, " +
        "and PISO), flip-flop timing (setup time, hold time, and clk-to-q delay), the minimum clock period, " +
        "pipelining for performance, and finite state machines built as circuits.",
      keyIdeas: [
        "Q<sub>next</sub> is J·<span class=\"ov\">Q</span> + <span class=\"ov\">K</span>·Q for a JK flip-flop, T XOR Q for a T flip-flop, and D for a D flip-flop",
        "minimum clock period = combinational delay + setup time + clk-to-q",
        "a register between two blocks lets the clock follow the slower block instead of their sum",
        "an FSM's next state and output are Boolean functions of its present state and input"
      ],
      problems: [
        { id: "flip-flops", title: "flip-flop next state" },
        { id: "registers", title: "shift registers" },
        { id: "clock-period", title: "clock period" },
        { id: "fsm-table", title: "finite state machines" }
      ]
    },

    /* ---------- CPU control & datapath ---------- */
    {
      slug: "mips",
      category: 2,
      title: "MIPS",
      blurb: "instruction formats, addressing, procedures, and C to MIPS.",
      summary:
        "the MIPS instruction set, its registers and their conventions, the R-, I-, and J-type formats, " +
        "endianness, branch (PC-relative) and jump (pseudo-direct) addressing, translating C into MIPS, " +
        "and procedures with jal, jr, and the stack.",
      keyIdeas: [
        "R-type fields are op (6), rs (5), rt (5), rd (5), shamt (5), and funct (6)",
        "I-type fields are op, rs, rt, and a 16-bit immediate, and J-type fields are op and a 26-bit address",
        "branch target = PC + 4 + (immediate × 4)",
        "arguments go in $a0–$a3, results in $v0–$v1, and the return address in $ra",
        "jal puts the address of the next instruction in $ra, and jr $ra returns"
      ],
      problems: [
        { id: "encode", title: "encoding instructions" },
        { id: "decode", title: "decoding instructions" },
        { id: "branch-target", title: "branch and jump targets" },
        { id: "c-to-mips", title: "translating C to MIPS" },
        { id: "trace", title: "tracing MIPS code" },
        { id: "procedures", title: "procedures and the stack" },
        { id: "endianness", title: "endianness" }
      ]
    },
    {
      slug: "datapath",
      category: 2,
      title: "single-cycle datapath",
      blurb: "the five stages, the critical path, and multi-cycle datapaths.",
      summary:
        "how MIPS runs an instruction in five stages (instruction fetch, decode, execute, memory, and " +
        "write back), and why not every instruction needs every stage. in the single-cycle datapath the " +
        "critical path sets the clock cycle, and in the multi-cycle datapath the slowest stage does.",
      keyIdeas: [
        "in a single-cycle datapath, the clock cycle has to fit the slowest instruction",
        "in a multi-cycle datapath, each stage takes one clock cycle, so the clock cycle has to fit the slowest stage",
        "R-type instructions write to rd, and I-type instructions write to rt",
        "only lw reads data memory, and only sw writes it"
      ],
      problems: [
        { id: "datapath-trace", title: "tracing the datapath" },
        { id: "clock-cycle", title: "single- vs multi-cycle clock" }
      ]
    },
    {
      slug: "control",
      category: 2,
      title: "CPU control",
      blurb: "control signals and their semantic values.",
      summary:
        "the control signals that steer the single-cycle datapath (nPC_sel, RegDst, RegWr, ExtOp, ALUSrc, " +
        "MemWr, MemToReg, and ALUCtr), and their values for add, sub, ori, lw, sw, and beq. the controller " +
        "works them out from the opcode and funct fields, like a PLA.",
      keyIdeas: [
        "nPC_sel is '+4' or 'branch', RegDst is 'rd' or 'rt', and ExtOp is 'zero' or 'signed'",
        "ALUSrc is 'rt' (busB) or 'imm', and MemToReg is 'ALU' or 'Mem'",
        "RegWr and MemWr are 'write' or 'no-write'",
        "x means the value does not matter"
      ],
      problems: [
        { id: "control-signals", title: "control signals" }
      ]
    },

    /* ---------- instruction-level parallelism ---------- */
    {
      slug: "pipelining",
      category: 3,
      title: "pipelining",
      blurb: "overlapping instructions, fill time, and speedup.",
      summary:
        "overlapping instructions the way you'd overlap loads of laundry. each instruction takes just as " +
        "long as before (latency), but more of them finish per unit of time (throughput). compares " +
        "single-cycle, multi-cycle, and pipelined datapaths, and works out pipelined time and speedup.",
      keyIdeas: [
        "ideal speedup = number of stages",
        "actual speedup = single-cycle time ÷ pipelined time",
        "pipelined time = fill time + IC × clock cycle, where fill time = (stages − 1) × clock cycle",
        "the slowest stage sets the pipelined clock cycle"
      ],
      problems: [
        { id: "pipeline-time", title: "pipelined time and speedup" }
      ]
    },
    {
      slug: "hazards",
      category: 3,
      title: "pipeline hazards",
      blurb: "structural, data, and control hazards, forwarding, and stalls.",
      summary:
        "what keeps a pipeline from reaching its ideal speedup. structural hazards happen when two " +
        "instructions need the same hardware. data hazards (RAW dependencies) are handled by forwarding or " +
        "stalling. control hazards come from branches, and are handled by waiting, a branch comparator, " +
        "delayed branching, or prediction.",
      keyIdeas: [
        "RAW is the only true dependency on this pipeline, and WAR and WAW only matter out of order",
        "on the basic datapath, a dependent instruction right after its producer needs 2 nops",
        "ALU-ALU and MEM-ALU forwarding remove those stalls, except the 1-nop load-use stall",
        "MEM-MEM forwarding feeds a loaded or computed value straight into a sw"
      ],
      problems: [
        { id: "dependencies", title: "data dependencies" },
        { id: "stalls", title: "stalls and forwarding" }
      ]
    },
    {
      slug: "ilp",
      category: 3,
      title: "beyond pipelining",
      blurb: "VLIW, loop unrolling, and register renaming.",
      summary:
        "multiple-issue processors, scheduled either by the compiler (VLIW and static superscalar) or by " +
        "the hardware, out of order (dynamic superscalar). also loop unrolling, which exposes more " +
        "parallelism, and register renaming, which removes WAR and WAW dependencies.",
      keyIdeas: [
        "in the 2-issue VLIW from lecture, the first slot takes an arithmetic instruction or a branch, and the second takes a lw or sw",
        "a load needs one instruction between it and its use, and empty slots get a nop (nops do not count toward CPI)",
        "loop unrolling repeats the body several times and adjusts the offsets",
        "register renaming gives every destination a new name (V4, V5, …)"
      ],
      problems: [
        { id: "renaming", title: "register renaming" },
        { id: "unrolling", title: "loop unrolling" },
        { id: "vliw", title: "VLIW scheduling" }
      ]
    },

    /* ---------- parallel architectures ---------- */
    {
      slug: "multicore",
      category: 4,
      title: "parallel architectures",
      blurb: "MESI, true and false sharing, and data races.",
      summary:
        "Flynn's taxonomy, multiprocessors and multi-core processors, and simultaneous multithreading. " +
        "when each core has its own cache, the copies of a block have to stay coherent, which brings in " +
        "snooping, invalidate versus update, and the MESI protocol. also true and false sharing, " +
        "multithreading, data races, and locks.",
      keyIdeas: [
        "MESI stands for Modified, Exclusive, Shared, and Invalid",
        "a read miss gives E if no other cache has the block, and S otherwise",
        "false sharing is when cores write different words that happen to share a cache block",
        "a data race needs synchronization, such as a lock around the critical section"
      ],
      problems: [
        { id: "mesi", title: "MESI state tables" },
        { id: "sharing", title: "true vs false sharing" },
        { id: "races", title: "data races" }
      ]
    },
    {
      slug: "gpu",
      category: 4,
      title: "GPU architecture",
      blurb: "SIMT, warps, divergence, coalescing, and tensor cores.",
      summary:
        "GPUs as accelerators. SIMT execution on streaming multiprocessors, warps of 32 threads and how " +
        "they are scheduled, divergence with warp masks, the GPU memory hierarchy, coalesced memory " +
        "transactions, and tensor cores.",
      keyIdeas: [
        "a warp is 32 threads that execute together on an SM",
        "when threads in a warp take different branches, a mask idles some threads while each path runs",
        "an instruction that can't run for all 32 threads at once is replayed, taking 32 ÷ units cycles",
        "transactions between device memory and L2 are 48 bytes (pre-Pascal) or 512 bytes (post-Pascal)"
      ],
      problems: [
        { id: "divergence", title: "warp divergence" },
        { id: "coalescing", title: "coalesced transactions" },
        { id: "warps", title: "replay and tensor cores" }
      ]
    }
  ],

  find: function (slug) {
    for (var i = 0; i < this.topics.length; i++) {
      if (this.topics[i].slug === slug) return { topic: this.topics[i], index: i };
    }
    return null;
  }
};
