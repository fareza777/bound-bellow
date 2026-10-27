# BOUND BELOW — Main Design Document

**Version:** 3.0.1 · **Genre:** top-down roguelike twin-stick shooter · **Platform:** browser (desktop, gamepad, touch) · **Engine:** Canvas 2D + TypeScript + Vite
**Status:** implemented production build target

## 1. Player fantasy

You are a small child who follows a red thread down through the floorboards of an old house to find the sibling who vanished below. The basement is a hand-inked storybook of damp stone, candle wax, stitched burlap and bone. The thread on your wrist is the only warm thing down there; everything else wants to pull it loose.

**3.0 promise:** five chapters, four playable children with their own cooldown skills, a house that rearranges its furniture and its encounters, thirty kinds of thing that want the thread, and a run that can end in several ways. The core remains readable at a glance: a room, a threat, a decision.

## 2. Core loop

1. **Choose a child and a seed.** Wren, Moth, Cinder or Choir; type a seed or take the daily descent. Each child brings a different body and a different skill.
2. **Watch or skip the voiced opening.** The intro establishes the thread, the house and the thing at the bottom.
3. **Explore a chapter** of 13–17 interconnected rooms on a 9×9 grid. Doors connect rooms; the minimap records what has been tread.
4. **Read the room.** Every combat room rolls a layout, an interior and an encounter rule. The entry notice names what the house has prepared.
5. **Clear rooms.** Combat doors lock until the room is cleared. Cleared rooms drop coins, hearts, keys or bombs. Some rooms arrive in waves, hide nests, or spring an ambush.
6. **Spend resources.** Keys open the treasure room and vault; coins buy from the shop or the library; bombs break rocks, damage enemies, destroy nests and reveal the secret room.
7. **Build the child.** Relics modify tears, movement, defense and economy. Active relics spend charges on a burst, heal, freeze, shield, blink, reveal, coins, reroll, tear rain, magnets, bombs, war cries or roots. Trinkets add small passive rules.
8. **Use the child's skill.** Every child has a cooldown move on `F` / `Shift` / gamepad X / the touch skill button. Skills do not consume relic charges.
9. **Take a curse or a bargain.** Some floors carry Darkness, Swarm or Famine. Sacrifice rooms trade health for power; challenge rooms lock you in with a keeper's servant.
10. **Defeat the chapter boss**, take the trapdoor, descend. Five chapters: **The Cellar → The Ossuary → The Drowned Gallery → The Bone Orchard → The Hollow**.
11. **End the run.** Death gives a quiet summary with no narration; victory gives the standard ending; a run with two transformations (or the Second Thread) reaches the **true ending**.
12. **Return to the Ledger.** Marks, discoveries, bestiary, stats and options persist; the daily seed is one shared house per day.

A normal run is tuned for roughly 30–50 minutes. There is no mid-run save; a run ends only in death, victory or abandonment.

## 3. Playable children

| Child | Fantasy | HP | Speed | Tears | Skill (cooldown) | Starting loadout | Unlock |
|---|---|---|---|---|---|---|---|
| **Wren** — The Thread | Balanced, stubborn, not yet afraid | 6 (3 hearts) | 208 | 1 | **Thread Pull** — dash toward aim, cutting through bodies (4.5 s) | — | Always available |
| **Moth** — The Dust | Feral, fast, twice as loud | 4 (2 hearts) | 238 (+8% from Moth Wing) | 2 | **Dust Veil** — brief untouchable speed and a trail of dust (6.5 s) | Moth Wing trinket (+8% speed) | Reach Chapter III |
| **Cinder** — The Ember | Slow to move, impossible to put out | 8 (4 hearts) | 191 | 1 | **Cinder Bloom** — a ring of fire around the cracked arm (7.5 s) | Ember Flask active (3 charges, flame burst) | Finish one descent |
| **Choir** — The Saint | Their tears go where they are needed | 4 (2 hearts) | 210 | 1, homing | **Requiem** — freeze the room and sing a homing verse (8 s) | Choir Hymn active (freeze 4 s) + Choir Button trinket | Unlock 8 marks in the Ledger |

Character identity is carried by silhouette, palette and a gameplay rule, not by a stat sheet alone. In-game Wren/Moth/Cinder/Choir share the same animation rig but differ in wings, halo, ember cracks, bell, cloak colour, accent glow and skill burst.

