import type { BossKind, Enemy } from "./types";
import { ROOM_H, ROOM_W, TAU } from "./types";
import { clamp, lerp } from "./util";
import type { CombatContext } from "./enemies";
import { spawnSpread } from "./enemies";
import {
  updateBellWidow,
  updateCarver,
  updateCurator,
  updateDrowned,
  updateGaunt,
  updateOrchard,
  updateSexton,
  updateTallyman,
} from "./bosses2";

let bossRandom = 991;

export const MAIN_BOSSES: BossKind[] = ["glutton", "weaver", "drowned", "orchard", "heart"];

export const BOSS_NAMES: Record<BossKind, string> = {
  glutton: "The Glutton",
  weaver: "The Weaver",
  drowned: "The Drowned Choir",
  orchard: "The Rootbound Matron",
  heart: "The Hollow Heart",
  sexton: "The Sexton",
  curator: "The Curator",
  bellwidow: "The Bell Widow",
  tallyman: "The Tallyman",
  gaunt: "The Gaunt",
  carver: "The Carver",
};

export const BOSS_QUOTES: Record<BossKind, string> = {
  glutton: "it ate the last child whole, and kept the shoes",
  weaver: "she stitches the small ones back wrong, then calls them hers",
  drowned: "sing, little lamb; the water only wants a voice",
  orchard: "every branch was a name; every name was a warning",
  heart: "it has been waiting for a sibling",
  sexton: "he buried them all, and forgot to stop",
  curator: "he keeps what the house cannot digest",
  bellwidow: "every bell has a name, and she remembers all of them",
  tallyman: "he counts what the house takes, and he is never wrong",
  gaunt: "he has been hungry since before the stairs were built",
  carver: "she makes the small ones beautiful, then keeps the pieces",
};

export const BOSS_VOICE: Record<BossKind, string> = {
  glutton: "boss-glutton",
  weaver: "boss-weaver",
  drowned: "boss-drowned",
  orchard: "boss-orchard",
  heart: "boss-heart",
  sexton: "mini-sexton",
  curator: "mini-curator",
  bellwidow: "mini-bellwidow",
  tallyman: "mini-tallyman",
  gaunt: "mini-gaunt",
  carver: "mini-carver",
};

const MINI_BOSSES: BossKind[] = ["sexton", "curator", "bellwidow", "tallyman", "gaunt", "carver"];
export const isMiniBoss = (kind?: BossKind): boolean => Boolean(kind && MINI_BOSSES.includes(kind));
export const isMainBoss = (kind?: BossKind): boolean => Boolean(kind && MAIN_BOSSES.includes(kind));

export function makeBoss(kind: BossKind, floorIndex: number, x: number, y: number): Enemy {
  const stats: Record<BossKind, { r: number; hp: number }> = {
    glutton: { r: 54, hp: 215 },
    weaver: { r: 48, hp: 330 },
    drowned: { r: 52, hp: 440 },
    orchard: { r: 55, hp: 560 },
    heart: { r: 60, hp: 680 },
    sexton: { r: 40, hp: 170 },
    curator: { r: 42, hp: 190 },
    bellwidow: { r: 44, hp: 205 },
    tallyman: { r: 40, hp: 220 },
    gaunt: { r: 48, hp: 255 },
    carver: { r: 44, hp: 240 },
  };
  const st = stats[kind];
  const hp = Math.round(st.hp + floorIndex * 12);
  return {
    id: ++bossRandom,
    kind: "boss",
    boss: kind,
    elite: null,
    frozen: 0,
    shielded: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    r: st.r,
    hp,
    maxHp: hp,
    speed: kind === "glutton" ? 44 : kind === "drowned" ? 32 : kind === "gaunt" ? 58 : kind === "tallyman" ? 34 : 0,
    touch: 2,
    t: 0,
    state: "idle",
    timer: 1.4,
    cd: 0.8,
    angle: 0,
    flash: 0,
    dead: false,
    seed: 997,
    phase2: false,
    cast: 0,
    adds: 0,
    poison: 0,
    poisonTick: 0,
    sx: x,
    sy: y,
    tx: x,
    ty: y,
  };
}

