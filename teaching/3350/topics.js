/* CS 3350A topic data, shared by the course page, the topic pages and the practice page.
   Organized like the Brightspace modules for fall 2026: five categories, each split into one
   subtopic per lecture. Each problem type needs a matching generator in generators.js ("slug/id").
   Everything here comes from the 2026 lecture slides. */
window.CS3350 = {
  categories: [
    { title: "CPU and memory", lectures: "L2–L4" },
    { title: "synchronous circuits", lectures: "L5–L8" },
    { title: "CPU control & datapath", lectures: "L9–L11" },
    { title: "instruction-level parallelism", lectures: "L12–L14" },
    { title: "parallel architectures", lectures: "L15–L16" }
  ],

  topics: [
    /* ---------- CPU and memory ---------- */
    {
      slug: "cpu",
      category: 0,
      title: "the CPU",
      lectures: "L2",
      blurb: "CPU time, CPI, power and benchmarks.",
      summary:
        "how to measure and compare CPU performance. a program's CPU time depends on how many instructions " +
        "it executes, the average number of clock cycles per instruction (CPI), and the length of a clock " +
        "cycle. this lecture also covers latency and throughput, the power wall, SPEC benchmarks and profiling.",
      keyIdeas: [
        "CPU time = instruction count × CPI × clock cycle = instruction count × CPI ÷ clock rate",
        "clock rate = 1 ÷ clock cycle",
        "overall effective CPI = Σ (CPI<sub>i</sub> × IC<sub>i</sub>) ÷ IC",
        "if X is n times faster than Y, then n = execution time<sub>Y</sub> ÷ execution time<sub>X</sub>",
        "power = capacitive load × voltage² × frequency switched"
      ],
      problems: [
        { id: "effective-cpi", title: "effective CPI" },
        { id: "cpu-time", title: "CPU time" },
        { id: "compare", title: "comparing performance" },
        { id: "factors", title: "what affects CPU time" },
        { id: "power", title: "power and benchmarks" }
      ]
    },
    {
      slug: "hierarchy",
      category: 0,
      title: "the memory hierarchy",
      lectures: "L3",
      blurb: "locality, cache misses, CPI with stalls and AMAT.",
      summary:
        "why memory is a hierarchy of small, fast caches in front of larger, slower memory, and why that " +
        "works: locality. this lecture covers temporal and spatial locality, row-major arrays, cache hits " +
        "and misses (cold, conflict and capacity), CPU time with memory stalls, and average memory access " +
        "time with one or more cache levels.",
      keyIdeas: [
        "C arrays are row-major: a[i][j] is a[i × ncols + j]",
        "CPI<sub>stall</sub> = CPI<sub>ideal</sub> + average memory stall cycles",
        "average memory stall cycles = access rate × miss rate × miss penalty",
        "AMAT = hit time + miss rate × miss penalty",
        "L1 miss penalty = L2 hit time + L2 miss rate × L2 miss penalty"
      ],
      problems: [
        { id: "stall-cpi", title: "CPI with memory stalls" },
        { id: "amat", title: "average memory access time" },
        { id: "locality", title: "locality" },
        { id: "miss-types", title: "cold, conflict and capacity misses" }
      ]
    },
    {
      slug: "caches",
      category: 0,
      title: "cache implementations",
      lectures: "L4",
      blurb: "direct-mapped and set associative caches, LRU and FIFO.",
      summary:
        "how a cache is organized and how addresses map onto it. this lecture covers direct-mapped, set " +
        "associative and fully associative caches, splitting an address into tag, set index and block " +
        "offset, word and byte addresses, replacement (LRU and FIFO), write hits and misses " +
        "(write-through, write-back, write allocate), and multilevel caches.",
      keyIdeas: [
        "C = B × N × R (bytes per line × lines per set × number of sets)",
        "b = log₂(B), s = log₂(R), t = m − s − b",
        "set number = (block address) mod R",
        "each doubling of associativity halves the number of sets: one less index bit, one more tag bit"
      ],
      problems: [
        { id: "address-bits", title: "tag, index and offset" },
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
      lectures: "L5",
      blurb: "unsigned, one's and two's complement, sign extension, shifts.",
      summary:
        "how integers are stored in binary. this lecture covers radix representations, unsigned integers, " +
        "one's complement and two's complement, signed negation, sign extension, and logical versus " +
        "arithmetic shifts.",
      keyIdeas: [
        "unsigned n-bit range: 0 to 2ⁿ − 1; two's complement range: −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1",
        "two's complement negation: bit-wise complement, then add 1",
        "sign extension copies the sign bit to the left",
        "a logical right shift fills with 0s; an arithmetic right shift fills with the sign bit"
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
      lectures: "L6",
      blurb: "logic gates, Boolean algebra, truth tables and DNF.",
      summary:
        "logic gates (AND, OR, NOT, NAND, NOR, XOR), the laws of Boolean algebra, simplifying expressions, " +
        "canonical forms, getting a disjunctive normal form from a truth table, and functional completeness.",
      keyIdeas: [
        "De Morgan's laws: <span class=\"ov\">A + B</span> = <span class=\"ov\">A</span>·<span class=\"ov\">B</span> and <span class=\"ov\">A·B</span> = <span class=\"ov\">A</span> + <span class=\"ov\">B</span>",
        "absorption: A·(A + B) = A and A + A·B = A",
        "DNF from a truth table: one product term for every row where f = 1",
        "NAND alone is functionally complete; so is NOR"
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
      lectures: "L7",
      blurb: "adders, overflow, subtractors, MUX and DEMUX.",
      summary:
        "stateless circuits built from gates: half and full adders, n-bit adders and overflow, the n-bit " +
        "subtractor, multiplexers and demultiplexers, the ALU and programmable logic arrays.",
      keyIdeas: [
        "full adder: s = (a XOR b) XOR c<sub>in</sub>, c<sub>out</sub> = ab + (a XOR b)·c<sub>in</sub>",
        "two's complement overflow = c<sub>n</sub> XOR c<sub>n−1</sub>",
        "subtractor: XOR each bit of b with SUB, and use SUB as the carry-in",
        "a MUX's control signal is the index of the chosen input: MUX(a, b, s) = <span class=\"ov\">s</span>a + sb"
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
      lectures: "L8",
      blurb: "flip-flops, registers, clock timing and FSMs.",
      summary:
        "circuits that remember. this lecture covers the clock, flip-flops (D, T, SR and JK), registers " +
        "(PIPO, SIPO, SISO and PISO), flip-flop timing (setup time, hold time and clk-to-q delay), the " +
        "minimum clock period, pipelining for performance, and finite state machines as circuits.",
      keyIdeas: [
        "JK: Q<sub>next</sub> = J·<span class=\"ov\">Q</span> + <span class=\"ov\">K</span>·Q; T: Q<sub>next</sub> = T XOR Q; D: Q<sub>next</sub> = D",
        "min. clock period = combinational delay + setup time + clk-to-q",
        "a register between two blocks lets the clock follow the slower block instead of their sum",
        "an FSM's next state and output are Boolean functions of the present state and input"
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
      lectures: "L9",
      blurb: "formats, addressing, procedures, C to MIPS.",
      summary:
        "the MIPS instruction set: registers and their conventions, the R-, I- and J-type formats, " +
        "endianness, branch (PC-relative) and jump (pseudo-direct) addressing, translating C into MIPS, " +
        "and procedures with jal, jr and the stack.",
      keyIdeas: [
        "R-type: op (6) rs (5) rt (5) rd (5) shamt (5) funct (6); I-type: op rs rt immediate (16); J-type: op address (26)",
        "branch target = PC + 4 + (immediate × 4)",
        "arguments in $a0–$a3, results in $v0–$v1, return address in $ra; $s registers are saved by the callee",
        "jal puts the address of the next instruction in $ra; jr $ra returns"
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
      lectures: "L10",
      blurb: "the five stages, critical path, multi-cycle.",
      summary:
        "how MIPS executes an instruction in five stages: instruction fetch, decode, execute, memory and " +
        "write back. not every instruction uses every stage. this lecture covers the single-cycle datapath, " +
        "where the critical path sets the clock cycle, and the multi-cycle datapath, where the slowest stage does.",
      keyIdeas: [
        "single cycle: the clock cycle covers the whole datapath (the slowest instruction)",
        "multi-cycle: one stage per clock cycle; the clock cycle covers the slowest stage",
        "R-type instructions write to rd; I-type instructions write to rt",
        "only lw reads data memory and only sw writes it"
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
      lectures: "L11",
      blurb: "control signals and their semantic values.",
      summary:
        "the control signals that steer the single-cycle datapath, and their values for add, sub, ori, lw, " +
        "sw and beq: nPC_sel, RegDst, RegWr, ExtOp, ALUSrc, MemWr, MemToReg and ALUCtr. the controller " +
        "computes them from the opcode and funct fields, like a PLA.",
      keyIdeas: [
        "nPC_sel: '+4' or 'branch'; RegDst: 'rd' or 'rt'; ExtOp: 'zero' or 'signed'",
        "ALUSrc: 'rt' (busB) or imm; MemToReg: 'ALU' or 'Mem'",
        "RegWr and MemWr: 'write' or 'no-write'",
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
      lectures: "L12",
      blurb: "overlapping instructions, fill and drain time, speedup.",
      summary:
        "overlapping the execution of instructions, like doing laundry: each instruction still takes as " +
        "long (latency), but more finish per unit of time (throughput). this lecture compares single-cycle, " +
        "multi-cycle and pipelined datapaths and computes pipelined time and speedup.",
      keyIdeas: [
        "ideal speedup = number of stages",
        "actual speedup = time to complete single-cycle ÷ time to complete pipelined",
        "time<sub>pipelined</sub> = fill time + IC × clock cycle, with fill time = (stages − 1) × clock cycle",
        "the pipelined clock cycle is set by the slowest stage"
      ],
      problems: [
        { id: "pipeline-time", title: "pipelined time and speedup" }
      ]
    },
    {
      slug: "hazards",
      category: 3,
      title: "pipeline hazards",
      lectures: "L13",
      blurb: "structural, data and control hazards; forwarding and stalls.",
      summary:
        "what stops a pipeline from reaching its ideal speedup: structural hazards (two instructions need " +
        "the same hardware), data hazards (RAW dependencies, handled by forwarding or stalls) and control " +
        "hazards (branches, handled by waiting, a branch comparator, delayed branching or prediction).",
      keyIdeas: [
        "RAW is the only true dependency on this pipeline; WAR and WAW matter only out of order",
        "basic datapath: a dependent instruction right after its producer needs 2 nops",
        "ALU-ALU and MEM-ALU forwarding remove those stalls, except the load-use stall (1 nop)",
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
      lectures: "L14",
      blurb: "VLIW, loop unrolling, register renaming.",
      summary:
        "multiple issue processors: VLIW and static superscalar (scheduled by the compiler) and dynamic " +
        "superscalar (scheduled by hardware, out of order). this lecture also covers loop unrolling, which " +
        "exposes more parallelism, and register renaming, which removes WAR and WAW dependencies.",
      keyIdeas: [
        "2-issue VLIW from lecture: first slot arithmetic or branch, second slot lw or sw",
        "one instruction between a load and its use; nop if nothing fits; nops do not count toward CPI",
        "loop unrolling replaces the body with several copies and adjusts the offsets",
        "register renaming gives every destination a new value name (V4, V5, …)"
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
      lectures: "L15",
      blurb: "MESI, true and false sharing, data races.",
      summary:
        "Flynn's taxonomy, multiprocessors and multi-core processors, and simultaneous multithreading. " +
        "when each core has its own cache, copies of a block must stay coherent: snooping, invalidate versus " +
        "update, and the MESI protocol. this lecture also covers true and false sharing, multithreading, " +
        "data races and locks.",
      keyIdeas: [
        "MESI states: Modified, Exclusive, Shared, Invalid",
        "a read miss gives E if no other cache has the block, otherwise S",
        "false sharing: cores write different words that happen to share a cache block",
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
      lectures: "L16",
      blurb: "SIMT, warps, divergence, coalescing, tensor cores.",
      summary:
        "GPUs as accelerators: SIMT execution on streaming multiprocessors, warps of 32 threads and warp " +
        "scheduling, divergence with warp masks, the GPU memory hierarchy, coalesced memory transactions, " +
        "and tensor cores.",
      keyIdeas: [
        "a warp is 32 threads that execute together on an SM",
        "when threads in a warp take different branches, a mask idles some threads while each path runs",
        "an instruction that cannot run for all 32 threads at once is replayed: 32 ÷ units cycles",
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
