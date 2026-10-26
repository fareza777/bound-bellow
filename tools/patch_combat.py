import io

p = "src/game/game.ts"
s = io.open(p, encoding="utf-8").read()

# --- update top ---
old = '''  update(dtRaw: number): void {
    const dt = Math.min(dtRaw, 1 / 30);
    this.time += dt;
    this.doorNoticeCd = Math.max(0, this.doorNoticeCd - dt);
    this.shopNoticeCd = Math.max(0, this.shopNoticeCd - dt);

    if (this.phase === "chapter") return;
    if (this.phase === "title") return;
    if (this.phase === "paused") return;
'''
new = '''  update(dtRaw: number): void {
    const dt = Math.min(dtRaw, 1 / 30);
    this.time += dt;
    this.doorNoticeCd = Math.max(0, this.doorNoticeCd - dt);
    this.shopNoticeCd = Math.max(0, this.shopNoticeCd - dt);

    this.input.pollGamepad();
    if (this.input.consumeGamepadPause()) {
      if (this.phase === "playing") this.pause();
      else if (this.phase === "paused") this.resume();
    }

    if (this.phase === "intro") return;
    if (this.phase === "chapter") return;
    if (this.phase === "title") return;
    if (this.phase === "paused") return;
'''
assert old in s
s = s.replace(old, new, 1)

old = '''    if (this.hintLife > 0) this.hintLife -= dt;
    if (this.bossIntro > 0) this.bossIntro = Math.max(0, this.bossIntro - dt);
    this.updateEffects(dt);
'''
new = '''    if (this.hintLife > 0) this.hintLife -= dt;
    if (this.bossIntro > 0) this.bossIntro = Math.max(0, this.bossIntro - dt);
    this.updateEffects(dt);
    if (!this.lowHealthVoiced && this.player.hp > 0 && this.player.hp <= 2) {
      this.lowHealthCheck -= dt;
      if (this.lowHealthCheck <= 0 && this.voice.enabled && !this.voice.playing) {
        if (this.voice.play("low-health")) this.lowHealthVoiced = true;
        this.lowHealthCheck = 4;
      }
    }
'''
assert old in s
s = s.replace(old, new, 1)

# --- player aim + active ---
old = '''    // aim priority: arrows, right stick, mouse
    const arrow = this.input.arrowAim();
    const stick = this.input.stickAim();
    const mouse = this.input.mouseAimRoom();
    let aimX = 0;
    let aimY = 0;
    let firing = false;
    if (arrow.x !== 0 || arrow.y !== 0) {
      aimX = arrow.x;
      aimY = arrow.y;
      firing = true;
    } else if (stick.active) {
      aimX = stick.x;
      aimY = stick.y;
      firing = true;
    } else if (mouse.active) {
      const dir = norm(mouse.x - p.x, mouse.y - p.y);
      if (dir.x !== 0 || dir.y !== 0) {
        aimX = dir.x;
        aimY = dir.y;
        firing = true;
      }
    }
'''
new = '''    // aim priority: arrows, right stick, gamepad, mouse
    const arrow = this.input.arrowAim();
    const stick = this.input.stickAim();
    const gamepad = this.input.gamepadAim();
    const mouse = this.input.mouseAimRoom();
    let aimX = 0;
    let aimY = 0;
    let firing = false;
    if (arrow.x !== 0 || arrow.y !== 0) {
      aimX = arrow.x;
      aimY = arrow.y;
      firing = true;
    } else if (stick.active) {
      aimX = stick.x;
      aimY = stick.y;
      firing = true;
    } else if (gamepad.active) {
      aimX = gamepad.x;
      aimY = gamepad.y;
      firing = true;
    } else if (mouse.active) {
      const dir = norm(mouse.x - p.x, mouse.y - p.y);
      if (dir.x !== 0 || dir.y !== 0) {
        aimX = dir.x;
        aimY = dir.y;
        firing = true;
      }
    }
'''
assert old in s
s = s.replace(old, new, 1)

old = '''    if (this.input.wantsBomb()) this.placeBomb();
  }

  private fireTear(ax: number, ay: number): void {'''
new = '''    if (this.input.wantsActive()) this.useActiveItem();
    if (this.input.wantsBomb()) this.placeBomb();
  }

  private fireTear(ax: number, ay: number): void {'''
