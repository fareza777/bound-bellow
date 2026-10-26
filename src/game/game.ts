import type { UI } from "./ui";
import type { HudBanner, HudNotice } from "./hud";
import type {
  Bomb,
  Dir,
  Enemy,
  EnemyKind,
  FloorData,
  FloatText,
  Obstacle,
  Particle,
  Phase,
  Pickup,
  Player,
  Room,
  RunInfo,
  RecordData,
  Shot,
  Tear,
  Curse,
  CharacterId,
  EliteKind,
  BossKind,
} from "./types";
import {
  COLS,
  DEFAULT_STATS,
  DIR_OFFSETS,
  OPPOSITE,
  ROOM_H,
  ROOM_W,
  ROOM_X,
  ROOM_Y,
  ROWS,
  TAU,
  TILE,
  VIEW_H,
  VIEW_W,
  WALL,
  obstacleBlocks,
} from "./types";
import { Rng, hashString, mixSeed, seedToText, textToSeed } from "./rng";
import {
  clamp,
  circleRect,
  dist,
  formatTime,
  moveWithCollision,
  norm,
  segmentCircle,
} from "./util";
import { CHAPTER_IMAGES, getTheme, THEMES, type Theme } from "./theme";
import { generateFloor, type GeneratedFloor } from "./dungeon";
import {
  ENCOUNTER_LABELS,
  INTERIOR_NAMES,
  generateObstacles,
  pickInterior,
} from "./roomLayouts";
import { Input } from "./input";
import { AudioEngine } from "./audio";
import { RoomRenderer, type DoorVisual } from "./roomRender";
import { drawHud, drawTouchSticks, type HudData } from "./hud";
import { ACTIVES, ITEM_BY_ID, ITEMS, RELICS, TRINKETS, itemKind } from "./items";
import {
  drawBomb as drawBombArt,
  drawEnemy as drawEnemyArt,
  drawHeartIcon,
  drawObstacle,
  drawOrbital,
  drawPickup,
  drawPriceTag,
  drawShot,
  drawTear,
  drawWren,
} from "./art";
import { updateEnemies, makeEnemy, type CombatContext } from "./enemies";
import {
  BOSS_NAMES,
  BOSS_QUOTES,
  BOSS_VOICE,
  isMainBoss,
  isMiniBoss,
  makeBoss,
  updateBoss,
} from "./bosses";
import {
  ACHIEVEMENTS,
  dailySeedNumber,
  dailySeedText,
  discoverEnemy,
  discoverItem,
  ensureDaily,
  loadMeta,
  recordKill,
  resetMeta,
  characterUnlocked,
  saveMeta,
  unlockAchievement,
  type MetaState,
} from "./meta";
import { getCharacter } from "./characters";
import { Voice } from "./voice";
import { BOSS_ORDER } from "./bestiary";


const backdropCache = new Map<string, HTMLImageElement>();

function backdropFor(floorIndex: number): HTMLImageElement {
  const src = CHAPTER_IMAGES[Math.min(CHAPTER_IMAGES.length - 1, Math.max(0, floorIndex))];
  let img = backdropCache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = src;
    backdropCache.set(src, img);
  }
  return img;
}

interface Telegraph {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  color: string;
}

interface TransitionState {
  t: number;
  dur: number;
  dir: Dir;
  target: Room;
  swapped: boolean;
}

function createPlayer(characterId: CharacterId = "wren", assist = false): Player {
  const character = getCharacter(characterId);
  const stats = { ...DEFAULT_STATS(), ...character.stats };
  const maxHp = character.maxHp + (assist ? 2 : 0);
  return {
    x: ROOM_W / 2,
    y: ROOM_H / 2,
    vx: 0,
    vy: 0,
    r: 13,
    hp: maxHp,
    maxHp,
    invuln: 1.2,
    fireCd: 0,
    bombCd: 0,
    t: 0,
    aimX: 1,
    aimY: 0,
    moving: false,
    dead: false,
    reviveUsed: false,
    hitFlash: 0,
    shotSide: 1,
    stats,
    items: [],
    coins: character.startingCoins,
    bombs: character.startingBombs,
    keys: character.startingKeys,
    character: characterId,
    activeItem: null,
    activeCharges: 0,
    transformations: [],
    skillCd: 0,
    haste: 0,
    hasteTimer: 0,
  };
}

let pickupId = 1;

function makePickup(
  kind: Pickup["kind"],
  x: number,
  y: number,
  extra: Partial<Pickup> = {},
): Pickup {
  return {
    id: pickupId++,
    kind,
    x,
    y,
    r: kind === "item" ? 22 : kind === "trapdoor" ? 34 : 14,
    t: Math.random() * 6,
    ...extra,
  };
}

