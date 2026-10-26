import type { Enemy } from "./types";
import { ROOM_H, ROOM_W, TAU } from "./types";
import { clamp, lerp } from "./util";
import type { CombatContext } from "./enemies";
import { spawnSpread } from "./enemies";

export function updateDrowned(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const homeX = ROOM_W / 2 + Math.sin(e.t * 0.5) * 80;
  const homeY = ROOM_H / 2 + Math.cos(e.t * 0.7) * 35;
  e.x = lerp(e.x, homeX, 0.012);
  e.y = lerp(e.y, homeY, 0.012);

  switch (e.state) {
    case "idle": {
      if (e.timer <= 0) {
        const pick = e.cast % 3;
        e.cast += 1;
        if (pick === 0) {
          e.state = "wailWind";
          e.timer = e.phase2 ? 0.55 : 0.85;
        } else if (pick === 1) {
          e.state = "spiral";
          e.timer = e.phase2 ? 2.5 : 2.0;
          e.cd = 0.1;
          e.angle = e.t;
        } else {
          e.state = "aimWind";
          e.timer = 0.65;
        }
      }
      break;
    }
    case "wailWind": {
      if (e.timer <= 0) {
        const count = e.phase2 ? 18 : 14;
        for (let i = 0; i < count; i++) {
          const sa = e.angle + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 155, Math.sin(sa) * 155, "thread", 1, 6);
        }
        if (e.adds < (e.phase2 ? 3 : 2)) {
          const a = Math.PI * 0.25 + e.adds * 2.1;
          ctx.spawnEnemy("drowned", clamp(e.x + Math.cos(a) * 120, 28, ROOM_W - 28), clamp(e.y + Math.sin(a) * 90, 28, ROOM_H - 28));
          e.adds++;
        }
        ctx.shake(5);
        e.state = "rest";
        e.timer = 0.85;
      }
      break;
    }
    case "spiral": {
      if (e.cd <= 0) {
        e.cd = e.phase2 ? 0.12 : 0.18;
        e.angle += 0.33;
        for (let i = 0; i < 3; i++) {
          const sa = e.angle + (i / 3) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 170, Math.sin(sa) * 170, "thread", 1, 5.5);
        }
      }
      if (e.timer <= 0) {
        e.state = "rest";
        e.timer = 0.75;
      }
      break;
    }
    case "aimWind": {
      if (e.timer <= 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const count = e.phase2 ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const sa = a + (i - (count - 1) / 2) * 0.14;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 205, Math.sin(sa) * 205, "wax", 1, 6);
        }
        e.state = "rest";
        e.timer = 0.8;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.7 : 1.2;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
  void dt;
}

