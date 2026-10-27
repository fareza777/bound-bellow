import { Rng } from "./rng";
import type { Room } from "./types";
import { ROOM_H, ROOM_W, TAU, WALL } from "./types";
import type { Theme } from "./theme";
import { drawCandle } from "./art";

/**
 * Chapter-specific set dressing. Everything here is decorative: it is baked
 * into the cached room backdrop (or painted as a cheap ambience layer) and
 * never changes collision or gameplay readability.
 */
export function drawChapterDressing(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  rng: Rng,
  room: Room,
): void {
  const fx = WALL;
  const fy = WALL;
  const cx = WALL + ROOM_W / 2;
  const cy = WALL + ROOM_H / 2;
  ctx.save();

  drawChapterFloorWash(ctx, theme, room, fx, fy, rng);

  if (theme.index === 0) drawCellarDressing(ctx, room, rng, fx, fy);
  else if (theme.index === 1) drawOssuaryDressing(ctx, room, rng, fx, fy);
  else if (theme.index === 2) drawDrownedDressing(ctx, room, rng, fx, fy);
  else if (theme.index === 3) drawOrchardDressing(ctx, rng, fx, fy);
  else drawHollowDressing(ctx, rng, fx, fy);

  drawRoomTypeDressing(ctx, room, theme, rng, fx, fy);
  ctx.restore();
}


function drawChapterFloorWash(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  room: Room,
  fx: number,
  fy: number,
  rng: Rng,
): void {
  ctx.save();
  if (theme.index === 2) {
    const water = ctx.createLinearGradient(0, fy + ROOM_H * 0.35, 0, fy + ROOM_H);
    water.addColorStop(0, "rgba(40,84,84,0.05)");
    water.addColorStop(0.62, "rgba(30,72,75,0.16)");
    water.addColorStop(1, "rgba(22,54,58,0.26)");
    ctx.fillStyle = water;
    ctx.fillRect(fx, fy, ROOM_W, ROOM_H);
    for (let i = 0; i < 9; i++) {
      const x = fx + rng.range(0, ROOM_W);
      const y = fy + ROOM_H * 0.45 + rng.range(0, ROOM_H * 0.5);
      ctx.strokeStyle = "rgba(170,214,200,0.10)";
      ctx.lineWidth = 0.8;
      const w = rng.range(22, 54);
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.bezierCurveTo(x - w * 0.35, y - 3, x + w * 0.25, y + 3, x + w, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(168,210,196,0.055)";
    for (let i = 0; i < 5; i++) {
      const x = fx + rng.range(40, ROOM_W - 40);
      const y = fy + rng.range(ROOM_H * 0.55, ROOM_H - 20);
      const w = rng.range(18, 42);
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x - w * 0.2, y - 5, x + w, y + 1);
      ctx.quadraticCurveTo(x + w * 0.1, y + 6, x - w, y);
      ctx.fill();
    }
  } else if (theme.index === 3) {
    ctx.fillStyle = "rgba(62,45,24,0.10)";
    for (const [bx, by, bw, bh] of [
      [fx + ROOM_W * 0.2, fy + ROOM_H - 30, 150, 36],
      [fx + ROOM_W * 0.82, fy + 36, 130, 30],
    ]) {
      ctx.beginPath();
      ctx.moveTo(bx - bw, by);
      ctx.bezierCurveTo(bx - bw * 0.55, by - bh, bx + bw * 0.25, by - bh * 0.6, bx + bw, by + bh * 0.15);
      ctx.bezierCurveTo(bx + bw * 0.5, by + bh, bx - bw * 0.35, by + bh * 0.8, bx - bw, by);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(117,86,45,0.18)";
    for (let i = 0; i < 7; i++) {
      const x = fx + rng.range(20, ROOM_W - 20);
      const y = fy + ROOM_H - rng.range(10, 50);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rng.range(-30, 30), y - 20, x + rng.range(-48, 48), y - 34, x + rng.range(-25, 25), y - 54);
      ctx.stroke();
    }
  } else if (theme.index === 4) {
    const veins = ctx.createRadialGradient(
      fx + ROOM_W / 2,
      fy + ROOM_H / 2,
      20,
      fx + ROOM_W / 2,
      fy + ROOM_H / 2,
      ROOM_W * 0.55,
    );
    veins.addColorStop(0, "rgba(138,45,46,0.08)");
    veins.addColorStop(1, "rgba(60,16,18,0)");
    ctx.fillStyle = veins;
    ctx.fillRect(fx, fy, ROOM_W, ROOM_H);
    for (let i = 0; i < 5; i++) {
      const y = fy + rng.range(30, ROOM_H - 30);
      ctx.strokeStyle = "rgba(178,56,52,0.16)";
      ctx.lineWidth = rng.range(0.8, 1.6);
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.bezierCurveTo(fx + ROOM_W * 0.28, y + rng.range(-22, 22), fx + ROOM_W * 0.7, y + rng.range(-22, 22), fx + ROOM_W, y + rng.range(-12, 12));
      ctx.stroke();
    }
  }
  ctx.restore();
  void room;
}

function diamondPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
}

