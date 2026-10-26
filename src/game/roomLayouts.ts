import { Rng } from "./rng";
import {
  COLS,
  DIR_OFFSETS,
  ROWS,
  TILE,
  obstacleBlocks,
  type Dir,
  type EncounterKind,
  type Interior,
  type Obstacle,
  type ObstacleKind,
  type Room,
} from "./types";

/**
 * Room furniture generator.
 *
 * Every combat room draws one of a large set of hand-assembled patterns, then
 * mirrors and dresses it according to the room's interior. Patterns are seeded
 * per room, so the same seed always returns the same room, but two rooms in the
 * same run almost never share a silhouette.
 */

export const LAYOUT_NAMES = [
  "scatter",
  "corners",
  "pillars",
  "ring",
  "cross",
  "diamond",
  "chapel",
  "crypt",
  "lanes",
  "throne",
  "maze",
  "checker",
  "banquet",
  "flooded",
  "gauntlet",
  "cages",
  "webbed",
  "bone-garden",
  "shrine",
  "bridge",
  "pantry",
  "workshop",
  "spiral",
  "split",
  "alley",
  "colosseum",
  "coffin-row",
  "broken-clock",
] as const;

export const INTERIOR_NAMES: Record<Interior, string> = {
  cellar: "Root Cellar",
  crypt: "Crypt",
  chapel: "Chapel",
  flood: "Flooded",
  pantry: "Pantry",
  workshop: "Workshop",
  nest: "Nest",
  orchard: "Orchard",
};

export const ENCOUNTER_LABELS: Record<EncounterKind, string> = {
  standard: "The Room Wakes",
  waves: "Hold the Room",
  nest: "Break the Nests",
  ambush: "They Were Waiting",
  elite: "A Stitched Champion",
  hazard: "Mind the Floor",
  pincer: "Two Jaws",
  swarm: "Too Many Small Things",
};

const INTERIOR_POOLS: Record<number, [Interior, number][]> = {
  0: [
    ["cellar", 30],
    ["pantry", 22],
    ["workshop", 20],
    ["nest", 16],
    ["crypt", 12],
  ],
  1: [
    ["crypt", 32],
    ["chapel", 26],
    ["cellar", 14],
    ["workshop", 12],
    ["nest", 16],
  ],
  2: [
    ["flood", 34],
    ["chapel", 24],
    ["crypt", 18],
    ["nest", 14],
    ["cellar", 10],
  ],
  3: [
    ["orchard", 34],
    ["crypt", 22],
    ["cellar", 16],
    ["nest", 18],
    ["workshop", 10],
  ],
  4: [
    ["nest", 26],
    ["chapel", 22],
    ["flood", 18],
    ["crypt", 18],
    ["orchard", 16],
  ],
};

export function pickInterior(floorIndex: number, seed: number): Interior {
  const rng = new Rng(seed ^ 0x1f10a7);
  const pool = INTERIOR_POOLS[Math.min(4, Math.max(0, floorIndex))] ?? INTERIOR_POOLS[0];
  return rng.weighted(pool);
}

function insetFor(kind: ObstacleKind): { inset: number; hp: number } {
  switch (kind) {
    case "pillar":
      return { inset: 6, hp: 999 };
    case "spike":
      return { inset: 10, hp: 999 };
    case "brazier":
      return { inset: 13, hp: 999 };
    case "web":
      return { inset: 2, hp: 1 };
    case "cage":
      return { inset: 8, hp: 999 };
    case "grave":
      return { inset: 6, hp: 2 };
    case "pit":
      return { inset: 5, hp: 999 };
    case "nest":
      return { inset: 7, hp: 7 };
    case "urn":
      return { inset: 8, hp: 1 };
    default:
      return { inset: 4, hp: 1 };
  }
}