## 4. Controls

| Action | Keyboard / mouse | Gamepad | Touch |
|---|---|---|---|
| Move | WASD | left stick / d-pad | floating D-pad appears at the thumb |
| Weep tears | Arrow keys, or hold mouse to aim at cursor | right stick | floating weep stick at the right thumb |
| Place bomb | E or Space | face button 0 | bomb button (bottom-right) |
| Use active relic | Q | face button 1 (B) | active button (next to bomb, only when held) |
| Use child skill | F or Shift | face button 2 (X) | skill button (always during a run) |
| Pause / options | Esc or P | Start | pause button (top-right) |
| Mute | M | — | mute toggle in pause |
| Confirm / start | Enter or click | face button 0 | tap |

Menus pause gameplay input. The game fills any iframe, keeps a fixed 960×650 design field scaled to fit, and never scrolls horizontally. Portrait play is supported with a rotate hint; the landscape field is the intended composition.

## 5. Run structure

### Floors

- Layout: 13–17 rooms grown from the start on a 9×9 grid, with branches, special rooms and a boss at the far end. Layout, content and drops are seeded and deterministic.
- Pacing: floors I–II cap combat at 4–5 bodies, waves at two rounds and elite rooms have no retinue on the first floor. Crowd rules (swarm, pincer, ambush, nest) grow gradually with depth, and spawned bodies keep a minimum spacing so rooms do not become a single clump. Rooms also favour one “family” of enemy so a pack reads as intentional.
- Each floor has a theme palette, enemy pool, boss, ambient chord and chapter plate.
- Doors: combat doors close during a fight; treasure and vault doors need keys; boss and challenge doors lock the room; a trapdoor appears after a main boss.
- Floor exit: main boss room. Descending heals a little and grants a small supply bonus; the next chapter card names the curse if one is active.

### Room furniture (28 layouts)

Every combat room picks a layout from a weighted pool, then mirrors it and dresses it according to its interior. The same seed always returns the same room, but two rooms in one run almost never share a silhouette.

| Layout | Shape |
|---|---|
| Scatter | Loose rocks, urns and graves with several paths through. |
| Corners | Four dressed corners, a clear centre, optional spikes. |
| Pillars | Symmetric columns with brazier flanks. |
| Ring | A broken circle of cover with cardinal openings. |
| Cross | Four pillars and side shrines around a free centre. |
| Diamond | A small diamond of stone or graves. |
| Chapel | Rows of pews and a central aisle with candle stands. |
| Crypt | Grave slabs and side pillars in a burial grid. |
| Lanes | Three vertical lanes of columns with gaps. |
| Throne | An empty throne-room ring with braziers. |
| Maze | Broken wall segments and a broad centre. |
| Checker | A sparse offset checker of stone. |
| Banquet | Long tables of urns and a broken centre. |
| Flooded | Webs, pits and wet stone; movement drags. |
| Gauntlet | Paired spike rows and cover along the walls. |
| Cages | Iron cages, braziers and narrow paths. |
| Webbed | Dense web patches and nest debris. |
| Bone Garden | Graves, pillars and bone-covered floor. |
| Shrine | Four braziers around a clear ritual circle. |
| Bridge | Rock banks with web in the middle. |
| Pantry | Urn clusters and flour-dusted shelves. |
| Workshop | Broken benches and hanging tools. |
| Spiral | A spiral of stone that opens toward the centre. |
| Split | A central split wall and flanking cover. |
| Alley | Two long pillar walls with brazier ends. |
| Colosseum | A ring of pillars around an arena. |
| Coffin Row | Paired grave rows and caged centre. |
| Broken Clock | An asymmetrical clock-face of stone and spikes. |

### Interiors (8)

The interior changes the baked floor and wall dressing, the obstacle mix and the ambient motion. It does not replace the layout; it makes the same shape feel like a different part of the house.

- **Root Cellar** — coal, old water, crates and moss.
- **Crypt** — burial slabs, niches, bone dust and cold fog.
- **Chapel** — an aisle runner, pews, banners and a rose window.
- **Flooded** — standing water, caustics, waterline stains and wet webs.
- **Pantry** — flour, jars, shelves and scattered stores.
- **Workshop** — oil, chalk tool outlines, sawdust and tools.
- **Nest** — root tendrils, red thread, egg sacs and a pulsing warmth.
- **Orchard** — soil, roots, fallen leaves and split stone.