export function updateBoss(e: Enemy, ctx: CombatContext, dt: number): void {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt * 3.2);
  e.frozen = Math.max(0, e.frozen - dt);
  if (e.frozen > 0) return;
  e.timer -= dt;
  e.cd -= dt;

  if (!e.phase2 && e.hp <= e.maxHp * 0.5) {
    e.phase2 = true;
    e.state = "rest";
    e.timer = 0.75;
    ctx.shake(9);
    ctx.telegraph(e.x, e.y, 90, 0.7, "#c24a33");
    if (e.boss === "heart") {
      for (let i = 0; i < 2; i++) {
        const a = Math.PI * 0.25 + i * Math.PI;
        ctx.spawnEnemy("wraith", e.x + Math.cos(a) * 130, e.y + Math.sin(a) * 110);
      }
    } else if (e.boss === "glutton") {
      ctx.spawnEnemy("moth", e.x - 100, e.y);
      ctx.spawnEnemy("moth", e.x + 100, e.y);
    } else if (e.boss === "drowned") {
      ctx.spawnEnemy("drowned", e.x - 110, e.y + 40);
      ctx.spawnEnemy("chorister", e.x + 110, e.y + 20);
    } else if (e.boss === "orchard") {
      ctx.spawnEnemy("roothound", e.x - 110, e.y + 40);
      ctx.spawnEnemy("bonewheel", e.x + 110, e.y + 40);
    } else if (e.boss === "sexton") {
      ctx.spawnEnemy("husk", e.x - 80, e.y + 60);
      ctx.spawnEnemy("wretch", e.x + 80, e.y + 60);
    } else if (e.boss === "curator") {
      ctx.spawnEnemy("crawler", e.x - 80, e.y + 60);
      ctx.spawnEnemy("moth", e.x + 80, e.y + 40);
    } else if (e.boss === "bellwidow") {
      ctx.spawnEnemy("bellringer", e.x - 90, e.y + 50);
    } else if (e.boss === "tallyman") {
      ctx.spawnEnemy("scarecrow", e.x + 90, e.y + 50);
    } else if (e.boss === "gaunt") {
      ctx.spawnEnemy("lurker", e.x - 90, e.y + 50);
    } else if (e.boss === "carver") {
      ctx.spawnEnemy("mimic", e.x + 90, e.y + 50);
    } else {
      ctx.spawnEnemy("crawler", e.x - 90, e.y + 60);
      ctx.spawnEnemy("crawler", e.x + 90, e.y + 60);
    }
  }

  if (e.poison > 0) {
    e.poison -= dt;
    e.poisonTick -= dt;
    if (e.poisonTick <= 0) {
      e.poisonTick = 0.55;
      e.hp -= 1.6;
      e.flash = Math.max(e.flash, 0.2);
    }
  }

  if (e.dead) return;

  if (e.boss === "glutton") updateGlutton(e, ctx, dt);
  else if (e.boss === "weaver") updateWeaver(e, ctx, dt);
  else if (e.boss === "drowned") updateDrowned(e, ctx, dt);
  else if (e.boss === "orchard") updateOrchard(e, ctx, dt);
  else if (e.boss === "sexton") updateSexton(e, ctx, dt);
  else if (e.boss === "curator") updateCurator(e, ctx, dt);
  else if (e.boss === "bellwidow") updateBellWidow(e, ctx, dt);
  else if (e.boss === "tallyman") updateTallyman(e, ctx, dt);
  else if (e.boss === "gaunt") updateGaunt(e, ctx, dt);
  else if (e.boss === "carver") updateCarver(e, ctx, dt);
  else updateHeart(e, ctx, dt);

  e.x = clamp(e.x, e.r * 0.6, ROOM_W - e.r * 0.6);
  e.y = clamp(e.y, e.r * 0.6, ROOM_H - e.r * 0.6);
  if (e.hp <= 0) e.dead = true;
}