export function generateObstacles(room: Room, floorIndex: number, rng: Rng): Obstacle[] {
  const occupied = new Set<string>();
  const reserved = new Set<string>();
  const obstacles: Obstacle[] = [];

  // The player always lands at the centre, and every door needs a runway.
  for (let y = 2; y <= 4; y++) {
    for (let x = 5; x <= 7; x++) reserved.add(`${x},${y}`);
  }
  for (const dir of Object.keys(room.doors) as Dir[]) {
    if (dir === "n") for (let x = 5; x <= 7; x++) reserved.add(`${x},0`);
    if (dir === "s") for (let x = 5; x <= 7; x++) reserved.add(`${x},${ROWS - 1}`);
    if (dir === "w") for (let y = 2; y <= 4; y++) reserved.add(`0,${y}`);
    if (dir === "e") for (let y = 2; y <= 4; y++) reserved.add(`${COLS - 1},${y}`);
  }

  const add = (gx: number, gy: number, kind: ObstacleKind): void => {
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
    const key = `${gx},${gy}`;
    if (occupied.has(key) || reserved.has(key)) return;
    occupied.add(key);
    const { inset, hp } = insetFor(kind);
    obstacles.push({
      x: gx * TILE + inset,
      y: gy * TILE + inset,
      w: TILE - inset * 2,
      h: TILE - inset * 2,
      kind,
      seed: rng.int(99999),
      hp,
      maxHp: kind === "nest" ? hp : undefined,
      spawnTimer: kind === "nest" ? 3.5 : undefined,
    });
  };

  const paint = (
    points: [number, number][],
    kind: ObstacleKind,
    sym: "none" | "x" | "y" | "xy" = "none",
  ): void => {
    for (const [x, y] of points) {
      add(x, y, kind);
      if (sym === "x" || sym === "xy") add(COLS - 1 - x, y, kind);
      if (sym === "y" || sym === "xy") add(x, ROWS - 1 - y, kind);
      if (sym === "xy") add(COLS - 1 - x, ROWS - 1 - y, kind);
    }
  };

  const scatter = (count: number, kinds: [ObstacleKind, number][]): void => {
    for (let i = 0; i < count; i++) {
      add(rng.int(COLS), rng.int(ROWS), rng.weighted(kinds));
    }
  };

  const hazardKinds: [ObstacleKind, number][] = [
    ["spike", 34],
    ["web", 18],
    ["brazier", 12],
  ];

  // Interior nudges the layout pool, so a crypt feels like a crypt.
  const interiorBoost: Record<Interior, [string, number][]> = {
    cellar: [
      ["scatter", 12],
      ["corners", 8],
      ["banquet", 8],
      ["bridge", 5],
    ],
    crypt: [
      ["crypt", 18],
      ["coffin-row", 14],
      ["bone-garden", 10],
      ["colosseum", 6],
    ],
    chapel: [
      ["chapel", 18],
      ["lanes", 12],
      ["shrine", 12],
      ["throne", 6],
    ],
    flood: [
      ["flooded", 18],
      ["bridge", 14],
      ["ring", 8],
      ["webbed", 8],
    ],
    pantry: [
      ["pantry", 18],
      ["banquet", 14],
      ["corners", 8],
      ["checker", 6],
    ],
    workshop: [
      ["workshop", 18],
      ["cages", 12],
      ["maze", 10],
      ["spiral", 6],
    ],
    nest: [
      ["webbed", 18],
      ["maze", 10],
      ["diamond", 8],
      ["broken-clock", 8],
    ],
    orchard: [
      ["bone-garden", 18],
      ["bridge", 12],
      ["colosseum", 8],
      ["split", 8],
    ],
  };

  const base: [string, number][] = [
    ["scatter", 12],
    ["corners", 10],
    ["pillars", 10],
    ["ring", 8],
    ["cross", 8],
    ["diamond", 8],
    ["chapel", 6],
    ["crypt", 6],
    ["lanes", 8],
    ["throne", 5],
    ["maze", 8],
    ["checker", 6],
    ["banquet", 6],
    ["flooded", 6],
    ["gauntlet", 8],
    ["cages", 6],
    ["webbed", 6],
    ["bone-garden", 6],
    ["shrine", 6],
    ["bridge", 6],
    ["pantry", 6],
    ["workshop", 6],
    ["spiral", 6],
    ["split", 8],
    ["alley", 8],
    ["colosseum", 6],
    ["coffin-row", 8],
    ["broken-clock", 6],
  ];
  const weights = new Map<string, number>(base);
  for (const [name, bonus] of interiorBoost[room.interior] ?? []) {
    weights.set(name, (weights.get(name) ?? 0) + bonus);
  }
  // The deepest floor gets the stranger furniture more often.
  if (floorIndex >= 3) {
    for (const name of ["broken-clock", "colosseum", "split", "spiral"]) {
      weights.set(name, (weights.get(name) ?? 0) + 6);
    }
  }
  const layout = rng.weighted(Array.from(weights.entries()));
  room.layout = layout;

  switch (layout) {
    case "scatter":
      scatter(8 + rng.int(7) + floorIndex, [
        ["rock", 54],
        ["urn", 12],
        ["grave", room.interior === "crypt" ? 22 : 4],
        ["web", room.interior === "flood" || room.interior === "nest" ? 16 : 4],
      ]);
      break;
    case "corners":
      paint(
        [
          [1, 1],
          [2, 1],
          [1, 2],
          [11, 5],
          [10, 5],
          [11, 4],
        ],
        rng.chance(0.82) ? "rock" : "grave",
        "xy",
      );
      if (rng.chance(0.65)) paint([[3, 3], [9, 3]], "spike", "x");
      break;
    case "pillars":
      paint(
        [
          [3, 1],
          [3, 5],
          [4, 3],
        ],
        "pillar",
        "x",
      );
      if (rng.chance(0.55)) paint([[5, 1], [7, 5]], "brazier", "x");
      break;
    case "ring": {
      const ring: [number, number][] = [
        [4, 1],
        [6, 1],
        [8, 1],
        [2, 2],
        [10, 2],
        [2, 4],
        [10, 4],
        [4, 5],
        [6, 5],
        [8, 5],
      ];
      paint(ring, rng.chance(0.5) ? "rock" : "pillar");
      if (rng.chance(0.45)) paint([[6, 3]], "brazier");
      break;
    }
    case "cross":
      paint(
        [
          [3, 2],
          [3, 4],
          [9, 2],
          [9, 4],
          [1, 3],
          [11, 3],
        ],
        "pillar",
      );
      if (rng.chance(0.7)) paint([[6, 1], [6, 5]], "urn", "none");
      break;
    case "diamond":
      paint(
        [
          [6, 1],
          [4, 2],
          [8, 2],
          [4, 4],
          [8, 4],
          [6, 5],
        ],
        rng.chance(0.5) ? "pillar" : "grave",
      );
      break;
    case "chapel":
      paint(
        [
          [1, 1],
          [2, 1],
          [3, 1],
          [1, 5],
          [2, 5],
          [3, 5],
        ],
        "rock",
        "x",
      );
      paint([[2, 3]], "rock", "x");
      if (rng.chance(0.8)) paint([[5, 2], [5, 4]], "brazier", "x");
      break;
    case "crypt":
      paint(
        [
          [2, 1],
          [4, 1],
          [2, 5],
          [4, 5],
          [9, 1],
          [11, 1],
          [9, 5],
          [11, 5],
        ],
        "grave",
      );
      paint([[1, 3]], "pillar", "y");
      break;
    case "lanes":
      for (const x of [3, 9]) {
        for (const y of [1, 2, 4, 5]) add(x, y, rng.chance(0.8) ? "pillar" : "rock");
      }
      if (rng.chance(0.6)) paint([[6, 1], [6, 5]], "spike");
      break;
    case "throne":
      paint(
        [
          [4, 1],
          [8, 1],
          [4, 5],
          [8, 5],
          [1, 2],
          [1, 4],
          [11, 2],
          [11, 4],
        ],
        "pillar",
      );
      if (rng.chance(0.8)) paint([[6, 1], [6, 5]], "brazier");
      break;
    case "maze":
      paint(
        [
          [2, 1],
          [3, 1],
          [4, 1],
          [8, 1],
          [9, 1],
          [10, 1],
          [2, 5],
          [3, 5],
          [4, 5],
          [8, 5],
          [9, 5],
          [10, 5],
        ],
        "rock",
      );
      paint(
        [
          [4, 3],
          [3, 3],
        ],
        "pillar",
        "x",
      );
      break;
    case "checker":
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0 && rng.chance(0.28)) add(x, y, rng.chance(0.18) ? "urn" : "rock");
        }
      }
      break;
    case "banquet":
      paint(
        [
          [1, 2],
          [2, 2],
          [3, 2],
          [1, 4],
          [2, 4],
          [3, 4],
        ],
        "urn",
        "x",
      );
      paint([[5, 2], [5, 4]], "rock", "x");
      break;
    case "flooded":
      scatter(5 + rng.int(5), [
        ["web", 46],
        ["pit", 26],
        ["rock", 22],
        ["spike", 6],
      ]);
      paint(
        [
          [2, 2],
          [10, 2],
          [2, 4],
          [10, 4],
        ],
        "pillar",
      );
      break;
    case "gauntlet":
      paint(
        [
          [2, 2],
          [3, 2],
          [4, 2],
          [2, 4],
          [3, 4],
          [4, 4],
        ],
        "spike",
        "x",
      );
      paint(
        [
          [1, 1],
          [1, 5],
        ],
        "pillar",
        "x",
      );
      break;
    case "cages":
      paint(
        [
          [2, 2],
          [10, 4],
          [4, 1],
          [8, 5],
        ],
        "cage",
      );
      paint([[6, 1], [6, 5]], "brazier");
      break;
    case "webbed":
      scatter(8 + rng.int(6), [
        ["web", 62],
        ["nest", 16],
        ["rock", 18],
      ]);
      break;
    case "bone-garden":
      paint(
        [
          [2, 1],
          [4, 1],
          [2, 5],
          [4, 5],
          [9, 1],
          [11, 1],
          [9, 5],
          [11, 5],
        ],
        "grave",
      );
      paint(
        [
          [3, 3],
          [9, 3],
        ],
        "pillar",
      );
      if (rng.chance(0.7)) paint([[6, 1], [6, 5]], "spike");
      break;
    case "shrine":
      paint(
        [
          [4, 2],
          [8, 2],
          [4, 4],
          [8, 4],
        ],
        "brazier",
      );
      paint([[1, 1], [11, 1], [1, 5], [11, 5]], "pillar");
      break;
    case "bridge":
      paint(
        [
          [4, 1],
          [4, 2],
          [4, 4],
          [4, 5],
          [8, 1],
          [8, 2],
          [8, 4],
          [8, 5],
        ],
        "rock",
      );
      paint([[6, 2], [6, 4]], "web");
      break;
    case "pantry":
      paint(
        [
          [1, 1],
          [2, 1],
          [1, 2],
          [1, 4],
          [1, 5],
          [2, 5],
          [11, 1],
          [10, 1],
          [11, 5],
          [10, 5],
        ],
        "urn",
      );
      paint([[3, 3], [9, 3]], "rock");
      break;
    case "workshop":
      paint(
        [
          [2, 2],
          [3, 2],
          [2, 4],
          [3, 4],
          [9, 2],
          [10, 2],
          [9, 4],
          [10, 4],
        ],
        "rock",
      );
      paint([[6, 1], [6, 5]], "cage");
      break;
    case "spiral": {
      const spiral: [number, number][] = [
        [4, 1],
        [3, 2],
        [3, 3],
        [3, 4],
        [4, 5],
        [6, 5],
        [8, 5],
        [9, 4],
        [9, 3],
        [9, 2],
        [8, 1],
        [6, 1],
      ];
      paint(spiral, rng.chance(0.7) ? "rock" : "pillar");
      break;
    }
    case "split":
      paint(
        [
          [6, 1],
          [6, 5],
        ],
        "pillar",
      );
      paint(
        [
          [4, 2],
          [4, 4],
          [8, 2],
          [8, 4],
        ],
        "rock",
      );
      paint([[3, 3], [9, 3]], "spike");
      break;
    case "alley":
      paint(
        [
          [4, 1],
          [4, 2],
          [4, 4],
          [4, 5],
        ],
        "pillar",
        "x",
      );
      paint(
        [
          [2, 3],
          [10, 3],
        ],
        "brazier",
      );
      break;
    case "colosseum":
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        add(Math.round(6 + Math.cos(a) * 4), Math.round(3 + Math.sin(a) * 2.6), "pillar");
      }
      if (rng.chance(0.72)) paint([[3, 3], [9, 3]], "spike");
      break;
    case "coffin-row":
      paint(
        [
          [2, 1],
          [3, 1],
          [9, 1],
          [10, 1],
          [2, 5],
          [3, 5],
          [9, 5],
          [10, 5],
        ],
        "grave",
      );
      paint(
        [
          [6, 1],
          [6, 5],
        ],
        "cage",
      );
      break;
    case "broken-clock":
      paint(
        [
          [6, 1],
          [5, 2],
          [7, 2],
          [4, 4],
          [8, 4],
          [6, 5],
        ],
        "rock",
      );
      paint(
        [
          [2, 3],
          [10, 3],
        ],
        "spike",
      );
      break;
    default:
      scatter(8, [["rock", 80], ["urn", 20]]);
      break;
  }

  // A small number of extra hazards keeps even familiar silhouettes tense.
  const hazardChance = room.encounter === "hazard" ? 4 : room.interior === "flood" ? 1.5 : 1;
  const extra = Math.round(rng.range(0, 2.2) * hazardChance);
  for (let i = 0; i < extra; i++) {
    add(rng.int(COLS), rng.int(ROWS), rng.weighted(hazardKinds));
  }

  // Nests are part of the encounter, not the furniture.
  if (room.encounter === "nest") {
    const spots: [number, number][] = [
      [2, 1],
      [10, 1],
      [2, 5],
      [10, 5],
      [6, 1],
      [6, 5],
    ];
    rng.shuffle(spots);
    let placed = 0;
    for (const [x, y] of spots) {
      if (placed >= 2 + (rng.chance(0.45) ? 1 : 0)) break;
      const key = `${x},${y}`;
      if (reserved.has(key) || occupied.has(key)) continue;
      add(x, y, "nest");
      placed += 1;
    }
  }

  // If blockers sever a door or the centre, keep only the walkable hazards.
  if (!connected(obstacles, room)) {
    return obstacles.filter((o) => o.kind === "spike" || o.kind === "web");
  }
  return obstacles;
}

function connected(obstacles: Obstacle[], room: Room): boolean {
  const blocked = new Set<string>();
  for (const o of obstacles) {
    if (!obstacleBlocks(o.kind)) continue;
    const gx = Math.floor((o.x + o.w / 2) / TILE);
    const gy = Math.floor((o.y + o.h / 2) / TILE);
    blocked.add(`${gx},${gy}`);
  }
  const seen = new Set<string>();
  const queue: [number, number][] = [[6, 3]];
  seen.add("6,3");
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const dir of Object.keys(DIR_OFFSETS) as Dir[]) {
      const off = DIR_OFFSETS[dir];
      const nx = x + off.x;
      const ny = y + off.y;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const key = `${nx},${ny}`;
      if (blocked.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  const checks: [number, number][] = [];
  if (room.doors.n) checks.push([6, 0]);
  if (room.doors.s) checks.push([6, ROWS - 1]);
  if (room.doors.w) checks.push([0, 3]);
  if (room.doors.e) checks.push([COLS - 1, 3]);
  return checks.every(([x, y]) => seen.has(`${x},${y}`));
}
