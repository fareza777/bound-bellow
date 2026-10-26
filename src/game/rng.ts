export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mixSeed(a: number, b: number, c = 0): number {
  let h = a >>> 0;
  h ^= Math.imul(b + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0xc2b2ae35);
  h ^= Math.imul(c + 0x7f4a7c15, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 13), 0x165667b1);
  return (h ^ (h >>> 16)) >>> 0;
}

export const seedToText = (seed: number): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = seed >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length);
  }
  return out;
};

export const textToSeed = (text: string): number => {
  const clean = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return (Math.random() * 0xffffffff) >>> 0;
  let n = 0;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    n = n * alphabet.length + (idx >= 0 ? idx : 7);
  }
  return (n ^ hashString(clean)) >>> 0;
};

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  weighted<T>(entries: readonly [T, number][]): T {
    let total = 0;
    for (const [, w] of entries) total += w;
    let roll = this.next() * total;
    for (const [value, w] of entries) {
      roll -= w;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }
}
