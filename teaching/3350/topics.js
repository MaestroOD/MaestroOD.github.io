/* CS 3350A topic data, shared by the course page, the topic pages and the practice page.
   Each problem type here needs a matching generator in generators.js ("slug/id"). */
window.CS3350 = {
  topics: [
    {
      slug: "performance",
      title: "Performance",
      lectures: "L1–L2",
      blurb: "CPU time, CPI, benchmarks and Amdahl's law.",
      summary:
        "How to measure and compare processor performance. The time a program takes depends on how many " +
        "instructions it executes, how many clock cycles each instruction needs on average (CPI), and the " +
        "length of a clock cycle. This section also covers latency versus throughput, power trends, " +
        "benchmarks and profiling, and Amdahl's law, which limits the speedup you get from improving only " +
        "part of a program.",
      keyIdeas: [
        "CPU time = instruction count × CPI × clock period = instruction count × CPI ÷ clock rate",
        "Effective CPI = Σ (frequency of class i × CPI of class i)",
        "Speedup = old execution time ÷ new execution time",
        "Amdahl's law: speedup = 1 ÷ ((1 − f) + f ÷ s), where a fraction f of the time is sped up by a factor s"
      ],
      problems: [
        { id: "effective-cpi", title: "Effective CPI" },
        { id: "cpu-time", title: "CPU time" },
        { id: "amdahl", title: "Amdahl's law" },
        { id: "compare", title: "Comparing processors" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "memory",
      title: "Memory hierarchy and locality",
      lectures: "L3",
      blurb: "Locality, hits and misses, AMAT and memory stalls.",
      summary:
        "Why memory is organized as a hierarchy of small, fast caches in front of larger, slower memory, and " +
        "why that works: programs tend to reuse recently accessed data (temporal locality) and access data " +
        "near recently accessed data (spatial locality). This section covers cache hits and misses, the " +
        "three kinds of misses (cold, conflict and capacity), and how miss rates and miss penalties affect " +
        "average memory access time and CPI.",
      keyIdeas: [
        "AMAT = hit time + miss rate × miss penalty",
        "Two levels: AMAT = L1 hit time + L1 miss rate × (L2 hit time + L2 miss rate × L2 miss penalty)",
        "CPI with memory stalls = base CPI + memory accesses per instruction × miss rate × miss penalty",
        "C arrays are stored row by row, so stride-1 loops over a row have good spatial locality"
      ],
      problems: [
        { id: "amat", title: "Average memory access time" },
        { id: "stall-cpi", title: "CPI with cache misses" },
        { id: "locality", title: "Identifying locality" },
        { id: "miss-types", title: "Classifying misses" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "caches",
      title: "Cache organization",
      lectures: "L4",
      blurb: "Direct-mapped and set-associative caches, LRU, filling a cache.",
      summary:
        "How caches are built and how memory addresses map onto them. This section covers direct-mapped, " +
        "set-associative and fully associative caches, splitting an address into tag, set index and block " +
        "offset, replacement policies such as least recently used (LRU), write policies, and filling a cache " +
        "by hand from a sequence of addresses.",
      keyIdeas: [
        "Number of blocks = capacity ÷ block size; number of sets = blocks ÷ associativity",
        "Offset bits = log₂(block size); index bits = log₂(number of sets); the rest of the address is the tag",
        "Set for an address = (address ÷ block size, rounded down) mod number of sets",
        "Higher associativity reduces conflict misses but costs more hardware"
      ],
      problems: [
        { id: "address-bits", title: "Tag, index and offset" },
        { id: "cache-sim", title: "Simulating a cache (LRU)" },
        { id: "hit-rate", title: "Counting hits and misses" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "logic",
      title: "Numbers and combinational logic",
      lectures: "L5–L7",
      blurb: "Two's complement, Boolean algebra, adders, MUXes and the ALU.",
      summary:
        "How integers are represented in binary, including two's complement, sign extension and logical " +
        "versus arithmetic shifts. Then Boolean algebra, truth tables and sum-of-products form, and the " +
        "combinational circuits a CPU is built from: adders and subtractors, overflow detection, " +
        "multiplexers and the ALU.",
      keyIdeas: [
        "n-bit two's complement range: −2ⁿ⁻¹ to 2ⁿ⁻¹ − 1",
        "Negate in two's complement: invert every bit, then add 1",
        "Signed overflow: adding two numbers with the same sign gives a result with the other sign",
        "De Morgan's laws: (xy)' = x' + y' and (x + y)' = x'y'"
      ],
      problems: [
        { id: "twos-complement", title: "Two's complement" },
        { id: "binary-add", title: "Binary addition and overflow" },
        { id: "boolean-simplify", title: "Simplifying Boolean expressions" },
        { id: "truth-table", title: "Truth tables and sum of products" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "sequential",
      title: "Sequential circuits and FSMs",
      lectures: "L8",
      blurb: "Clocks, flip-flops, timing and finite state machines.",
      summary:
        "Circuits that remember. This section covers the clock, flip-flops (D, T, SR and JK) and registers; " +
        "flip-flop timing (setup time, hold time and clk-to-q delay) and how it limits the clock frequency " +
        "of a synchronous circuit; and implementing a finite state machine as a state register plus " +
        "combinational logic.",
      keyIdeas: [
        "JK flip-flop: Q_next = J·Q' + K'·Q",
        "T flip-flop: Q_next = T xor Q; D flip-flop: Q_next = D",
        "Minimum clock period = clk-to-q delay + longest combinational delay + setup time",
        "An FSM's logic maps (present state, input) to (next state, output)"
      ],
      problems: [
        { id: "flip-flops", title: "Flip-flop next state" },
        { id: "clock-period", title: "Maximum clock frequency" },
        { id: "fsm-table", title: "FSM truth tables" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "mips",
      title: "MIPS assembly",
      lectures: "L9",
      blurb: "Instruction formats, addressing, procedures, C to MIPS.",
      summary:
        "The MIPS instruction set architecture: registers and their conventions, the R-, I- and J-type " +
        "instruction formats, loads, stores and endianness, branches and jumps and how their targets are " +
        "computed, the stack, and procedure calls. This section also practises translating C code into MIPS.",
      keyIdeas: [
        "R-type fields: op (6) rs (5) rt (5) rd (5) shamt (5) funct (6)",
        "I-type fields: op (6) rs (5) rt (5) immediate (16); J-type: op (6) address (26)",
        "Branch target = PC + 4 + (immediate × 4)",
        "Arguments go in $a0–$a3, results in $v0–$v1, and the return address in $ra"
      ],
      problems: [
        { id: "encode", title: "Encoding instructions" },
        { id: "decode", title: "Decoding instructions" },
        { id: "branch-target", title: "Branch and jump targets" },
        { id: "c-to-mips", title: "Translating C to MIPS" },
        { id: "trace", title: "Tracing MIPS code" },
        { id: "endianness", title: "Byte order (endianness)" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "datapath",
      title: "Single-cycle datapath and control",
      lectures: "L10–L11",
      blurb: "The five stages, tracing instructions, control signals.",
      summary:
        "How a MIPS processor executes one instruction per clock cycle in five stages: instruction fetch, " +
        "decode, execute, memory access and write back. This section covers tracing which parts of the " +
        "datapath an instruction uses, and the eight control signals that steer it: nPC_sel, RegDst, ExtOp, " +
        "ALUSrc, ALUctr, MemWr, MemtoReg and RegWr.",
      keyIdeas: [
        "Single-cycle clock period = time of the slowest instruction (the sum of the stages it uses)",
        "Multi-cycle clock period = time of the slowest stage",
        "R-type instructions write to rd; I-type instructions write to rt",
        "Only loads read data memory and only stores write it"
      ],
      problems: [
        { id: "control-signals", title: "Control signals" },
        { id: "datapath-trace", title: "Tracing the datapath" },
        { id: "clock-cycle", title: "Single- vs multi-cycle clock" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "pipelining",
      title: "Pipelining and hazards",
      lectures: "L12–L13",
      blurb: "Pipelined speedup, data and control hazards, forwarding.",
      summary:
        "Overlapping the execution of instructions in a five-stage pipeline, how much faster that makes a " +
        "program, and the hazards that get in the way: structural hazards (two instructions need the same " +
        "hardware), data hazards (an instruction needs a result that isn't ready yet, handled by stalling " +
        "or forwarding) and control hazards (branches, handled by stalling, resolving branches earlier, " +
        "delayed branching or branch prediction).",
      keyIdeas: [
        "n instructions on a k-stage pipeline take k + n − 1 cycles (with no stalls)",
        "With balanced stages and many instructions, speedup approaches k",
        "Dependencies: RAW (true), WAR and WAW (false, or name, dependencies)",
        "Even with forwarding, a load followed immediately by an instruction using its result needs a stall"
      ],
      problems: [
        { id: "pipeline-time", title: "Pipelined time and speedup" },
        { id: "dependencies", title: "Data dependencies" },
        { id: "stalls", title: "Stalls and forwarding" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "ilp",
      title: "Instruction-level parallelism",
      lectures: "L14",
      blurb: "Superscalar and VLIW, loop unrolling, register renaming.",
      summary:
        "Going beyond a single pipeline. This section covers multiple-issue processors (static superscalar, " +
        "VLIW and dynamic superscalar), loop unrolling to expose more independent instructions, and register " +
        "renaming to remove false (WAR and WAW) dependencies.",
      keyIdeas: [
        "Only RAW dependencies are true dependencies; WAR and WAW can be removed by renaming",
        "Register renaming gives every new result a fresh name (V0, V1, …)",
        "Loop unrolling reduces loop overhead and gives the scheduler more independent work",
        "Static multiple issue (VLIW) relies on the compiler; dynamic superscalar schedules in hardware"
      ],
      problems: [
        { id: "renaming", title: "Register renaming" },
        { id: "unrolling", title: "Loop unrolling" },
        { id: "vliw", title: "VLIW scheduling" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "multicore",
      title: "Multicore and cache coherence",
      lectures: "L15",
      blurb: "Flynn's taxonomy, MESI, true and false sharing, data races.",
      summary:
        "Parallel architectures: Flynn's taxonomy, multiprocessors versus multi-core processors, and " +
        "simultaneous multithreading. When each core has a private cache, copies of the same block must " +
        "be kept consistent; this section covers snooping, invalidate versus update policies and the MESI " +
        "protocol, as well as true and false sharing, multithreading and data races.",
      keyIdeas: [
        "MESI states: Modified, Exclusive, Shared, Invalid",
        "A write to a block invalidates the copies in other caches",
        "False sharing: cores use different words that happen to share a cache block",
        "A data race: two threads access the same location without synchronization and at least one writes"
      ],
      problems: [
        { id: "mesi", title: "MESI state tables" },
        { id: "sharing", title: "True vs false sharing" },
        { id: "races", title: "Data races" },
        { id: "concepts", title: "Concept check" }
      ]
    },
    {
      slug: "gpu",
      title: "GPU architecture",
      lectures: "L16",
      blurb: "SIMT, warps, divergence, coalescing and tensor cores.",
      summary:
        "GPUs as throughput-oriented accelerators. This section covers SIMT execution, streaming " +
        "multiprocessors, warps and warp scheduling, branch divergence, the GPU memory hierarchy " +
        "(including shared memory and coalesced memory accesses), and tensor cores.",
      keyIdeas: [
        "Threads run in warps that execute the same instruction together (SIMT)",
        "When threads in a warp take different branches, the paths run one after the other",
        "Accesses are coalesced when the threads in a warp touch consecutive addresses",
        "Shared memory is a small, fast, programmer-managed memory on each streaming multiprocessor"
      ],
      problems: [
        { id: "divergence", title: "Warp divergence" },
        { id: "coalescing", title: "Memory coalescing" },
        { id: "concepts", title: "Concept check" }
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