assert old in s
s = s.replace(old, new, 1)

s = s.replace(
    '''        size: s.tearSize,
        t: 0,
        color: "#171311",
      });''',
    '''        size: s.tearSize,
        t: 0,
        color: "#171311",
        bounces: s.bounces,
      });''',
    1,
)

old = '''    p.bombs -= 1;
    p.bombCd = 0.35;'''
new = '''    p.bombs -= 1;
    this.run.bombsUsed += 1;
    p.bombCd = 0.35;'''
assert old in s
s = s.replace(old, new, 1)

# --- tear bounce ---
old = '''      tear.x += tear.vx * dt;
      tear.y += tear.vy * dt;

      const out =
        tear.x < -10 || tear.x > ROOM_W + 10 || tear.y < -10 || tear.y > ROOM_H + 10;
      if (tear.life <= 0 || out) {
        this.splatTear(tear);
        this.tears.splice(i, 1);
        continue;
      }
      let hitObstacle = false;
      for (const o of this.room.obstacles) {
        if (o.kind === "spike") continue;
        if (circleRect(tear.x, tear.y, tear.r, o.x, o.y, o.w, o.h)) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) {
        this.splatTear(tear);
        this.tears.splice(i, 1);
        continue;
      }
'''
new = '''      const prevX = tear.x;
      const prevY = tear.y;
      tear.x += tear.vx * dt;
      tear.y += tear.vy * dt;

      const out =
        tear.x < 0 || tear.x > ROOM_W || tear.y < 0 || tear.y > ROOM_H;
      if (tear.bounces > 0 && out) {
        if (tear.x < 0 || tear.x > ROOM_W) tear.vx *= -1;
        if (tear.y < 0 || tear.y > ROOM_H) tear.vy *= -1;
        tear.x = clamp(tear.x, 2, ROOM_W - 2);
        tear.y = clamp(tear.y, 2, ROOM_H - 2);
        tear.bounces -= 1;
        this.spawnBurst(tear.x, tear.y, "#c9b28b", 2, 35, 1.8, 30);
        continue;
      }
      if (tear.life <= 0 || out) {
        this.splatTear(tear);
        this.tears.splice(i, 1);
        continue;
      }
      let hitObstacle = false;
      for (const o of this.room.obstacles) {
        if (o.kind === "spike") continue;
        if (circleRect(tear.x, tear.y, tear.r, o.x, o.y, o.w, o.h)) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) {
        if (tear.bounces > 0) {
          tear.bounces -= 1;
          tear.x = prevX;
          tear.y = prevY;
          tear.vx *= -1;
          tear.vy *= -1;
          this.spawnBurst(tear.x, tear.y, "#c9b28b", 2, 35, 1.8, 30);
          continue;
        }
        this.splatTear(tear);
        this.tears.splice(i, 1);
        continue;
      }
'''
assert old in s
s = s.replace(old, new, 1)

# --- hurtPlayer armor + damage tracking ---
old = '''  private hurtPlayer(amount: number): void {
    const p = this.player;
    if (p.invuln > 0 || p.dead) return;
    p.hp -= amount;
    p.invuln = 1.15;'''
new = '''  private hurtPlayer(amount: number): void {
    const p = this.player;
    if (p.invuln > 0 || p.dead) return;
    const actual = Math.max(1, amount - Math.round(p.stats.armor));
    p.hp -= actual;
    this.run.damageTaken += actual;
    this.floorDamageTaken += actual;
    this.bossRoomDamage += actual;
    p.invuln = 1.15;'''
assert old in s
s = s.replace(old, new, 1)
s = s.replace(
    '''    this.spawnBurst(p.x, p.y - 4, "#8d3028", 14, 120, 3.4, 180);
    this.addText(p.x, p.y - 34, amount >= 2 ? "WOUNDED" : "HURT", "#e3a48f", 13);''',
    '''    this.spawnBurst(p.x, p.y - 4, "#8d3028", 14, 120, 3.4, 180);
    this.addText(p.x, p.y - 34, actual >= 2 ? "WOUNDED" : "HURT", "#e3a48f", 13);''',
    1,
)
s = s.replace(
    '''        p.reviveUsed = true;
        p.dead = false;
        p.hp = Math.min(p.maxHp, 4);''',
    '''        p.reviveUsed = true;
        p.dead = false;
        this.run.revived = true;
        this.award("second-wind");
        p.hp = Math.min(p.maxHp, 4);''',
    1,
)

