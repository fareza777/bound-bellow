import type { BossKind, EnemyKind } from "./types";

export interface Theme {
  index: number;
  numeral: string;
  name: string;
  tagline: string;
  line: string;
  boss: BossKind;
  bossName: string;
  bossTitle: string;
  palette: {
    floorA: string;
    floorB: string;
    floorC: string;
    wallA: string;
    wallB: string;
    mortar: string;
    accent: string;
    glow: string;
    water: string;
    fog: string;
    prop: string;
  };
  enemyPool: [EnemyKind, number][];
}

export const THEMES: Theme[] = [
  {
    index: 0,
    numeral: "I",
    name: "The Cellar",
    tagline: "Under the house, the water remembers.",
    line: "The first door was never locked. It was only swollen shut with damp, and something on the other side had been scratching at it for years.",
    boss: "glutton",
    bossName: "The Glutton",
    bossTitle: "it ate the last child whole, and kept the shoes",
    palette: {
      floorA: "#403b2e",
      floorB: "#4c4635",
      floorC: "#584f3b",
      wallA: "#2d2720",
      wallB: "#373026",
      mortar: "#17120e",
      accent: "#d9a45c",
      glow: "#e8b36c",
      water: "#26312d",
      fog: "#7c8157",
      prop: "#6d5a41",
    },
    enemyPool: [
      ["moth", 24],
      ["crawler", 22],
      ["husk", 20],
      ["ragdoll", 13],
      ["waxface", 10],
      ["grub", 12],
      ["swarmling", 12],
      ["lurker", 8],
      ["mimic", 6],
    ],
  },
  {
    index: 1,
    numeral: "II",
    name: "The Ossuary",
    tagline: "A chapel built from everyone who came before.",
    line: "They stacked the bones with care. Each skull had a name sewn into the forehead. None of the names were finished.",
    boss: "weaver",
    bossName: "The Weaver",
    bossTitle: "she stitches the small ones back wrong, then calls them hers",
    palette: {
      floorA: "#3a4142",
      floorB: "#454c49",
      floorC: "#50534a",
      wallA: "#262c2e",
      wallB: "#303738",
      mortar: "#14191a",
      accent: "#d8b071",
      glow: "#c9d7be",
      water: "#2a3434",
      fog: "#85929b",
      prop: "#918973",
    },
    enemyPool: [
      ["crawler", 18],
      ["husk", 20],
      ["waxface", 15],
      ["goat", 13],
      ["saint", 10],
      ["wraith", 9],
      ["chorister", 7],
      ["bellringer", 8],
      ["penitent", 7],
      ["waxherald", 6],
      ["scarecrow", 6],
      ["grub", 6],
    ],
  },
  {
    index: 2,
    numeral: "III",
    name: "The Drowned Gallery",
    tagline: "Every saint down here has water in the lungs.",
    line: "The water climbed the stairs to meet her. In the green light, painted saints turned their faces away.",
    boss: "drowned",
    bossName: "The Drowned Choir",
    bossTitle: "sing, little lamb; the water only wants a voice",
    palette: {
      floorA: "#33413d",
      floorB: "#3c4b45",
      floorC: "#45554b",
      wallA: "#232f2d",
      wallB: "#2c3a36",
      mortar: "#101817",
      accent: "#87b09e",
      glow: "#a8c6a4",
      water: "#1f3a3c",
      fog: "#738f88",
      prop: "#7b8b78",
    },
    enemyPool: [
      ["drowned", 20],
      ["chorister", 15],
      ["waxface", 14],
      ["moth", 12],
      ["wraith", 11],
      ["crawler", 10],
      ["roothound", 7],
      ["drifter", 9],
      ["censer", 8],
      ["lantern", 8],
      ["weaverling", 7],
      ["bellringer", 5],
    ],
  },
  {
    index: 3,
    numeral: "IV",
    name: "The Bone Orchard",
    tagline: "Everything the house refused, it planted.",
    line: "The roots were not roots. The orchard had grown from everyone who ever said no to the house.",
    boss: "orchard",
    bossName: "The Rootbound Matron",
    bossTitle: "every branch was a name; every name was a warning",
    palette: {
      floorA: "#403a2d",
      floorB: "#4a4334",
      floorC: "#544b39",
      wallA: "#2e2920",
      wallB: "#383126",
      mortar: "#15120d",
      accent: "#c9a464",
      glow: "#d3b475",
      water: "#2d2a22",
      fog: "#9b8a68",
      prop: "#8b7a58",
    },
    enemyPool: [
      ["roothound", 17],
      ["bonewheel", 15],
      ["wretch", 14],
      ["waxcrow", 13],
      ["goat", 11],
      ["saint", 8],
      ["husk", 8],
      ["bonekite", 10],
      ["hollowman", 8],
      ["maw", 7],
      ["mimic", 6],
      ["scarecrow", 5],
    ],
  },
  {
    index: 4,
    numeral: "V",
    name: "The Hollow",
    tagline: "The thread goes all the way through.",
    line: "There are no more stairs. Only a red room, warm as a mouth, and a heartbeat keeping time.",
    boss: "heart",
    bossName: "The Hollow Heart",
    bossTitle: "it has been waiting for a sibling",
    palette: {
      floorA: "#422b2a",
      floorB: "#4d302d",
      floorC: "#583531",
      wallA: "#2e1d1c",
      wallB: "#382422",
      mortar: "#170e0d",
      accent: "#e0a25c",
      glow: "#d8795f",
      water: "#3a2022",
      fog: "#9b5a52",
      prop: "#a08263",
    },
    enemyPool: [
      ["wretch", 14],
      ["bonewheel", 13],
      ["goat", 13],
      ["saint", 10],
      ["wraith", 13],
      ["chorister", 10],
      ["waxcrow", 10],
      ["drowned", 8],
      ["bellringer", 9],
      ["penitent", 8],
      ["bonekite", 9],
      ["hollowman", 8],
      ["lantern", 7],
      ["maw", 6],
      ["drifter", 7],
      ["spore", 6],
      ["weaverling", 5],
    ],
  },
];

export const getTheme = (floorIndex: number): Theme =>
  THEMES[Math.min(THEMES.length - 1, Math.max(0, floorIndex))];

export const CHAPTER_IMAGES = [
  new URL("../assets/chapter-1.jpg", import.meta.url).href,
  new URL("../assets/chapter-2.jpg", import.meta.url).href,
  new URL("../assets/chapter-drowned.jpg", import.meta.url).href,
  new URL("../assets/chapter-orchard.jpg", import.meta.url).href,
  new URL("../assets/chapter-3.jpg", import.meta.url).href,
];
