import type { Curse, Enemy, FloorData, Player, Room } from "./types";
import { ROOM_H, ROOM_W, ROOM_X, ROOM_Y, TAU, VIEW_H, VIEW_W } from "./types";
import type { Theme } from "./theme";
import { ITEM_BY_ID, drawItemGlyph, itemKind } from "./items";
import {
  drawCoinIcon,
  drawHeartIcon,
  drawBombIcon,
  drawKeyIcon,
  drawSkullIcon,
  PAL,
  roundRect,
  drawBossBarFrame,
  stitchedLine,
} from "./art";
import { formatTime } from "./util";

export interface HudBanner {
  itemId: string;
  name: string;
  desc: string;
  life: number;
  max: number;
}

export interface HudNotice {
  text: string;
  life: number;
  max: number;
  color?: string;
}

export interface HudData {
  player: Player;
  theme: Theme;
  floorIndex: number;
  room: Room;
  floor: FloorData;
  runTime: number;
  seedText: string;
  daily: boolean;
  boss: Enemy | null;
  bossName: string;
  bossQuote: string;
  banner: HudBanner | null;
  notice: HudNotice | null;
  hintLife: number;
  bossIntro: number;
  touch: boolean;
  roomCount: number;
  keysUsed: number;
  activeItem: string | null;
  activeCharges: number;
  activeMax: number;
  skillName: string;
  skillCd: number;
  skillMax: number;
  skillColor: string;
  trinkets: string[];
  transformations: string[];
  curse: Curse | null;
  mapRevealed: boolean;
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 0.55): void {
  ctx.save();
  ctx.fillStyle = `rgba(9,7,6,${alpha})`;
  roundRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(234,223,200,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(194,74,51,0.35)";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 0.5);
  ctx.lineTo(x + w - 8, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

function smallCaps(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 9,
  align: CanvasTextAlign = "left",
): void {
  ctx.save();
  ctx.font = `700 ${size}px Alegreya, Georgia, serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  data: HudData,
  time: number,
): void {
  const p = data.player;
  if (p.dead) {
    drawBossBar(ctx, data, time);
    return;
  }

  // hearts
  const hearts = Math.ceil(p.maxHp / 2);
  const heartSize = 21;
  for (let i = 0; i < hearts; i++) {
    const remaining = p.hp - i * 2;
    const fill = remaining >= 2 ? "full" : remaining >= 1 ? "half" : "empty";
    drawHeartIcon(ctx, 34 + i * 23, 23, heartSize, fill, time);
  }

  // counters
  drawCoinIcon(ctx, 35, 55, 17);
  ctx.font = "700 15px Alegreya, Georgia, serif";
  ctx.fillStyle = PAL.bone;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.coins), 48, 55);
  drawBombIcon(ctx, 100, 54, 17);
  ctx.fillText(String(p.bombs), 113, 55);
  drawKeyIcon(ctx, 158, 54, 16);
  ctx.fillText(String(p.keys), 171, 55);

  // item strip (top centre) — relics only; actives and trinkets have slots
  const passiveItems = p.items.filter((id) => {
    const def = ITEM_BY_ID.get(id);
    return Boolean(def && itemKind(def) === "relic");
  });
  if (passiveItems.length) {
    const shown = passiveItems.slice(-12);
    const iconSize = 23;
    const gap = 3;
    const total = shown.length * (iconSize + gap) - gap;
    let x = VIEW_W / 2 - total / 2;
    for (const itemId of shown) {
      showItemIcon(ctx, itemId, x, 14, iconSize, time);
      x += iconSize + gap;
    }
    if (passiveItems.length > 12) {
      smallCaps(ctx, `+${passiveItems.length - 12}`, x + 6, 27, PAL.gold, 10);
    }
  }

  // floor / timer / seed
  ctx.font = "400 16px 'IM Fell English SC', Georgia, serif";
  ctx.fillStyle = "rgba(234,223,200,0.82)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(data.theme.name, 744, 21);
  smallCaps(ctx, formatTime(data.runTime), 744, 39, "rgba(182,165,137,0.75)", 10);
  smallCaps(
    ctx,
    data.daily ? `SEED ${data.seedText} · DAILY DESCENT` : `SEED ${data.seedText}`,
    258,
    55,
    data.daily ? "rgba(216,166,91,0.75)" : "rgba(182,165,137,0.45)",
    8,
  );

  drawMinimap(ctx, data);
  drawActiveSlot(ctx, data, time);
  if (data.curse) {
    drawCurseChip(ctx, data.curse);
  }
  drawBossBar(ctx, data, time);
  drawBanner(ctx, data, time);
  drawNotice(ctx, data, time);
  drawHint(ctx, data, time);
  drawLowHealth(ctx, p, time);
}

function showItemIcon(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  x: number,
  y: number,
  size: number,
  time: number,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(9,7,6,0.7)";
  ctx.fillRect(x, y, size, size);
  const def = ITEM_BY_ID.get(itemId);
  if (def) {
    ctx.globalAlpha = 0.95;
    drawItemGlyph(ctx, itemId, x, y, size, false);
  } else {
    ctx.fillStyle = PAL.boneDim;
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
  }
  ctx.strokeStyle = `rgba(234,223,200,${0.16 + Math.sin(time * 2 + x) * 0.03})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  ctx.restore();
}

function drawMinimap(ctx: CanvasRenderingContext2D, data: HudData): void {
  const w = 162;
  const h = 88;
  const x = VIEW_W - w - 24 - (data.touch ? 60 : 0);
  // Leave the top-right corner free for the touch pause button.
  const y = data.touch ? 64 : 10;
  panel(ctx, x, y, w, h, 0.7);

  // faint vellum grain
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 3);
  ctx.clip();
  const vellum = ctx.createLinearGradient(x, y, x, y + h);
  vellum.addColorStop(0, "rgba(201,178,139,0.055)");
  vellum.addColorStop(1, "rgba(201,178,139,0.012)");
  ctx.fillStyle = vellum;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(201,178,139,0.06)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 9; i++) {
    const gy = y + 7 + i * 9.2;
    ctx.beginPath();
    ctx.moveTo(x + 8, gy);
    ctx.lineTo(x + w - 8, gy);
    ctx.stroke();
  }
  ctx.restore();

  const cell = 8.1;
  const gap = 1.5;
  const total = 9 * (cell + gap) - gap;
  const ox = x + (w - total) / 2;
  const oy = y + (h - total) / 2 + 1;

  const revealedRooms = data.floor.rooms.filter((room) => {
    if (data.mapRevealed) return true;
    if (room.type === "secret") return room.visited;
    return room.visited || Object.values(room.doors).some((other) => other?.visited);
  });

  // corridors first
  ctx.save();
  ctx.strokeStyle = "rgba(201,178,139,0.22)";
  ctx.lineWidth = 1;
  for (const room of revealedRooms) {
    const rx = ox + room.gx * (cell + gap) + cell / 2;
    const ry = oy + room.gy * (cell + gap) + cell / 2;
    for (const dir of ["e", "s"] as const) {
      const other = room.doors[dir];
      if (!other) continue;
      if (!revealedRooms.includes(other)) continue;
      const tx = ox + other.gx * (cell + gap) + cell / 2;
      const ty = oy + other.gy * (cell + gap) + cell / 2;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const room of data.floor.rooms) {
    const revealed = revealedRooms.includes(room);
    if (!revealed) continue;
    const rx = ox + room.gx * (cell + gap);
    const ry = oy + room.gy * (cell + gap);
    const isCurrent = room.id === data.room.id;
    if (room.visited) {
      ctx.fillStyle = isCurrent ? "rgba(216,166,91,0.55)" : "rgba(201,178,139,0.38)";
      ctx.fillRect(rx, ry, cell, cell);
    } else {
      ctx.strokeStyle = "rgba(201,178,139,0.25)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(rx + 0.5, ry + 0.5, cell - 1, cell - 1);
    }
    ctx.strokeStyle = isCurrent ? "#e0b46f" : "rgba(234,223,200,0.18)";
    ctx.lineWidth = isCurrent ? 1.6 : 0.7;
    ctx.strokeRect(rx + 0.5, ry + 0.5, cell - 1, cell - 1);
    if (room.visited && room.type !== "start") {
      const cx = rx + cell / 2;
      const cy = ry + cell / 2;
      if (room.type === "boss") {
        drawSkullIcon(ctx, cx, cy, 8.5);
      } else if (room.type === "treasure") {
        ctx.fillStyle = "#d8a65b";
        ctx.beginPath();
        ctx.moveTo(cx, cy - 2.6);
        ctx.lineTo(cx + 2.6, cy);
        ctx.lineTo(cx, cy + 2.6);
        ctx.lineTo(cx - 2.6, cy);
        ctx.closePath();
        ctx.fill();
      } else if (room.type === "shop") {
        drawCoinIcon(ctx, cx, cy, 10);
      } else if (room.type === "library") {
        ctx.strokeStyle = "#d9c9a8";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 2.5, cy - 3, 5, 6);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx, cy + 3);
        ctx.stroke();
      } else if (room.type === "vault") {
        drawKeyIcon(ctx, cx, cy, 9);
      } else if (room.type === "sacrifice") {
        drawHeartIcon(ctx, cx, cy, 8, "half");
      } else if (room.type === "challenge") {
        drawSkullIcon(ctx, cx, cy, 9);
      } else if (room.type === "secret") {
        ctx.strokeStyle = "rgba(194,74,51,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.4, 0, TAU);
        ctx.stroke();
      }
    }
  }

  smallCaps(
    ctx,
    `${data.roomCount} ${data.roomCount === 1 ? "ROOM" : "ROOMS"} TREAD`,
    x + 9,
    y + h - 7,
    "rgba(182,165,137,0.5)",
    7.5,
  );
  smallCaps(ctx, `${data.theme.index + 1}/3`, x + w - 9, y + h - 7, "rgba(216,166,91,0.55)", 7.5, "right");
}

