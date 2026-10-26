import type { Player } from "./types";
import { TAU } from "./types";

export type ItemKind = "relic" | "active" | "trinket";

export type ActiveEffect =
  | { type: "blast"; radius: number; damage: number }
  | { type: "heal"; amount: number }
  | { type: "freeze"; duration: number }
  | { type: "volley"; count: number }
  | { type: "reveal" }
  | { type: "shield"; duration: number }
  | { type: "blink" }
  | { type: "coins"; amount: number }
  | { type: "reroll" }
  | { type: "rain"; count: number }
  | { type: "magnet"; radius: number }
  | { type: "bombs"; count: number }
  | { type: "warcry"; radius: number; damage: number }
  | { type: "root"; duration: number; damage: number }
  | { type: "dash"; distance: number };

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  kind?: ItemKind;
  tags?: string[];
  maxCharges?: number;
  activeEffect?: ActiveEffect;
  apply?: (p: Player) => void;
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}

export const itemKind = (item: ItemDef): ItemKind => item.kind ?? "relic";

const ink = "#16110e";
const bone = "#eadfc8";

function tile(ctx: CanvasRenderingContext2D, s: number, bg: string): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, s - s * 0.12, s, s * 0.12);
  ctx.strokeStyle = "rgba(234,223,200,0.22)";
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, s - ctx.lineWidth, s - ctx.lineWidth);
}

function stitchedHeart(ctx: CanvasRenderingContext2D, s: number, fill: string): void {
  const cx = s / 2;
  const cy = s / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 32, s / 32);
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-13, 1, -11, -10, -4, -10);
  ctx.bezierCurveTo(-1.5, -10, 0, -8, 0, -6);
  ctx.bezierCurveTo(0, -8, 1.5, -10, 4, -10);
  ctx.bezierCurveTo(11, -10, 13, 1, 0, 10);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "rgba(30,15,12,0.86)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,10,8,0.55)";
  ctx.beginPath();
  ctx.moveTo(-2, -5);
  ctx.lineTo(0, 6);
  ctx.moveTo(-8, -2);
  ctx.lineTo(4, 3);
  ctx.stroke();
  ctx.restore();
}

type Motif =
  | "crown"
  | "book"
  | "root"
  | "needle"
  | "candle"
  | "bell"
  | "tooth"
  | "nail"
  | "wing"
  | "bottle"
  | "knot"
  | "bone"
  | "coin"
  | "flame"
  | "mirror"
  | "mask"
  | "eye"
  | "spool"
  | "drop"
  | "button"
  | "dice"
  | "hand"
  | "shell"
  | "star"
  | "halo";

