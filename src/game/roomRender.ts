import { Rng } from "./rng";
import type { Dir, Interior, Room } from "./types";
import { ROOM_H, ROOM_W, ROOM_X, ROOM_Y, TAU, WALL } from "./types";
import type { Theme } from "./theme";
import { drawCandle, drawTorch, PAL, roundRect } from "./art";
import { drawChapterAmbient, drawChapterDressing } from "./roomDressing";

export type DoorVisual = "open" | "closed" | "locked" | "boss";

export class RoomRenderer {
  private cache = new Map<string, HTMLCanvasElement>();
  private w = ROOM_W + WALL * 2;
  private h = ROOM_H + WALL * 2;

  drawBackdrop(
    ctx: CanvasRenderingContext2D,
    room: Room,
    theme: Theme,
    time: number,
  ): void {
    let canvas = this.cache.get(room.id);
    if (!canvas) {
      canvas = this.build(room, theme);
      this.cache.set(room.id, canvas);
    }
    ctx.save();
    ctx.translate(ROOM_X - WALL, ROOM_Y - WALL);
    ctx.drawImage(canvas, 0, 0);
    drawInteriorAmbient(ctx, room, theme, time);
    drawChapterAmbient(ctx, room, theme, time);

    // animated torch glow (baked brackets / dynamic flame light)
    const flick = 0.85 + Math.sin(time * 8.1) * 0.08 + Math.sin(time * 21) * 0.04;
    for (const [x, y] of [[8, 12], [this.w - 8, 12], [8, this.h - 12], [this.w - 8, this.h - 12]]) {
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 92);
      glow.addColorStop(0, `rgba(232,179,108,${0.2 * flick})`);
      glow.addColorStop(0.5, `rgba(190,120,60,${0.08 * flick})`);
      glow.addColorStop(1, "rgba(190,120,60,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 92, 0, TAU);
      ctx.fill();
    }

    // candles near the wall (inside playfield margin)
    drawCandle(ctx, -18, ROOM_H * 0.32 + WALL, time, room.gx + 2);
    drawCandle(ctx, this.w + 10, ROOM_H * 0.68 + WALL, time, room.gy + 7);
    if (theme.index === 1) {
      drawCandle(ctx, WALL + 14, -16 + WALL, time, 3);
      drawCandle(ctx, this.w - WALL - 14, this.h - WALL + 2, time, 5);
    }

    // dust motes
    const rng = new Rng(room.seed ^ 0x33abc);
    for (let i = 0; i < 12; i++) {
      const dx = WALL + rng.next() * ROOM_W;
      const dy = WALL + rng.next() * ROOM_H;
      const drift = Math.sin(time * 0.4 + i * 2.7) * 9;
      const dy2 = ((time * (5 + (i % 4) * 3) + i * 31) % ROOM_H);
      ctx.fillStyle = `rgba(232,214,178,${0.08 + (i % 3) * 0.03})`;
      ctx.beginPath();
      ctx.arc(dx + drift, WALL + ((dy + dy2) % ROOM_H), 0.8 + (i % 2) * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawDoors(
    ctx: CanvasRenderingContext2D,
    room: Room,
    theme: Theme,
    time: number,
    getState: (dir: Dir) => DoorVisual | null,
  ): void {
    const cyx = ROOM_X + ROOM_W / 2;
    const cyy = ROOM_Y + ROOM_H / 2;
    const specs: { dir: Dir; x: number; y: number; angle: number }[] = [
      { dir: "n", x: cyx, y: ROOM_Y, angle: 0 },
      { dir: "s", x: cyx, y: ROOM_Y + ROOM_H, angle: Math.PI },
      { dir: "w", x: ROOM_X, y: cyy, angle: -Math.PI / 2 },
      { dir: "e", x: ROOM_X + ROOM_W, y: cyy, angle: Math.PI / 2 },
    ];
    for (const spec of specs) {
      const state = getState(spec.dir);
      if (!state) continue;
      ctx.save();
      ctx.translate(spec.x, spec.y);
      ctx.rotate(spec.angle);
      // In this local space, the wall lies above y = -WALL..0,
      // the room is below (+y), and the door spans x = -46..46.
      drawDoor(ctx, state, time);
      ctx.restore();
    }
  }

  drawLighting(ctx: CanvasRenderingContext2D, theme: Theme, floorIndex: number, room: Room): void {
    const grad = ctx.createRadialGradient(
      ROOM_X + ROOM_W / 2,
      ROOM_Y + ROOM_H / 2,
      120,
      ROOM_X + ROOM_W / 2,
      ROOM_Y + ROOM_H / 2,
      ROOM_W * 0.64,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.68, "rgba(0,0,0,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0.29)");
    ctx.fillStyle = grad;
    ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, this.w, this.h);

    const warm = ctx.createRadialGradient(
      ROOM_X + ROOM_W / 2,
      ROOM_Y + ROOM_H / 2 - 20,
      20,
      ROOM_X + ROOM_W / 2,
      ROOM_Y + ROOM_H / 2,
      ROOM_W * 0.56,
    );
    warm.addColorStop(0, theme.palette.glow + "35");
    warm.addColorStop(0.55, theme.palette.glow + "14");
    warm.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, this.w, this.h);

    // floor-level stain of color for identity
    if (floorIndex === 2) {
      ctx.fillStyle = "rgba(120,30,30,0.07)";
      ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
    } else if (floorIndex === 1) {
      ctx.fillStyle = "rgba(150,170,165,0.025)";
      ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
    }

    // Chapter colour grade and a soft stage vignette.
    const tint = [
      "rgba(122,142,78,0.035)",
      "rgba(120,156,150,0.04)",
      "rgba(84,138,132,0.05)",
      "rgba(166,128,72,0.045)",
      "rgba(154,56,62,0.05)",
    ][Math.min(4, Math.max(0, floorIndex))];
    ctx.fillStyle = tint;
    ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, this.w, this.h);

    const corner = ctx.createRadialGradient(
      ROOM_X + ROOM_W / 2,
      ROOM_Y + ROOM_H / 2,
      ROOM_W * 0.18,
      ROOM_X + ROOM_W / 2,
      ROOM_Y + ROOM_H / 2,
      ROOM_W * 0.68,
    );
    corner.addColorStop(0, "rgba(0,0,0,0)");
    corner.addColorStop(0.72, "rgba(0,0,0,0.10)");
    corner.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = corner;
    ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, this.w, this.h);