function drawBossBar(ctx: CanvasRenderingContext2D, data: HudData, time: number): void {
  const boss = data.boss;
  if (!boss || boss.dead) {
    return;
  }
  const w = 470;
  const x = (VIEW_W - w) / 2;
  const y = VIEW_H - 32;
  const pct = Math.max(0, boss.hp / boss.maxHp);
  ctx.save();
  drawBossBarFrame(ctx, x, y, w, 14);

  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, "#6c221c");
  grad.addColorStop(0.45, "#a83c2d");
  grad.addColorStop(1, "#6c221c");
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, (w - 4) * pct, 10);
  ctx.fillStyle = "rgba(255,220,190,0.22)";
  ctx.fillRect(x + 2, y + 2, (w - 4) * pct, 2);
  // phase marker
  ctx.strokeStyle = "rgba(234,223,200,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + 2);
  ctx.lineTo(x + w * 0.5, y + 12);
  ctx.stroke();

  ctx.font = "400 19px 'IM Fell English SC', Georgia, serif";
  ctx.fillStyle = PAL.bone;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(data.bossName.toUpperCase(), VIEW_W / 2, y - 5);
  if (boss.phase2) {
    ctx.font = "700 8px Alegreya, Georgia, serif";
    ctx.fillStyle = "rgba(224,150,110,0.8)";
    ctx.fillText("ENRAGED", VIEW_W / 2, y - 24);
  }
  if (data.bossIntro > 0) {
    const a = Math.min(1, data.bossIntro / 0.4) * Math.min(1, (2.6 - data.bossIntro) / 0.6);
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = "400 46px 'IM Fell English SC', Georgia, serif";
    ctx.fillStyle = PAL.bone;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 18;
    ctx.fillText(data.bossName.toUpperCase(), VIEW_W / 2, ROOM_Y + 96);
    ctx.shadowBlur = 0;
    ctx.font = "400 18px Alegreya, Georgia, serif";
    ctx.fillStyle = "rgba(234,223,200,0.72)";
    ctx.fillText(`“${data.bossQuote}”`, VIEW_W / 2, ROOM_Y + 132);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  void time;
}