function drawMotif(ctx: CanvasRenderingContext2D, motif: Motif, accent: string): void {
  ctx.fillStyle = accent;
  ctx.strokeStyle = "rgba(20,13,9,0.8)";
  ctx.lineWidth = 1.15;
  ctx.lineCap = "round";
  switch (motif) {
    case "crown":
      ctx.beginPath();
      ctx.moveTo(-11, 6);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(0, -10);
      ctx.lineTo(3, 0);
      ctx.lineTo(8, -7);
      ctx.lineTo(11, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(30,20,12,0.8)";
      ctx.beginPath();
      ctx.arc(-5, 2, 1.1, 0, TAU);
      ctx.arc(0, 2, 1.1, 0, TAU);
      ctx.arc(5, 2, 1.1, 0, TAU);
      ctx.fill();
      break;
    case "book":
      ctx.fillStyle = accent;
      ctx.fillRect(-10, -9, 20, 18);
      ctx.strokeRect(-10, -9, 20, 18);
      ctx.fillStyle = "rgba(30,20,12,0.7)";
      ctx.fillRect(-10, -9, 3.5, 18);
      ctx.strokeStyle = "rgba(30,20,12,0.55)";
      ctx.lineWidth = 0.8;
      for (let i = -5; i <= 5; i += 4) {
        ctx.beginPath();
        ctx.moveTo(-3, i);
        ctx.lineTo(7, i);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(234,223,200,0.45)";
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.quadraticCurveTo(2, -10, 8, -12);
      ctx.stroke();
      break;
    case "root":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.bezierCurveTo(-4, 3, -11, 2, -12, -8);
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(4, 0, 12, -2, 11, -10);
      ctx.moveTo(0, 7);
      ctx.bezierCurveTo(-3, 0, 2, -4, -1, -10);
      ctx.stroke();
      ctx.fillStyle = "rgba(234,223,200,0.5)";
      ctx.beginPath();
      ctx.arc(-11, -9, 1.4, 0, TAU);
      ctx.arc(10, -11, 1.4, 0, TAU);
      ctx.fill();
      break;
    case "needle":
      ctx.strokeStyle = "#e5d8bb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, 11);
      ctx.lineTo(10, -10);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-11, 11);
      ctx.bezierCurveTo(-4, 13, 3, 7, 8, 0);
      ctx.stroke();
      ctx.fillStyle = "#e5d8bb";
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(7, -11);
      ctx.lineTo(11.5, -6.5);
      ctx.closePath();
      ctx.fill();
      break;
    case "candle":
      ctx.fillStyle = "#c9b28b";
      ctx.fillRect(-3, -1, 6, 13);
      ctx.strokeStyle = "rgba(30,20,12,0.7)";
      ctx.strokeRect(-3, -1, 6, 13);
      ctx.fillStyle = "rgba(201,178,139,0.65)";
      ctx.beginPath();
      ctx.ellipse(1.5, 10, 2.5, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(6, -8, 1, -14);
      ctx.quadraticCurveTo(-5, -8, 0, -2);
      ctx.fill();
      ctx.fillStyle = "#f7e1a6";
      ctx.beginPath();
      ctx.ellipse(0.5, -8, 1.2, 2.8, 0.1, 0, TAU);
      ctx.fill();
      break;
    case "bell":
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.bezierCurveTo(-6, 1, -6, -5, 0, -9);
      ctx.bezierCurveTo(6, -5, 6, 1, 8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, -10, 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#3d2d1c";
      ctx.beginPath();
      ctx.arc(0, 9, 2, 0, TAU);
      ctx.fill();
      break;
    case "tooth":
      ctx.beginPath();
      ctx.moveTo(-8, -7);
      ctx.quadraticCurveTo(0, -12, 8, -7);
      ctx.quadraticCurveTo(6, 2, 3, 4);
      ctx.lineTo(2, 11);
      ctx.lineTo(-1, 5);
      ctx.lineTo(-3, 11);
      ctx.lineTo(-5, 4);
      ctx.quadraticCurveTo(-7, 2, -8, -7);
      ctx.closePath();
      ctx.fillStyle = "#d7cab0";
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(80,60,40,0.5)";
      ctx.beginPath();
      ctx.moveTo(-3, -6);
      ctx.lineTo(-1, 1);
      ctx.moveTo(3, -5);
      ctx.lineTo(1, 2);
      ctx.stroke();
      break;
    case "nail":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(7, -8);
      ctx.stroke();
      ctx.fillStyle = "#d7cab0";
      ctx.beginPath();
      ctx.moveTo(9, -10);
      ctx.lineTo(4, -9);
      ctx.lineTo(8, -5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(20,13,9,0.7)";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    case "wing":
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.beginPath();
        ctx.ellipse(7, -3, 9, 5, -0.4, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(30,20,12,0.55)";
        ctx.beginPath();
        ctx.ellipse(9, -4, 2.5, 2, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "#5a4c3a";
      ctx.beginPath();
      ctx.ellipse(0, 2, 2.4, 8, 0, 0, TAU);
      ctx.fill();
      break;
    case "bottle":
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(4, -12);
      ctx.lineTo(4, -4);
      ctx.quadraticCurveTo(9, 0, 8, 7);
      ctx.quadraticCurveTo(3, 12, -8, 7);
      ctx.quadraticCurveTo(-9, 0, -4, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(30,20,12,0.5)";
      ctx.beginPath();
      ctx.ellipse(0, 6, 5, 3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#c9b28b";
      ctx.fillRect(-3.5, -14, 7, 3);
      break;
    case "knot":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-11, 8);
      ctx.bezierCurveTo(-8, -2, 1, -11, 8, -5);
      ctx.bezierCurveTo(14, 0, 2, 9, -3, 4);
      ctx.bezierCurveTo(-9, -1, -2, -9, 5, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7, 9, 3, 0, TAU);
      ctx.stroke();
      break;
    case "bone":
      ctx.strokeStyle = "#d7cab0";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(8, -4);
      ctx.stroke();
      ctx.fillStyle = "#d7cab0";
      for (const [x, y] of [
        [-9, 2],
        [-7, 6],
        [9, -6],
        [7, -2],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, TAU);
        ctx.fill();
      }
      break;
    case "coin":
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(30,20,12,0.8)";
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,235,190,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 7, -2.6, -0.6);
      ctx.stroke();
      break;
    case "flame":
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.bezierCurveTo(-10, 4, -5, -2, -2, -7);
      ctx.quadraticCurveTo(-1, -1, 3, -4);
      ctx.quadraticCurveTo(7, -9, 4, -14);
      ctx.quadraticCurveTo(14, -6, 7, 4);
      ctx.quadraticCurveTo(4, 10, 0, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f7e1a6";
      ctx.beginPath();
      ctx.ellipse(1, 2, 2.2, 5, 0.2, 0, TAU);
      ctx.fill();
      break;
    case "mirror":
      ctx.beginPath();
      ctx.ellipse(0, -1, 8, 11, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,235,210,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -1, 5.5, -2.5, -0.7);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(-2, 9, 4, 5);
      break;
    case "mask":
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 11, 0, 0, TAU);
      ctx.fillStyle = "#d7cab0";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(20,13,9,0.85)";
      ctx.beginPath();
      ctx.ellipse(-3.5, -3, 2.2, 3, 0, 0, TAU);
      ctx.ellipse(3.5, -3, 2.2, 3, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,13,9,0.7)";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-4, 5);
      ctx.lineTo(4, 5);
      ctx.stroke();
      for (let i = -3; i <= 3; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i, 3.5);
        ctx.lineTo(i, 6.5);
        ctx.stroke();
      }
      break;
    case "eye":
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 6, 0, 0, TAU);
      ctx.fillStyle = "#d7cab0";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#120d0a";
      ctx.beginPath();
      ctx.arc(0, 0, 1.7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(20,13,9,0.7)";
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(-7, 0);
      ctx.moveTo(7, 0);
      ctx.lineTo(11, 0);
      ctx.stroke();
      break;
    case "spool":
      ctx.fillStyle = "#6f4b32";
      ctx.fillRect(-7, -10, 14, 20);
      ctx.fillStyle = accent;
      for (let y = -8; y < 9; y += 3.5) {
        ctx.fillRect(-7, y, 14, 2);
      }
      ctx.strokeStyle = "rgba(20,13,9,0.8)";
      ctx.strokeRect(-7, -10, 14, 20);
      ctx.beginPath();
      ctx.moveTo(7, 5);
      ctx.bezierCurveTo(13, 8, 8, 13, 3, 10);
      ctx.stroke();
      break;
    case "drop":
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.bezierCurveTo(8, -2, 9, 4, 0, 10);
      ctx.bezierCurveTo(-9, 4, -8, -2, 0, -12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,240,215,0.45)";
      ctx.beginPath();
      ctx.ellipse(-2, 1, 1.5, 3, 0.3, 0, TAU);
      ctx.fill();
      break;
    case "button":
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(20,13,9,0.8)";
      for (const [x, y] of [
        [-3, -3],
        [3, -3],
        [-3, 3],
        [3, 3],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(20,13,9,0.5)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -3);
      ctx.lineTo(3, 3);
      ctx.moveTo(3, -3);
      ctx.lineTo(-3, 3);
      ctx.stroke();
      break;
    case "dice":
      ctx.fillStyle = "#d7cab0";
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.fillStyle = "rgba(20,13,9,0.85)";
      for (const [x, y] of [
        [-4, -4],
        [4, -4],
        [0, 0],
        [-4, 4],
        [4, 4],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, TAU);
        ctx.fill();
      }
      break;
    case "hand":
      ctx.fillStyle = "#d7cab0";
      ctx.beginPath();
      ctx.ellipse(0, 4, 7, 8, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(i * 3, -4, 1.7, 5.5, i * 0.08, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(5, 4);
      ctx.stroke();
      break;
    case "shell":
      ctx.beginPath();
      ctx.arc(0, 2, 10, Math.PI, TAU);
      ctx.lineTo(10, 5);
      ctx.quadraticCurveTo(0, 11, -10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(20,13,9,0.6)";
      ctx.lineWidth = 0.8;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 2, i * 2.6, Math.PI, TAU);
        ctx.stroke();
      }
      break;
    case "star":
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const r = i % 2 === 0 ? 11 : 4.5;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "halo":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -4, 9, 4, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(216,166,91,0.55)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 11, -4 + Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * 14, -4 + Math.sin(a) * 7);
        ctx.stroke();
      }
      break;
  }
}

function motifIcon(
  bg: string,
  accent: string,
  motif: Motif,
  kind: ItemKind = "relic",
): (ctx: CanvasRenderingContext2D, size: number) => void {
  return (ctx, s) => {
    tile(ctx, s, bg);
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.scale(s / 32, s / 32);
    drawMotif(ctx, motif, accent);
    ctx.restore();
    if (kind === "active") {
      ctx.strokeStyle = "rgba(216,166,91,0.8)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2.5, 2.5, s - 5, s - 5);
      ctx.strokeStyle = "rgba(234,223,200,0.2)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(4.5, 4.5, s - 9, s - 9);
    } else if (kind === "trinket") {
      ctx.strokeStyle = "rgba(126,166,160,0.75)";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(2.5, 2.5, s - 5, s - 5);
    }
  };
}


export const ITEMS: ItemDef[] = [
  {
    id: "split-thread",
    name: "Split Thread",
    desc: "+1 tear · each tear falls softer",
    color: "#c24a33",
    apply: (p) => {
      p.stats.shots += 1;
      p.stats.damage *= 0.84;
      p.stats.spread += 0.05;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#2a1a15");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.strokeStyle = "#d96345";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.bezierCurveTo(side * 2, 2, side * 9, 0, side * 12, -8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(side * 12, -9, 2.2, 0, TAU);
        ctx.fillStyle = "#e6b48e";
        ctx.fill();
      }
      ctx.fillStyle = "#8f3028";
      ctx.beginPath();
      ctx.arc(0, 10, 2.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "heavy-pebble",
    name: "Heavy Pebble",
    desc: "+2.4 damage · slower weeping",
    color: "#8d8677",
    apply: (p) => {
      p.stats.damage += 2.4;
      p.stats.fireDelay *= 1.12;
      p.stats.tearSize += 0.16;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#25221e");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.lineTo(-7, -8);
      ctx.lineTo(2, -11);
      ctx.lineTo(10, -4);
      ctx.lineTo(8, 7);
      ctx.lineTo(-3, 10);
      ctx.closePath();
      ctx.fillStyle = "#6f695c";
      ctx.fill();
      ctx.strokeStyle = "#17130f";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = "rgba(234,223,200,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -5);
      ctx.lineTo(1, 0);
      ctx.lineTo(-2, 5);
      ctx.moveTo(4, -6);
      ctx.lineTo(3, 3);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "quick-stitch",
    name: "Quick Stitch",
    desc: "+24% weeping speed",
    color: "#e0b26a",
    apply: (p) => {
      p.stats.fireDelay *= 0.76;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#2c2418");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.strokeStyle = bone;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-9, -9);
      ctx.lineTo(9, 9);
      ctx.stroke();
      ctx.fillStyle = "#d8b071";
      ctx.beginPath();
      ctx.arc(9, 9, 2.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#c24a33";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-7, 8);
      ctx.quadraticCurveTo(0, 2, 8, -8);
      ctx.stroke();
      for (let i = -6; i < 8; i += 6) {
        ctx.beginPath();
        ctx.arc(i, -i * 0.6, 1.4, 0, TAU);
        ctx.fillStyle = "#c24a33";
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "long-breath",
    name: "Long Breath",
    desc: "+45% range · faster tears",
    color: "#a8b6a0",
    apply: (p) => {
      p.stats.range += 0.45;
      p.stats.shotSpeed += 55;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#202521");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.strokeStyle = "#cfdcc8";
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-4 + i * 4, 0, 8 - i * 2.5, -1.5, 1.5);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(234,223,200,0.4)";
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.lineTo(-4, 6);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "lucky-marble",
    name: "Lucky Marble",
    desc: "+14% critical chance · crits ×2",
    color: "#7fb0c0",
    apply: (p) => {
      p.stats.crit += 0.14;
      p.stats.critMult = Math.max(p.stats.critMult, 2.1);
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#1d2226");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      const grad = ctx.createRadialGradient(-4, -5, 1, 0, 0, 11);
      grad.addColorStop(0, "#e8f0e2");
      grad.addColorStop(0.4, "#86b8bd");
      grad.addColorStop(1, "#314f58");
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#0f1315";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.arc(-1, -1, 7, -2.6, -1.2);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "needlepoint",
    name: "Needlepoint",
    desc: "Tears pierce one extra body",
    color: "#d9c9a8",
    apply: (p) => {
      p.stats.pierce += 1;
      p.stats.shotSpeed += 30;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#24211c");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.strokeStyle = "#e5d8bb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, 11);
      ctx.lineTo(10, -10);
      ctx.stroke();
      ctx.fillStyle = "#e5d8bb";
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(7, -11.5);
      ctx.lineTo(11.5, -7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#c24a33";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-11, 11);
      ctx.bezierCurveTo(-3, 13, 3, 7, 7, 1);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "soot-bomb",
    name: "Soot Bomb",
    desc: "Tears burst on impact",
    color: "#d8a65b",
    apply: (p) => {
      p.stats.explosive += 1;
      p.stats.tearSize += 0.1;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#211c17");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.beginPath();
      ctx.arc(0, 3, 9, 0, TAU);
      ctx.fillStyle = "#2c2723";
      ctx.fill();
      ctx.strokeStyle = "#0f0c0a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "#a38f72";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(3, -6);
      ctx.quadraticCurveTo(8, -12, 10, -8);
      ctx.stroke();
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.arc(10.5, -8.5, 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(234,223,200,0.4)";
      ctx.beginPath();
      ctx.arc(-3, 0, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "venom-vial",
    name: "Venom Vial",
    desc: "Tears linger as poison",
    color: "#8bab64",
    apply: (p) => {
      p.stats.poison += 1;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#1e241b");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#465c39";
      ctx.beginPath();
      ctx.moveTo(-4, -11);
      ctx.lineTo(4, -11);
      ctx.lineTo(4, -3);
      ctx.quadraticCurveTo(9, 2, 8, 7);
      ctx.quadraticCurveTo(3, 12, -8, 7);
      ctx.quadraticCurveTo(-9, 2, -4, -3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#2b3d24";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#8fae61";
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.quadraticCurveTo(0, 1, 6, 4);
      ctx.lineTo(6, 7);
      ctx.quadraticCurveTo(0, 10, -6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c9b28b";
      ctx.fillRect(-3.5, -13, 7, 3);
      ctx.strokeStyle = "rgba(214,240,180,0.6)";
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-1, 4);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "wax-coat",
    name: "Wax Coat",
    desc: "+1 heart · stitched a little tighter",
    color: "#ddbd82",
    apply: (p) => {
      p.maxHp += 2;
      p.hp = Math.min(p.maxHp, p.hp + 2);
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#2a2317");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#d5c39c";
      ctx.beginPath();
      ctx.moveTo(-7, -10);
      ctx.lineTo(7, -10);
      ctx.lineTo(9, 3);
      ctx.quadraticCurveTo(10, 10, 6, 10);
      ctx.quadraticCurveTo(3, 7, 1, 10);
      ctx.quadraticCurveTo(-2, 8, -4, 10);
      ctx.quadraticCurveTo(-8, 10, -8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#3a2f1f";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = "#a48252";
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, 3);
      ctx.moveTo(5, -6);
      ctx.lineTo(-4, 4);
      ctx.stroke();
      ctx.fillStyle = "#b98a46";
      for (const x of [-8, 8]) {
        ctx.beginPath();
        ctx.arc(x, 6, 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    },
  },
  {
    id: "rabbits-foot",
    name: "Rabbit's Foot",
    desc: "+18% speed · a little luck",
    color: "#d8cbb4",
    apply: (p) => {
      p.stats.speed *= 1.18;
      p.stats.fireDelay *= 0.96;
      p.stats.crit += 0.03;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#24211b");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(0.38);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#bfae90";
      ctx.beginPath();
      ctx.moveTo(-4, 11);
      ctx.quadraticCurveTo(-8, 5, -5, -4);
      ctx.quadraticCurveTo(-4, -11, -1, -11);
      ctx.quadraticCurveTo(2, -11, 2, -4);
      ctx.quadraticCurveTo(4, 2, 6, 5);
      ctx.quadraticCurveTo(8, 11, 2, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#403527";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = "#c24a33";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, 7, 5, 0.2, 2.8);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "hollow-bell",
    name: "Hollow Bell",
    desc: "A small bell circles you and bites",
    color: "#c6a264",
    apply: (p) => {
      p.stats.orbitals += 1;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#252019");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#b99256";
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.bezierCurveTo(-6, 2, -6, -4, 0, -8);
      ctx.bezierCurveTo(6, -4, 6, 2, 8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#3c2d1c";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#d7b57e";
      ctx.beginPath();
      ctx.arc(0, -9, 2.2, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 9, 2, 0, TAU);
      ctx.fillStyle = "#806337";
      ctx.fill();
      ctx.strokeStyle = "rgba(40,28,16,0.65)";
      ctx.beginPath();
      ctx.moveTo(-2, 1);
      ctx.lineTo(2, 4);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "second-thread",
    name: "Second Thread",
    desc: "One death undone · revive with a heart",
    color: "#c24a33",
    apply: (p) => {
      p.stats.revives += 1;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#291a16");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#6f4b32";
      ctx.fillRect(-6, -8, 12, 16);
      ctx.fillStyle = "#c24a33";
      for (let y = -7; y < 8; y += 3) {
        ctx.fillRect(-6, y, 12, 2);
      }
      ctx.strokeStyle = "#c24a33";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(6, 3);
      ctx.bezierCurveTo(13, 6, 8, 12, 3, 9);
      ctx.stroke();
      ctx.fillStyle = "#e6b48e";
      ctx.beginPath();
      ctx.arc(3, 9, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "blood-ledger",
    name: "Blood Ledger",
    desc: "+3.2 damage · costs a heart",
    color: "#a84033",
    apply: (p) => {
      p.stats.damage += 3.2;
      p.maxHp = Math.max(2, p.maxHp - 2);
      p.hp = Math.min(p.hp, p.maxHp);
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#241716");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#5f2b26";
      ctx.fillRect(-9, -11, 18, 22);
      ctx.fillStyle = "#8f3028";
      ctx.fillRect(-9, -11, 3, 22);
      ctx.strokeStyle = "#2a1210";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-9, -11, 18, 22);
      ctx.strokeStyle = "rgba(234,223,200,0.5)";
      ctx.beginPath();
      ctx.moveTo(-3, -5);
      ctx.lineTo(5, -5);
      ctx.moveTo(-3, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(-3, 5);
      ctx.lineTo(2, 5);
      ctx.stroke();
      ctx.fillStyle = "#b8402e";
      ctx.beginPath();
      ctx.arc(5, 8, 2.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "twin-sight",
    name: "Twin Sight",
    desc: "+1 tear · they drift apart",
    color: "#a9b8c4",
    apply: (p) => {
      p.stats.shots += 1;
      p.stats.spread += 0.09;
      p.stats.damage *= 0.92;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#1d2224");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      for (const x of [-5, 6]) {
        ctx.fillStyle = "#d8d2be";
        ctx.beginPath();
        ctx.ellipse(x, 0, 5, 3.4, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#243033";
        ctx.beginPath();
        ctx.arc(x, 0, 1.8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#0d1011";
        ctx.beginPath();
        ctx.arc(x, 0, 0.8, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = "#7f3029";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "sticky-wick",
    name: "Sticky Wick",
    desc: "+2 bombs · wider blast",
    color: "#dfb26b",
    apply: (p) => {
      p.stats.bombBonus += 2;
      p.stats.explosionSize += 0.25;
      p.bombs += 2;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#29221a");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.strokeStyle = "#b59a6e";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6, 10);
      ctx.bezierCurveTo(7, 8, -3, -1, 4, -8);
      ctx.stroke();
      ctx.fillStyle = "#e0a24e";
      ctx.beginPath();
      ctx.moveTo(4, -8);
      ctx.quadraticCurveTo(10, -11, 6, -16);
      ctx.quadraticCurveTo(13, -13, 9, -5);
      ctx.quadraticCurveTo(5, 0, 4, -8);
      ctx.fill();
      ctx.fillStyle = "#f2d28b";
      ctx.beginPath();
      ctx.ellipse(7, -10, 1.3, 3, 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#51402d";
      ctx.fillRect(-9, 10, 14, 2.5);
      ctx.restore();
    },
  },
  {
    id: "copper-charm",
    name: "Copper Charm",
    desc: "More coins fall in cleared rooms",
    color: "#cf9e5f",
    apply: (p) => {
      p.stats.coinBonus += 0.35;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#262017");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#b4854d";
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#4c3622";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#2c2016";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#e1b675";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, -2.8, -0.5);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "widows-locket",
    name: "Widow's Locket",
    desc: "Tears lean toward the nearest body",
    color: "#bcb6a7",
    apply: (p) => {
      p.stats.homing += 1;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#211c1c");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.fillStyle = "#9f927a";
      ctx.beginPath();
      ctx.ellipse(0, 3, 8, 9, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#30291f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#d8cbb2";
      ctx.beginPath();
      ctx.ellipse(0, 3, 4.3, 3.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#2a1d18";
      ctx.beginPath();
      ctx.arc(0, 3, 1.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#8f7460";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -7, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.strokeStyle = "#c24a33";
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.quadraticCurveTo(-13, 12, -8, 15);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "salt-circle",
    name: "Salt Circle",
    desc: "Nearby enemies move slower",
    color: "#d9d4c4",
    apply: (p) => {
      p.stats.enemySlow += 0.3;
    },
    draw: (ctx, s) => {
      tile(ctx, s, "#23221d");
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.scale(s / 32, s / 32);
      ctx.strokeStyle = "#d8d3c1";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#cfc8b4";
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const r = 10 + (i % 3) * 0.9;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.1, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = "#c24a33";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(-1, 1, 5.4, 1, 2.7);
      ctx.stroke();
      ctx.restore();
    },
  },
  /* --- expansion relics --- */
  {
    id: "rusted-halo",
    name: "Rusted Halo",
    desc: "+1.3 damage · −6% speed",
    color: "#d8a65b",
    tags: ["wax"],
    apply: (p) => {
      p.stats.damage += 1.3;
      p.stats.speed *= 0.94;
    },
    draw: motifIcon("#241d15", "#d8a65b", "halo"),
  },
  {
    id: "drowned-psalm",
    name: "Drowned Psalm",
    desc: "+25% range · larger tears",
    color: "#7fae9e",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.range += 0.25;
      p.stats.tearSize += 0.15;
    },
    draw: motifIcon("#1b2422", "#7fae9e", "book"),
  },
  {
    id: "rooted-heart",
    name: "Rooted Heart",
    desc: "+1 heart · −8% speed",
    color: "#8fae64",
    tags: ["drowned"],
    apply: (p) => {
      p.maxHp += 2;
      p.hp = Math.min(p.maxHp, p.hp + 2);
      p.stats.speed *= 0.92;
    },
    draw: motifIcon("#1f241a", "#8fae64", "root"),
  },
  {
    id: "bone-needle",
    name: "Bone Needle",
    desc: "+1 pierce · faster tears",
    color: "#d7c8ac",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.pierce += 1;
      p.stats.shotSpeed += 50;
    },
    draw: motifIcon("#26231d", "#d7c8ac", "needle"),
  },
  {
    id: "wax-seal",
    name: "Wax Seal",
    desc: "+0.8 damage · +1 bomb",
    color: "#e0a24e",
    tags: ["wax"],
    apply: (p) => {
      p.stats.damage += 0.8;
      p.bombs = Math.min(99, p.bombs + 1);
    },
    draw: motifIcon("#2a2118", "#e0a24e", "candle"),
  },
  {
    id: "choir-bell",
    name: "Choir Bell",
    desc: "A second bell circles you",
    color: "#d9b06c",
    apply: (p) => {
      p.stats.orbitals += 1;
    },
    draw: motifIcon("#22201b", "#d9b06c", "bell"),
  },
  {
    id: "gilded-tooth",
    name: "Gilded Tooth",
    desc: "+25% coins · +3% crit",
    color: "#d8a65b",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.coinBonus += 0.25;
      p.stats.crit += 0.03;
    },
    draw: motifIcon("#272116", "#d8a65b", "tooth"),
  },
  {
    id: "hollow-nail",
    name: "Hollow Nail",
    desc: "+8% crit · −1 heart",
    color: "#c24a33",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.crit += 0.08;
      p.maxHp = Math.max(2, p.maxHp - 2);
      p.hp = Math.min(p.hp, p.maxHp);
    },
    draw: motifIcon("#241a16", "#c24a33", "nail"),
  },
  {
    id: "moth-dust",
    name: "Moth Dust",
    desc: "+10% speed · +4% crit",
    color: "#cfc3a7",
    apply: (p) => {
      p.stats.speed *= 1.1;
      p.stats.crit += 0.04;
    },
    draw: motifIcon("#24221c", "#cfc3a7", "wing"),
  },
  {
    id: "black-milk",
    name: "Black Milk",
    desc: "+0.9 damage · poison tears",
    color: "#d7c8ac",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.damage += 0.9;
      p.stats.poison += 1;
    },
    draw: motifIcon("#1d1a17", "#d7c8ac", "bottle"),
  },
  {
    id: "loose-thread",
    name: "Loose Thread",
    desc: "+16% weeping speed · shorter range",
    color: "#c24a33",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.fireDelay *= 0.84;
      p.stats.range -= 0.08;
    },
    draw: motifIcon("#281a15", "#c24a33", "knot"),
  },
  {
    id: "bone-lattice",
    name: "Bone Lattice",
    desc: "Takes one less half-heart of damage",
    color: "#cfc0a4",
    apply: (p) => {
      p.stats.armor += 1;
    },
    draw: motifIcon("#24211b", "#cfc0a4", "bone"),
  },
  {
    id: "wicker-crown",
    name: "Wicker Crown",
    desc: "+0.5 damage · +6% fire rate · +4% speed",
    color: "#b89a66",
    tags: ["wax"],
    apply: (p) => {
      p.stats.damage += 0.5;
      p.stats.fireDelay *= 0.94;
      p.stats.speed *= 1.04;
    },
    draw: motifIcon("#241e16", "#b89a66", "crown"),
  },
  {
    id: "drowned-coin",
    name: "Drowned Coin",
    desc: "+30% coins · a little luck",
    color: "#8fae9e",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.coinBonus += 0.3;
      p.stats.crit += 0.02;
    },
    draw: motifIcon("#1b2321", "#8fae9e", "coin"),
  },
  {
    id: "sallow-candle",
    name: "Sallow Candle",
    desc: "+0.6 damage · larger tears",
    color: "#e0a24e",
    tags: ["wax"],
    apply: (p) => {
      p.stats.damage += 0.6;
      p.stats.tearSize += 0.22;
    },
    draw: motifIcon("#2a2318", "#e0a24e", "candle"),
  },
  {
    id: "ragged-hymn",
    name: "Ragged Hymn",
    desc: "+1 tear · wider spread · softer",
    color: "#b8ab93",
    apply: (p) => {
      p.stats.shots += 1;
      p.stats.spread += 0.08;
      p.stats.damage *= 0.9;
    },
    draw: motifIcon("#221e1b", "#b8ab93", "mask"),
  },
  {
    id: "nail-crown",
    name: "Nail Crown",
    desc: "+1.5 damage · +5% crit",
    color: "#c24a33",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.damage += 1.5;
      p.stats.crit += 0.05;
    },
    draw: motifIcon("#281a16", "#c24a33", "crown"),
  },
  {
    id: "gilded-mirror",
    name: "Gilded Mirror",
    desc: "Tears bounce off walls · +12% range",
    color: "#d8a65b",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.bounces += 1;
      p.stats.range += 0.12;
    },
    draw: motifIcon("#262016", "#d8a65b", "mirror"),
  },
  /* --- active relics --- */
  {
    id: "ember-flask",
    name: "Ember Flask",
    desc: "Use: burst nearby enemies in flame",
    color: "#e07a3a",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "blast", radius: 118, damage: 55 },
    draw: motifIcon("#2a1a12", "#e07a3a", "flame", "active"),
  },
  {
    id: "marrow-bomb",
    name: "Marrow Bomb",
    desc: "Use: a heavy bone blast around you",
    color: "#d8a65b",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "blast", radius: 155, damage: 90 },
    draw: motifIcon("#241c15", "#d8a65b", "bone", "active"),
  },
  {
    id: "soot-bell",
    name: "Soot Bell",
    desc: "Use: a room-wide ring of soot and force",
    color: "#b89a66",
    kind: "active",
    maxCharges: 4,
    activeEffect: { type: "blast", radius: 340, damage: 28 },
    draw: motifIcon("#211d18", "#b89a66", "bell", "active"),
  },
  {
    id: "wax-candle",
    name: "Wax Candle",
    desc: "Use: mend one heart",
    color: "#e0a24e",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "heal", amount: 2 },
    draw: motifIcon("#2a2117", "#e0a24e", "candle", "active"),
  },
  {
    id: "choir-hymn",
    name: "Choir Hymn",
    desc: "Use: hold every enemy still for four seconds",
    color: "#9eb6ac",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "freeze", duration: 4 },
    draw: motifIcon("#1d2222", "#9eb6ac", "mask", "active"),
  },
  {
    id: "needle-fan",
    name: "Needle Fan",
    desc: "Use: a full ring of needle tears",
    color: "#c24a33",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "volley", count: 12 },
    draw: motifIcon("#261b16", "#c24a33", "needle", "active"),
  },
  {
    id: "root-totem",
    name: "Root Totem",
    desc: "Use: root yourself in safety for four seconds",
    color: "#8fae64",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "shield", duration: 4 },
    draw: motifIcon("#1d221b", "#8fae64", "root", "active"),
  },
  {
    id: "pocket-hatch",
    name: "Pocket Hatch",
    desc: "Use: slip to safety and clear the air",
    color: "#c24a33",
    kind: "active",
    maxCharges: 4,
    activeEffect: { type: "blink" },
    draw: motifIcon("#221c17", "#c24a33", "drop", "active"),
  },
  {
    id: "eye-of-the-house",
    name: "Eye of the House",
    desc: "Use: see the whole floor, including its secrets",
    color: "#d8a65b",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "reveal" },
    draw: motifIcon("#211b16", "#d8a65b", "eye", "active"),
  },
  {
    id: "drowned-purse",
    name: "Drowned Purse",
    desc: "Use: spit up fifteen coins",
    color: "#7fae9e",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "coins", amount: 15 },
    draw: motifIcon("#1b2321", "#7fae9e", "coin", "active"),
  },
  {
    id: "widow-spool",
    name: "Widow's Spool",
    desc: "Use: bind every enemy in thread for five seconds",
    color: "#c24a33",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "freeze", duration: 5 },
    draw: motifIcon("#241b18", "#c24a33", "spool", "active"),
  },
  {
    id: "ledger-page",
    name: "Ledger Page",
    desc: "Use: rewrite the relics currently on offer",
    color: "#d8a65b",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "reroll" },
    draw: motifIcon("#262017", "#d8a65b", "book", "active"),
  },
  /* --- trinkets --- */
  {
    id: "moth-wing",
    name: "Moth Wing",
    desc: "+8% speed",
    color: "#cfc3a7",
    kind: "trinket",
    apply: (p) => {
      p.stats.speed *= 1.08;
    },
    draw: motifIcon("#22201c", "#cfc3a7", "wing", "trinket"),
  },
  {
    id: "copper-pin",
    name: "Copper Pin",
    desc: "+20% coin drops",
    color: "#d8a65b",
    kind: "trinket",
    apply: (p) => {
      p.stats.coinBonus += 0.2;
    },
    draw: motifIcon("#242017", "#d8a65b", "coin", "trinket"),
  },
  {
    id: "salt-packet",
    name: "Salt Packet",
    desc: "Nearby enemies move a little slower",
    color: "#cfc8b4",
    kind: "trinket",
    apply: (p) => {
      p.stats.enemySlow += 0.12;
    },
    draw: motifIcon("#23221d", "#cfc8b4", "bottle", "trinket"),
  },
  {
    id: "rabbit-tooth",
    name: "Rabbit Tooth",
    desc: "+4% critical chance",
    color: "#d7cab0",
    kind: "trinket",
    apply: (p) => {
      p.stats.crit += 0.04;
    },
    draw: motifIcon("#221f1a", "#d7cab0", "tooth", "trinket"),
  },
  {
    id: "choir-button",
    name: "Choir Button",
    desc: "+15% tear range",
    color: "#b8ab93",
    kind: "trinket",
    apply: (p) => {
      p.stats.range += 0.15;
    },
    draw: motifIcon("#23211c", "#b8ab93", "button", "trinket"),
  },
  {
    id: "wax-finger",
    name: "Wax Finger",
    desc: "Wider bomb blasts",
    color: "#e0a24e",
    kind: "trinket",
    apply: (p) => {
      p.stats.explosionSize += 0.15;
    },
    draw: motifIcon("#272117", "#e0a24e", "candle", "trinket"),
  },
  {
    id: "bloody-thimble",
    name: "Bloody Thimble",
    desc: "+0.7 damage",
    color: "#c24a33",
    kind: "trinket",
    apply: (p) => {
      p.stats.damage += 0.7;
    },
    draw: motifIcon("#271a17", "#c24a33", "hand", "trinket"),
  },
  {
    id: "bone-die",
    name: "Bone Die",
    desc: "+3% crit · +10% coins",
    color: "#d7cab0",
    kind: "trinket",
    apply: (p) => {
      p.stats.crit += 0.03;
      p.stats.coinBonus += 0.1;
    },
    draw: motifIcon("#231f1a", "#d7cab0", "dice", "trinket"),
  },
  {
    id: "drowned-shell",
    name: "Drowned Shell",
    desc: "Takes one less half-heart of damage",
    color: "#8fae9e",
    kind: "trinket",
    apply: (p) => {
      p.stats.armor += 1;
    },
    draw: motifIcon("#1c2321", "#8fae9e", "shell", "trinket"),
  },
  {
    id: "red-thread",
    name: "Red Thread",
    desc: "+10% weeping speed · −5% range",
    color: "#c24a33",
    kind: "trinket",
    apply: (p) => {
      p.stats.fireDelay *= 0.9;
      p.stats.range -= 0.05;
    },
    draw: motifIcon("#281a16", "#c24a33", "knot", "trinket"),
  },
  {
    id: "saints-nail",
    name: "Saint's Nail",
    desc: "+1 pierce",
    color: "#d7cab0",
    kind: "trinket",
    apply: (p) => {
      p.stats.pierce += 1;
    },
    draw: motifIcon("#24201a", "#d7cab0", "nail", "trinket"),
  },
  {
    id: "hollow-button",
    name: "Hollow Button",
    desc: "Tears lean toward the nearest body",
    color: "#b8ab93",
    kind: "trinket",
    apply: (p) => {
      p.stats.homing += 0.4;
    },
    draw: motifIcon("#211f1a", "#b8ab93", "button", "trinket"),
  },

  /* --- 3.0 relics: skills of the deeper house --- */
  {
    id: "needle-storm",
    name: "Needle Storm",
    desc: "+2 tears · each one smaller",
    color: "#c24a33",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.shots += 2;
      p.stats.damage *= 0.84;
      p.stats.tearSize = Math.max(0.5, p.stats.tearSize - 0.06);
    },
    draw: motifIcon("#281a16", "#c24a33", "needle"),
  },
  {
    id: "wick-heart",
    name: "Wick Heart",
    desc: "+1 heart · the flame keeps you upright",
    color: "#e0a24e",
    tags: ["wax"],
    apply: (p) => {
      p.maxHp += 2;
      p.hp = Math.min(p.maxHp, p.hp + 2);
    },
    draw: motifIcon("#2a2117", "#e0a24e", "candle"),
  },
  {
    id: "deep-lung",
    name: "Deep Lung",
    desc: "+25% tear range · +1 tear",
    color: "#8fae9e",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.range += 0.25;
      p.stats.shots += 1;
      p.stats.damage *= 0.94;
    },
    draw: motifIcon("#1b2321", "#8fae9e", "drop"),
  },
  {
    id: "copper-web",
    name: "Copper Web",
    desc: "+15% coins · +2% crit",
    color: "#c9a45e",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.coinBonus += 0.15;
      p.stats.crit += 0.02;
    },
    draw: motifIcon("#241e16", "#c9a45e", "knot"),
  },
  {
    id: "grave-wheat",
    name: "Grave Wheat",
    desc: "+1.2 damage · +1 armor",
    color: "#b9a06a",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.damage += 1.2;
      p.stats.armor += 1;
    },
    draw: motifIcon("#252017", "#b9a06a", "root"),
  },
  {
    id: "ember-clock",
    name: "Ember Clock",
    desc: "+28% weeping speed · shorter range",
    color: "#e07a3a",
    tags: ["ash"],
    apply: (p) => {
      p.stats.fireDelay *= 0.72;
      p.stats.range -= 0.06;
    },
    draw: motifIcon("#2a1b13", "#e07a3a", "flame"),
  },
  {
    id: "salt-spine",
    name: "Salt Spine",
    desc: "+1 armor · slightly slower steps",
    color: "#d7cfb8",
    apply: (p) => {
      p.stats.armor += 1;
      p.stats.speed *= 0.94;
    },
    draw: motifIcon("#23211c", "#d7cfb8", "bone"),
  },
  {
    id: "mirror-shard",
    name: "Mirror Shard",
    desc: "Tears bounce · +5% crit",
    color: "#c9c2ad",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.bounces += 1;
      p.stats.crit += 0.05;
    },
    draw: motifIcon("#22201b", "#c9c2ad", "mirror"),
  },
  {
    id: "worm-crown",
    name: "Worm Crown",
    desc: "+1 damage · poison tears",
    color: "#9b8b5f",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.damage += 1;
      p.stats.poison += 1;
    },
    draw: motifIcon("#211f17", "#9b8b5f", "crown"),
  },
  {
    id: "hollow-coin",
    name: "Hollow Coin",
    desc: "+50% coins · it rings when spent",
    color: "#e0c184",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.coinBonus += 0.5;
    },
    draw: motifIcon("#262015", "#e0c184", "coin"),
  },
  {
    id: "weeping-wound",
    name: "Weeping Wound",
    desc: "+2.5 damage · −1 heart",
    color: "#a33a2e",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.damage += 2.5;
      p.maxHp = Math.max(2, p.maxHp - 2);
      p.hp = Math.min(p.hp, p.maxHp);
    },
    draw: motifIcon("#271714", "#a33a2e", "hand"),
  },
  {
    id: "root-lattice",
    name: "Root Lattice",
    desc: "A root orbits you and cuts what it touches",
    color: "#8fae64",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.orbitals += 1;
    },
    draw: motifIcon("#1e221a", "#8fae64", "root"),
  },
  {
    id: "thorn-halo",
    name: "Thorn Halo",
    desc: "Two thorns orbit you · softer tears",
    color: "#b9a06a",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.orbitals += 2;
      p.stats.damage *= 0.92;
    },
    draw: motifIcon("#231c16", "#b9a06a", "halo"),
  },
  {
    id: "ash-veil",
    name: "Ash Veil",
    desc: "Tears burst on contact · larger tears",
    color: "#b7a38a",
    tags: ["ash"],
    apply: (p) => {
      p.stats.explosive += 1;
      p.stats.tearSize += 0.2;
    },
    draw: motifIcon("#25201b", "#b7a38a", "mask"),
  },
  {
    id: "cinder-heart",
    name: "Cinder Heart",
    desc: "+1.2 damage · +5% speed",
    color: "#e07a3a",
    tags: ["ash"],
    apply: (p) => {
      p.stats.damage += 1.2;
      p.stats.speed *= 1.05;
    },
    draw: motifIcon("#2a1b13", "#e07a3a", "flame"),
  },
  {
    id: "burnt-offering",
    name: "Burnt Offering",
    desc: "Much wider explosions · +1 bomb damage",
    color: "#b07a4a",
    tags: ["ash"],
    apply: (p) => {
      p.stats.explosionSize += 0.28;
      p.stats.bombBonus += 1;
    },
    draw: motifIcon("#271d16", "#b07a4a", "bell"),
  },
  {
    id: "hollow-bead",
    name: "Hollow Bead",
    desc: "Tears seek the nearest body · +10% range",
    color: "#b8ab93",
    tags: ["hollow"],
    apply: (p) => {
      p.stats.homing += 0.3;
      p.stats.range += 0.1;
    },
    draw: motifIcon("#211f1a", "#b8ab93", "star"),
  },
  {
    id: "empty-vessel",
    name: "Empty Vessel",
    desc: "+1 tear · +1 pierce · softer",
    color: "#c9c0aa",
    tags: ["hollow"],
    apply: (p) => {
      p.stats.shots += 1;
      p.stats.pierce += 1;
      p.stats.damage *= 0.9;
    },
    draw: motifIcon("#201e1a", "#c9c0aa", "bottle"),
  },
  {
    id: "second-skin",
    name: "Second Skin",
    desc: "+1 heart · +1 armor",
    color: "#cbb99a",
    tags: ["hollow"],
    apply: (p) => {
      p.maxHp += 2;
      p.hp = Math.min(p.maxHp, p.hp + 2);
      p.stats.armor += 1;
    },
    draw: motifIcon("#221f1a", "#cbb99a", "shell"),
  },
  {
    id: "gilded-wick",
    name: "Gilded Wick",
    desc: "+40% coins · +4% crit",
    color: "#e0c184",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.coinBonus += 0.4;
      p.stats.crit += 0.04;
    },
    draw: motifIcon("#262015", "#e0c184", "eye"),
  },
  {
    id: "tally-stick",
    name: "Tally Stick",
    desc: "+20% coins · +3% crit",
    color: "#c9b28b",
    tags: ["gilt"],
    apply: (p) => {
      p.stats.coinBonus += 0.2;
      p.stats.crit += 0.03;
    },
    draw: motifIcon("#242018", "#c9b28b", "nail"),
  },
  {
    id: "drowned-bell",
    name: "Drowned Bell",
    desc: "Nearby enemies slow · +15% range",
    color: "#8fae9e",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.enemySlow += 0.14;
      p.stats.range += 0.15;
    },
    draw: motifIcon("#1b2321", "#8fae9e", "bell"),
  },
  {
    id: "ghost-thread",
    name: "Ghost Thread",
    desc: "Tears hunt · slightly slower",
    color: "#b8c8bc",
    tags: ["drowned"],
    apply: (p) => {
      p.stats.homing += 0.5;
      p.stats.shotSpeed *= 0.92;
    },
    draw: motifIcon("#1d2421", "#b8c8bc", "spool"),
  },
  {
    id: "stitch-mask",
    name: "Stitch Mask",
    desc: "+2 tears · smaller stitches",
    color: "#c9b28b",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.shots += 2;
      p.stats.tearSize = Math.max(0.5, p.stats.tearSize - 0.12);
    },
    draw: motifIcon("#231c18", "#c9b28b", "mask"),
  },
  {
    id: "soot-lung",
    name: "Soot Lung",
    desc: "+20% range · +1.5 damage",
    color: "#8d8677",
    tags: ["ash"],
    apply: (p) => {
      p.stats.range += 0.2;
      p.stats.damage += 1.5;
    },
    draw: motifIcon("#22201c", "#8d8677", "wing"),
  },
  {
    id: "thread-crown",
    name: "Thread Crown",
    desc: "+1 tear · tears follow the thread",
    color: "#c24a33",
    tags: ["stitch"],
    apply: (p) => {
      p.stats.shots += 1;
      p.stats.homing += 0.22;
    },
    draw: motifIcon("#281a16", "#c24a33", "crown"),
  },

  /* --- 3.0 active relics: new skills --- */
  {
    id: "storm-hymn",
    name: "Storm Hymn",
    desc: "Use: a downpour of tears across the room",
    color: "#9eb6ac",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "rain", count: 22 },
    draw: motifIcon("#1d2222", "#9eb6ac", "star", "active"),
  },
  {
    id: "grave-magnet",
    name: "Grave Magnet",
    desc: "Use: pull loose offerings to your feet",
    color: "#d8a65b",
    kind: "active",
    maxCharges: 4,
    activeEffect: { type: "magnet", radius: 360 },
    draw: motifIcon("#231e17", "#d8a65b", "coin", "active"),
  },
  {
    id: "widow-scream",
    name: "Widow's Scream",
    desc: "Use: root the room and poison its blood",
    color: "#c24a33",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "root", duration: 2.6, damage: 10 },
    draw: motifIcon("#251a16", "#c24a33", "mask", "active"),
  },
  {
    id: "marrow-rain",
    name: "Marrow Rain",
    desc: "Use: drop three free bombs around you",
    color: "#d8a65b",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "bombs", count: 3 },
    draw: motifIcon("#241c15", "#d8a65b", "bone", "active"),
  },
  {
    id: "glass-hour",
    name: "Glass Hour",
    desc: "Use: slow the room to a crawl",
    color: "#b8d8dc",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "freeze", duration: 2.4 },
    draw: motifIcon("#1b2223", "#b8d8dc", "mirror", "active"),
  },
  {
    id: "hollow-call",
    name: "Hollow Call",
    desc: "Use: scream, wound the room and shield yourself",
    color: "#d8cbb0",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "warcry", radius: 210, damage: 26 },
    draw: motifIcon("#211f1a", "#d8cbb0", "halo", "active"),
  },
  {
    id: "thread-hook",
    name: "Thread Hook",
    desc: "Use: pull yourself along the thread",
    color: "#c24a33",
    kind: "active",
    maxCharges: 4,
    activeEffect: { type: "dash", distance: 180 },
    draw: motifIcon("#281a16", "#c24a33", "spool", "active"),
  },
  {
    id: "wax-vision",
    name: "Wax Vision",
    desc: "Use: see the whole floor and its secrets",
    color: "#e0a24e",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "reveal" },
    draw: motifIcon("#2a2117", "#e0a24e", "eye", "active"),
  },
  {
    id: "gold-tooth",
    name: "Gold Tooth",
    desc: "Use: bite down and spit up coins",
    color: "#e0c184",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "coins", amount: 12 },
    draw: motifIcon("#262015", "#e0c184", "tooth", "active"),
  },
  {
    id: "ash-bell",
    name: "Ash Bell",
    desc: "Use: a wide, soft ring of ash and heat",
    color: "#b7a38a",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "blast", radius: 205, damage: 44 },
    draw: motifIcon("#25201b", "#b7a38a", "bell", "active"),
  },
  {
    id: "needle-heart",
    name: "Needle Heart",
    desc: "Use: an eighteen-needle carousel",
    color: "#c24a33",
    kind: "active",
    maxCharges: 3,
    activeEffect: { type: "volley", count: 18 },
    draw: motifIcon("#281a16", "#c24a33", "crown", "active"),
  },
  {
    id: "page-of-names",
    name: "Page of Names",
    desc: "Use: rewrite the relics currently on offer",
    color: "#d8a65b",
    kind: "active",
    maxCharges: 2,
    activeEffect: { type: "reroll" },
    draw: motifIcon("#262017", "#d8a65b", "book", "active"),
  },

  /* --- 3.0 trinkets --- */
  {
    id: "sparrow-bone",
    name: "Sparrow Bone",
    desc: "+6% speed",
    color: "#d7cab0",
    kind: "trinket",
    apply: (p) => {
      p.stats.speed *= 1.06;
    },
    draw: motifIcon("#221f1a", "#d7cab0", "bone", "trinket"),
  },
  {
    id: "grave-dirt",
    name: "Grave Dirt",
    desc: "+1 armor",
    color: "#8a7a58",
    kind: "trinket",
    apply: (p) => {
      p.stats.armor += 1;
    },
    draw: motifIcon("#232018", "#8a7a58", "root", "trinket"),
  },
  {
    id: "wax-ear",
    name: "Wax Ear",
    desc: "+10% tear range",
    color: "#e0a24e",
    kind: "trinket",
    apply: (p) => {
      p.stats.range += 0.1;
    },
    draw: motifIcon("#272117", "#e0a24e", "shell", "trinket"),
  },
  {
    id: "hollow-tooth-trinket",
    name: "Hollow Tooth",
    desc: "+4% crit",
    color: "#d8cbb0",
    kind: "trinket",
    apply: (p) => {
      p.stats.crit += 0.04;
    },
    draw: motifIcon("#211f1a", "#d8cbb0", "tooth", "trinket"),
  },
  {
    id: "chapel-nail",
    name: "Chapel Nail",
    desc: "+1 damage",
    color: "#c9b28b",
    kind: "trinket",
    apply: (p) => {
      p.stats.damage += 1;
    },
    draw: motifIcon("#242018", "#c9b28b", "nail", "trinket"),
  },
  {
    id: "bell-clapper",
    name: "Bell Clapper",
    desc: "+8% weeping speed",
    color: "#b89a66",
    kind: "trinket",
    apply: (p) => {
      p.stats.fireDelay *= 0.92;
    },
    draw: motifIcon("#241e16", "#b89a66", "bell", "trinket"),
  },
  {
    id: "glass-eye",
    name: "Glass Eye",
    desc: "Tears bend toward bodies",
    color: "#b8c8bc",
    kind: "trinket",
    apply: (p) => {
      p.stats.homing += 0.25;
    },
    draw: motifIcon("#1d2421", "#b8c8bc", "eye", "trinket"),
  },
  {
    id: "salt-pouch",
    name: "Salt Pouch",
    desc: "+12% explosion size",
    color: "#d7cfb8",
    kind: "trinket",
    apply: (p) => {
      p.stats.explosionSize += 0.12;
    },
    draw: motifIcon("#23211c", "#d7cfb8", "bottle", "trinket"),
  },
  {
    id: "lucky-button",
    name: "Lucky Button",
    desc: "+7% coins",
    color: "#d8a65b",
    kind: "trinket",
    apply: (p) => {
      p.stats.coinBonus += 0.07;
    },
    draw: motifIcon("#242017", "#d8a65b", "button", "trinket"),
  },
  {
    id: "iron-thimble",
    name: "Iron Thimble",
    desc: "+1 pierce",
    color: "#a8a294",
    kind: "trinket",
    apply: (p) => {
      p.stats.pierce += 1;
    },
    draw: motifIcon("#22211d", "#a8a294", "hand", "trinket"),
  },
];

