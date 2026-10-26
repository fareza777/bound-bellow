import type { CharacterId } from "./types";
import { hashString, seedToText, textToSeed } from "./rng";

const META_KEY = "boundbelow.meta.v2";
const LEGACY_RECORD_KEY = "boundbelow.record";

export const META_STORAGE_KEYS = [META_KEY, LEGACY_RECORD_KEY] as const;

/**
 * Playgama Storage adapter. On Playgama this is the Bridge storage module;
 * in a local preview it is absent and the game falls back to localStorage.
 */
export interface MetaStore {
  get(keys: string[]): Promise<Record<string, string | null>>;
  set(keys: string[], values: string[]): Promise<void>;
  delete(keys: string[]): Promise<void>;
}

let metaStore: MetaStore | null = null;
let metaSaveChain: Promise<void> = Promise.resolve();

export function setMetaStore(store: MetaStore | null): void {
  metaStore = store;
}

export interface MetaSettings {
  voice: boolean;
  shake: number;
  damageNumbers: boolean;
  flashes: boolean;
  assist: boolean;
  muted: boolean;
}

export interface RunRecord {
  deepest: number;
  wins: number;
  runs: number;
  bestItems: string[];
}

export interface CharacterProgress {
  runs: number;
  wins: number;
}

export interface DailyState {
  date: string;
  seedText: string;
  character: CharacterId;
  bestFloor: number;
  completed: boolean;
}

export interface MetaStats {
  kills: number;
  rooms: number;
  playSeconds: number;
  secrets: number;
  curses: number;
  treasures: number;
  trueWins: number;
  bossKills: number;
  bombKills: number;
}

export interface MetaState {
  version: 2;
  record: RunRecord;
  characters: Record<CharacterId, CharacterProgress>;
  seenItems: string[];
  seenEnemies: string[];
  kills: Record<string, number>;
  achievements: Record<string, number>;
  settings: MetaSettings;
  stats: MetaStats;
  daily: DailyState | null;
  introSeen: boolean;
  selectedCharacter: CharacterId;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "opening", name: "The Opening", desc: "Watch the house introduce itself." },
  { id: "first-descent", name: "A Small Footstep", desc: "Begin your first descent." },
  { id: "glutton", name: "The First Door", desc: "Put down The Glutton in the Cellar." },
  { id: "weaver", name: "A Name Unfinished", desc: "Cut The Weaver down in the Ossuary." },
  { id: "drowned", name: "A Voice in the Water", desc: "Silence The Drowned Choir." },
  { id: "orchard", name: "Every Branch a Name", desc: "Fell The Rootbound Matron." },
  { id: "heart", name: "The Thread Reaches the End", desc: "Defeat The Hollow Heart." },
  { id: "true-ending", name: "Cut the Thread", desc: "Find the ending the house did not write." },
  { id: "collector", name: "A Pocketful of Secrets", desc: "Discover 20 different collectibles." },
  { id: "curator", name: "The House Kept Everything", desc: "Discover 40 different collectibles." },
  { id: "bestiary", name: "The House Remembers", desc: "Kill 100 enemies." },
  { id: "flawless", name: "Unbroken", desc: "Clear a floor without taking damage." },
  { id: "bombardier", name: "Soot and Thunder", desc: "Kill 25 enemies with bombs across all runs." },
  { id: "keymaster", name: "Every Lock Has a Name", desc: "Open three treasure rooms in one run." },
  { id: "deep", name: "The Deeper Stitch", desc: "Reach Chapter IV." },
  { id: "bottom", name: "The Last Stair", desc: "Reach The Hollow." },
  { id: "cursed", name: "The House Notices", desc: "Clear a floor while cursed." },
  { id: "secret", name: "Behind the Wallpaper", desc: "Open a secret room with a bomb." },
  { id: "transformation", name: "Something New", desc: "Complete a relic transformation." },
  { id: "second-wind", name: "Second Thread", desc: "Return from a death once." },
  { id: "still-daylight", name: "Still Daylight", desc: "Finish a run in under eighteen minutes." },
  { id: "single-thread", name: "A Single Thread", desc: "Win with one half-heart or less." },
  { id: "unwounded", name: "Unwounded", desc: "Defeat a keeper without taking damage in its room." },
  { id: "daily", name: "The Same House", desc: "Complete today's daily descent." },
  { id: "librarian", name: "Borrowed Voices", desc: "Pick up three active relics in one run." },
  { id: "fashion", name: "Small Talismans", desc: "Collect three trinkets in one run." },
  { id: "altar", name: "A Fair Trade", desc: "Pay the sacrifice room." },
  { id: "miniboss", name: "The Sexton's Due", desc: "Defeat a keeper's servant." },
  { id: "deep-pockets", name: "Deep Pockets", desc: "Carry forty coins at once." },
  { id: "five-names", name: "Five Names", desc: "Defeat all five keepers across your descents." },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

