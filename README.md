# BOUND BELOW

**Version 3.0 — The Deep House.** A much larger content pass: 28 room layouts, 30 enemies, 108 items, 4 child skills and 6 minibosses.

A hand-inked, top-down roguelike descent for the browser. A small child follows a red thread under the floorboards through five chapters of basement: clear rooms, choose relics, break rock with bombs, unlock the reliquary, bargain at the altar, and put down the keeper of each floor.

Built with **Canvas 2D + TypeScript + Vite**. All gameplay art, tiles, icons, HUD and SFX are drawn or synthesized in code; the title screen, five chapter plates and four character portraits are original generated ink illustrations. There are no runtime asset or framework dependencies.

## Play

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

The build writes a static, relative-path site to `dist/` and can be hosted anywhere.

## Controls

| Action | Keyboard / mouse | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | `WASD` | left stick / d-pad | left thumb joystick |
| Weep tears | arrow keys, or hold the left mouse button | right stick | right thumb joystick |
| Place bomb | `E` / `Space` | face button 0 | bomb button |
| Use active relic | `Q` | face button 1 (B) | active button |
| Use child skill | `F` / `Shift` | face button 2 (X) | skill button |
| Pause / options | `Esc` / `P` | Start | pause button |
| Mute | `M` / pause menu | — | pause menu |

Menus pause the run. Combat doors drop iron portcullises until the room is quiet. Keys open the reliquary and vault; coins buy from the chapman and the library. Hearts are half-hearts. The trapdoor only opens when the chapter's keeper falls.

The game is designed for a wide view and plays best in landscape on phones. Portrait still works and shows a rotate hint.

## A run

- 5 chapters: **The Cellar → The Ossuary → The Drowned Gallery → The Bone Orchard → The Hollow**
- 4 playable children: **Wren**, **Moth**, **Cinder**, **Choir** — each with a different body, stat line and starting loadout; Moth, Cinder and Choir unlock through the Ledger
- 5 main bosses and 6 challenge minibosses, each with phase changes; the main bosses and the four new servants have voiced introductions
- 30 enemy types, including ranged, charging, phasing, nest-spawning, teleporting and splitting threats, plus six elite rules
- 10 room types: start, combat, treasure, shop, boss, secret, sacrifice, challenge, library and vault
- 28 room furniture layouts, 8 interior dressings and 8 encounter rules (waves, nests, ambush, elite, hazard, pincer, swarm, standard)
- 108 items: 62 relics, 24 active relics (Q / gamepad / touch) and 22 trinkets
- 4 character skills with cooldowns: Thread Pull, Dust Veil, Cinder Bloom and Requiem
- 6 transformations: The Stitch, Waxbound, The Drowned Choir, The Gilded, Ashbound and The Hollowed
- 3 curses: Darkness, Swarm and Famine
- 30 Ledger marks, a bestiary with live canvas thumbnails, stats, options and character unlocks
- seeded 13–17 room floors, a shared daily descent, true-ending detection and death/victory summaries
- fully voiced opening, chapter, boss and miniboss narration (28 lines) with skippable captions; death has no voice line
- responsive keyboard/mouse/gamepad/touch input, assist mode and reduced-motion-friendly effects

## Structure

```
src/game/
  game.ts        run state, rooms, progression, child skills, active relics, rendering glue
  dungeon.ts     seeded room-grid generation, curses, secret rooms
  roomLayouts.ts 28 furniture layouts, interior pools, obstacles, connectivity fallback
  characters.ts  four playable children, stats and starting loadouts
  meta.ts        persistent marks, stats, settings, daily seed, unlock rules
  enemies.ts     enemy AI, elites and spawning
  bosses.ts      boss registry, phases and shared boss rules
  bosses2.ts     Drowned Choir, Rootbound Matron and six miniboss state machines
  roomRender.ts  cached hand-inked tiles, walls, doors and lighting
  art.ts         children, enemies, bosses, pickups, props and projectile drawing
  items.ts       108 relics/actives/trinkets, motifs and icons
  hud.ts         hearts, counters, minimap, active/trinket slots, boss bar, banners
  ui.ts          title, voiced intro, chapter, pause, Ledger and run-summary screens
  input.ts       keyboard, mouse, gamepad and dual-thumb touch input
  audio.ts       WebAudio synthesis, ambient beds and danger layer
  voice.ts       narration playback and intro queue
  bestiary.ts    enemy/boss lore and thumbnails
  vo-script.json 28 narration lines used by the VO build script
src/assets/      generated title/chapter/portrait art plus local OFL fonts
public/audio/vo/ generated narration MP3s
canvas/          design document, mockups and production-art provenance
tools/           one-shot QA/import scripts, including generate_vo.py
```

