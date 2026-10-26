import { TAU, type Vec } from "./types";

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
export const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(bx - ax, by - ay);
export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function norm(x: number, y: number): Vec {
  const l = Math.hypot(x, y);
  if (l < 0.0001) return { x: 0, y: 0 };
  return { x: x / l, y: y / l };
}

export function rotate(x: number, y: number, a: number): Vec {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}

export function angleTo(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function circleRect(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function segmentCircle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  const px = x1 + dx * t;
  const py = y1 + dy * t;
  const ex = cx - px;
  const ey = cy - py;
  return ex * ex + ey * ey <= r * r;
}

export function moveWithCollision(
  obj: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  obstacles: { x: number; y: number; w: number; h: number }[],
  bounds: { x: number; y: number; w: number; h: number },
): void {
  // X axis
  obj.x += dx;
  for (const o of obstacles) {
    if (circleRect(obj.x, obj.y, radius, o.x, o.y, o.w, o.h)) {
      obj.x = dx > 0 ? o.x - radius - 0.01 : o.x + o.w + radius + 0.01;
    }
  }
  obj.x = clamp(obj.x, bounds.x + radius, bounds.x + bounds.w - radius);

  // Y axis
  obj.y += dy;
  for (const o of obstacles) {
    if (circleRect(obj.x, obj.y, radius, o.x, o.y, o.w, o.h)) {
      obj.y = dy > 0 ? o.y - radius - 0.01 : o.y + o.h + radius + 0.01;
    }
  }
  obj.y = clamp(obj.y, bounds.y + radius, bounds.y + bounds.h - radius);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function roman(n: number): string {
  return ["I", "II", "III", "IV", "V"][Math.max(0, n - 1)] ?? String(n);
}

export const ROOM_BOUNDS = { x: 0, y: 0, w: 0, h: 0 };

export function mulColor(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
