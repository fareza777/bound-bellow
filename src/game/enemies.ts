import { Rng } from "./rng";
import type { EliteKind, Enemy, EnemyKind, Obstacle, Player, Room, ShotKind } from "./types";
import { ROOM_H, ROOM_W, TAU, obstacleBlocks } from "./types";
import { circleRect, clamp, dist, moveWithCollision, norm } from "./util";

export interface CombatContext {
  player: Player;
  room: Room;
  obstacles: Obstacle[];
  floorIndex: number;
  time: number;
  rng: Rng;
  spawnShot(
    x: number,
    y: number,
    vx: number,
    vy: number,
    kind: ShotKind,
    damage?: number,
    radius?: number,
  ): void;
  spawnEnemy(kind: EnemyKind, x: number, y: number): void;
  telegraph(x: number, y: number, radius: number, delay: number, color?: string): void;
  shake(amount: number): void;
}

const BASE: Record<
  EnemyKind,
  { r: number; hp: number; speed: number; touch: number }
> = {
  moth: { r: 12, hp: 9, speed: 96, touch: 2 },
  crawler: { r: 13, hp: 15, speed: 82, touch: 2 },
  husk: { r: 15, hp: 24, speed: 46, touch: 2 },
  waxface: { r: 14, hp: 19, speed: 44, touch: 2 },
  goat: { r: 17, hp: 31, speed: 52, touch: 2 },
  saint: { r: 16, hp: 30, speed: 0, touch: 2 },
  ragdoll: { r: 11, hp: 13, speed: 176, touch: 2 },
  wraith: { r: 13, hp: 22, speed: 46, touch: 2 },
  drowned: { r: 16, hp: 34, speed: 40, touch: 2 },
  chorister: { r: 15, hp: 27, speed: 0, touch: 2 },
  roothound: { r: 15, hp: 27, speed: 60, touch: 2 },
  waxcrow: { r: 12, hp: 19, speed: 138, touch: 1 },
  bonewheel: { r: 15, hp: 25, speed: 165, touch: 2 },
  wretch: { r: 12, hp: 22, speed: 112, touch: 2 },
  grub: { r: 11, hp: 12, speed: 62, touch: 1 },
  lurker: { r: 14, hp: 24, speed: 0, touch: 2 },
  bellringer: { r: 15, hp: 30, speed: 38, touch: 2 },
  lantern: { r: 13, hp: 21, speed: 70, touch: 1 },
  penitent: { r: 16, hp: 36, speed: 33, touch: 2 },
  maw: { r: 19, hp: 48, speed: 0, touch: 2 },
  scarecrow: { r: 14, hp: 26, speed: 0, touch: 2 },
  swarmling: { r: 9, hp: 6, speed: 154, touch: 1 },
  waxherald: { r: 15, hp: 32, speed: 48, touch: 2 },
  bonekite: { r: 12, hp: 22, speed: 128, touch: 2 },
  censer: { r: 14, hp: 30, speed: 42, touch: 2 },
  mimic: { r: 14, hp: 32, speed: 0, touch: 2 },
  weaverling: { r: 12, hp: 20, speed: 72, touch: 1 },
  hollowman: { r: 15, hp: 38, speed: 56, touch: 2 },
  drifter: { r: 13, hp: 25, speed: 58, touch: 1 },
  spore: { r: 10, hp: 13, speed: 52, touch: 1 },
};

let enemyId = 1;

