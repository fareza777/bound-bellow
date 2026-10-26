import type { Game } from "./game";
import {
  ACTIVES,
  ITEM_BY_ID,
  ITEM_COUNT,
  RELICS,
  TRINKETS,
  itemIconCanvas,
  itemKind,
  type ItemDef,
} from "./items";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  achievementCount,
  characterUnlocked,
  characterUnlockText,
  ensureDaily,
  randomSeedText,
  saveMeta,
  type AchievementDef,
  type MetaState,
} from "./meta";
import { CHARACTERS, CHARACTER_BY_ID, getCharacter, type CharacterDef } from "./characters";
import { CHAPTER_IMAGES, type Theme } from "./theme";
import { BOSS_NAMES } from "./bosses";
import { BOSS_LORE, BOSS_ORDER, ENEMY_INFO, ENEMY_ORDER, bossThumb, enemyThumb } from "./bestiary";
import { introNarration } from "./voice";
import { roman } from "./util";

type ScreenName = "title" | "intro" | "chapter" | "pause" | "end" | "ledger" | null;
type IntroMode = "run" | "title";
type LedgerTab = "characters" | "relics" | "bestiary" | "marks" | "stats" | "options";
type LedgerReturn = "title" | "pause" | "end";

const TITLE_ART = new URL("../assets/title-key.jpg", import.meta.url).href;

const LEDGER_TABS: { id: LedgerTab; label: string }[] = [
  { id: "characters", label: "Characters" },
  { id: "relics", label: "Relics" },
  { id: "bestiary", label: "Bestiary" },
  { id: "marks", label: "Marks" },
  { id: "stats", label: "Stats" },
  { id: "options", label: "Options" },
];

const CURSE_LABELS: Record<string, string> = {
  darkness: "Darkness",
  swarm: "Swarm",
  famine: "Famine",
};

export class UI {
  private screens: Record<Exclude<ScreenName, null>, HTMLElement>;
  private app = document.getElementById("app")!;
  private seedInput = document.getElementById("seed-input") as HTMLInputElement;
  private helpPanel = document.getElementById("title-help") as HTMLElement;
  private helpButton = document.getElementById("btn-help") as HTMLButtonElement;
  private pauseItems = document.getElementById("pause-items") as HTMLElement;
  private pauseEmpty = document.getElementById("pause-empty") as HTMLElement;
  private pauseExtra = document.getElementById("pause-extra") as HTMLElement;
  private endItems = document.getElementById("end-items") as HTMLElement;
  private endEmpty = document.getElementById("end-empty") as HTMLElement;
  private muteButton = document.getElementById("btn-mute") as HTMLButtonElement;
  private touchUI = document.getElementById("touch-ui") as HTMLElement;
  private touchBombCount = document.getElementById("touch-bomb-count") as HTMLElement;
  private touchActive = document.getElementById("btn-touch-active") as HTMLButtonElement;
  private touchActiveCount = document.getElementById("touch-active-count") as HTMLElement;
  private touchActiveGlyph = this.touchActive.querySelector(".touch-active-glyph") as HTMLElement;
  private touchSkill = document.getElementById("btn-touch-skill") as HTMLButtonElement;
  private touchSkillCount = document.getElementById("touch-skill-count") as HTMLElement;
  private toastLayer = document.getElementById("toast-layer") as HTMLElement;
  private ledgerBody = document.getElementById("ledger-body") as HTMLElement;
  private ledgerTabs = document.getElementById("ledger-tabs") as HTMLElement;
  private ledgerSub = document.getElementById("ledger-sub") as HTMLElement;
  private ledgerReturn: LedgerReturn = "title";
  private ledgerTab: LedgerTab = "characters";
  private resetArmed = false;
  private resetTimer: number | null = null;

  private introFrame: HTMLElement;
  private introArt: HTMLElement;
  private introImage: HTMLImageElement;
  private introSpeaker: HTMLElement;
  private introLine: HTMLElement;
  private introDots: HTMLElement;
  private introLogo: HTMLElement;
  private introLogoLine: HTMLElement;
  private introDone: HTMLButtonElement;
  private introNext: HTMLButtonElement;
  private introMode: IntroMode = "run";
  private introStep = 0;
  private introLogoShown = false;
  private introTimers: number[] = [];
  private introLines = introNarration();

  private current: ScreenName = null;
  private card: Theme | null = null;
  private abandonArmed = false;
  private abandonTimer: number | null = null;
  private chapterVoiceTimer: number | null = null;
  private lastEndWin = false;
  private lastEndTrue = false;
  private lastActiveId: string | null = null;
  private lastActiveCharges = -1;
  private lastSkillBucket = -1;

  constructor(private game: Game) {
    this.screens = {
      title: document.getElementById("screen-title") as HTMLElement,
      intro: document.getElementById("screen-intro") as HTMLElement,
      chapter: document.getElementById("screen-chapter") as HTMLElement,
      pause: document.getElementById("screen-pause") as HTMLElement,
      end: document.getElementById("screen-end") as HTMLElement,
      ledger: document.getElementById("screen-ledger") as HTMLElement,
    };
    this.introFrame = this.screens.intro.querySelector(".intro-frame") as HTMLElement;
    this.introArt = document.getElementById("intro-art") as HTMLElement;
    this.introImage = document.getElementById("intro-image") as HTMLImageElement;
    this.introSpeaker = document.getElementById("intro-speaker") as HTMLElement;
    this.introLine = document.getElementById("intro-line") as HTMLElement;
    this.introDots = document.getElementById("intro-dots") as HTMLElement;
    this.introLogo = document.getElementById("intro-logo") as HTMLElement;
    this.introLogoLine = document.getElementById("intro-logo-line") as HTMLElement;
    this.introDone = document.getElementById("btn-intro-done") as HTMLButtonElement;
    this.introNext = document.getElementById("btn-intro-next") as HTMLButtonElement;
    this.touchActive = document.getElementById("btn-touch-active") as HTMLButtonElement;
    this.buildLedgerTabs();
    this.bind();
    this.updateMuteButton();
    this.updateTitle();
  }