### Encounter rules (8)

- **Standard** — the room's normal pack.
- **Waves** — two to four waves; doors stay sealed until the last one.
- **Nests** — two or three nest nodes hatch enemies until destroyed.
- **Ambush** — the pack is already arranged around the room.
- **Elite** — one champion with a random elite rule and a retinue.
- **Hazard** — fewer bodies, more spikes, webs and braziers.
- **Pincer** — two clusters arrive from opposite corners.
- **Swarm** — many small, fast bodies instead of a few heavy ones.

### Room types (10)

| Room | Role |
|---|---|
| **Start** | Safe landing room with a coin and the first open door. |
| **Combat** | Enemy encounter; doors lock until cleared. Layout, interior and encounter vary. |
| **Treasure** | Key-locked pedestal with a relic, active or trinket. |
| **Shop** | Three purchasable pickups with price tags. |
| **Boss** | Main chapter boss, trapdoor and a pedestal reward. |
| **Secret** | Bomb-revealed room behind a cracked wall; contains a high-value reward. |
| **Sacrifice** | Trade hearts for a powerful item; the altar refuses the last heart. |
| **Challenge** | Locked arena with a keeper's servant. Six servants rotate by floor and seed. |
| **Library** | Pay coins for a chosen item from a shelf; the price is knowledge. |
| **Vault** | Key-locked room with coins, bombs and a relic. |

### Curses

Rolled per floor (higher chance deeper). One curse per floor, shown in the chapter card, HUD chip and pause.

- **Darkness** — a small light follows the child; the room edges fall away.
- **Swarm** — extra enemies join combat rooms.
- **Famine** — hearts drop far less often.

### Elites

Combat rooms can roll an elite variant: **Stitched** (+HP, splits into moths on death), **Blessed** (a shield that absorbs the first hit), **Swift** (+speed), **Cursed** (+speed, harder touch, a sickly aura), **Gilded** (drops a handful of coins) and **Bloated** (+HP, larger body, fires a ring on death). Elites are marked by a coloured aura and a distinct silhouette accent.

### Bosses

**Main (base HP; +12 per floor index):** The Glutton (Cellar, 215), The Weaver (Ossuary, 330), The Drowned Choir (Drowned Gallery, 440), The Rootbound Matron (Bone Orchard, 560), The Hollow Heart (The Hollow, 680).
**Minibosses:** The Sexton, The Curator, The Bell Widow, The Tallyman, The Gaunt and The Carver. Challenge rooms choose from a floor-appropriate subset, so the same floor can offer a different trial on another seed.

Each main boss has a phase cycle, a phase-two minion wave, a voiced introduction, a name/quote title card and a health bar with phase marks. Minibosses have shorter state machines, phase-two reinforcements and a dedicated voiced line for the four new servants. Every boss defeat drops a pedestal item and a Ledger mark; main bosses also open the trapdoor.

### Endings

- **Death:** a quiet run summary, seed, floor reached, kills and marks. **No death narration plays.** The thread simply goes slack.
- **Victory:** the thread is cut; standard ending card and narration.
- **True ending:** win with at least two transformations, or with the Second Thread relic. The ending card and narration change; the Ledger records it separately.
- **Daily:** a deterministic house for the calendar day, with its own seed label and a mark for finishing.

## 6. Content

**Enemies (30):** Moth, Crawler, Husk, Waxface (ranged), Bound Goat (charger), Saint (stationary radial), Ragdoll (hopper), Wraith (phases through rocks), Drowned, Chorister (ring shots), Roothound (charge), Waxcrow, Bonewheel (bouncing), Wretch, Grub (splits), Lurker (buried ambusher), Bellringer (ring caster), Lantern (orbiting caster), Penitent (telegraphed prayer rings), Maw (stationary spawner), Scarecrow (teleporting caster), Swarmling (fast pack), Wax Herald (shields nearby enemies), Bone Kite (orbit and dive), Censer (smoke shots), Mimic (disguised urn that lunges), Weaverling (needle spreads), Hollowman (phasing teleporter), Drifter (phasing shade) and Spore (bursts on death). Six elite rules multiply the roster.

