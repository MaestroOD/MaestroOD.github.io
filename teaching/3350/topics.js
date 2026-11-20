/* CS 3350A topic data, shared by the course page, the topic pages and the practice page.
   Each problem type here needs a matching generator in generators.js ("slug/id"). */
window.CS3350 = {
  topics: [
    {
      slug: "performance",
      title: "performance",
      lectures: "L1–L2",
      blurb: "CPU time, CPI, benchmarks and Amdahl's law.",
      summary:
        "how to measure and compare processor performance. the time a program takes depends on how many " +
        "instructions it executes, how many clock cycles each instruction needs on average (CPI), and the " +
        "length of a clock cycle. this section also covers latency versus throughput, power trends, " +
        "benchmarks and profiling, and Amdahl's law, which limits the speedup you get from improving only " +
        "part of a program.",
      keyIdeas: [
        "CPU time = instruction count × CPI × clock period = instruction count × CPI ÷ clock rate",
        "effective CPI = Σ (frequency of class i × CPI of class i)",
        "speedup = old execution time ÷ new execution time",
        "Amdahl's law: speedup = 1 ÷ ((1 − f) + f ÷ s), where a fraction f of the time is sped up by a factor s"
      ],
      problems: [
        { id: "effective-cpi", title: "effective CPI" },
        { id: "cpu-time", title: "CPU time" },
        { id: "amdahl", title: "Amdahl's law" },
        { id: "compare", title: "comparing processors" }
      ]
    },
    {
      slug: "memory",
      title: "memory hierarchy and locality",
      lectures: "L3",
      blurb: "locality, hits and misses, AMAT and memory stalls.",
      summary:
        "why memory is organized as a hierarchy of small, fast caches in front of larger, slower memory, and " +
        "why that works: programs tend to reuse recently accessed data (temporal locality) and access data " +
        "near recently accessed data (spatial locality). this section covers cache hits and misses, the " +
        "three kinds of misses (cold, conflict and capacity), and how miss rates and miss penalties affect " +
        "average memory access time and CPI.",
      keyIdeas: [
        "AMAT = hit time + miss rate × miss penalty",
        "two levels: AMAT = L1 hit time + L1 miss rate × (L2 hit time + L2 miss rate × L2 miss penalty)",
        "CPI with memory stalls = base CPI + memory accesses per instruction × miss rate × miss penalty",
        "C arrays are stored row by row, so stride-1 loops over a row have good spatial locality"
      ],
      problems: [
        { id: "amat", title: "average memory access time" },
        { id: "stall-cpi", title: "CPI with cache misses" },
        { id: "locality", title: "identifying locality" },
        { id: "miss-types", title: "classifying misses" }
      ]
    },
    {
      slug: "caches",
      title: "cache organization",
      lectures: "L4",
      blurb: "direct-mapped and set-associative caches, LRU, filling a cache.",
      summary:
        "how caches are built and how memory addresses map onto them. this section covers direct-mapped, " +
        "set-associative and fully associative caches, splitting an address into tag, set index and block " +
        "offset, replacement policies such as least recently used (LRU), write policies, and filling a cache " +
        "by hand from a sequence of addresses.",
      keyIdeas: [
        "number of blocks = capacity ÷ block size; number of sets = blocks ÷ associativity",
        "offset bits = log₂(block size); index bits = log₂(number of sets); the rest of the address is the tag",
        "set for an address = (address ÷ block size, rounded down) mod number of sets",
        "higher associativity reduces conflict misses but costs more hardware"
      ],
      problems: [
        { id: "address-bits", title: "tag, index and offset" },
        { id: "cache-sim", title: "simulating a cache (LRU)" },
        { id: "hit-rate", title: "counting hits and misses" }
      ]
    },
    {
      slug: "logic",
      title: "numbers and combinational logic",
      lectures: "L5–L7",
      blurb: "two's complement, Boolean algebra, adders, MUXes and the ALU.",
      summary:
        "how integers are represented in binary, including two's complement, sign extension and logical " +
        "versus arithmetic shifts. then Boolean algebra, truth tables and sum-of-products form, and the " +
        "combinational circuits a CPU is built from: adders and subtractors, overflow detection, " +
        "multiplexers and the ALU.",
      keyIdeas: [
        "n-bit two's complement range: −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1",
        "negate in two's complement: invert every bit, then add 1",
        "signed overflow: adding two numbers with the same sign gives a result with the other sign",
        "De Morgan's laws: (xy)' = x' + y' and (x + y)' = x'y'"
      ],
      problems: [
        { id: "twos-complement", title: "two's complement" },
        { id: "binary-add", title: "binary addition and overflow" },
        { id: "boolean-simplify", title: "simplifying Boolean expressions" },
        { id: "truth-table", title: "truth tables and sum of products" }
      ]
    },
    {
      slug: "sequential",
      title: "sequential circuits and FSMs",
      lectures: "L8",
      blurb: "clocks, flip-flops, timing and finite state machines.",
      summary:
        "circuits that remember. this section covers the clock, flip-flops (D, T, SR and JK) and registers; " +
        "flip-flop timing (setup time, hold time and clk-to-q delay) and how it limits the clock frequency " +
        "of a synchronous circuit; and implementing a finite state machine as a state register plus " +
        "combinational logic.",
      keyIdeas: [
        "JK flip-flop: Q_next = J·Q' + K'·Q",
        "T flip-flop: Q_next = T xor Q; D flip-flop: Q_next = D",
        "minimum clock period = clk-to-q delay + longest combinational delay + setup time",
        "an FSM's logic maps (present state, input) to (next state, output)"
      ],
      problems: [
        { id: "flip-flops", title: "flip-flop next state" },
        { id: "clock-period", title: "maximum clock frequency" },
        { id: "fsm-table", title: "FSM truth tables" }
      ]
    },
    {
      slug: "mips",
      title: "MIPS assembly",
      lectures: "L9",
      blurb: "instruction formats, addressing, procedures, C to MIPS.",
      summary:
        "the MIPS instruction set architecture: registers and their conventions, the R-, I- and J-type " +
        "instruction formats, loads, stores and endianness, branches and jumps and how their targets are " +
        "computed, the stack, and procedure calls. this section also practises translating C code into MIPS.",
      keyIdeas: [
        "R-type fields: op (6) rs (5) rt (5) rd (5) shamt (5) funct (6)",
        "I-type fields: op (6) rs (5) rt (5) immediate (16); J-type: op (6) address (26)",
        "branch target = PC + 4 + (immediate × 4)",
        "arguments go in $a0–$a3, results in $v0–$v1, and the return address in $ra"
      ],
      problems: [
        { id: "encode", title: "encoding instructions" },
        { id: "decode", title: "decoding instructions" },
        { id: "branch-target", title: "branch and jump targets" },
        { id: "c-to-mips", title: "translating C to MIPS" },
        { id: "trace", title: "tracing MIPS code" },
        { id: "endianness", title: "byte order (endianness)" }
      ]
    },
    {
      slug: "datapath",
      title: "single-cycle datapath and control",
      lectures: "L10–L11",
      blurb: "the five stages, tracing instructions, control signals.",
      summary:
        "how a MIPS processor executes one instruction per clock cycle in five stages: instruction fetch, " +
        "decode, execute, memory access and write back. this section covers tracing which parts of the " +
        "datapath an instruction uses, and the eight control signals that steer it: nPC_sel, RegDst, ExtOp, " +
        "aLUSrc, ALUctr, MemWr, MemtoReg and RegWr.",
      keyIdeas: [
        "single-cycle clock period = time of the slowest instruction (the sum of the stages it uses)",
        "multi-cycle clock period = time of the slowest stage",
        "R-type instructions write to rd; I-type instructions write to rt",
        "only loads read data memory and only stores write it"
      ],
      problems: [
        { id: "control-signals", title: "control signals" },
        { id: "datapath-trace", title: "tracing the datapath" },
        { id: "clock-cycle", title: "single- vs multi-cycle clock" }
      ]
    },
    {
      slug: "pipelining",
      title: "pipelining and hazards",
      lectures: "L12–L13",
      blurb: "pipelined speedup, data and control hazards, forwarding.",
      summary:
        "overlapping the execution of instructions in a five-stage pipeline, how much faster that makes a " +
        "program, and the hazards that get in the way: structural hazards (two instructions need the same " +
        "hardware), data hazards (an instruction needs a result that isn't ready yet, handled by stalling " +
        "or forwarding) and control hazards (branches, handled by stalling, resolving branches earlier, " +
        "delayed branching or branch prediction).",
      keyIdeas: [
        "n instructions on a k-stage pipeline take k + n − 1 cycles (with no stalls)",
        "with balanced stages and many instructions, speedup approaches k",
        "dependencies: RAW (true), WAR and WAW (false, or name, dependencies)",
        "even with forwarding, a load followed immediately by an instruction using its result needs a stall"
      ],
      problems: [
        { id: "pipeline-time", title: "pipelined time and speedup" },
        { id: "dependencies", title: "data dependencies" },
        { id: "stalls", title: "stalls and forwarding" }
      ]
    },
    {
      slug: "ilp",
      title: "instruction-level parallelism",
      lectures: "L14",
      blurb: "superscalar and VLIW, loop unrolling, register renaming.",
      summary:
        "going beyond a single pipeline. this section covers multiple-issue processors (static superscalar, " +
        "VLIW and dynamic superscalar), loop unrolling to expose more independent instructions, and register " +
        "renaming to remove false (WAR and WAW) dependencies.",
      keyIdeas: [
        "only RAW dependencies are true dependencies; WAR and WAW can be removed by renaming",
        "register renaming gives every new result a fresh name (V0, V1, …)",
        "loop unrolling reduces loop overhead and gives the scheduler more independent work",
        "static multiple issue (VLIW) relies on the compiler; dynamic superscalar schedules in hardware"
      ],
      problems: [
        { id: "renaming", title: "register renaming" },
        { id: "unrolling", title: "loop unrolling" },
        { id: "vliw", title: "VLIW scheduling" }
      ]
    },
    {
      slug: "multicore",
      title: "multicore and cache coherence",
      lectures: "L15",
      blurb: "Flynn's taxonomy, MESI, true and false sharing, data races.",
      summary:
        "parallel architectures: Flynn's taxonomy, multiprocessors versus multi-core processors, and " +
        "simultaneous multithreading. when each core has a private cache, copies of the same block must " +
        "be kept consistent; this section covers snooping, invalidate versus update policies and the MESI " +
        "protocol, as well as true and false sharing, multithreading and data races.",
      keyIdeas: [
        "MESI states: Modified, Exclusive, Shared, Invalid",
        "a write to a block invalidates the copies in other caches",
        "false sharing: cores use different words that happen to share a cache block",
        "a data race: two threads access the same location without synchronization and at least one writes"
      ],
      problems: [
        { id: "mesi", title: "MESI state tables" },
        { id: "sharing", title: "true vs false sharing" },
        { id: "races", title: "data races" }
      ]
    },
    {
      slug: "gpu",
      title: "GPU architecture",
      lectures: "L16",
      blurb: "SIMT, warps, divergence, coalescing and tensor cores.",
      summary:
        "GPUs as throughput-oriented accelerators. this section covers SIMT execution, streaming " +
        "multiprocessors, warps and warp scheduling, branch divergence, the GPU memory hierarchy " +
        "(including shared memory and coalesced memory accesses), and tensor cores.",
      keyIdeas: [
        "threads run in warps that execute the same instruction together (SIMT)",
        "when threads in a warp take different branches, the paths run one after the other",
        "accesses are coalesced when the threads in a warp touch consecutive addresses",
        "shared memory is a small, fast, programmer-managed memory on each streaming multiprocessor"
      ],
      problems: [
        { id: "divergence", title: "warp divergence" },
        { id: "coalescing", title: "memory coalescing" }
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
