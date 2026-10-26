import type { CharacterId, PlayerStats } from "./types";

export interface CharacterLook {
  cloak: string;
  cloakDark: string;
  hood: string;
  hoodDark: string;
  face: string;
  accent: string;
  eye: string;
  extra: "none" | "moth" | "ember" | "choir";
}

export interface CharacterSkill {
  name: string;
  desc: string;
  cooldown: number;
  color: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  epithet: string;
  blurb: string;
  unlockText: string;
  portrait: string;
  maxHp: number;
  startingCoins: number;
  startingBombs: number;
  startingKeys: number;
  startingActive?: string;
  startingTrinket?: string;
  skill: CharacterSkill;
  stats: Partial<PlayerStats>;
  look: CharacterLook;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "wren",
    name: "Wren",
    epithet: "The Thread",
    blurb: "A small hooded child with a lantern and a wrist full of red thread. Balanced, stubborn, and not yet afraid.",
    unlockText: "Always beneath the floorboards.",
    portrait: new URL("../assets/portraits/wren.jpg", import.meta.url).href,
    maxHp: 6,
    startingCoins: 2,
    startingBombs: 3,
    startingKeys: 1,
    skill: {
      name: "Thread Pull",
      desc: "Dash toward your aim, cutting everything in the thread's path.",
      cooldown: 4.5,
      color: "#c24a33",
    },
    stats: {},
    look: {
      cloak: "#63513a",
      cloakDark: "#4a3a28",
      hood: "#5a4934",
      hoodDark: "#403224",
      face: "#e3cfae",
      accent: "#c24a33",
      eye: "#16100d",
      extra: "none",
    },
  },
  {
    id: "moth",
    name: "Moth",
    epithet: "The Dust",
    blurb: "A feral little thing wearing a collar of wings. Faster than sense, twice as loud, and almost never where the dark expects.",
    unlockText: "Reach Chapter III.",
    portrait: new URL("../assets/portraits/moth.jpg", import.meta.url).href,
    maxHp: 4,
    startingCoins: 4,
    startingBombs: 2,
    startingKeys: 1,
    startingTrinket: "moth-wing",
    skill: {
      name: "Dust Veil",
      desc: "Turn to dust for a breath: untouchable, and much too fast.",
      cooldown: 6.5,
      color: "#cfc3a7",
    },
    stats: {
      damage: 2.45,
      fireDelay: 0.29,
      speed: 238,
      range: 0.82,
      shots: 2,
      spread: 0.14,
      tearSize: 0.9,
      crit: 0.08,
    },
    look: {
      cloak: "#a89f8b",
      cloakDark: "#756c5c",
      hood: "#c2b7a1",
      hoodDark: "#8a7f6b",
      face: "#e8d8bb",
      accent: "#c9a45e",
      eye: "#4d4233",
      extra: "moth",
    },
  },
  {
    id: "cinder",
    name: "Cinder",
    epithet: "The Ember",
    blurb: "A soot-stained child with a cracked arm and a bell that never rings. Slow to move, impossible to put out.",
    unlockText: "Finish one descent.",
    portrait: new URL("../assets/portraits/cinder.jpg", import.meta.url).href,
    maxHp: 8,
    startingCoins: 2,
    startingBombs: 5,
    startingKeys: 1,
    startingActive: "ember-flask",
    skill: {
      name: "Cinder Bloom",
      desc: "A ring of fire erupts from the cracked arm.",
      cooldown: 7.5,
      color: "#e07a3a",
    },
    stats: {
      damage: 4.9,
      fireDelay: 0.52,
      speed: 191,
      range: 0.92,
      tearSize: 1.22,
      shotSpeed: 430,
      explosive: 0,
      armor: 0,
    },
    look: {
      cloak: "#46382b",
      cloakDark: "#2d241b",
      hood: "#3c2e23",
      hoodDark: "#241a13",
      face: "#dcc4a1",
      accent: "#e07a3a",
      eye: "#b84a24",
      extra: "ember",
    },
  },
  {
    id: "choir",
    name: "Choir",
    epithet: "The Hollow Voice",
    blurb: "A gaunt little saint in a ruined choir robe. Their tears go where they are needed. Their mouth is stitched shut.",
    unlockText: "Unlock 8 marks in the Ledger.",
    portrait: new URL("../assets/portraits/choir.jpg", import.meta.url).href,
    maxHp: 4,
    startingCoins: 2,
    startingBombs: 2,
    startingKeys: 2,
    startingActive: "choir-hymn",
    startingTrinket: "choir-button",
    skill: {
      name: "Requiem",
      desc: "Hold the room still and sing a verse that cuts.",
      cooldown: 8,
      color: "#9eb6ac",
    },
    stats: {
      damage: 2.9,
      fireDelay: 0.32,
      speed: 210,
      range: 1.15,
      homing: 0.65,
      tearSize: 1.0,
    },
    look: {
      cloak: "#c9c0aa",
      cloakDark: "#948a76",
      hood: "#d8cfb9",
      hoodDark: "#a89e88",
      face: "#e8dcc4",
      accent: "#d8a65b",
      eye: "#1b1410",
      extra: "choir",
    },
  },
];

export const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTER_BY_ID.get(id) ?? CHARACTERS[0];
}