## QA hooks

These are test-only and never required by normal gameplay:

- `?testRoom=start|combat|treasure|shop|boss|library|vault|sacrifice|challenge|secret|secretreveal`
- `?testSeed=QA&floor=0|1|2|3|4`
- `?testPower=1` makes the QA state survivable and fast to clear
- `?testCharacter=wren|moth|cinder|choir` unlocks a character for visual/loadout QA
- `?testCurse=darkness|swarm|famine` forces a floor curse
- `?testTransform=stitch|wax|drowned|gilt|ash|hollow` grants a tagged set for transformation QA
- `?testTrue=1` grants the Second Thread for ending QA
- `?testItem=storm-hymn` grants an item/active for inspection QA
- `?touch=1` forces the touch controls on a desktop viewport
- `?clearRecord=1` clears the local best-run record
- `window.__OHMYGAME_PLAYTEST__` exposes `snapshot`, `reset`, `setSeed`, `step` and a room jump helper for automation.

## Art & licensing

The game is an original work in the basement-roguelike genre. Game code, drawings, item names, bosses, characters and level content are original. It is not affiliated with, or endorsed by, the creators of *The Binding of Isaac*; no art, audio or code from that game is included. The project was inspired by the genre and by the public reference implementation shared for study (`liyupi/binding-of-isaac-webgame`).

Title, chapter and portrait illustrations were generated for this project. Narration was generated with **Deepgram Flux TTS, voice Colin** (British narrator); the build script reads the API key from `DEEPGRAM_API_KEY` and never stores it in source. The 3.0 script adds four miniboss lines and four child-specific low-health lines, and deliberately has no death line. Set `DEEPGRAM_VOICE_MODEL` to audition another Flux voice (for example `flux-cliff-en`) and `DEEPGRAM_EXPRESSIVITY` to change the delivery. Typography uses [IM Fell English SC](https://fonts.google.com/specimen/IM+Fell+English+SC) and [Alegreya](https://fonts.google.com/specimen/Alegreya), both under the SIL Open Font License. The license texts are served at `/licenses/` and included in the build.


## Playgama

**Published sandbox:** https://playgama.ai/play/6tw4d5iec7nisx

The game is integrated with **Playgama Bridge 2.3.1** (bundled at `public/playgama-bridge.js`): initialization, cloud Storage for the Ledger, `game_ready`, pause/audio events, an end-of-run interstitial, and product/performance telemetry are wired. The 3.0 build is generated locally from `dist/`; the developer-console draft is **BOUND BELOW** (application `cmvnew8lk18lgih0hlaa2t1f2`).

Store media is in `store/`: `icon-800.png`, the three required covers and four 1920×1080 hook screenshots. Playgama's MCP exposes cover upload but not screenshot upload, so the screenshots are ready for manual console upload.

Sandbox share text:

> Made with AI. Brought to you by #PlaygamaMCP. Fine-tuned by me. BOUND BELOW → https://playgama.ai/play/6tw4d5iec7nisx
> #playgama #PlaygamaMCP #webdev #gamedev


## Android APK / Play Store

The Android wrapper source is in `android/`. The current signed APK is:

- `share/BOUND-BELOW-3.0.0.apk` — current direct install / testers (versionCode 8)
- `share/README-ANDROID.md` — install, signing and Play Console checklist
- `share/play-store/` — 512 icon, 1024×500 feature graphic, screenshots and listing copy

Package `com.boundbelow.game`, version `3.0.0` (`versionCode 8`), min API 24, target API 36.
The Android wrapper is Capacitor with `fullSensor` orientation, fullscreen WebView, adaptive
launcher icon and portrait/landscape splashes. The 3.0 touch layer adds a cooldown skill button
alongside the floating D-pad, weep stick, bomb and active-relic buttons.

The APK is built locally from `dist/`; binaries are excluded from git. To rebuild:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
```

The legacy `BOUND-BELOW-2.0.5.aab` is kept only as an old Play Store upload; rebuild the bundle
from the 3.0 source before shipping a store release.

Signing keys and `keystore.properties` are excluded from git (see `.gitignore`).
