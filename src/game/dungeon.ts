import { Rng, mixSeed } from "./rng";
import type { Curse, Dir, Room, RoomType } from "./types";
import { COLS, DIR_OFFSETS, OPPOSITE, keyOf } from "./types";

const GRID = 9;

export interface GeneratedFloor {
  rooms: Room[];
  start: Room;
  boss: Room;
  treasure: Room;
  shop: Room;
  distance: Map<string, number>;
  curse: Curse | null;
  secret?: Room;
  library?: Room;
  vault?: Room;
  sacrifice?: Room;
  challenge?: Room;
}

function emptyRoom(gx: number, gy: number, seed: number): Room {
  return {
    id: `${gx}:${gy}`,
    gx,
    gy,
    type: "combat",
    seed,
    doors: {},
    obstacles: [],
    enemies: [],
    pickups: [],
    visited: false,
    generated: false,
    cleared: false,
    lootRolled: false,
    unlocked: false,
    interior: "cellar",
    layout: "scatter",
    encounter: "standard",
    wave: 0,
    maxWaves: 0,
    waveTimer: 0,
  };
}

function connect(a: Room, b: Room): void {
  const dx = b.gx - a.gx;
  const dy = b.gy - a.gy;
  if (dx === 1) {
    a.doors.e = b;
    b.doors.w = a;
  } else if (dx === -1) {
    a.doors.w = b;
    b.doors.e = a;
  } else if (dy === 1) {
    a.doors.s = b;
    b.doors.n = a;
  } else if (dy === -1) {
    a.doors.n = b;
    b.doors.s = a;
  }
}

function neighborsOpen(room: Room, byKey: Map<string, Room>): { gx: number; gy: number; dir: Dir }[] {
  const out: { gx: number; gy: number; dir: Dir }[] = [];
  for (const dir of Object.keys(DIR_OFFSETS) as Dir[]) {
    const off = DIR_OFFSETS[dir];
    const nx = room.gx + off.x;
    const ny = room.gy + off.y;
    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
    if (!byKey.has(keyOf(nx, ny))) out.push({ gx: nx, gy: ny, dir });
  }
  return out;
}

function bfs(rooms: Room[], start: Room): Map<string, number> {
  const distances = new Map<string, number>();
  const queue: Room[] = [start];
  distances.set(start.id, 0);
  while (queue.length) {
    const room = queue.shift()!;
    const d = distances.get(room.id)!;
    for (const target of Object.values(room.doors)) {
      if (!target || distances.has(target.id)) continue;
      distances.set(target.id, d + 1);
      queue.push(target);
    }
  }
  return distances;
}

function degree(room: Room): number {
  return Object.values(room.doors).filter(Boolean).length;
}