const EXISTING_TAGS: Record<string, string[]> = {
  "split-thread": ["stitch"],
  "quick-stitch": ["stitch"],
  "needlepoint": ["stitch"],
  "twin-sight": ["stitch"],
  "wax-coat": ["wax"],
  "hollow-bell": ["wax"],
  "second-thread": ["wax"],
  "sticky-wick": ["wax"],
  "long-breath": ["drowned"],
  "venom-vial": ["drowned"],
  "salt-circle": ["drowned"],
  "lucky-marble": ["gilt"],
  "rabbits-foot": ["gilt"],
  "copper-charm": ["gilt"],
};
for (const item of ITEMS) {
  if (EXISTING_TAGS[item.id]) item.tags = EXISTING_TAGS[item.id];
}

export const RELICS = ITEMS.filter((item) => itemKind(item) === "relic");
export const ACTIVES = ITEMS.filter((item) => itemKind(item) === "active");
export const TRINKETS = ITEMS.filter((item) => itemKind(item) === "trinket");

export const ITEM_COUNT = ITEMS.length;

export const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function drawItemGlyph(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  x: number,
  y: number,
  size: number,
  background = true,
): void {
  const def = ITEM_BY_ID.get(itemId);
  if (!def) return;
  ctx.save();
  ctx.translate(x, y);
  if (background) {
    ctx.fillStyle = "rgba(12,10,9,0.85)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(234,223,200,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }
  def.draw(ctx, size);
  ctx.restore();
}

export function itemIconCanvas(itemId: string, size: number, dpr = 2): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const def = ITEM_BY_ID.get(itemId);
  if (def) {
    ctx.fillStyle = "rgba(10,8,7,0.7)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(234,223,200,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    def.draw(ctx, size);
  }
  return canvas;
}

export { ink, bone, stitchedHeart };