function drawRoomSigil(
  ctx: CanvasRenderingContext2D,
  room: Room,
  theme: Theme,
  cx: number,
  cy: number,
  rng: Rng,
): void {
  const accent = theme.palette.accent;
  ctx.save();
  if (room.type === "start") {
    ctx.strokeStyle = "rgba(194,74,51,0.16)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 92, cy - 66);
    ctx.bezierCurveTo(cx - 70, cy - 10, cx + 20, cy - 8, cx + 48, cy + 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 92, cy - 66);
    ctx.bezierCurveTo(cx - 120, cy - 20, cx - 40, cy + 4, cx + 48, cy + 38);
    ctx.stroke();
    ctx.fillStyle = "rgba(232,200,140,0.10)";
    diamondPath(ctx, cx + 66, cy + 30, 15, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(232,200,140,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (room.type === "boss" || room.type === "challenge") {
    const boss = room.type === "boss";
    const rx = boss ? 172 : 132;
    const ry = boss ? 122 : 94;
    ctx.strokeStyle = boss ? "rgba(194,74,51,0.24)" : "rgba(216,166,91,0.18)";
    ctx.lineWidth = boss ? 2 : 1.2;
    diamondPath(ctx, cx, cy, rx, ry);
    ctx.stroke();
    diamondPath(ctx, cx, cy, rx * 0.74, ry * 0.74);
    ctx.stroke();
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const px = cx + sx * rx * 0.74;
      const py = cy + sy * ry * 0.74;
      ctx.beginPath();
      ctx.moveTo(px - sx * 22, py);
      ctx.lineTo(px, py);
      ctx.lineTo(px, py - sy * 16);
      ctx.stroke();
    }
    const marks = boss ? 10 : 6;
    for (let i = 1; i < marks; i++) {
      const a = -Math.PI / 2 + (i / marks) * TAU;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const ix = Math.abs(dx) * rx * 0.74;
      const iy = Math.abs(dy) * ry * 0.74;
      const k = Math.min(ix / Math.max(0.001, Math.abs(dx)), iy / Math.max(0.001, Math.abs(dy)));
      ctx.beginPath();
      ctx.moveTo(cx + dx * k * 0.82, cy + dy * k * 0.82);
      ctx.lineTo(cx + dx * k, cy + dy * k);
      ctx.stroke();
    }
    if (boss) {
      ctx.strokeStyle = "rgba(194,74,51,0.12)";
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i / 4) * TAU;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 24);
        ctx.lineTo(cx + Math.cos(a) * rx * 0.72, cy + Math.sin(a) * ry * 0.72);
        ctx.stroke();
      }
    }
  } else if (room.type === "treasure" || room.type === "vault") {
    ctx.strokeStyle = "rgba(216,166,91,0.17)";
    ctx.lineWidth = 1.2;
    for (const inset of [34, 52, 70]) {
      ctx.strokeRect(
        cx - 90 + inset * 0.45,
        cy - 54 + inset * 0.28,
        (90 - inset * 0.45) * 2,
        (54 - inset * 0.28) * 2,
      );
    }
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      diamondPath(ctx, cx + sx * 86, cy + sy * 50, 7, 7);
      ctx.stroke();
    }
    if (room.type === "vault") {
      ctx.strokeRect(cx - 34, cy - 24, 68, 48);
      ctx.strokeRect(cx - 20, cy - 14, 40, 28);
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.stroke();
    }
  } else if (room.type === "shop") {
    ctx.fillStyle = "rgba(84,36,28,0.13)";
    ctx.fillRect(cx - 112, cy - 34, 224, 68);
    ctx.strokeStyle = "rgba(216,166,91,0.16)";
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(cx - 108, cy - 30, 216, 60);
    ctx.setLineDash([]);
    for (let i = -2; i <= 2; i++) {
      diamondPath(ctx, cx + i * 34, cy + (i % 2) * 6, 8, 8);
      ctx.stroke();
    }
  } else if (room.type === "library") {
    ctx.strokeStyle = "rgba(216,166,91,0.14)";
    ctx.lineWidth = 1.1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 96, cy + i * 9);
      ctx.lineTo(cx + 96, cy + i * 9);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = "rgba(216,166,91,0.09)";
      ctx.fillRect(cx - 74 + i * 24, cy - 25, rng.range(5, 10), rng.range(18, 42));
    }
  } else if (room.type === "sacrifice") {
    ctx.strokeStyle = "rgba(141,48,40,0.24)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(cx - 78, cy - 44, 156, 88);
    ctx.strokeRect(cx - 62, cy - 30, 124, 60);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 34);
      ctx.lineTo(cx + Math.cos(a) * 76, cy + Math.sin(a) * 42);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(116,32,28,0.18)";
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy + 12);
    ctx.bezierCurveTo(cx - 4, cy + 20, cx + 24, cy + 4, cx + 48, cy + 20);
    ctx.bezierCurveTo(cx + 20, cy + 30, cx - 18, cy + 36, cx - 36, cy + 12);
    ctx.fill();
  } else if (room.type === "secret") {
    ctx.strokeStyle = "rgba(214,214,190,0.11)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 82);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 33);
      ctx.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 54);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = accent + "16";
    ctx.fillStyle = accent + "08";
    ctx.lineWidth = 1;
    if (theme.index === 0) {
      ctx.strokeRect(cx - 34, cy - 17, 68, 34);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 28, cy + i * 6);
        ctx.lineTo(cx + 28, cy + i * 6);
        ctx.stroke();
      }
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        diamondPath(ctx, cx + sx * 72, cy + sy * 44, 6, 6);
        ctx.fill();
        ctx.stroke();
      }
    } else if (theme.index === 1) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          diamondPath(ctx, cx + i * 46, cy + j * 30, 16, 11);
          ctx.stroke();
        }
      }
      diamondPath(ctx, cx, cy, 18, 12);
      ctx.stroke();
    } else if (theme.index === 2) {
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.moveTo(cx - 104, cy + j * 18);
        ctx.bezierCurveTo(cx - 48, cy + j * 18 - 7, cx + 4, cy + j * 18 + 7, cx + 104, cy + j * 18);
        ctx.stroke();
      }
    } else if (theme.index === 3) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 46);
      ctx.bezierCurveTo(cx - 26, cy - 10, cx - 74, cy - 4, cx - 92, cy + 30);
      ctx.moveTo(cx, cy - 46);
      ctx.bezierCurveTo(cx + 26, cy - 10, cx + 74, cy - 4, cx + 92, cy + 30);
      ctx.moveTo(cx, cy + 8);
      ctx.bezierCurveTo(cx - 22, cy + 28, cx - 36, cy + 48, cx - 54, cy + 58);
      ctx.moveTo(cx, cy + 8);
      ctx.bezierCurveTo(cx + 22, cy + 28, cx + 36, cy + 48, cx + 54, cy + 58);
      ctx.stroke();
      diamondPath(ctx, cx, cy - 4, 14, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      diamondPath(ctx, cx, cy, 82, 58);
      ctx.stroke();
      diamondPath(ctx, cx, cy, 54, 38);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i / 4) * TAU;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 54, cy + Math.sin(a) * 38);
        ctx.lineTo(cx + Math.cos(a) * 82, cy + Math.sin(a) * 58);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawCellarDressing(
  ctx: CanvasRenderingContext2D,
  room: Room,
  rng: Rng,
  fx: number,
  fy: number,
): void {
  ctx.save();
  // Old timber beam and posts over the cellar stone.
  ctx.strokeStyle = "rgba(47,33,22,0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(fx + 12, 9);
  ctx.lineTo(fx + ROOM_W - 12, 9);
  ctx.stroke();
  ctx.strokeStyle = "rgba(120,83,51,0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(fx + 12, 7);
  ctx.lineTo(fx + ROOM_W - 12, 8);
  ctx.stroke();
  for (const x of [fx + 34, fx + ROOM_W / 2, fx + ROOM_W - 34]) {
    ctx.strokeStyle = "rgba(43,30,20,0.75)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + rng.range(-2, 2), 30);
    ctx.stroke();
    ctx.fillStyle = "rgba(190,165,120,0.2)";
    ctx.beginPath();
    ctx.arc(x + 5, 14, 2.2, 0, TAU);
    ctx.fill();
  }
  // A little cupboard set into the left wall.
  ctx.fillStyle = "rgba(22,15,10,0.55)";
  ctx.fillRect(fx - WALL + 3, fy + 40, 26, 74);
  ctx.strokeStyle = "rgba(128,94,58,0.4)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(fx - WALL + 5, fy + 43, 21, 68);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = "rgba(170,137,91,0.28)";
    ctx.beginPath();
    ctx.moveTo(fx - WALL + 7, fy + 59 + i * 17);
    ctx.lineTo(fx - WALL + 25, fy + 59 + i * 17);
    ctx.stroke();
  }
  // Coal and straw flecks.
  for (let i = 0; i < 18; i++) {
    const x = fx + rng.range(24, ROOM_W - 24);
    const y = fy + rng.range(22, ROOM_H - 22);
    ctx.fillStyle = i % 3 === 0 ? "rgba(205,170,102,0.16)" : "rgba(18,13,10,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y, rng.range(1, 3), rng.range(0.8, 1.8), rng.range(0, TAU), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  void room;
}

