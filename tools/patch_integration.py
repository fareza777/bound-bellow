import io

p = "src/game/game.ts"
s = io.open(p, encoding="utf-8").read()

# import heart icon and active/trinket helpers already; add drawHeartIcon
s = s.replace(
    '''  drawBomb as drawBombArt,
  drawEnemy as drawEnemyArt,
  drawObstacle,''',
    '''  drawBomb as drawBombArt,
  drawEnemy as drawEnemyArt,
  drawHeartIcon,
  drawObstacle,''',
    1,
)

# --- descendOrWin ---
start = s.index("  private descendOrWin(): void {")
end = s.index("  private ioFlashChapter(): void {", start)
new = r'''  private descendOrWin(): void {
    if (this.phase !== "playing") return;
    if (this.floor.curse) {
      this.meta.stats.curses += 1;
      this.award("cursed");
    }
    if (this.floorDamageTaken <= 0) this.award("flawless");
    this.audio.stopAmbient();
    this.audio.setDucked(false);
    this.audio.setIntensity(0);
    this.voice.stop();
    if (this.floorIndex >= THEMES.length - 1) {
      this.finish(true);
      return;
    }
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
    this.player.bombs = Math.min(99, this.player.bombs + 1);
    this.player.keys = Math.min(9, this.player.keys + 1);
    this.buildFloor(this.floorIndex + 1);
    this.phase = "chapter";
    this.ioFlashChapter();
  }

'''
s = s[:start] + new + s[end:]

# --- buildFloor awards ---
s = s.replace(
    '''    this.activateRoom(this.floor.start, null, true);
    this.player.hp = Math.min(
      this.player.hp > 0 ? this.player.hp : this.player.maxHp,
      this.player.maxHp,
    );
  }''',
    '''    this.activateRoom(this.floor.start, null, true);
    this.player.hp = Math.min(
      this.player.hp > 0 ? this.player.hp : this.player.maxHp,
      this.player.maxHp,
    );
    if (index >= 3) this.award("deep");
    if (index >= 4) this.award("bottom");
    saveMeta(this.meta);
  }''',
    1,
)

# --- tryRevealSecret + crack drawing methods before makeCombatContext ---
marker = "  private makeCombatContext(): CombatContext {"
secret_methods = r'''  private tryRevealSecret(x: number, y: number): void {
    if (!this.room.secretDir || this.room.secretOpened || !this.floor.secret) return;
    const dir = this.room.secretDir;
    const points: Record<Dir, { x: number; y: number }> = {
      n: { x: ROOM_W / 2, y: 0 },
      s: { x: ROOM_W / 2, y: ROOM_H },
      w: { x: 0, y: ROOM_H / 2 },
      e: { x: ROOM_W, y: ROOM_H / 2 },
    };
    const wall = points[dir];
    if (dist(x, y, wall.x, wall.y) > 125) return;
    const secret = this.floor.secret;
    this.room.secretOpened = true;
    this.room.doors[dir] = secret;
    secret.doors[OPPOSITE[dir]] = this.room;
    secret.unlocked = true;
    this.spawnBurst(wall.x, wall.y, "#8d3028", 22, 110, 3, 80);
    this.spawnBurst(wall.x, wall.y, "#e0a24e", 10, 80, 2, 20);
    this.audio.play("door");
    this.audio.play("item");
    this.showNotice("A WALL GIVES WAY · SOMETHING IS BEHIND IT", "#d8a65b");
  }

  private drawSecretCrack(ctx: CanvasRenderingContext2D): void {
    const dir = this.room.secretDir;
    if (!dir || this.room.secretOpened) return;
    const points: Record<Dir, { x: number; y: number; a: number }> = {
      n: { x: ROOM_X + ROOM_W / 2, y: ROOM_Y - WALL / 2, a: 0 },
      s: { x: ROOM_X + ROOM_W / 2, y: ROOM_Y + ROOM_H + WALL / 2, a: Math.PI },
      w: { x: ROOM_X - WALL / 2, y: ROOM_Y + ROOM_H / 2, a: -Math.PI / 2 },
      e: { x: ROOM_X + ROOM_W + WALL / 2, y: ROOM_Y + ROOM_H / 2, a: Math.PI / 2 },
    };
    const p = points[dir];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.strokeStyle = "rgba(12,9,6,0.75)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-26, -14);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-18, 8);
    ctx.moveTo(9, -14);
    ctx.lineTo(2, -2);
    ctx.lineTo(14, 4);
    ctx.lineTo(8, 14);
    ctx.moveTo(-18, 8);
    ctx.lineTo(-4, 16);
    ctx.stroke();
    ctx.strokeStyle = "rgba(194,74,51,0.5)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-22, 15);
    ctx.quadraticCurveTo(0, 8, 22, 16);
    ctx.stroke();
    ctx.fillStyle = "rgba(194,74,51,0.7)";
    ctx.beginPath();
    ctx.arc(0, 12, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

'''
assert marker in s
s = s.replace(marker, secret_methods + marker, 1)