**Items (108):**
- **62 relics** — tear count/damage/range, fire rate, pierce, bounce, homing, crit, speed, orbitals, poison, explosive tears, armor, coin/key/bomb economy, shop discounts, curse resistance, revive, and enough new toys to make duplicate runs feel different.
- **24 active relics** — Ember Flask, Marrow Bomb, Soot Bell, Wax Candle, Choir Hymn, Needle Fan, Root Totem, Pocket Hatch, Eye of the House, Drowned Purse, Widow's Spool, Ledger Page, Storm Hymn (tear rain), Grave Magnet, Widow's Scream (root), Marrow Rain (free bombs), Glass Hour (slow), Hollow Call (war cry + shield), Thread Hook (dash), Wax Vision, Gold Tooth, Ash Bell, Needle Heart and Page of Names. Charges are spent on use and refill on room clear.
- **22 trinkets** — small passive rules: speed, coin drops, luck, tear size, pickup magnetism, shop prices, heart drops, crit, range, explosions and homing.

**Character skills (4):** Thread Pull, Dust Veil, Cinder Bloom, Requiem. Cooldown-only, no charges, visible in the HUD and pause menu, usable from keyboard, gamepad and touch.

**Transformations (6 sets):** collect three tagged relics to become **The Stitch**, **Waxbound**, **The Drowned Choir**, **The Gilded**, **Ashbound** or **The Hollowed**. A transformation grants a stat bundle, a HUD set marker and a burst effect.

**Pickups:** coin, bomb, key, heart, half heart, item pedestal, trapdoor. Shop stock uses coin prices; sacrifice and library stock can use heart or coin prices.

**Meta progression (30 marks):** first opening, first descent, each boss, true ending, 20/40 item discoveries, 100 kills, a flawless floor, 25 bomb kills, key master, deep/bottom floors, curses, a secret room, a transformation, a revive, a sub-18-minute win, a one-heart win, a daily finish, the library, charm collection, the altar, a miniboss, 40 coins in a run and all four children. Marks unlock characters and are visible in the Ledger.

**Ledger:** Characters, Relics, Bestiary, Marks, Stats and Options. Bestiary entries use live canvas thumbnails of all enemies and bosses. Options persist voice, screen shake, damage numbers, flashes and assist mode (+1 heart).

## 7. Presentation

- **Opening cinematic:** five voiced beats over the generated key art, with captions, progress dots, Skip and Next. The intro is skippable and is remembered; “Watch the opening” replays it from the title.
- **Chapter cards:** five generated plates with chapter numeral, title, one line of prose, floor/tagline/curse/daily metadata and a Descend button. Chapter narration plays on the card unless voice is off.
- **Boss introductions:** name, quote, voiced line, and a short camera hold before the fight.
- **Narration:** 28 Deepgram Flux TTS lines in `public/audio/vo/`, voice Colin (British narrator) — 5 intro beats, 5 chapter lines, 5 main-boss lines, 6 miniboss lines, 2 endings, 1 curse line and 4 child-specific low-health lines. Death has no voice line. Voice is optional; captions remain. New servant lines were generated with the same narrator so the house keeps one voice.
- **Music/sound:** all SFX and ambient beds are synthesized in WebAudio. A danger layer raises intensity during combat and boss fights. Audio unlocks on the first gesture and ducks on pause.
- **HUD:** hearts, coin/bomb/key counters, seed/daily label, minimap with special-room icons, a child-skill slot with cooldown, an active-relic slot with charge pips, trinket row, transformation marker, curse chip, boss bar and boss quote. Relics only appear in the top strip; skills, actives and trinkets have dedicated slots.
- **Accessibility:** voice toggle, shake strength, damage-number toggle, flash toggle, assist mode, reduced-motion respect, readable captions, keyboard and gamepad parity.
- **UI identity:** IM Fell English SC display, Alegreya body, ink panels, hairlines, thread-red accents and a paper-grain texture. Menus never use glassmorphism.

## 8. Visual direction