# --- elite shield / damage numbers ---
old = '''  private damageEnemy(e: Enemy, dmg: number, crit: boolean): void {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.35;
    const isBoss = e.kind === "boss";
    this.addText(
      e.x + (Math.random() - 0.5) * 14,
      e.y - e.r - 6,
      String(Math.max(1, Math.round(dmg))),
      crit ? "#e6c47d" : isBoss ? "#e2c5a2" : "#d8c7a8",
      crit ? 18 : 13,
    );'''
new = '''  private damageEnemy(e: Enemy, dmg: number, crit: boolean): void {
    if (e.dead) return;
    if (e.shielded > 0) {
      e.shielded -= 1;
      e.flash = 0.4;
      this.audio.play("locked");
      this.spawnBurst(e.x, e.y, "#e0c184", 8, 80, 2.5, 40);
      return;
    }
    e.hp -= dmg;
    e.flash = 0.35;
    const isBoss = e.kind === "boss";
    if (this.damageNumbers) {
      this.addText(
        e.x + (Math.random() - 0.5) * 14,
        e.y - e.r - 6,
        String(Math.max(1, Math.round(dmg))),
        crit ? "#e6c47d" : isBoss ? "#e2c5a2" : "#d8c7a8",
        crit ? 18 : 13,
      );
    }'''
assert old in s
s = s.replace(old, new, 1)

# --- elite stitched death + kills meta ---
old = '''      } else {
        this.run.kills += 1;
        this.spawnBurst(e.x, e.y, "#7c2a24", 12, 105, 3.2, 180);
        this.spawnBurst(e.x, e.y, "rgba(30,23,18,0.8)", 8, 70, 4.5, 80);
        this.addShake(1.4);
        const roll = Math.random();'''
new = '''      } else {
        this.run.kills += 1;
        recordKill(this.meta, e.kind);
        discoverEnemy(this.meta, e.kind);
        if (e.elite === "stitched") {
          this.spawnEnemyAt("moth", e.x - 20, e.y);
          this.spawnEnemyAt("moth", e.x + 20, e.y);
        }
        this.spawnBurst(e.x, e.y, "#7c2a24", 12, 105, 3.2, 180);
        this.spawnBurst(e.x, e.y, "rgba(30,23,18,0.8)", 8, 70, 4.5, 80);
        this.addShake(1.4);
        const roll = Math.random();'''
assert old in s
s = s.replace(old, new, 1)
s = s.replace(
    '''    }
    this.room.enemies = this.room.enemies.filter((e) => !e.dead);
  }

  private handleBossDeath(e: Enemy): void {''',
    '''    }
    this.room.enemies = this.room.enemies.filter((e) => !e.dead);
    if (this.meta.stats.kills >= 100) this.award("bestiary");
    saveMeta(this.meta);
  }

  private handleBossDeath(e: Enemy): void {''',
    1,
)

# --- bomb kill count in explode ---
old = '''    // hit enemies
    for (const e of [...this.room.enemies]) {
      if (e.dead) continue;
      if (Math.hypot(e.x - x, e.y - y) < radius + e.r) {
        const dmg = 58 * (1 - 0.25 * (Math.hypot(e.x - x, e.y - y) / radius));
        this.damageEnemy(e, dmg, false);
      }
    }'''
new = '''    // hit enemies
    for (const e of [...this.room.enemies]) {
      if (e.dead) continue;
      const wasAlive = !e.dead;
      if (Math.hypot(e.x - x, e.y - y) < radius + e.r) {
        const dmg = 58 * (1 - 0.25 * (Math.hypot(e.x - x, e.y - y) / radius));
        this.damageEnemy(e, dmg, false);
        if (wasAlive && e.dead) {
          this.meta.stats.bombKills += 1;
          if (this.meta.stats.bombKills >= 25) this.award("bombardier");
        }
      }
    }'''
assert old in s
s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("combat patched", len(s))