# call reveal on explosion
s = s.replace(
    '''  private explode(x: number, y: number, radius: number): void {
    this.addShake(13);''',
    '''  private explode(x: number, y: number, radius: number): void {
    this.tryRevealSecret(x, y);
    this.addShake(13);''',
    1,
)

# --- HUD data ---
start = s.index("  private getHudData(): HudData {")
end = s.index("  // -------------------------------------------------------------------------\n  // Test bridge helpers", start)
new = r'''  private getHudData(): HudData {
    const boss = this.getBoss();
    const bossKind = boss?.boss;
    const activeDef = this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem) : null;
    return {
      player: this.player,
      theme: this.theme,
      floorIndex: this.floorIndex,
      room: this.room,
      floor: this.floor as unknown as FloorData,
      runTime: this.run.time,
      seedText: this.lastSeedText,
      boss,
      bossName: bossKind ? BOSS_NAMES[bossKind] : this.theme.bossName,
      bossQuote: bossKind ? BOSS_QUOTES[bossKind] : this.theme.bossTitle,
      banner: this.banner,
      notice: this.notice,
      hintLife: this.hintLife,
      bossIntro: this.bossIntro,
      touch: this.input.hasTouch,
      roomCount: this.run.rooms,
      keysUsed: 0,
      activeItem: this.player.activeItem,
      activeCharges: this.player.activeCharges,
      activeMax: activeDef?.maxCharges ?? 0,
      trinkets: this.player.items.filter(
        (id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as never)) === "trinket",
      ),
      transformations: [...this.player.transformations],
      curse: this.floor.curse,
      mapRevealed: this.mapRevealed,
    };
  }

'''
s = s[:start] + new + s[end:]

# --- drawPickupPrices hp ---
start = s.index("  private drawPickupPrices(ctx: CanvasRenderingContext2D): void {")
end = s.index("  private drawPlayerLight", start)
new = r'''  private drawPickupPrices(ctx: CanvasRenderingContext2D): void {
    for (const pickup of this.room.pickups) {
      if (pickup.sold) continue;
      const bob = Math.sin(this.time * 3 + pickup.id) * 3;
      if (pickup.price !== undefined) {
        if (pickup.kind === "item") {
          drawPriceTag(ctx, pickup.price, pickup.x + 26, pickup.y - 38 + bob);
        } else {
          drawPriceTag(ctx, pickup.price, pickup.x + 20, pickup.y - 31 + bob * 0.6);
        }
      }
      if (pickup.hpPrice !== undefined) {
        const y = pickup.kind === "item" ? pickup.y - 38 + bob : pickup.y - 31 + bob * 0.6;
        const x = pickup.kind === "item" ? pickup.x + 26 : pickup.x + 20;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(16,12,9,0.92)";
        ctx.strokeStyle = "rgba(194,74,51,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-15, -8, 31, 16, 3) : ctx.rect(-15, -8, 31, 16);
        ctx.fill();
        ctx.stroke();
        drawHeartIcon(ctx, -6, 0, 12, "full");
        ctx.fillStyle = "#e3a48f";
        ctx.font = "700 10px Alegreya, serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(String(pickup.hpPrice / 2), 13, 0.5);
        ctx.restore();
      }
    }
  }

'''
s = s[:start] + new + s[end:]