function updateGlutton(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  const speed = e.phase2 ? 64 : 44;

  switch (e.state) {
    case "idle": {
      // lumber toward the player
      if (Math.hypot(p.x - e.x, p.y - e.y) > 95) {
        e.x += Math.cos(a) * speed * dt;
        e.y += Math.sin(a) * speed * dt;
      }
      e.vx = Math.cos(a);
      if (e.timer <= 0) {
        if (e.cast % 3 === 2) {
          e.state = "chargeWind";
          e.timer = e.phase2 ? 0.62 : 0.9;
        } else {
          e.state = "spitWind";
          e.timer = e.phase2 ? 0.6 : 0.85;
        }
        e.cast++;
      }
      break;
    }
    case "spitWind": {
      if (e.timer <= 0) {
        const count = e.phase2 ? 7 : 5;
        spawnSpread(ctx, e.x, e.y + e.r * 0.1, a, count, 0.72, 210, "wax", 1, 6);
        ctx.shake(2.5);
        e.state = "rest";
        e.timer = e.phase2 ? 0.7 : 1.1;
      }
      break;
    }
    case "chargeWind": {
      e.sx = Math.cos(a);
      e.sy = Math.sin(a);
      if (e.timer <= 0) {
        e.state = "charge";
        e.timer = 1.1;
        e.vx = e.sx * (e.phase2 ? 620 : 510);
        e.vy = e.sy * (e.phase2 ? 620 : 510);
      }
      break;
    }
    case "charge": {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const clampedX = clamp(e.x, e.r * 0.75, ROOM_W - e.r * 0.75);
      const clampedY = clamp(e.y, e.r * 0.75, ROOM_H - e.r * 0.75);
      const hitWall = clampedX !== e.x || clampedY !== e.y;
      e.x = clampedX;
      e.y = clampedY;
      if (hitWall || e.timer <= 0) {
        ctx.shake(7);
        const count = e.phase2 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const ang = TAU * (i / count) + 0.6;
          ctx.spawnEnemy("moth", clamp(e.x + Math.cos(ang) * 70, 30, ROOM_W - 30), clamp(e.y + Math.sin(ang) * 60, 30, ROOM_H - 30));
        }
        e.state = "rest";
        e.timer = e.phase2 ? 0.65 : 1.0;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.7 : 1.25;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
}

function updateWeaver(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  switch (e.state) {
    case "idle": {
      // sway in place
      e.x += Math.cos(e.t * 0.9) * 6 * dt;
      e.y += Math.sin(e.t * 1.3) * 5 * dt;
      if (e.timer <= 0) {
        if (e.phase2 && e.cast % 3 === 2) {
          e.state = "fanWind";
          e.timer = 0.6;
        } else {
          e.tx = clamp(p.x + (Math.random() - 0.5) * 90, 70, ROOM_W - 70);
          e.ty = clamp(p.y + (Math.random() - 0.5) * 70, 70, ROOM_H - 70);
          ctx.telegraph(e.tx, e.ty, 54, 0.7, "#c24a33");
          e.state = "leapWind";
          e.timer = 0.7;
        }
      }
      break;
    }
    case "leapWind": {
      if (e.timer <= 0) {
        e.sx = e.x;
        e.sy = e.y;
        e.state = "leap";
        e.timer = 0.5;
      }
      break;
    }
    case "leap": {
      const k = 1 - clamp(e.timer / 0.5, 0, 1);
      e.x = lerp(e.sx, e.tx, k);
      e.y = lerp(e.sy, e.ty, k) - Math.sin(k * Math.PI) * 46;
      if (e.timer <= 0) {
        e.x = e.tx;
        e.y = e.ty;
        const count = e.phase2 ? 16 : 12;
        const offset = e.t * 0.7;
        for (let i = 0; i < count; i++) {
          const sa = offset + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 175, Math.sin(sa) * 175, "needle", 1, 5);
        }
        if (e.adds < 3) {
          ctx.spawnEnemy("crawler", clamp(e.x + 60, 24, ROOM_W - 24), clamp(e.y + 50, 24, ROOM_H - 24));
          e.adds++;
        }
        ctx.shake(7);
        e.state = "rest";
        e.timer = e.phase2 ? 0.5 : 0.8;
        e.cast++;
      }
      break;
    }
    case "fanWind": {
      if (e.timer <= 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        spawnSpread(ctx, e.x, e.y, a, e.phase2 ? 7 : 5, 0.55, 260, "needle", 1, 5);
        e.state = "rest";
        e.timer = 0.55;
        e.cast++;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.6 : 1.1;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
}

function updateHeart(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const homeX = ROOM_W / 2 + Math.sin(e.t * 0.45) * 42;
  const homeY = ROOM_H / 2 + Math.cos(e.t * 0.6) * 24;
  e.x = lerp(e.x, homeX, 0.02);
  e.y = lerp(e.y, homeY, 0.02);

  switch (e.state) {
    case "idle": {
      if (e.timer <= 0) {
        const pattern = e.cast % 3;
        e.cast++;
        if (pattern === 0) {
          e.state = "rings";
          e.timer = e.phase2 ? 2.0 : 1.7;
          e.adds = 0;
          e.cd = 0.1;
        } else if (pattern === 1) {
          e.state = "aimed";
          e.timer = 1.8;
          e.adds = 0;
          e.cd = 0.15;
        } else {
          e.state = "summon";
          e.timer = 0.8;
        }
      }
      break;
    }
    case "rings": {
      if (e.cd <= 0) {
        e.cd = e.phase2 ? 0.42 : 0.55;
        e.adds++;
        const count = e.phase2 ? 15 : 11;
        const offset = e.t * 1.3 + (e.adds % 2) * (Math.PI / count);
        for (let i = 0; i < count; i++) {
          const sa = offset + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 165, Math.sin(sa) * 165, "ink", 1, 5.5);
        }
        ctx.shake(1.4);
      }
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.7 : 1.1;
      }
      break;
    }
    case "aimed": {
      if (e.cd <= 0) {
        e.cd = e.phase2 ? 0.3 : 0.4;
        e.adds++;
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        spawnSpread(ctx, e.x, e.y, a, e.phase2 ? 5 : 3, 0.32, 255, "needle", 1, 5);
      }
      if (e.timer <= 0 || e.adds >= (e.phase2 ? 6 : 4)) {
        e.state = "idle";
        e.timer = 0.9;
      }
      break;
    }
    case "summon": {
      if (e.timer <= 0) {
        const kinds = e.phase2 ? (["wraith", "wraith"] as const) : (["husk", "moth"] as const);
        kinds.forEach((kind, i) => {
          const a = Math.PI * 0.25 + i * Math.PI * 0.8;
          ctx.spawnEnemy(kind, clamp(e.x + Math.cos(a) * 120, 30, ROOM_W - 30), clamp(e.y + Math.sin(a) * 100, 30, ROOM_H - 30));
        });
        e.state = "idle";
        e.timer = 0.9;
        ctx.shake(3);
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = 0.7;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
  void dt;
}