export function updateOrchard(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  switch (e.state) {
    case "idle": {
      e.x += Math.cos(e.t * 0.35) * 7 * dt;
      e.y += Math.sin(e.t * 0.5) * 5 * dt;
      if (e.timer <= 0) {
        const pick = e.cast % 3;
        e.cast += 1;
        if (pick === 0) {
          e.state = "rootWind";
          e.timer = e.phase2 ? 0.6 : 0.9;
        } else if (pick === 1) {
          e.tx = clamp(p.x, 80, ROOM_W - 80);
          e.ty = clamp(p.y, 80, ROOM_H - 80);
          ctx.telegraph(e.tx, e.ty, 62, e.phase2 ? 0.6 : 0.9, "#c9a464");
          e.state = "slamWind";
          e.timer = e.phase2 ? 0.6 : 0.9;
        } else {
          e.state = "grasp";
          e.timer = 0.7;
        }
      }
      break;
    }
    case "rootWind": {
      if (e.timer <= 0) {
        const count = e.phase2 ? 16 : 12;
        for (let i = 0; i < count; i++) {
          const sa = e.t * 0.3 + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 120, Math.sin(sa) * 120, "needle", 1, 7);
        }
        if (e.adds < (e.phase2 ? 4 : 3)) {
          const a = Math.PI * 0.5 + e.adds * 1.7;
          ctx.spawnEnemy(e.phase2 ? "bonewheel" : "roothound", clamp(e.x + Math.cos(a) * 130, 30, ROOM_W - 30), clamp(e.y + Math.sin(a) * 100, 30, ROOM_H - 30));
          e.adds++;
        }
        ctx.shake(4);
        e.state = "rest";
        e.timer = 0.8;
      }
      break;
    }
    case "slamWind": {
      if (e.timer <= 0) {
        e.state = "slam";
        e.timer = 0.45;
      }
      break;
    }
    case "slam": {
      const k = 1 - clamp(e.timer / 0.45, 0, 1);
      e.x = lerp(e.x, e.tx, 0.05 + k * 0.08);
      e.y = lerp(e.y, e.ty, 0.05 + k * 0.08);
      if (e.timer <= 0) {
        const count = e.phase2 ? 18 : 14;
        for (let i = 0; i < count; i++) {
          const sa = (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 190, Math.sin(sa) * 190, "ink", 1, 6);
        }
        ctx.shake(8);
        e.state = "rest";
        e.timer = 0.9;
      }
      break;
    }
    case "grasp": {
      if (e.timer <= 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        spawnSpread(ctx, e.x, e.y, a, e.phase2 ? 7 : 5, 0.5, 220, "thread", 1, 6);
        e.state = "rest";
        e.timer = 0.7;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.6 : 1.0;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
  void dt;
}

export function updateSexton(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  if (e.state === "idle") {
    if (Math.hypot(p.x - e.x, p.y - e.y) > 130) {
      e.x += Math.cos(a) * 38 * dt;
      e.y += Math.sin(a) * 38 * dt;
    }
    if (e.timer <= 0) {
      if (e.cast % 2 === 0) {
        const count = e.phase2 ? 12 : 9;
        for (let i = 0; i < count; i++) {
          const sa = e.t * 0.2 + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 160, Math.sin(sa) * 160, "wax", 1, 5.5);
        }
      } else {
        const count = e.phase2 ? 5 : 4;
        spawnSpread(ctx, e.x, e.y, a, count, 0.35, 230, "needle", 1, 5);
        if (e.adds < 2) {
          ctx.spawnEnemy("husk", clamp(e.x + 90, 30, ROOM_W - 30), clamp(e.y + 70, 30, ROOM_H - 30));
          e.adds++;
        }
      }
      e.cast++;
      ctx.shake(2);
      e.timer = e.phase2 ? 1.1 : 1.7;
    }
  } else {
    e.state = "idle";
  }
}

export function updateCurator(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  if (e.state === "idle") {
    e.x += Math.cos(e.t * 0.7) * 18 * dt;
    e.y += Math.sin(e.t * 0.9) * 12 * dt;
    if (e.timer <= 0) {
      if (e.cast % 3 === 0) {
        const count = e.phase2 ? 16 : 12;
        for (let i = 0; i < count; i++) {
          const sa = e.t * 0.3 + (i / count) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 145, Math.sin(sa) * 145, "ink", 1, 5);
        }
        ctx.shake(3);
      } else if (e.cast % 3 === 1) {
        spawnSpread(ctx, e.x, e.y, a, e.phase2 ? 5 : 3, 0.22, 240, "wax", 1, 5.5);
        if (e.adds < 2) {
          ctx.spawnEnemy("crawler", clamp(e.x + 80, 30, ROOM_W - 30), clamp(e.y + 60, 30, ROOM_H - 30));
          e.adds++;
        }
      }
      e.cast++;
      e.timer = e.phase2 ? 0.9 : 1.4;
    }
  } else {
    e.state = "idle";
  }
}

