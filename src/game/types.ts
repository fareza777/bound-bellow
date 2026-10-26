export const TILE = 64;
export const COLS = 13;
export const ROWS = 7;
export const ROOM_W = COLS * TILE;
export const ROOM_H = ROWS * TILE;
export const WALL = 40;
export const VIEW_W = 960;
export const VIEW_H = 650;
export const ROOM_X = (VIEW_W - ROOM_W) / 2;
export const ROOM_Y = 112;

export const TAU = Math.PI * 2;

export type Dir = "n" | "s" | "e" | "w";
export type RoomType =
  | "start"
  | "combat"
  | "treasure"
  | "shop"
  | "boss"
  | "secret"
  | "sacrifice"
  | "challenge"
  | "library"
  | "vault";
export type Phase = "title" | "intro" | "chapter" | "playing" | "paused" | "dead" | "victory";
export type Curse = "darkness" | "swarm" | "famine";
export type CharacterId = "wren" | "moth" | "cinder" | "choir";
export type EliteKind = "stitched" | "blessed" | "swift" | "cursed" | "gilded" | "bloated";
export type EnemyKind =
  | "moth"
  | "crawler"
  | "husk"
  | "waxface"
  | "goat"
  | "saint"
  | "ragdoll"
  | "wraith"
  | "drowned"
  | "chorister"
  | "roothound"
  | "waxcrow"
  | "bonewheel"
  | "wretch"
  | "grub"
  | "lurker"
  | "bellringer"
  | "lantern"
  | "penitent"
  | "maw"
  | "scarecrow"
  | "swarmling"
  | "waxherald"
  | "bonekite"
  | "censer"
  | "mimic"
  | "weaverling"
  | "hollowman"
  | "drifter"
  | "spore";
export type BossKind =
  | "glutton"
  | "weaver"
  | "drowned"
  | "orchard"
  | "heart"
  | "sexton"
  | "curator"
  | "bellwidow"
  | "tallyman"
  | "gaunt"
  | "carver";
export type ObstacleKind =
  | "rock"
  | "pillar"
  | "spike"
  | "urn"
  | "brazier"
  | "web"
  | "cage"
  | "grave"
  | "pit"
  | "nest";
export type Interior =
  | "cellar"
  | "crypt"
  | "chapel"
  | "flood"
  | "pantry"
  | "workshop"
  | "nest"
  | "orchard";
export type EncounterKind =
  | "standard"
  | "waves"
  | "nest"
  | "ambush"
  | "elite"
  | "hazard"
  | "pincer"
  | "swarm";

export interface Vec {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  seed: number;
  hp: number;
  maxHp?: number;
  spawnTimer?: number;
}

/** Spikes and webs are walked over; every other obstacle is solid. */
export function obstacleBlocks(kind: ObstacleKind): boolean {
  return kind !== "spike" && kind !== "web";
}

export interface Enemy {
  id: number;
  kind: EnemyKind | "boss";
  boss?: BossKind;
  elite?: EliteKind | null;
  frozen: number;
  shielded: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  touch: number;
  t: number;
  state: string;
  timer: number;
  cd: number;
  angle: number;
  flash: number;
  dead: boolean;
  seed: number;
  phase2: boolean;
  cast: number;
  adds: number;
  poison: number;
  poisonTick: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

export type PickupKind =
  | "coin"
  | "bomb"
  | "key"
  | "heart"
  | "halfheart"
  | "item"
  | "trapdoor";

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  r: number;
  itemId?: string;
  price?: number;
  value?: number;
  t: number;
  sold?: boolean;
  locked?: boolean;
  boss?: boolean;
  hpPrice?: number;
  special?: string;
}

export interface Tear {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  maxLife: number;
  pierce: number;
  hit: number[];
  crit: boolean;
  poison: boolean;
  explosive: boolean;
  homing: number;
  size: number;
  t: number;
  color: string;
  bounces: number;
}

export type ShotKind = "wax" | "needle" | "ink" | "thread";

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  life: number;
  kind: ShotKind;
  t: number;
  angle: number;
}

export interface Bomb {
  x: number;
  y: number;
  fuse: number;
  radius: number;
  t: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shape: "dot" | "line" | "ring";
  spin?: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface PlayerStats {
  damage: number;
  fireDelay: number;
  speed: number;
  range: number;
  shotSpeed: number;
  tearSize: number;
  shots: number;
  spread: number;
  pierce: number;
  crit: number;
  critMult: number;
  homing: number;
  poison: number;
  explosive: number;
  orbitals: number;
  revives: number;
  coinBonus: number;
  enemySlow: number;
  bombBonus: number;
  explosionSize: number;
  armor: number;
  bounces: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  invuln: number;
  fireCd: number;
  bombCd: number;
  t: number;
  aimX: number;
  aimY: number;
  moving: boolean;
  dead: boolean;
  reviveUsed: boolean;
  hitFlash: number;
  shotSide: number;
  stats: PlayerStats;
  items: string[];
  coins: number;
  bombs: number;
  keys: number;
  character: CharacterId;
  activeItem: string | null;
  activeCharges: number;
  transformations: string[];
  skillCd: number;
  haste: number;
  hasteTimer: number;
}

export interface Room {
  id: string;
  gx: number;
  gy: number;
  type: RoomType;
  seed: number;
  doors: Partial<Record<Dir, Room>>;
  obstacles: Obstacle[];
  enemies: Enemy[];
  pickups: Pickup[];
  visited: boolean;
  generated: boolean;
  cleared: boolean;
  lootRolled: boolean;
  unlocked: boolean;
  itemId?: string;
  bossDropped?: boolean;
  secretDir?: Dir;
  secretOpened?: boolean;
  challengeBoss?: BossKind;
  specialTaken?: boolean;
  interior: Interior;
  layout: string;
  encounter: EncounterKind;
  wave: number;
  maxWaves: number;
  waveTimer: number;
  encounterLabel?: string;
}

export interface FloorData {
  index: number;
  rooms: Room[];
  start: Room;
  boss: Room;
  byKey: Map<string, Room>;
  distance: Map<string, number>;
  curse: Curse | null;
  secret?: Room;
}

export interface RunInfo {
  seed: number;
  seedText: string;
  floor: number;
  time: number;
  rooms: number;
  kills: number;
  character: CharacterId;
  daily: boolean;
  trueEnding: boolean;
  damageTaken: number;
  bombsUsed: number;
  treasures: number;
  secrets: number;
  revived: boolean;
  transformed: boolean;
}

export interface RecordData {
  deepest: number;
  wins: number;
  runs: number;
  bestItems: string[];
}

export interface ShopEntry {
  kind: PickupKind;
  itemId?: string;
  price: number;
  value?: number;
}

export const keyOf = (x: number, y: number) => `${x},${y}`;

export const DIR_OFFSETS: Record<Dir, Vec> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  e: { x: 1, y: 0 },
  w: { x: -1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { n: "s", s: "n", e: "w", w: "e" };

export const DEFAULT_STATS = (): PlayerStats => ({
  damage: 3.4,
  fireDelay: 0.36,
  speed: 208,
  range: 1,
  shotSpeed: 480,
  tearSize: 1,
  shots: 1,
  spread: 0.07,
  pierce: 0,
  crit: 0.04,
  critMult: 2,
  homing: 0,
  poison: 0,
  explosive: 0,
  orbitals: 0,
  revives: 0,
  coinBonus: 0,
  enemySlow: 0,
  bombBonus: 0,
  explosionSize: 1,
  armor: 0,
  bounces: 0,
});