function normalizeSeedText(text: string): string {
  return text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

export class Game {
  readonly input: Input;
  readonly audio: AudioEngine;
  readonly canvas: HTMLCanvasElement;
  ui!: UI;

  phase: Phase = "title";
  time = 0;
  player: Player = createPlayer();
  floorIndex = 0;
  seed = 0x51a1c0de;
  lastSeedText = "";
  run: RunInfo = {
    seed: 0x51a1c0de,
    seedText: "",
    floor: 0,
    time: 0,
    rooms: 0,
    kills: 0,
    character: "wren",
    daily: false,
    trueEnding: false,
    damageTaken: 0,
    bombsUsed: 0,
    treasures: 0,
    secrets: 0,
    revived: false,
    transformed: false,
  };
  meta: MetaState;
  onLevelEvent?: (event: string, data: Record<string, string | number | boolean>) => void;
  onRunEnd?: (win: boolean, trueEnding: boolean) => void;
  onAnalytics?: (event: string, data: Record<string, string | number | boolean>) => void;
  readonly voice: Voice;
  pendingSeed: string | null = null;

  get runDaily(): boolean {
    return this.run.daily;
  }

  get record(): RecordData {
    return this.meta.record;
  }

  floor!: GeneratedFloor;
  room!: Room;
  theme: Theme = THEMES[0];

  tears: Tear[] = [];
  shots: Shot[] = [];
  bombs: Bomb[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  telegraphs: Telegraph[] = [];

  banner: HudBanner | null = null;
  notice: HudNotice | null = null;
  bossIntro = 0;
  hintLife = 0;

  shake = 0;
  shakeT = 0;
  flash = 0;
  flashColor = "rgba(160,30,24,1)";
  hitstop = 0;
  slowmo = 0;
  deathTimer = 0;
  runRecorded = false;

  transition: TransitionState | null = null;
  doorNoticeCd = 0;
  shopNoticeCd = 0;
  danger = 0;
  mapRevealed = false;
  bossRoomDamage = 0;
  floorDamageTaken = 0;
  lowHealthVoiced = false;
  lowHealthCheck = 0;
  floorBossesCleared = 0;
  private shakeScale = 1;
  private damageNumbers = true;
  private flashesEnabled = true;

  view = { scale: 1, ox: 0, oy: 0 };
  private hudCrop = 0;
  private fullBleed = false;
  private worldScale = 1;
  private worldX = 0;
  private worldY = 0;
  private renderer = new RoomRenderer();
  private rng = new Rng(0x51a1c0de);
  private processed = new Set<number>();
  private orbitalNext = new Map<number, number>();
  private offeredItems = new Set<string>();
  private reducedMotion = false;
  private deathFxDone = false;
  private lastBombCount = -1;
  shotsFired = 0;

  constructor(canvas: HTMLCanvasElement, meta: MetaState = loadMeta()) {
    this.canvas = canvas;
    this.meta = meta;
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.voice = new Voice(this.meta.settings.voice);
    this.input.onFirstInput = () => this.audio.unlock();
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.applySettings();

    this.resetPreview();
    this.audio.setMuted(this.meta.settings.muted);
  }

  attachUi(ui: UI): void {
    this.ui = ui;
    ui.updateMuteButton();
  }

  boot(): void {
    this.phase = "title";
    this.resetPreview();
    this.ui?.showTitle();
  }

  private resetPreview(): void {
    const seed = textToSeed("BOUND");
    this.seed = seed;
    this.rng = new Rng(mixSeed(seed, 0x9e3779b9, 1));
    this.floor = generateFloor(0, seed);
    this.theme = getTheme(0);
    this.room = this.floor.start;
    this.player = createPlayer(this.meta.selectedCharacter, this.meta.settings.assist);
    this.ensureContent(this.room);
    this.room.visited = true;
    this.transition = null;
    this.bossIntro = 0;
  }

  // -------------------------------------------------------------------------
  // Run lifecycle
  // -------------------------------------------------------------------------

  beginRunFromTitle(seedText: string): void {
    if (this.phase !== "title") return;
    this.audio.unlock();
    const clean = normalizeSeedText(seedText);
    let seed: number;
    let text: string;
    if (clean) {
      seed = textToSeed(clean);
      text = clean;
    } else {
      seed = (Math.random() * 0xffffffff) >>> 0;
      text = seedToText(seed);
    }
    this.startNewRun(seed, text, false);
  }

  startDailyRun(): void {
    if (this.phase !== "title") return;
    this.audio.unlock();
    const daily = ensureDaily(this.meta);
    daily.character = this.meta.selectedCharacter;
    saveMeta(this.meta);
    this.startNewRun(dailySeedNumber(), dailySeedText(), true);
  }

  playOpening(): void {
    if (this.phase !== "title") return;
    this.audio.unlock();
    this.startIntro("title");
  }

  startIntro(mode: "run" | "title"): void {
    this.phase = "intro";
    this.input.clear();
    this.voice.stop();
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.ui?.playIntro(mode);
  }

  finishIntro(mode: "run" | "title"): void {
    this.meta.introSeen = true;
    saveMeta(this.meta);
    this.award("opening");
    this.voice.stop();
    if (mode === "run") {
      this.phase = "chapter";
      this.ui?.hideScreens();
      this.ui?.showChapter(this.theme);
      this.audio.setDucked(false);
      this.award("first-descent");
    } else {
      this.phase = "title";
      this.ui?.hideScreens();
      this.ui?.showTitle();
      this.audio.setDucked(false);
    }
  }

  private startNewRun(seed: number, seedText: string, daily: boolean): void {
    const characterId = this.meta.selectedCharacter;
    this.seed = seed;
    this.lastSeedText = seedText;
    this.rng = new Rng(mixSeed(seed, 0x9e3779b9, 1));
    this.player = createPlayer(characterId, this.meta.settings.assist);
    this.player.invuln = 1.2;
    this.run = {
      seed,
      seedText,
      floor: 0,
      time: 0,
      rooms: 0,
      kills: 0,
      character: characterId,
      daily,
      trueEnding: false,
      damageTaken: 0,
      bombsUsed: 0,
      treasures: 0,
      secrets: 0,
      revived: false,
      transformed: false,
    };
    this.offeredItems.clear();
    this.processed.clear();
    this.orbitalNext.clear();
    this.runRecorded = false;
    this.banner = null;
    this.notice = null;
    this.transition = null;
    this.mapRevealed = false;
    this.lowHealthVoiced = false;
    this.lowHealthCheck = 0;
    this.floorDamageTaken = 0;
    this.bossRoomDamage = 0;
    this.floorBossesCleared = 0;
    this.applyStartingLoadout();
    this.buildFloor(0);
    const dailyState = ensureDaily(this.meta);
    if (daily) {
      dailyState.character = characterId;
      saveMeta(this.meta);
    }
    this.phase = "chapter";
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.ui?.setBombCount(this.player.bombs);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
    if (!this.meta.introSeen) {
      this.startIntro("run");
    } else {
      this.ui?.showChapter(this.theme);
      this.award("first-descent");
    }
  }

  private applyStartingLoadout(): void {
    const character = getCharacter(this.run.character);
    if (character.startingActive) {
      const def = ITEM_BY_ID.get(character.startingActive);
      if (def) {
        this.player.activeItem = def.id;
        this.player.activeCharges = def.maxCharges ?? 2;
        this.player.items.push(def.id);
        discoverItem(this.meta, def.id);
        this.offeredItems.add(def.id);
      }
    }
    if (character.startingTrinket) {
      const def = ITEM_BY_ID.get(character.startingTrinket);
      if (def) {
        def.apply?.(this.player);
        this.player.items.push(def.id);
        discoverItem(this.meta, def.id);
        this.offeredItems.add(def.id);
      }
    }
    saveMeta(this.meta);
  }

  continueChapter(): void {
    if (this.phase !== "chapter") return;
    this.phase = "playing";
    this.voice.stop();
    this.ui?.hideScreens();
    this.audio.unlock();
    this.audio.startAmbient(this.floorIndex);
    this.audio.setDucked(false);
    this.input.clearBomb();
    this.hintLife = this.floorIndex === 0 ? 9 : 0;
    this.player.invuln = Math.max(this.player.invuln, 1);
    this.ui?.setBombCount(this.player.bombs);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
    if (this.floor.curse) {
      this.showNotice(`CURSE · ${this.floor.curse.toUpperCase()}`, "#e3a48f");
    }
    this.audio.setIntensity(this.room.enemies.length ? (this.getBoss() ? 2 : 1) : 0);
    this.onLevelEvent?.("level_started", {
      world: this.theme.name,
      level: this.floorIndex + 1,
      character: this.run.character,
      daily: this.run.daily,
    });
  }

  restartRun(): void {
    if (this.phase !== "dead" && this.phase !== "victory") return;
    const wasDaily = this.run.daily;
    const text = this.lastSeedText || seedToText(this.seed);
    const seed = textToSeed(text);
    this.startNewRun(seed, text, wasDaily);
  }

  abandonRun(): void {
    if (this.phase !== "paused" && this.phase !== "playing") return;
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.audio.setIntensity(0);
    this.voice.stop();
    this.phase = "title";
    this.input.clear();
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.transition = null;
    this.resetPreview();
    this.ui?.hideScreens();
    this.ui?.showTitle();
  }

  toTitle(): void {
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.audio.setIntensity(0);
    this.voice.stop();
    this.phase = "title";
    this.input.clear();
    this.resetPreview();
    this.ui?.hideScreens();
    this.ui?.showTitle();
  }

  pause(): void {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.onLevelEvent?.("level_paused", { world: this.theme.name, level: this.floorIndex + 1 });
    this.input.clear();
    this.voice.pause();
    this.audio.setDucked(true);
    this.ui?.showPause();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.onLevelEvent?.("level_resumed", { world: this.theme.name, level: this.floorIndex + 1 });
    this.input.clearBomb();
    this.audio.setDucked(false);
    this.voice.resume();
    this.ui?.hideScreens();
  }

  private finish(win: boolean): void {
    if (this.phase === "dead" || this.phase === "victory") return;
    const trueEnding =
      win &&
      (this.run.trueEnding ||
        this.player.transformations.length >= 2 ||
        this.player.items.includes("second-thread"));
    this.run.trueEnding = trueEnding;
    this.phase = win ? "victory" : "dead";
    this.finalizeRecord(win, trueEnding);
    this.audio.stopAmbient();
    this.audio.setIntensity(0);
    this.audio.setDucked(true);
    this.voice.stop();
    this.ui?.showEnd(win, trueEnding);
    this.onLevelEvent?.(win ? "level_completed" : "level_failed", {
      world: "The House",
      level: this.floorIndex + 1,
      character: this.run.character,
      seconds: Math.round(this.run.time),
      true_ending: trueEnding,
    });
    this.onRunEnd?.(win, trueEnding);
    if (win) {
      this.audio.play("victory");
      this.voice.play(trueEnding ? "true-victory" : "victory", {
        interrupt: true,
      });
    }
  }

  private finalizeRecord(win: boolean, trueEnding: boolean): void {
    if (this.runRecorded) return;
    this.runRecorded = true;
    const meta = this.meta;
    meta.record.runs += 1;
    meta.record.deepest = Math.max(meta.record.deepest, this.floorIndex + 1);
    if (win) meta.record.wins += 1;
    meta.record.bestItems = this.player.items.slice(0, 60);
    meta.stats.playSeconds += this.run.time;
    if (trueEnding) meta.stats.trueWins += 1;
    meta.characters[this.run.character].runs += 1;
    if (win) meta.characters[this.run.character].wins += 1;
    if (this.run.daily) {
      const daily = ensureDaily(meta);
      daily.bestFloor = Math.max(daily.bestFloor, this.floorIndex + 1);
      if (win) daily.completed = true;
    }
    saveMeta(meta);
    if (win) {
      this.award("heart");
      if (trueEnding) this.award("true-ending");
      if (this.run.time < 1080) this.award("still-daylight");
      if (this.player.hp <= 1) this.award("single-thread");
      if (this.run.daily) this.award("daily");
    }
    if (meta.record.wins >= 1) this.award("first-descent");
  }

  private award(id: string): void {
    const def = unlockAchievement(this.meta, id);
    if (!def) return;
    saveMeta(this.meta);
    this.ui?.showAchievementToast(def);
  }

  applySettings(): void {
    this.shakeScale = this.meta.settings.shake;
    this.damageNumbers = this.meta.settings.damageNumbers;
    this.flashesEnabled = this.meta.settings.flashes;
    this.voice.setEnabled(this.meta.settings.voice);
    this.audio.setMuted(this.meta.settings.muted);
  }

  get muted(): boolean {
    return this.audio.isUserMuted;
  }

  toggleMute(): boolean {
    this.setMuted(!this.audio.isUserMuted);
    return this.audio.isUserMuted;
  }

  setMuted(muted: boolean): void {
    this.meta.settings.muted = muted;
    this.audio.setMuted(muted);
    saveMeta(this.meta);
    this.ui?.updateMuteButton();
  }

  selectCharacter(id: CharacterId): boolean {
    if (this.phase !== "title") return false;
    if (!characterUnlocked(this.meta, id)) return false;
    this.meta.selectedCharacter = id;
    saveMeta(this.meta);
    this.ui?.updateTitle();
    return true;
  }

  resetProgress(): void {
    this.meta = resetMeta();
    this.voice.stop();
    this.applySettings();
    this.ui?.updateTitle();
    this.ui?.showTitle();
  }

  saveMeta(): void {
    saveMeta(this.meta);
  }

  private buildFloor(index: number): void {
    this.floorIndex = index;
    this.run.floor = index;
    this.theme = getTheme(index);
    this.floor = generateFloor(index, mixSeed(this.seed, 0xf10a, index + 1));
    this.room = this.floor.start;
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.particles = [];
    this.texts = [];
    this.telegraphs = [];
    this.banner = null;
    this.notice = null;
    this.transition = null;
    this.bossIntro = 0;
    this.mapRevealed = false;
    this.floorDamageTaken = 0;
    this.bossRoomDamage = 0;
    this.floorBossesCleared = 0;
    this.processed.clear();
    this.orbitalNext.clear();
    this.voice.stop();
    this.audio.setIntensity(0);
    this.player.x = ROOM_W / 2;
    this.player.y = ROOM_H / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dead = false;
    this.player.invuln = 1.2;
    this.activateRoom(this.floor.start, null, true);
    this.player.hp = Math.min(
      this.player.hp > 0 ? this.player.hp : this.player.maxHp,
      this.player.maxHp,
    );
    if (index >= 3) this.award("deep");
    if (index >= 4) this.award("bottom");
    saveMeta(this.meta);
  }

  private activateRoom(room: Room, fromDir: Dir | null, counting = false): void {
    const firstVisit = !room.visited;
    this.room = room;
    room.visited = true;
    this.ensureContent(room);
    if (room.enemies.length === 0) room.cleared = true;
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.telegraphs = [];
    this.processed.clear();
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.fireCd = 0;
    this.player.invuln = Math.max(this.player.invuln, 0.8);
    if (fromDir) {
      const doorDir = OPPOSITE[fromDir];
      switch (doorDir) {
        case "n":
          this.player.x = ROOM_W / 2;
          this.player.y = 58;
          break;
        case "s":
          this.player.x = ROOM_W / 2;
          this.player.y = ROOM_H - 58;
          break;
        case "w":
          this.player.x = 58;
          this.player.y = ROOM_H / 2;
          break;
        case "e":
          this.player.x = ROOM_W - 58;
          this.player.y = ROOM_H / 2;
          break;
      }
    } else {
      this.player.x = ROOM_W / 2;
      this.player.y = ROOM_H / 2;
    }
    this.player.x = clamp(this.player.x, 24, ROOM_W - 24);
    this.player.y = clamp(this.player.y, 24, ROOM_H - 24);
    if (firstVisit || counting) {
      this.run.rooms += 1;
      this.meta.stats.rooms += 1;
    }
    if (room.type === "treasure" && firstVisit) {
      this.run.treasures += 1;
      this.meta.stats.treasures += 1;
      if (this.run.treasures >= 3) this.award("keymaster");
    }
    if (room.type === "secret" && firstVisit) {
      this.run.secrets += 1;
      this.meta.stats.secrets += 1;
      this.award("secret");
    }
    const boss = this.room.enemies.find((e) => e.kind === "boss" && !e.dead);
    if (boss && !room.cleared) {
      this.bossIntro = 3.0;
      this.bossRoomDamage = 0;
      this.audio.play("boss");
      this.addShake(5);
      if (boss.boss) {
        discoverEnemy(this.meta, `boss:${boss.boss}`);
        this.voice.play(BOSS_VOICE[boss.boss], { interrupt: true });
      }
      this.audio.setIntensity(2);
    } else {
      this.bossIntro = 0;
      this.audio.setIntensity(this.room.enemies.length ? 1 : 0);
      if (firstVisit && room.type === "combat" && room.encounterLabel) {
        const interior = INTERIOR_NAMES[room.interior] ?? "Room";
        this.showNotice(`${interior.toUpperCase()} · ${room.encounterLabel.toUpperCase()}`, "#c9b28b");
      }
    }
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
    saveMeta(this.meta);
  }

  // -------------------------------------------------------------------------
  // Room content
  // -------------------------------------------------------------------------

  private ensureContent(room: Room): void {
    if (room.generated) return;
    room.generated = true;
    const rng = new Rng(room.seed ^ 0x7a11c0de);
    if (room.type !== "start") {
      room.interior = pickInterior(this.floorIndex, room.seed);
    }
    if (room.type === "start") {
      room.cleared = true;
      room.pickups.push(makePickup("coin", ROOM_W / 2 + 62, ROOM_H / 2 + 8, { value: 2 }));
    } else if (room.type === "treasure") {
      room.cleared = true;
      room.itemId = this.pickItemKind("relic", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2, ROOM_H / 2 + 8, { itemId: room.itemId }),
      );
    } else if (room.type === "secret") {
      room.cleared = true;
      room.itemId = this.pickItemKind(rng.chance(0.55) ? "trinket" : "relic", rng);
      room.pickups.push(makePickup("item", ROOM_W / 2, ROOM_H / 2 - 18, { itemId: room.itemId }));
      room.pickups.push(makePickup("coin", ROOM_W / 2 - 74, ROOM_H / 2 + 58, { value: 4 }));
      room.pickups.push(makePickup("coin", ROOM_W / 2 + 66, ROOM_H / 2 + 58, { value: 4 }));
    } else if (room.type === "sacrifice") {
      room.cleared = true;
      room.itemId = this.pickItemKind(rng.chance(0.6) ? "relic" : "active", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2, ROOM_H / 2 + 8, {
          itemId: room.itemId,
          hpPrice: 2,
          special: "sacrifice",
        }),
      );
      room.pickups.push(makePickup("halfheart", ROOM_W / 2 - 150, ROOM_H / 2 + 40));
    } else if (room.type === "library") {
      room.cleared = true;
      const ids = this.pickItemKindList("active", 3, rng);
      ids.forEach((id, index) => {
        room.pickups.push(
          makePickup("item", ROOM_W / 2 - 162 + index * 162, ROOM_H * 0.54, {
            itemId: id,
            special: "library",
          }),
        );
      });
    } else if (room.type === "vault") {
      room.cleared = true;
      room.itemId = this.pickItemKind("relic", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2, ROOM_H / 2 + 8, {
          itemId: room.itemId,
          price: 15 + this.floorIndex * 2,
          special: "vault",
        }),
      );
      room.pickups.push(makePickup("coin", ROOM_W / 2 - 130, ROOM_H / 2 + 70, { value: 5 }));
    } else if (room.type === "challenge") {
      room.obstacles = generateObstacles(room, this.floorIndex, rng).filter(
        (o) => o.kind === "spike" || o.kind === "brazier" || o.kind === "web" || o.kind === "pit",
      );
      const miniPool: BossKind[][] = [
        ["sexton", "bellwidow"],
        ["sexton", "bellwidow", "tallyman"],
        ["curator", "tallyman", "gaunt"],
        ["curator", "gaunt", "carver"],
        ["carver", "gaunt", "bellwidow", "tallyman"],
      ];
      const mini = rng.pick(miniPool[Math.min(miniPool.length - 1, this.floorIndex)]);
      room.challengeBoss = mini;
      const boss = makeBoss(mini, this.floorIndex, ROOM_W / 2, ROOM_H * 0.42);
      boss.boss = mini;
      room.enemies = [boss];
      for (let i = 0; i < 2; i++) {
        const spot = this.findFreeSpot(rng, 90, room.obstacles, 44);
        if (spot) {
          room.enemies.push(
            makeEnemy(
              this.floorIndex >= 3 ? "bonewheel" : "wretch",
              spot.x,
              spot.y,
              this.floorIndex,
              rng,
            ),
          );
        }
      }
      room.cleared = false;
    } else if (room.type === "shop") {
      room.cleared = true;
      const basePrice = 9 + this.floorIndex * 2;
      const itemId =
        room.seed % 3 === 0
          ? this.pickItemKind("active", rng)
          : room.seed % 3 === 1
            ? this.pickItemKind("trinket", rng)
            : this.pickItemKind("relic", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2 - 158, ROOM_H * 0.54, {
          itemId,
          price: basePrice,
        }),
      );
      room.pickups.push(
        makePickup("heart", ROOM_W / 2, ROOM_H * 0.56, {
          price: 4,
        }),
      );
      room.pickups.push(
        makePickup("key", ROOM_W / 2 + 158, ROOM_H * 0.56, {
          price: 5,
        }),
      );
    } else if (room.type === "boss") {
      room.obstacles = [];
      const boss = makeBoss(this.theme.boss, this.floorIndex, ROOM_W / 2, ROOM_H * 0.42);
      room.enemies = [boss];
      room.cleared = false;
    } else {
      this.generateCombatContent(room, rng);
    }
  }

  private pickItem(rng: Rng): string {
    return this.pickItemKind("relic", rng);
  }

  private pickItemKind(kind: "relic" | "active" | "trinket", rng: Rng): string {
    const pool = ITEMS.filter(
      (item) => itemKind(item) === kind && !this.offeredItems.has(item.id),
    );
    const fallback = ITEMS.filter((item) => itemKind(item) === kind);
    const list = pool.length ? pool : fallback;
    const item = list[Math.floor(rng.next() * list.length)] ?? ITEMS[0];
    this.offeredItems.add(item.id);
    return item.id;
  }

  private pickItemKindList(
    kind: "relic" | "active" | "trinket",
    count: number,
    rng: Rng,
  ): string[] {
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(this.pickItemKind(kind, rng));
    return out;
  }

  private generateCombatContent(room: Room, rng: Rng): void {
    const encounterPool: [Room["encounter"], number][] = [
      ["standard", 30],
      ["waves", 13 + this.floorIndex],
      ["nest", 8 + this.floorIndex],
      ["ambush", 9],
      ["elite", 8 + this.floorIndex],
      ["hazard", 9],
      ["pincer", 8],
      ["swarm", 8 + this.floorIndex],
    ];
    room.encounter = rng.weighted(encounterPool);
    room.encounterLabel = ENCOUNTER_LABELS[room.encounter];
    room.wave = 0;
    room.maxWaves = 0;
    room.waveTimer = 0;
    room.obstacles = generateObstacles(room, this.floorIndex, rng);

    const distance = this.floor.distance.get(room.id) ?? 2;
    const curseBonus = this.floor.curse === "swarm" ? 2 : 0;
    const baseCount = clamp(
      2 +
        Math.floor(distance / 2) +
        Math.floor(this.floorIndex / 2) +
        curseBonus +
        (rng.chance(0.3) ? 1 : 0),
      2,
      8,
    );
    const roles = (room.interior === "nest" ? this.theme.enemyPool : this.theme.enemyPool).slice();
    const pickKind = (): EnemyKind => rng.weighted(roles);
    const spawnOne = (kind: EnemyKind, elite: EliteKind | null = null): boolean => {
      const spot = this.findFreeSpot(rng, 66, room.obstacles, 46);
      if (!spot) return false;
      room.enemies.push(makeEnemy(kind, spot.x, spot.y, this.floorIndex, rng, elite));
      discoverEnemy(this.meta, kind);
      return true;
    };
    const eliteKind = (): EliteKind =>
      rng.weighted([
        ["stitched", 25],
        ["blessed", 20],
        ["swift", 20],
        ["cursed", 15],
        ["gilded", 12],
        ["bloated", 8],
      ]);

    if (room.encounter === "waves") {
      room.maxWaves = 2 + (this.floorIndex >= 2 ? 1 : 0) + (rng.chance(0.3) ? 1 : 0);
      room.wave = 1;
      const first = Math.max(2, baseCount - 2);
      for (let i = 0; i < first; i++) spawnOne(pickKind());
    } else if (room.encounter === "nest") {
      room.maxWaves = 0;
      for (let i = 0; i < 2 + (rng.chance(0.5) ? 1 : 0); i++) spawnOne(pickKind());
    } else if (room.encounter === "elite") {
      room.maxWaves = 0;
      spawnOne(pickKind(), eliteKind());
      for (let i = 0; i < baseCount + 1; i++) spawnOne(pickKind());
    } else if (room.encounter === "swarm") {
      room.maxWaves = 0;
      const swarmPool = this.theme.enemyPool
        .filter(([kind]) => ["moth", "crawler", "ragdoll", "waxcrow", "wretch", "swarmling", "grub", "spore"].includes(kind))
        .map(([kind, weight]) => [kind, weight] as [EnemyKind, number]);
      const pool = swarmPool.length ? swarmPool : this.theme.enemyPool;
      for (let i = 0; i < clamp(baseCount + 4, 6, 12); i++) {
        const spot = this.findFreeSpot(rng, 82, room.obstacles, 40);
        if (!spot) break;
        const kind = rng.weighted(pool);
        room.enemies.push(makeEnemy(kind, spot.x, spot.y, this.floorIndex, rng));
        discoverEnemy(this.meta, kind);
      }
    } else if (room.encounter === "pincer") {
      room.maxWaves = 0;
      const centers = [
        { x: 128, y: 120 },
        { x: ROOM_W - 128, y: ROOM_H - 120 },
        { x: ROOM_W - 128, y: 120 },
        { x: 128, y: ROOM_H - 120 },
      ];
      rng.shuffle(centers);
      for (let i = 0; i < baseCount; i++) {
        const c = centers[i % 2];
        for (let attempt = 0; attempt < 20; attempt++) {
          const x = clamp(c.x + rng.range(-90, 90), 44, ROOM_W - 44);
          const y = clamp(c.y + rng.range(-66, 66), 44, ROOM_H - 44);
          if (room.obstacles.some((o) => obstacleBlocks(o.kind) && circleRect(x, y, 18, o.x, o.y, o.w, o.h))) continue;
          const kind = pickKind();
          room.enemies.push(makeEnemy(kind, x, y, this.floorIndex, rng));
          discoverEnemy(this.meta, kind);
          break;
        }
      }
    } else if (room.encounter === "ambush") {
      room.maxWaves = 0;
      const count = Math.max(3, baseCount);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + rng.range(-0.2, 0.2);
        const x = clamp(ROOM_W / 2 + Math.cos(a) * 190, 46, ROOM_W - 46);
        const y = clamp(ROOM_H / 2 + Math.sin(a) * 120, 46, ROOM_H - 46);
        const kind = pickKind();
        room.enemies.push(makeEnemy(kind, x, y, this.floorIndex, rng));
        discoverEnemy(this.meta, kind);
      }
    } else {
      room.maxWaves = 0;
      const count = room.encounter === "hazard" ? Math.max(2, baseCount - 2) : baseCount;
      for (let i = 0; i < count; i++) {
        const elite = rng.chance(0.1 + this.floorIndex * 0.014) ? eliteKind() : null;
        spawnOne(pickKind(), elite);
      }
    }

    room.cleared = room.enemies.length === 0;
  }

  private findFreeSpot(
    rng: Rng,
    centerAvoid: number,
    obstacles: Obstacle[],
    margin = 40,
  ): { x: number; y: number } | null {
    const blockers = obstacles.filter((o) => obstacleBlocks(o.kind));
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = rng.range(margin, ROOM_W - margin);
      const y = rng.range(margin, ROOM_H - margin);
      if (Math.hypot(x - ROOM_W / 2, y - ROOM_H / 2) < centerAvoid) continue;
      let blocked = false;
      for (const o of blockers) {
        if (circleRect(x, y, 16, o.x, o.y, o.w, o.h)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return { x, y };
    }
    return null;
  }

  private updateRoomHazards(dt: number): void {
    for (const nest of this.room.obstacles) {
      if (nest.kind !== "nest") continue;
      nest.spawnTimer = (nest.spawnTimer ?? 4) - dt;
      if (nest.spawnTimer > 0) continue;
      nest.spawnTimer = 5.2 + (nest.seed % 17) * 0.16;
      if (this.room.enemies.length >= 18) continue;
      const rng = new Rng(mixSeed(this.room.seed, nest.seed, Math.floor(this.time * 7)));
      const kind: EnemyKind = rng.weighted([
        ["grub", 26],
        ["moth", 22],
        ["crawler", 18],
        ["swarmling", 16],
        ["spore", 10],
        ["wretch", 8],
      ]);
      const x = clamp(nest.x + nest.w / 2 + rng.range(-28, 28), 30, ROOM_W - 30);
      const y = clamp(nest.y + nest.h / 2 + rng.range(-28, 28), 30, ROOM_H - 30);
      this.room.enemies.push(makeEnemy(kind, x, y, this.floorIndex, rng));
      discoverEnemy(this.meta, kind);
      this.spawnBurst(x, y, "#6b4b32", 7, 60, 2.4, 60);
    }
  }

  private spawnNextWave(): boolean {
    const room = this.room;
    if (room.wave >= room.maxWaves) return false;
    room.wave += 1;
    const rng = new Rng(mixSeed(room.seed, 0x77a3e, room.wave));
    const count = clamp(2 + this.floorIndex + room.wave + (this.floor.curse === "swarm" ? 1 : 0), 2, 8);
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const spot = this.findFreeSpot(rng, 80, room.obstacles, 42);
      if (!spot) continue;
      const kind = rng.weighted(this.theme.enemyPool);
      const elite = rng.chance(0.08 + this.floorIndex * 0.012) ? rng.pick(["stitched", "blessed", "swift", "cursed"] as const) : null;
      room.enemies.push(makeEnemy(kind, spot.x, spot.y, this.floorIndex, rng, elite));
      discoverEnemy(this.meta, kind);
      this.spawnBurst(spot.x, spot.y, "#7c2a24", 9, 70, 3, 40);
      spawned += 1;
    }
    if (spawned > 0) {
      this.showNotice(`WAVE ${room.wave} OF ${room.maxWaves}`, "#d8a65b");
      this.audio.play("door");
      this.addShake(2);
      return true;
    }
    return false;
  }

  private damageObstacle(o: Obstacle, dmg: number): void {
    if (!["urn", "grave", "web", "nest"].includes(o.kind)) return;
    o.hp -= dmg;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    this.spawnBurst(cx, cy, o.kind === "web" ? "#b8bdab" : "#8b7a58", 3, 45, 2, 80);
    if (o.hp > 0) return;
    const idx = this.room.obstacles.indexOf(o);
    if (idx >= 0) this.room.obstacles.splice(idx, 1);
    if (o.kind === "nest") {
      this.spawnBurst(cx, cy, "#6b4b32", 16, 110, 3.4, 80);
      this.showNotice("THE NEST COMES APART", "#c9b28b");
      this.audio.play("hit");
      return;
    }
    if (o.kind !== "web") this.dropFromRock(cx, cy);
    this.audio.play("hit", 0.5);
  }

  private spawnEnemyAt(kind: EnemyKind, x: number, y: number): void {
    if (this.room.enemies.length > 28) return;
    const nx = clamp(x, 26, ROOM_W - 26);
    const ny = clamp(y, 26, ROOM_H - 26);
    this.room.enemies.push(makeEnemy(kind, nx, ny, this.floorIndex, this.rng));
    discoverEnemy(this.meta, kind);
    this.spawnBurst(nx, ny, "rgba(50,40,30,0.8)", 5, 45, 3, 100);
  }

  // -------------------------------------------------------------------------
  // Update loop
  // -------------------------------------------------------------------------

  update(dtRaw: number): void {
    const dt = Math.min(dtRaw, 1 / 30);
    this.time += dt;
    this.doorNoticeCd = Math.max(0, this.doorNoticeCd - dt);
    this.shopNoticeCd = Math.max(0, this.shopNoticeCd - dt);

    this.input.pollGamepad();
    if (this.input.consumeGamepadPause()) {
      if (this.phase === "playing") this.pause();
      else if (this.phase === "paused") this.resume();
    }

    if (this.phase === "intro") return;
    if (this.phase === "chapter") return;
    if (this.phase === "title") return;
    if (this.phase === "paused") return;

    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    if (this.notice) {
      this.notice.life -= dt;
      if (this.notice.life <= 0) this.notice = null;
    }
    if (this.hintLife > 0) this.hintLife -= dt;
    if (this.bossIntro > 0) this.bossIntro = Math.max(0, this.bossIntro - dt);
    this.updateEffects(dt);
    if (!this.lowHealthVoiced && this.player.hp > 0 && this.player.hp <= 2) {
      this.lowHealthCheck -= dt;
      if (this.lowHealthCheck <= 0 && this.voice.enabled && !this.voice.playing) {
        if (this.voice.play(`low-health-${this.player.character}`)) this.lowHealthVoiced = true;
        this.lowHealthCheck = 4;
      }
    }

    if (this.player.dead) {
      this.deathTimer -= dt;
      this.updateParticles(dt);
      this.updateShotsVisual(dt);
      if (!this.deathFxDone) {
        this.deathFxDone = true;
        this.spawnBurst(this.player.x, this.player.y, "#8d3028", 26, 140, 4, 300);
        this.addShake(9);
        this.audio.play("die");
      }
      if (this.deathTimer <= 0) this.finish(false);
      return;
    }

    if (this.transition) {
      this.transition.t += dt;
      if (!this.transition.swapped && this.transition.t >= this.transition.dur / 2) {
        this.transition.swapped = true;
        this.activateRoom(this.transition.target, this.transition.dir);
      }
      if (this.transition.t >= this.transition.dur) this.transition = null;
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }

    let dtSim = dt;
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      dtSim *= 0.36;
    }

    this.run.time += dt;
    const move = this.input.movement();
    this.updatePlayer(move, dtSim);
    if (this.player.dead) return;
    this.updateBombs(dtSim);
    this.updateTears(dtSim);
    this.updateShots(dtSim);
    this.updatePickups(dtSim);
    this.updateOrbitals(dtSim);

    const ctx = this.makeCombatContext();
    updateEnemies(this.room.enemies, ctx, dtSim);
    for (const enemy of this.room.enemies) {
      if (enemy.kind === "boss" && !enemy.dead) updateBoss(enemy, ctx, dtSim);
    }
    this.updateRoomHazards(dtSim);
    this.checkContact(dtSim);
    this.checkHazards();
    this.processDeaths();
    this.checkRoomClear();
    this.updateTelegraphs(dtSim);
    this.updateParticles(dtSim);
    this.updateTexts(dtSim);

    if (this.room.enemies.length === 0) this.checkDoors(move);
    this.checkTrapdoor();
  }

  private updateEffects(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 22);
    this.flash = Math.max(0, this.flash - dt * 1.9);
    if (this.ui) {
      if (this.lastBombCount !== this.player.bombs) {
        this.lastBombCount = this.player.bombs;
        this.ui.setBombCount(this.player.bombs);
      }
      this.ui.setSkill(this.player.skillCd, getCharacter(this.player.character).skill.cooldown);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 1.5 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.particles.length > 320) this.particles.splice(0, this.particles.length - 320);
  }

  private updateTexts(dt: number): void {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 26 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  private updateTelegraphs(dt: number): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.life -= dt;
      if (t.life <= 0) this.telegraphs.splice(i, 1);
    }
  }

  private updateShotsVisual(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.t += dt;
      s.life -= dt;
      if (
        s.life <= 0 ||
        s.x < -16 ||
        s.x > ROOM_W + 16 ||
        s.y < -16 ||
        s.y > ROOM_H + 16
      ) {
        this.shots.splice(i, 1);
      }
    }
  }

  private updatePlayer(move: { x: number; y: number }, dt: number): void {
    const p = this.player;
    p.t += dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt * 2.4);
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.bombCd = Math.max(0, p.bombCd - dt);
    p.skillCd = Math.max(0, p.skillCd - dt);
    if (p.hasteTimer > 0) {
      p.hasteTimer -= dt;
      if (p.hasteTimer <= 0) p.haste = 0;
    }

    const stats = p.stats;
    let speedMul = 1 + p.haste;
    let webbed = false;
    for (const o of this.room.obstacles) {
      if (o.kind !== "web") continue;
      if (circleRect(p.x, p.y, p.r + 4, o.x, o.y, o.w, o.h)) {
        webbed = true;
        break;
      }
    }
    if (webbed) speedMul *= 0.52;
    const targetVx = move.x * stats.speed * speedMul;
    const targetVy = move.y * stats.speed * speedMul;
    const accel = Math.min(1, dt * 17);
    p.vx += (targetVx - p.vx) * accel;
    p.vy += (targetVy - p.vy) * accel;
    p.moving = Math.hypot(p.vx, p.vy) > 20;

    const blockers = this.room.obstacles.filter((o) => obstacleBlocks(o.kind));
    moveWithCollision(p, p.vx * dt, p.vy * dt, p.r, blockers, {
      x: 0,
      y: 0,
      w: ROOM_W,
      h: ROOM_H,
    });

    // aim priority: arrows, right stick, gamepad, mouse
    const arrow = this.input.arrowAim();
    const stick = this.input.stickAim();
    const gamepad = this.input.gamepadAim();
    const mouse = this.input.mouseAimRoom();
    let aimX = 0;
    let aimY = 0;
    let firing = false;
    if (arrow.x !== 0 || arrow.y !== 0) {
      aimX = arrow.x;
      aimY = arrow.y;
      firing = true;
    } else if (stick.active) {
      aimX = stick.x;
      aimY = stick.y;
      firing = true;
    } else if (gamepad.active) {
      aimX = gamepad.x;
      aimY = gamepad.y;
      firing = true;
    } else if (mouse.active) {
      const dir = norm(mouse.x - p.x, mouse.y - p.y);
      if (dir.x !== 0 || dir.y !== 0) {
        aimX = dir.x;
        aimY = dir.y;
        firing = true;
      }
    }
    if (!firing && p.moving) {
      const dir = norm(p.vx, p.vy);
      p.aimX = dir.x;
      p.aimY = dir.y;
    }
    if (firing) {
      p.aimX = aimX;
      p.aimY = aimY;
      if (p.fireCd <= 0) this.fireTear(aimX, aimY);
    }

    if (this.input.wantsActive()) this.useActiveItem();
    if (this.input.wantsSkill()) this.useSkill();
    if (this.input.wantsBomb()) this.placeBomb();
  }

  private fireTear(ax: number, ay: number): void {
    const p = this.player;
    const s = p.stats;
    p.fireCd = s.fireDelay;
    p.shotSide *= -1;
    const baseAngle = Math.atan2(ay, ax);
    const count = Math.max(1, Math.round(s.shots));
    const spread = count > 1 ? s.spread + 0.04 : 0;
    this.shotsFired += count;
    for (let i = 0; i < count; i++) {
      let offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      if (count === 1) offset = (Math.random() - 0.5) * s.spread * 0.25;
      const a = baseAngle + offset;
      const side = (i - (count - 1) / 2) * 8;
      const sx = p.x + Math.cos(a) * 17 - Math.sin(a) * side * (count > 1 ? 1 : 0);
      const sy = p.y + Math.sin(a) * 17 + Math.cos(a) * side * (count > 1 ? 1 : 0);
      const crit = Math.random() < s.crit;
      const speed = s.shotSpeed * (0.95 + Math.random() * 0.1);
      const distance = (300 * s.range + 70) * (crit ? 1.05 : 1);
      this.tears.push({
        x: sx,
        y: sy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: 6.4 * s.tearSize,
        damage: s.damage * (crit ? s.critMult : 1),
        life: distance / speed,
        maxLife: distance / speed,
        pierce: s.pierce,
        hit: [],
        crit,
        poison: s.poison > 0,
        explosive: s.explosive > 0,
        homing: s.homing,
        size: s.tearSize,
        t: 0,
        color: "#171311",
        bounces: s.bounces,
      });
    }
    this.audio.play("shoot", 1 + Math.random() * 0.06);
    this.spawnBurst(
      p.x + ax * 14,
      p.y + ay * 14 - 3,
      "rgba(26,21,18,0.7)",
      2,
      30,
      2.2,
      60,
    );
  }

  private placeBomb(): void {
    const p = this.player;
    if (p.bombCd > 0) return;
    if (p.bombs <= 0) {
      this.showNotice("NO BOMBS LEFT", "#c9b28b");
      p.bombCd = 0.5;
      return;
    }
    p.bombs -= 1;
    this.run.bombsUsed += 1;
    p.bombCd = 0.35;
    this.bombs.push({
      x: clamp(p.x, 24, ROOM_W - 24),
      y: clamp(p.y, 24, ROOM_H - 24),
      fuse: 1.45,
      radius: 92 * p.stats.explosionSize,
      t: 0,
    });
    this.audio.play("bomb");
    this.showNotice("BOMB PLACED", "#c9b28b");
  }

  private updateTears(dt: number): void {
    const enemies = this.room.enemies.filter((e) => !e.dead);
    for (let i = this.tears.length - 1; i >= 0; i--) {
      const tear = this.tears[i];
      tear.t += dt;
      tear.life -= dt;
      if (tear.homing > 0 && enemies.length) {
        let nearest: Enemy | null = null;
        let best = 260;
        for (const e of enemies) {
          const d = dist(tear.x, tear.y, e.x, e.y);
          if (d < best && !tear.hit.includes(e.id)) {
            best = d;
            nearest = e;
          }
        }
        if (nearest) {
          const speed = Math.hypot(tear.vx, tear.vy);
          const desired = Math.atan2(nearest.y - tear.y, nearest.x - tear.x);
          const current = Math.atan2(tear.vy, tear.vx);
          let diff = ((desired - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          diff = clamp(diff, -2.2 * dt * tear.homing, 2.2 * dt * tear.homing);
          tear.vx = Math.cos(current + diff) * speed;
          tear.vy = Math.sin(current + diff) * speed;
        }
      }
      const prevX = tear.x;
      const prevY = tear.y;
      tear.x += tear.vx * dt;
      tear.y += tear.vy * dt;

      const out =
        tear.x < 0 || tear.x > ROOM_W || tear.y < 0 || tear.y > ROOM_H;
      if (tear.bounces > 0 && out) {
        if (tear.x < 0 || tear.x > ROOM_W) tear.vx *= -1;
        if (tear.y < 0 || tear.y > ROOM_H) tear.vy *= -1;
        tear.x = clamp(tear.x, 2, ROOM_W - 2);
        tear.y = clamp(tear.y, 2, ROOM_H - 2);
        tear.bounces -= 1;
        this.spawnBurst(tear.x, tear.y, "#c9b28b", 2, 35, 1.8, 30);
        continue;
      }
      if (tear.life <= 0 || out) {
        this.splatTear(tear);
        this.tears.splice(i, 1);
        continue;
      }
      let hitObstacle: Obstacle | null = null;
      for (const o of this.room.obstacles) {
        if (o.kind === "spike" || o.kind === "web") continue;
        if (circleRect(tear.x, tear.y, tear.r, o.x, o.y, o.w, o.h)) {
          hitObstacle = o;
          break;
        }
      }
      if (hitObstacle) {
        if (tear.bounces > 0 && obstacleBlocks(hitObstacle.kind)) {
          tear.bounces -= 1;
          tear.x = prevX;
          tear.y = prevY;
          tear.vx *= -1;
          tear.vy *= -1;
          this.spawnBurst(tear.x, tear.y, "#c9b28b", 2, 35, 1.8, 30);
          continue;
        }
        this.damageObstacle(hitObstacle, tear.damage);
        this.splatTear(tear);
        this.tears.splice(i, 1);
        continue;
      }
      for (const enemy of enemies) {
        if (enemy.dead || tear.hit.includes(enemy.id)) continue;
        if (dist(tear.x, tear.y, enemy.x, enemy.y) > tear.r + enemy.r) continue;
        tear.hit.push(enemy.id);
        this.damageEnemy(enemy, tear.damage, tear.crit);
        if (tear.poison) {
          enemy.poison = Math.max(enemy.poison, 2.6);
          enemy.poisonTick = Math.min(enemy.poisonTick, 0.25);
        }
        if (tear.explosive) {
          this.smallBoom(tear.x, tear.y, tear.damage * 0.6);
        }
        this.splatTear(tear);
        if (tear.pierce > 0) {
          tear.pierce -= 1;
        } else {
          this.tears.splice(i, 1);
          break;
        }
      }
    }
  }

  private updateShots(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.t += dt;
      if (
        s.life <= 0 ||
        s.x < -12 ||
        s.x > ROOM_W + 12 ||
        s.y < -12 ||
        s.y > ROOM_H + 12
      ) {
        this.shots.splice(i, 1);
        continue;
      }
      let blocked = false;
      for (const o of this.room.obstacles) {
        if (!obstacleBlocks(o.kind)) continue;
        if (circleRect(s.x, s.y, s.r, o.x, o.y, o.w, o.h)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        this.spawnBurst(s.x, s.y, "rgba(201,178,139,0.7)", 2, 35, 2, 80);
        this.shots.splice(i, 1);
        continue;
      }
      if (dist(s.x, s.y, this.player.x, this.player.y) < s.r + this.player.r - 2) {
        this.hurtPlayer(s.damage);
        this.shots.splice(i, 1);
      }
    }
  }

  private updateBombs(dt: number): void {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      b.fuse -= dt;
      if (b.fuse <= 0) {
        this.explode(b.x, b.y, b.radius);
        this.bombs.splice(i, 1);
      }
    }
  }

  private explode(x: number, y: number, radius: number): void {
    this.tryRevealSecret(x, y);
    this.addShake(13);
    this.flash = 0.55;
    this.flashColor = "rgba(232,179,108,1)";
    this.audio.play("explode");
    this.spawnBurst(x, y, "#e0a24e", 26, 230, 5, 120);
    this.spawnBurst(x, y, "rgba(30,24,18,0.9)", 28, 150, 8, 40);
    // destroy rocks
    for (let i = this.room.obstacles.length - 1; i >= 0; i--) {
      const o = this.room.obstacles[i];
      if (!["rock", "urn", "grave", "web", "nest"].includes(o.kind)) continue;
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      if (Math.hypot(cx - x, cy - y) < radius + 18) {
        this.room.obstacles.splice(i, 1);
        this.dropFromRock(cx, cy);
        if (o.kind === "nest") this.showNotice("THE NEST COMES APART", "#c9b28b");
        this.spawnBurst(cx, cy, "rgba(120,104,78,0.8)", 8, 100, 3, 160);
      }
    }
    // hit enemies
    for (const e of [...this.room.enemies]) {
      if (e.dead) continue;
      const wasAlive = !e.dead;
      if (Math.hypot(e.x - x, e.y - y) < radius + e.r) {
        const dmg = 58 * (1 - 0.25 * (Math.hypot(e.x - x, e.y - y) / radius));
        this.damageEnemy(e, dmg, false);
        if (wasAlive && e.dead) {
          this.meta.stats.bombKills += 1;
          if (this.meta.stats.bombKills >= 25) this.award("bombardier");
        }
      }
    }
    if (Math.hypot(this.player.x - x, this.player.y - y) < radius + this.player.r) {
      this.hurtPlayer(2);
    }
  }

  private smallBoom(x: number, y: number, damage: number): void {
    this.spawnBurst(x, y, "rgba(220,140,70,0.9)", 8, 120, 3, 80);
    for (const e of [...this.room.enemies]) {
      if (e.dead) continue;
      if (Math.hypot(e.x - x, e.y - y) < 50 + e.r) this.damageEnemy(e, damage, false);
    }
    this.audio.play("explode", 0.8);
    this.addShake(2);
  }

  private dropFromRock(x: number, y: number): void {
    const roll = Math.random();
    if (roll < 0.3) {
      this.room.pickups.push(
        makePickup("coin", x, y, { value: 1 + Math.floor(Math.random() * 3) }),
      );
    } else if (roll < 0.4) {
      this.room.pickups.push(makePickup("heart", x, y));
    } else if (roll < 0.48) {
      this.room.pickups.push(makePickup("key", x, y));
    } else if (roll < 0.56) {
      this.room.pickups.push(makePickup("bomb", x, y));
    }
  }

  private updatePickups(dt: number): void {
    const pickups = this.room.pickups;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i];
      pickup.t += dt;
      if (pickup.kind === "trapdoor") continue;
      const d = dist(pickup.x, pickup.y, this.player.x, this.player.y);
      if (d > 26 + pickup.r) continue;
      if (pickup.price !== undefined && this.player.coins < pickup.price) {
        if (this.shopNoticeCd <= 0) {
          this.showNotice(`NEED ${pickup.price} COINS`, "#d8a65b");
          this.shopNoticeCd = 1.6;
          this.audio.play("locked");
        }
        continue;
      }
      if (pickup.hpPrice !== undefined) {
        if (this.player.hp <= pickup.hpPrice) {
          if (this.shopNoticeCd <= 0) {
            this.showNotice("BLOOD IS NOT ENOUGH", "#e3a48f");
            this.shopNoticeCd = 1.8;
            this.audio.play("locked");
          }
          continue;
        }
        this.player.hp -= pickup.hpPrice;
        this.player.maxHp = Math.max(2, this.player.maxHp);
        this.player.invuln = Math.max(this.player.invuln, 0.5);
        this.spawnBurst(this.player.x, this.player.y, "#8d3028", 14, 100, 3, 140);
        this.audio.play("hurt");
        this.award("altar");
        this.showNotice("THE HOUSE ACCEPTS", "#e3a48f");
      }
      if (pickup.price !== undefined) {
        this.player.coins -= pickup.price;
        this.audio.play("coin");
      }
      if (pickup.kind === "heart" || pickup.kind === "halfheart") {
        if (this.player.hp >= this.player.maxHp) continue;
      }
      if (pickup.kind === "item" && pickup.itemId) {
        this.giveItem(pickup.itemId);
        if (pickup.special === "library") {
          this.room.specialTaken = true;
          for (const other of pickups) {
            if (other !== pickup && other.special === "library" && other.kind === "item") {
              other.sold = true;
            }
          }
          this.showNotice("THE OTHER VOICES GO QUIET", "#c9b28b");
        }
      } else {
        this.collectPickup(pickup);
      }
      pickups.splice(i, 1);
    }
  }

  private collectPickup(pickup: Pickup): void {
    switch (pickup.kind) {
      case "coin": {
        const value = pickup.value ?? 1;
        this.player.coins += Math.max(1, Math.round(value * (1 + this.player.stats.coinBonus)));
        this.audio.play("coin");
        this.spawnBurst(pickup.x, pickup.y, "#d8a65b", 5, 60, 2, 30);
        break;
      }
      case "bomb":
        this.player.bombs = Math.min(99, this.player.bombs + 1);
        this.audio.play("key");
        this.showNotice("+1 BOMB", "#d8a65b");
        break;
      case "key":
        this.player.keys = Math.min(9, this.player.keys + 1);
        this.audio.play("key");
        this.showNotice("+1 KEY", "#d8a65b");
        break;
      case "heart":
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
        this.audio.play("heart");
        this.spawnBurst(pickup.x, pickup.y, "#b8402e", 8, 70, 3, 20);
        break;
      case "halfheart":
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        this.audio.play("heart");
        break;
      default:
        break;
    }
  }

  private giveItem(itemId: string, silent = false): void {
    const def = ITEM_BY_ID.get(itemId);
    if (!def) return;
    const kind = itemKind(def);
    if (kind === "active") {
      this.player.activeItem = def.id;
      this.player.activeCharges = def.maxCharges ?? 2;
    } else {
      def.apply?.(this.player);
    }
    this.player.items.push(itemId);
    this.offeredItems.add(itemId);
    this.player.hp = clamp(this.player.hp, 0, this.player.maxHp);
    const isNew = discoverItem(this.meta, itemId);
    if (isNew) {
      const seen = new Set(this.meta.seenItems);
      const found = ITEMS.filter((item) => seen.has(item.id)).length;
      if (found >= 20) this.award("collector");
      if (found >= 40) this.award("curator");
    }
    if (this.player.items.filter((id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as never)) === "active").length >= 3) {
      this.award("librarian");
    }
    if (this.player.items.filter((id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as never)) === "trinket").length >= 3) {
      this.award("fashion");
    }
    if (kind === "relic") this.checkTransformations();
    if (!silent) {
      this.banner = {
        itemId,
        name: def.name,
        desc: def.desc,
        life: 3.4,
        max: 3.4,
      };
      this.audio.play("item");
      this.flash = 0.35;
      this.flashColor = "rgba(216,166,91,1)";
      this.spawnBurst(this.player.x, this.player.y - 10, "#d8a65b", 16, 90, 3, 10);
      this.ui?.setActiveItem(
        this.player.activeItem,
        this.player.activeCharges,
        this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
      );
    }
    saveMeta(this.meta);
  }

  private checkTransformations(): void {
    const tags: Record<string, number> = { stitch: 0, wax: 0, drowned: 0, gilt: 0, ash: 0, hollow: 0 };
    for (const id of this.player.items) {
      const def = ITEM_BY_ID.get(id);
      if (!def || itemKind(def) !== "relic") continue;
      for (const tag of def.tags ?? []) {
        if (tag in tags) tags[tag] += 1;
      }
    }
    const sets: { tag: string; name: string; apply: () => void }[] = [
      {
        tag: "stitch",
        name: "The Stitch",
        apply: () => {
          this.player.stats.shots += 1;
          this.player.stats.fireDelay *= 0.88;
        },
      },
      {
        tag: "wax",
        name: "Waxbound",
        apply: () => {
          this.player.maxHp += 2;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
          this.player.bombs = Math.min(99, this.player.bombs + 1);
          this.player.stats.explosionSize += 0.15;
        },
      },
      {
        tag: "drowned",
        name: "The Drowned Choir",
        apply: () => {
          this.player.stats.enemySlow += 0.22;
          this.player.stats.range += 0.2;
        },
      },
      {
        tag: "gilt",
        name: "Gilded",
        apply: () => {
          this.player.stats.coinBonus += 0.35;
          this.player.stats.crit += 0.05;
        },
      },
      {
        tag: "ash",
        name: "Ashbound",
        apply: () => {
          this.player.stats.explosive += 1;
          this.player.stats.explosionSize += 0.18;
          this.player.stats.fireDelay *= 0.88;
        },
      },
      {
        tag: "hollow",
        name: "The Hollowed",
        apply: () => {
          this.player.stats.pierce += 1;
          this.player.stats.range += 0.18;
          this.player.stats.homing += 0.15;
        },
      },
    ];
    for (const set of sets) {
      if ((tags[set.tag] ?? 0) < 3 || this.player.transformations.includes(set.name)) continue;
      this.player.transformations.push(set.name);
      set.apply();
      this.run.transformed = true;
      this.award("transformation");
      this.showNotice(`TRANSFORMATION · ${set.name.toUpperCase()}`, "#d8a65b");
      this.flash = 0.5;
      this.flashColor = "rgba(216,166,91,1)";
      this.spawnBurst(this.player.x, this.player.y - 8, "#d8a65b", 24, 150, 3.5, 60);
      this.audio.play("revive");
    }
  }

  useSkill(): void {
    if (this.phase !== "playing" || this.player.dead || this.transition) return;
    const p = this.player;
    if (p.skillCd > 0.05) {
      this.showNotice(`SKILL RECHARGING · ${p.skillCd.toFixed(1)}S`, "#c9b28b");
      this.audio.play("locked", 0.5);
      return;
    }
    const skill = getCharacter(p.character).skill;
    p.skillCd = skill.cooldown;
    this.audio.play("item");
    this.showNotice(`SKILL · ${skill.name.toUpperCase()}`, skill.color);

    if (p.character === "wren") {
      const startX = p.x;
      const startY = p.y;
      const len = 190;
      let nx = p.x + p.aimX * len;
      let ny = p.y + p.aimY * len;
      for (const o of this.room.obstacles) {
        if (!obstacleBlocks(o.kind)) continue;
        if (segmentCircle(startX, startY, nx, ny, o.x + o.w / 2, o.y + o.h / 2, o.w * 0.4)) {
          nx = o.x + o.w / 2 - p.aimX * (o.w * 0.4 + 24);
          ny = o.y + o.h / 2 - p.aimY * (o.w * 0.4 + 24);
          break;
        }
      }
      p.x = clamp(nx, p.r + 2, ROOM_W - p.r - 2);
      p.y = clamp(ny, p.r + 2, ROOM_H - p.r - 2);
      p.invuln = Math.max(p.invuln, 0.55);
      for (const e of [...this.room.enemies]) {
        if (e.dead) continue;
        if (segmentCircle(startX, startY, p.x, p.y, e.x, e.y, e.r + 22)) {
          this.damageEnemy(e, 16 + p.stats.damage * 1.5, true);
        }
      }
      this.spawnBurst(startX, startY, "#c24a33", 16, 100, 3, 80);
      this.spawnBurst(p.x, p.y, "#e0a24e", 14, 110, 2.6, 20);
      this.addShake(3);
    } else if (p.character === "moth") {
      p.haste = Math.max(p.haste, 0.52);
      p.hasteTimer = Math.max(p.hasteTimer, 1.9);
      p.invuln = Math.max(p.invuln, 1.9);
      this.spawnBurst(p.x, p.y, "#cfc3a7", 28, 140, 3.2, 10);
      this.spawnBurst(p.x, p.y, "#8e846f", 18, 90, 5, 30);
      this.addShake(2);
    } else if (p.character === "cinder") {
      const radius = 142;
      for (const e of [...this.room.enemies]) {
        if (e.dead) continue;
        if (dist(e.x, e.y, p.x, p.y) < radius + e.r) {
          this.damageEnemy(e, 30 + p.stats.damage * 1.2, false);
        }
      }
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * TAU;
        this.spawnBurst(
          p.x + Math.cos(a) * radius * 0.72,
          p.y + Math.sin(a) * radius * 0.72,
          i % 2 === 0 ? "#e07a3a" : "#e0a24e",
          2,
          120,
          3.2,
          50,
        );
      }
      this.flash = 0.32;
      this.flashColor = "rgba(232,140,70,1)";
      this.addShake(8);
      this.audio.play("explode", 0.85);
    } else {
      for (const e of this.room.enemies) {
        if (!e.dead) {
          e.frozen = Math.max(e.frozen, 2.6);
          this.damageEnemy(e, 7 + p.stats.damage * 0.5, false);
        }
      }
      const count = 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + this.time * 0.4;
        const speed = p.stats.shotSpeed * 0.8;
        this.tears.push({
          x: p.x + Math.cos(a) * 16,
          y: p.y + Math.sin(a) * 16,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          r: 5.6 * p.stats.tearSize,
          damage: p.stats.damage * 0.7,
          life: 0.9,
          maxLife: 0.9,
          pierce: p.stats.pierce,
          hit: [],
          crit: false,
          poison: false,
          explosive: false,
          homing: Math.max(0.8, p.stats.homing),
          size: p.stats.tearSize,
          t: 0,
          color: "#d8cfb9",
          bounces: p.stats.bounces,
        });
      }
      this.spawnBurst(p.x, p.y, "#9eb6ac", 26, 130, 3, 10);
      this.audio.play("bossdie", 0.55);
      this.addShake(3);
    }
    this.ui?.setSkill(p.skillCd, skill.cooldown);
  }

  useActiveItem(): void {
    if (this.phase !== "playing" || this.player.dead) return;
    const def = this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem) : null;
    if (!def) {
      this.showNotice("NO ACTIVE RELIC", "#c9b28b");
      return;
    }
    if (this.player.activeCharges <= 0) {
      this.showNotice("THE CHARGE IS SPENT", "#c9b28b");
      this.audio.play("locked");
      return;
    }
    const effect = def.activeEffect;
    if (!effect) return;
    const p = this.player;
    switch (effect.type) {
      case "blast": {
        for (const e of [...this.room.enemies]) {
          if (e.dead) continue;
          if (dist(e.x, e.y, p.x, p.y) < effect.radius + e.r) {
            this.damageEnemy(e, effect.damage, false);
          }
        }
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * TAU;
          this.spawnBurst(
            p.x + Math.cos(a) * effect.radius * 0.7,
            p.y + Math.sin(a) * effect.radius * 0.7,
            "#e0a24e",
            2,
            110,
            3,
            50,
          );
        }
        this.addShake(9);
        this.flash = 0.4;
        this.flashColor = "rgba(232,179,108,1)";
        this.audio.play("explode");
        break;
      }
      case "heal": {
        p.hp = Math.min(p.maxHp, p.hp + effect.amount);
        this.audio.play("heart");
        this.spawnBurst(p.x, p.y - 10, "#b8402e", 18, 80, 3, 20);
        break;
      }
      case "freeze": {
        for (const e of this.room.enemies) {
          if (!e.dead) e.frozen = Math.max(e.frozen, effect.duration);
        }
        this.audio.play("bossdie");
        this.addShake(3);
        this.spawnBurst(p.x, p.y, "#b9d8dc", 24, 130, 3, 10);
        break;
      }
      case "volley": {
        const count = effect.count;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU;
          const speed = p.stats.shotSpeed;
          this.tears.push({
            x: p.x + Math.cos(a) * 16,
            y: p.y + Math.sin(a) * 16,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            r: 6.4 * p.stats.tearSize,
            damage: p.stats.damage * 0.8,
            life: 0.7,
            maxLife: 0.7,
            pierce: p.stats.pierce,
            hit: [],
            crit: false,
            poison: p.stats.poison > 0,
            explosive: p.stats.explosive > 0,
            homing: p.stats.homing,
            size: p.stats.tearSize,
            t: 0,
            color: "#171311",
            bounces: p.stats.bounces,
          });
        }
        this.audio.play("shoot");
        this.addShake(2);
        break;
      }
      case "reveal": {
        this.mapRevealed = true;
        this.showNotice("THE HOUSE OPENS ITS EYES", "#d8a65b");
        this.audio.play("door");
        break;
      }
      case "shield": {
        p.invuln = Math.max(p.invuln, effect.duration);
        this.showNotice("THE ROOTS HOLD", "#8fae64");
        this.audio.play("heart");
        break;
      }
      case "blink": {
        const spot = this.findFreeSpot(this.rng, 0, this.room.obstacles, 46);
        if (spot) {
          this.spawnBurst(p.x, p.y, "#c24a33", 12, 90, 3, 40);
          p.x = spot.x;
          p.y = spot.y;
          this.shots = [];
          p.invuln = Math.max(p.invuln, 0.6);
          this.spawnBurst(p.x, p.y, "#c24a33", 12, 90, 3, 40);
          this.audio.play("door");
        }
        break;
      }
      case "coins": {
        p.coins += effect.amount;
        this.audio.play("coin");
        this.spawnBurst(p.x, p.y, "#d8a65b", 18, 90, 3, 20);
        if (p.coins >= 40) this.award("deep-pockets");
        break;
      }
      case "reroll": {
        const rng = this.rng;
        let changed = 0;
        for (const pickup of this.room.pickups) {
          if (pickup.kind !== "item" || !pickup.itemId || pickup.sold) continue;
          const old = ITEM_BY_ID.get(pickup.itemId);
          const kind = old ? itemKind(old) : "relic";
          pickup.itemId = this.pickItemKind(kind, rng);
          changed += 1;
        }
        this.showNotice(changed ? "THE LEDGER REWRITES ITSELF" : "NOTHING TO REWRITE", "#d8a65b");
        this.audio.play("item");
        break;
      }
      case "rain": {
        const count = effect.count;
        for (let i = 0; i < count; i++) {
          const x = 30 + Math.random() * (ROOM_W - 60);
          const speed = 300 + Math.random() * 90;
          this.tears.push({
            x,
            y: 10 + Math.random() * 32,
            vx: (Math.random() - 0.5) * 40,
            vy: speed,
            r: 6 * p.stats.tearSize,
            damage: p.stats.damage * 0.62,
            life: 2.4,
            maxLife: 2.4,
            pierce: p.stats.pierce,
            hit: [],
            crit: false,
            poison: p.stats.poison > 0,
            explosive: p.stats.explosive > 0,
            homing: 0,
            size: p.stats.tearSize,
            t: 0,
            color: "#171311",
            bounces: p.stats.bounces,
          });
        }
        this.audio.play("bossdie", 0.45);
        this.addShake(4);
        this.spawnBurst(p.x, p.y, "#9eb6ac", 18, 120, 3, 30);
        break;
      }
      case "magnet": {
        let pulled = 0;
        for (const pickup of this.room.pickups) {
          if (!["coin", "bomb", "key", "heart", "halfheart"].includes(pickup.kind)) continue;
          if (dist(pickup.x, pickup.y, p.x, p.y) > effect.radius) continue;
          const a = Math.random() * TAU;
          pickup.x = p.x + Math.cos(a) * 20;
          pickup.y = p.y + Math.sin(a) * 20;
          pulled += 1;
        }
        this.showNotice(pulled ? "THE GRAVE GIVES BACK" : "NOTHING LOOSE TO TAKE", "#d8a65b");
        this.audio.play(pulled ? "coin" : "locked", 0.7);
        this.spawnBurst(p.x, p.y, "#d8a65b", 16, 100, 3, 20);
        break;
      }
      case "bombs": {
        for (let i = 0; i < effect.count; i++) {
          const a = (i / effect.count) * TAU + this.time * 0.4;
          const bx = clamp(p.x + Math.cos(a) * 90, 28, ROOM_W - 28);
          const by = clamp(p.y + Math.sin(a) * 70, 28, ROOM_H - 28);
          this.bombs.push({
            x: bx,
            y: by,
            fuse: 1.35 + i * 0.12,
            radius: 90 * p.stats.explosionSize,
            t: 0,
          });
        }
        this.audio.play("bomb");
        this.addShake(2);
        break;
      }
      case "warcry": {
        for (const e of [...this.room.enemies]) {
          if (e.dead) continue;
          if (dist(e.x, e.y, p.x, p.y) < effect.radius + e.r) {
            this.damageEnemy(e, effect.damage, false);
            e.frozen = Math.max(e.frozen, 0.6);
          }
        }
        p.invuln = Math.max(p.invuln, 1.6);
        this.flash = 0.28;
        this.flashColor = "rgba(216,203,173,1)";
        this.spawnBurst(p.x, p.y, "#d8cbb0", 28, 150, 3.4, 20);
        this.addShake(7);
        this.audio.play("bossdie", 0.6);
        break;
      }
      case "root": {
        for (const e of this.room.enemies) {
          if (e.dead) continue;
          e.frozen = Math.max(e.frozen, effect.duration);
          e.poison = Math.max(e.poison, effect.duration + 1.2);
          e.poisonTick = Math.min(e.poisonTick, 0.2);
          this.damageEnemy(e, effect.damage, false);
        }
        this.spawnBurst(p.x, p.y, "#8fae64", 24, 130, 3, 20);
        this.addShake(3);
        this.audio.play("bossdie", 0.5);
        break;
      }
      case "dash": {
        const steps = 14;
        const step = effect.distance / steps;
        let tx = p.x;
        let ty = p.y;
        for (let i = 0; i < steps; i++) {
          const nx = clamp(tx + p.aimX * step, p.r + 2, ROOM_W - p.r - 2);
          const ny = clamp(ty + p.aimY * step, p.r + 2, ROOM_H - p.r - 2);
          let blocked = false;
          for (const o of this.room.obstacles) {
            if (!obstacleBlocks(o.kind)) continue;
            if (circleRect(nx, ny, p.r, o.x, o.y, o.w, o.h)) {
              blocked = true;
              break;
            }
          }
          if (blocked) break;
          tx = nx;
          ty = ny;
        }
        this.spawnBurst(p.x, p.y, "#c24a33", 14, 100, 3, 50);
        p.x = tx;
        p.y = ty;
        p.invuln = Math.max(p.invuln, 0.5);
        this.spawnBurst(p.x, p.y, "#c24a33", 14, 100, 3, 50);
        this.audio.play("door");
        break;
      }
    }
    this.player.activeCharges -= 1;
    this.audio.play("item");
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      def.maxCharges ?? 0,
    );
  }

  private updateOrbitals(dt: number): void {
    const count = this.player.stats.orbitals;
    if (!count) return;
    for (const e of this.room.enemies) {
      if (e.dead) continue;
      for (let i = 0; i < count; i++) {
        const a = this.time * 2.1 + (i / count) * TAU;
        const ox = this.player.x + Math.cos(a) * 44;
        const oy = this.player.y + Math.sin(a) * 44;
        if (dist(ox, oy, e.x, e.y) < 14 + e.r) {
          const next = this.orbitalNext.get(e.id) ?? 0;
          if (this.time >= next) {
            this.orbitalNext.set(e.id, this.time + 0.4);
            this.damageEnemy(e, 4.5, false);
          }
        }
      }
    }
    void dt;
  }

  private checkContact(dt: number): void {
    if (this.player.invuln > 0) return;
    for (const e of this.room.enemies) {
      if (e.dead) continue;
      if (dist(e.x, e.y, this.player.x, this.player.y) < e.r + this.player.r - 3) {
        this.hurtPlayer(e.touch);
        break;
      }
    }
    void dt;
  }

  private checkHazards(): void {
    if (this.player.invuln > 0) return;
    for (const o of this.room.obstacles) {
      if (o.kind !== "spike" && o.kind !== "brazier") continue;
      if (circleRect(this.player.x, this.player.y, this.player.r, o.x, o.y, o.w, o.h)) {
        this.hurtPlayer(o.kind === "brazier" ? 2 : 1);
        break;
      }
    }
  }

  private damageEnemy(e: Enemy, dmg: number, crit: boolean): void {
    if (e.dead) return;
    if (e.shielded > 0) {
      e.shielded -= 1;
      e.flash = 0.4;
      this.audio.play("locked");
      this.spawnBurst(e.x, e.y, "#e0c184", 8, 80, 2.5, 40);
      return;
    }
    e.hp -= dmg;
    e.flash = 0.35;
    const isBoss = e.kind === "boss";
    if (this.damageNumbers) {
      this.addText(
        e.x + (Math.random() - 0.5) * 14,
        e.y - e.r - 6,
        String(Math.max(1, Math.round(dmg))),
        crit ? "#e6c47d" : isBoss ? "#e2c5a2" : "#d8c7a8",
        crit ? 18 : 13,
      );
    }
    this.spawnBurst(
      e.x,
      e.y - e.r * 0.3,
      crit ? "#c24a33" : "#8d3028",
      crit ? 8 : 3,
      crit ? 110 : 65,
      crit ? 3.4 : 2.2,
      160,
    );
    if (crit) this.audio.play("crit");
    else this.audio.play("hit");
    if (e.hp <= 0) e.dead = true;
  }

  private processDeaths(): void {
    for (const e of this.room.enemies) {
      if (!e.dead || this.processed.has(e.id)) continue;
      this.processed.add(e.id);
      if (e.kind === "boss") {
        this.handleBossDeath(e);
      } else {
        this.run.kills += 1;
        recordKill(this.meta, e.kind);
        discoverEnemy(this.meta, e.kind);
        if (e.elite === "stitched") {
          this.spawnEnemyAt("moth", e.x - 20, e.y);
          this.spawnEnemyAt("moth", e.x + 20, e.y);
        }
        if (e.elite === "bloated" || e.kind === "spore") {
          const count = e.elite === "bloated" ? 10 : 7;
          for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU + e.seed * 0.01;
            this.shots.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 165,
              vy: Math.sin(a) * 165,
              r: 5,
              damage: 1,
              life: 5,
              kind: "wax",
              t: 0,
              angle: a,
            });
          }
          this.spawnBurst(e.x, e.y, "#c9a06a", 14, 100, 3.4, 90);
          this.addShake(3);
        }
        if (e.elite === "gilded") {
          for (let i = 0; i < 3; i++) {
            this.room.pickups.push(makePickup("coin", e.x + (i - 1) * 16, e.y + i * 6, { value: 1 }));
          }
        }
        if (e.kind === "grub") {
          this.spawnEnemyAt("swarmling", e.x - 18, e.y + 8);
          this.spawnEnemyAt("swarmling", e.x + 18, e.y - 8);
        } else if (e.kind === "maw") {
          this.spawnEnemyAt("moth", e.x - 22, e.y - 12);
          this.spawnEnemyAt("moth", e.x + 22, e.y + 12);
        } else if (e.kind === "mimic") {
          this.room.pickups.push(makePickup("coin", e.x, e.y, { value: 4 }));
        }
        this.spawnBurst(e.x, e.y, "#7c2a24", 12, 105, 3.2, 180);
        this.spawnBurst(e.x, e.y, "rgba(30,23,18,0.8)", 8, 70, 4.5, 80);
        this.addShake(1.4);
        const roll = Math.random();
        if (roll < 0.18) {
          this.room.pickups.push(
            makePickup("coin", e.x, e.y, { value: 1 + Math.floor(Math.random() * 2) }),
          );
        } else if (roll < 0.23) {
          this.room.pickups.push(makePickup("halfheart", e.x, e.y));
        } else if (roll < 0.27) {
          this.room.pickups.push(makePickup("key", e.x, e.y));
        } else if (roll < 0.31) {
          this.room.pickups.push(makePickup("bomb", e.x, e.y));
        }
      }
    }
    this.room.enemies = this.room.enemies.filter((e) => !e.dead);
    if (this.meta.stats.kills >= 100) this.award("bestiary");
    saveMeta(this.meta);
  }

  private handleBossDeath(e: Enemy): void {
    if (this.room.bossDropped) return;
    this.room.bossDropped = true;
    this.room.cleared = true;
    this.room.lootRolled = true;
    this.bossIntro = 0;
    this.run.kills += 1;
    this.floorBossesCleared += 1;
    const kind = e.boss;
    if (kind) {
      recordKill(this.meta, `boss:${kind}`);
      discoverEnemy(this.meta, `boss:${kind}`);
      this.meta.stats.bossKills += 1;
    }
    this.shake = 16;
    this.slowmo = 1.1;
    this.hitstop = 0.22;
    this.audio.play("bossdie");
    this.voice.stop();
    this.audio.setIntensity(0);
    this.spawnBurst(e.x, e.y, "#d8a65b", 34, 230, 4.5, 120);
    this.spawnBurst(e.x, e.y, "#8d3028", 30, 170, 4, 200);
    this.spawnBurst(e.x, e.y, "rgba(20,14,11,0.9)", 20, 100, 7, 40);
    this.shots = [];
    this.addShake(10);
    const mini = isMiniBoss(kind);
    const rng = new Rng(mixSeed(this.seed, this.floorIndex, mini ? 0x5a1e : 0xb055));
    const reward = mini
      ? this.pickItemKind(rng.chance(0.5) ? "active" : "trinket", rng)
      : this.pickItemKind("relic", rng);
    this.room.pickups.push(
      makePickup("item", ROOM_W / 2, ROOM_H * 0.42, { itemId: reward, boss: true }),
    );
    if (!mini) {
      this.room.pickups.push(makePickup("trapdoor", ROOM_W / 2, ROOM_H * 0.72));
    } else {
      this.room.pickups.push(makePickup("coin", ROOM_W / 2 - 100, ROOM_H * 0.68, { value: 5 }));
      this.award("miniboss");
    }
    for (const minion of this.room.enemies) {
      if (minion !== e && !minion.dead) {
        minion.dead = true;
        this.processed.add(minion.id);
        this.spawnBurst(minion.x, minion.y, "rgba(30,20,16,0.8)", 5, 60, 3, 50);
      }
    }
    if (this.bossRoomDamage <= 0) this.award("unwounded");
    if (kind === "glutton") this.award("glutton");
    if (kind === "weaver") this.award("weaver");
    if (kind === "drowned") this.award("drowned");
    if (kind === "orchard") this.award("orchard");
    if (kind === "heart") this.award("heart");
    if (kind) discoverEnemy(this.meta, `boss:${kind}`);
    if (this.meta.kills["boss:glutton"] && this.meta.kills["boss:weaver"] && this.meta.kills["boss:drowned"] && this.meta.kills["boss:orchard"] && this.meta.kills["boss:heart"]) {
      this.award("five-names");
    }
    this.saveMeta();
    this.showNotice(
      mini
        ? "THE SERVANT FALLS · THE LEDGER OPENS"
        : this.floorIndex === THEMES.length - 1
          ? "THE HEART STOPS · STEP INTO THE THREAD"
          : "THE KEEPER FALLS · THE HATCH OPENS",
      "#d8a65b",
    );
  }

  private checkRoomClear(): void {
    if (this.room.cleared) return;
    if (this.room.enemies.length > 0) return;
    if (this.room.obstacles.some((o) => o.kind === "nest")) return;
    if (this.room.type === "combat" && this.room.wave < this.room.maxWaves) {
      if (this.spawnNextWave()) return;
    }
    this.room.cleared = true;
    this.shots = [];
    this.audio.play("door");
    if (this.room.type === "combat" && !this.room.lootRolled) {
      this.room.lootRolled = true;
      const rng = new Rng(this.room.seed ^ 0x55aa22);
      const drops: Pickup[] = [];
      if (rng.chance(0.62)) {
        drops.push(
          makePickup("coin", ROOM_W / 2 + rng.range(-90, 90), ROOM_H / 2 + rng.range(-50, 50), {
            value: 1 + rng.int(4),
          }),
        );
      }
      if (rng.chance(0.22) && this.floor.curse !== "famine") {
        drops.push(
          makePickup("heart", ROOM_W / 2 + rng.range(-90, 90), ROOM_H / 2 + rng.range(-50, 50)),
        );
      }
      if (rng.chance(0.1)) {
        drops.push(makePickup("key", ROOM_W / 2 + rng.range(-70, 70), ROOM_H / 2 + rng.range(-40, 40)));
      }
      if (rng.chance(0.12)) {
        drops.push(makePickup("bomb", ROOM_W / 2 + rng.range(-70, 70), ROOM_H / 2 + rng.range(-40, 40)));
      }
      this.room.pickups.push(...drops);
    }
    if (this.player.activeItem && this.player.activeCharges < (ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0)) {
      this.player.activeCharges += 1;
      this.ui?.setActiveItem(
        this.player.activeItem,
        this.player.activeCharges,
        ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0,
      );
    }
    this.audio.setIntensity(0);
    this.showNotice("THE ROOM EXHALES", "#c9b28b");
  }

  private hurtPlayer(amount: number): void {
    const p = this.player;
    if (p.invuln > 0 || p.dead) return;
    const actual = Math.max(1, amount - Math.round(p.stats.armor));
    p.hp -= actual;
    this.run.damageTaken += actual;
    this.floorDamageTaken += actual;
    this.bossRoomDamage += actual;
    p.invuln = 1.15;
    p.hitFlash = 0.5;
    this.flash = 0.55;
    this.flashColor = "rgba(150,25,20,1)";
    this.addShake(9);
    this.audio.play("hurt");
    this.spawnBurst(p.x, p.y - 4, "#8d3028", 14, 120, 3.4, 180);
    this.addText(p.x, p.y - 34, actual >= 2 ? "WOUNDED" : "HURT", "#e3a48f", 13);
    if (p.hp <= 0) {
      if (p.stats.revives > 0 && !p.reviveUsed) {
        p.reviveUsed = true;
        p.dead = false;
        this.run.revived = true;
        this.award("second-wind");
        p.hp = Math.min(p.maxHp, 4);
        p.invuln = 2.4;
        this.flash = 1;
        this.flashColor = "rgba(216,166,91,1)";
        this.audio.play("revive");
        this.showNotice("THE SECOND THREAD HOLDS", "#d8a65b");
        this.spawnBurst(p.x, p.y, "#d8a65b", 30, 170, 3.4, 60);
      } else {
        p.hp = 0;
        p.dead = true;
        p.dead = true;
        this.deathTimer = 1.65;
        this.deathFxDone = false;
        this.hintLife = 0;
        this.audio.stopAmbient();
      }
    }
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  }

  private checkDoors(move: { x: number; y: number }): void {
    const p = this.player;
    if (this.doorNoticeCd > 0) return;
    const near = {
      n: p.y < 26 && Math.abs(p.x - ROOM_W / 2) < 50,
      s: p.y > ROOM_H - 26 && Math.abs(p.x - ROOM_W / 2) < 50,
      w: p.x < 26 && Math.abs(p.y - ROOM_H / 2) < 50,
      e: p.x > ROOM_W - 26 && Math.abs(p.y - ROOM_H / 2) < 50,
    };
    const dirs: Dir[] = ["n", "s", "w", "e"];
    for (const dir of dirs) {
      if (!near[dir]) continue;
      const off = DIR_OFFSETS[dir];
      if (move.x * off.x + move.y * off.y < 0.4) continue;
      const target = this.room.doors[dir];
      if (!target) continue;
      const state = this.getDoorState(this.room, dir);
      if (state === "closed") {
        this.showNotice("SEALED UNTIL THE ROOM IS QUIET", "#c9b28b");
        this.doorNoticeCd = 1.5;
        this.audio.play("locked");
        return;
      }
      if (state === "locked") {
        if (this.player.keys > 0) {
          this.player.keys -= 1;
          target.unlocked = true;
          this.audio.play("key");
          this.showNotice("THE LOCK TURNS", "#d8a65b");
          this.beginTransition(dir);
        } else {
          this.showNotice("LOCKED · A KEY WOULD TURN IT", "#d8a65b");
          this.audio.play("locked");
          this.doorNoticeCd = 1.5;
        }
        return;
      }
      this.beginTransition(dir);
      return;
    }
  }

  private beginTransition(dir: Dir): void {
    const target = this.room.doors[dir];
    if (!target || this.transition) return;
    this.transition = { t: 0, dur: 0.42, dir, target, swapped: false };
    this.audio.play("door");
    this.input.clearBomb();
  }

  private checkTrapdoor(): void {
    if (this.player.dead) return;
    for (const pickup of this.room.pickups) {
      if (pickup.kind !== "trapdoor") continue;
      if (dist(pickup.x, pickup.y, this.player.x, this.player.y) < 36) {
        this.descendOrWin();
        return;
      }
    }
  }

  private descendOrWin(): void {
    if (this.phase !== "playing") return;
    if (this.floor.curse) {
      this.meta.stats.curses += 1;
      this.award("cursed");
    }
    if (this.floorDamageTaken <= 0) this.award("flawless");
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.audio.setIntensity(0);
    this.voice.stop();
    if (this.floorIndex >= THEMES.length - 1) {
      this.finish(true);
      return;
    }
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
    this.player.bombs = Math.min(99, this.player.bombs + 1);
    this.player.keys = Math.min(9, this.player.keys + 1);
    this.buildFloor(this.floorIndex + 1);
    this.phase = "chapter";
    this.ioFlashChapter();
  }

  private ioFlashChapter(): void {
    this.ui?.showChapter(this.theme);
  }

  getDoorState(room: Room, dir: Dir): DoorVisual | null {
    const target = room.doors[dir];
    if (!target) return null;
    if (this.room === room && this.room.enemies.some((e) => !e.dead)) return "closed";
    if (target.type === "treasure" && !target.unlocked) return "locked";
    if (target.type === "boss") return "boss";
    return "open";
  }

  // -------------------------------------------------------------------------
  // Helpers & FX
  // -------------------------------------------------------------------------

  private tryRevealSecret(x: number, y: number): void {
    if (!this.room.secretDir || this.room.secretOpened || !this.floor.secret) return;
    const dir = this.room.secretDir;
    const points: Record<Dir, { x: number; y: number }> = {
      n: { x: ROOM_W / 2, y: 0 },
      s: { x: ROOM_W / 2, y: ROOM_H },
      w: { x: 0, y: ROOM_H / 2 },
      e: { x: ROOM_W, y: ROOM_H / 2 },
    };
    const wall = points[dir];
    if (dist(x, y, wall.x, wall.y) > 125) return;
    const secret = this.floor.secret;
    this.room.secretOpened = true;
    this.room.doors[dir] = secret;
    secret.doors[OPPOSITE[dir]] = this.room;
    secret.unlocked = true;
    this.spawnBurst(wall.x, wall.y, "#8d3028", 22, 110, 3, 80);
    this.spawnBurst(wall.x, wall.y, "#e0a24e", 10, 80, 2, 20);
    this.audio.play("door");
    this.audio.play("item");
    this.showNotice("A WALL GIVES WAY · SOMETHING IS BEHIND IT", "#d8a65b");
  }

  private drawSecretCrack(ctx: CanvasRenderingContext2D): void {
    const dir = this.room.secretDir;
    if (!dir || this.room.secretOpened) return;
    const points: Record<Dir, { x: number; y: number; a: number }> = {
      n: { x: ROOM_X + ROOM_W / 2, y: ROOM_Y - WALL / 2, a: 0 },
      s: { x: ROOM_X + ROOM_W / 2, y: ROOM_Y + ROOM_H + WALL / 2, a: Math.PI },
      w: { x: ROOM_X - WALL / 2, y: ROOM_Y + ROOM_H / 2, a: -Math.PI / 2 },
      e: { x: ROOM_X + ROOM_W + WALL / 2, y: ROOM_Y + ROOM_H / 2, a: Math.PI / 2 },
    };
    const p = points[dir];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.strokeStyle = "rgba(12,9,6,0.75)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-26, -14);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-18, 8);
    ctx.moveTo(9, -14);
    ctx.lineTo(2, -2);
    ctx.lineTo(14, 4);
    ctx.lineTo(8, 14);
    ctx.moveTo(-18, 8);
    ctx.lineTo(-4, 16);
    ctx.stroke();
    ctx.strokeStyle = "rgba(194,74,51,0.5)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-22, 15);
    ctx.quadraticCurveTo(0, 8, 22, 16);
    ctx.stroke();
    ctx.fillStyle = "rgba(194,74,51,0.7)";
    ctx.beginPath();
    ctx.arc(0, 12, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private makeCombatContext(): CombatContext {
    return {
      player: this.player,
      room: this.room,
      obstacles: this.room.obstacles,
      floorIndex: this.floorIndex,
      time: this.time,
      rng: this.rng,
      spawnShot: (x, y, vx, vy, kind, damage = 1, radius = 5) => {
        this.shots.push({
          x,
          y,
          vx,
          vy,
          r: radius,
          damage,
          life: 6,
          kind,
          t: 0,
          angle: Math.atan2(vy, vx),
        });
      },
      spawnEnemy: (kind, x, y) => this.spawnEnemyAt(kind, x, y),
      telegraph: (x, y, r, delay, color = "rgba(194,74,51,0.8)") => {
        this.telegraphs.push({ x, y, r, life: delay, max: delay, color });
      },
      shake: (amount) => this.addShake(amount),
    };
  }

  private splatTear(tear: Tear): void {
    this.spawnBurst(tear.x, tear.y, tear.poison ? "#6f8b52" : "#1b1512", 3, 50, 2.4, 140);
    this.audio.play("splat");
  }

  addShake(amount: number): void {
    this.shake = Math.min(20, this.shake + amount);
  }

  private spawnBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    size: number,
    gravity: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.35 + Math.random() * 0.75);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.3 + Math.random() * 0.55,
        maxLife: 0.85,
        size: size * (0.5 + Math.random() * 0.8),
        color,
        gravity,
        shape: Math.random() < 0.18 ? "line" : "dot",
        spin: Math.random() * TAU,
      });
    }
  }

  private addText(x: number, y: number, text: string, color: string, size: number): void {
    this.texts.push({
      x,
      y,
      text,
      life: 0.85,
      maxLife: 0.85,
      color,
      size,
    });
  }

  private showNotice(text: string, color?: string): void {
    this.notice = { text, life: 2.1, max: 2.1, color };
  }

  private getBoss(): Enemy | null {
    return this.room.enemies.find((e) => e.kind === "boss" && !e.dead) ?? null;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  render(): void {
    const canvas = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || window.innerWidth || VIEW_W;
    const cssH = canvas.clientHeight || window.innerHeight || VIEW_H;
    const targetW = Math.max(1, Math.round(cssW * dpr));
    const targetH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#080706";
    ctx.fillRect(0, 0, cssW, cssH);
    // Landscape gameplay is full-height: the whole room (top wall to bottom
    // wall) is fitted to the screen, with stage art filling the side rails.
    // The HUD is drawn in two clipped passes so its top and bottom rows stay
    // inside the screen. Portrait keeps the whole design field visible.
    const portrait = cssH >= cssW;
    // Full-bleed is only for a phone in landscape. Desktop/editor previews
    // and tablets keep the complete design field so nothing feels cropped.
    this.fullBleed = !portrait && this.input.hasTouch && cssW / cssH >= 1.9;
    if (this.fullBleed) {
      // Fit the complete visual room — floor plus its 40px stone walls —
      // not just the walkable floor. This keeps the top and bottom walls
      // on screen while the side rails carry the stage art.
      const visualW = ROOM_W + WALL * 2;
      const visualH = ROOM_H + WALL * 2;
      const pad = Math.max(12, Math.min(28, cssH * 0.04));
      const scale = (cssH - pad * 2) / visualH;
      const ox = (cssW - visualW * scale) / 2;
      this.worldScale = scale;
      this.worldX = ox - (ROOM_X - WALL) * scale;
      this.worldY = pad - (ROOM_Y - WALL) * scale;
      this.hudCrop = 0;
      this.view = { scale, ox: this.worldX, oy: this.worldY };
      this.input.setView(this.view);
      this.drawSurround(ctx, cssW, cssH);
      ctx.save();
      ctx.translate(this.worldX, this.worldY);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_W, VIEW_H);
      ctx.clip();
      this.drawFrame(ctx);
      ctx.restore();
      this.drawFullBleedHud(ctx, cssW, cssH);
    } else {
      const scale = Math.min(cssW / VIEW_W, cssH / VIEW_H);
      const ox = (cssW - VIEW_W * scale) / 2;
      const oy = (cssH - VIEW_H * scale) / 2;
      this.hudCrop = 0;
      this.view = { scale, ox, oy };
      this.input.setView(this.view);
      this.drawSurround(ctx, cssW, cssH);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_W, VIEW_H);
      ctx.clip();
      this.drawFrame(ctx);
      ctx.restore();
    }
    // Draw the floating D-pad in screen space so it can sit over the
    // letterbox in portrait and remains finger-sized on every display.
    if (this.input.hasTouch && this.phase === "playing") {
      drawTouchSticks(ctx, this.input.sticks());
    }
  }

  private drawFullBleedHud(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.phase === "title" || this.phase === "chapter" || this.phase === "intro") return;
    const scale = this.worldScale;
    const wx = this.worldX;
    const wy = this.worldY;
    const hud = this.getHudData();
    const topShift = 18 - (wy + 23 * scale);
    const bottomShift = wy + (VIEW_H - 32) * scale - (h - 18);
    const top = ctx.createLinearGradient(0, 0, 0, 96);
    top.addColorStop(0, "rgba(6,5,4,0.94)");
    top.addColorStop(1, "rgba(6,5,4,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, 96);
    const bottom = ctx.createLinearGradient(0, h, 0, h - 96);
    bottom.addColorStop(0, "rgba(6,5,4,0.94)");
    bottom.addColorStop(1, "rgba(6,5,4,0)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h - 96, w, 96);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h / 2);
    ctx.clip();
    ctx.translate(wx, wy + topShift);
    ctx.scale(scale, scale);
    drawHud(ctx, hud, this.time);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h / 2, w, h / 2);
    ctx.clip();
    ctx.translate(wx, wy - bottomShift);
    ctx.scale(scale, scale);
    drawHud(ctx, hud, this.time);
    ctx.restore();
  }

  private drawSurround(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const img = backdropFor(this.floorIndex);
    if (img.complete && img.naturalWidth > 0) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 90, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
      grad.addColorStop(0, "rgba(28,22,17,0.34)");
      grad.addColorStop(1, "rgba(4,3,3,0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    // The chapter art becomes a full-screen stage instead of dead letterbox.
    ctx.fillStyle = "rgba(5,4,3,0.62)";
    ctx.fillRect(0, 0, w, h);
    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.46, 90, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    vignette.addColorStop(0, "rgba(5,4,3,0)");
    vignette.addColorStop(1, "rgba(3,2,2,0.86)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    // A thin red thread and a stitched frame make the unused area intentional.
    ctx.save();
    ctx.strokeStyle = "rgba(184,64,47,0.14)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.22);
    ctx.bezierCurveTo(w * 0.3, h * 0.08, w * 0.68, h * 0.9, w, h * 0.7);
    ctx.stroke();
    const fw = VIEW_W * (this.view.scale || 1);
    const fh = VIEW_H * (this.view.scale || 1);
    const fx = (w - fw) / 2;
    const fy = (h - fh) / 2;
    ctx.strokeStyle = "rgba(216,166,91,0.26)";
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 14]);
    ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(184,64,47,0.32)";
    ctx.strokeRect(fx + 4.5, fy + 4.5, fw - 9, fh - 9);
    // A little stitched corner at each end of the stage.
    ctx.strokeStyle = "rgba(216,166,91,0.42)";
    const corner = 18;
    for (const [cx, cy, sx, sy] of [
      [fx + 10, fy + 10, 1, 1],
      [fx + fw - 10, fy + 10, -1, 1],
      [fx + 10, fy + fh - 10, 1, -1],
      [fx + fw - 10, fy + fh - 10, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * corner);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * corner, cy);
      ctx.stroke();
    }
    // Chapter lettering in the empty portrait band or landscape side rails.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fieldTop = (h - fh) / 2;
    if (fieldTop > 92) {
      ctx.globalAlpha = 0.68;
      ctx.fillStyle = "rgba(216,166,91,0.72)";
      ctx.font = "400 38px 'IM Fell English SC', Georgia, serif";
      ctx.fillText(`${this.theme.numeral} · ${this.theme.name.toUpperCase()}`, w / 2, fieldTop - 42);
      ctx.fillStyle = "rgba(201,178,139,0.6)";
      ctx.font = "400 12px Alegreya, Georgia, serif";
      ctx.fillText("KEEP THE THREAD", w / 2, fieldTop - 20);
    }
    const fieldBottom = (h + fh) / 2;
    if (h - fieldBottom > 110) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "rgba(216,166,91,0.7)";
      ctx.font = "400 19px 'IM Fell English SC', Georgia, serif";
      ctx.fillText("BOUND BELOW", w / 2, h - 58);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(201,178,139,0.65)";
      ctx.font = "400 9px Alegreya, Georgia, serif";
      ctx.fillText("THE HOUSE REMEMBERS EVERY DESCENT", w / 2, h - 38);
      ctx.strokeStyle = "rgba(184,64,47,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 78, h - 74);
      ctx.lineTo(w / 2 + 78, h - 74);
      ctx.stroke();
    }
    const side = (w - fw) / 2;
    if (side > 76) {
      ctx.save();
      ctx.translate(side * 0.5, h * 0.5);
      ctx.rotate(-Math.PI / 2);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(216,166,91,0.68)";
      ctx.font = "400 26px 'IM Fell English SC', Georgia, serif";
      ctx.fillText(`${this.theme.numeral} · ${this.theme.name.toUpperCase()}`, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(w - side * 0.5, h * 0.5);
      ctx.rotate(Math.PI / 2);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(201,178,139,0.55)";
      ctx.font = "400 11px Alegreya, Georgia, serif";
      ctx.fillText("BOUND BELOW · KEEP THE THREAD", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawFrame(ctx: CanvasRenderingContext2D): void {
    // background inside design field
    ctx.fillStyle = "rgba(8,6,5,0.18)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (!this.room) return;
    const shakeAmt = this.reducedMotion ? 0 : this.shake * this.shakeScale;
    const sx = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
    const sy = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
    ctx.save();
    ctx.translate(sx, sy);

    this.renderer.drawBackdrop(ctx, this.room, this.theme, this.time);
    this.renderer.drawDoors(ctx, this.room, this.theme, this.time, (dir) =>
      this.getDoorState(this.room, dir),
    );
    this.drawSecretCrack(ctx);
    ctx.save();
    ctx.translate(ROOM_X, ROOM_Y);
    this.drawTelegraphs(ctx);
    for (const o of this.room.obstacles) {
      drawObstacleSafe(ctx, o);
    }
    for (const pickup of this.room.pickups) {
      drawPickup(ctx, pickup, this.time, this.theme.palette.accent);
    }
    this.drawActors(ctx);
    this.drawPickupPrices(ctx);
    for (const tear of this.tears) drawTear(ctx, tear);
    for (const shot of this.shots) drawShot(ctx, shot);
    for (const bomb of this.bombs) drawBombArt(ctx, bomb, this.time);
    this.drawOrbitals(ctx);
    this.drawParticles(ctx);
    this.drawTexts(ctx);
    ctx.restore();
    this.renderer.drawLighting(ctx, this.theme, this.floorIndex);
    this.drawPlayerLight(ctx);
    if (this.floor.curse === "darkness") this.drawDarkness(ctx);
    ctx.restore();

    // HUD
    if (
      !this.fullBleed &&
      this.phase !== "title" &&
      this.phase !== "chapter" &&
      this.phase !== "intro"
    ) {
      const bottomFade = ctx.createLinearGradient(0, VIEW_H, 0, VIEW_H - 76);
      bottomFade.addColorStop(0, "rgba(7,5,4,0.9)");
      bottomFade.addColorStop(1, "rgba(7,5,4,0)");
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, VIEW_H - 76, VIEW_W, 76);
      const topFade = ctx.createLinearGradient(0, 0, 0, ROOM_Y + 16);
      topFade.addColorStop(0, "rgba(7,5,4,0.92)");
      topFade.addColorStop(0.62, "rgba(7,5,4,0.48)");
      topFade.addColorStop(1, "rgba(7,5,4,0)");
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, VIEW_W, ROOM_Y + 16);
      ctx.strokeStyle = "rgba(194,74,51,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, 70.5);
      ctx.lineTo(VIEW_W - 24, 70.5);
      ctx.stroke();
      const hud = this.getHudData();
      if (this.hudCrop > 0.5) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, VIEW_W, VIEW_H / 2);
        ctx.clip();
        ctx.translate(0, this.hudCrop);
        drawHud(ctx, hud, this.time);
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, VIEW_H / 2, VIEW_W, VIEW_H / 2);
        ctx.clip();
        ctx.translate(0, -this.hudCrop);
        drawHud(ctx, hud, this.time);
        ctx.restore();
      } else {
        drawHud(ctx, hud, this.time);
      }
    }
    // flash
    if (this.flash > 0 && this.flashesEnabled) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
    // transition fade
    if (this.transition) {
      const p = this.transition.t / this.transition.dur;
      const a = Math.sin(clamp(p, 0, 1) * Math.PI);
      ctx.fillStyle = `rgba(4,3,2,${a * 0.94})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // frame hairline
    ctx.strokeStyle = "rgba(216,166,91,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, VIEW_W - 1, VIEW_H - 1);
  }

  private drawPickupPrices(ctx: CanvasRenderingContext2D): void {
    for (const pickup of this.room.pickups) {
      if (pickup.sold) continue;
      const bob = Math.sin(this.time * 3 + pickup.id) * 3;
      if (pickup.price !== undefined) {
        if (pickup.kind === "item") {
          drawPriceTag(ctx, pickup.price, pickup.x + 26, pickup.y - 38 + bob);
        } else {
          drawPriceTag(ctx, pickup.price, pickup.x + 20, pickup.y - 31 + bob * 0.6);
        }
      }
      if (pickup.hpPrice !== undefined) {
        const y = pickup.kind === "item" ? pickup.y - 38 + bob : pickup.y - 31 + bob * 0.6;
        const x = pickup.kind === "item" ? pickup.x + 26 : pickup.x + 20;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(16,12,9,0.92)";
        ctx.strokeStyle = "rgba(194,74,51,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-15, -8, 31, 16, 3) : ctx.rect(-15, -8, 31, 16);
        ctx.fill();
        ctx.stroke();
        drawHeartIcon(ctx, -6, 0, 12, "full");
        ctx.fillStyle = "#e3a48f";
        ctx.font = "700 10px Alegreya, serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(String(pickup.hpPrice / 2), 13, 0.5);
        ctx.restore();
      }
    }
  }

  private drawDarkness(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== "playing" && this.phase !== "paused") return;
    const x = ROOM_X + this.player.x;
    const y = ROOM_Y + this.player.y;
    const g = ctx.createRadialGradient(x, y, 40, x, y, 250);
    g.addColorStop(0, "rgba(2,2,2,0)");
    g.addColorStop(0.55, "rgba(2,2,2,0.32)");
    g.addColorStop(1, "rgba(2,2,2,0.8)");
    ctx.fillStyle = g;
    ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
  }

  private drawPlayerLight(ctx: CanvasRenderingContext2D): void {
    if (this.player.dead) return;
    const x = ROOM_X + this.player.x;
    const y = ROOM_Y + this.player.y - 4;
    const flicker = 0.86 + Math.sin(this.time * 7.3) * 0.08 + Math.sin(this.time * 17.1) * 0.045;
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 158);
    glow.addColorStop(0, `rgba(255,216,152,${0.2 * flicker})`);
    glow.addColorStop(0.32, `rgba(230,168,98,${0.09 * flicker})`);
    glow.addColorStop(1, "rgba(230,168,98,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 170, y - 170, 340, 340);
  }

  private drawActors(ctx: CanvasRenderingContext2D): void {
    const actors: { y: number; draw: () => void }[] = [];
    for (const e of this.room.enemies) {
      if (e.dead) continue;
      actors.push({
        y: e.y,
        draw: () => drawEnemyArt(ctx, e, this.time),
      });
    }
    actors.push({
      y: this.player.y,
      draw: () => {
        if (this.player.dead) this.drawFallenWren(ctx);
        else drawWren(ctx, this.player, this.time);
      },
    });
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors) actor.draw();
  }

  private drawFallenWren(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    const pool = ctx.createRadialGradient(0, 8, 2, 0, 8, 40);
    pool.addColorStop(0, "rgba(80,16,14,0.6)");
    pool.addColorStop(1, "rgba(50,10,9,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(0, 8, 40, 14, 0, 0, TAU);
    ctx.fill();
    ctx.rotate(0.6);
    ctx.fillStyle = "#5a4934";
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#17110d";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "#d8c6a8";
    ctx.beginPath();
    ctx.arc(-9, -4, 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#17110d";
    ctx.stroke();
    ctx.strokeStyle = "#a83a2c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.bezierCurveTo(20, 6, 16, 18, 32, 16);
    ctx.stroke();
    ctx.restore();
  }

  private drawOrbitals(ctx: CanvasRenderingContext2D): void {
    const count = this.player.stats.orbitals;
    if (!count) return;
    for (let i = 0; i < count; i++) {
      const a = this.time * 2.1 + (i / count) * TAU;
      drawOrbital(
        ctx,
        this.player.x + Math.cos(a) * 44,
        this.player.y + Math.sin(a) * 44,
        this.time,
      );
    }
  }

  private drawTelegraphs(ctx: CanvasRenderingContext2D): void {
    for (const t of this.telegraphs) {
      const p = 1 - t.life / t.max;
      ctx.save();
      ctx.globalAlpha = 0.18 + p * 0.24;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * (0.35 + p * 0.65), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.shape === "line") {
        ctx.lineWidth = Math.max(1, p.size * 0.5);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.6, p.size * a), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawTexts(ctx: CanvasRenderingContext2D): void {
    for (const t of this.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px Alegreya, Georgia, serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = t.color;
      ctx.strokeStyle = "rgba(10,8,6,0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  private getHudData(): HudData {
    const boss = this.getBoss();
    const bossKind = boss?.boss;
    const activeDef = this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem) : null;
    const skill = getCharacter(this.player.character).skill;
    return {
      player: this.player,
      theme: this.theme,
      floorIndex: this.floorIndex,
      room: this.room,
      floor: this.floor as unknown as FloorData,
      runTime: this.run.time,
      seedText: this.lastSeedText,
      daily: this.run.daily,
      boss,
      bossName: bossKind ? BOSS_NAMES[bossKind] : this.theme.bossName,
      bossQuote: bossKind ? BOSS_QUOTES[bossKind] : this.theme.bossTitle,
      banner: this.banner,
      notice: this.notice,
      hintLife: this.hintLife,
      bossIntro: this.bossIntro,
      touch: this.input.hasTouch,
      roomCount: this.run.rooms,
      keysUsed: 0,
      activeItem: this.player.activeItem,
      activeCharges: this.player.activeCharges,
      activeMax: activeDef?.maxCharges ?? 0,
      skillName: skill.name,
      skillCd: this.player.skillCd,
      skillMax: skill.cooldown,
      skillColor: skill.color,
      trinkets: this.player.items.filter(
        (id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as never)) === "trinket",
      ),
      transformations: [...this.player.transformations],
      curse: this.floor.curse,
      mapRevealed: this.mapRevealed,
    };
  }

  // -------------------------------------------------------------------------
  // Test bridge helpers (no gameplay dependency)
  // -------------------------------------------------------------------------

  clearRecord(): void {
    this.meta.record = {
      deepest: 0,
      wins: 0,
      runs: 0,
      bestItems: [],
    };
    saveMeta(this.meta);
    this.ui?.updateTitle();
  }

  setSeed(seed: string | number): void {
    this.pendingSeed = String(seed);
    const text = String(seed);
    const num = /^[0-9]+$/.test(text) ? Number(text) >>> 0 : textToSeed(text);
    this.seed = num;
    this.lastSeedText = normalizeSeedText(text) || seedToText(num);
  }

  playtestReset(): void {
    const seedText = this.pendingSeed ? normalizeSeedText(this.pendingSeed) : this.lastSeedText || "BOUND";
    const seed = this.pendingSeed && /^[0-9]+$/.test(this.pendingSeed)
      ? Number(this.pendingSeed) >>> 0
      : textToSeed(seedText);
    this.input.clear();
    this.audio.stopAmbient();
    this.meta.introSeen = true;
    this.startNewRun(seed, seedText || seedToText(seed), false);
    this.phase = "playing";
    this.ui?.hideScreens();
    this.audio.startAmbient(0);
    this.audio.setDucked(false);
    this.hintLife = 5;
    this.input.clearBomb();
    this.ui?.setBombCount(this.player.bombs);
  }

  playtestJump(floorIndex: number, roomType: string): void {
    const index = clamp(Math.floor(floorIndex), 0, THEMES.length - 1);
    this.audio.unlock();
    this.floorIndex = index;
    this.run.floor = index;
    this.theme = getTheme(index);
    this.seed = this.pendingSeed ? textToSeed(this.pendingSeed) : this.seed;
    if (!this.seed) this.seed = 0x51a1c0de;
    this.lastSeedText = this.lastSeedText || seedToText(this.seed);
    this.floor = generateFloor(index, this.seed);
    let target = this.floor.rooms.find((r) => r.type === roomType);
    if (!target) target = this.floor.start;
    this.player = this.player ?? createPlayer(this.meta.selectedCharacter, this.meta.settings.assist);
    this.run.character = this.player.character;
    if (!this.player.items.length) this.applyStartingLoadout();
    this.player.dead = false;
    if (this.player.hp <= 0) this.player.hp = this.player.maxHp;
    this.phase = "playing";
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.particles = [];
    this.texts = [];
    this.telegraphs = [];
    this.transition = null;
    this.bossIntro = 0;
    this.hintLife = 0;
    this.run.time = Math.max(this.run.time, 30);
    this.activateRoom(
      target,
      target.type === "boss" || target.type === "challenge" ? "n" : null,
      true,
    );
    this.ui?.hideScreens();
    this.audio.startAmbient(index);
    this.audio.setDucked(false);
    this.player.invuln = 1.4;
    this.audio.setIntensity(this.getBoss() ? 2 : this.room.enemies.length ? 1 : 0);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
  }

  /** Test-only: force a curse on the current floor for visual QA. */
  forceCurse(kind: Curse): void {
    this.floor.curse = kind;
    this.showNotice(`CURSE · ${kind.toUpperCase()}`, "#e3a48f");
  }

  /** Test-only: open the secret room through the real reveal path. */
  testSecretReveal(): boolean {
    const withSecret = this.floor.rooms.find((r) => r.secretDir);
    if (!withSecret || !this.floor.secret) return false;
    this.activateRoom(withSecret, null, true);
    const dir = withSecret.secretDir!;
    const points: Record<Dir, { x: number; y: number }> = {
      n: { x: ROOM_W / 2, y: 0 },
      s: { x: ROOM_W / 2, y: ROOM_H },
      w: { x: 0, y: ROOM_H / 2 },
      e: { x: ROOM_W, y: ROOM_H / 2 },
    };
    const wall = points[dir];
    this.tryRevealSecret(wall.x, wall.y);
    return Boolean(withSecret.secretOpened);
  }

  /** Test-only: grant an item for ending/transform QA. */
  testGrantItem(id: string): void {
    this.giveItem(id, true);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
  }

  /** Test-only: grant three tagged relics to exercise a transformation. */
  testGrantSet(tag: string): void {
    const ids = ITEMS.filter(
      (item) => itemKind(item) === "relic" && item.tags?.includes(tag as never),
    )
      .slice(0, 3)
      .map((item) => item.id);
    for (const id of ids) this.giveItem(id, true);
    this.checkTransformations();
  }

  /** Test-only: unlock a character for QA without changing normal unlock rules. */
  unlockTestCharacter(id: CharacterId): void {
    this.meta.record.deepest = Math.max(this.meta.record.deepest, 5);
    this.meta.record.wins = Math.max(this.meta.record.wins, 1);
    this.meta.selectedCharacter = id;
    saveMeta(this.meta);
    this.resetPreview();
    this.ui?.updateTitle();
  }

  /** Test-only: makes the QA deep-link state survivable and fast to clear. */
  applyTestPower(): void {
    this.player.stats.damage = 500;
    this.player.stats.fireDelay = 0.1;
    this.player.stats.range = 2.2;
    this.player.stats.shotSpeed = 700;
    this.player.maxHp = 40;
    this.player.hp = 40;
    this.player.bombs = 9;
    this.player.keys = 3;
    this.player.coins = 30;
    this.player.invuln = 2;
  }

  stepSimulation(ms: number): void {
    const total = clamp(ms, 0, 20000) / 1000;
    const step = 1 / 60;
    let elapsed = 0;
    while (elapsed < total) {
      this.update(step);
      elapsed += step;
      if (this.phase === "dead" || this.phase === "victory") break;
    }
  }

  snapshot(): Record<string, unknown> {
    const boss = this.getBoss();
    const alive = this.room.enemies.filter((e) => !e.dead);
    return {
      phase: this.phase,
      seed: this.lastSeedText,
      floor: this.floorIndex + 1,
      floorName: this.theme.name,
      room: {
        id: this.room.id,
        type: this.room.type,
        cleared: this.room.cleared,
        visited: this.room.visited,
        x: this.room.gx,
        y: this.room.gy,
        enemies: alive.length,
        enemyKinds: alive.map((e) => e.kind),
        elites: alive.filter((e) => e.elite).map((e) => e.elite),
        interior: this.room.interior,
        layout: this.room.layout,
        encounter: this.room.encounter,
        wave: this.room.wave,
        maxWaves: this.room.maxWaves,
        nests: this.room.obstacles.filter((o) => o.kind === "nest").length,
        obstacleKinds: this.room.obstacles.map((o) => o.kind),
        pickups: this.room.pickups.map((p) => ({ kind: p.kind, price: p.price })),
        doors: (["n", "s", "e", "w"] as Dir[])
          .map((dir) => ({ dir, state: this.getDoorState(this.room, dir) }))
          .filter((d) => d.state !== null),
      },
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        hearts: this.player.hp / 2,
        coins: this.player.coins,
        bombs: this.player.bombs,
        keys: this.player.keys,
        items: [...this.player.items],
        character: this.player.character,
        activeItem: this.player.activeItem,
        activeCharges: this.player.activeCharges,
        skill: getCharacter(this.player.character).skill.name,
        skillCd: Number(this.player.skillCd.toFixed(2)),
        transformations: [...this.player.transformations],
        invuln: Number(this.player.invuln.toFixed(2)),
        dead: this.player.dead,
        stats: {
          damage: Number(this.player.stats.damage.toFixed(2)),
          fireDelay: Number(this.player.stats.fireDelay.toFixed(3)),
          speed: Math.round(this.player.stats.speed),
          shots: this.player.stats.shots,
          pierce: this.player.stats.pierce,
          crit: Number(this.player.stats.crit.toFixed(3)),
        },
      },
      boss: boss
        ? {
            name: boss.boss ? BOSS_NAMES[boss.boss] : this.theme.bossName,
            hp: Math.max(0, Math.round(boss.hp)),
            maxHp: boss.maxHp,
            phase2: boss.phase2,
          }
        : null,
      run: {
        time: Math.round(this.run.time),
        rooms: this.run.rooms,
        kills: this.run.kills,
        character: this.run.character,
        daily: this.run.daily,
        trueEnding: this.run.trueEnding,
      },
      curse: this.floor.curse,
      mapRevealed: this.mapRevealed,
      toast: this.notice?.text ?? null,
      projectiles: { tears: this.tears.length, shots: this.shots.length, bombs: this.bombs.length },
      shotsFired: this.shotsFired,
      map: this.floor.rooms.map((r) => ({
        id: r.id,
        type: r.type,
        gx: r.gx,
        gy: r.gy,
        visited: r.visited,
        cleared: r.cleared,
        layout: r.layout,
        interior: r.interior,
        encounter: r.encounter,
        doors: (Object.keys(r.doors) as Dir[]),
      })),
      record: { ...this.record },
      touch: this.input.hasTouch,
      touchSticks: (() => {
        const sticks = this.input.sticks();
        return {
          left: { active: sticks.left.active, dx: sticks.left.dx, dy: sticks.left.dy },
          right: { active: sticks.right.active, dx: sticks.right.dx, dy: sticks.right.dy },
        };
      })(),
      viewport: { w: this.canvas.clientWidth, h: this.canvas.clientHeight },
    };
  }
}

function drawObstacleSafe(ctx: CanvasRenderingContext2D, o: Obstacle): void {
  drawObstacle(ctx, o, 0);
}

// re-export for any consumer that only imports game.ts
export { formatTime, hashString };