# --- render: shake scale, flash gate, darkness, secret crack ---
s = s.replace(
    '''    this.renderer.drawDoors(ctx, this.room, this.theme, this.time, (dir) =>
      this.getDoorState(this.room, dir),
    );
    ctx.save();''',
    '''    this.renderer.drawDoors(ctx, this.room, this.theme, this.time, (dir) =>
      this.getDoorState(this.room, dir),
    );
    this.drawSecretCrack(ctx);
    ctx.save();''',
    1,
)
s = s.replace(
    '''    this.renderer.drawLighting(ctx, this.theme, this.floorIndex);
    this.drawPlayerLight(ctx);
    ctx.restore();''',
    '''    this.renderer.drawLighting(ctx, this.theme, this.floorIndex);
    this.drawPlayerLight(ctx);
    if (this.floor.curse === "darkness") this.drawDarkness(ctx);
    ctx.restore();''',
    1,
)
s = s.replace(
    '''    const shakeAmt = this.reducedMotion ? 0 : this.shake;''',
    '''    const shakeAmt = this.reducedMotion ? 0 : this.shake * this.shakeScale;''',
    1,
)
s = s.replace(
    '''    // HUD
    if (this.phase !== "title" && this.phase !== "chapter") {''',
    '''    // HUD
    if (
      this.phase !== "title" &&
      this.phase !== "chapter" &&
      this.phase !== "intro" &&
      this.phase !== "ledger"
    ) {''',
    1,
)
s = s.replace(
    '''    // flash
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }''',
    '''    // flash
    if (this.flash > 0 && this.flashesEnabled) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }''',
    1,
)

# add darkness helper before drawPlayerLight
marker = "  private drawPlayerLight(ctx: CanvasRenderingContext2D): void {"
darkness = r'''  private drawDarkness(ctx: CanvasRenderingContext2D): void {
    if (this.phase !== "playing" && this.phase !== "paused") return;
    const x = ROOM_X + this.player.x;
    const y = ROOM_Y + this.player.y;
    const g = ctx.createRadialGradient(x, y, 40, x, y, 250);
    g.addColorStop(0, "rgba(2,2,2,0)");
    g.addColorStop(0.55, "rgba(2,2,2,0.32)");
    g.addColorStop(1, "rgba(2,2,2,0.8)");
    ctx.fillStyle = g;
    ctx.fillRect(ROOM_X - WALL, ROOM_Y - WALL, ROOM_W + WALL * 2, ROOM_H + WALL * 2);
  }

'''
assert marker in s
s = s.replace(marker, darkness + marker, 1)

# --- clearRecord etc ---
start = s.index("  clearRecord(): void {")
end = s.index("  setSeed(seed: string | number): void {", start)
new = r'''  clearRecord(): void {
    this.meta.record = {
      deepest: 0,
      wins: 0,
      runs: 0,
      bestItems: [],
    };
    saveMeta(this.meta);
    this.ui?.updateTitle();
  }

'''
s = s[:start] + new + s[end:]

# --- playtest reset/jump ---
s = s.replace(
    '''    this.input.clear();
    this.audio.stopAmbient();
    this.startNewRun(seed, seedText || seedToText(seed));
    this.phase = "playing";''',
    '''    this.input.clear();
    this.audio.stopAmbient();
    this.meta.introSeen = true;
    this.startNewRun(seed, seedText || seedToText(seed), false);
    this.phase = "playing";''',
    1,
)
s = s.replace(
    '''    this.player.invuln = 1.4;
  }

  /** Test-only: makes the QA deep-link state survivable and fast to clear. */''',
    '''    this.player.invuln = 1.4;
    this.audio.setIntensity(this.getBoss() ? 2 : this.room.enemies.length ? 1 : 0);
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
  }

  /** Test-only: makes the QA deep-link state survivable and fast to clear. */''',
    1,
)

# snapshot extras
s = s.replace(
    '''      boss: boss
        ? {
            name: this.theme.bossName,''',
    '''      boss: boss
        ? {
            name: boss.boss ? BOSS_NAMES[boss.boss] : this.theme.bossName,''',
    1,
)
s = s.replace(
    '''        items: [...this.player.items],
        invuln: Number(this.player.invuln.toFixed(2)),
        dead: this.player.dead,''',
    '''        items: [...this.player.items],
        character: this.player.character,
        activeItem: this.player.activeItem,
        activeCharges: this.player.activeCharges,
        transformations: [...this.player.transformations],
        invuln: Number(this.player.invuln.toFixed(2)),
        dead: this.player.dead,''',
    1,
)
s = s.replace(
    '''      run: {
        time: Math.round(this.run.time),
        rooms: this.run.rooms,
        kills: this.run.kills,
      },''',
    '''      run: {
        time: Math.round(this.run.time),
        rooms: this.run.rooms,
        kills: this.run.kills,
        character: this.run.character,
        daily: this.run.daily,
        trueEnding: this.run.trueEnding,
      },
      curse: this.floor.curse,
      mapRevealed: this.mapRevealed,''',
    1,
)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("integration patched", len(s))