const defaultCharacters = (): Record<CharacterId, CharacterProgress> => ({
  wren: { runs: 0, wins: 0 },
  moth: { runs: 0, wins: 0 },
  cinder: { runs: 0, wins: 0 },
  choir: { runs: 0, wins: 0 },
});

export function defaultMeta(): MetaState {
  return {
    version: 2,
    record: { deepest: 0, wins: 0, runs: 0, bestItems: [] },
    characters: defaultCharacters(),
    seenItems: [],
    seenEnemies: [],
    kills: {},
    achievements: {},
    settings: {
      voice: true,
      shake: 1,
      damageNumbers: true,
      flashes: true,
      assist: false,
      muted: false,
    },
    stats: {
      kills: 0,
      rooms: 0,
      playSeconds: 0,
      secrets: 0,
      curses: 0,
      treasures: 0,
      trueWins: 0,
      bossKills: 0,
      bombKills: 0,
    },
    daily: null,
    introSeen: false,
    selectedCharacter: "wren",
  };
}

export function loadMetaFromRaw(rawMeta: string | null, rawLegacy: string | null): MetaState {
  const base = defaultMeta();
  try {
    if (rawMeta) {
      const parsed = JSON.parse(rawMeta) as Partial<MetaState>;
      return normalizeMeta(parsed);
    }
    if (rawLegacy) {
      const record = JSON.parse(rawLegacy) as Partial<RunRecord>;
      base.record.deepest = Math.max(0, Number(record.deepest) || 0);
      base.record.wins = Math.max(0, Number(record.wins) || 0);
      base.record.runs = Math.max(0, Number(record.runs) || 0);
    }
  } catch {
    /* ignore corrupt saves */
  }
  return base;
}

export function loadMeta(): MetaState {
  try {
    return loadMetaFromRaw(
      localStorage.getItem(META_KEY),
      localStorage.getItem(LEGACY_RECORD_KEY),
    );
  } catch {
    return defaultMeta();
  }
}

export async function loadMetaFromStore(store: MetaStore): Promise<MetaState> {
  const data = await store.get([...META_STORAGE_KEYS]);
  return loadMetaFromRaw(data[META_KEY] ?? null, data[LEGACY_RECORD_KEY] ?? null);
}

export function normalizeMeta(parsed: Partial<MetaState>): MetaState {
  const base = defaultMeta();
  const record = parsed.record ?? base.record;
  const settings = { ...base.settings, ...(parsed.settings ?? {}) };
  const characters = { ...defaultCharacters(), ...(parsed.characters ?? {}) };
  const stats = { ...base.stats, ...(parsed.stats ?? {}) };
  return {
    ...base,
    ...parsed,
    version: 2,
    record: {
      deepest: Number(record.deepest) || 0,
      wins: Number(record.wins) || 0,
      runs: Number(record.runs) || 0,
      bestItems: Array.isArray(record.bestItems) ? record.bestItems.slice(0, 60) : [],
    },
    characters,
    settings: {
      voice: Boolean(settings.voice),
      shake: Math.max(0, Math.min(1.5, Number(settings.shake ?? 1))),
      damageNumbers: Boolean(settings.damageNumbers),
      flashes: Boolean(settings.flashes),
      assist: Boolean(settings.assist),
      muted: Boolean(settings.muted),
    },
    stats,
    seenItems: Array.isArray(parsed.seenItems) ? parsed.seenItems.slice(0, 120) : [],
    seenEnemies: Array.isArray(parsed.seenEnemies) ? parsed.seenEnemies.slice(0, 80) : [],
    kills: typeof parsed.kills === "object" && parsed.kills ? parsed.kills : {},
    achievements: typeof parsed.achievements === "object" && parsed.achievements
      ? parsed.achievements
      : {},
    introSeen: Boolean(parsed.introSeen),
    selectedCharacter: ["wren", "moth", "cinder", "choir"].includes(parsed.selectedCharacter as string)
      ? (parsed.selectedCharacter as CharacterId)
      : "wren",
  };
}