export function makeEnemy(
  kind: EnemyKind,
  x: number,
  y: number,
  floorIndex: number,
  rng: Rng,
  elite: EliteKind | null = null,
): Enemy {
  const base = BASE[kind];
  const scale = 1 + floorIndex * 0.2;
  const eliteHp =
    elite === "stitched"
      ? 1.28
      : elite === "bloated"
        ? 1.5
        : elite === "blessed"
          ? 1.15
          : elite === "cursed"
            ? 1.12
            : elite === "gilded"
              ? 1.1
              : 1;
  const hp = Math.round(base.hp * scale * eliteHp);
  const speed =
    base.speed *
    (1 + floorIndex * 0.04) *
    (elite === "swift" ? 1.35 : elite === "cursed" ? 1.12 : 1);
  const enemy: Enemy = {
    id: enemyId++,
    kind,
    elite,
    frozen: 0,
    shielded: elite === "blessed" ? 1 : 0,
    x,
    y,
    vx: kind === "bonewheel" ? Math.cos(rng.range(0, TAU)) * speed : 0,
    vy: kind === "bonewheel" ? Math.sin(rng.range(0, TAU)) * speed : 0,
    r: base.r + (elite === "bloated" ? 3 : 0),
    hp,
    maxHp: hp,
    speed,
    touch: elite === "cursed" ? base.touch + 1 : base.touch,
    t: rng.range(0, 10),
    state:
      kind === "ragdoll"
        ? "hop"
        : kind === "mimic"
          ? "disguise"
          : kind === "lurker"
            ? "buried"
            : "idle",
    timer: kind === "mimic" ? 8 : kind === "lurker" ? 1.4 : rng.range(0.4, 1.6),
    cd: rng.range(0.5, 1.8),
    angle: rng.range(0, TAU),
    flash: 0,
    dead: false,
    seed: rng.int(10000),
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
  return enemy;
}

export function updateEnemies(list: Enemy[], ctx: CombatContext, dt: number): void {
  for (const e of list) {
    if (e.dead || e.kind === "boss") continue;
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt * 4.5);
    e.frozen = Math.max(0, e.frozen - dt);
    if (e.frozen > 0) continue;
    e.timer -= dt;
    e.cd -= dt;
    if (e.poison > 0) {
      e.poison -= dt;
      e.poisonTick -= dt;
      if (e.poisonTick <= 0) {
        e.poisonTick = 0.55;
        e.hp -= 1.3;
        e.flash = Math.max(e.flash, 0.2);
      }
    }
    updateEnemy(e, ctx, dt);
    if (e.hp <= 0) e.dead = true;
  }
}

function slowFactor(ctx: CombatContext): number {
  const d = dist(ctx.player.x, ctx.player.y, 0, 0);
  void d;
  return 1;
}

function move(e: Enemy, dx: number, dy: number, ctx: CombatContext, ghost = false): void {
  const slow = ctx.player.stats.enemySlow;
  let factor = 1;
  if (slow > 0 && dist(e.x, e.y, ctx.player.x, ctx.player.y) < 150) {
    factor = 1 - clamp(slow, 0, 0.45);
  }
  const beforeX = e.x;
  const beforeY = e.y;
  const intended = { x: e.x + dx * factor, y: e.y + dy * factor };
  if (ghost) {
    e.x = clamp(intended.x, e.r, ROOM_W - e.r);
    e.y = clamp(intended.y, e.r, ROOM_H - e.r);
    return;
  }
  const blockers = ctx.obstacles.filter((o) => obstacleBlocks(o.kind));
  moveWithCollision(e, dx * factor, dy * factor, e.r, blockers, {
    x: 0,
    y: 0,
    w: ROOM_W,
    h: ROOM_H,
  });
  const moved = Math.hypot(e.x - beforeX, e.y - beforeY);
  const wanted = Math.hypot(dx, dy) * factor;
  if (wanted > 1 && moved < wanted * 0.2) {
    e.angle = Math.atan2(dy, dx) + Math.PI * 0.7;
  }
}

function steerToward(e: Enemy, px: number, py: number, speed: number, wobble = 0): void {
  const a = Math.atan2(py - e.y, px - e.x) + wobble;
  e.vx = Math.cos(a) * speed;
  e.vy = Math.sin(a) * speed;
}

function openAt(ctx: CombatContext, x: number, y: number, r: number): boolean {
  if (x < r + 4 || x > ROOM_W - r - 4 || y < r + 4 || y > ROOM_H - r - 4) return false;
  for (const o of ctx.obstacles) {
    if (!obstacleBlocks(o.kind)) continue;
    if (circleRect(x, y, r, o.x, o.y, o.w, o.h)) return false;
  }
  return true;
}