function drawBanner(ctx: CanvasRenderingContext2D, data: HudData, time: number): void {
  const b = data.banner;
  if (!b) return;
  const fadeIn = Math.min(1, (b.max - b.life) / 0.25);
  const fadeOut = Math.min(1, b.life / 0.4);
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0) return;
  const w = 388;
  const h = 52;
  const x = (VIEW_W - w) / 2;
  const y = 78;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(11,9,7,0.94)";
  roundRect(ctx, x, y, w, h, 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(216,166,91,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = "rgba(194,74,51,0.55)";
  ctx.beginPath();
  ctx.moveTo(x, y + 0.5);
  ctx.lineTo(x + w, y + 0.5);
  ctx.stroke();
  drawItemGlyph(ctx, b.itemId, x + 8, y + 8, 36, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "400 21px 'IM Fell English SC', Georgia, serif";
  ctx.fillStyle = PAL.bone;
  ctx.fillText(b.name, x + 55, y + 19);
  ctx.font = "400 13px Alegreya, Georgia, serif";
  ctx.fillStyle = "rgba(182,165,137,0.9)";
  ctx.fillText(b.desc, x + 55, y + 37);
  smallCaps(ctx, "RELIC", x + w - 12, y + 16, "rgba(216,166,91,0.7)", 8, "right");
  ctx.restore();
  void time;
}

function drawNotice(ctx: CanvasRenderingContext2D, data: HudData, time: number): void {
  const n = data.notice;
  if (!n) return;
  const alpha = Math.min(1, n.life / 0.3) * Math.min(1, (n.max - n.life) / 0.15);
  if (alpha <= 0) return;
  const text = n.text;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "700 12px Alegreya, Georgia, serif";
  const tw = ctx.measureText(text.toUpperCase()).width + 30;
  const x = (VIEW_W - tw) / 2;
  const y = ROOM_Y + ROOM_H + 14;
  ctx.fillStyle = "rgba(10,8,7,0.9)";
  roundRect(ctx, x, y, tw, 22, 2);
  ctx.fill();
  ctx.strokeStyle = n.color ?? "rgba(194,74,51,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = n.color ? "#e7bfae" : "rgba(234,223,200,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), VIEW_W / 2, y + 11.5);
  ctx.restore();
  void time;
}

function drawHint(ctx: CanvasRenderingContext2D, data: HudData, time: number): void {
  if (data.hintLife <= 0) return;
  const alpha = Math.min(1, data.hintLife / 1.2) * Math.min(1, (7 - data.hintLife) / 0.4);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  const cy = ROOM_Y + ROOM_H + 28;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "400 15px 'IM Fell English SC', Georgia, serif";
  ctx.fillStyle = "rgba(234,223,200,0.82)";
  ctx.fillText(
    data.touch ? "TOUCH LEFT TO MOVE · RIGHT TO WEEP · SKILL AND RELIC AT THE THUMB" : "WASD MOVE · ARROWS WEEP · E BOMB · Q RELIC · F SKILL",
    VIEW_W / 2,
    cy,
  );
  ctx.font = "400 13px Alegreya, Georgia, serif";
  ctx.fillStyle = "rgba(182,165,137,0.7)";
  ctx.fillText(
    "Rooms have their own furniture now. Some hold waves, nests or ambushes. Find the keeper.",
    VIEW_W / 2,
    cy + 20,
  );
  ctx.restore();
  void data;
}

function drawLowHealth(ctx: CanvasRenderingContext2D, p: Player, time: number): void {
  if (p.hp > 2 || p.maxHp <= 0) return;
  const pulse = 0.15 + (Math.sin(time * 2.4) + 1) * 0.07;
  const grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 160, VIEW_W / 2, VIEW_H / 2, 560);
  grad.addColorStop(0, "rgba(90,10,10,0)");
  grad.addColorStop(1, `rgba(120,20,16,${pulse})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawActiveSlot(ctx: CanvasRenderingContext2D, data: HudData, time: number): void {
  const p = data.player;
  const hasActive = Boolean(data.activeItem && ITEM_BY_ID.get(data.activeItem));
  const y = ROOM_Y + ROOM_H + 40;
  const target = drawSkillSlot(ctx, data, y);
  const x = target;
  let tx = x;
  if (hasActive && data.activeItem) {
    ctx.save();
    ctx.fillStyle = "rgba(9,7,6,0.8)";
    roundRect(ctx, x, y, 30, 30, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(216,166,91,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    drawItemGlyph(ctx, data.activeItem, x + 4, y + 4, 22, false);
    smallCaps(ctx, "Q", x + 34, y + 10, "rgba(216,166,91,0.75)", 8);
    for (let i = 0; i < data.activeMax; i++) {
      ctx.fillStyle = i < data.activeCharges ? "#e0b46f" : "rgba(201,178,139,0.2)";
      ctx.beginPath();
      ctx.arc(x + 36 + i * 5, y + 22, 1.7, 0, TAU);
      ctx.fill();
    }
    tx = x + 30 + Math.max(18, data.activeMax * 5) + 8;
    ctx.restore();
  }
  // small trinket row — visible even when the character has no active relic
  ctx.save();
  for (const id of data.trinkets.slice(0, 4)) {
    ctx.fillStyle = "rgba(9,7,6,0.7)";
    ctx.fillRect(tx, y + 10, 15, 15);
    drawItemGlyph(ctx, id, tx, y + 10, 15, false);
    ctx.strokeStyle = "rgba(126,166,160,0.4)";
    ctx.strokeRect(tx + 0.5, y + 10.5, 14, 14);
    tx += 18;
  }
  if (data.transformations.length) {
    smallCaps(
      ctx,
      `SET ${data.transformations.length}`,
      x,
      y - 7,
      "rgba(216,166,91,0.7)",
      7.5,
    );
  }
  ctx.restore();
  void time;
  void p;
}

function drawSkillSlot(ctx: CanvasRenderingContext2D, data: HudData, y: number): number {
  const x = 28;
  const size = 30;
  ctx.save();
  ctx.fillStyle = "rgba(9,7,6,0.8)";
  roundRect(ctx, x, y, size, size, 2);
  ctx.fill();
  const ready = data.skillCd <= 0.05;
  ctx.strokeStyle = ready ? data.skillColor : "rgba(216,166,91,0.3)";
  ctx.globalAlpha = ready ? 0.85 : 0.5;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ready ? data.skillColor : "rgba(234,223,200,0.4)";
  ctx.font = "400 20px 'IM Fell English SC', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✧", x + size / 2, y + size / 2 + 1);
  if (!ready) {
    const fraction = Math.max(0, Math.min(1, data.skillCd / Math.max(0.01, data.skillMax)));
    ctx.fillStyle = "rgba(9,7,6,0.66)";
    ctx.fillRect(x + 1, y + 1, size - 2, (size - 2) * fraction);
    smallCaps(ctx, data.skillCd.toFixed(1), x + size / 2, y + size / 2, "rgba(234,223,200,0.8)", 7, "center");
  }
  smallCaps(ctx, "F", x + size + 4, y + 9, "rgba(216,166,91,0.75)", 8);
  smallCaps(ctx, ready ? "SKILL" : "WAIT", x + size + 4, y + 23, "rgba(182,165,137,0.55)", 7);
  ctx.restore();
  return x + size + 22;
}

function drawCurseChip(ctx: CanvasRenderingContext2D, curse: Curse): void {
  const label = `CURSE · ${curse.toUpperCase()}`;
  ctx.save();
  ctx.font = "700 8px Alegreya, Georgia, serif";
  const w = ctx.measureText(label).width + 14;
  const x = 744 - w;
  const y = 62;
  ctx.fillStyle = "rgba(80,18,15,0.45)";
  roundRect(ctx, x, y, w, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(194,74,51,0.4)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "rgba(227,164,143,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + 7.5);
  ctx.restore();
}

export function worldToView(x: number, y: number): { x: number; y: number } {
  return { x: ROOM_X + x, y: ROOM_Y + y };
}

export function drawTouchSticks(
  ctx: CanvasRenderingContext2D,
  sticks: {
    left: { active: boolean; ox: number; oy: number; x: number; y: number; dx: number; dy: number };
    right: { active: boolean; ox: number; oy: number; x: number; y: number; dx: number; dy: number };
  },
): void {
  // Called in screen space, after the design-field transform is restored,
  // so the D-pad can appear anywhere the thumb touches — including the
  // letterboxed area below a portrait game field.
  const left = sticks.left;
  if (left.active) {
    const o = { x: left.ox, y: left.oy };
    const knob = { x: left.ox + left.dx * 52, y: left.oy + left.dy * 52 };
    const r = 64;
    const strength = Math.min(1, Math.hypot(left.dx, left.dy));
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "rgba(10,8,7,0.32)";
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(234,223,200,0.32)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "rgba(216,166,91,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r - 9, 0, TAU);
    ctx.stroke();
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];
    for (const dir of dirs) {
      const dot = left.dx * dir.x + left.dy * dir.y;
      const active = strength > 0.18 && dot > 0.38;
      const ax = o.x + dir.x * (r - 13);
      const ay = o.y + dir.y * (r - 13);
      const px = -dir.y;
      const py = dir.x;
      ctx.beginPath();
      ctx.moveTo(ax + dir.x * 9, ay + dir.y * 9);
      ctx.lineTo(ax - dir.x * 5 + px * 9, ay - dir.y * 5 + py * 9);
      ctx.lineTo(ax - dir.x * 5 - px * 9, ay - dir.y * 5 - py * 9);
      ctx.closePath();
      ctx.fillStyle = active ? "#e0b46f" : "rgba(201,178,139,0.5)";
      ctx.fill();
      if (active) {
        ctx.strokeStyle = "rgba(240,203,132,0.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(234,223,200,0.15)";
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 24, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,203,132,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(240,203,132,0.18)";
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const right = sticks.right;
  if (right.active) {
    const o = { x: right.ox, y: right.oy };
    const knob = { x: right.ox + right.dx * 52, y: right.oy + right.dy * 52 };
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "rgba(12,9,8,0.28)";
    ctx.beginPath();
    ctx.arc(o.x, o.y, 58, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(194,74,51,0.58)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * TAU + 0.05;
      ctx.beginPath();
      ctx.arc(o.x, o.y, 57, a0, a0 + 0.44);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(224,150,110,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(o.x - 8, o.y);
    ctx.lineTo(o.x + 8, o.y);
    ctx.moveTo(o.x, o.y - 8);
    ctx.lineTo(o.x, o.y + 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(194,74,51,0.24)";
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 22, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,150,110,0.72)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
}export { smallCaps, panel, stitchedLine };
