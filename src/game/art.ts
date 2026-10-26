import type { BossKind, Enemy, Pickup, Player, Tear, Shot, Obstacle, Bomb } from "./types";
import { TAU } from "./types";
import { clamp, mulColor } from "./util";
import { drawItemGlyph, ITEM_BY_ID } from "./items";
import { getCharacter } from "./characters";

export const PAL = {
  ink: "#13100d",
  ink2: "#1d1713",
  bone: "#eadfc8",
  boneDim: "#b9a98c",
  parch: "#c9b28b",
  blood: "#8d3028",
  thread: "#c24a33",
  gold: "#d8a65b",
  tear: "#171311",
};

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function inkStroke(
  ctx: CanvasRenderingContext2D,
  color = PAL.ink,
  width = 1.8,
  alpha = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha *= alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function stitchedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = PAL.thread,
  dash = 5,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([dash, dash * 1.4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.38);
  ctx.bezierCurveTo(x - s * 0.62, y - s * 0.05, x - s * 0.48, y - s * 0.56, x - s * 0.16, y - s * 0.5);
  ctx.bezierCurveTo(x - s * 0.04, y - s * 0.48, x, y - s * 0.36, x, y - s * 0.3);
  ctx.bezierCurveTo(x, y - s * 0.36, x + s * 0.04, y - s * 0.48, x + s * 0.16, y - s * 0.5);
  ctx.bezierCurveTo(x + s * 0.48, y - s * 0.56, x + s * 0.62, y - s * 0.05, x, y + s * 0.38);
  ctx.closePath();
}

export function drawHeartIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: "full" | "half" | "empty" | "soul",
  t = 0,
): void {
  ctx.save();
  ctx.translate(x, y);
  const s = size;
  heartPath(ctx, 0, 0, s);
  if (fill === "empty") {
    ctx.fillStyle = "rgba(23,18,15,0.72)";
    ctx.fill();
    ctx.strokeStyle = "rgba(234,223,200,0.35)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (fill === "soul") {
    ctx.fillStyle = "#7e98a4";
    ctx.fill();
  } else {
    ctx.fillStyle = fill === "half" ? "#a0392e" : "#8d3028";
    ctx.fill();
    if (fill === "half") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-s, -s, s, s * 2);
      ctx.clip();
      ctx.fillStyle = "#c04a36";
      heartPath(ctx, 0, 0, s);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.strokeStyle = "rgba(20,13,10,0.85)";
  ctx.lineWidth = 1.4;
  heartPath(ctx, 0, 0, s);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,225,205,0.5)";
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.arc(-s * 0.18, -s * 0.18, s * 0.15, 0.6, 2.3);
  ctx.stroke();
  stitchedLine(ctx, 0, -s * 0.2, 0, s * 0.22, "rgba(40,18,14,0.5)", 2);
  ctx.restore();
}

export function drawCoinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.42, 0, TAU);
  ctx.fillStyle = "#b4854d";
  ctx.fill();
  ctx.strokeStyle = "#3e2d1c";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#2a2017";
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(245,215,158,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.29, -2.7, -0.6);
  ctx.stroke();
  ctx.restore();
}

export function drawKeyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.55);
  ctx.strokeStyle = "#cdbb92";
  ctx.lineWidth = Math.max(1.4, s * 0.1);
  ctx.beginPath();
  ctx.arc(-s * 0.22, 0, s * 0.18, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, 0);
  ctx.lineTo(s * 0.36, 0);
  ctx.moveTo(s * 0.22, 0);
  ctx.lineTo(s * 0.22, s * 0.16);
  ctx.moveTo(s * 0.33, 0);
  ctx.lineTo(s * 0.33, s * 0.19);
  ctx.stroke();
  ctx.restore();
}