function updateEnemy(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx);

  switch (e.kind) {
    case "moth": {
      const wob = Math.sin(e.t * 5.2 + e.seed) * 0.5 + Math.cos(e.t * 2.3) * 0.3;
      steerToward(e, p.x, p.y, e.speed, wob);
      move(e, e.vx * dt, e.vy * dt, ctx);
      break;
    }
    case "crawler": {
      const sway = Math.sin(e.t * 7 + e.seed) * 0.9;
      steerToward(e, p.x, p.y, e.speed + (d < 120 ? 26 : 0), sway);
      move(e, e.vx * dt, e.vy * dt, ctx);
      break;
    }
    case "husk": {
      if (e.timer <= 0 && d < 150) {
        e.state = "lunge";
        e.timer = 0.38;
        e.vx = Math.cos(a) * 250;
        e.vy = Math.sin(a) * 250;
      }
      if (e.state === "lunge") {
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "walk";
          e.timer = 0.9;
        }
      } else {
        steerToward(e, p.x, p.y, e.speed, Math.sin(e.t * 2.2) * 0.12);
        move(e, e.vx * dt, e.vy * dt, ctx);
      }
      break;
    }
    case "waxface": {
      if (e.state === "wind") {
        if (e.timer <= 0) {
          e.state = "idle";
          e.cd = 2.0 + ctx.rng.range(0, 0.8);
          const count = ctx.floorIndex >= 2 ? 3 : 2;
          for (let i = 0; i < count; i++) {
            const off = (i - (count - 1) / 2) * 0.16;
            const sa = Math.atan2(p.y - e.y, p.x - e.x) + off;
            ctx.spawnShot(
              e.x + Math.cos(sa) * 14,
              e.y + Math.sin(sa) * 14,
              Math.cos(sa) * 185,
              Math.sin(sa) * 185,
              "wax",
              1,
              5.5,
            );
          }
        }
      } else if (e.cd <= 0 && d < 420) {
        e.state = "wind";
        e.timer = 0.58;
        e.vx = 0;
        e.vy = 0;
      } else {
        let moveAngle = a;
        if (d < 135) moveAngle = a + Math.PI + (e.t * 0.7 + e.seed) * 0.01;
        else if (d < 230) moveAngle = a + Math.PI / 2;
        const sp = e.speed * (d < 230 ? 1 : 0.8);
        move(e, Math.cos(moveAngle) * sp * dt, Math.sin(moveAngle) * sp * dt, ctx);
      }
      break;
    }
    case "goat": {
      if (e.state === "idle") {
        steerToward(e, p.x, p.y, e.speed, Math.sin(e.t * 2) * 0.2);
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "wind";
          e.timer = ctx.floorIndex >= 1 ? 0.66 : 0.78;
          const da = Math.atan2(p.y - e.y, p.x - e.x);
          e.tx = Math.cos(da);
          e.ty = Math.sin(da);
          e.vx = 0;
          e.vy = 0;
        }
      } else if (e.state === "wind") {
        if (e.timer <= 0) {
          e.state = "charge";
          e.timer = ctx.floorIndex >= 2 ? 1.0 : 0.88;
          e.vx = e.tx * (470 + ctx.floorIndex * 30);
          e.vy = e.ty * (470 + ctx.floorIndex * 30);
        }
      } else if (e.state === "charge") {
        const bx = e.x;
        const by = e.y;
        move(e, e.vx * dt, e.vy * dt, ctx);
        const moved = Math.hypot(e.x - bx, e.y - by);
        if (e.timer <= 0 || (Math.hypot(e.vx, e.vy) > 200 && moved < 1.2 && dt > 0.004)) {
          e.state = "rest";
          e.timer = 0.9;
          e.vx = 0;
          e.vy = 0;
          ctx.shake(2.5);
        }
      } else if (e.state === "rest") {
        if (e.timer <= 0) {
          e.state = "idle";
          e.timer = 1.2 + ctx.rng.range(0, 0.9);
        }
      }
      break;
    }
    case "saint": {
      e.vx = 0;
      e.vy = 0;
      if (e.cd <= 0) {
        e.cd = 2.7;
        e.state = "cast";
        e.timer = 0.45;
        const count = ctx.floorIndex >= 1 ? 10 : 8;
        const offset = e.seed * 0.3;
        for (let i = 0; i < count; i++) {
          const sa = offset + (i / count) * TAU;
          ctx.spawnShot(
            e.x + Math.cos(sa) * 18,
            e.y - 6 + Math.sin(sa) * 18,
            Math.cos(sa) * 160,
            Math.sin(sa) * 160,
            "wax",
            1,
            5,
          );
        }
        ctx.shake(1.2);
      }
      if (e.state === "cast" && e.timer <= 0) e.state = "idle";
      break;
    }
    case "ragdoll": {
      if (e.state === "hop") {
        if (e.timer <= 0) {
          e.state = "crouch";
          e.timer = 0.22 + ctx.rng.range(0, 0.25);
          e.vx = 0;
          e.vy = 0;
        } else {
          move(e, e.vx * dt, e.vy * dt, ctx);
        }
      } else if (e.timer <= 0) {
        e.state = "hop";
        e.timer = 0.4;
        steerToward(e, p.x, p.y, e.speed);
      }
      break;
    }
    case "wraith": {
      steerToward(e, p.x, p.y, e.speed + (d < 120 ? 20 : 0), Math.sin(e.t * 1.3) * 0.35);
      move(e, e.vx * dt, e.vy * dt, ctx, true);
      break;
    }
    case "drowned": {
      const sway = Math.sin(e.t * 2.1 + e.seed) * 0.4;
      steerToward(e, p.x, p.y, e.speed + (d < 100 ? 16 : 0), sway);
      move(e, e.vx * dt, e.vy * dt, ctx);
      break;
    }
    case "chorister": {
      e.vx = 0;
      e.vy = 0;
      if (e.cd <= 0) {
        e.cd = ctx.floorIndex >= 2 ? 2.3 : 2.8;
        const count = 10;
        const offset = e.t * 0.4;
        for (let i = 0; i < count; i++) {
          const sa = offset + (i / count) * TAU;
          ctx.spawnShot(
            e.x + Math.cos(sa) * 16,
            e.y + Math.sin(sa) * 16,
            Math.cos(sa) * 145,
            Math.sin(sa) * 145,
            "thread",
            1,
            5.5,
          );
        }
        ctx.shake(1.4);
      }
      break;
    }
    case "roothound": {
      if (e.state === "idle") {
        steerToward(e, p.x, p.y, e.speed + 18, Math.sin(e.t * 3) * 0.12);
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "wind";
          e.timer = 0.5;
          const da = Math.atan2(p.y - e.y, p.x - e.x);
          e.tx = Math.cos(da);
          e.ty = Math.sin(da);
          e.vx = 0;
          e.vy = 0;
        }
      } else if (e.state === "wind") {
        if (e.timer <= 0) {
          e.state = "charge";
          e.timer = 0.65;
          e.vx = e.tx * 520;
          e.vy = e.ty * 520;
        }
      } else if (e.state === "charge") {
        const bx = e.x;
        const by = e.y;
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0 || Math.hypot(e.x - bx, e.y - by) < 1.2) {
          e.state = "rest";
          e.timer = 0.55;
          ctx.shake(2);
        }
      } else if (e.timer <= 0) {
        e.state = "idle";
        e.timer = 1.1 + ctx.rng.range(0, 0.8);
      }
      break;
    }
    case "waxcrow": {
      const wob = Math.sin(e.t * 9 + e.seed) * 0.7;
      steerToward(e, p.x, p.y, e.speed, wob);
      move(e, e.vx * dt, e.vy * dt, ctx);
      if (e.cd <= 0) {
        e.cd = 2.6;
        const sa = Math.atan2(p.y - e.y, p.x - e.x);
        ctx.spawnShot(e.x, e.y, Math.cos(sa) * 190, Math.sin(sa) * 190, "wax", 1, 5);
      }
      break;
    }
    case "bonewheel": {
      e.state = "roll";
      const bx = e.x;
      const by = e.y;
      move(e, e.vx * dt, e.vy * dt, ctx);
      const moved = Math.hypot(e.x - bx, e.y - by);
      if (moved < 0.8) {
        e.vx *= -1;
        e.vy *= -1;
        e.angle = Math.atan2(e.vy, e.vx);
      }
      if (Math.hypot(e.vx, e.vy) < 10) {
        steerToward(e, p.x, p.y, 180);
      }
      break;
    }
    case "wretch": {
      const sway = Math.sin(e.t * 9 + e.seed) * 0.6;
      steerToward(e, p.x, p.y, e.speed + (d < 120 ? 30 : 0), sway);
      move(e, e.vx * dt, e.vy * dt, ctx);
      break;
    }
    case "grub": {
      const crawl = Math.sin(e.t * 4.4 + e.seed) * 0.55;
      steerToward(e, p.x, p.y, e.speed, crawl);
      move(e, e.vx * dt, e.vy * dt, ctx);
      break;
    }
    case "lurker": {
      if (e.state === "buried") {
        e.vx = 0;
        e.vy = 0;
        if (d < 150 || e.timer <= 0) {
          e.state = "lunge";
          e.timer = 0.46;
          const la = Math.atan2(p.y - e.y, p.x - e.x);
          e.vx = Math.cos(la) * 430;
          e.vy = Math.sin(la) * 430;
          ctx.telegraph(e.x, e.y, 24, 0.25, "rgba(194,74,51,0.75)");
        }
      } else if (e.state === "lunge") {
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "surfaced";
          e.timer = 0.9;
          e.vx = 0;
          e.vy = 0;
        }
      } else {
        steerToward(e, p.x, p.y, e.speed + 34, Math.sin(e.t * 3) * 0.25);
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "buried";
          e.timer = 2.2 + ctx.rng.range(0, 0.9);
        }
      }
      break;
    }
    case "bellringer": {
      const away = d < 145 ? a + Math.PI : a;
      const drift = Math.sin(e.t * 1.7) * 0.4;
      move(e, Math.cos(away + drift) * e.speed * dt, Math.sin(away + drift) * e.speed * dt, ctx);
      if (e.cd <= 0) {
        e.cd = e.phase2 ? 2.2 : 3.1;
        const count = ctx.floorIndex >= 3 ? 14 : 11;
        for (let i = 0; i < count; i++) {
          const sa = e.t * 0.2 + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 150, Math.sin(sa) * 150, "thread", 1, 5.5);
        }
        ctx.shake(3);
      }
      break;
    }
    case "lantern": {
      const orbit = e.t * 0.85 + e.seed * 0.01;
      const tx = clamp(p.x + Math.cos(orbit) * 165, 40, ROOM_W - 40);
      const ty = clamp(p.y + Math.sin(orbit) * 105, 40, ROOM_H - 40);
      steerToward(e, tx, ty, e.speed * 1.2);
      move(e, e.vx * dt, e.vy * dt, ctx);
      if (e.cd <= 0) {
        e.cd = 2.4;
        const sa = Math.atan2(p.y - e.y, p.x - e.x);
        spawnSpread(ctx, e.x, e.y, sa, 3, 0.24, 205, "wax", 1, 5);
      }
      break;
    }
    case "penitent": {
      if (e.state === "cast") {
        e.vx = 0;
        e.vy = 0;
        if (e.timer <= 0) {
          const count = ctx.floorIndex >= 2 ? 16 : 12;
          for (let i = 0; i < count; i++) {
            const sa = (i / count) * TAU + e.seed * 0.01;
            ctx.spawnShot(e.x, e.y, Math.cos(sa) * 135, Math.sin(sa) * 135, "thread", 1, 5);
          }
          for (let i = 0; i < 6; i++) {
            const sa = (i / 6) * TAU + 0.3;
            ctx.spawnShot(e.x, e.y, Math.cos(sa) * 92, Math.sin(sa) * 92, "wax", 1, 6);
          }
          ctx.shake(3);
          e.state = "rest";
          e.timer = 1.8;
        }
      } else if (e.state === "rest") {
        if (e.timer <= 0) e.state = "idle";
      } else {
        steerToward(e, p.x, p.y, e.speed, Math.sin(e.t * 1.4) * 0.25);
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "cast";
          e.timer = ctx.floorIndex >= 2 ? 0.65 : 0.85;
          ctx.telegraph(e.x, e.y, 58, e.timer, "rgba(194,74,51,0.55)");
        }
      }
      break;
    }
    case "maw": {
      e.vx = 0;
      e.vy = 0;
      if (e.cd <= 0) {
        e.cd = 4.6;
        const kind = ctx.rng.weighted([
          ["swarmling", 38],
          ["moth", 28],
          ["grub", 22],
          ["crawler", 12],
        ] as [EnemyKind, number][]);
        ctx.spawnEnemy(kind, clamp(e.x + ctx.rng.range(-34, 34), 30, ROOM_W - 30), clamp(e.y + ctx.rng.range(-24, 24), 30, ROOM_H - 30));
        ctx.shake(1.5);
      }
      if (e.timer <= 0) {
        e.timer = 2.6;
        spawnSpread(ctx, e.x, e.y, a, 3, 0.2, 165, "ink", 1, 5.5);
      }
      break;
    }
    case "scarecrow": {
      e.vx = 0;
      e.vy = 0;
      if (e.cd <= 0) {
        e.cd = 3.4;
        const a2 = ctx.rng.range(0, TAU);
        let tx = clamp(p.x + Math.cos(a2) * 145, 34, ROOM_W - 34);
        let ty = clamp(p.y + Math.sin(a2) * 100, 34, ROOM_H - 34);
        for (let attempt = 0; attempt < 10 && !openAt(ctx, tx, ty, e.r); attempt++) {
          const na = ctx.rng.range(0, TAU);
          tx = clamp(p.x + Math.cos(na) * (110 + ctx.rng.range(0, 80)), 34, ROOM_W - 34);
          ty = clamp(p.y + Math.sin(na) * (80 + ctx.rng.range(0, 50)), 34, ROOM_H - 34);
        }
        e.x = tx;
        e.y = ty;
        e.state = "appear";
        e.timer = 0.35;
        for (let i = 0; i < 4; i++) {
          const sa = a2 + Math.PI + (i - 1.5) * 0.2;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 190, Math.sin(sa) * 190, "wax", 1, 5);
        }
        ctx.shake(2);
      } else if (e.state === "appear" && e.timer <= 0) {
        e.state = "idle";
      }
      break;
    }
    case "swarmling": {
      const flutter = Math.sin(e.t * 14 + e.seed) * 0.65;
      steerToward(e, p.x, p.y, e.speed + (d < 110 ? 24 : 0), flutter);
      move(e, e.vx * dt, e.vy * dt, ctx);
      break;
    }
    case "waxherald": {
      steerToward(e, p.x, p.y, e.speed, Math.sin(e.t * 2.4) * 0.16);
      move(e, e.vx * dt, e.vy * dt, ctx);
      if (e.cd <= 0) {
        e.cd = 3.6;
        e.state = "bless";
        e.timer = 0.5;
        for (const other of ctx.room.enemies) {
          if (other === e || other.dead) continue;
          if (dist(other.x, other.y, e.x, e.y) < 150) other.shielded = Math.max(other.shielded, 1);
        }
        const sa = Math.atan2(p.y - e.y, p.x - e.x);
        spawnSpread(ctx, e.x, e.y, sa, 3, 0.3, 175, "wax", 1, 5.5);
        ctx.shake(1.5);
      } else if (e.state === "bless" && e.timer <= 0) {
        e.state = "idle";
      }
      break;
    }
    case "bonekite": {
      if (e.state === "dive") {
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "rest";
          e.timer = 0.75;
          e.vx = 0;
          e.vy = 0;
        }
      } else if (e.state === "rest") {
        if (e.timer <= 0) {
          e.state = "orbit";
          e.timer = 1.8;
        }
      } else {
        const orbit = e.t * 1.4 + e.seed * 0.01;
        const tx = clamp(p.x + Math.cos(orbit) * 158, 34, ROOM_W - 34);
        const ty = clamp(p.y + Math.sin(orbit) * 100, 34, ROOM_H - 34);
        steerToward(e, tx, ty, e.speed);
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "dive";
          e.timer = 0.62;
          const sa = Math.atan2(p.y - e.y, p.x - e.x);
          e.vx = Math.cos(sa) * 420;
          e.vy = Math.sin(sa) * 420;
          ctx.telegraph(e.x, e.y, 20, 0.16, "rgba(216,203,173,0.6)");
        }
      }
      break;
    }
    case "censer": {
      const sway = Math.sin(e.t * 1.9 + e.seed) * 0.6;
      steerToward(e, p.x, p.y, e.speed, sway);
      move(e, e.vx * dt, e.vy * dt, ctx);
      if (e.cd <= 0) {
        e.cd = 2.7;
        const sa = Math.atan2(p.y - e.y, p.x - e.x);
        for (let i = 0; i < 3; i++) {
          ctx.spawnShot(e.x, e.y, Math.cos(sa + (i - 1) * 0.3) * 130, Math.sin(sa + (i - 1) * 0.3) * 130, "ink", 1, 6.5);
        }
      }
      break;
    }
    case "mimic": {
      if (e.state === "disguise") {
        e.vx = 0;
        e.vy = 0;
        if (d < 105 || e.timer <= 0) {
          e.state = "lunge";
          e.timer = 0.52;
          e.vx = Math.cos(a) * 440;
          e.vy = Math.sin(a) * 440;
          ctx.shake(2);
        }
      } else if (e.state === "lunge") {
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) {
          e.state = "rest";
          e.timer = 0.55;
          e.vx = 0;
          e.vy = 0;
        }
      } else if (e.state === "rest") {
        if (e.timer <= 0) {
          e.state = "lunge";
          e.timer = 0.45;
          const sa = Math.atan2(p.y - e.y, p.x - e.x);
          e.vx = Math.cos(sa) * 380;
          e.vy = Math.sin(sa) * 380;
        }
      } else {
        steerToward(e, p.x, p.y, e.speed + 30);
        move(e, e.vx * dt, e.vy * dt, ctx);
        if (e.timer <= 0) e.state = "disguise";
      }
      break;
    }
    case "weaverling": {
      const away = d < 165 ? a + Math.PI : a;
      const strafe = Math.sin(e.t * 2.6 + e.seed) * 0.5;
      move(e, Math.cos(away + strafe) * e.speed * dt, Math.sin(away + strafe) * e.speed * dt, ctx);
      if (e.cd <= 0) {
        e.cd = 2.2;
        spawnSpread(ctx, e.x, e.y, a, 4, 0.18, 175, "thread", 1, 5);
      }
      break;
    }
    case "hollowman": {
      steerToward(e, p.x, p.y, e.speed, Math.sin(e.t * 2.2) * 0.2);
      move(e, e.vx * dt, e.vy * dt, ctx, true);
      if (e.cd <= 0) {
        e.cd = 3.8;
        const behind = Math.atan2(e.y - p.y, e.x - p.x);
        let hx = clamp(p.x + Math.cos(behind) * 95, 30, ROOM_W - 30);
        let hy = clamp(p.y + Math.sin(behind) * 70, 30, ROOM_H - 30);
        for (let attempt = 0; attempt < 8 && !openAt(ctx, hx, hy, e.r); attempt++) {
          const na = ctx.rng.range(0, TAU);
          hx = clamp(p.x + Math.cos(na) * 95, 30, ROOM_W - 30);
          hy = clamp(p.y + Math.sin(na) * 70, 30, ROOM_H - 30);
        }
        e.x = hx;
        e.y = hy;
        ctx.shake(1.5);
      }
      break;
    }
    case "drifter": {
      steerToward(e, p.x, p.y, e.speed, Math.sin(e.t * 1.2 + e.seed) * 0.5);
      move(e, e.vx * dt, e.vy * dt, ctx, true);
      if (e.cd <= 0) {
        e.cd = 2.9;
        const sa = Math.atan2(p.y - e.y, p.x - e.x);
        ctx.spawnShot(e.x, e.y, Math.cos(sa) * 165, Math.sin(sa) * 165, "ink", 1, 5);
      }
      break;
    }
    case "spore": {
      const wob = Math.sin(e.t * 5 + e.seed) * 0.4;
      steerToward(e, p.x, p.y, e.speed, wob);
      move(e, e.vx * dt, e.vy * dt, ctx);
      if (d < 40) e.dead = true;
      break;
    }
    default:
      break;
  }

  // keep contact-direction stable for drawing
  if (e.vx !== 0) e.angle = Math.atan2(e.vy, e.vx);
  void slowFactor;
}

export function spawnSpread(
  ctx: CombatContext,
  x: number,
  y: number,
  angle: number,
  count: number,
  spread: number,
  speed: number,
  kind: ShotKind,
  damage = 1,
  radius = 5.5,
): void {
  for (let i = 0; i < count; i++) {
    const off = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
    const sa = angle + off;
    ctx.spawnShot(x, y, Math.cos(sa) * speed, Math.sin(sa) * speed, kind, damage, radius);
  }
}

export function normDir(fromX: number, fromY: number, toX: number, toY: number) {
  return norm(toX - fromX, toY - fromY);
}