    // Special rooms get one extra pool of local colour.
    if (room.type === "boss") {
      const bossGlow = ctx.createRadialGradient(
        ROOM_X + ROOM_W / 2,
        ROOM_Y + ROOM_H * 0.38,
        30,
        ROOM_X + ROOM_W / 2,
        ROOM_Y + ROOM_H * 0.38,
        ROOM_W * 0.55,
      );
      bossGlow.addColorStop(0, "rgba(180,54,48,0.07)");
      bossGlow.addColorStop(1, "rgba(120,20,20,0)");
      ctx.fillStyle = bossGlow;
      ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, this.w, this.h);
    } else if (room.type === "shop" || room.type === "treasure") {
      const warmPool = ctx.createRadialGradient(
        ROOM_X + ROOM_W / 2,
        ROOM_Y + ROOM_H * 0.58,
        20,
        ROOM_X + ROOM_W / 2,
        ROOM_Y + ROOM_H * 0.58,
        ROOM_W * 0.42,
      );
      warmPool.addColorStop(0, "rgba(232,179,108,0.055)");
      warmPool.addColorStop(1, "rgba(232,179,108,0)");
      ctx.fillStyle = warmPool;
      ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, this.w, this.h);
    }
  }

  private build(room: Room, theme: Theme): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext("2d")!;
    const p = theme.palette;
    const rng = new Rng(room.seed ^ 0x71f3a2);

    // outer void
    ctx.fillStyle = "#0c0a09";
    ctx.fillRect(0, 0, this.w, this.h);

    // floor slab
    ctx.save();
    ctx.translate(WALL, WALL);
    ctx.fillStyle = p.floorA;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    drawFloor(ctx, rng, theme);
    drawFloorDecals(ctx, rng, theme);
    drawInteriorFloor(ctx, rng, theme, room.interior);
    ctx.restore();

    // walls
    drawWalls(ctx, theme, rng, room);
    drawInteriorWalls(ctx, theme, rng, room);
    drawChapterDressing(ctx, theme, rng, room);

    // inner shadow from walls
    ctx.save();
    ctx.translate(WALL, WALL);
    const inner = ctx.createLinearGradient(0, 0, 0, 26);
    inner.addColorStop(0, "rgba(0,0,0,0.38)");
    inner.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = inner;
    ctx.fillRect(0, 0, ROOM_W, 26);
    const innerL = ctx.createLinearGradient(0, 0, 26, 0);
    innerL.addColorStop(0, "rgba(0,0,0,0.3)");
    innerL.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = innerL;
    ctx.fillRect(0, 0, 26, ROOM_H);
    const innerR = ctx.createLinearGradient(ROOM_W, 0, ROOM_W - 26, 0);
    innerR.addColorStop(0, "rgba(0,0,0,0.26)");
    innerR.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = innerR;
    ctx.fillRect(ROOM_W - 26, 0, 26, ROOM_H);
    const innerB = ctx.createLinearGradient(0, ROOM_H, 0, ROOM_H - 22);
    innerB.addColorStop(0, "rgba(0,0,0,0.34)");
    innerB.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = innerB;
    ctx.fillRect(0, ROOM_H - 22, ROOM_W, 22);
    ctx.restore();

    return canvas;
  }
}