export function saveMeta(meta: MetaState): void {
  const metaJson = JSON.stringify(meta);
  const legacyJson = JSON.stringify({
    deepest: meta.record.deepest,
    wins: meta.record.wins,
    runs: meta.record.runs,
    bestItems: meta.record.bestItems,
  });
  if (metaStore) {
    const store = metaStore;
    metaSaveChain = metaSaveChain
      .then(() => store.set([...META_STORAGE_KEYS], [metaJson, legacyJson]))
      .catch(() => {
        /* a failed cloud save must not break the run */
      });
    return;
  }
  try {
    localStorage.setItem(META_KEY, metaJson);
    localStorage.setItem(LEGACY_RECORD_KEY, legacyJson);
  } catch {
    /* storage may be full or unavailable */
  }
}

export function resetMeta(): MetaState {
  const base = defaultMeta();
  if (metaStore) {
    const store = metaStore;
    metaSaveChain = metaSaveChain
      .then(() => store.delete([...META_STORAGE_KEYS]))
      .catch(() => {
        /* ignore failed reset; the next load falls back to defaults */
      });
  } else {
    try {
      localStorage.removeItem(META_KEY);
      localStorage.removeItem(LEGACY_RECORD_KEY);
    } catch {
      /* ignore */
    }
  }
  return base;
}

export function achievementCount(meta: MetaState): number {
  return Object.keys(meta.achievements).length;
}

export function hasAchievement(meta: MetaState, id: string): boolean {
  return Boolean(meta.achievements[id]);
}

export function unlockAchievement(meta: MetaState, id: string): AchievementDef | null {
  if (meta.achievements[id]) return null;
  const def = ACHIEVEMENT_BY_ID.get(id);
  if (!def) return null;
  meta.achievements[id] = Date.now();
  saveMeta(meta);
  return def;
}

export function discoverItem(meta: MetaState, itemId: string): boolean {
  if (meta.seenItems.includes(itemId)) return false;
  meta.seenItems.push(itemId);
  saveMeta(meta);
  return true;
}

export function discoverEnemy(meta: MetaState, enemyId: string): boolean {
  if (meta.seenEnemies.includes(enemyId)) return false;
  meta.seenEnemies.push(enemyId);
  saveMeta(meta);
  return true;
}

export function recordKill(meta: MetaState, enemyId: string): void {
  meta.kills[enemyId] = (meta.kills[enemyId] ?? 0) + 1;
  meta.stats.kills += 1;
}

export function utcDateKey(date = new Date()): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function dailySeedText(date = new Date()): string {
  return `D${utcDateKey(date)}`;
}

export function dailySeedNumber(date = new Date()): number {
  return textToSeed(dailySeedText(date)) ^ hashString(`DAILY-${utcDateKey(date)}`);
}

export function ensureDaily(meta: MetaState): DailyState {
  const date = utcDateKey();
  if (!meta.daily || meta.daily.date !== date) {
    meta.daily = {
      date,
      seedText: dailySeedText(),
      character: meta.selectedCharacter,
      bestFloor: 0,
      completed: false,
    };
    saveMeta(meta);
  }
  return meta.daily;
}

export function characterUnlocked(meta: MetaState, id: CharacterId): boolean {
  switch (id) {
    case "wren":
      return true;
    case "moth":
      return meta.record.deepest >= 3;
    case "cinder":
      return meta.record.wins >= 1;
    case "choir":
      return achievementCount(meta) >= 8 || meta.record.wins >= 2;
    default:
      return false;
  }
}

export function characterUnlockText(id: CharacterId): string {
  switch (id) {
    case "wren":
      return "Always beneath the floorboards.";
    case "moth":
      return "Reach Chapter III.";
    case "cinder":
      return "Finish one descent.";
    case "choir":
      return "Unlock 8 marks in the Ledger.";
    default:
      return "";
  }
}

export function randomSeedText(): string {
  return seedToText((Math.random() * 0xffffffff) >>> 0);
}