function drawOssuaryDressing(
  ctx: CanvasRenderingContext2D,
  room: Room,
  rng: Rng,
  fx: number,
  fy: number,
): void {
  ctx.save();
  const slots = [fx + 62, fx + ROOM_W * 0.3, fx + ROOM_W * 0.7, fx + ROOM_W - 62];
  if (!room.doors.n) slots.push(fx + ROOM_W / 2);
  for (const x of slots) {
    ctx.fillStyle = "rgba(10,8,6,0.55)";
    ctx.beginPath();
    ctx.moveTo(x - 17, 31);
    ctx.lineTo(x - 17, 15);
    ctx.quadraticCurveTo(x, 1, x + 17, 15);
    ctx.lineTo(x + 17, 31);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(212,197,166,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(214,201,170,0.4)";
    ctx.beginPath();
    ctx.ellipse(x, 22, 5, 4.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(17,12,9,0.8)";
    ctx.beginPath();
    ctx.arc(x - 1.5, 21, 1, 0, TAU);
    ctx.arc(x + 1.5, 21, 1, 0, TAU);
    ctx.fill();
    if (rng.chance(0.55)) {
      ctx.fillStyle = "rgba(216,166,91,0.22)";
      ctx.fillRect(x + 22, 14, 2.5, 10);
      ctx.fillStyle = "rgba(240,200,130,0.6)";
      ctx.beginPath();
      ctx.ellipse(x + 23.25, 10, 1.5, 3.4, 0, 0, TAU);
      ctx.fill();
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const y = fy + 30 + i * 17;
      const x = side < 0 ? fx - WALL + 12 : fx + ROOM_W + WALL - 12;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(216,203,173,0.34)" : "rgba(206,190,157,0.19)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 7, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - 7, y, 1.8, 0, TAU);
      ctx.arc(x + 7, y, 1.8, 0, TAU);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = fx + rng.range(30, ROOM_W - 30);
    const y = fy + rng.range(20, ROOM_H - 20);
    ctx.strokeStyle = "rgba(232,211,170,0.09)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + rng.range(-8, 8), y + 8, x + rng.range(-3, 3), y + 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDrownedDressing(
  ctx: CanvasRenderingContext2D,
  room: Room,
  rng: Rng,
  fx: number,
  fy: number,
): void {
  ctx.save();
  const slots = [fx + ROOM_W * 0.22, fx + ROOM_W * 0.78];
  if (!room.doors.n) slots.push(fx + ROOM_W / 2);
  for (const x of slots) {
    ctx.fillStyle = "rgba(57,95,91,0.36)";
    ctx.beginPath();
    ctx.moveTo(x - 32, 39);
    ctx.lineTo(x - 32, 12);
    ctx.quadraticCurveTo(x, -8, x + 32, 12);
    ctx.lineTo(x + 32, 39);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(186,214,201,0.28)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = "rgba(199,220,204,0.2)";
    ctx.beginPath();
    ctx.ellipse(x, 17, 6, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(120,160,150,0.15)";
    ctx.beginPath();
    ctx.moveTo(x - 10, 23);
    ctx.quadraticCurveTo(x, 34, x + 12, 23);
    ctx.lineTo(x + 8, 36);
    ctx.lineTo(x - 7, 36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(174,214,198,0.10)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(fx - WALL + 2, fy + ROOM_H * 0.55);
  for (let x = fx - WALL; x <= fx + ROOM_W + WALL; x += 24) {
    ctx.lineTo(x + 12, fy + ROOM_H * 0.55 + Math.sin(x * 0.09) * 4);
  }
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const x = fx + rng.range(25, ROOM_W - 25);
    const y = fy + rng.range(20, ROOM_H - 20);
    const w = rng.range(14, 44);
    const h = rng.range(3, 10);
    ctx.strokeStyle = "rgba(150,196,180,0.08)";
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 0.3, y - h, x + w * 0.4, y + h, x + w, y);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = fx + rng.range(20, ROOM_W - 20);
    ctx.strokeStyle = "rgba(87,122,103,0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rng.range(-8, 8), 12, x + rng.range(-15, 15), 22, x + rng.range(-10, 10), 36);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrchardDressing(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  fx: number,
  fy: number,
): void {
  ctx.save();
  for (const side of [-1, 1]) {
    const baseX = side < 0 ? fx - 12 : fx + ROOM_W + 12;
    ctx.strokeStyle = "rgba(66,45,25,0.46)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(baseX, 0);
    ctx.bezierCurveTo(baseX + side * 36, 14, baseX + side * 20, 30, baseX + side * 8, 48);
    ctx.stroke();
    ctx.strokeStyle = "rgba(122,92,52,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(baseX, 3);
    ctx.bezierCurveTo(baseX + side * 22, 12, baseX + side * 16, 24, baseX + side * 4, 38);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = fx + rng.range(30, ROOM_W - 30);
    const len = rng.range(15, 30);
    ctx.strokeStyle = "rgba(57,39,23,0.36)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, len);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? "rgba(139,106,61,0.3)" : "rgba(201,164,100,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, len + 3, rng.range(2.5, 4.3), rng.range(4, 6), 0.1, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 10; i++) {
    const x = fx + rng.range(20, ROOM_W - 20);
    const y = fy + rng.range(16, ROOM_H - 16);
    ctx.strokeStyle = "rgba(77,53,30,0.18)";
    ctx.lineWidth = rng.range(0.8, 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + rng.range(-20, 20), y + 9, x + rng.range(-24, 24), y + 16, x + rng.range(-15, 15), y + 28);
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = fx + rng.range(16, ROOM_W - 16);
    const y = fy + rng.range(16, ROOM_H - 16);
    ctx.fillStyle = i % 3 === 0 ? "rgba(139,92,48,0.22)" : "rgba(100,86,50,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y, rng.range(2, 5), rng.range(1, 2.4), rng.range(0, TAU), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawHollowDressing(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  fx: number,
  fy: number,
): void {
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const x = fx + rng.range(0, ROOM_W);
    const y = i % 2 === 0 ? 0 : fy + ROOM_H + WALL;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(180,58,52,0.18)" : "rgba(93,29,31,0.35)";
    ctx.lineWidth = rng.range(1, 2.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + rng.range(-30, 30),
      y + (i % 2 === 0 ? 16 : -16),
      x + rng.range(-44, 44),
      y + (i % 2 === 0 ? 28 : -28),
      x + rng.range(-22, 22),
      y + (i % 2 === 0 ? 40 : -40),
    );
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = fy + 40 + i * 92;
      const x = side < 0 ? fx - WALL + 1 : fx + ROOM_W + WALL - 1;
      ctx.strokeStyle = "rgba(205,176,138,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 26, side < 0 ? -Math.PI / 2 : Math.PI / 2, side < 0 ? Math.PI / 2 : (Math.PI * 3) / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(104,35,36,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 20, side < 0 ? -Math.PI / 2 : Math.PI / 2, side < 0 ? Math.PI / 2 : (Math.PI * 3) / 2);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = "rgba(184,64,47,0.24)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(fx - 20, 5);
  ctx.bezierCurveTo(fx + ROOM_W * 0.25, 22, fx + ROOM_W * 0.7, -8, fx + ROOM_W + 20, 12);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = fx + rng.range(30, ROOM_W - 30);
    const y = fy + rng.range(20, ROOM_H - 20);
    ctx.strokeStyle = "rgba(156,44,37,0.16)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + rng.range(-30, 30), y + 10, x + rng.range(-40, 40), y + 18, x + rng.range(-20, 20), y + 34);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = fx + rng.range(16, ROOM_W - 16);
    const y = fy + rng.range(16, ROOM_H - 16);
    ctx.strokeStyle = "rgba(224,138,84,0.12)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-8, 8), y + rng.range(-6, 6));
    ctx.lineTo(x + rng.range(-12, 12), y + rng.range(-10, 10));
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoomTypeDressing(
  ctx: CanvasRenderingContext2D,
  room: Room,
  theme: Theme,
  rng: Rng,
  fx: number,
  fy: number,
): void {
  ctx.save();
  if (room.type === "shop") {
    const x = fx + ROOM_W * 0.5;
    ctx.strokeStyle = "rgba(216,166,91,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 44, 4);
    ctx.quadraticCurveTo(x, 12, x + 44, 4);
    ctx.stroke();
    ctx.fillStyle = "rgba(56,38,24,0.8)";
    ctx.fillRect(x - 25, 13, 50, 17);
    ctx.strokeStyle = "rgba(216,166,91,0.25)";
    ctx.strokeRect(x - 25, 13, 50, 17);
    ctx.fillStyle = "rgba(216,166,91,0.38)";
    ctx.beginPath();
    ctx.arc(x, 21, 4, 0, TAU);
    ctx.fill();
  } else if (room.type === "library") {
    for (const side of [-1, 1]) {
      const x = side < 0 ? fx - WALL + 1 : fx + ROOM_W + WALL - 1;
      ctx.fillStyle = "rgba(29,18,11,0.55)";
      ctx.fillRect(side < 0 ? x : x - 24, fy + 48, 24, ROOM_H - 96);
      for (let i = 0; i < 9; i++) {
        ctx.strokeStyle = "rgba(196,157,94,0.16)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(side < 0 ? x + 2 : x - 22, fy + 54 + i * 24);
        ctx.lineTo(side < 0 ? x + 22 : x - 2, fy + 54 + i * 24);
        ctx.stroke();
      }
    }
  } else if (room.type === "treasure" || room.type === "sacrifice") {
    for (const side of [-1, 1]) {
      const x = fx + ROOM_W / 2 + side * 148;
      drawCandle(ctx, x - 10, fy + ROOM_H * 0.52, 0, 3 + side);
      drawCandle(ctx, x + 10, fy + ROOM_H * 0.58, 0, 7 + side);
    }
  } else if (room.type === "boss") {
    for (const side of [-1, 1]) {
      const x = fx + ROOM_W / 2 + side * 210;
      ctx.fillStyle = "rgba(84,27,25,0.28)";
      ctx.beginPath();
      ctx.moveTo(x - 15, 0);
      ctx.lineTo(x + 15, 0);
      ctx.lineTo(x + 10, 34);
      ctx.lineTo(x, 27);
      ctx.lineTo(x - 10, 34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(216,166,91,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.lineTo(x, 24);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        drawCandle(ctx, x - 8 + (i % 2) * 16, fy + ROOM_H * 0.32 + i * 9, 0, 5 + i);
      }
    }
  } else if (room.type === "challenge") {
    ctx.strokeStyle = "rgba(194,74,51,0.22)";
    ctx.beginPath();
    ctx.moveTo(fx + 24, fy + 28);
    ctx.lineTo(fx + 76, fy + 40);
    ctx.moveTo(fx + ROOM_W - 24, fy + 28);
    ctx.lineTo(fx + ROOM_W - 76, fy + 40);
    ctx.stroke();
  } else if (room.type === "vault") {
    for (let i = 0; i < 6; i++) {
      const x = fx + 36 + i * 40;
      ctx.strokeStyle = "rgba(18,13,9,0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 30);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = fx + rng.range(30, ROOM_W - 30);
      const y = fy + rng.range(30, ROOM_H - 30);
      ctx.fillStyle = "rgba(216,166,91,0.12)";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  void theme;
}

export function drawChapterAmbient(
  ctx: CanvasRenderingContext2D,
  room: Room,
  theme: Theme,
  time: number,
): void {
  const rng = new Rng(room.seed ^ 0x51a7);
  const fx = WALL;
  const fy = WALL;
  ctx.save();
  if (theme.index === 0) {
    for (let i = 0; i < 12; i++) {
      const x = fx + rng.range(0, ROOM_W) + Math.sin(time * 0.25 + i * 2.1) * 10;
      const y = fy + ((rng.range(0, ROOM_H) + time * (3 + (i % 4))) % ROOM_H);
      ctx.fillStyle = "rgba(232,214,178,0.1)";
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + (i % 2) * 0.7, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const x = fx + rng.range(60, ROOM_W - 60);
      const y = fy + ((rng.range(0, ROOM_H) + time * 3) % ROOM_H);
      ctx.strokeStyle = "rgba(175,206,196,0.08)";
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.lineTo(x + 12, y);
      ctx.stroke();
    }
  } else if (theme.index === 1) {
    for (let i = 0; i < 10; i++) {
      const x = fx + rng.range(0, ROOM_W) + Math.sin(time * 0.18 + i) * 12;
      const y = fy + ((rng.range(0, ROOM_H) - time * (4 + (i % 3))) % ROOM_H + ROOM_H) % ROOM_H;
      ctx.fillStyle = i % 3 === 0 ? "rgba(240,205,150,0.13)" : "rgba(199,190,164,0.09)";
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + (i % 2) * 0.7, 0, TAU);
      ctx.fill();
    }
  } else if (theme.index === 2) {
    for (let i = 0; i < 10; i++) {
      const x = fx + rng.range(10, ROOM_W - 10);
      const y = fy + ROOM_H - ((rng.range(0, ROOM_H) + time * (5 + (i % 4))) % ROOM_H);
      ctx.strokeStyle = "rgba(184,220,208,0.14)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + (i % 3), 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const y = fy + rng.range(20, ROOM_H - 20);
      ctx.strokeStyle = "rgba(168,212,196,0.055)";
      ctx.beginPath();
      ctx.moveTo(fx, y);
      ctx.bezierCurveTo(
        fx + ROOM_W * 0.3,
        y + Math.sin(time * 0.4 + i) * 8,
        fx + ROOM_W * 0.7,
        y - Math.cos(time * 0.3 + i) * 8,
        fx + ROOM_W,
        y,
      );
      ctx.stroke();
    }
  } else if (theme.index === 3) {
    for (let i = 0; i < 9; i++) {
      const x = fx + rng.range(0, ROOM_W) + Math.sin(time * 0.45 + i * 1.7) * 18;
      const y = fy + ((rng.range(0, ROOM_H) + time * (4 + (i % 3))) % ROOM_H);
      ctx.fillStyle = i % 3 === 0 ? "rgba(158,92,43,0.2)" : "rgba(194,174,120,0.11)";
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2, 1.1, time * 0.6 + i, 0, TAU);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 13; i++) {
      const x = fx + rng.range(0, ROOM_W) + Math.sin(time * 0.8 + i) * 12;
      const y = fy + ROOM_H - ((rng.range(0, ROOM_H) + time * (6 + (i % 4))) % ROOM_H);
      ctx.fillStyle = i % 3 === 0 ? "rgba(240,126,82,0.26)" : "rgba(220,90,68,0.12)";
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU);
      ctx.fill();
    }
    const pulse = 0.04 + (Math.sin(time * 1.7) + 1) * 0.028;
    const glow = ctx.createRadialGradient(
      fx + ROOM_W / 2,
      fy + ROOM_H / 2,
      30,
      fx + ROOM_W / 2,
      fy + ROOM_H / 2,
      360,
    );
    glow.addColorStop(0, "rgba(176,54,48," + pulse + ")");
    glow.addColorStop(1, "rgba(80,20,18,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
  }
  ctx.restore();
}