- **Material language:** old paper, iron-gall ink, red thread, candle soot, stitching. Everything has an irregular hand-inked outline and slight paper grain; no clean geometric gradients.
- **Palette:** soot `#141011`, bone `#e8dcc4`, parchment `#c9b795`, dried blood `#8e2b2b`, thread red `#b8402f`, candle `#e0a24e`.
- **Chapter palettes:** Cellar olive `#5d6b4a`; Ossuary teal `#4f6f6d`; Drowned Gallery green-gold `#5d7a68`; Bone Orchard amber `#8a6a3d`; Hollow rose `#6e2f3a`.
- **Camera:** fixed per room, whole room visible, like a stage. Rooms sit inside a dark surround that carries the HUD.
- **Room identity:** floor/wall dressing is cached per room and combines chapter, interior, layout and seed. Each chapter uses the original 13×7 hand-set flagstones with restrained joints, natural wear (wet stone, wave grooves, root paths and vein cracks — no painted circles or boxes or light-shaft overlay), wall props (cellar beams and cupboards, ossuary niches and bone stacks, drowned painted panels and waterline, orchard roots and hanging pods, hollow veins and rib arches) plus soft local candlelight. Start, treasure, shop, library, challenge, vault and boss rooms get a room-role prop set built from wall furniture and candles; no floating rings or painted boxes on the playfield. Animation adds water shimmer, spores, candle flicker, dust and torch glow without changing collision.
- **Motion:** stepped sprite wobble for enemies, smooth 60 fps movement, cloth sway, floating dust, ink-fade menus. Screen shake and flashes respect settings and `prefers-reduced-motion`.
- **Generated vs. code-drawn:** generated illustration is reserved for the title, five chapter plates and four character portraits. Gameplay actors, rooms, items, HUD icons, FX and audio are code-drawn/synthesized so they stay crisp, small and consistent.

## 9. Asset list

| Asset | Role | Runtime destination | Source |
|---|---|---|---|
| `title-key` | Title backdrop, intro beat art | `src/assets/title-key.jpg` | Generated illustration |
| `chapter-cellar` | Chapter I plate | `src/assets/chapter-1.jpg` | Generated illustration |
| `chapter-ossuary` | Chapter II plate | `src/assets/chapter-2.jpg` | Generated illustration |
| `chapter-drowned` | Chapter III plate | `src/assets/chapter-drowned.jpg` | Generated illustration |
| `chapter-orchard` | Chapter IV plate | `src/assets/chapter-orchard.jpg` | Generated illustration |
| `chapter-hollow` | Chapter V plate | `src/assets/chapter-3.jpg` | Generated illustration |
| `portrait-wren` | Wren character card | `src/assets/portraits/wren.jpg` | Generated portrait |
| `portrait-moth` | Moth character card | `src/assets/portraits/moth.jpg` | Generated portrait |
| `portrait-cinder` | Cinder character card | `src/assets/portraits/cinder.jpg` | Generated portrait |
| `portrait-choir` | Choir character card | `src/assets/portraits/choir.jpg` | Generated portrait |
| Wren + enemies/bosses | Playfield actors | `src/game/art.ts` | Code-drawn |
| Tiles, walls, interiors, props, doors | Rooms | `src/game/roomRender.ts`, `src/game/roomLayouts.ts` | Code-drawn |
| Item/HUD icons | Inventory and HUD | `src/game/items.ts`, `src/game/hud.ts` | Code-drawn |
| Tears, particles, lighting | Feedback | `src/game/game.ts` | Code-drawn |
| SFX + ambient | Feedback | `src/game/audio.ts` | WebAudio synthesis |
| Narration | 28 VO lines | `public/audio/vo/*.mp3` | Deepgram Flux TTS Colin, script in `src/game/vo-script.json` |
| Fonts | Display/body | `src/assets/fonts/*.woff2` | Alegreya, IM Fell English SC (OFL) |
| Playgama icon | Store/app icon | `store/icon-800.png` | Wren emblem, uploaded square cover |
| Playgama covers | Store listing | `store/cover-square-800.jpg`, `cover-portrait-1080x1920.jpg`, `cover-landscape-1920x1080.jpg` | Composited from title art and character portrait |
| Playgama screenshots | Store/marketing | `store/screenshots/*-1920x1080.jpg` | Real gameplay captures with a branded right rail |

The generated plates and portraits are 1440×810 / 3:4 JPEG exports; the canvas keeps the source images and runtime-export nodes for provenance. Voice regeneration is a build-time script (`tools/generate_vo.py`) and the API key is supplied by environment variable only.