export function generateFloor(floorIndex: number, seed: number): GeneratedFloor {
  const rng = new Rng(mixSeed(seed, 0x51ed270b, floorIndex + 1));
  const byKey = new Map<string, Room>();
  const rooms: Room[] = [];

  const counts = [13, 14, 15, 15, 17];
  const targetCount = counts[Math.min(counts.length - 1, floorIndex)] + (rng.chance(0.55) ? 1 : 0);
  const startGx = 3 + rng.int(3);
  const startGy = 3 + rng.int(3);
  const start = emptyRoom(startGx, startGy, mixSeed(seed, startGx, startGy));
  rooms.push(start);
  byKey.set(keyOf(start.gx, start.gy), start);

  let guard = 0;
  while (rooms.length < targetCount && guard++ < 220) {
    // Grow mostly from recent tips, sometimes from the middle to form branches.
    const base =
      rng.chance(0.62) && rooms.length > 2
        ? rooms[rooms.length - 1 - rng.int(Math.min(3, rooms.length - 1))]
        : rng.pick(rooms);
    const candidates = neighborsOpen(base, byKey);
    if (!candidates.length) continue;
    const pick = rng.pick(candidates);
    const room = emptyRoom(pick.gx, pick.gy, mixSeed(seed, pick.gx, pick.gy));
    rooms.push(room);
    byKey.set(keyOf(room.gx, room.gy), room);
    connect(base, room);
  }

  // Ensure a handful of clean dead ends for the major rooms.
  let leafGuard = 0;
  while (leafGuard++ < 180) {
    const leaves = rooms.filter((r) => r !== start && degree(r) === 1);
    if (leaves.length >= 3) break;
    const base = rooms[rng.int(rooms.length)];
    const candidates = neighborsOpen(base, byKey);
    if (!candidates.length) continue;
    const scored = candidates
      .map((c) => ({
        c,
        score: neighborsOpen({ ...base, gx: c.gx, gy: c.gy }, byKey).length + rng.next(),
      }))
      .sort((a, b) => b.score - a.score);
    const pick = (rng.chance(0.72) ? scored[0] : scored[scored.length - 1]).c;
    const room = emptyRoom(pick.gx, pick.gy, mixSeed(seed, pick.gx, pick.gy));
    rooms.push(room);
    byKey.set(keyOf(room.gx, room.gy), room);
    connect(base, room);
  }

  const distances = bfs(rooms, start);
  const leaves = rooms.filter((r) => r !== start && degree(r) === 1);
  leaves.sort((a, b) => (distances.get(b.id) ?? 0) - (distances.get(a.id) ?? 0));

  const boss = leaves.shift() ?? rooms[rooms.length - 1];
  const treasure = leaves.shift() ?? rooms[Math.max(1, rooms.length - 2)];
  const shop = leaves.shift() ?? rooms[Math.max(1, rooms.length - 3)];

  start.type = "start";
  boss.type = "boss";
  treasure.type = "treasure";
  shop.type = "shop";
  boss.seed = mixSeed(boss.seed, 0xb055);
  treasure.seed = mixSeed(treasure.seed, 0x7a5e);
  shop.seed = mixSeed(shop.seed, 0x5a09);

  const available = rooms.filter(
    (r) => r !== start && r !== boss && r !== treasure && r !== shop && r.type === "combat",
  );
  const takeRoom = (): Room | undefined => {
    if (!available.length) return undefined;
    const idx = rng.int(available.length);
    return available.splice(idx, 1)[0];
  };

  let library: Room | undefined;
  let vault: Room | undefined;
  let sacrifice: Room | undefined;
  let challenge: Room | undefined;
  const firstSpecial = takeRoom();
  if (firstSpecial) {
    if (rng.chance(0.55)) {
      firstSpecial.type = "library";
      firstSpecial.seed = mixSeed(firstSpecial.seed, 0x11b4);
      library = firstSpecial;
    } else {
      firstSpecial.type = "vault";
      firstSpecial.seed = mixSeed(firstSpecial.seed, 0x5a17);
      vault = firstSpecial;
    }
  }
  const secondSpecial = takeRoom();
  if (secondSpecial) {
    if (floorIndex > 0 && rng.chance(0.55)) {
      secondSpecial.type = "challenge";
      secondSpecial.seed = mixSeed(secondSpecial.seed, 0xca11);
      challenge = secondSpecial;
    } else {
      secondSpecial.type = "sacrifice";
      secondSpecial.seed = mixSeed(secondSpecial.seed, 0x5ac4);
      sacrifice = secondSpecial;
    }
  }

  // Hidden room: a cracked wall in a normal room, revealed by a bomb.
  let secret: Room | undefined;
  const secretRng = new Rng(mixSeed(seed, 0x5ec3e7, floorIndex + 3));
  for (let attempt = 0; attempt < 60 && !secret; attempt++) {
    const hosts = rooms.filter(
      (r) => r.type === "combat" || r.type === "challenge" || r.type === "sacrifice",
    );
    if (!hosts.length) break;
    const host = secretRng.pick(hosts);
    const options = neighborsOpen(host, byKey);
    if (!options.length) continue;
    const pick = secretRng.pick(options);
    const hidden = emptyRoom(pick.gx, pick.gy, mixSeed(mixSeed(seed, pick.gx, pick.gy), 0x5ec));
    hidden.type = "secret";
    hidden.cleared = true;
    hidden.secretOpened = true;
    hidden.seed = mixSeed(hidden.seed, 0x5ec3e7);
    host.secretDir = pick.dir;
    host.secretOpened = false;
    rooms.push(hidden);
    byKey.set(keyOf(hidden.gx, hidden.gy), hidden);
    secret = hidden;
  }

  for (const room of rooms) {
    if (room.type === "combat") room.seed = mixSeed(room.seed, floorIndex + 1);
  }

  let curse: Curse | null = null;
  if (floorIndex > 0 && rng.chance(0.24 + floorIndex * 0.055)) {
    curse = rng.pick(["darkness", "swarm", "famine"] as const);
  }

  return {
    rooms,
    start,
    boss,
    treasure,
    shop,
    distance: distances,
    curse,
    secret,
    library,
    vault,
    sacrifice,
    challenge,
  };
}

/** Manhattan-ish door helper used by map drawing. */
export function doorDirs(room: Room): Dir[] {
  return (Object.keys(room.doors) as Dir[]).filter((d) => !!room.doors[d]);
}

export function roomTypeLabel(type: RoomType): string {
  switch (type) {
    case "boss":
      return "Keeper";
    case "treasure":
      return "Reliquary";
    case "shop":
      return "Chapman";
    case "start":
      return "Stair";
    case "secret":
      return "Behind the Wall";
    case "sacrifice":
      return "Altar";
    case "challenge":
      return "Trial";
    case "library":
      return "Library";
    case "vault":
      return "Vault";
    default:
      return "Room";
  }
}

export { GRID, OPPOSITE };