export function updateBellWidow(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  switch (e.state) {
    case "idle": {
      e.x += Math.cos(e.t * 0.8) * 16 * dt;
      e.y += Math.sin(e.t * 1.1) * 10 * dt;
      if (e.timer <= 0) {
        e.cast += 1;
        if (e.cast % 3 === 0) {
          e.state = "wailWind";
          e.timer = e.phase2 ? 0.65 : 0.9;
          ctx.telegraph(e.x, e.y, 70, e.timer, "rgba(194,74,51,0.55)");
        } else {
          e.state = "ringWind";
          e.timer = 0.55;
        }
      }
      break;
    }
    case "ringWind": {
      if (e.timer <= 0) {
        const count = e.phase2 ? 18 : 14;
        for (let i = 0; i < count; i++) {
          const sa = (i / count) * TAU + e.t * 0.2;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 165, Math.sin(sa) * 165, "thread", 1, 5.5);
        }
        if (e.adds < (e.phase2 ? 3 : 2)) {
          const sa = Math.PI * 0.4 + e.adds * 2.3;
          ctx.spawnEnemy("bellringer", clamp(e.x + Math.cos(sa) * 110, 30, ROOM_W - 30), clamp(e.y + Math.sin(sa) * 80, 30, ROOM_H - 30));
          e.adds++;
        }
        ctx.shake(3);
        e.state = "rest";
        e.timer = 0.9;
      }
      break;
    }
    case "wailWind": {
      if (e.timer <= 0) {
        for (let ring = 0; ring < (e.phase2 ? 3 : 2); ring++) {
          const count = 10;
          for (let i = 0; i < count; i++) {
            const sa = (i / count) * TAU + ring * 0.26;
            ctx.spawnShot(e.x, e.y, Math.cos(sa) * (110 + ring * 46), Math.sin(sa) * (110 + ring * 46), "needle", 1, 5);
          }
        }
        ctx.shake(6);
        e.state = "rest";
        e.timer = 1.0;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.7 : 1.15;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
  void p;
}

export function updateTallyman(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  switch (e.state) {
    case "idle": {
      e.x += Math.cos(e.t * 0.7 + 2) * 22 * dt;
      e.y += Math.sin(e.t * 0.9) * 16 * dt;
      if (e.timer <= 0) {
        e.cast += 1;
        if (e.cast % 3 === 0) {
          e.state = "markWind";
          e.timer = 0.8;
          e.tx = clamp(p.x, 60, ROOM_W - 60);
          e.ty = clamp(p.y, 60, ROOM_H - 60);
          ctx.telegraph(e.tx, e.ty, 64, 0.8, "rgba(216,166,91,0.6)");
        } else {
          e.state = "fanWind";
          e.timer = 0.55;
        }
      }
      break;
    }
    case "fanWind": {
      if (e.timer <= 0) {
        spawnSpread(ctx, e.x, e.y, a, e.phase2 ? 7 : 5, 0.4, 235, "needle", 1, 5);
        if (e.adds < (e.phase2 ? 2 : 1)) {
          ctx.spawnEnemy("scarecrow", clamp(e.x + 80, 30, ROOM_W - 30), clamp(e.y + 60, 30, ROOM_H - 30));
          e.adds++;
        }
        e.state = "rest";
        e.timer = 0.85;
      }
      break;
    }
    case "markWind": {
      if (e.timer <= 0) {
        for (let i = 0; i < (e.phase2 ? 14 : 10); i++) {
          const sa = (i / (e.phase2 ? 14 : 10)) * TAU;
          ctx.spawnShot(e.tx, e.ty, Math.cos(sa) * 140, Math.sin(sa) * 140, "ink", 1, 5.5);
        }
        e.x = clamp(e.tx + (e.x - e.tx) * 0.2, 40, ROOM_W - 40);
        e.y = clamp(e.ty + (e.y - e.ty) * 0.2, 40, ROOM_H - 40);
        ctx.shake(4);
        e.state = "rest";
        e.timer = 0.95;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.65 : 1.05;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
}

export function updateGaunt(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  switch (e.state) {
    case "idle": {
      if (Math.hypot(p.x - e.x, p.y - e.y) > 105) {
        e.x += Math.cos(a) * (e.phase2 ? 72 : 58) * dt;
        e.y += Math.sin(a) * (e.phase2 ? 72 : 58) * dt;
      }
      if (e.timer <= 0) {
        e.cast += 1;
        e.state = e.cast % 3 === 0 ? "slamWind" : "chargeWind";
        e.timer = 0.7;
        e.tx = Math.cos(a);
        e.ty = Math.sin(a);
      }
      break;
    }
    case "chargeWind": {
      if (e.timer <= 0) {
        e.state = "charge";
        e.timer = 0.85;
        e.vx = e.tx * (e.phase2 ? 620 : 520);
        e.vy = e.ty * (e.phase2 ? 620 : 520);
      }
      break;
    }
    case "charge": {
      const bx = e.x;
      const by = e.y;
      e.x = clamp(e.x + e.vx * dt, e.r, ROOM_W - e.r);
      e.y = clamp(e.y + e.vy * dt, e.r, ROOM_H - e.r);
      if (e.timer <= 0 || Math.hypot(e.x - bx, e.y - by) < 1.4) {
        for (let i = 0; i < 8; i++) {
          const sa = (i / 8) * TAU;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 120, Math.sin(sa) * 120, "thread", 1, 5);
        }
        if (e.phase2 && e.adds < 2) {
          ctx.spawnEnemy("lurker", clamp(e.x + 80, 30, ROOM_W - 30), clamp(e.y - 60, 30, ROOM_H - 30));
          e.adds += 1;
        }
        ctx.shake(7);
        e.state = "rest";
        e.timer = 0.75;
      }
      break;
    }
    case "slamWind": {
      if (e.timer <= 0) {
        for (let ring = 0; ring < 2; ring++) {
          const count = 12;
          for (let i = 0; i < count; i++) {
            const sa = (i / count) * TAU + ring * 0.26;
            ctx.spawnShot(e.x, e.y, Math.cos(sa) * (130 + ring * 55), Math.sin(sa) * (130 + ring * 55), "wax", 1, 6);
          }
        }
        ctx.shake(8);
        e.state = "rest";
        e.timer = 0.85;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.65 : 1.0;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
}

export function updateCarver(e: Enemy, ctx: CombatContext, dt: number): void {
  const p = ctx.player;
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  switch (e.state) {
    case "idle": {
      const strafe = a + Math.PI / 2;
      e.x += Math.cos(strafe) * 26 * dt;
      e.y += Math.sin(strafe) * 18 * dt;
      if (e.timer <= 0) {
        e.cast += 1;
        if (e.cast % 3 === 0) {
          e.state = "carveWind";
          e.timer = 0.85;
        } else {
          e.state = "fanWind";
          e.timer = 0.5;
        }
      }
      break;
    }
    case "fanWind": {
      if (e.timer <= 0) {
        const count = e.phase2 ? 9 : 7;
        for (let i = 0; i < count; i++) {
          const sa = a + (i - (count - 1) / 2) * 0.16;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 215, Math.sin(sa) * 215, "needle", 1, 5);
        }
        e.state = "rest";
        e.timer = 0.8;
      }
      break;
    }
    case "carveWind": {
      if (e.timer <= 0) {
        const count = e.phase2 ? 18 : 14;
        for (let i = 0; i < count; i++) {
          const sa = (i / count) * TAU + e.t * 0.2;
          ctx.spawnShot(e.x, e.y, Math.cos(sa) * 155, Math.sin(sa) * 155, "ink", 1, 6);
        }
        if (e.adds < (e.phase2 ? 3 : 2)) {
          const kind = e.adds % 2 === 0 ? "mimic" : "bonewheel";
          ctx.spawnEnemy(kind, clamp(e.x + 90, 30, ROOM_W - 30), clamp(e.y + 50, 30, ROOM_H - 30));
          e.adds += 1;
        }
        ctx.shake(5);
        e.state = "rest";
        e.timer = 0.9;
      }
      break;
    }
    case "rest": {
      if (e.timer <= 0) {
        e.state = "idle";
        e.timer = e.phase2 ? 0.65 : 1.0;
      }
      break;
    }
    default:
      e.state = "idle";
      break;
  }
  void p;
}