## 10. Definition of done (3.0.1)

- Title → character/seed or daily → voiced opening → five chapters → boss → victory/true ending/death → restart, all in one session.
- All four children, five themes, five main bosses, six minibosses, 30 enemies, 28 room layouts, 8 interiors, 8 encounter rules, 10 room types, 108 items, 4 child skills, 6 transformations, 3 curses, 6 elite rules, secret/sacrifice/library/vault, daily seed, 30 marks and the Ledger are reachable.
- Floors I–II keep combat at 4–5 bodies, early waves at two rounds and first-floor elite rooms without a retinue; deeper floors scale up.
- Every child skill works from keyboard, the touch button and the gamepad; the HUD shows its cooldown and the pause menu names it.
- Active relics work from Q, the touch button and the gamepad; trinkets and transformations show in the HUD and pause.
- Room generation can produce every layout; every generated room keeps the centre and all doors connected; nests and wave rooms cannot soft-lock.
- Damage, death, revive, true-ending detection and restart are reliable; doors and room transitions cannot soft-lock.
- Death ends the run without a voice line; the victory and true-victory narration remain.
- Voice can be disabled; captions remain. Audio unlocks on first gesture.
- Playable at 1440×900, 1024×768, 844×390 and 390×844 with no horizontal overflow; portrait shows the rotate hint.
- Build produces a static `dist/` with relative paths; preview runs on Vite. Production art is integrated, not only shown on the canvas.
- Real-input playtest with screenshots for title, intro, chapter card, combat, room variants, child skill, active relic, treasure, shop, secret reveal, curse, challenge miniboss, main boss, ending, Ledger and mobile layouts.

## 11. Technical notes

- Canvas 2D, single rAF loop, fixed 960×650 design field, DPR capped at 2. Rooms are 13×7 walkable tiles of 64 px inside 40 px walls.
- Seeded `mulberry32` PRNG for layout, content and drops; room content is generated lazily and cached so revisiting is stable.
- `roomLayouts.ts` owns 28 furniture patterns, interior pools, obstacle spawning and the connectivity fallback. `dungeon.ts` owns the 9×9 floor graph. Room contents are generated once from a room seed.
- Wave and nest state live on the room: `wave`, `maxWaves`, nest obstacles with `hp` and `spawnTimer`. A room cannot clear while nests remain; waves spawn from the room's seeded theme pool.
- One `Game` object owns run, floor, room, player, meta and UI phase. Rendering is read-only.
- Persistence: `boundbelow.meta.v2` (settings, stats, achievements, discoveries, selected character, daily state, intro seen) with a legacy migration from the old best-run record.
- Test hooks (never used by gameplay): `?testRoom=start|combat|treasure|shop|boss|library|vault|sacrifice|challenge|secret|secretreveal`, `?testSeed=`, `?floor=0..4`, `?testPower=1`, `?testCharacter=wren|moth|cinder|choir`, `?testItem=<item-id>`, `?testCurse=darkness|swarm|famine`, `?testTransform=stitch|wax|drowned|gilt|ash|hollow`, `?testTrue=1`, `?touch=1`, `?clearRecord=1`, and `globalThis.__OHMYGAME_PLAYTEST__` with snapshot/reset/setSeed/step/jump.
- Responsive input: keyboard, mouse aim/shoot, pointer virtual sticks, gamepad polling, pause/menu gating. Audio is unlocked on first gesture.
- Relative `base: "./"` Vite build; no runtime dependency beyond the framework.
- Android: Capacitor WebView wrapper, package `com.boundbelow.game`, version 3.0.1 (`versionCode 9`), min API 24, target API 36, `fullSensor` portrait/landscape, immersive fullscreen, adaptive launcher icon and orientation-specific splash art. The signed 3.0.1 APK lives in `share/BOUND-BELOW-3.0.1.apk`; store bundles are rebuilt from the same source.
- Native touch detection treats Android/embedded Capacitor shells as touch-first even when the WebView reports a mouse-like pointer, so the skill, relic, bomb and pause controls stay reachable.
- Playgama Bridge 2.3.1 is bundled locally; initialization, Storage, `game_ready`, pause/audio events, an end-of-run interstitial and product/performance telemetry are integrated. The Playgama archive is built from `dist/`; store assets live in `store/`.