export function drawBombIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, s * 0.05, s * 0.36, 0, TAU);
  ctx.fillStyle = "#2d2823";
  ctx.fill();
  ctx.strokeStyle = "#0e0b09";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "#b39a76";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(s * 0.12, -s * 0.28);
  ctx.quadraticCurveTo(s * 0.36, -s * 0.48, s * 0.4, -s * 0.3);
  ctx.stroke();
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(s * 0.42, -s * 0.34, s * 0.09, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(234,223,200,0.32)";
  ctx.beginPath();
  ctx.arc(-s * 0.12, -s * 0.05, s * 0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawSkullIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#d7c9aa";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.04, s * 0.31, s * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-s * 0.19, s * 0.22, s * 0.38, s * 0.18);
  ctx.fill();
  ctx.fillStyle = "#181310";
  ctx.beginPath();
  ctx.ellipse(-s * 0.12, -s * 0.04, s * 0.08, s * 0.1, 0, 0, TAU);
  ctx.ellipse(s * 0.12, -s * 0.04, s * 0.08, s * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, s * 0.05);
  ctx.lineTo(-s * 0.04, s * 0.15);
  ctx.lineTo(s * 0.04, s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(24,17,12,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s * 0.12, s * 0.3);
  ctx.lineTo(-s * 0.12, s * 0.38);
  ctx.moveTo(0, s * 0.3);
  ctx.lineTo(0, s * 0.39);
  ctx.moveTo(s * 0.12, s * 0.3);
  ctx.lineTo(s * 0.12, s * 0.38);
  ctx.stroke();
  ctx.restore();
}

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = "#8d3028"): void {
  heartPath(ctx, x, y, s);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(18,12,9,0.85)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,220,200,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x - s * 0.16, y - s * 0.17, s * 0.12, 0.6, 2.4);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Wren
// ---------------------------------------------------------------------------

export function drawWren(ctx: CanvasRenderingContext2D, p: Player, time: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1.2, 1.2);
  ctx.translate(-p.x, -p.y);
  const look = getCharacter(p.character).look;
  const isMoth = look.extra === "moth";
  const isEmber = look.extra === "ember";
  const isChoir = look.extra === "choir";
  const moving = Math.hypot(p.vx, p.vy) > 18;
  const bob = moving ? Math.sin(time * 13) * 1.6 : Math.sin(time * 2.2) * 0.7;
  const sway = Math.sin(time * 3.1) * 1.2;
  const faceX = p.aimX;
  const faceY = p.aimY;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 14, 15, 5.5, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = look.accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 14, 18, 6, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();

  if (p.invuln > 0 && Math.floor(time * 16) % 2 === 0) ctx.globalAlpha = 0.45;

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  const lean = clamp(faceX * 1.6, -2, 2);

  if (isMoth) {
    const flap = Math.sin(time * 8) * 0.18;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * (0.35 + flap));
      ctx.beginPath();
      ctx.moveTo(side * 4, -15);
      ctx.quadraticCurveTo(side * 27, -35, side * 30, -12);
      ctx.quadraticCurveTo(side * 22, -2, side * 8, -6);
      ctx.closePath();
      ctx.fillStyle = "rgba(206,194,168,0.88)";
      ctx.fill();
      ctx.strokeStyle = "#2b241b";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = "rgba(80,67,49,0.55)";
      ctx.beginPath();
      ctx.ellipse(side * 20, -18, 3.2, 2.2, side * 0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  if (isEmber) {
    const ember = ctx.createRadialGradient(0, 2, 2, 0, 2, 30);
    ember.addColorStop(0, "rgba(224,122,58,0.22)");
    ember.addColorStop(1, "rgba(224,122,58,0)");
    ctx.fillStyle = ember;
    ctx.beginPath();
    ctx.arc(0, 2, 30, 0, TAU);
    ctx.fill();
  }

  // ragged cloak
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.quadraticCurveTo(-13, -8, -12, 2);
  ctx.lineTo(-13, 11);
  ctx.lineTo(-8, 9);
  ctx.lineTo(-6, 13);
  ctx.lineTo(-2, 10);
  ctx.lineTo(1, 13);
  ctx.lineTo(4, 9);
  ctx.lineTo(8, 12);
  ctx.lineTo(10, 7);
  ctx.quadraticCurveTo(13, -3, 6, -18);
  ctx.closePath();
  ctx.fillStyle = look.cloak;
  ctx.fill();
  ctx.strokeStyle = "#19120d";
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // cloak folds and stitches
  ctx.strokeStyle = "rgba(30,20,13,0.65)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-7, -12);
  ctx.quadraticCurveTo(-9, 0, -8, 8);
  ctx.moveTo(3, -12);
  ctx.quadraticCurveTo(6, -2, 6, 8);
  ctx.stroke();
  stitchedLine(ctx, -3, 1, -1, 8, "rgba(43,29,20,0.7)", 2);
  stitchedLine(ctx, 5, -1, 7, 5, "rgba(43,29,20,0.7)", 2);

  // hem threads
  ctx.strokeStyle = `${look.accent}88`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-11, 11);
  ctx.lineTo(-11, 15);
  ctx.moveTo(8, 12);
  ctx.lineTo(9, 16);
  ctx.stroke();
  if (isChoir) {
    ctx.strokeStyle = "rgba(228,218,194,0.65)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 5 - 1, -2);
      ctx.lineTo(i * 5 + 1, 9);
      ctx.stroke();
    }
  }
  if (isEmber) {
    ctx.strokeStyle = "rgba(240,130,56,0.9)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.lineTo(10, 0);
    ctx.lineTo(6, 5);
    ctx.lineTo(11, 8);
    ctx.moveTo(-8, 1);
    ctx.lineTo(-4, 5);
    ctx.lineTo(-7, 9);
    ctx.stroke();
    ctx.fillStyle = "rgba(247,190,116,0.8)";
    ctx.beginPath();
    ctx.arc(9.5, -0.5, 1.1, 0, TAU);
    ctx.arc(6, 9, 1, 0, TAU);
    ctx.fill();
  }

  // hood
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.bezierCurveTo(-12, -27, -5, -33, 1, -32);
  ctx.bezierCurveTo(8, -31, 12, -25, 11, -17);
  ctx.quadraticCurveTo(4, -13, -10, -16);
  ctx.closePath();
  ctx.fillStyle = look.hood;
  ctx.fill();
  ctx.strokeStyle = "#19120d";
  ctx.lineWidth = 1.9;
  ctx.stroke();

  // hood inner shadow + face
  ctx.beginPath();
  ctx.ellipse(1 + lean * 0.4, -22.5, 7.3, 7.8, 0.03, 0, TAU);
  ctx.fillStyle = "#201712";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1 + lean * 0.5, -22, 5.6, 6.4, 0.03, 0, TAU);
  const faceGrad = ctx.createRadialGradient(-1, -25, 1, 1, -21, 8);
  faceGrad.addColorStop(0, look.face);
  faceGrad.addColorStop(1, "#c9b08a");
  ctx.fillStyle = faceGrad;
  ctx.fill();

  if (!isChoir) {
    // hair strand
    ctx.fillStyle = isEmber ? "#241a13" : "#2a1d15";
    ctx.beginPath();
    ctx.ellipse(-3.2 + lean * 0.4, -25, 3.4, 2.1, -0.45, 0, TAU);
    ctx.fill();
  }

  // eyes
  const ex = 1 + faceX * 1.7;
  const ey = -22 + faceY * 1.25;
  ctx.fillStyle = isChoir ? "#0c0907" : look.eye;
  ctx.beginPath();
  ctx.ellipse(ex - 2.4, ey, isChoir ? 1.4 : 1.05, 1.5, 0, 0, TAU);
  ctx.ellipse(ex + 2.4, ey, isChoir ? 1.4 : 1.05, 1.5, 0, 0, TAU);
  ctx.fill();
  if (isEmber) {
    ctx.fillStyle = "rgba(240,160,80,0.75)";
    ctx.beginPath();
    ctx.arc(ex - 2.4, ey, 0.45, 0, TAU);
    ctx.arc(ex + 2.4, ey, 0.45, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(240,228,204,0.8)";
  ctx.beginPath();
  ctx.arc(ex - 2.7, ey - 0.5, 0.32, 0, TAU);
  ctx.arc(ex + 2.1, ey - 0.5, 0.32, 0, TAU);
  ctx.fill();

  // character-specific face details
  if (isChoir) {
    ctx.strokeStyle = "rgba(30,20,16,0.85)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(ex - 4, ey + 4.4);
    ctx.lineTo(ex + 4, ey + 4.4);
    ctx.stroke();
    for (let i = -3; i <= 3; i += 2) {
      ctx.beginPath();
      ctx.moveTo(ex + i, ey + 3.2);
      ctx.lineTo(ex + i, ey + 5.6);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(194,74,51,0.75)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(ex, ey + 5.6);
    ctx.lineTo(ex + 0.5, ey + 9);
    ctx.stroke();
  } else if (isMoth) {
    ctx.strokeStyle = "rgba(90,75,54,0.75)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(ex - 4, -31);
    ctx.quadraticCurveTo(ex - 9, -38, ex - 13, -36);
    ctx.moveTo(ex + 4, -31);
    ctx.quadraticCurveTo(ex + 9, -38, ex + 13, -36);
    ctx.stroke();
    ctx.fillStyle = "#c9b28b";
    ctx.beginPath();
    ctx.ellipse(ex - 13, -36, 2.2, 1.2, -0.5, 0, TAU);
    ctx.ellipse(ex + 13, -36, 2.2, 1.2, 0.5, 0, TAU);
    ctx.fill();
  } else {
    // tear tracks
    ctx.strokeStyle = "rgba(38,30,25,0.7)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(ex - 2.6, ey + 1.5);
    ctx.lineTo(ex - 2.1, ey + 4.2);
    ctx.moveTo(ex + 2.5, ey + 1.4);
    ctx.lineTo(ex + 2.9, ey + 3.4);
    ctx.stroke();
  }

  if (isEmber) {
    // little brass bell at the chest
    ctx.strokeStyle = "#6f5434";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(3, -2);
    ctx.stroke();
    ctx.fillStyle = "#a78048";
    ctx.beginPath();
    ctx.arc(0, 2, 4.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#2a1f14";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = "#f0cb84";
    ctx.beginPath();
    ctx.arc(0, 3.5, 1.2, 0, TAU);
    ctx.fill();
  }

  if (isChoir) {
    // candle halo
    ctx.strokeStyle = "rgba(216,166,91,0.5)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(0, -37, 14, 4, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI + (i / 4) * Math.PI;
      const hx = Math.cos(a) * 15;
      const hy = -38 + Math.sin(a) * 4;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.fillStyle = "#c9b28b";
      ctx.fillRect(-1.2, -4, 2.4, 6);
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.ellipse(0, -7 + Math.sin(time * 9 + i) * 0.5, 1.4, 2.7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // red thread around wrist / trailing
  const handX = 9 + sway * 0.4;
  const handY = -7 + Math.sin(time * 5) * 0.6;
  ctx.strokeStyle = "#b8402f";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(7, -6);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  ctx.fillStyle = "#e2c9a6";
  ctx.beginPath();
  ctx.arc(handX, handY, 1.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#c24a33";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(handX, handY + 1);
  ctx.bezierCurveTo(handX + 5, handY + 5, handX - 3, handY + 9, handX + 2, handY + 13);
  ctx.stroke();

  // little lantern hanging from the wrist
  const lx = 11.5 + sway * 0.5;
  const ly = 3.5 + Math.sin(time * 1.8) * 0.7;
  const lanternGlow = ctx.createRadialGradient(lx, ly + 3, 1, lx, ly + 3, 24);
  lanternGlow.addColorStop(0, "rgba(240,190,110,0.24)");
  lanternGlow.addColorStop(1, "rgba(240,190,110,0)");
  ctx.fillStyle = lanternGlow;
  ctx.beginPath();
  ctx.arc(lx, ly + 3, 24, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2b1a";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(lx, ly - 2.6, 2.2, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.fillStyle = "#4a3722";
  roundRect(ctx, lx - 2.6, ly - 1.2, 5.2, 7.4, 1.2);
  ctx.fill();
  ctx.strokeStyle = "#1a120b";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(238,183,98,0.9)";
  roundRect(ctx, lx - 1.4, ly + 0.4, 2.8, 4.2, 1);
  ctx.fill();
  ctx.fillStyle = "#7a5a32";
  ctx.fillRect(lx - 2.8, ly + 5.4, 5.6, 1.3);

  // raised weeping hand when firing
  if (p.fireCd > p.stats.fireDelay * 0.55) {
    const grade = 1 - (p.fireCd - p.stats.fireDelay * 0.55) / (p.stats.fireDelay * 0.45);
    const hx = 2 + faceX * 8;
    const hy = -17 + faceY * 3 - grade * 4;
    ctx.strokeStyle = "#2a1d15";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.fillStyle = "#e2c9a6";
    ctx.beginPath();
    ctx.arc(hx, hy, 1.9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PAL.tear;
    ctx.beginPath();
    ctx.arc(hx, hy - 4, 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(120,150,140,0.35)";
    ctx.beginPath();
    ctx.arc(hx - 0.7, hy - 4.8, 0.9, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

function drawEliteAura(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  if (!e.elite) return;
  const color =
    e.elite === "stitched"
      ? "#c24a33"
      : e.elite === "blessed"
        ? "#d8a65b"
        : e.elite === "swift"
          ? "#9eb6ac"
          : e.elite === "cursed"
            ? "#7e9d5a"
            : e.elite === "gilded"
              ? "#e6c47d"
              : "#b06a7a";
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(time * 3 + e.seed) * 0.12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 9, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  if (e.elite === "stitched") {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + time * 0.2;
      const x = e.x + Math.cos(a) * (e.r + 9);
      const y = e.y + Math.sin(a) * (e.r + 9);
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 2);
      ctx.lineTo(x + 2, y + 2);
      ctx.moveTo(x + 2, y - 2);
      ctx.lineTo(x - 2, y + 2);
      ctx.stroke();
    }
  } else if (e.elite === "blessed") {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - e.r - 10, e.r * 0.5, 4, 0, 0, TAU);
    ctx.stroke();
  } else if (e.elite === "cursed") {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + time * 0.4;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * (e.r + 8), e.y + Math.sin(a) * (e.r + 8), 2.2, 0, TAU);
      ctx.stroke();
    }
  } else if (e.elite === "gilded") {
    for (let i = 0; i < 3; i++) {
      const a = time * 1.5 + (i / 3) * TAU;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * (e.r + 12), e.y + Math.sin(a) * (e.r + 8), 3, 0, TAU);
      ctx.stroke();
    }
  } else if (e.elite === "bloated") {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r + 7 + Math.sin(time * 3 + e.seed) * 3, 0, TAU);
    ctx.stroke();
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(e.x - 8 - i * 5, e.y + (i - 1) * 5, e.r * 0.7 + i * 4, -0.6, 0.6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawShield(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(time * 4) * 0.08;
  ctx.strokeStyle = "#e0c184";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 11, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#e0c184";
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 11, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawFrost(ctx: CanvasRenderingContext2D, e: Enemy): void {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#b9d8dc";
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 2, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "#e6f4f1";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4);
    ctx.lineTo(e.x + Math.cos(a) * (e.r + 6), e.y + Math.sin(a) * (e.r + 6));
    ctx.stroke();
  }
  ctx.restore();
}

function enemyFlash(ctx: CanvasRenderingContext2D, e: Enemy, radius: number): void {
  if (e.flash <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(e.flash * 4, 0, 0.75);
  ctx.fillStyle = "#fff4de";
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, radius, radius * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry = rx * 0.35): void {
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const t = time + e.seed;
  ctx.save();
  const visualScale = e.kind === "boss" ? 1 : 1.15;
  ctx.translate(e.x, e.y);
  ctx.scale(visualScale, visualScale);
  ctx.translate(-e.x, -e.y);
  if (e.kind === "wraith") ctx.globalAlpha = 0.72 + Math.sin(t * 2) * 0.12;

  switch (e.kind) {
    case "moth": {
      const flutter = Math.sin(t * 18) * 0.55;
      shadow(ctx, e.x, e.y + 12, 10, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 3) * 2);
      ctx.rotate(Math.sin(t * 1.7) * 0.12);
      // wings
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * (0.35 + flutter));
        ctx.beginPath();
        ctx.ellipse(side * 10, -4, 11, 6.2, side * 0.35, 0, TAU);
        ctx.fillStyle = "#d8cdb7";
        ctx.fill();
        ctx.strokeStyle = "#221a14";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "rgba(34,26,20,0.55)";
        ctx.beginPath();
        ctx.ellipse(side * 12, -5, 3.2, 2.4, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // body
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.4, 8, 0, 0, TAU);
      ctx.fillStyle = "#5d5140";
      ctx.fill();
      ctx.strokeStyle = "#1a1410";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = "#2a2119";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-1.5, -7);
      ctx.quadraticCurveTo(-6, -13, -8, -11);
      ctx.moveTo(1.5, -7);
      ctx.quadraticCurveTo(6, -13, 8, -11);
      ctx.stroke();
      ctx.fillStyle = "#1a1410";
      ctx.beginPath();
      ctx.arc(-1.5, -3, 0.9, 0, TAU);
      ctx.arc(1.5, -3, 0.9, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "crawler": {
      shadow(ctx, e.x, e.y + 12, 12, 3.5);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 7) * 1.2);
      ctx.strokeStyle = "#211914";
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i++) {
        const side = i < 2 ? -1 : 1;
        const idx = i % 2;
        const a = 0.5 + idx * 0.5;
        const swing = Math.sin(t * 10 + i * 1.7) * 0.18;
        ctx.beginPath();
        ctx.moveTo(side * 5, -2 + idx * 3);
        ctx.quadraticCurveTo(side * (11 + idx * 2), -6, side * (14 + idx * 3), 7 + swing * 10);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, 1, 10, 7.5, 0, 0, TAU);
      ctx.fillStyle = "#3d3125";
      ctx.fill();
      ctx.strokeStyle = "#160f0b";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#8f3028";
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(-2.5, 6.5);
      ctx.lineTo(2.5, 6.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#d9d0b8";
      ctx.beginPath();
      ctx.arc(-3.4, -2, 1.5, 0, TAU);
      ctx.arc(3.4, -2, 1.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#16100d";
      ctx.beginPath();
      ctx.arc(-3.4, -2, 0.7, 0, TAU);
      ctx.arc(3.4, -2, 0.7, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "husk": {
      const stride = Math.sin(t * 5.4) * 2;
      shadow(ctx, e.x, e.y + 15, 12, 3.5);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 5.4) * 1.2);
      // legs
      ctx.strokeStyle = "#2a2018";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, 6);
      ctx.lineTo(-6 + stride, 15);
      ctx.moveTo(4, 6);
      ctx.lineTo(6 - stride, 15);
      ctx.stroke();
      // body doll
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(-12, 0, -8, 9);
      ctx.quadraticCurveTo(0, 13, 8, 9);
      ctx.quadraticCurveTo(12, 0, 8, -12);
      ctx.closePath();
      ctx.fillStyle = "#b9a687";
      ctx.fill();
      ctx.strokeStyle = "#1a130e";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // dragging arms
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, -4);
      ctx.quadraticCurveTo(-16, 2, -13 + stride, 12);
      ctx.moveTo(7, -4);
      ctx.quadraticCurveTo(15, 1, 14 - stride, 9);
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(0, -18, 9, 0, TAU);
      ctx.fillStyle = "#cbb899";
      ctx.fill();
      ctx.strokeStyle = "#1a130e";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // button eyes
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#211812";
        ctx.beginPath();
        ctx.arc(side * 3.8, -19, 2.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#c9b28b";
        ctx.beginPath();
        ctx.arc(side * 3.8, -19, 0.7, 0, TAU);
        ctx.fill();
      }
      // stitched mouth
      stitchedLine(ctx, -4.5, -13, 4.5, -13, "rgba(35,22,17,0.9)", 2);
      ctx.strokeStyle = "rgba(35,22,17,0.8)";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-2, -13);
      ctx.lineTo(-2, -11);
      ctx.moveTo(1, -13);
      ctx.lineTo(1, -11);
      ctx.stroke();
      // red thread neck
      ctx.strokeStyle = "#a83a2c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, -11);
      ctx.quadraticCurveTo(0, -9, 8, -11);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "waxface": {
      shadow(ctx, e.x, e.y + 14, 11, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2.4) * 1.3);
      // robe
      ctx.beginPath();
      ctx.moveTo(-7, -2);
      ctx.quadraticCurveTo(-12, 9, -9, 15);
      ctx.quadraticCurveTo(0, 17, 9, 15);
      ctx.quadraticCurveTo(12, 9, 7, -2);
      ctx.closePath();
      ctx.fillStyle = "#4b3d2c";
      ctx.fill();
      ctx.strokeStyle = "#1a130e";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // drips
      ctx.fillStyle = "#c9b28b";
      for (let i = -1; i <= 1; i++) {
        const len = 3 + ((e.seed + i * 7) % 5);
        ctx.beginPath();
        ctx.ellipse(i * 5, 2 + len, 2.2, len, 0, 0, TAU);
        ctx.fill();
      }
      // wax head
      ctx.beginPath();
      ctx.ellipse(0, -12, 7.5, 9, 0, 0, TAU);
      ctx.fillStyle = "#d6c29d";
      ctx.fill();
      ctx.strokeStyle = "#1a130e";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // hollow eyes
      ctx.fillStyle = "#1b1410";
      ctx.beginPath();
      ctx.ellipse(-2.8, -13, 1.5, 2.3, 0, 0, TAU);
      ctx.ellipse(2.8, -13, 1.5, 2.3, 0, 0, TAU);
      ctx.fill();
      // wick + flame
      ctx.strokeStyle = "#211812";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -21);
      ctx.lineTo(1.2, -25);
      ctx.stroke();
      const flick = Math.sin(t * 11) * 2;
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.moveTo(1, -25);
      ctx.quadraticCurveTo(6 + flick * 0.3, -29, 2, -35);
      ctx.quadraticCurveTo(8, -33, 4, -25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f7e1a6";
      ctx.beginPath();
      ctx.ellipse(2.4, -29, 1.2, 2.6, 0.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "goat": {
      const wind = e.state === "wind";
      const shake = wind ? Math.sin(t * 45) * 2 : 0;
      shadow(ctx, e.x, e.y + 14, 17, 4);
      ctx.save();
      ctx.translate(e.x + shake, e.y + (wind ? 0 : Math.sin(t * 6) * 1));
      const dir = e.vx >= 0 ? 1 : -1;
      // legs
      ctx.strokeStyle = "#211712";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(-11, 14);
      ctx.moveTo(-2, 5);
      ctx.lineTo(-4, 15);
      ctx.moveTo(6, 4);
      ctx.lineTo(9, 14);
      ctx.moveTo(11, 3);
      ctx.lineTo(14, 12);
      ctx.stroke();
      // body
      ctx.beginPath();
      ctx.ellipse(0, -1, 15, 9, -0.08, 0, TAU);
      ctx.fillStyle = "#3c3024";
      ctx.fill();
      ctx.strokeStyle = "#191209";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // harness
      ctx.strokeStyle = "#a13b2d";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.quadraticCurveTo(-2, 0, 4, 6);
      ctx.moveTo(2, -9);
      ctx.lineTo(9, 0);
      ctx.stroke();
      // neck/head
      ctx.beginPath();
      ctx.ellipse(13 * dir, -10, 7, 6, 0.2 * dir, 0, TAU);
      ctx.fillStyle = "#cbb996";
      ctx.fill();
      ctx.strokeStyle = "#191209";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // horns
      ctx.strokeStyle = "#9c8b6d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10 * dir, -15);
      ctx.quadraticCurveTo(7 * dir, -23, 12 * dir, -21);
      ctx.moveTo(15 * dir, -15);
      ctx.quadraticCurveTo(20 * dir, -21, 22 * dir, -16);
      ctx.stroke();
      // eye
      ctx.fillStyle = wind ? "#e35a3c" : "#1a120c";
      ctx.beginPath();
      ctx.arc(15 * dir, -11, 1.5, 0, TAU);
      ctx.fill();
      // red thread trailing from horn
      ctx.strokeStyle = "#c24a33";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(12 * dir, -16);
      ctx.quadraticCurveTo(6, -22, 0, -26);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "saint": {
      shadow(ctx, e.x, e.y + 15, 14, 3.5);
      ctx.save();
      ctx.translate(e.x, e.y);
      // plinth
      ctx.fillStyle = "#4a463c";
      ctx.fillRect(-11, 7, 22, 9);
      ctx.strokeStyle = "#17140f";
      ctx.lineWidth = 1.3;
      ctx.strokeRect(-11, 7, 22, 9);
      // bust
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.quadraticCurveTo(-11, -6, -5, -10);
      ctx.quadraticCurveTo(0, -13, 5, -10);
      ctx.quadraticCurveTo(11, -6, 8, 8);
      ctx.closePath();
      ctx.fillStyle = "#8a8775";
      ctx.fill();
      ctx.strokeStyle = "#1a1712";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(0, -15, 6.5, 0, TAU);
      ctx.fillStyle = "#9b9782";
      ctx.fill();
      ctx.stroke();
      // halo
      const cast = e.cd < 0.5;
      ctx.strokeStyle = cast ? "#e6c47d" : "rgba(205,190,150,0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -20, 11, 0, TAU);
      ctx.stroke();
      // eyes
      ctx.fillStyle = cast ? "#f0d9a0" : "#252018";
      ctx.beginPath();
      ctx.arc(-2, -15.5, 1, 0, TAU);
      ctx.arc(2, -15.5, 1, 0, TAU);
      ctx.fill();
      // carved lines
      ctx.strokeStyle = "rgba(30,26,20,0.5)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(4, -2);
      ctx.moveTo(-3, 2);
      ctx.lineTo(3, 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "ragdoll": {
      const hop = e.state === "hop";
      const squash = hop ? 1.15 : 0.9;
      shadow(ctx, e.x, e.y + 15, 11, 3);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(1 / squash, squash);
      // limbs
      ctx.strokeStyle = "#2b2119";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(-9, 7);
      ctx.moveTo(4, -2);
      ctx.lineTo(9, 7);
      ctx.stroke();
      // body
      ctx.beginPath();
      ctx.ellipse(0, -5, 8, 10, 0.1, 0, TAU);
      ctx.fillStyle = "#b7a483";
      ctx.fill();
      ctx.strokeStyle = "#1b130d";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(0, -18, 8.5, 0, TAU);
      ctx.fillStyle = "#c9b696";
      ctx.fill();
      ctx.strokeStyle = "#1b130d";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // button eyes / stitched smile
      ctx.fillStyle = "#221812";
      ctx.beginPath();
      ctx.arc(-3, -19, 1.8, 0, TAU);
      ctx.arc(3, -19, 1.8, 0, TAU);
      ctx.fill();
      stitchedLine(ctx, -4, -13, 4, -13, "rgba(40,25,18,0.85)", 2);
      // thread loose
      ctx.strokeStyle = "#b8402f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -5);
      ctx.quadraticCurveTo(-15, -1, -12, 6);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "wraith": {
      shadow(ctx, e.x, e.y + 13, 10, 2.5);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2.2) * 2);
      const grad = ctx.createLinearGradient(0, -22, 0, 16);
      grad.addColorStop(0, "rgba(208,200,180,0.8)");
      grad.addColorStop(1, "rgba(120,115,105,0.04)");
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.bezierCurveTo(13, -18, 14, 0, 10, 10);
      ctx.lineTo(5, 6);
      ctx.lineTo(2, 14);
      ctx.lineTo(-2, 7);
      ctx.lineTo(-6, 13);
      ctx.lineTo(-10, 8);
      ctx.bezierCurveTo(-14, -2, -12, -17, 0, -22);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(50,45,38,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // eyes
      ctx.fillStyle = "rgba(20,16,13,0.85)";
      ctx.beginPath();
      ctx.ellipse(-3.4, -16, 1.8, 2.3, 0, 0, TAU);
      ctx.ellipse(3.4, -16, 1.8, 2.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(234,223,200,0.5)";
      ctx.beginPath();
      ctx.arc(-3, -17, 0.5, 0, TAU);
      ctx.arc(3.8, -17, 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "drowned": {
      shadow(ctx, e.x, e.y + 14, 15, 4);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2.4) * 1.5);
      ctx.fillStyle = "rgba(88,126,116,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 20, 6, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 2, 12, 15, 0.05, 0, TAU);
      ctx.fillStyle = "#91ada3";
      ctx.fill();
      ctx.strokeStyle = "#1a211e";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // soaked robe folds
      ctx.strokeStyle = "rgba(45,70,65,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, 4);
      ctx.quadraticCurveTo(-3, 9, -4, 15);
      ctx.moveTo(6, 3);
      ctx.quadraticCurveTo(4, 9, 7, 14);
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.ellipse(0, -12, 8.5, 9, 0, 0, TAU);
      ctx.fillStyle = "#c2d0c4";
      ctx.fill();
      ctx.strokeStyle = "#1a211e";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // hair / weed
      ctx.strokeStyle = "#405b50";
      ctx.lineWidth = 1.1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3, -19);
        ctx.quadraticCurveTo(i * 5 + Math.sin(t * 2 + i) * 3, -25, i * 4, -29);
        ctx.stroke();
      }
      // hollow eyes and water line
      ctx.fillStyle = "#17201c";
      ctx.beginPath();
      ctx.ellipse(-3, -13, 1.7, 2.4, 0, 0, TAU);
      ctx.ellipse(3, -13, 1.7, 2.4, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(30,55,50,0.65)";
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.quadraticCurveTo(0, -6, 4, -8);
      ctx.stroke();
      // drips
      ctx.fillStyle = "rgba(160,200,190,0.55)";
      for (const [dx, dy] of [
        [-8, 10],
        [6, 9],
        [0, 17],
      ]) {
        ctx.beginPath();
        ctx.ellipse(dx, dy + Math.sin(t * 4 + dx) * 1.5, 1.2, 2.6, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "chorister": {
      shadow(ctx, e.x, e.y + 14, 13, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2) * 1);
      // sound rings
      ctx.strokeStyle = "rgba(180,205,190,0.28)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const pulse = (t * 0.55 + i * 0.33) % 1;
        ctx.globalAlpha = 0.5 * (1 - pulse);
        ctx.beginPath();
        ctx.arc(0, -8, 16 + pulse * 24, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // robe
      ctx.beginPath();
      ctx.moveTo(-7, -2);
      ctx.quadraticCurveTo(-12, 9, -9, 18);
      ctx.quadraticCurveTo(0, 21, 9, 18);
      ctx.quadraticCurveTo(12, 9, 7, -2);
      ctx.closePath();
      ctx.fillStyle = "#415b58";
      ctx.fill();
      ctx.strokeStyle = "#151c1a";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // hands
      ctx.fillStyle = "#c1cdc2";
      ctx.beginPath();
      ctx.ellipse(-4, 5, 2.4, 3, 0.3, 0, TAU);
      ctx.ellipse(4, 5, 2.4, 3, -0.3, 0, TAU);
      ctx.fill();
      // hood and face
      ctx.beginPath();
      ctx.ellipse(0, -13, 8.5, 10, 0, 0, TAU);
      ctx.fillStyle = "#cfd7c9";
      ctx.fill();
      ctx.strokeStyle = "#151c1a";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#1a120e";
      ctx.beginPath();
      ctx.ellipse(0, -11, 3.4, 4.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#869a8e";
      ctx.beginPath();
      ctx.ellipse(-3, -16, 1.2, 1.6, 0, 0, TAU);
      ctx.ellipse(3, -16, 1.2, 1.6, 0, 0, TAU);
      ctx.fill();
      // halo
      ctx.strokeStyle = "rgba(201,215,190,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -23, 11, 3.5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "roothound": {
      shadow(ctx, e.x, e.y + 14, 18, 4);
      ctx.save();
      ctx.translate(e.x + (e.state === "wind" ? Math.sin(t * 40) * 1.5 : 0), e.y + Math.sin(t * 5) * 1);
      const dir = e.vx >= 0 ? 1 : -1;
      // legs
      ctx.strokeStyle = "#382b1e";
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-8 + i * 7, 5);
        ctx.lineTo(-10 + i * 8, 15);
        ctx.moveTo(-5 + i * 7, 5);
        ctx.lineTo(-3 + i * 8, 14);
        ctx.stroke();
      }
      // body
      ctx.beginPath();
      ctx.ellipse(0, -2, 16, 10, -0.06, 0, TAU);
      ctx.fillStyle = "#54412b";
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // bark ribs
      ctx.strokeStyle = "rgba(202,180,140,0.3)";
      ctx.lineWidth = 1.1;
      for (let i = -1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6 - 4, -9);
        ctx.quadraticCurveTo(i * 6, -2, i * 6 - 2, 5);
        ctx.stroke();
      }
      // head
      ctx.beginPath();
      ctx.ellipse(13 * dir, -8, 8, 7, 0.15 * dir, 0, TAU);
      ctx.fillStyle = "#b9a580";
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // root antlers
      ctx.strokeStyle = "#8f7c5d";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(10 * dir, -14);
      ctx.quadraticCurveTo(7 * dir, -24, 13 * dir, -22);
      ctx.moveTo(16 * dir, -13);
      ctx.quadraticCurveTo(21 * dir, -22, 24 * dir, -16);
      ctx.stroke();
      // eye
      ctx.fillStyle = e.state === "wind" ? "#f0c06a" : "#d8a65b";
      ctx.beginPath();
      ctx.arc(15 * dir, -9, 1.5, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "waxcrow": {
      shadow(ctx, e.x, e.y + 13, 11, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 4) * 2);
      const flap = Math.sin(t * 17) * 0.6;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(-flap);
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(13, -12, 20, -3);
        ctx.quadraticCurveTo(12, 2, 4, 4);
        ctx.closePath();
        ctx.fillStyle = "#201a16";
        ctx.fill();
        ctx.strokeStyle = "#0d0a08";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = "rgba(216,166,91,0.45)";
        ctx.beginPath();
        ctx.moveTo(9, -6);
        ctx.lineTo(16, -2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 8, 0, 0, TAU);
      ctx.fillStyle = "#28211b";
      ctx.fill();
      ctx.strokeStyle = "#0d0a08";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // wax mask / face
      ctx.beginPath();
      ctx.ellipse(0, -8, 5.5, 5, 0, 0, TAU);
      ctx.fillStyle = "#d8c39d";
      ctx.fill();
      ctx.strokeStyle = "#241a12";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.arc(-2, -9, 1.1, 0, TAU);
      ctx.arc(2, -9, 1.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#2a1d13";
      ctx.beginPath();
      ctx.moveTo(-1.5, -6);
      ctx.lineTo(0, -3.5);
      ctx.lineTo(1.5, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case "bonewheel": {
      shadow(ctx, e.x, e.y + 15, 16, 4);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.t * 5);
      ctx.strokeStyle = "rgba(20,15,11,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "#c7b795";
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const x1 = Math.cos(a) * 5;
        const y1 = Math.sin(a) * 5;
        const x2 = Math.cos(a) * 15;
        const y2 = Math.sin(a) * 15;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = "#d3c4a4";
        ctx.beginPath();
        ctx.arc(x1, y1, 2.2, 0, TAU);
        ctx.arc(x2, y2, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, TAU);
      ctx.fillStyle = "#cbb995";
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#221710";
      ctx.beginPath();
      ctx.ellipse(-2.4, -1, 1.5, 1.9, 0, 0, TAU);
      ctx.ellipse(2.4, -1, 1.5, 1.9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "wretch": {
      shadow(ctx, e.x, e.y + 15, 13, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 8) * 1.4);
      const stride = Math.sin(t * 10) * 2.4;
      // long arms
      ctx.strokeStyle = "#33251b";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.quadraticCurveTo(-17, 3, -14 + stride, 12);
      ctx.moveTo(5, -2);
      ctx.quadraticCurveTo(17, 3, 14 - stride, 12);
      ctx.stroke();
      ctx.fillStyle = "#c6b190";
      ctx.beginPath();
      ctx.ellipse(-14 + stride, 12, 2.4, 3, 0.4, 0, TAU);
      ctx.ellipse(14 - stride, 12, 2.4, 3, -0.4, 0, TAU);
      ctx.fill();
      // body
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 11, 0.05, 0, TAU);
      ctx.fillStyle = "#a89678";
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(0, -14, 8, 0, TAU);
      ctx.fillStyle = "#c6b190";
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#211610";
      ctx.beginPath();
      ctx.ellipse(-2.8, -15, 1.3, 1.8, 0, 0, TAU);
      ctx.ellipse(2.8, -15, 1.3, 1.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#5e1e18";
      ctx.beginPath();
      ctx.ellipse(0, -10, 2.5, 1.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(194,74,51,0.5)";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-6, -20);
      ctx.quadraticCurveTo(-2, -26, 4, -21);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "grub": {
      shadow(ctx, e.x, e.y + 12, 12, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 6) * 1.5);
      ctx.strokeStyle = "#201810";
      ctx.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 5.2, Math.sin(t * 8 + i) * 2, 7, 6, 0, 0, TAU);
        ctx.fillStyle = i % 2 ? "#b7a587" : "#9d8b6f";
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = "#16100c";
      ctx.beginPath();
      ctx.arc(-8, -1, 1.2, 0, TAU);
      ctx.arc(8, -1, 1.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#8f3028";
      ctx.beginPath();
      ctx.arc(0, 4, 1.6, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "lurker": {
      if (e.state === "buried") {
        shadow(ctx, e.x, e.y + 10, 18, 4);
        ctx.fillStyle = "#3b2c20";
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + 7, 20, 9, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#16100c";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(194,74,51,0.7)";
        ctx.beginPath();
        ctx.moveTo(e.x - 10, e.y + 4);
        ctx.lineTo(e.x + 10, e.y + 4);
        ctx.stroke();
      } else {
        shadow(ctx, e.x, e.y + 14, 15, 4);
        ctx.save();
        ctx.translate(e.x, e.y + Math.sin(t * 7) * 1.2);
        ctx.strokeStyle = "#2a1d14";
        ctx.lineWidth = 2.2;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 6, 2);
          ctx.quadraticCurveTo(side * 20, 8, side * 17, 18);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(0, 2, 10, 8, 0, 0, TAU);
        ctx.fillStyle = "#4a3929";
        ctx.fill();
        ctx.strokeStyle = "#140e0a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#e6d6b8";
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * 4, -2, 1.5, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = "#160f0b";
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.arc(i * 4, -2, 0.7, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      break;
    }
    case "bellringer": {
      shadow(ctx, e.x, e.y + 15, 14, 4);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2.2) * 1.5);
      ctx.fillStyle = "#3a3228";
      ctx.beginPath();
      ctx.moveTo(-12, 15);
      ctx.quadraticCurveTo(-9, -8, 0, -14);
      ctx.quadraticCurveTo(9, -8, 12, 15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#16110c";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#16110c";
      ctx.beginPath();
      ctx.ellipse(0, -8, 6, 7, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#b89a66";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.fillStyle = "#c9a45e";
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.quadraticCurveTo(0, 18, 6, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "lantern": {
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2) * 3);
      const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 42);
      glow.addColorStop(0, "rgba(240,190,110,0.3)");
      glow.addColorStop(1, "rgba(240,190,110,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#1b1410";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(0, -9);
      ctx.stroke();
      ctx.fillStyle = "#33281e";
      ctx.beginPath();
      ctx.moveTo(-8, -9);
      ctx.lineTo(8, -9);
      ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 6.4, Math.sin(t * 5) * 0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f7e3b0";
      ctx.beginPath();
      ctx.ellipse(0, -1, 1.4, 3.4, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "penitent": {
      shadow(ctx, e.x, e.y + 16, 15, 4);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 1.4) * 1.2);
      ctx.strokeStyle = "rgba(216,166,91,0.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -20, 9, 3.4, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#5a5142";
      ctx.beginPath();
      ctx.moveTo(-13, 14);
      ctx.quadraticCurveTo(-8, -10, 0, -13);
      ctx.quadraticCurveTo(8, -10, 13, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#17110d";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#c9b08a";
      ctx.beginPath();
      ctx.ellipse(0, -9, 6.4, 7.4, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.stroke();
      ctx.strokeStyle = "rgba(194,74,51,0.7)";
      ctx.beginPath();
      ctx.moveTo(-4, -13);
      ctx.lineTo(4, -13);
      ctx.stroke();
      ctx.strokeStyle = "#33261a";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-4, 9);
      ctx.moveTo(10, 0);
      ctx.lineTo(4, 9);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "maw": {
      const pulse = 1 + Math.sin(t * 2.4) * 0.04;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(pulse, pulse);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.strokeStyle = "rgba(70,48,30,0.7)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 27, Math.sin(a) * 23);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 17, 0, 0, TAU);
      ctx.fillStyle = "#5a2a26";
      ctx.fill();
      ctx.strokeStyle = "#1a0f0b";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 8, 0, 0, TAU);
      ctx.fillStyle = "#180a09";
      ctx.fill();
      ctx.fillStyle = "#d9cbb0";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 - 2, -4);
        ctx.lineTo(i * 5, 2);
        ctx.lineTo(i * 5 + 2, -4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "rgba(194,74,51,0.55)";
      ctx.beginPath();
      ctx.arc(0, -7, 2.4, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "scarecrow": {
      shadow(ctx, e.x, e.y + 16, 13, 3.5);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 3.6) * 2);
      ctx.strokeStyle = "#2b2016";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 15);
      ctx.moveTo(-15, -2);
      ctx.lineTo(15, -2);
      ctx.stroke();
      ctx.fillStyle = "#7d6b4f";
      ctx.beginPath();
      ctx.ellipse(0, 2, 9, 11, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#17110c";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#b7a17c";
      ctx.beginPath();
      ctx.ellipse(0, -13, 7.4, 8, 0.1, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#17110c";
      ctx.beginPath();
      ctx.arc(-2.4, -14, 1.4, 0, TAU);
      ctx.arc(2.4, -14, 1.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#3a2a1c";
      ctx.beginPath();
      ctx.moveTo(-4, -9);
      ctx.lineTo(4, -9);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "swarmling": {
      const flutter = Math.sin(t * 24) * 0.7;
      shadow(ctx, e.x, e.y + 8, 7, 2.4);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 7) * 1.4);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.rotate(side * (0.3 + flutter));
        ctx.fillStyle = "#c2b28e";
        ctx.beginPath();
        ctx.ellipse(side * 7, -2, 7, 3.4, side * 0.3, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#1f1811";
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#3a2f22";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 5.4, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#15100c";
      ctx.stroke();
      ctx.fillStyle = "#c24a33";
      ctx.beginPath();
      ctx.arc(-1, -2, 0.8, 0, TAU);
      ctx.arc(1, -2, 0.8, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "waxherald": {
      shadow(ctx, e.x, e.y + 16, 13, 4);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 1.8) * 1.4);
      const halo = ctx.createRadialGradient(0, -18, 2, 0, -18, 42);
      halo.addColorStop(0, "rgba(232,179,108,0.22)");
      halo.addColorStop(1, "rgba(232,179,108,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, -18, 42, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#b09a72";
      ctx.beginPath();
      ctx.moveTo(-11, 14);
      ctx.quadraticCurveTo(-8, -8, 0, -11);
      ctx.quadraticCurveTo(8, -8, 11, 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#19120c";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#e8d2a2";
      ctx.beginPath();
      ctx.ellipse(0, -8, 5.6, 6.8, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.ellipse(0, -19 + Math.sin(t * 9) * 1.2, 2.6, 5.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#f5dfa4";
      ctx.beginPath();
      ctx.ellipse(0, -18, 1.2, 3, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(240,220,170,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -8, 9, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "bonekite": {
      shadow(ctx, e.x, e.y + 16, 5, 2);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 3) * 2.4);
      ctx.rotate(e.angle * 0.25);
      ctx.strokeStyle = "#d4c5a5";
      ctx.lineWidth = 2.4;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(side * 15, -10);
        ctx.lineTo(side * 20, 0);
        ctx.lineTo(side * 12, 4);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(side * (9 + i * 3), -4 + i * 2);
          ctx.lineTo(side * (6 + i * 3), 6);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#b9aa8a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 9, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = "#8f3028";
      ctx.beginPath();
      ctx.arc(0, -4, 1.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(216,203,173,0.6)";
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(8, 20, -4, 26);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "censer": {
      shadow(ctx, e.x, e.y + 14, 9, 2.6);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2) * 2);
      ctx.strokeStyle = "#1b1410";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(0, -8);
      ctx.stroke();
      ctx.fillStyle = "#6d5a3e";
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.quadraticCurveTo(0, 12, 10, -6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#17110c";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.arc(0, 3, 2.2, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(210,190,155,${0.22 - i * 0.05})`;
        ctx.beginPath();
        ctx.arc(Math.sin(t + i * 2) * 5, -8 - i * 5, 3 + i * 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "mimic": {
      if (e.state === "disguise") {
        ctx.save();
        ctx.translate(e.x, e.y + 3);
        ctx.fillStyle = "#584737";
        ctx.beginPath();
        ctx.moveTo(-9, -14);
        ctx.quadraticCurveTo(-17, 0, -8, 13);
        ctx.quadraticCurveTo(0, 17, 8, 13);
        ctx.quadraticCurveTo(17, 0, 9, -14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#1b1410";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.strokeStyle = "rgba(216,166,91,0.4)";
        ctx.beginPath();
        ctx.moveTo(-8, -3);
        ctx.lineTo(8, -3);
        ctx.stroke();
        ctx.restore();
      } else {
        shadow(ctx, e.x, e.y + 14, 14, 3.6);
        ctx.save();
        ctx.translate(e.x, e.y + Math.sin(t * 9) * 1.2);
        ctx.fillStyle = "#4a3426";
        ctx.beginPath();
        ctx.ellipse(0, 2, 13, 10, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#150e0a";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = "#170b09";
        ctx.beginPath();
        ctx.ellipse(0, 3, 8, 5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#e2d4b4";
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 3.4 - 1.4, -1);
          ctx.lineTo(i * 3.4, 4);
          ctx.lineTo(i * 3.4 + 1.4, -1);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "#8f3028";
        ctx.beginPath();
        ctx.arc(-3, -4, 1.2, 0, TAU);
        ctx.arc(3, -4, 1.2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "weaverling": {
      shadow(ctx, e.x, e.y + 11, 12, 3);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 7) * 1.2);
      ctx.strokeStyle = "#241a13";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 6; i++) {
        const side = i < 3 ? -1 : 1;
        const idx = i % 3;
        const a = 0.4 + idx * 0.45 + Math.sin(t * 9 + i) * 0.1;
        ctx.beginPath();
        ctx.moveTo(side * 4, 0);
        ctx.lineTo(side * Math.cos(a) * 18, Math.sin(a) * 14 - 4);
        ctx.stroke();
      }
      ctx.fillStyle = "#4d3a29";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 7, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#170f0b";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#c9b28b";
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.4, 4, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#8f3028";
      ctx.beginPath();
      ctx.arc(-1.4, -6, 0.8, 0, TAU);
      ctx.arc(1.4, -6, 0.8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(216,203,173,0.3)";
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(-16, 7);
      ctx.moveTo(8, 2);
      ctx.lineTo(16, 7);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "hollowman": {
      shadow(ctx, e.x, e.y + 18, 13, 4);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 2.4) * 2);
      ctx.fillStyle = "#2d2620";
      ctx.beginPath();
      ctx.moveTo(-13, 18);
      ctx.quadraticCurveTo(-10, -12, 0, -20);
      ctx.quadraticCurveTo(10, -12, 13, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#110c09";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#0a0706";
      ctx.beginPath();
      ctx.ellipse(0, -1, 5.4, 7.4, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(194,74,51,0.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(-8, 4, 3, 12);
      ctx.stroke();
      ctx.fillStyle = "#d9cbb0";
      ctx.beginPath();
      ctx.arc(-2.4, -14, 1.4, 0, TAU);
      ctx.arc(2.4, -14, 1.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#160f0b";
      ctx.beginPath();
      ctx.arc(-2.4, -14, 0.6, 0, TAU);
      ctx.arc(2.4, -14, 0.6, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "drifter": {
      ctx.globalAlpha = 0.72 + Math.sin(t * 2.1) * 0.14;
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 1.4) * 4);
      ctx.fillStyle = "rgba(150,165,150,0.8)";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(15, -6, 10, 14);
      ctx.quadraticCurveTo(4, 20, 0, 12);
      ctx.quadraticCurveTo(-4, 20, -10, 14);
      ctx.quadraticCurveTo(-15, -6, 0, -18);
      ctx.fill();
      ctx.strokeStyle = "rgba(40,50,46,0.8)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#1a1410";
      ctx.beginPath();
      ctx.arc(-3, -8, 1.6, 0, TAU);
      ctx.arc(3, -8, 1.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(194,74,51,0.5)";
      ctx.beginPath();
      ctx.ellipse(0, -1, 2, 1, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "spore": {
      shadow(ctx, e.x, e.y + 10, 9, 2.6);
      ctx.save();
      ctx.translate(e.x, e.y + Math.sin(t * 4) * 1.4);
      ctx.fillStyle = "#8a7a5a";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#b9a87f";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + e.seed;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#4a3a22";
      ctx.beginPath();
      ctx.arc(-2, -1, 1.1, 0, TAU);
      ctx.arc(2, -1, 1.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(194,74,51,0.6)";
      ctx.beginPath();
      ctx.arc(0, 3, 1.4, 0, TAU);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "boss":
      drawBoss(ctx, e, time);
      break;
    default:
      break;
  }

  if (e.elite) drawEliteAura(ctx, e, time);
  if (e.shielded > 0) drawShield(ctx, e, time);
  if (e.frozen > 0) drawFrost(ctx, e);
  enemyFlash(ctx, e, Math.max(10, e.r));
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------

export function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const t = time + e.seed;
  const open = e.state === "wind" || e.state === "spit" ? 1 : 0.35;

  if (e.boss === "glutton") {
    shadow(ctx, e.x, e.y + e.r * 0.7, e.r * 1.02, e.r * 0.26);
    ctx.save();
    ctx.translate(e.x, e.y + Math.sin(t * 2.2) * 2);
    // flies circling
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + i * 2.1;
      const fx = Math.cos(a) * (e.r + 18);
      const fy = Math.sin(a) * 18 - e.r * 0.7;
      ctx.fillStyle = "rgba(30,24,18,0.8)";
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.5, 1.5, a, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(190,180,155,0.5)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(fx - 1, fy - 1, 3, 1, a, 0, TAU);
      ctx.stroke();
    }
    // tiny legs
    ctx.strokeStyle = "#3b2c1e";
    ctx.lineWidth = 4;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * e.r * 0.6, e.r * 0.4);
      ctx.quadraticCurveTo(side * e.r * 0.8, e.r * 0.7, side * e.r * 0.55, e.r * 0.82);
      ctx.stroke();
    }
    // body sack
    const wob = 1 + Math.sin(t * 1.4) * 0.025;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.r * wob, e.r * 0.9 * wob, 0, 0, TAU);
    const grad = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.4, e.r * 0.1, 0, 0, e.r);
    grad.addColorStop(0, "#6f573b");
    grad.addColorStop(0.65, "#4c3926");
    grad.addColorStop(1, "#2e2216");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#140e09";
    ctx.lineWidth = 3;
    ctx.stroke();
    // stitched seams
    ctx.save();
    ctx.strokeStyle = "rgba(42,30,20,0.7)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.7, -e.r * 0.2);
    ctx.quadraticCurveTo(0, -e.r * 0.55, e.r * 0.7, -e.r * 0.15);
    ctx.moveTo(-e.r * 0.5, e.r * 0.45);
    ctx.quadraticCurveTo(0, e.r * 0.25, e.r * 0.55, e.r * 0.5);
    ctx.stroke();
    ctx.restore();
    // burlap patches
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (const [px, py, pw, ph, rot] of [
      [-e.r * 0.55, -e.r * 0.12, 12, 9, -0.2],
      [e.r * 0.5, -e.r * 0.12, 9, 12, 0.3],
      [-e.r * 0.28, e.r * 0.48, 10, 7, 0.1],
    ] as const) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = "#5a452f";
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.strokeStyle = "rgba(28,19,12,0.8)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "rgba(210,188,150,0.28)";
      ctx.beginPath();
      ctx.moveTo(-pw / 2, -ph / 2 - 2);
      ctx.lineTo(pw / 2, -ph / 2 - 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // maw
    const mawH = (0.22 + open * 0.33) * e.r;
    const mawW = (0.7 + open * 0.2) * e.r;
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.05, mawW, mawH, 0, 0, TAU);
    const mawGrad = ctx.createRadialGradient(0, e.r * 0.05, 2, 0, e.r * 0.05, mawW);
    mawGrad.addColorStop(0, "#2a0c0b");
    mawGrad.addColorStop(0.75, "#4b1411");
    mawGrad.addColorStop(1, "#6e241b");
    ctx.fillStyle = mawGrad;
    ctx.fill();
    ctx.strokeStyle = "#1b0c09";
    ctx.lineWidth = 2;
    ctx.stroke();
    // teeth
    ctx.fillStyle = "#d9ccb0";
    const teeth = 7;
    for (let i = 0; i < teeth; i++) {
      const tx = -mawW * 0.8 + (i / (teeth - 1)) * mawW * 1.6;
      const ty = e.r * 0.05 - mawH * 0.8 + Math.abs(tx / mawW) * mawH * 0.45;
      ctx.beginPath();
      ctx.moveTo(tx - 3.2, ty);
      ctx.lineTo(tx, ty + 7 + (i % 2) * 2);
      ctx.lineTo(tx + 3.2, ty);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - 2.7, e.r * 0.05 + mawH * 0.78 - Math.abs(tx / mawW) * mawH * 0.35);
      ctx.lineTo(tx, e.r * 0.05 + mawH * 0.62);
      ctx.lineTo(tx + 2.7, e.r * 0.05 + mawH * 0.78 - Math.abs(tx / mawW) * mawH * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    // little arms
    ctx.strokeStyle = "#5b4832";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.88, -e.r * 0.12);
    ctx.quadraticCurveTo(-e.r * 1.15, e.r * 0.1, -e.r * 1.02, e.r * 0.3);
    ctx.moveTo(e.r * 0.85, -e.r * 0.3);
    ctx.quadraticCurveTo(e.r * 1.12, -e.r * 0.05, e.r * 1, e.r * 0.2);
    ctx.stroke();
    // eye above maw
    ctx.fillStyle = "#e3cfae";
    ctx.beginPath();
    ctx.ellipse(0, -e.r * 0.5, 8, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#17100c";
    ctx.beginPath();
    ctx.arc(0, -e.r * 0.5, 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(240,220,190,0.8)";
    ctx.beginPath();
    ctx.arc(-1, -e.r * 0.52, 0.9, 0, TAU);
    ctx.fill();
    // phase 2 cracks
    if (e.phase2) {
      ctx.strokeStyle = "rgba(194,74,51,0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-e.r * 0.6, -e.r * 0.6);
      ctx.lineTo(-e.r * 0.4, -e.r * 0.3);
      ctx.lineTo(-e.r * 0.5, 0);
      ctx.moveTo(e.r * 0.55, -e.r * 0.62);
      ctx.lineTo(e.r * 0.4, -e.r * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  } else if (e.boss === "weaver") {
    shadow(ctx, e.x, e.y + e.r * 0.7, e.r, e.r * 0.24);
    ctx.save();
    ctx.translate(e.x, e.y + Math.sin(t * 3) * 1.4);
    // needle legs
    ctx.strokeStyle = "#1b1410";
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 4; i++) {
      for (const side of [-1, 1]) {
        const baseX = side * e.r * 0.45;
        const baseY = -e.r * 0.45 + i * e.r * 0.28;
        const midX = side * (e.r * 0.95 + i * 8);
        const midY = -e.r * 0.85 + i * e.r * 0.36;
        const endX = side * (e.r * 1.35 + i * 5);
        const endY = e.r * 0.45 + i * 8 + Math.sin(t * 2 + i + (side > 0 ? 1 : 0)) * 3;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
        ctx.stroke();
      }
    }
    // abdomen / spool
    ctx.beginPath();
    ctx.ellipse(0, e.r * 0.2, e.r * 0.82, e.r * 0.72, 0, 0, TAU);
    const grad = ctx.createRadialGradient(-e.r * 0.2, -e.r * 0.15, 3, 0, e.r * 0.2, e.r);
    grad.addColorStop(0, "#3f2a26");
    grad.addColorStop(1, "#1c1411");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#0f0b09";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // thread wrap on abdomen
    ctx.strokeStyle = "rgba(184,64,47,0.7)";
    ctx.lineWidth = 1.1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, e.r * 0.2, e.r * (0.3 + i * 0.11), e.r * (0.16 + i * 0.07), 0.2, 0, TAU);
      ctx.stroke();
    }
    // hourglass
    ctx.fillStyle = "#a83a2c";
    ctx.beginPath();
    ctx.moveTo(0, e.r * 0.14);
    ctx.lineTo(-6, e.r * 0.34);
    ctx.lineTo(0, e.r * 0.46);
    ctx.lineTo(6, e.r * 0.34);
    ctx.closePath();
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.ellipse(0, -e.r * 0.5, e.r * 0.45, e.r * 0.36, 0, 0, TAU);
    ctx.fillStyle = "#2d211c";
    ctx.fill();
    ctx.strokeStyle = "#0f0b09";
    ctx.lineWidth = 2;
    ctx.stroke();
    // eyes
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      ctx.fillStyle = "#e6dcc2";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.r * 0.2, -e.r * 0.52 + Math.sin(a) * e.r * 0.13, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#120d0a";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * e.r * 0.2, -e.r * 0.52 + Math.sin(a) * e.r * 0.13, 0.9, 0, TAU);
      ctx.fill();
    }
    // fangs
    ctx.fillStyle = "#d9ccb0";
    ctx.beginPath();
    ctx.moveTo(-4, -e.r * 0.28);
    ctx.lineTo(-2, -e.r * 0.12);
    ctx.lineTo(0, -e.r * 0.28);
    ctx.lineTo(2, -e.r * 0.12);
    ctx.lineTo(4, -e.r * 0.28);
    ctx.closePath();
    ctx.fill();
    // hanging threads
    ctx.strokeStyle = "rgba(194,74,51,0.5)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const sx = -e.r * 0.5 + i * e.r * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, e.r * 0.6);
      ctx.quadraticCurveTo(sx + Math.sin(t + i) * 8, e.r * 1.2, sx, e.r * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  } else if (e.boss === "drowned") {
    drawDrownedBoss(ctx, e, t);
  } else if (e.boss === "orchard") {
    drawOrchardBoss(ctx, e, t);
  } else if (e.boss === "sexton") {
    drawSextonBoss(ctx, e, t);
  } else if (e.boss === "curator") {
    drawCuratorBoss(ctx, e, t);
  } else if (e.boss === "bellwidow") {
    drawBellWidowBoss(ctx, e, t);
  } else if (e.boss === "tallyman") {
    drawTallymanBoss(ctx, e, t);
  } else if (e.boss === "gaunt") {
    drawGauntBoss(ctx, e, t);
  } else if (e.boss === "carver") {
    drawCarverBoss(ctx, e, t);
  } else {
    // The Hollow Heart
    const beat = 1 + Math.sin(t * (e.phase2 ? 5.2 : 3.4)) * (e.phase2 ? 0.035 : 0.025);
    ctx.save();
    ctx.translate(e.x, e.y + Math.sin(t * 1.6) * 2);
    // thread arms
    ctx.strokeStyle = "rgba(194,74,51,0.65)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const a = -1.5 + i * 0.65;
      const sx = Math.cos(a) * e.r * 0.85;
      const sy = Math.sin(a) * e.r * 0.65;
      const sway = Math.sin(t * 1.2 + i) * 16;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + sway, sy + 30, sx - sway, sy + 55, sx + Math.sin(t + i) * 15, sy + 85);
      ctx.stroke();
    }
    // hands
    for (const side of [-1, 1]) {
      const hx = side * e.r * 1.05;
      const hy = e.r * 0.35 + Math.sin(t * 1.4 + side) * 10;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(side * 0.3);
      ctx.fillStyle = "#cbb596";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#241710";
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.strokeStyle = "#a13b2d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(0, -20);
      ctx.stroke();
      ctx.restore();
    }
    // heart body
    ctx.scale(beat, beat);
    ctx.beginPath();
    const R = e.r;
    ctx.moveTo(0, R * 0.72);
    ctx.bezierCurveTo(-R * 1.15, R * 0.1, -R * 0.95, -R * 0.9, -R * 0.38, -R * 0.8);
    ctx.bezierCurveTo(-R * 0.12, -R * 0.76, 0, -R * 0.55, 0, -R * 0.44);
    ctx.bezierCurveTo(0, -R * 0.55, R * 0.12, -R * 0.76, R * 0.38, -R * 0.8);
    ctx.bezierCurveTo(R * 0.95, -R * 0.9, R * 1.15, R * 0.1, 0, R * 0.72);
    ctx.closePath();
    const grad = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R);
    grad.addColorStop(0, "#a4473e");
    grad.addColorStop(0.6, "#7a2a28");
    grad.addColorStop(1, "#421215");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#180b0a";
    ctx.lineWidth = 2.8;
    ctx.stroke();
    // stitches
    ctx.save();
    ctx.strokeStyle = "rgba(236,198,160,0.4)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.42);
    ctx.lineTo(0, R * 0.58);
    ctx.moveTo(-R * 0.45, -R * 0.35);
    ctx.quadraticCurveTo(0, -R * 0.1, R * 0.45, -R * 0.35);
    ctx.stroke();
    ctx.restore();
    // eye
    ctx.fillStyle = "#e6d8bd";
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.12, R * 0.24, R * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#2a1512";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const look = Math.sin(t * 0.9) * R * 0.04;
    ctx.fillStyle = "#201513";
    ctx.beginPath();
    ctx.arc(look, -R * 0.12, R * 0.075, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,235,210,0.8)";
    ctx.beginPath();
    ctx.arc(look - R * 0.02, -R * 0.15, R * 0.018, 0, TAU);
    ctx.fill();
    // stitched mouth under eye
    stitchedLine(ctx, -R * 0.16, R * 0.12, R * 0.16, R * 0.12, "rgba(30,14,12,0.7)", 2);
    // vessels
    ctx.strokeStyle = "rgba(60,16,16,0.65)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, -R * 0.5);
    ctx.quadraticCurveTo(-R * 0.3, -R * 0.25, -R * 0.38, 0);
    ctx.moveTo(R * 0.4, -R * 0.6);
    ctx.quadraticCurveTo(R * 0.3, -R * 0.2, R * 0.5, R * 0.1);
    ctx.stroke();
    if (e.phase2) {
      ctx.strokeStyle = "rgba(224,120,86,0.5)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-R * 0.35, R * 0.2);
      ctx.lineTo(-R * 0.2, R * 0.35);
      ctx.lineTo(-R * 0.3, R * 0.5);
      ctx.moveTo(R * 0.3, R * 0.1);
      ctx.lineTo(R * 0.15, R * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  envelopeBossAura(ctx, e, time);
}

function drawBellWidowBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 1.5) * 3);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, r * 0.9, r * 0.22, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 1.8;
    const x = Math.cos(a) * r * 0.9;
    const y = r * 0.55 + Math.abs(Math.sin(a)) * 8;
    ctx.fillStyle = i % 2 ? "#8d7448" : "#b89a66";
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 12);
    ctx.quadraticCurveTo(x + 9, y - 4, x + 4, y + 5);
    ctx.quadraticCurveTo(x + Math.sin(time * 3 + i) * 2, y + 9, x - 4, y + 5);
    ctx.quadraticCurveTo(x - 9, y - 4, x - 5, y - 12);
    ctx.fill();
    ctx.strokeStyle = "#1a120c";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const grad = ctx.createLinearGradient(0, -r, 0, r);
  grad.addColorStop(0, "#4c3b30");
  grad.addColorStop(0.6, "#2d241e");
  grad.addColorStop(1, "#15100d");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, r * 0.5);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.3, 0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.95, -r * 0.3, r * 0.7, r * 0.5);
  ctx.quadraticCurveTo(0, r * 0.85, -r * 0.7, r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#140e0a";
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = "#d8cdb7";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.55, r * 0.28, r * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1b130d";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#18100c";
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.58, r * 0.055, r * 0.09, 0, 0, TAU);
  ctx.ellipse(r * 0.1, -r * 0.58, r * 0.055, r * 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(194,74,51,0.6)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, -r * 0.38);
  ctx.quadraticCurveTo(0, -r * 0.31, r * 0.16, -r * 0.38);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + time * 0.25;
    ctx.strokeStyle = "rgba(216,166,91,0.35)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.2);
    ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.75);
    ctx.stroke();
  }
  ctx.restore();
  envelopeBossAura(ctx, e, time);
}

function drawTallymanBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 1.8) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2c2621";
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.85);
  ctx.quadraticCurveTo(-r * 0.62, -r * 0.2, -r * 0.2, -r * 0.55);
  ctx.lineTo(r * 0.2, -r * 0.55);
  ctx.quadraticCurveTo(r * 0.62, -r * 0.2, r * 0.55, r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#120d0a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // ledger head
  ctx.fillStyle = "#c9b28b";
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, -r * 0.98);
  ctx.lineTo(r * 0.34, -r * 0.94);
  ctx.lineTo(r * 0.3, -r * 0.42);
  ctx.lineTo(-r * 0.28, -r * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "rgba(30,20,14,0.62)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = -r * 0.88 + i * r * 0.1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, y);
    ctx.lineTo(r * 0.2, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#8f3028";
  for (let i = 0; i < 5; i++) ctx.fillRect(-r * 0.12 + i * 5, -r * 0.66, 1, 8);
  // arms and quill
  ctx.strokeStyle = "#3a3026";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.15);
  ctx.lineTo(-r * 0.9, r * 0.25);
  ctx.moveTo(r * 0.45, -r * 0.15);
  ctx.lineTo(r * 0.86, r * 0.1 + Math.sin(time * 6) * 5);
  ctx.stroke();
  ctx.strokeStyle = "#e0c184";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 0.86, r * 0.1);
  ctx.lineTo(r * 0.95, -r * 0.2);
  ctx.stroke();
  // tally marks floating
  for (let i = 0; i < 5; i++) {
    const a = time * 0.5 + (i / 5) * TAU;
    ctx.strokeStyle = "rgba(216,166,91,0.34)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.8 - 4);
    ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.8 + 4);
    ctx.stroke();
  }
  ctx.restore();
  envelopeBossAura(ctx, e, time);
}

function drawGauntBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 1.3) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.7, r * 0.2, 0, 0, TAU);
  ctx.fill();
  // long legs
  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.24, r * 0.3);
    ctx.lineTo(side * r * 0.42 + Math.sin(time * 3) * 4, r * 1.0);
    ctx.stroke();
  }
  // ribs
  ctx.fillStyle = "#6b5a42";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.02, r * 0.42, r * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#15100c";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(214,198,164,0.7)";
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 5; i++) {
    const y = -r * 0.4 + i * r * 0.17;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, y);
    ctx.quadraticCurveTo(0, y + 7, r * 0.3, y);
    ctx.stroke();
  }
  // skull
  ctx.fillStyle = "#cbb991";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.72, r * 0.27, r * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#18100b";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#1a0f0b";
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.76, r * 0.07, r * 0.1, 0, 0, TAU);
  ctx.ellipse(r * 0.1, -r * 0.76, r * 0.07, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#d6c6a4";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.4, -r * 0.2);
    ctx.quadraticCurveTo(side * r * 1.0, 0, side * r * 0.9, r * 0.55);
    ctx.stroke();
  }
  ctx.restore();
  envelopeBossAura(ctx, e, time);
}

function drawCarverBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 1.6) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.92, r * 0.8, r * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#3a342b";
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, r * 0.8);
  ctx.quadraticCurveTo(-r * 0.58, -r * 0.2, -r * 0.22, -r * 0.6);
  ctx.lineTo(r * 0.22, -r * 0.6);
  ctx.quadraticCurveTo(r * 0.58, -r * 0.2, r * 0.5, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#140e0a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // apron
  ctx.fillStyle = "#b9a98a";
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, -r * 0.28);
  ctx.lineTo(r * 0.24, -r * 0.28);
  ctx.lineTo(r * 0.34, r * 0.72);
  ctx.lineTo(-r * 0.34, r * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = "rgba(141,48,40,0.6)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-r * 0.14 + i * r * 0.1, r * 0.2 + (i % 2) * r * 0.16, 3.4, 0, TAU);
    ctx.fill();
  }
  // mask
  ctx.fillStyle = "#e2d5bb";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.68, r * 0.25, r * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#1a0f0b";
  ctx.beginPath();
  ctx.ellipse(-r * 0.09, -r * 0.72, r * 0.05, r * 0.08, 0, 0, TAU);
  ctx.ellipse(r * 0.09, -r * 0.72, r * 0.05, r * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#1a0f0b";
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -r * 0.6);
  ctx.lineTo(r * 0.12, -r * 0.6);
  ctx.stroke();
  // chisel arms
  ctx.strokeStyle = "#cbbba0";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    const sway = Math.sin(time * 4 + side) * 4;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.42, -r * 0.1);
    ctx.lineTo(side * (r * 0.9 + sway), r * 0.18);
    ctx.stroke();
    ctx.fillStyle = "#8d8677";
    ctx.beginPath();
    ctx.moveTo(side * (r * 0.9 + sway), r * 0.18);
    ctx.lineTo(side * (r * 1.05 + sway), r * 0.06);
    ctx.lineTo(side * (r * 1.0 + sway), r * 0.28);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const a = time * 0.6 + (i / 6) * TAU;
    ctx.strokeStyle = "rgba(216,203,173,0.22)";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.7);
    ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.85);
    ctx.stroke();
  }
  ctx.restore();
  envelopeBossAura(ctx, e, time);
}

function drawDrownedBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  const bob = Math.sin(time * 1.6) * 3;
  ctx.save();
  ctx.translate(e.x, e.y + bob);
  ctx.fillStyle = "rgba(50,95,90,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.72, r * 1.1, r * 0.3, 0, 0, TAU);
  ctx.fill();
  // tattered robe
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.55);
  ctx.quadraticCurveTo(-r * 1.05, r * 0.35, -r * 0.7, r * 0.85);
  ctx.quadraticCurveTo(-r * 0.2, r * 1.0, 0, r * 0.88);
  ctx.quadraticCurveTo(r * 0.25, r * 1.02, r * 0.55, r * 0.86);
  ctx.quadraticCurveTo(r * 1.0, r * 0.4, r * 0.68, -r * 0.55);
  ctx.quadraticCurveTo(0, -r * 0.9, -r * 0.7, -r * 0.55);
  ctx.fillStyle = "#3b5652";
  ctx.fill();
  ctx.strokeStyle = "#131c1a";
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.strokeStyle = "rgba(135,176,158,0.35)";
  ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.28, -r * 0.25);
    ctx.quadraticCurveTo(i * r * 0.3, r * 0.4, i * r * 0.24, r * 0.82);
    ctx.stroke();
  }
  // floating water ring
  ctx.strokeStyle = "rgba(120,190,180,0.4)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.4, r * 1.2, r * 0.3, 0, 0, TAU);
  ctx.stroke();
  // heads
  const open = e.state === "wailWind" || e.state === "spiral" ? 1 : 0.6;
  for (const [hx, hy, hr] of [
    [0, -r * 0.55, r * 0.3],
    [-r * 0.55, -r * 0.25, r * 0.2],
    [r * 0.58, -r * 0.3, r * 0.21],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(hx, hy, hr * 0.85, hr, 0, 0, TAU);
    ctx.fillStyle = "#c1d3c7";
    ctx.fill();
    ctx.strokeStyle = "#1b2420";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = "#1a2420";
    ctx.beginPath();
    ctx.ellipse(hx - hr * 0.32, hy - hr * 0.2, hr * 0.14, hr * 0.2, 0, 0, TAU);
    ctx.ellipse(hx + hr * 0.32, hy - hr * 0.2, hr * 0.14, hr * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, hy + hr * 0.25, hr * 0.28, hr * 0.2 * open, 0, 0, TAU);
    ctx.fillStyle = "#22302a";
    ctx.fill();
    // wet hair
    ctx.strokeStyle = "rgba(54,82,72,0.85)";
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + i * hr * 0.18, hy - hr * 0.8);
      ctx.quadraticCurveTo(hx + i * hr * 0.28, hy - hr * 1.2, hx + i * hr * 0.2 + Math.sin(time + i) * 2, hy - hr * 1.4);
      ctx.stroke();
    }
  }
  // candles and thread
  for (const [cx, cy] of [[-r * 0.8, r * 0.3], [r * 0.75, r * 0.35]] as const) {
    ctx.fillStyle = "#c9b28b";
    ctx.fillRect(cx - 1.8, cy, 3.6, 9);
    ctx.fillStyle = "#e0a24e";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 2, 4, Math.sin(time * 3 + cx) * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(194,74,51,0.65)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.6);
  ctx.bezierCurveTo(-r * 0.2, r * 0.2, r * 0.3, r * 0.9, r * 1.1, r * 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawOrchardBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 1.4) * 2);
  // roots
  ctx.strokeStyle = "#3d3123";
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 0.25 + (i / 4) * Math.PI * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.15);
    ctx.quadraticCurveTo(Math.cos(a) * r * 0.8, r * 0.6, Math.cos(a) * r * 1.15, r * 0.9);
    ctx.stroke();
  }
  // trunk body
  ctx.beginPath();
  ctx.moveTo(-r * 0.58, -r * 0.55);
  ctx.quadraticCurveTo(-r * 0.8, 0, -r * 0.5, r * 0.55);
  ctx.quadraticCurveTo(0, r * 0.8, r * 0.5, r * 0.55);
  ctx.quadraticCurveTo(r * 0.8, 0, r * 0.58, -r * 0.55);
  ctx.quadraticCurveTo(0, -r * 0.85, -r * 0.58, -r * 0.55);
  ctx.fillStyle = "#5c4a33";
  ctx.fill();
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 2.8;
  ctx.stroke();
  // bark seams
  ctx.strokeStyle = "rgba(208,188,150,0.28)";
  ctx.lineWidth = 1.1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.22, -r * 0.45);
    ctx.quadraticCurveTo(i * r * 0.27, 0, i * r * 0.2, r * 0.45);
    ctx.stroke();
  }
  // branches
  ctx.strokeStyle = "#6d573d";
  ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * r * 0.45, -r * 0.3);
    ctx.quadraticCurveTo(side * r * 0.95, -r * 0.8, side * r * 1.2, -r * 0.35);
    ctx.quadraticCurveTo(side * r * 1.05, -r * 0.15, side * r * 0.65, -r * 0.15);
    ctx.stroke();
    // hanging skull fruit
    ctx.strokeStyle = "rgba(194,74,51,0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.85, -r * 0.5);
    ctx.lineTo(side * r * 0.9, -r * 0.12);
    ctx.stroke();
    ctx.fillStyle = "#c7b795";
    ctx.beginPath();
    ctx.arc(side * r * 0.9, -r * 0.05, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#241a12";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#241a12";
    ctx.beginPath();
    ctx.arc(side * r * 0.9 - 1.5, -r * 0.06, 1, 0, TAU);
    ctx.arc(side * r * 0.9 + 1.5, -r * 0.06, 1, 0, TAU);
    ctx.fill();
  }
  // skull face in the trunk
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.32, r * 0.27, r * 0.31, 0, 0, TAU);
  ctx.fillStyle = "#d1c0a0";
  ctx.fill();
  ctx.strokeStyle = "#241a12";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#211710";
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.34, r * 0.06, r * 0.08, 0, 0, TAU);
  ctx.ellipse(r * 0.1, -r * 0.34, r * 0.06, r * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.25);
  ctx.lineTo(-r * 0.035, -r * 0.18);
  ctx.lineTo(r * 0.035, -r * 0.18);
  ctx.closePath();
  ctx.fill();
  // crown of twigs
  ctx.strokeStyle = "#a89065";
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.1, -r * 0.5);
    ctx.lineTo(i * r * 0.14, -r * (0.72 + Math.abs(i) * 0.04));
    ctx.stroke();
  }
  // glowing roots in phase 2
  if (e.phase2) {
    ctx.strokeStyle = "rgba(216,120,80,0.65)";
    ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.2, r * 0.1);
      ctx.lineTo(i * r * 0.5, r * 0.7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSextonBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 2.2) * 1.5);
  shadow(ctx, 0, r * 0.7, r * 0.9, r * 0.22);
  // shovel
  ctx.strokeStyle = "#493b2b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 1.0);
  ctx.lineTo(r * 0.9, r * 0.3);
  ctx.stroke();
  ctx.fillStyle = "#7f7460";
  ctx.beginPath();
  ctx.moveTo(r * 0.78, r * 0.2);
  ctx.lineTo(r * 1.05, r * 0.15);
  ctx.lineTo(r * 1.08, r * 0.45);
  ctx.lineTo(r * 0.82, r * 0.5);
  ctx.closePath();
  ctx.fill();
  // grave robe
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.4);
  ctx.quadraticCurveTo(-r * 0.9, r * 0.3, -r * 0.62, r * 0.7);
  ctx.quadraticCurveTo(0, r * 0.9, r * 0.62, r * 0.7);
  ctx.quadraticCurveTo(r * 0.9, r * 0.3, r * 0.6, -r * 0.4);
  ctx.quadraticCurveTo(0, -r * 0.7, -r * 0.6, -r * 0.4);
  ctx.closePath();
  ctx.fillStyle = "#3b3328";
  ctx.fill();
  ctx.strokeStyle = "#130e0a";
  ctx.lineWidth = 2;
  ctx.stroke();
  // skull face
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.48, r * 0.32, r * 0.35, 0, 0, TAU);
  ctx.fillStyle = "#d0bfa0";
  ctx.fill();
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#1a120c";
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, -r * 0.5, r * 0.07, r * 0.09, 0, 0, TAU);
  ctx.ellipse(r * 0.12, -r * 0.5, r * 0.07, r * 0.09, 0, 0, TAU);
  ctx.fill();
  // wide hat
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.78, r * 0.65, r * 0.16, 0, 0, TAU);
  ctx.fillStyle = "#2b231b";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.8);
  ctx.quadraticCurveTo(0, -r * 1.15, r * 0.35, -r * 0.8);
  ctx.closePath();
  ctx.fill();
  // lantern
  ctx.fillStyle = "#e0a24e";
  ctx.beginPath();
  ctx.arc(-r * 0.7, r * 0.1, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawCuratorBoss(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  const r = e.r;
  ctx.save();
  ctx.translate(e.x, e.y + Math.sin(time * 2.5) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.8, r * 1.0, r * 0.28, 0, 0, TAU);
  ctx.fill();
  // little arms
  ctx.strokeStyle = "#5b4a36";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = -2.5 + i * 0.65;
    const length = r * (0.9 + (i % 2) * 0.2);
    const sway = Math.sin(time * 2 + i) * 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45);
    ctx.quadraticCurveTo(Math.cos(a) * length * 0.9 + sway, Math.sin(a) * length * 0.8, Math.cos(a) * length, Math.sin(a) * length);
    ctx.stroke();
    ctx.fillStyle = i % 2 === 0 ? "#d8a65b" : "#c7b795";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * length, Math.sin(a) * length, 2.4, 0, TAU);
    ctx.fill();
  }
  // sack body
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r * 0.78, 0.04, 0, TAU);
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 3, 0, 0, r);
  grad.addColorStop(0, "#8a7355");
  grad.addColorStop(1, "#4b3a29");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#17110c";
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // stitches
  ctx.strokeStyle = "rgba(230,205,170,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.4, r * 0.5, -r * 0.1);
  ctx.stroke();
  ctx.setLineDash([]);
  // big eye
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.35, r * 0.31, r * 0.23, 0, 0, TAU);
  ctx.fillStyle = "#e6d8bd";
  ctx.fill();
  ctx.strokeStyle = "#241710";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#1c1310";
  ctx.beginPath();
  ctx.arc(Math.sin(time * 0.8) * 3, -r * 0.35, r * 0.1, 0, TAU);
  ctx.fill();
  // keyhole mouth
  ctx.fillStyle = "#1b120d";
  ctx.beginPath();
  ctx.arc(0, r * 0.06, 4.5, 0, TAU);
  ctx.fill();
  ctx.fillRect(-1.5, r * 0.06, 3, 9);
  ctx.strokeStyle = "#c7b795";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, r * 0.06, 6.5, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function envelopeBossAura(ctx: CanvasRenderingContext2D, e: Enemy, time: number): void {
  if (!e.phase2) return;
  ctx.save();
  ctx.globalAlpha = 0.2 + Math.sin(time * 3) * 0.06;
  ctx.strokeStyle = "#c24a33";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r + 12, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Tears / projectiles / fx
// ---------------------------------------------------------------------------

export function drawTear(ctx: CanvasRenderingContext2D, tear: Tear): void {
  ctx.save();
  ctx.translate(tear.x, tear.y);
  const ang = Math.atan2(tear.vy, tear.vx);
  ctx.rotate(ang);
  const s = tear.r * (tear.crit ? 1.5 : 1);
  ctx.beginPath();
  ctx.moveTo(s * 1.9, 0);
  ctx.bezierCurveTo(s * 0.9, -s * 0.9, -s * 0.95, -s * 0.9, -s * 1.4, 0);
  ctx.bezierCurveTo(-s * 0.95, s * 0.9, s * 0.9, s * 0.9, s * 1.9, 0);
  ctx.closePath();
  ctx.fillStyle = tear.poison ? "#5a7040" : tear.explosive ? "#3a2c22" : tear.crit ? "#3a2320" : PAL.tear;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(210,222,210,0.35)";
  ctx.beginPath();
  ctx.ellipse(s * 0.35, -s * 0.3, s * 0.24, s * 0.14, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawShot(ctx: CanvasRenderingContext2D, shot: Shot): void {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(shot.angle);
  if (shot.kind === "needle") {
    ctx.strokeStyle = "#d7c8ac";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.fillStyle = "rgba(194,74,51,0.6)";
    ctx.beginPath();
    ctx.arc(-6, 0, 1.4, 0, TAU);
    ctx.fill();
  } else if (shot.kind === "thread") {
    ctx.strokeStyle = "#c24a33";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(0, -4, 7, 0);
    ctx.stroke();
  } else if (shot.kind === "ink") {
    ctx.fillStyle = "#221b17";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(220,210,190,0.25)";
    ctx.beginPath();
    ctx.arc(-1.5, -1, 1.2, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = "#d7b173";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.4, 4.2, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,200,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,244,208,0.55)";
    ctx.beginPath();
    ctx.arc(2, -1.5, 1.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBomb(ctx: CanvasRenderingContext2D, bomb: Bomb, time: number): void {
  const pulse = 1 + Math.sin(time * 10) * 0.06;
  ctx.save();
  ctx.translate(bomb.x, bomb.y);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 11, 3.5, 0, 0, TAU);
  ctx.fill();
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.arc(0, 1, 10, 0, TAU);
  ctx.fillStyle = "#292420";
  ctx.fill();
  ctx.strokeStyle = "#0d0a08";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "#b59a6e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(4, -8);
  ctx.quadraticCurveTo(10, -13, 11, -9);
  ctx.stroke();
  ctx.fillStyle = "#e0a24e";
  ctx.beginPath();
  ctx.arc(11, -9.5, 2.4 + Math.sin(time * 20) * 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(234,223,200,0.4)";
  ctx.beginPath();
  ctx.arc(-3, -2, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawOrbital(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 4) * 0.2);
  ctx.fillStyle = "rgba(201,162,100,0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#b99256";
  ctx.beginPath();
  ctx.moveTo(-6, 5);
  ctx.bezierCurveTo(-5, 0, -4, -5, 0, -7);
  ctx.bezierCurveTo(4, -5, 5, 0, 6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2c2014";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#e0bf85";
  ctx.beginPath();
  ctx.arc(0, -8, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Pickups / props
// ---------------------------------------------------------------------------

export function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, time: number, floorTint = "#c9b28b"): void {
  const bob = Math.sin(time * 3 + p.id) * 3;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.kind === "trapdoor") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 2, 36, 13, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 12, 0, 0, TAU);
    ctx.fillStyle = "#1b1410";
    ctx.fill();
    ctx.strokeStyle = "#5b4832";
    ctx.lineWidth = 3;
    ctx.stroke();
    // planks
    ctx.strokeStyle = "rgba(107,86,58,0.7)";
    ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 11, -8);
      ctx.lineTo(i * 11, 8);
      ctx.stroke();
    }
    ctx.strokeStyle = "#b8402f";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0.4, 2.8);
    ctx.stroke();
    ctx.fillStyle = "#d8b071";
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(216,166,91,0.15)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 18, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (p.kind === "item") {
    const glow = ctx.createRadialGradient(0, -8 + bob, 3, 0, -8 + bob, 42);
    glow.addColorStop(0, "rgba(216,166,91,0.22)");
    glow.addColorStop(1, "rgba(216,166,91,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -8 + bob, 42, 0, TAU);
    ctx.fill();
    // pedestal / small stone table
    ctx.beginPath();
    ctx.moveTo(-18, 16);
    ctx.lineTo(-12, -2);
    ctx.lineTo(12, -2);
    ctx.lineTo(18, 16);
    ctx.closePath();
    const stone = ctx.createLinearGradient(-18, -2, 18, 16);
    stone.addColorStop(0, "#6b6250");
    stone.addColorStop(1, "#413a2e");
    ctx.fillStyle = stone;
    ctx.fill();
    ctx.strokeStyle = "#18140f";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#3b352c";
    ctx.fillRect(-20, 13, 40, 6);
    ctx.strokeRect(-20, 13, 40, 6);
    ctx.strokeStyle = "rgba(234,223,200,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-11, 1);
    ctx.lineTo(-15, 12);
    ctx.stroke();
    // relic card hovering above the pedestal
    const cardX = -18;
    const cardY = -32 + bob;
    ctx.save();
    ctx.translate(cardX + 18, cardY + 18);
    ctx.rotate(Math.sin(time * 1.1 + p.id) * 0.018);
    ctx.translate(-18, -18);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(1, 2, 36, 36);
    drawItemGlyph(ctx, p.itemId ?? "split-thread", 1, 1, 34, false);
    ctx.strokeStyle = "rgba(216,166,91,0.55)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.5, 0.5, 35, 35);
    ctx.strokeStyle = "rgba(234,223,200,0.18)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(3, 3, 30, 30);
    ctx.fillStyle = "#d8a65b";
    for (const [cx, cy] of [[5, 5], [31, 5], [5, 31], [31, 31]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    if (p.sold) {
      ctx.fillStyle = "rgba(20,15,12,0.55)";
      ctx.fillRect(-18, -26, 36, 34);
      ctx.fillStyle = "rgba(234,223,200,0.55)";
      ctx.font = "700 9px Alegreya, serif";
      ctx.textAlign = "center";
      ctx.fillText(p.special === "library" ? "SILENT" : "TAKEN", 0, 2);
    }
    ctx.restore();
    return;
  }

  // small pickups
  const pulse = 1 + Math.sin(time * 4 + p.id) * 0.04;
  if (p.price !== undefined && !p.sold) {
    // shop tray
    ctx.save();
    ctx.translate(0, 17);
    ctx.fillStyle = "#3f3122";
    roundRect(ctx, -20, -4, 40, 8, 3);
    ctx.fill();
    ctx.strokeStyle = "#17110c";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "#2d2318";
    ctx.fillRect(-14, 4, 3, 10);
    ctx.fillRect(11, 4, 3, 10);
    ctx.fillStyle = "rgba(216,166,91,0.3)";
    ctx.fillRect(-18, -3, 36, 1);
    ctx.restore();
  }
  ctx.translate(0, bob * 0.6);
  if (p.kind === "coin") {
    const pile = (p.value ?? 1) > 1;
    const count = pile ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const cx = pile ? (i - 1) * 7 : 0;
      const cy = pile ? (i === 1 ? -5 : 2) : 0;
      drawCoinIcon(ctx, cx, cy, pile ? 17 : 19);
    }
  } else if (p.kind === "bomb") {
    drawBombIcon(ctx, 0, 0, 24);
  } else if (p.kind === "key") {
    drawKeyIcon(ctx, 0, 0, 24);
  } else if (p.kind === "heart" || p.kind === "halfheart") {
    drawHeartIcon(ctx, 0, -2, 21, p.kind === "heart" ? "full" : "half");
  }
  ctx.restore();
}

export function drawPriceTag(ctx: CanvasRenderingContext2D, price: number, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(16,12,9,0.9)";
  roundRect(ctx, -16, -8, 30, 15, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(216,166,91,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  drawCoinIcon(ctx, -7, 0, 12);
  ctx.fillStyle = "#e5c489";
  ctx.font = "700 10px Alegreya, serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(String(price), 12, 0.5);
  ctx.restore();
}

export function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, time: number): void {
  ctx.save();
  if (o.kind === "spike") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, o.w * 0.42, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#39322a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, o.w * 0.38, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#17110d";
    ctx.lineWidth = 1.1;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const x = o.x + 10 + i * 15;
      const h = 18 + (i % 2) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 3.6, o.y + o.h - 10);
      ctx.lineTo(x + 1.2, o.y + o.h - 10 - h);
      ctx.lineTo(x + 3.6, o.y + o.h - 10);
      ctx.closePath();
      const g = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
      g.addColorStop(0, "#5f5547");
      g.addColorStop(0.45, "#a39278");
      g.addColorStop(1, "#3f372e");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "#1c1712";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(194,74,51,0.35)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 1, o.y + o.h - 16);
      ctx.lineTo(x + 1, o.y + o.h - 24);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (o.kind === "urn") {
    ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
    ctx.beginPath();
    ctx.moveTo(-7, -o.h / 2 + 4);
    ctx.quadraticCurveTo(-14, 0, -7, o.h / 2 - 2);
    ctx.quadraticCurveTo(0, o.h / 2 + 4, 7, o.h / 2 - 2);
    ctx.quadraticCurveTo(14, 0, 7, -o.h / 2 + 4);
    ctx.closePath();
    ctx.fillStyle = "#584737";
    ctx.fill();
    ctx.strokeStyle = "#1b1410";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(216,166,91,0.3)";
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(7, -6);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (o.kind === "web") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(214,214,190,0.34)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + Math.sin(o.seed + i) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * o.w * 0.52, Math.sin(a) * o.h * 0.52);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(214,214,190,0.2)";
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, o.w * 0.16 * ring, o.h * 0.15 * ring, 0.1, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(230,224,200,0.55)";
    ctx.beginPath();
    ctx.arc(3, -2, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (o.kind === "brazier") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const flick = Math.sin(time * 11 + o.seed) * 3 + Math.sin(time * 23 + o.seed * 0.4) * 1.4;
    ctx.translate(cx, cy);
    const glow = ctx.createRadialGradient(0, -14, 3, 0, -14, 58);
    glow.addColorStop(0, "rgba(232,150,80,0.32)");
    glow.addColorStop(1, "rgba(232,150,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -14, 58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2b251f";
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.lineTo(-10, -4);
    ctx.lineTo(10, -4);
    ctx.lineTo(16, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#120d0a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#e0a24e";
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.quadraticCurveTo(10 + flick, -16, 1, -30 - flick * 0.3);
    ctx.quadraticCurveTo(-9 + flick * 0.6, -15, 0, -3);
    ctx.fill();
    ctx.fillStyle = "#f5dfa4";
    ctx.beginPath();
    ctx.ellipse(0.5, -16, 2.4, 7, 0.1, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = time * 1.7 + i * 2.1 + o.seed;
      ctx.fillStyle = "rgba(240,190,110,0.65)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 14, -26 + Math.sin(a * 1.3) * 9, 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (o.kind === "cage") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    ctx.translate(cx, cy);
    ctx.strokeStyle = "#191410";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -o.h / 2);
    ctx.lineTo(0, -o.h / 2 + 8);
    ctx.stroke();
    ctx.fillStyle = "#27211a";
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w * 0.4, o.h * 0.46, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#a58e68";
    ctx.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 5, -o.h * 0.42);
      ctx.quadraticCurveTo(i * 5.6, 0, i * 5, o.h * 0.42);
      ctx.stroke();
    }
    ctx.strokeStyle = "#0d0907";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w * 0.4, o.h * 0.46, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(216,203,173,0.6)";
    ctx.beginPath();
    ctx.ellipse(0, 3, 3.4, 2.6, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(20,14,10,0.8)";
    ctx.beginPath();
    ctx.arc(-1, 3, 0.8, 0, TAU);
    ctx.arc(1.5, 3, 0.8, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (o.kind === "grave") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    ctx.translate(cx, cy + 2);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, o.h * 0.3, o.w * 0.4, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#5d5649";
    ctx.beginPath();
    ctx.moveTo(-o.w * 0.3, o.h * 0.35);
    ctx.lineTo(-o.w * 0.32, -o.h * 0.15);
    ctx.quadraticCurveTo(-o.w * 0.25, -o.h * 0.44, 0, -o.h * 0.44);
    ctx.quadraticCurveTo(o.w * 0.25, -o.h * 0.44, o.w * 0.32, -o.h * 0.15);
    ctx.lineTo(o.w * 0.3, o.h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#17110d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(218,204,174,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -o.h * 0.24);
    ctx.lineTo(6, -o.h * 0.24);
    ctx.moveTo(0, -o.h * 0.32);
    ctx.lineTo(0, -o.h * 0.05);
    ctx.stroke();
    ctx.fillStyle = "rgba(104,115,76,0.35)";
    ctx.beginPath();
    ctx.ellipse(-o.w * 0.1, o.h * 0.2, 7, 3, 0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (o.kind === "pit") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const grad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, o.w * 0.6);
    grad.addColorStop(0, "#050403");
    grad.addColorStop(0.7, "#0d0a08");
    grad.addColorStop(0.92, "#2f2920");
    grad.addColorStop(1, "#4d4437");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, o.w * 0.52, o.h * 0.44, 0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#17110d";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(194,74,51,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, o.w * 0.2, 4, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(216,203,173,0.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - o.w * 0.44, cy - o.h * 0.2);
    ctx.lineTo(cx - o.w * 0.32, cy - o.h * 0.32);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (o.kind === "nest") {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const pulse = 1 + Math.sin(time * 2.6 + o.seed) * 0.04;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + o.seed;
      ctx.strokeStyle = i % 2 ? "#5b4430" : "#3a2b1e";
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      ctx.quadraticCurveTo(Math.cos(a + 0.5) * 18, Math.sin(a + 0.5) * 14, Math.cos(a) * 27, Math.sin(a) * 21);
      ctx.stroke();
    }
    ctx.fillStyle = "#231a12";
    ctx.beginPath();
    ctx.ellipse(0, 2, 18, 13, 0.1, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = o.seed * 0.01 + i * 2.2;
      ctx.fillStyle = i % 2 ? "#c9b28b" : "#8a7658";
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 6 + 1, 4.2, 5.4, a, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(194,74,51,0.85)";
    ctx.beginPath();
    ctx.arc(0, -1, 1.8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.25 + Math.sin(time * 3 + o.seed) * 0.1;
    ctx.fillStyle = "#b8402e";
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  // rocks and pillars share a wobbly ink silhouette
  const seed = o.seed;
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const rx = o.w * 0.48;
  const ry = o.h * 0.46;
  ctx.translate(cx, cy + 2);
  // footprint shadow
  const sh = ctx.createRadialGradient(0, ry * 0.75, 2, 0, ry * 0.75, rx);
  sh.addColorStop(0, "rgba(0,0,0,0.5)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(0, ry * 0.7, rx * 1.02, ry * 0.35, 0, 0, TAU);
  ctx.fill();

  const buildRock = (
    scaleX: number,
    scaleY: number,
    offsetY: number,
    fill: string | CanvasGradient,
  ) => {
    const pts: [number, number][] = [];
    const corners = o.kind === "pillar" ? 6 : 10;
    for (let i = 0; i < corners; i++) {
      const a = (i / corners) * TAU - 0.55;
      const wob = 0.76 + ((Math.sin(seed + i * 2.7) + 1) / 2) * 0.28;
      pts.push([Math.cos(a) * rx * wob * scaleX, Math.sin(a) * ry * wob * scaleY + offsetY]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      ctx.quadraticCurveTo(p0[0] * 1.02, p0[1] * 1.02, mx, my);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "#15100c";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  if (o.kind === "rock") {
    buildRock(1.08, 0.82, 6, "#342d24");
  }
  const grad = ctx.createLinearGradient(-rx, -ry, rx, ry);
  grad.addColorStop(0, o.kind === "pillar" ? "#5b5345" : "#575043");
  grad.addColorStop(0.5, o.kind === "pillar" ? "#463f34" : "#463f33");
  grad.addColorStop(1, "#2c261f");
  buildRock(1, 1, 0, grad);

  // beveled highlight
  ctx.strokeStyle = "rgba(216,200,166,0.24)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.52, -ry * 0.45);
  ctx.quadraticCurveTo(-rx * 0.2, -ry * 0.78, rx * 0.22, -ry * 0.6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(-rx * 0.4, ry * 0.25);
  ctx.quadraticCurveTo(0, ry * 0.6, rx * 0.5, ry * 0.2);
  ctx.stroke();

  // cracks
  ctx.strokeStyle = "rgba(18,13,10,0.65)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.38, -ry * 0.28);
  ctx.lineTo(-rx * 0.15, -ry * 0.05);
  ctx.lineTo(-rx * 0.28, ry * 0.2);
  ctx.moveTo(rx * 0.18, -ry * 0.4);
  ctx.lineTo(rx * 0.34, -ry * 0.12);
  ctx.stroke();

  // moss and bone flecks
  ctx.fillStyle = "rgba(106,115,80,0.4)";
  ctx.beginPath();
  ctx.ellipse(-rx * 0.36, -ry * 0.34, 5, 2.4, 0.2, 0, TAU);
  ctx.ellipse(rx * 0.3, ry * 0.25, 3.4, 1.8, -0.3, 0, TAU);
  ctx.fill();
  if (seed % 3 === 0) {
    ctx.fillStyle = "rgba(201,178,139,0.55)";
    ctx.beginPath();
    ctx.arc(rx * 0.26, -ry * 0.32, 1.4, 0, TAU);
    ctx.arc(rx * 0.34, -ry * 0.2, 1.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCandle(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seed = 1): void {
  ctx.save();
  ctx.translate(x, y);
  const flick = Math.sin(time * 9 + seed) * 1.4 + Math.sin(time * 23 + seed * 2) * 0.7;
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#e8b36c";
  ctx.beginPath();
  ctx.arc(0, -12, 18, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#c9b28b";
  ctx.fillRect(-2.2, -6, 4.4, 10);
  ctx.fillStyle = "#f0d7a0";
  ctx.beginPath();
  ctx.ellipse(0, -15 + flick * 0.2, 2.6, 5.5, flick * 0.04, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e0a24e";
  ctx.beginPath();
  ctx.ellipse(0, -14, 1.3, 3.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seed = 0): void {
  ctx.save();
  ctx.translate(x, y);
  const flick = Math.sin(time * 12 + seed * 7) * 2.2 + Math.sin(time * 27 + seed) * 1;
  // bracket
  ctx.strokeStyle = "#1b1410";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(0, -14);
  ctx.moveTo(-5, 2);
  ctx.lineTo(5, 2);
  ctx.stroke();
  ctx.fillStyle = "#3a2c1f";
  ctx.fillRect(-4, -22, 8, 10);
  // glow
  const glow = ctx.createRadialGradient(0, -26, 2, 0, -26, 50);
  glow.addColorStop(0, "rgba(232,179,108,0.35)");
  glow.addColorStop(1, "rgba(232,179,108,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, -26, 50, 0, TAU);
  ctx.fill();
  // flame
  ctx.fillStyle = "#e0a24e";
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(9 + flick, -27, 1, -38);
  ctx.quadraticCurveTo(-8 + flick, -30, 0, -20);
  ctx.fill();
  ctx.fillStyle = "#f5dfa4";
  ctx.beginPath();
  ctx.ellipse(0.5, -28, 2.2, 6, 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawPedestalMark(ctx: CanvasRenderingContext2D, x: number, y: number, color = PAL.thread): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 22 + Math.sin(Date.now() / 500) * 1.5, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawBossBarFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(8,6,5,0.82)";
  roundRect(ctx, x, y, w, h, 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(234,223,200,0.22)";
  ctx.stroke();
  ctx.restore();
}

export { drawItemGlyph, ITEM_BY_ID };