  private bind(): void {
    document.getElementById("btn-start")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.beginRunFromTitle(this.seedInput.value);
    });
    this.seedInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.game.audio.play("click");
        this.game.beginRunFromTitle(this.seedInput.value);
      }
    });
    document.getElementById("btn-dice")?.addEventListener("click", () => {
      this.seedInput.value = randomSeedText();
      this.game.audio.play("click");
      this.seedInput.focus();
    });
    document.getElementById("btn-character")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.openLedger("title", "characters");
    });
    document.getElementById("btn-ledger")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.openLedger("title");
    });
    document.getElementById("btn-daily")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.startDailyRun();
    });
    document.getElementById("btn-opening")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.playOpening();
    });
    this.helpButton.addEventListener("click", () => {
      const open = this.helpPanel.hidden;
      this.helpPanel.hidden = !open;
      this.helpButton.setAttribute("aria-expanded", String(open));
      this.helpButton.textContent = open ? "Close the book" : "How to play";
      this.game.audio.play("click");
    });
    document.getElementById("btn-chapter")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.continueChapter();
    });
    document.getElementById("btn-resume")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.resume();
    });
    document.getElementById("btn-ledger-pause")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.openLedger("pause", "relics");
    });
    this.muteButton.addEventListener("click", () => {
      this.game.audio.unlock();
      this.game.toggleMute();
      this.game.audio.play("click");
    });
    document.getElementById("btn-abandon")?.addEventListener("click", () => {
      this.game.audio.play("click");
      if (!this.abandonArmed) {
        this.armAbandon();
        return;
      }
      this.resetAbandon();
      this.game.abandonRun();
    });
    document.getElementById("btn-again")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.restartRun();
    });
    document.getElementById("btn-title")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.toTitle();
    });
    document.getElementById("btn-end-ledger")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.openLedger("end", "stats");
    });
    document.getElementById("btn-touch-bomb")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.game.input.queueBomb();
      this.game.audio.unlock();
    });
    document.getElementById("btn-touch-active")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.game.audio.unlock();
      this.game.useActiveItem();
    });
    document.getElementById("btn-touch-skill")?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.game.audio.unlock();
      this.game.useSkill();
    });
    document.getElementById("btn-touch-pause")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.game.pause();
    });

    this.introNext.addEventListener("click", () => {
      this.game.audio.play("click");
      this.advanceIntro();
    });
    document.getElementById("btn-intro-skip")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.finishIntro();
    });
    this.introDone.addEventListener("click", () => {
      this.game.audio.play("click");
      this.finishIntro();
    });

    this.ledgerTabs.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest("[data-tab]") as HTMLElement | null;
      if (!button) return;
      this.game.audio.play("click");
      this.renderLedger(button.dataset.tab as LedgerTab);
    });
    document.getElementById("btn-ledger-close")?.addEventListener("click", () => {
      this.game.audio.play("click");
      this.closeLedger();
    });
    this.ledgerBody.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const choose = target.closest("[data-choose-character]") as HTMLElement | null;
      if (choose) {
        const id = choose.dataset.chooseCharacter as CharacterDef["id"];
        if (this.game.selectCharacter(id)) {
          this.game.audio.play("item");
          this.renderLedger("characters");
          this.updateTitle();
        } else {
          this.game.audio.play("locked");
        }
        return;
      }
      const option = target.closest("[data-option]") as HTMLElement | null;
      if (option) {
        this.toggleOption(option.dataset.option ?? "");
        return;
      }
      if (target.closest("[data-action='reset-progress']")) {
        if (this.game.meta.record.runs === 0 && !this.resetArmed) {
          this.game.audio.play("locked");
          return;
        }
        if (!this.resetArmed) {
          this.resetArmed = true;
          if (this.resetTimer) window.clearTimeout(this.resetTimer);
          this.resetTimer = window.setTimeout(() => {
            this.resetArmed = false;
            if (this.current === "ledger" && this.ledgerTab === "options") this.renderLedger("options");
          }, 4000);
          this.renderLedger("options");
        } else {
          this.resetArmed = false;
          this.game.resetProgress();
          this.game.audio.play("door");
          this.closeLedger();
        }
      }
    });
    this.ledgerBody.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.option !== "shake") return;
      this.game.meta.settings.shake = Number(target.value) / 100;
      this.game.applySettings();
      saveMeta(this.game.meta);
      const value = this.ledgerBody.querySelector("[data-shake-value]");
      if (value) value.textContent = `${target.value}%`;
    });

    window.addEventListener("keydown", (e) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (this.current === "ledger") {
        if (e.key === "Escape") {
          e.preventDefault();
          this.closeLedger();
        }
        return;
      }
      if (this.game.phase === "intro") {
        if (e.key === "Escape") {
          e.preventDefault();
          this.finishIntro();
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.advanceIntro();
        }
        return;
      }
      if (typing && e.key !== "Enter") return;
      if (target?.closest("button, a") && (e.key === "Enter" || e.key === " ")) return;
      if (e.key === "Escape" || e.key === "Esc" || e.key.toLowerCase() === "p") {
        if (this.game.phase === "playing") {
          e.preventDefault();
          this.game.pause();
        } else if (this.game.phase === "paused") {
          e.preventDefault();
          this.game.resume();
        }
        return;
      }
      if (e.key === "Enter") {
        if (typing) return;
        if (this.game.phase === "title") {
          e.preventDefault();
          this.game.beginRunFromTitle(this.seedInput.value);
        } else if (this.game.phase === "chapter") {
          e.preventDefault();
          this.game.continueChapter();
        } else if (this.game.phase === "dead" || this.game.phase === "victory") {
          e.preventDefault();
          this.game.restartRun();
        }
      }
    });
  }

  updateMuteButton(): void {
    const muted = this.game.muted;
    this.muteButton.textContent = muted ? "Sound: off" : "Sound: on";
    this.muteButton.setAttribute("aria-pressed", String(muted));
  }

  updateTitle(): void {
    const meta = this.game.meta;
    const selected = getCharacter(meta.selectedCharacter);
    const record = document.getElementById("title-record");
    if (record) {
      const collected = this.collectedCount(meta);
      record.textContent =
        meta.record.runs === 0
          ? "No descent recorded yet"
          : `Deepest floor ${roman(meta.record.deepest || 1)} · ${meta.record.wins} ${meta.record.wins === 1 ? "victory" : "victories"} · ${collected}/${ITEM_COUNT} relics found · ${achievementCount(meta)} marks`;
    }
    const portrait = document.getElementById("title-character-portrait") as HTMLImageElement | null;
    if (portrait) {
      portrait.src = selected.portrait;
      portrait.alt = `${selected.name} portrait`;
    }
    const name = document.getElementById("title-character-name");
    const epithet = document.getElementById("title-character-epithet");
    if (name) name.textContent = selected.name;
    if (epithet) epithet.textContent = selected.epithet;
    const daily = ensureDaily(meta);
    const dailyButton = document.getElementById("btn-daily");
    if (dailyButton) {
      const complete = daily.completed && daily.date === todayKey();
      dailyButton.textContent = complete ? "Daily cleared" : "Daily descent";
      dailyButton.title = `Daily seed ${daily.seedText}`;
    }
    const note = document.querySelector(".title-note");
    if (note) note.textContent = `${meta.settings.voice ? "Fully voiced" : "Voice off"}. A run lasts 30–50 minutes.`;
    this.seedInput.value = "";
    this.seedInput.placeholder = this.game.lastSeedText || "the house chooses";
  }

  showTitle(): void {
    this.current = "title";
    this.clearChapterVoice();
    this.showOnly("title");
    this.updateTitle();
    this.helpPanel.hidden = true;
    this.helpButton.setAttribute("aria-expanded", "false");
    this.helpButton.textContent = "How to play";
    this.app.classList.remove("touch-active");
    this.game.audio.setDucked(false);
    this.updateMuteButton();
  }

  showChapter(theme: Theme): void {
    this.current = "chapter";
    this.card = theme;
    this.clearChapterVoice();
    const art = document.getElementById("chapter-art");
    if (art) art.dataset.floor = String(theme.index);
    document.getElementById("chapter-kicker")!.textContent = `Chapter ${theme.numeral}`;
    document.getElementById("chapter-title")!.textContent = theme.name;
    document.getElementById("chapter-line")!.textContent = theme.line;
    document.getElementById("chapter-meta")!.textContent =
      `Floor ${roman(theme.index + 1)} of V · ${theme.tagline}` +
      (this.game.runDaily ? " · Daily descent" : "");
    const curse = this.game.floor?.curse ?? null;
    const curseEl = document.getElementById("chapter-curse");
    if (curseEl) {
      curseEl.hidden = !curse;
      curseEl.textContent = curse ? `Curse · ${CURSE_LABELS[curse] ?? curse}` : "";
    }
    this.showOnly("chapter");
    this.app.classList.remove("touch-active");
    this.game.audio.setDucked(false);
    if (this.game.voice.enabled) {
      this.chapterVoiceTimer = window.setTimeout(() => {
        if (this.current === "chapter") {
          this.game.voice.play(`chapter-${theme.index}`, { interrupt: true });
        }
      }, 550);
    }
    setTimeout(() => {
      (document.getElementById("btn-chapter") as HTMLButtonElement | null)?.focus({ preventScroll: true });
    }, 80);
  }

  showPause(): void {
    this.current = "pause";
    this.resetAbandon();
    const p = this.game.player;
    const curse = this.game.floor?.curse;
    document.getElementById("pause-sub")!.textContent = this.game.theme
      ? `Floor ${roman(this.game.run.floor + 1)} · ${this.game.theme.name}${curse ? ` · ${CURSE_LABELS[curse]}` : ""} · ${getCharacter(p.character).name}`
      : "The house waits.";
    this.pauseItems.innerHTML = "";
    const items = p.items.map((id) => ITEM_BY_ID.get(id)).filter(Boolean) as ItemDef[];
    this.pauseEmpty.hidden = items.length > 0;
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "relic";
      const icon = document.createElement("span");
      icon.className = "relic-icon";
      icon.appendChild(itemIconCanvas(item.id, 26));
      const text = document.createElement("span");
      const name = document.createElement("span");
      name.className = "relic-name";
      name.textContent = item.name;
      const desc = document.createElement("span");
      desc.className = "relic-desc";
      desc.textContent = `${itemKind(item).toUpperCase()} · ${item.desc}`;
      text.append(name, desc);
      li.append(icon, text);
      this.pauseItems.appendChild(li);
    }
    this.pauseExtra.innerHTML = "";
    this.addPauseChip("Thread", getCharacter(p.character).name);
    const threadSkill = getCharacter(p.character).skill;
    this.addPauseChip(
      "Skill",
      `${threadSkill.name} · F / gamepad X${p.skillCd > 0.05 ? ` · ${p.skillCd.toFixed(1)}s` : " · ready"}`,
    );
    if (p.activeItem) {
      const def = ITEM_BY_ID.get(p.activeItem);
      const max = def?.maxCharges ?? 0;
      this.addPauseChip("Active", `${def?.name ?? p.activeItem} ${p.activeCharges}/${max}`);
    }
    if (curse) this.addPauseChip("Curse", CURSE_LABELS[curse] ?? curse);
    if (p.items.filter((id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as ItemDef)) === "trinket").length) {
      this.addPauseChip(
        "Charms",
        p.items
          .filter((id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as ItemDef)) === "trinket")
          .map((id) => ITEM_BY_ID.get(id)?.name ?? id)
          .join(" · "),
      );
    }
    if (p.transformations.length) {
      this.addPauseChip("Sets", p.transformations.join(" · "));
    }
    document.getElementById("pause-seed")!.textContent =
      `${this.game.runDaily ? "DAILY DESCENT · " : ""}Seed ${this.game.lastSeedText} · ${p.coins} coins · ${p.bombs} bombs · ${p.keys} keys · ${this.game.meta.record.wins} victories recorded`;
    this.showOnly("pause");
    this.app.classList.remove("touch-active");
    this.game.audio.setDucked(true);
    this.updateMuteButton();
    setTimeout(() => {
      (document.getElementById("btn-resume") as HTMLButtonElement | null)?.focus({ preventScroll: true });
    }, 60);
  }

  showEnd(win: boolean, trueEnding = false): void {
    this.current = "end";
    this.lastEndWin = win;
    this.lastEndTrue = trueEnding;
    const g = this.game;
    const art = document.getElementById("end-art");
    if (art) {
      art.dataset.win = String(win);
      art.dataset.true = String(trueEnding);
    }
    document.getElementById("end-kicker")!.textContent = trueEnding
      ? "The thread is cut"
      : win
        ? "The thread reaches the end"
        : "The thread snaps";
    document.getElementById("end-title")!.textContent = win ? "Unbound" : "Bound below";
    document.getElementById("end-line")!.textContent = trueEnding
      ? "The child cuts the thread. The house exhales. Below, something opens its eyes for the first time and calls them sibling."
      : win
        ? "The heart stops. The house is suddenly only a house, and the red thread goes slack. Above, a door opens on daylight."
        : "The dark closes over the thread. Somewhere above, someone will find the other end of it in the morning.";
    document.getElementById("stat-floor")!.textContent = roman(g.run.floor + 1);
    document.getElementById("stat-time")!.textContent = formatClock(g.run.time);
    document.getElementById("stat-rooms")!.textContent = String(g.run.rooms);
    document.getElementById("stat-relics")!.textContent = String(g.player.items.length);
    document.getElementById("stat-kills")!.textContent = String(g.run.kills);

    this.endItems.innerHTML = "";
    const items = g.player.items.map((id) => ITEM_BY_ID.get(id)).filter(Boolean) as ItemDef[];
    this.endEmpty.hidden = items.length > 0;
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "relic";
      const icon = document.createElement("span");
      icon.className = "relic-icon";
      icon.appendChild(itemIconCanvas(item.id, 24));
      const text = document.createElement("span");
      const name = document.createElement("span");
      name.className = "relic-name";
      name.textContent = item.name;
      const desc = document.createElement("span");
      desc.className = "relic-desc";
      desc.textContent = `${itemKind(item).toUpperCase()} · ${item.desc}`;
      text.append(name, desc);
      li.append(icon, text);
      this.endItems.appendChild(li);
    }
    const character = getCharacter(g.run.character);
    document.getElementById("end-seed")!.textContent = `Seed ${g.lastSeedText} · ${character.name} · Floor ${roman(g.run.floor + 1)} · ${g.meta.record.wins} victories recorded`;
    this.showOnly("end");
    this.app.classList.remove("touch-active");
    this.game.audio.setDucked(true);
    setTimeout(() => {
      (document.getElementById("btn-again") as HTMLButtonElement | null)?.focus({ preventScroll: true });
    }, 80);
  }

  hideScreens(): void {
    this.current = null;
    this.clearChapterVoice();
    for (const screen of Object.values(this.screens)) screen.hidden = true;
    const focused = document.activeElement as HTMLElement | null;
    if (focused && focused !== document.body) focused.blur();
    this.app.classList.toggle("touch-active", this.game.input.hasTouch);
    this.app.classList.add("in-run");
    this.game.audio.setDucked(false);
  }

  setBombCount(count: number): void {
    this.touchBombCount.textContent = String(count);
  }

  setSkill(cooldown: number, max: number): void {
    const bucket = Math.max(0, Math.ceil(cooldown * 2));
    const cooling = cooldown > 0.05;
    this.touchSkill.classList.toggle("is-cooling", cooling);
    this.touchSkill.setAttribute(
      "aria-label",
      cooling ? `Skill recharging ${cooldown.toFixed(1)} seconds` : "Use character skill",
    );
    if (bucket !== this.lastSkillBucket) {
      this.lastSkillBucket = bucket;
      this.touchSkillCount.textContent = cooling ? `${cooldown.toFixed(1)}s` : "READY";
    }
    this.touchSkill.style.setProperty("--skill-ready", cooling ? "0" : "1");
    void max;
  }

  setActiveItem(itemId: string | null, charges: number, max: number): void {
    if (itemId === this.lastActiveId && charges === this.lastActiveCharges) return;
    this.lastActiveId = itemId;
    this.lastActiveCharges = charges;
    if (!itemId) {
      this.touchActive.classList.remove("is-visible");
      return;
    }
    const def = ITEM_BY_ID.get(itemId);
    this.touchActive.classList.add("is-visible");
    this.touchActive.classList.toggle("is-empty", charges <= 0);
    this.touchActive.setAttribute("aria-label", `Use ${def?.name ?? "active relic"}`);
    this.touchActiveCount.textContent = `${charges}/${max}`;
    this.touchActiveGlyph.innerHTML = "";
    this.touchActiveGlyph.appendChild(itemIconCanvas(itemId, 28));
    this.touchActiveGlyph.style.fontSize = "0";
  }

  showAchievementToast(def: AchievementDef): void {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    const mark = document.createElement("span");
    mark.className = "achievement-toast-mark";
    mark.textContent = "✦";
    const copy = document.createElement("div");
    const kicker = document.createElement("div");
    kicker.className = "toast-kicker";
    kicker.textContent = "A mark in the ledger";
    const name = document.createElement("strong");
    name.textContent = def.name;
    const desc = document.createElement("span");
    desc.textContent = def.desc;
    copy.append(kicker, name, desc);
    toast.append(mark, copy);
    this.toastLayer.appendChild(toast);
    this.game.audio.play("item");
    while (this.toastLayer.childElementCount > 4) {
      this.toastLayer.firstElementChild?.remove();
    }
    window.setTimeout(() => {
      toast.classList.add("is-out");
      window.setTimeout(() => toast.remove(), 400);
    }, 5200);
  }

  playIntro(mode: IntroMode): void {
    this.current = "intro";
    this.introMode = mode;
    this.introStep = 0;
    this.introLogoShown = false;
    this.introLines = introNarration();
    this.introFrame.hidden = false;
    this.introLogo.hidden = true;
    this.introLogoLine.textContent = "Five chapters. One red thread.";
    this.showOnly("intro");
    this.app.classList.remove("touch-active");
    this.game.audio.setDucked(false);
    this.renderIntroStep();
  }

  private renderIntroStep(): void {
    this.clearIntroTimers();
    this.introFrame.hidden = false;
    this.introLogo.hidden = true;
    const line = this.introLines[this.introStep];
    if (!line) {
      this.showIntroLogo();
      return;
    }
    const art = this.introStep === 0 ? TITLE_ART : CHAPTER_IMAGES[Math.min(this.introStep, CHAPTER_IMAGES.length - 1)];
    this.setIntroArt(art);
    this.introSpeaker.textContent = line.speaker;
    this.introLine.textContent = line.text;
    this.introNext.textContent = this.introStep >= this.introLines.length - 1 ? "The thread pulls" : "Next";
    this.introDots.innerHTML = "";
    for (let i = 0; i < this.introLines.length; i++) {
      const dot = document.createElement("span");
      dot.className = `intro-dot${i === this.introStep ? " is-active" : ""}`;
      this.introDots.appendChild(dot);
    }
    if (this.game.voice.enabled) {
      const started = this.game.voice.play(line.key, {
        interrupt: true,
        onEnd: () => this.scheduleIntroAdvance(1200),
      });
      if (started) {
        this.introTimers.push(
          window.setTimeout(() => this.advanceIntro(), Math.max(2800, line.est * 1000 + 4200)),
        );
        return;
      }
    }
    this.introTimers.push(
      window.setTimeout(() => this.advanceIntro(), Math.max(2600, line.est * 1000 + 900)),
    );
  }

  private setIntroArt(url: string): void {
    this.introImage.src = url;
    try {
      this.introImage.animate([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: 900,
        easing: "ease",
      });
    } catch {
      /* Web Animations not available */
    }
  }

  private scheduleIntroAdvance(ms: number): void {
    this.clearIntroTimers();
    this.introTimers.push(window.setTimeout(() => this.advanceIntro(), ms));
  }

  private advanceIntro(): void {
    if (this.current !== "intro") return;
    this.game.voice.stop();
    this.clearIntroTimers();
    if (this.introLogoShown) {
      this.finishIntro();
      return;
    }
    if (this.introStep < this.introLines.length - 1) {
      this.introStep += 1;
      this.renderIntroStep();
    } else {
      this.showIntroLogo();
    }
  }

  private showIntroLogo(): void {
    this.game.voice.stop();
    this.clearIntroTimers();
    this.introLogoShown = true;
    this.introFrame.hidden = true;
    this.introLogo.hidden = false;
    this.setIntroArt(CHAPTER_IMAGES[CHAPTER_IMAGES.length - 1] ?? TITLE_ART);
    this.introDone.textContent = this.introMode === "run" ? "Follow the thread" : "Return to the title";
    this.introLogoLine.textContent =
      this.introMode === "run" ? "Five chapters. One red thread. Keep it." : "Five chapters. One red thread.";
    this.introDone.focus({ preventScroll: true });
  }

  private finishIntro(): void {
    if (this.current !== "intro") return;
    this.game.voice.stop();
    this.clearIntroTimers();
    this.current = null;
    this.introFrame.hidden = false;
    this.introLogo.hidden = true;
    this.game.finishIntro(this.introMode);
  }

  private clearIntroTimers(): void {
    for (const timer of this.introTimers) window.clearTimeout(timer);
    this.introTimers = [];
  }

  private clearChapterVoice(): void {
    if (this.chapterVoiceTimer) {
      window.clearTimeout(this.chapterVoiceTimer);
      this.chapterVoiceTimer = null;
    }
  }

  openLedger(returnTo: LedgerReturn, tab: LedgerTab = "characters"): void {
    this.ledgerReturn = returnTo;
    this.current = "ledger";
    this.game.voice.stop();
    this.ledgerSub.textContent =
      returnTo === "title"
        ? `${this.game.meta.record.runs} descents · ${this.game.meta.record.wins} victories · ${achievementCount(this.game.meta)} marks`
        : "The house is paused. The ledger is still open.";
    this.clearChapterVoice();
    this.showOnly("ledger");
    this.app.classList.remove("touch-active");
    this.game.audio.setDucked(true);
    this.renderLedger(tab);
    setTimeout(() => {
      const close = document.getElementById("btn-ledger-close");
      close?.focus({ preventScroll: true });
    }, 40);
  }

  private closeLedger(): void {
    this.clearResetTimer();
    this.resetArmed = false;
    this.game.audio.setDucked(false);
    if (this.ledgerReturn === "title") {
      this.showTitle();
      this.game.voice.setEnabled(this.game.meta.settings.voice);
    } else if (this.ledgerReturn === "pause") {
      this.showPause();
    } else {
      this.showEnd(this.lastEndWin, this.lastEndTrue);
    }
    this.updateTitle();
  }

  private buildLedgerTabs(): void {
    this.ledgerTabs.innerHTML = "";
    for (const tab of LEDGER_TABS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ledger-tab";
      button.dataset.tab = tab.id;
      button.textContent = tab.label;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", "false");
      this.ledgerTabs.appendChild(button);
    }
  }

  private renderLedger(tab: LedgerTab): void {
    this.ledgerTab = tab;
    for (const button of Array.from(this.ledgerTabs.querySelectorAll<HTMLElement>("[data-tab]"))) {
      button.setAttribute("aria-selected", String(button.dataset.tab === tab));
    }
    this.ledgerBody.scrollTop = 0;
    this.ledgerBody.innerHTML = "";
    switch (tab) {
      case "characters":
        this.renderCharacters();
        break;
      case "relics":
        this.renderRelics();
        break;
      case "bestiary":
        this.renderBestiary();
        break;
      case "marks":
        this.renderMarks();
        break;
      case "stats":
        this.renderStats();
        break;
      case "options":
        this.renderOptions();
        break;
    }
  }

  private renderCharacters(): void {
    const meta = this.game.meta;
    const canChoose = this.ledgerReturn === "title";
    const intro = document.createElement("div");
    intro.className = "ledger-section";
    intro.innerHTML = `<div class="ledger-section-head"><h3>Who goes down</h3><span>${canChoose ? "Choose a thread" : "Locked for this descent"}</span></div>`;
    const grid = document.createElement("div");
    grid.className = "ledger-grid ledger-grid--characters";
    for (const character of CHARACTERS) {
      const unlocked = characterUnlocked(meta, character.id);
      const chosen = meta.selectedCharacter === character.id;
      const progress = meta.characters[character.id];
      const card = document.createElement("article");
      card.className = `character-card${chosen ? " is-chosen" : ""}${unlocked ? "" : " is-locked"}`;
      const art = document.createElement("div");
      art.className = "character-card-art";
      const img = document.createElement("img");
      img.src = character.portrait;
      img.alt = `${character.name} portrait`;
      art.appendChild(img);
      if (!unlocked) {
        const lock = document.createElement("div");
        lock.className = "character-card-lock";
        lock.textContent = "Not yet bound";
        art.appendChild(lock);
      }
      const copy = document.createElement("div");
      copy.className = "character-card-copy";
      const name = document.createElement("strong");
      name.textContent = character.name;
      const epithet = document.createElement("em");
      epithet.textContent = character.epithet;
      const blurb = document.createElement("p");
      blurb.textContent = character.blurb;
      const stats = document.createElement("div");
      stats.className = "character-stats";
      stats.innerHTML = `<span>${character.maxHp / 2} hearts</span><span>${progress.runs} descents</span><span>${progress.wins} wins</span>`;
      const skill = document.createElement("p");
      skill.className = "character-card-skill";
      skill.innerHTML = `<span>Skill · ${character.skill.name}</span>${character.skill.desc}`;
      copy.append(name, epithet, blurb, stats, skill);
      if (!unlocked) {
        const unlock = document.createElement("div");
        unlock.className = "character-card-unlock";
        unlock.textContent = characterUnlockText(character.id);
        copy.appendChild(unlock);
      }
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "btn btn--ghost";
      choose.dataset.chooseCharacter = character.id;
      choose.disabled = !unlocked || !canChoose || chosen;
      choose.textContent = chosen ? "In use" : unlocked ? "Choose" : "Locked";
      copy.appendChild(choose);
      card.append(art, copy);
      grid.appendChild(card);
    }
    intro.appendChild(grid);
    const note = document.createElement("p");
    note.className = "ledger-empty";
    note.style.marginTop = "14px";
    note.textContent = canChoose
      ? "Each child has a different body, reach, talismans and a cooldown skill on F. The house has much more in it than the last descent."
      : "The thread is already tied. Finish or abandon this descent to choose another.";
    intro.appendChild(note);
    this.ledgerBody.appendChild(intro);
  }

  private renderRelics(): void {
    const meta = this.game.meta;
    this.relicSection("Relics", RELICS, meta);
    this.relicSection("Active relics", ACTIVES, meta);
    this.relicSection("Trinkets", TRINKETS, meta);
  }

  private relicSection(title: string, list: ItemDef[], meta: MetaState): void {
    const found = list.filter((item) => meta.seenItems.includes(item.id)).length;
    const section = document.createElement("section");
    section.className = "ledger-section";
    const head = document.createElement("div");
    head.className = "ledger-section-head";
    head.innerHTML = `<h3>${title}</h3><span>${found} / ${list.length} found</span>`;
    section.appendChild(head);
    const grid = document.createElement("div");
    grid.className = "ledger-grid ledger-grid--items";
    for (const item of list) {
      const seen = meta.seenItems.includes(item.id);
      const card = document.createElement("article");
      card.className = `ledger-card${seen ? "" : " ledger-card--locked"}`;
      const icon = document.createElement("span");
      icon.className = "ledger-card-icon";
      if (seen) icon.appendChild(itemIconCanvas(item.id, 38));
      else icon.textContent = "?";
      const copy = document.createElement("span");
      copy.className = "ledger-card-copy";
      const name = document.createElement("span");
      name.className = "ledger-card-name";
      name.textContent = seen ? item.name : "Unfound";
      const desc = document.createElement("span");
      desc.className = "ledger-card-desc";
      desc.textContent = seen ? item.desc : "A shape the house has not shown you.";
      const metaLine = document.createElement("span");
      metaLine.className = "ledger-card-meta";
      metaLine.textContent = seen
        ? `${itemKind(item).toUpperCase()}${item.tags?.length ? ` · ${item.tags.join(" / ")}` : ""}${item.maxCharges ? ` · ${item.maxCharges} charges` : ""}`
        : itemKind(item).toUpperCase();
      copy.append(name, desc, metaLine);
      card.append(icon, copy);
      grid.appendChild(card);
    }
    section.appendChild(grid);
    this.ledgerBody.appendChild(section);
  }

  private renderBestiary(): void {
    const meta = this.game.meta;
    const enemies = document.createElement("section");
    enemies.className = "ledger-section";
    const seenEnemies = ENEMY_ORDER.filter(
      (kind) => meta.seenEnemies.includes(kind) || (meta.kills[kind] ?? 0) > 0,
    ).length;
    enemies.innerHTML = `<div class="ledger-section-head"><h3>The crawling things</h3><span>${seenEnemies} / ${ENEMY_ORDER.length} named</span></div>`;
    const grid = document.createElement("div");
    grid.className = "ledger-grid ledger-grid--bestiary";
    for (const kind of ENEMY_ORDER) {
      const info = ENEMY_INFO[kind];
      const seen = meta.seenEnemies.includes(kind) || (meta.kills[kind] ?? 0) > 0;
      const card = document.createElement("article");
      card.className = `bestiary-card${seen ? "" : " ledger-card--locked"}`;
      const thumb = document.createElement("div");
      thumb.className = "bestiary-thumb";
      if (seen) thumb.appendChild(enemyThumb(kind));
      else thumb.textContent = "?";
      const name = document.createElement("strong");
      name.textContent = seen ? info.name : "Unnamed";
      const metaLine = document.createElement("span");
      metaLine.textContent = seen ? `${meta.kills[kind] ?? 0} killed` : "Not yet met";
      const lore = document.createElement("p");
      lore.textContent = seen ? info.lore : "The ledger has left this page wet.";
      card.append(thumb, name, metaLine, lore);
      grid.appendChild(card);
    }
    enemies.appendChild(grid);
    this.ledgerBody.appendChild(enemies);

    const bosses = document.createElement("section");
    bosses.className = "ledger-section";
    const seenBosses = BOSS_ORDER.filter(
      (kind) => meta.seenEnemies.includes(`boss:${kind}`) || (meta.kills[`boss:${kind}`] ?? 0) > 0,
    ).length;
    bosses.innerHTML = `<div class="ledger-section-head"><h3>The keepers</h3><span>${seenBosses} / ${BOSS_ORDER.length} named</span></div>`;
    const bossGrid = document.createElement("div");
    bossGrid.className = "ledger-grid ledger-grid--bestiary";
    for (const kind of BOSS_ORDER) {
      const seen = meta.seenEnemies.includes(`boss:${kind}`) || (meta.kills[`boss:${kind}`] ?? 0) > 0;
      const card = document.createElement("article");
      card.className = `bestiary-card${seen ? "" : " ledger-card--locked"}`;
      const thumb = document.createElement("div");
      thumb.className = "bestiary-thumb";
      if (seen) thumb.appendChild(bossThumb(kind));
      else thumb.textContent = "?";
      const name = document.createElement("strong");
      name.textContent = seen ? BOSS_NAMES[kind] : "Unnamed";
      const metaLine = document.createElement("span");
      metaLine.textContent = seen ? `${meta.kills[`boss:${kind}`] ?? 0} felled` : "Not yet met";
      const lore = document.createElement("p");
      lore.textContent = seen ? BOSS_LORE[kind] : "Its page smells of water and candle wax.";
      card.append(thumb, name, metaLine, lore);
      bossGrid.appendChild(card);
    }
    bosses.appendChild(bossGrid);
    this.ledgerBody.appendChild(bosses);
  }

  private renderMarks(): void {
    const meta = this.game.meta;
    const unlocked = achievementCount(meta);
    const section = document.createElement("section");
    section.className = "ledger-section";
    section.innerHTML = `<div class="ledger-section-head"><h3>Marks</h3><span>${unlocked} / ${ACHIEVEMENTS.length} earned</span></div>`;
    const list = document.createElement("div");
    list.className = "achievement-list";
    for (const def of ACHIEVEMENTS) {
      const isUnlocked = Boolean(meta.achievements[def.id]);
      const row = document.createElement("div");
      row.className = `achievement-row${isUnlocked ? " is-unlocked" : " is-locked"}`;
      const mark = document.createElement("span");
      mark.className = "achievement-mark";
      mark.textContent = isUnlocked ? "✦" : "·";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = def.name;
      const desc = document.createElement("span");
      desc.textContent = def.desc;
      copy.append(name, desc);
      row.append(mark, copy);
      list.appendChild(row);
    }
    section.appendChild(list);
    this.ledgerBody.appendChild(section);
  }

  private renderStats(): void {
    const meta = this.game.meta;
    const collected = this.collectedCount(meta);
    const section = document.createElement("section");
    section.className = "ledger-section";
    section.innerHTML = `<div class="ledger-section-head"><h3>The shape of the descent</h3><span>${meta.record.runs} runs recorded</span></div>`;
    const grid = document.createElement("div");
    grid.className = "stats-grid";
    const cells: [string, string][] = [
      ["Descents", String(meta.record.runs)],
      ["Victories", String(meta.record.wins)],
      ["True endings", String(meta.stats.trueWins)],
      ["Deepest floor", meta.record.deepest ? roman(meta.record.deepest) : "—"],
      ["Kills", String(meta.stats.kills)],
      ["Rooms tread", String(meta.stats.rooms)],
      ["Secrets found", String(meta.stats.secrets)],
      ["Cursed floors", String(meta.stats.curses)],
      ["Reliquaries", String(meta.stats.treasures)],
      ["Collectibles", `${collected} / ${ITEM_COUNT}`],
      ["Marks", `${achievementCount(meta)} / ${ACHIEVEMENTS.length}`],
      ["Time below", formatDuration(meta.stats.playSeconds)],
    ];
    for (const [label, value] of cells) {
      const cell = document.createElement("div");
      cell.className = "stats-cell";
      cell.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      grid.appendChild(cell);
    }
    section.appendChild(grid);

    const daily = meta.daily;
    const dailyNote = document.createElement("p");
    dailyNote.className = "ledger-empty";
    dailyNote.style.marginTop = "18px";
    dailyNote.textContent = daily
      ? `Today's daily seed is ${daily.seedText}. ${daily.completed ? "It is already cleared." : "It is still waiting."}`
      : "No daily descent has been recorded yet.";
    section.appendChild(dailyNote);
    this.ledgerBody.appendChild(section);
  }

  private renderOptions(): void {
    const settings = this.game.meta.settings;
    const canReset = this.ledgerReturn === "title";
    const section = document.createElement("section");
    section.className = "ledger-section";
    section.innerHTML = `<div class="ledger-section-head"><h3>Hands on the thread</h3><span>Saved in this browser</span></div>`;
    const list = document.createElement("div");
    list.className = "options-list";
    list.appendChild(
      this.optionButton(
        "voice",
        "Narration",
        "The house speaks during the opening, chapters, keepers and endings.",
        settings.voice,
      ),
    );
    list.appendChild(
      this.optionButton(
        "mute",
        "Sound effects",
        "Synth score and every tear, bomb and door.",
        this.game.muted,
      ),
    );
    list.appendChild(
      this.optionButton(
        "damageNumbers",
        "Damage numbers",
        "Show how much each hit takes from a body.",
        settings.damageNumbers,
      ),
    );
    list.appendChild(
      this.optionButton(
        "flashes",
        "Bright flashes",
        "Turn off to soften hurt flashes and transitions.",
        settings.flashes,
      ),
    );
    list.appendChild(
      this.optionButton(
        "assist",
        "Gentle descent",
        "Begin each run with one extra heart and softer enemy bullets. The ledger still records the run.",
        settings.assist,
      ),
    );
    const shakeRow = document.createElement("div");
    shakeRow.className = "option-row";
    shakeRow.innerHTML = `<div><strong>Screen shake</strong><span>How much the house moves when it is struck.</span></div><div class="option-control"><input class="option-range" type="range" min="0" max="150" step="5" value="${Math.round(settings.shake * 100)}" data-option="shake" aria-label="Screen shake" /><span class="option-value" data-shake-value>${Math.round(settings.shake * 100)}%</span></div>`;
    list.appendChild(shakeRow);
    section.appendChild(list);

    const danger = document.createElement("div");
    danger.className = "option-danger";
    const title = document.createElement("strong");
    title.textContent = "Erase the ledger";
    const desc = document.createElement("span");
    desc.textContent = canReset
      ? "Remove every run, mark, unlock and collected relic from this browser."
      : "The ledger can only be erased from the title screen.";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn btn--danger";
    reset.dataset.action = "reset-progress";
    reset.disabled = !canReset;
    reset.textContent = this.resetArmed ? "Click again to erase everything" : "Erase progress";
    danger.append(title, desc, reset);
    section.appendChild(danger);
    this.ledgerBody.appendChild(section);
  }

  private optionButton(
    key: string,
    label: string,
    description: string,
    value: boolean,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "option-row";
    const copy = document.createElement("div");
    copy.innerHTML = `<strong>${label}</strong><span>${description}</span>`;
    const control = document.createElement("div");
    control.className = "option-control";
    const button = document.createElement("button");
    button.type = "button";
    button.className = `option-toggle${value ? " is-on" : ""}`;
    button.dataset.option = key;
    button.setAttribute("role", "switch");
    button.setAttribute("aria-checked", String(value));
    button.setAttribute("aria-label", label);
    control.appendChild(button);
    row.append(copy, control);
    return row;
  }

  private toggleOption(key: string): void {
    const settings = this.game.meta.settings;
    if (key === "voice") {
      settings.voice = !settings.voice;
      this.game.voice.setEnabled(settings.voice);
    } else if (key === "mute") {
      this.game.setMuted(!this.game.muted);
    } else if (key === "damageNumbers") {
      settings.damageNumbers = !settings.damageNumbers;
    } else if (key === "flashes") {
      settings.flashes = !settings.flashes;
    } else if (key === "assist") {
      settings.assist = !settings.assist;
    }
    saveMeta(this.game.meta);
    this.game.applySettings();
    this.renderLedger("options");
    this.game.audio.play("click");
  }

  private clearResetTimer(): void {
    if (this.resetTimer) {
      window.clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  private addPauseChip(label: string, value: string): void {
    const chip = document.createElement("span");
    chip.className = "pause-chip";
    const strong = document.createElement("strong");
    strong.textContent = label;
    chip.append(strong, document.createTextNode(value));
    this.pauseExtra.appendChild(chip);
  }

  private collectedCount(meta: MetaState): number {
    const ids = new Set(meta.seenItems);
    let count = 0;
    for (const item of [...RELICS, ...ACTIVES, ...TRINKETS]) {
      if (ids.has(item.id)) count += 1;
    }
    return count;
  }

  private armAbandon(): void {
    this.abandonArmed = true;
    const button = document.getElementById("btn-abandon") as HTMLButtonElement | null;
    if (button) {
      button.textContent = "Click again to abandon";
      button.classList.add("is-armed");
    }
    if (this.abandonTimer) window.clearTimeout(this.abandonTimer);
    this.abandonTimer = window.setTimeout(() => this.resetAbandon(), 3500);
  }

  private resetAbandon(): void {
    this.abandonArmed = false;
    if (this.abandonTimer) {
      window.clearTimeout(this.abandonTimer);
      this.abandonTimer = null;
    }
    const button = document.getElementById("btn-abandon") as HTMLButtonElement | null;
    if (button) {
      button.textContent = "Abandon run";
      button.classList.remove("is-armed");
    }
  }

  get isMenuOpen(): boolean {
    return this.current !== null;
  }

  private showOnly(name: Exclude<ScreenName, null>): void {
    for (const [key, screen] of Object.entries(this.screens)) {
      screen.hidden = key !== name;
    }
    const screen = this.screens[name];
    screen.scrollTop = 0;
    this.current = name;
    this.app.classList.toggle("in-run", name === "pause");
  }

  destroy(): void {
    this.touchUI.remove();
  }
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function todayKey(): string {
  const date = new Date();
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}
