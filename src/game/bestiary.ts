import type { BossKind, Enemy, EnemyKind } from "./types";
import { drawBoss, drawEnemy } from "./art";

export const ENEMY_ORDER: EnemyKind[] = [
  "moth",
  "crawler",
  "husk",
  "ragdoll",
  "waxface",
  "goat",
  "saint",
  "wraith",
  "drowned",
  "chorister",
  "roothound",
  "waxcrow",
  "bonewheel",
  "wretch",
  "grub",
  "lurker",
  "bellringer",
  "lantern",
  "penitent",
  "maw",
  "scarecrow",
  "swarmling",
  "waxherald",
  "bonekite",
  "censer",
  "mimic",
  "weaverling",
  "hollowman",
  "drifter",
  "spore",
];

export const ENEMY_INFO: Record<EnemyKind, { name: string; lore: string }> = {
  moth: { name: "Moth", lore: "A dusty wing with a hunger for lantern light." },
  crawler: { name: "Crawler", lore: "It counts the room in legs." },
  husk: { name: "Husk", lore: "A doll that learned to drag itself by the stitching." },
  ragdoll: { name: "Ragdoll", lore: "All seams and appetite; it hops when it hears a child." },
  waxface: { name: "Waxface", lore: "A candle that grew a face and refuses to go out." },
  goat: { name: "Bound Goat", lore: "Harnessed, horned, and always pointed at the smallest thing." },
  saint: { name: "Saint", lore: "A carving that prays by firing small pieces of itself." },
  wraith: { name: "Wraith", lore: "A sheet with a child's eyes. Walls do not matter to it." },
  drowned: { name: "Drowned", lore: "The water kept everything except the voice." },
  chorister: { name: "Chorister", lore: "It opens its mouth and the room rings like a bell." },
  roothound: { name: "Roothound", lore: "A hound grown from roots; it only knows the scent of blood." },
  waxcrow: { name: "Wax Crow", lore: "It carries a candle in its chest and a beak full of wick." },
  bonewheel: { name: "Bonewheel", lore: "A wheel of everyone who tried to leave." },
  wretch: { name: "Wretch", lore: "A long-armed thing that crawls faster than it should." },
  grub: { name: "Grub", lore: "The house's first mouth. It splits when it is frightened." },
  lurker: { name: "Lurker", lore: "It waits under the floor until a shadow passes over it." },
  bellringer: { name: "Bellringer", lore: "It rings for a funeral that has not happened yet." },
  lantern: { name: "Lantern", lore: "A candle that learned to follow. Its light is not for you." },
  penitent: { name: "Penitent", lore: "It kneels until the prayer becomes a weapon." },
  maw: { name: "Maw", lore: "A hole that grew teeth and began to feed the room." },
  scarecrow: { name: "Scarecrow", lore: "It cannot walk, so it arrives instead." },
  swarmling: { name: "Swarmling", lore: "One is nothing. The room is never one." },
  waxherald: { name: "Wax Herald", lore: "It blesses the others with a shield of warm wax." },
  bonekite: { name: "Bone Kite", lore: "A rib cage strung on a child's string, still looking for wind." },
  censer: { name: "Censer", lore: "The smoke remembers every prayer and answers them wrong." },
  mimic: { name: "Mimic", lore: "It has been an urn for years. It is very tired of being an urn." },
  weaverling: { name: "Weaverling", lore: "A small spinner with a spool where its heart should be." },
  hollowman: { name: "Hollowman", lore: "There is a child-shaped hole where the child used to be." },
  drifter: { name: "Drifter", lore: "A sheet of old water, walking because it forgot it was drowned." },
  spore: { name: "Spore", lore: "It wants only to be breathed in. It gets its wish eventually." },
};

export const BOSS_LORE: Record<BossKind, string> = {
  glutton: "It ate the last child whole, and kept the shoes.",
  weaver: "She stitches the small ones back wrong, then calls them hers.",
  drowned: "The water only wants a voice. It has taken so many.",
  orchard: "Every branch was a name. Every name was a warning.",
  heart: "It has been waiting for a sibling.",
  sexton: "He buried them all, and forgot to stop.",
  curator: "He keeps what the house cannot digest.",
  bellwidow: "Every bell has a name. She remembers all of them.",
  tallyman: "He counts what the house takes, and he is never wrong.",
  gaunt: "He has been hungry since before the stairs were built.",
  carver: "She makes the small ones beautiful, then keeps the pieces.",
};

export const BOSS_ORDER: BossKind[] = [
  "glutton",
  "weaver",
  "sexton",
  "bellwidow",
  "drowned",
  "curator",
  "tallyman",
  "gaunt",
  "orchard",
  "carver",
  "heart",
];

function dummy(kind: EnemyKind | "boss", x: number, y: number, boss?: BossKind): Enemy {
  return {
    id: 900000 + Math.floor(Math.random() * 1000),
    kind,
    boss,
    elite: null,
    frozen: 0,
    shielded: 0,
    x,
    y,
    vx: 1,
    vy: 0,
    r: boss
      ? boss === "heart"
        ? 54
        : boss === "orchard"
          ? 50
          : boss === "drowned"
            ? 46
            : boss === "glutton"
              ? 48
              : boss === "weaver"
                ? 44
                : boss === "gaunt"
                  ? 48
                  : boss === "bellwidow"
                    ? 44
                    : boss === "tallyman"
                      ? 40
                      : 38
      : 14,
    hp: 10,
    maxHp: 10,
    speed: 0,
    touch: 2,
    t: 0.7,
    state: "idle",
    timer: 1,
    cd: 1,
    angle: 0,
    flash: 0,
    dead: false,
    seed: 7,
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

export function enemyThumb(kind: EnemyKind): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(1.45, 1.45);
  const e = dummy(kind, 55, 60);
  e.t = 1.2;
  e.seed = 11;
  drawEnemy(ctx, e, 0.8);
  return canvas;
}

export function bossThumb(kind: BossKind): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 190;
  canvas.height = 190;
  const ctx = canvas.getContext("2d")!;
  const e = dummy("boss", 95, 105, kind);
  e.r = kind === "heart" ? 60 : kind === "orchard" ? 55 : kind === "drowned" ? 52 : kind === "glutton" ? 52 : 45;
  drawBoss(ctx, e, 1.4);
  return canvas;
}
