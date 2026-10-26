import io

p = "src/game/game.ts"
s = io.open(p, encoding="utf-8").read()

s = s.replace(
    '  recordKill,\n  resetMeta,',
    '  recordKill,\n  resetMeta,\n  characterUnlocked,',
    1,
)

start = s.index("  // -------------------------------------------------------------------------\n  // Run lifecycle")
end = s.index("  private buildFloor(index: number): void {", start)
new = r'''  // -------------------------------------------------------------------------
  // Run lifecycle
  // -------------------------------------------------------------------------

  beginRunFromTitle(seedText: string): void {
    if (this.phase !== "title") return;
    this.audio.unlock();
    const clean = normalizeSeedText(seedText);
    let seed: number;
    let text: string;
    if (clean) {
      seed = textToSeed(clean);
      text = clean;
    } else {
      seed = (Math.random() * 0xffffffff) >>> 0;
      text = seedToText(seed);
    }
    this.startNewRun(seed, text, false);
  }

  startDailyRun(): void {
    if (this.phase !== "title") return;
    this.audio.unlock();
    const daily = ensureDaily(this.meta);
    daily.character = this.meta.selectedCharacter;
    saveMeta(this.meta);
    this.startNewRun(dailySeedNumber(), dailySeedText(), true);
  }

  playOpening(): void {
    if (this.phase !== "title") return;
    this.audio.unlock();
    this.startIntro("title");
  }

  startIntro(mode: "run" | "title"): void {
    this.phase = "intro";
    this.input.clear();
    this.voice.stop();
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.ui?.playIntro(mode);
  }

  finishIntro(mode: "run" | "title"): void {
    this.meta.introSeen = true;
    saveMeta(this.meta);
    this.award("opening");
    this.voice.stop();
    if (mode === "run") {
      this.phase = "chapter";
      this.ui?.hideScreens();
      this.ui?.showChapter(this.theme);
      this.audio.setDucked(false);
    } else {
      this.phase = "title";
      this.ui?.hideScreens();
      this.ui?.showTitle();
      this.audio.setDucked(false);
    }
  }

  private startNewRun(seed: number, seedText: string, daily: boolean): void {
    const characterId = this.meta.selectedCharacter;
    this.seed = seed;
    this.lastSeedText = seedText;
    this.rng = new Rng(mixSeed(seed, 0x9e3779b9, 1));
    this.player = createPlayer(characterId, this.meta.settings.assist);
    this.player.invuln = 1.2;
    this.run = {
      seed,
      seedText,
      floor: 0,
      time: 0,
      rooms: 0,
      kills: 0,
      character: characterId,
      daily,
      trueEnding: false,
      damageTaken: 0,
      bombsUsed: 0,
      treasures: 0,
      secrets: 0,
      revived: false,
      transformed: false,
    };
    this.offeredItems.clear();
    this.processed.clear();
    this.orbitalNext.clear();
    this.runRecorded = false;
    this.banner = null;
    this.notice = null;
    this.transition = null;
    this.mapRevealed = false;
    this.lowHealthVoiced = false;
    this.lowHealthCheck = 0;
    this.floorDamageTaken = 0;
    this.bossRoomDamage = 0;
    this.floorBossesCleared = 0;
    this.applyStartingLoadout();
    this.buildFloor(0);
    const dailyState = ensureDaily(this.meta);
    if (daily) {
      dailyState.character = characterId;
      saveMeta(this.meta);
    }
    this.award("first-descent");
    this.phase = "chapter";
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.ui?.setBombCount(this.player.bombs);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
    if (!this.meta.introSeen) {
      this.startIntro("run");
    } else {
      this.ui?.showChapter(this.theme);
    }
  }

  private applyStartingLoadout(): void {
    const character = getCharacter(this.run.character);
    if (character.startingActive) {
      const def = ITEM_BY_ID.get(character.startingActive);
      if (def) {
        this.player.activeItem = def.id;
        this.player.activeCharges = def.maxCharges ?? 2;
        this.player.items.push(def.id);
        discoverItem(this.meta, def.id);
        this.offeredItems.add(def.id);
      }
    }
    if (character.startingTrinket) {
      const def = ITEM_BY_ID.get(character.startingTrinket);
      if (def) {
        def.apply?.(this.player);
        this.player.items.push(def.id);
        discoverItem(this.meta, def.id);
        this.offeredItems.add(def.id);
      }
    }
    saveMeta(this.meta);
  }

  continueChapter(): void {
    if (this.phase !== "chapter") return;
    this.phase = "playing";
    this.voice.stop();
    this.ui?.hideScreens();
    this.audio.unlock();
    this.audio.startAmbient(this.floorIndex);
    this.audio.setDucked(false);
    this.input.clearBomb();
    this.hintLife = this.floorIndex === 0 ? 9 : 0;
    this.player.invuln = Math.max(this.player.invuln, 1);
    this.ui?.setBombCount(this.player.bombs);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
    if (this.floor.curse) {
      this.showNotice(`CURSE · ${this.floor.curse.toUpperCase()}`, "#e3a48f");
    }
    this.audio.setIntensity(this.room.enemies.length ? (this.getBoss() ? 2 : 1) : 0);
  }

  restartRun(): void {
    if (this.phase !== "dead" && this.phase !== "victory") return;
    const wasDaily = this.run.daily;
    const text = this.lastSeedText || seedToText(this.seed);
    const seed = textToSeed(text);
    this.startNewRun(seed, text, wasDaily);
  }

  abandonRun(): void {
    if (this.phase !== "paused" && this.phase !== "playing") return;
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.audio.setIntensity(0);
    this.voice.stop();
    this.phase = "title";
    this.input.clear();
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.transition = null;
    this.resetPreview();
    this.ui?.hideScreens();
    this.ui?.showTitle();
  }

  toTitle(): void {
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.audio.setIntensity(0);
    this.voice.stop();
    this.phase = "title";
    this.input.clear();
    this.resetPreview();
    this.ui?.hideScreens();
    this.ui?.showTitle();
  }

  pause(): void {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    this.input.clear();
    this.voice.pause();
    this.audio.setDucked(true);
    this.ui?.showPause();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.input.clearBomb();
    this.audio.setDucked(false);
    this.voice.resume();
    this.ui?.hideScreens();
  }

  private finish(win: boolean): void {
    if (this.phase === "dead" || this.phase === "victory") return;
    const trueEnding =
      win &&
      (this.run.trueEnding ||
        this.player.transformations.length >= 2 ||
        this.player.items.includes("second-thread"));
    this.run.trueEnding = trueEnding;
    this.phase = win ? "victory" : "dead";
    this.finalizeRecord(win, trueEnding);
    this.audio.stopAmbient();
    this.audio.setIntensity(0);
    this.audio.setDucked(true);
    this.voice.stop();
    this.ui?.showEnd(win, trueEnding);
    if (win) this.audio.play("victory");
    if (win) this.voice.play(trueEnding ? "true-victory" : "victory", {
      interrupt: true,
    });
  }

  private finalizeRecord(win: boolean, trueEnding: boolean): void {
    if (this.runRecorded) return;
    this.runRecorded = true;
    const meta = this.meta;
    meta.record.runs += 1;
    meta.record.deepest = Math.max(meta.record.deepest, this.floorIndex + 1);
    if (win) meta.record.wins += 1;
    meta.record.bestItems = this.player.items.slice(0, 60);
    meta.stats.playSeconds += this.run.time;
    if (trueEnding) meta.stats.trueWins += 1;
    meta.characters[this.run.character].runs += 1;
    if (win) meta.characters[this.run.character].wins += 1;
    if (this.run.daily) {
      const daily = ensureDaily(meta);
      daily.bestFloor = Math.max(daily.bestFloor, this.floorIndex + 1);
      if (win) daily.completed = true;
    }
    saveMeta(meta);
    if (win) {
      this.award("heart");
      if (trueEnding) this.award("true-ending");
      if (this.run.time < 1080) this.award("still-daylight");
      if (this.player.hp <= 1) this.award("single-thread");
      if (this.run.daily) this.award("daily");
    }
    if (meta.record.wins >= 1) this.award("first-descent");
  }

  private award(id: string): void {
    const def = unlockAchievement(this.meta, id);
    if (!def) return;
    saveMeta(this.meta);
    this.ui?.showAchievementToast(def);
  }

  applySettings(): void {
    this.shakeScale = this.meta.settings.shake;
    this.damageNumbers = this.meta.settings.damageNumbers;
    this.flashesEnabled = this.meta.settings.flashes;
    this.voice.setEnabled(this.meta.settings.voice);
  }

  selectCharacter(id: CharacterId): boolean {
    if (this.phase !== "title") return false;
    if (!characterUnlocked(this.meta, id)) return false;
    this.meta.selectedCharacter = id;
    saveMeta(this.meta);
    this.ui?.updateTitle();
    return true;
  }

  resetProgress(): void {
    this.meta = resetMeta();
    this.voice.stop();
    this.applySettings();
    this.ui?.updateTitle();
    this.ui?.showTitle();
  }

  saveMeta(): void {
    saveMeta(this.meta);
  }

'''
s = s[:start] + new + s[end:]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("lifecycle patched", len(s))