function drawInteriorFloor(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  theme: Theme,
  interior: Interior,
): void {
  ctx.save();
  if (interior === "chapel") {
    const grad = ctx.createLinearGradient(ROOM_W / 2 - 70, 0, ROOM_W / 2 + 70, 0);
    grad.addColorStop(0, "rgba(70,22,18,0.42)");
    grad.addColorStop(0.5, "rgba(108,38,28,0.34)");
    grad.addColorStop(1, "rgba(70,22,18,0.42)");
    ctx.fillStyle = grad;
    ctx.fillRect(ROOM_W / 2 - 70, 0, 140, ROOM_H);
    ctx.strokeStyle = "rgba(216,166,91,0.18)";
    ctx.lineWidth = 1;
    for (let y = 16; y < ROOM_H; y += 34) {
      ctx.beginPath();
      ctx.moveTo(ROOM_W / 2 - 70, y);
      ctx.lineTo(ROOM_W / 2 + 70, y);
      ctx.stroke();
    }
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(232,200,140,0.22)";
    ctx.beginPath();
    ctx.moveTo(ROOM_W / 2 - 68, 0);
    ctx.lineTo(ROOM_W / 2 - 68, ROOM_H);
    ctx.moveTo(ROOM_W / 2 + 68, 0);
    ctx.lineTo(ROOM_W / 2 + 68, ROOM_H);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      const x = rng.range(70, ROOM_W - 70);
      const y = rng.range(20, ROOM_H - 20);
      ctx.fillStyle = "rgba(225,198,148,0.13)";
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(2, 6), rng.range(1, 3), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
  } else if (interior === "crypt") {
    ctx.strokeStyle = "rgba(16,12,9,0.32)";
    ctx.lineWidth = 1.4;
    for (let x = 60; x < ROOM_W; x += 176) {
      for (let y = 40; y < ROOM_H; y += 124) {
        ctx.strokeRect(x + 16, y + 10, 120, 82);
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 30);
        ctx.lineTo(x + 86, y + 30);
        ctx.moveTo(x + 58, y + 24);
        ctx.lineTo(x + 58, y + 48);
        ctx.stroke();
        ctx.fillStyle = "rgba(12,9,7,0.12)";
        ctx.fillRect(x + 16, y + 10, 120, 82);
      }
    }
  } else if (interior === "flood") {
    const water = ctx.createLinearGradient(0, ROOM_H * 0.2, 0, ROOM_H);
    water.addColorStop(0, "rgba(42,78,76,0.12)");
    water.addColorStop(1, "rgba(24,54,58,0.36)");
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    for (let i = 0; i < 6; i++) {
      const x = rng.range(20, ROOM_W - 20);
      const y = rng.range(30, ROOM_H - 20);
      const rx = rng.range(34, 92);
      const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
      g.addColorStop(0, "rgba(126,174,164,0.16)");
      g.addColorStop(1, "rgba(30,60,62,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.32, rng.range(-0.2, 0.2), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(196,224,204,0.13)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, rx * 0.58, rx * 0.16, -0.06, 3.0, 5.9);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(182,208,190,0.08)";
    for (let i = 0; i < 7; i++) {
      const y = rng.range(20, ROOM_H - 20);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(ROOM_W * 0.3, y - 8, ROOM_W * 0.6, y + 10, ROOM_W, y - 2);
      ctx.stroke();
    }
  } else if (interior === "pantry") {
    for (let i = 0; i < 10; i++) {
      const x = rng.range(20, ROOM_W - 20);
      const y = rng.range(20, ROOM_H - 20);
      ctx.fillStyle = "rgba(220,204,168,0.07)";
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(8, 28), rng.range(3, 10), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(120,92,60,0.22)";
    ctx.lineWidth = 1;
    for (let x = 40; x < ROOM_W; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x + 30, ROOM_H - 20);
      ctx.stroke();
    }
  } else if (interior === "workshop") {
    ctx.strokeStyle = "rgba(206,188,150,0.10)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const x = rng.range(70, ROOM_W - 70);
      const y = rng.range(50, ROOM_H - 50);
      ctx.beginPath();
      ctx.arc(x, y, rng.range(24, 46), 0, TAU);
      ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17);
        ctx.lineTo(x + Math.cos(a) * 32, y + Math.sin(a) * 32);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(20,16,12,0.18)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(rng.range(40, ROOM_W - 40), rng.range(30, ROOM_H - 30), rng.range(14, 34), rng.range(6, 14), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
  } else if (interior === "nest") {
    ctx.fillStyle = "rgba(42,20,16,0.3)";
    ctx.beginPath();
    ctx.ellipse(ROOM_W / 2, ROOM_H / 2, 250, 145, 0, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 15; i++) {
      const side = i % 2 ? 1 : -1;
      const y = rng.range(10, ROOM_H - 10);
      ctx.strokeStyle = i % 3 === 0 ? "rgba(150,58,42,0.24)" : "rgba(82,62,42,0.34)";
      ctx.lineWidth = rng.range(1, 3);
      ctx.beginPath();
      ctx.moveTo(side < 0 ? 0 : ROOM_W, y);
      ctx.bezierCurveTo(
        ROOM_W * 0.24,
        y + rng.range(-60, 60),
        ROOM_W * 0.4,
        y + rng.range(-40, 40),
        ROOM_W * (0.34 + rng.range(0, 0.18)),
        y + rng.range(-24, 24),
      );
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(206,190,156,0.14)";
      ctx.beginPath();
      ctx.ellipse(rng.range(50, ROOM_W - 50), rng.range(40, ROOM_H - 40), rng.range(3, 7), rng.range(4, 9), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
  } else if (interior === "orchard") {
    ctx.strokeStyle = "rgba(70,48,28,0.30)";
    for (let i = 0; i < 8; i++) {
      const x = rng.range(20, ROOM_W - 20);
      const y = rng.range(10, ROOM_H - 10);
      ctx.lineWidth = rng.range(1, 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rng.range(-50, 50), y + 20, x + rng.range(-70, 70), y + 40, x + rng.range(-30, 30), y + 70);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 3 === 0 ? "rgba(126,64,32,0.28)" : "rgba(102,82,48,0.24)";
      ctx.beginPath();
      ctx.ellipse(rng.range(14, ROOM_W - 14), rng.range(14, ROOM_H - 14), rng.range(3, 8), rng.range(1.4, 3), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(16,13,10,0.2)";
      ctx.beginPath();
      ctx.ellipse(rng.range(30, ROOM_W - 30), rng.range(30, ROOM_H - 30), rng.range(16, 42), rng.range(5, 16), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = "rgba(180,168,140,0.08)";
      ctx.fillRect(rng.range(20, ROOM_W - 20), rng.range(20, ROOM_H - 20), rng.range(4, 12), rng.range(2, 5));
    }
  }
  ctx.restore();
  void theme;
}

function drawInteriorWalls(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  rng: Rng,
  room: Room,
): void {
  const interior = room.interior;
  const p = theme.palette;
  ctx.save();
  if (interior === "chapel") {
    for (const x of [WALL + ROOM_W * 0.18, WALL + ROOM_W * 0.82]) {
      ctx.fillStyle = "rgba(72,26,22,0.6)";
      ctx.beginPath();
      ctx.moveTo(x - 14, WALL + 4);
      ctx.lineTo(x + 14, WALL + 4);
      ctx.lineTo(x + 11, WALL + 11);
      ctx.lineTo(x + 3, WALL + 11);
      ctx.lineTo(x + 4, WALL + 23);
      ctx.lineTo(x - 4, WALL + 23);
      ctx.lineTo(x - 3, WALL + 11);
      ctx.lineTo(x - 11, WALL + 11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(216,166,91,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(216,166,91,0.32)";
      ctx.beginPath();
      ctx.arc(x, WALL + 13, 2.5, 0, TAU);
      ctx.fill();
    }
    // rose window over the north wall
    ctx.strokeStyle = "rgba(216,166,91,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(WALL + ROOM_W / 2, WALL - 13, 24, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(WALL + ROOM_W / 2, WALL - 13);
      ctx.lineTo(WALL + ROOM_W / 2 + Math.cos(a) * 22, WALL - 13 + Math.sin(a) * 22);
      ctx.stroke();
    }
  } else if (interior === "crypt") {
    for (let i = 0; i < 7; i++) {
      const x = WALL + 40 + i * 72;
      const y = WALL - 22;
      ctx.fillStyle = "rgba(10,8,6,0.5)";
      ctx.beginPath();
      ctx.arc(x, y, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(206,192,160,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y + 5, 5, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(16,12,9,0.8)";
      ctx.beginPath();
      ctx.arc(x - 1.6, y + 4, 1, 0, TAU);
      ctx.arc(x + 1.6, y + 4, 1, 0, TAU);
      ctx.fill();
    }
  } else if (interior === "flood") {
    const line = WALL + ROOM_H * 0.32;
    ctx.strokeStyle = "rgba(126,174,164,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WALL, line);
    for (let x = WALL; x < WALL + ROOM_W; x += 36) {
      ctx.lineTo(x + 18, line + Math.sin(x * 0.08) * 4);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(100,140,120,0.12)";
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(WALL + rng.range(0, ROOM_W), WALL + rng.range(0, 18), rng.range(6, 24), rng.range(3, 7), 0, 0, TAU);
      ctx.fill();
    }
  } else if (interior === "pantry") {
    for (const y of [WALL - 24, WALL - 12]) {
      ctx.strokeStyle = "rgba(30,22,15,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(WALL + 40, y);
      ctx.lineTo(WALL + ROOM_W - 40, y);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const x = WALL + 48 + i * 58 + rng.range(-5, 5);
      ctx.fillStyle = i % 3 === 0 ? "rgba(150,130,90,0.5)" : "rgba(96,80,58,0.55)";
      ctx.fillRect(x, WALL - 33, rng.range(5, 9), rng.range(8, 14));
      ctx.fillStyle = "rgba(220,204,168,0.16)";
      ctx.fillRect(x + 1, WALL - 30, 2, 4);
    }
  } else if (interior === "workshop") {
    for (let i = 0; i < 5; i++) {
      const x = WALL + 52 + i * 76;
      ctx.strokeStyle = "rgba(18,13,10,0.7)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, WALL - 30);
      ctx.lineTo(x, WALL - 8);
      ctx.stroke();
      ctx.fillStyle = "rgba(92,82,66,0.65)";
      ctx.beginPath();
      ctx.moveTo(x - 5, WALL - 8);
      ctx.lineTo(x + 5, WALL - 8);
      ctx.lineTo(x + 2, WALL + 2);
      ctx.lineTo(x - 2, WALL + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(20,15,11,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WALL + 10, WALL - 6);
    ctx.lineTo(WALL + 10, WALL + 18);
    ctx.moveTo(WALL + 6, WALL + 4);
    ctx.lineTo(WALL + 14, WALL + 4);
    ctx.stroke();
  } else if (interior === "nest") {
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side < 0 ? WALL : WALL + ROOM_W;
      const y = WALL + rng.range(0, ROOM_H);
      ctx.strokeStyle = i % 3 === 0 ? "rgba(152,56,42,0.3)" : "rgba(88,66,42,0.35)";
      ctx.lineWidth = rng.range(1, 2.6);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - side * 30, y + rng.range(-20, 20), x - side * 60, y + rng.range(-40, 40), x - side * 90, y + rng.range(-30, 30));
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(194,74,51,0.08)";
    ctx.fillRect(0, 0, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
  } else if (interior === "orchard") {
    for (let i = 0; i < 8; i++) {
      const x = WALL + rng.range(0, ROOM_W);
      ctx.strokeStyle = "rgba(66,46,26,0.4)";
      ctx.lineWidth = rng.range(1, 2.4);
      ctx.beginPath();
      ctx.moveTo(x, WALL);
      ctx.bezierCurveTo(x + rng.range(-20, 20), WALL - 20, x + rng.range(-30, 30), WALL - 34, x + rng.range(-16, 16), WALL - 48);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "rgba(104,115,76,0.10)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(WALL + rng.range(0, ROOM_W), WALL + rng.range(0, 10), rng.range(3, 12), rng.range(2, 4), 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  void p;
}

function drawInteriorAmbient(
  ctx: CanvasRenderingContext2D,
  room: Room,
  theme: Theme,
  time: number,
): void {
  const interior = room.interior;
  const rng = new Rng(room.seed ^ 0x19af);
  ctx.save();
  if (interior === "flood") {
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 7; i++) {
      const x = WALL + rng.range(0, ROOM_W) + Math.sin(time * 0.18 + i) * 14;
      const y = WALL + rng.range(0, ROOM_H);
      const rx = 22 + (i % 4) * 12;
      ctx.strokeStyle = "rgba(190,226,210,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.2, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (interior === "nest") {
    const pulse = 0.05 + (Math.sin(time * 1.8) + 1) * 0.035;
    const glow = ctx.createRadialGradient(WALL + ROOM_W / 2, WALL + ROOM_H / 2, 40, WALL + ROOM_W / 2, WALL + ROOM_H / 2, 420);
    glow.addColorStop(0, `rgba(150,40,30,${pulse})`);
    glow.addColorStop(1, "rgba(80,20,16,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
    for (let i = 0; i < 9; i++) {
      const x = WALL + rng.range(0, ROOM_W) + Math.sin(time * 0.5 + i) * 8;
      const y = WALL + ((rng.range(0, ROOM_H) + time * (3 + i)) % ROOM_H);
      ctx.fillStyle = "rgba(220,180,130,0.12)";
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 2), 0, TAU);
      ctx.fill();
    }
  } else if (interior === "chapel") {
    for (let i = 0; i < 8; i++) {
      const x = WALL + rng.range(0, ROOM_W) + Math.sin(time * 0.3 + i * 2) * 10;
      const y = WALL + ((rng.range(0, ROOM_H) + time * (4 + i % 3)) % ROOM_H);
      ctx.fillStyle = "rgba(232,210,170,0.13)";
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 2) * 0.8, 0, TAU);
      ctx.fill();
    }
  } else if (interior === "crypt") {
    ctx.fillStyle = "rgba(160,180,170,0.05)";
    for (let i = 0; i < 4; i++) {
      const y = WALL + ((time * (5 + i) + i * 90) % ROOM_H);
      ctx.beginPath();
      ctx.ellipse(WALL + ROOM_W * (0.2 + i * 0.2), y, 90, 14, 0, 0, TAU);
      ctx.fill();
    }
  } else if (interior === "orchard") {
    for (let i = 0; i < 7; i++) {
      const x = WALL + rng.range(0, ROOM_W) + Math.sin(time * 0.7 + i) * 16;
      const y = WALL + ((rng.range(0, ROOM_H) + time * (6 + i)) % ROOM_H);
      ctx.fillStyle = i % 3 === 0 ? "rgba(150,72,38,0.18)" : "rgba(190,170,120,0.10)";
      ctx.beginPath();
      ctx.ellipse(x, y, 2.4, 1.2, time * 0.5 + i, 0, TAU);
      ctx.fill();
    }
  } else if (interior === "workshop") {
    ctx.fillStyle = "rgba(232,190,120,0.05)";
    ctx.fillRect(0, 0, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
  }
  ctx.restore();
  void theme;
}

function tone(color: string, amount: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (color.startsWith("rgb")) {
    const parts = color.replace(/[^0-9.,]/g, "").split(",").map(Number);
    [r, g, b] = parts;
  } else {
    const h = color.replace("#", "");
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  r = Math.max(0, Math.min(255, Math.round((r || 0) + amount)));
  g = Math.max(0, Math.min(255, Math.round((g || 0) + amount)));
  b = Math.max(0, Math.min(255, Math.round((b || 0) + amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawFloor(ctx: CanvasRenderingContext2D, rng: Rng, theme: Theme): void {
  const p = theme.palette;
  const cols = 13;
  const rows = 7;
  const tw = ROOM_W / cols;
  const th = ROOM_H / rows;

  ctx.fillStyle = "#15110c";
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const x0 = x * tw + 2.4 + rng.range(-0.8, 0.8);
      const y0 = y * th + 2.4 + rng.range(-0.8, 0.8);
      const w0 = tw - 4.2 + rng.range(-1, 1);
      const h0 = th - 4.2 + rng.range(-1, 1);
      const key = rng.weighted([
        [p.floorA, 3],
        [p.floorB, 4],
        [p.floorC, 2],
        [tone(p.floorA, -9), 1],
      ] as const);

      const grad = ctx.createLinearGradient(x0, y0, x0 + w0, y0 + h0);
      grad.addColorStop(0, tone(key, 9 + rng.range(-4, 5)));
      grad.addColorStop(0.55, key);
      grad.addColorStop(1, tone(key, -12));

      ctx.beginPath();
      ctx.moveTo(x0 + 3 + rng.range(-1, 1), y0 + rng.range(-0.8, 0.8));
      ctx.lineTo(x0 + w0 - 4 + rng.range(-1, 1), y0 + 2 + rng.range(-1, 1));
      ctx.quadraticCurveTo(x0 + w0 + 1, y0 + h0 * 0.42, x0 + w0 - 2, y0 + h0 - 3);
      ctx.lineTo(x0 + 4 + rng.range(-1, 1), y0 + h0 + rng.range(-1, 1));
      ctx.quadraticCurveTo(x0 - 1, y0 + h0 * 0.55, x0 + 2, y0 + 4);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(11,8,6,0.72)";
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.strokeStyle = "rgba(235,215,180,0.10)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0 + 5, y0 + 4);
      ctx.lineTo(x0 + w0 * 0.55, y0 + 2.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.moveTo(x0 + 4, y0 + h0 - 5);
      ctx.lineTo(x0 + w0 * 0.62, y0 + h0 - 2);
      ctx.stroke();

      if (rng.chance(0.68)) {
        const cx = x0 + rng.range(10, w0 - 12);
        const cy = y0 + rng.range(10, h0 - 12);
        ctx.strokeStyle = "rgba(10,7,5,0.48)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + rng.range(-8, 8), cy + rng.range(-6, 9));
        if (rng.chance(0.4)) ctx.lineTo(cx + rng.range(-13, 13), cy + rng.range(0, 13));
        ctx.stroke();
        ctx.strokeStyle = "rgba(235,220,190,0.045)";
        ctx.beginPath();
        ctx.moveTo(cx + 1, cy + 1);
        ctx.lineTo(cx + 6, cy + 5);
        ctx.stroke();
      }

      if (rng.chance(0.24)) {
        ctx.fillStyle = "rgba(15,11,8,0.35)";
        const cx = rng.pick([x0 + 5, x0 + w0 - 8]);
        const cy = rng.pick([y0 + 5, y0 + h0 - 8]);
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 2);
        ctx.lineTo(cx + 5, cy + 1);
        ctx.lineTo(cx + 2, cy + 6);
        ctx.closePath();
        ctx.fill();
      }
      if (rng.chance(0.17) && (x < 3 || x > cols - 4 || y === 0 || y === rows - 1)) {
        ctx.fillStyle = "rgba(104,115,76,0.18)";
        ctx.beginPath();
        ctx.ellipse(
          x0 + rng.range(8, w0 - 8),
          y0 + rng.range(8, h0 - 8),
          rng.range(3, 9),
          rng.range(2, 4),
          rng.range(0, TAU),
          0,
          TAU,
        );
        ctx.fill();
      }
    }
  }

  const path = ctx.createRadialGradient(ROOM_W / 2, ROOM_H / 2, 20, ROOM_W / 2, ROOM_H / 2, 220);
  path.addColorStop(0, "rgba(225,200,160,0.05)");
  path.addColorStop(0.6, "rgba(225,200,160,0.018)");
  path.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = path;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);

  if (theme.index === 0) {
    for (let i = 0; i < 3; i++) {
      const wx = rng.range(70, ROOM_W - 90);
      const wy = rng.range(60, ROOM_H - 70);
      const rx = rng.range(42, 100);
      const ry = rng.range(20, 44);
      const g = ctx.createRadialGradient(wx, wy, 4, wx, wy, rx);
      g.addColorStop(0, "rgba(38,56,53,0.6)");
      g.addColorStop(0.7, "rgba(30,44,41,0.32)");
      g.addColorStop(1, "rgba(30,44,41,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(wx, wy, rx, ry, rng.range(-0.25, 0.25), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(194,184,154,0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(wx - 3, wy - 2, rx * 0.55, ry * 0.42, 0.08, 2.9, 5.8);
      ctx.stroke();
      ctx.strokeStyle = "rgba(238,196,132,0.16)";
      ctx.beginPath();
      ctx.moveTo(wx - rx * 0.25, wy);
      ctx.lineTo(wx + rx * 0.1, wy - 1);
      ctx.moveTo(wx + rx * 0.2, wy + 3);
      ctx.lineTo(wx + rx * 0.42, wy + 2);
      ctx.stroke();
    }
  } else if (theme.index === 1) {
    for (let i = 0; i < 12; i++) {
      const wx = rng.range(20, ROOM_W - 20);
      const wy = rng.range(24, ROOM_H - 20);
      ctx.fillStyle = "rgba(210,195,160,0.13)";
      ctx.beginPath();
      ctx.ellipse(wx, wy, rng.range(4, 15), rng.range(2, 6), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const wx = rng.range(30, ROOM_W - 30);
      const wy = rng.range(40, ROOM_H - 30);
      const g = ctx.createRadialGradient(wx, wy, 3, wx, wy, rng.range(30, 75));
      g.addColorStop(0, "rgba(35,10,11,0.35)");
      g.addColorStop(1, "rgba(35,10,11,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wx, wy, 70, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(194,74,51,0.18)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(wx - 24, wy + 4);
      ctx.bezierCurveTo(wx - 8, wy - 8, wx + 8, wy + 12, wx + 28, wy + 2);
      ctx.stroke();
    }
  }

  const edge = ctx.createLinearGradient(0, 0, 0, ROOM_H);
  edge.addColorStop(0, "rgba(0,0,0,0.18)");
  edge.addColorStop(0.2, "rgba(0,0,0,0)");
  edge.addColorStop(0.8, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);
}

function drawFloorDecals(ctx: CanvasRenderingContext2D, rng: Rng, theme: Theme): void {
  const p = theme.palette;

  const bone = (x: number, y: number, rot: number, size: number, alpha: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = `rgba(212,197,166,${alpha})`;
    ctx.fillStyle = `rgba(212,197,166,${alpha})`;
    ctx.lineWidth = Math.max(1.2, size * 0.25);
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-size, -size * 0.12, size * 0.26, 0, TAU);
    ctx.arc(-size, size * 0.12, size * 0.26, 0, TAU);
    ctx.arc(size, -size * 0.12, size * 0.26, 0, TAU);
    ctx.arc(size, size * 0.12, size * 0.26, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  const skull = (x: number, y: number, size: number, alpha: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.range(-0.8, 0.8));
    ctx.fillStyle = `rgba(216,203,173,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.68, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(20,14,10,0.55)";
    ctx.beginPath();
    ctx.ellipse(-size * 0.28, -size * 0.08, size * 0.2, size * 0.24, 0, 0, TAU);
    ctx.ellipse(size * 0.28, -size * 0.08, size * 0.2, size * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(216,203,173,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.2);
    ctx.lineTo(-size * 0.08, size * 0.4);
    ctx.lineTo(size * 0.08, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(20,14,10,0.4)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.55);
    ctx.lineTo(-size * 0.3, size * 0.8);
    ctx.moveTo(0, size * 0.58);
    ctx.lineTo(0, size * 0.82);
    ctx.moveTo(size * 0.3, size * 0.55);
    ctx.lineTo(size * 0.3, size * 0.8);
    ctx.stroke();
    ctx.restore();
  };

  for (let i = 0; i < 8; i++) {
    const x = rng.range(30, ROOM_W - 30);
    const y = rng.range(30, ROOM_H - 30);
    if (rng.chance(0.25)) skull(x, y, rng.range(4, 7), 0.22);
    else bone(x, y, rng.range(0, TAU), rng.range(5, 10), 0.19);
  }

  for (let i = 0; i < 26; i++) {
    const x = rng.range(14, ROOM_W - 14);
    const y = rng.range(14, ROOM_H - 14);
    ctx.fillStyle = rng.chance(0.5) ? "rgba(205,190,158,0.16)" : "rgba(12,9,7,0.24)";
    ctx.beginPath();
    ctx.ellipse(x, y, rng.range(0.8, 2.2), rng.range(0.6, 1.5), rng.range(0, TAU), 0, TAU);
    ctx.fill();
  }

  for (let i = 0; i < 6; i++) {
    const x = rng.range(20, ROOM_W - 20);
    const y = rng.range(20, ROOM_H - 20);
    ctx.fillStyle = "rgba(100,111,76,0.20)";
    ctx.beginPath();
    ctx.ellipse(x, y, rng.range(5, 14), rng.range(2, 5), rng.range(0, TAU), 0, TAU);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = "rgba(110,124,80,0.22)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x + rng.range(-5, 5), y + rng.range(-2, 2));
      ctx.lineTo(x + rng.range(-10, 10), y + rng.range(-8, 8));
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(174,58,44,0.17)";
  ctx.lineWidth = 1.05;
  const sx = rng.range(20, ROOM_W - 20);
  ctx.beginPath();
  ctx.moveTo(sx, ROOM_H + 2);
  ctx.bezierCurveTo(sx - 40, ROOM_H * 0.62, sx + 90, ROOM_H * 0.45, sx + 16, 4);
  ctx.stroke();
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const x = sx + Math.sin(t * 3) * 34 - t * 18;
    const y = ROOM_H * (1 - t);
    ctx.strokeStyle = "rgba(190,72,52,0.13)";
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.stroke();
  }

  for (let i = 0; i < 5; i++) {
    const x = rng.range(16, ROOM_W - 16);
    const y = rng.chance(0.5) ? rng.range(8, 28) : rng.range(ROOM_H - 30, ROOM_H - 10);
    ctx.strokeStyle = "rgba(60,48,36,0.45)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 6, y - 5, x + 9, y + 3);
    ctx.stroke();
  }

  if (theme.index === 1) {
    for (let i = 0; i < 4; i++) {
      const x = rng.range(30, ROOM_W - 30);
      const y = rng.range(30, ROOM_H - 30);
      ctx.fillStyle = "rgba(220,205,168,0.16)";
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(2, 4), rng.range(1, 2.5), 0.1, 0, TAU);
      ctx.fill();
    }
  } else if (theme.index === 2) {
    for (let i = 0; i < 5; i++) {
      const x = rng.range(30, ROOM_W - 30);
      const y = rng.range(30, ROOM_H - 30);
      ctx.fillStyle = "rgba(25,8,8,0.18)";
      ctx.beginPath();
      ctx.ellipse(x, y, rng.range(6, 18), rng.range(3, 8), rng.range(0, TAU), 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const x = rng.range(30, ROOM_W - 30);
      const y = rng.range(30, ROOM_H - 30);
      ctx.fillStyle = "rgba(205,190,160,0.28)";
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, TAU);
      ctx.arc(x + 9, y + 4, 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(20,14,10,0.6)";
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 0.9, 0, TAU);
      ctx.arc(x, y + 1, 0.9, 0, TAU);
      ctx.arc(x + 9, y + 3, 0.9, 0, TAU);
      ctx.arc(x + 10, y + 5, 0.9, 0, TAU);
      ctx.fill();
    }
  }

  void p;
}

function drawWalls(ctx: CanvasRenderingContext2D, theme: Theme, rng: Rng, room: Room): void {
  const p = theme.palette;
  const w = ROOM_W + WALL * 2;
  const h = ROOM_H + WALL * 2;
  ctx.save();

  const bands: [number, number, number, number][] = [
    [0, 0, w, WALL],
    [0, h - WALL, w, WALL],
    [0, WALL, WALL, ROOM_H],
    [w - WALL, WALL, WALL, ROOM_H],
  ];

  for (const [bx, by, bw, bh] of bands) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();
    ctx.fillStyle = p.wallA;
    ctx.fillRect(bx, by, bw, bh);

    const rowH = 19;
    let row = 0;
    for (let y = by - 2; y < by + bh + rowH; y += rowH) {
      const offset = row % 2 === 0 ? 0 : 22;
      let x = bx - 50 + offset;
      while (x < bx + bw + 50) {
        const blockW = 40 + rng.range(-6, 16);
        const shade = rng.pick([p.wallA, p.wallB, p.wallB, tone(p.wallA, 6)]);
        const grad = ctx.createLinearGradient(x, y, x + blockW, y + rowH);
        grad.addColorStop(0, tone(shade, 7));
        grad.addColorStop(0.5, shade);
        grad.addColorStop(1, tone(shade, -9));
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 1.5);
        ctx.lineTo(x + blockW - 2, y + 1);
        ctx.lineTo(x + blockW - 1, y + rowH - 2);
        ctx.lineTo(x + 2.5, y + rowH - 1);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(8,6,4,0.55)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // bevel
        ctx.strokeStyle = "rgba(225,205,170,0.055)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 3);
        ctx.lineTo(x + blockW - 5, y + 2.5);
        ctx.stroke();
        // cracks / chips
        if (rng.chance(0.3)) {
          ctx.strokeStyle = "rgba(8,6,4,0.45)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + rng.range(7, blockW - 8), y + 4);
          ctx.lineTo(x + rng.range(7, blockW - 8), y + rowH - 4);
          ctx.stroke();
        }
        if (rng.chance(0.16)) {
          ctx.fillStyle = "rgba(86,96,62,0.18)";
          ctx.beginPath();
          ctx.ellipse(
            x + rng.range(8, blockW - 8),
            y + rowH - 3,
            rng.range(3, 8),
            rng.range(1, 3),
            rng.range(0, TAU),
            0,
            TAU,
          );
          ctx.fill();
        }
        x += blockW + 2;
      }
      row++;
    }

    // damp streaks from above
    for (let i = 0; i < 5; i++) {
      const sx = rng.range(bx, bx + bw);
      const g = ctx.createLinearGradient(0, by, 0, by + bh);
      g.addColorStop(0, "rgba(8,7,5,0.28)");
      g.addColorStop(1, "rgba(8,7,5,0)");
      ctx.fillStyle = g;
      ctx.fillRect(sx, by, rng.range(1.5, 4), bh);
    }

    // roots / seams
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = theme.index === 2 ? "rgba(150,58,46,0.32)" : "rgba(96,92,60,0.3)";
      ctx.lineWidth = rng.range(0.9, 1.9);
      const side = rng.int(4);
      let sx = 0;
      let sy = 0;
      if (side === 0) {
        sx = rng.range(bx, bx + bw);
        sy = by + 6;
      } else if (side === 1) {
        sx = bx + bw - 6;
        sy = rng.range(by, by + bh);
      } else if (side === 2) {
        sx = rng.range(bx, bx + bw);
        sy = by + bh - 6;
      } else {
        sx = bx + 6;
        sy = rng.range(by, by + bh);
      }
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + rng.range(-26, 26),
        sy + rng.range(-8, 22),
        sx + rng.range(-26, 26),
        sy + rng.range(-18, 34),
        sx + rng.range(-34, 34),
        sy + rng.range(6, 44),
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // inner rim: heavy shadow and stone lip
  ctx.strokeStyle = "rgba(8,6,4,0.9)";
  ctx.lineWidth = 4;
  ctx.strokeRect(WALL - 2, WALL - 2, ROOM_W + 4, ROOM_H + 4);
  ctx.strokeStyle = "rgba(218,199,164,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(WALL - 4.5, WALL - 4.5, ROOM_W + 9, ROOM_H + 9);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(WALL - 0.5, WALL - 0.5, ROOM_W + 1, ROOM_H + 1);

  // hanging chains / hooks on the top wall
  for (let i = 0; i < 3; i++) {
    const x = rng.range(WALL + 70, w - WALL - 70);
    const len = rng.range(10, 24);
    ctx.strokeStyle = "rgba(145,132,105,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, len);
    ctx.stroke();
    for (let y = 4; y < len; y += 4) {
      ctx.beginPath();
      ctx.ellipse(x, y + 1.8, 1.5, 2.6, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, len + 3, 3, -0.4, Math.PI + 0.4);
    ctx.stroke();
  }

  // bone / skull niches in the lower corners
  ctx.fillStyle = "rgba(8,6,4,0.5)";
  for (const [nx, ny] of [
    [WALL + 22, h - WALL * 0.5],
    [w - WALL - 22, h - WALL * 0.5],
  ]) {
    ctx.beginPath();
    ctx.arc(nx, ny, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(196,180,146,0.3)";
    ctx.beginPath();
    ctx.ellipse(nx, ny - 1, 5, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(10,8,6,0.7)";
    ctx.beginPath();
    ctx.arc(nx - 1.6, ny - 1.6, 1.1, 0, TAU);
    ctx.arc(nx + 1.6, ny - 1.6, 1.1, 0, TAU);
    ctx.fill();
  }

  // torches at the four corners of the wall
  const torchPositions: [number, number][] = [
    [WALL * 0.55, WALL * 1.75],
    [w - WALL * 0.55, WALL * 1.75],
    [WALL * 0.55, h - WALL * 1.75],
    [w - WALL * 0.55, h - WALL * 1.75],
  ];
  torchPositions.forEach(([x, y], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.82, 0.82);
    drawTorch(ctx, 0, 0, 0, i + room.gx);
    ctx.restore();
  });

  // fallen bones along the baseboard
  for (let i = 0; i < 4; i++) {
    if (!rng.chance(0.65)) continue;
    const side = rng.int(4);
    let bx = 0;
    let by = 0;
    if (side === 0) {
      bx = rng.range(WALL + 20, w - WALL - 20);
      by = WALL + 22;
    } else if (side === 1) {
      bx = rng.range(WALL + 20, w - WALL - 20);
      by = h - WALL - 20;
    } else if (side === 2) {
      bx = WALL + 22;
      by = rng.range(WALL + 20, h - WALL - 20);
    } else {
      bx = w - WALL - 22;
      by = rng.range(WALL + 20, h - WALL - 20);
    }
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rng.range(-0.9, 0.9));
    ctx.strokeStyle = "rgba(205,190,158,0.22)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-7, 0, 1.8, 0, TAU);
    ctx.arc(7, 0, 1.8, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // boss sigil painted on the floor near the top wall
  if (room.type === "boss") {
    ctx.save();
    ctx.translate(WALL + ROOM_W / 2, WALL + 34);
    ctx.strokeStyle = "rgba(194,74,51,0.2)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawDoor(ctx: CanvasRenderingContext2D, state: DoorVisual, time: number): void {
  const gap = 94;
  ctx.save();

  // deep recess in the wall
  ctx.fillStyle = "#080605";
  roundRect(ctx, -gap / 2, -WALL - 3, gap, WALL + 6, 4);
  ctx.fill();

  // stone reveal around the opening
  ctx.fillStyle = "#3a3227";
  ctx.fillRect(-gap / 2, -WALL, 6, WALL);
  ctx.fillRect(gap / 2 - 6, -WALL, 6, WALL);
  ctx.fillStyle = "rgba(215,196,160,0.09)";
  ctx.fillRect(-gap / 2 + 1, -WALL, 1.2, WALL);
  ctx.fillRect(gap / 2 - 6, -WALL, 1.2, WALL);
  ctx.strokeStyle = "rgba(10,8,6,0.8)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-gap / 2 + 2, -WALL + 2, gap - 4, WALL - 2);

  if (state === "open" || state === "boss") {
    // dark passage beyond the threshold
    const deep = ctx.createLinearGradient(0, -WALL, 0, 0);
    deep.addColorStop(0, "rgba(0,0,0,0.98)");
    deep.addColorStop(0.65, "rgba(5,4,3,0.96)");
    deep.addColorStop(0.9, "rgba(18,13,9,0.92)");
    deep.addColorStop(1, "rgba(44,30,18,0.8)");
    ctx.fillStyle = deep;
    roundRect(ctx, -gap / 2 + 4, -WALL + 3, gap - 8, WALL + 2, 4);
    ctx.fill();

    // ajar door leaf, pushed to the left and slightly into the room
    ctx.save();
    ctx.translate(-gap / 2 + 5, -WALL + 3);
    ctx.rotate(0.09);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(13, 1);
    ctx.lineTo(11, WALL - 4);
    ctx.lineTo(0, WALL - 3);
    ctx.closePath();
    const wood = ctx.createLinearGradient(0, 0, 13, 0);
    wood.addColorStop(0, "#241a12");
    wood.addColorStop(0.6, "#4a3522");
    wood.addColorStop(1, "#2c1f14");
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.strokeStyle = "rgba(10,7,5,0.9)";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(144,122,88,0.55)";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(2, 7);
    ctx.lineTo(10, 8);
    ctx.moveTo(2, WALL - 12);
    ctx.lineTo(10, WALL - 11);
    ctx.stroke();
    ctx.restore();

    // warm threshold light, kept close to the floor
    const spill = ctx.createLinearGradient(0, -4, 0, 20);
    spill.addColorStop(0, "rgba(232,179,108,0.2)");
    spill.addColorStop(0.5, "rgba(190,120,58,0.08)");
    spill.addColorStop(1, "rgba(190,120,58,0)");
    ctx.fillStyle = spill;
    ctx.fillRect(-gap / 2 + 8, -4, gap - 16, 24);
    ctx.fillStyle = "rgba(226,180,110,0.07)";
    ctx.beginPath();
    ctx.ellipse(0, 9, 36, 11, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "rgba(201,178,139,0.22)";
    ctx.fillRect(-gap / 2 + 3, -2.5, gap - 6, 2.5);
    ctx.fillStyle = "rgba(10,8,6,0.3)";
    ctx.fillRect(-gap / 2 + 3, 0, gap - 6, 1.2);

    if (state === "boss") {
      // a carved keeper's mark over the lintel and a taut red thread
      drawSkullDoorMark(ctx, 0, -WALL - 10);
      ctx.strokeStyle = "rgba(194,74,51,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-gap / 2 + 4, -WALL - 2);
      ctx.quadraticCurveTo(0, -WALL + 4, gap / 2 - 4, -WALL - 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (state === "closed") {
    // an iron portcullis slammed across a living room
    const glow = ctx.createLinearGradient(0, -WALL, 0, 4);
    glow.addColorStop(0, "rgba(232,179,108,0.02)");
    glow.addColorStop(1, "rgba(232,179,108,0.16)");
    ctx.fillStyle = glow;
    ctx.fillRect(-gap / 2 + 6, -WALL + 2, gap - 12, WALL);

    ctx.save();
    ctx.translate(0, -1);
    ctx.strokeStyle = "#19130e";
    ctx.lineWidth = 5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -WALL + 5);
      ctx.lineTo(i * 12, -3);
      ctx.stroke();
    }
    ctx.strokeStyle = "#514536";
    ctx.lineWidth = 2.4;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -WALL + 5);
      ctx.lineTo(i * 12, -3);
      ctx.stroke();
      ctx.strokeStyle = "rgba(194,176,138,0.24)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(i * 12 - 1.2, -WALL + 6);
      ctx.lineTo(i * 12 - 1.2, -5);
      ctx.stroke();
      ctx.strokeStyle = "#514536";
      ctx.lineWidth = 2.4;
    }
    // cross braces
    ctx.strokeStyle = "#19130e";
    ctx.lineWidth = 6;
    for (const y of [-WALL + 12, -14]) {
      ctx.beginPath();
      ctx.moveTo(-gap / 2 + 5, y);
      ctx.lineTo(gap / 2 - 5, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#5c4e3b";
    ctx.lineWidth = 2.6;
    for (const y of [-WALL + 12, -14]) {
      ctx.beginPath();
      ctx.moveTo(-gap / 2 + 5, y);
      ctx.lineTo(gap / 2 - 5, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#7a694e";
    for (const x of [-36, -12, 12, 36]) {
      for (const y of [-WALL + 12, -14]) {
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.fillStyle = "rgba(194,74,51,0.14)";
    ctx.fillRect(-gap / 2 + 8, -WALL + 6, 3, WALL - 12);
    ctx.fillRect(gap / 2 - 11, -WALL + 6, 3, WALL - 12);

    const dshadow = ctx.createLinearGradient(0, 0, 0, 12);
    dshadow.addColorStop(0, "rgba(0,0,0,0.35)");
    dshadow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dshadow;
    ctx.fillRect(-gap / 2 + 6, 0, gap - 12, 12);
    ctx.restore();
    return;
  }

  // locked / boss doors are heavy wooden slabs
  const deep = ctx.createLinearGradient(0, -WALL, 0, 0);
  deep.addColorStop(0, "rgba(0,0,0,0.9)");
  deep.addColorStop(1, "rgba(16,11,8,0.7)");
  ctx.fillStyle = deep;
  ctx.fillRect(-gap / 2 + 5, -WALL + 1, gap - 10, WALL - 1);

  ctx.beginPath();
  roundRect(ctx, -gap / 2 + 7, -WALL + 4, gap - 14, WALL - 5, 1.5);
  const wood = ctx.createLinearGradient(0, -WALL, 0, 0);
  wood.addColorStop(0, "#211810");
  wood.addColorStop(0.4, "#3a2a1c");
  wood.addColorStop(0.75, "#2a1d13");
  wood.addColorStop(1, "#1b130c");
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.strokeStyle = "#0b0806";
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(10,7,5,0.8)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 14, -WALL + 6);
    ctx.lineTo(i * 14 + 1, -5);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(184,156,112,0.12)";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 14 + 2, -WALL + 8);
    ctx.lineTo(i * 14 + 1, -8);
    ctx.stroke();
  }

  ctx.strokeStyle = "#413a2f";
  ctx.lineWidth = 3.2;
  for (const y of [-WALL + 10, -12]) {
    ctx.beginPath();
    ctx.moveTo(-gap / 2 + 8, y);
    ctx.lineTo(gap / 2 - 8, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#6b5c47";
  for (const x of [-30, 0, 30]) {
    for (const y of [-WALL + 10, -12]) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, TAU);
      ctx.fill();
    }
  }

  // heavy lock plate
  ctx.fillStyle = "#494237";
  roundRect(ctx, -9, -24, 18, 16, 2);
  ctx.fill();
  ctx.strokeStyle = "#0f0c09";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#0b0907";
  ctx.beginPath();
  ctx.arc(0, -18, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillRect(-0.9, -18, 1.8, 5);
  ctx.strokeStyle = "rgba(156,126,78,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-11, -12);
  ctx.lineTo(-4, -25);
  ctx.moveTo(11, -12);
  ctx.lineTo(4, -25);
  ctx.stroke();

  // shadow into the room
  const dshadow = ctx.createLinearGradient(0, 0, 0, 14);
  dshadow.addColorStop(0, "rgba(0,0,0,0.4)");
  dshadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = dshadow;
  ctx.fillRect(-gap / 2 + 6, 0, gap - 12, 14);
  ctx.restore();
}

function drawSkullDoorMark(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "rgba(201,178,139,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "rgba(201,178,139,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, -1, 3.4, 3.8, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(-2.2, 2, 4.4, 2.6);
  ctx.fillStyle = "rgba(10,8,6,0.8)";
  ctx.beginPath();
  ctx.arc(-1.2, -1.2, 0.8, 0, TAU);
  ctx.arc(1.2, -1.2, 0.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export { PAL };
