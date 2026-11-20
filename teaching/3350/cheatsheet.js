/* CS 3350A exam cheat sheet, as handed out with the exams. Each section is an image cropped from
   the exam PDFs (midterm Fall 2026, final/makeup 2025, final W22). `map` says which sections go
   with which problem type; problem types with no matching cheat-sheet material have no entry.
   w and h are the image's natural size; it is shown at half size so it stays sharp. */
window.CS3350_CHEAT = {
  base: "../../../images/cheatsheet/",
  sections: {
    useful:    { title: "Useful information", img: "useful.png", w: 1352, h: 667 },
    memhier:   { title: "Memory hierarchy", img: "memhier.png", w: 1348, h: 1071 },
    cache:     { title: "Memory–cache mapping", img: "cache.png", w: 1347, h: 1715 },
    boolean:   { title: "Boolean circuits", img: "boolean.png", w: 1179, h: 644 },
    gates:     { title: "Logic gates", img: "gates.png", w: 809, h: 479 },
    flipflops: { title: "State circuits", img: "flipflops.png", w: 987, h: 1372 },
    mips:      { title: "MIPS", img: "mips.png", w: 1231, h: 1292 },
    control:   { title: "Control signals and formats", img: "control.png", w: 1078, h: 522 },
    semantic:  { title: "Semantic control signal values", img: "semantic.png", w: 948, h: 525 },
    datapath:  { title: "Datapath and control", img: "datapath.png", w: 1214, h: 708 },
    hazards:   { title: "Pipeline hazards", img: "hazards.png", w: 1348, h: 1636 },
    mesi:      { title: "MESI protocol", img: "mesi.png", w: 1348, h: 2709 },
    sync:      { title: "Synchronization", img: "sync.png", w: 1346, h: 516 }
  },

  map: {
    "performance/effective-cpi": ["useful"],
    "performance/cpu-time": ["memhier"],
    "performance/compare": ["memhier", "useful"],
    "memory/amat": ["memhier", "useful"],
    "memory/stall-cpi": ["memhier"],
    "memory/miss-types": ["memhier"],
    "memory/concepts": ["memhier", "useful"],
    "caches/address-bits": ["cache"],
    "caches/cache-sim": ["cache"],
    "caches/hit-rate": ["cache", "memhier"],
    "caches/concepts": ["cache", "useful"],
    "logic/boolean-simplify": ["boolean"],
    "logic/truth-table": ["boolean", "gates"],
    "logic/concepts": ["boolean", "gates"],
    "sequential/flip-flops": ["flipflops"],
    "sequential/concepts": ["flipflops"],
    "mips/encode": ["control", "mips"],
    "mips/decode": ["control", "mips"],
    "mips/branch-target": ["mips", "control"],
    "mips/c-to-mips": ["mips"],
    "mips/trace": ["mips"],
    "mips/concepts": ["mips", "control"],
    "datapath/control-signals": ["control", "semantic", "datapath"],
    "datapath/datapath-trace": ["datapath", "control"],
    "datapath/concepts": ["datapath", "control", "semantic"],
    "pipelining/dependencies": ["hazards"],
    "pipelining/stalls": ["hazards"],
    "pipelining/concepts": ["hazards"],
    "multicore/mesi": ["mesi"],
    "multicore/sharing": ["mesi"],
    "multicore/races": ["sync"],
    "multicore/concepts": ["mesi"]
  }
};
