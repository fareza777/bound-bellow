import io

p = "src/game/game.ts"
s = io.open(p, encoding="utf-8").read()

# --- updatePickups ---
start = s.index("  private updatePickups(dt: number): void {")
end = s.index("  private collectPickup(", start)
new = r'''  private updatePickups(dt: number): void {
    const pickups = this.room.pickups;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i];
      pickup.t += dt;
      if (pickup.kind === "trapdoor") continue;
      const d = dist(pickup.x, pickup.y, this.player.x, this.player.y);
      if (d > 26 + pickup.r) continue;
      if (pickup.price !== undefined && this.player.coins < pickup.price) {
        if (this.shopNoticeCd <= 0) {
          this.showNotice(`NEED ${pickup.price} COINS`, "#d8a65b");
          this.shopNoticeCd = 1.6;
          this.audio.play("locked");
        }
        continue;
      }
      if (pickup.hpPrice !== undefined) {
        if (this.player.hp <= pickup.hpPrice) {
          if (this.shopNoticeCd <= 0) {
            this.showNotice("BLOOD IS NOT ENOUGH", "#e3a48f");
            this.shopNoticeCd = 1.8;
            this.audio.play("locked");
          }
          continue;
        }
        this.player.hp -= pickup.hpPrice;
        this.player.maxHp = Math.max(2, this.player.maxHp);
        this.player.invuln = Math.max(this.player.invuln, 0.5);
        this.spawnBurst(this.player.x, this.player.y, "#8d3028", 14, 100, 3, 140);
        this.audio.play("hurt");
        this.award("altar");
        this.showNotice("THE HOUSE ACCEPTS", "#e3a48f");
      }
      if (pickup.price !== undefined) {
        this.player.coins -= pickup.price;
        this.audio.play("coin");
      }
      if (pickup.kind === "heart" || pickup.kind === "halfheart") {
        if (this.player.hp >= this.player.maxHp) continue;
      }
      if (pickup.kind === "item" && pickup.itemId) {
        this.giveItem(pickup.itemId);
        if (pickup.special === "library") {
          this.room.specialTaken = true;
          for (const other of pickups) {
            if (other !== pickup && other.special === "library" && other.kind === "item") {
              other.sold = true;
            }
          }
          this.showNotice("THE OTHER VOICES GO QUIET", "#c9b28b");
        }
      } else {
        this.collectPickup(pickup);
      }
      pickups.splice(i, 1);
    }
  }

'''
s = s[:start] + new + s[end:]

# --- giveItem ---
start = s.index("  private giveItem(itemId: string): void {")
end = s.index("  private updateOrbitals", start)
new = r'''  private giveItem(itemId: string, silent = false): void {
    const def = ITEM_BY_ID.get(itemId);
    if (!def) return;
    const kind = itemKind(def);
    if (kind === "active") {
      this.player.activeItem = def.id;
      this.player.activeCharges = def.maxCharges ?? 2;
    } else {
      def.apply?.(this.player);
    }
    this.player.items.push(itemId);
    this.offeredItems.add(itemId);
    this.player.hp = clamp(this.player.hp, 0, this.player.maxHp);
    const isNew = discoverItem(this.meta, itemId);
    if (isNew) {
      const seen = new Set(this.meta.seenItems);
      const found = ITEMS.filter((item) => seen.has(item.id)).length;
      if (found >= 20) this.award("collector");
      if (found >= 40) this.award("curator");
    }
    if (this.player.items.filter((id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as never)) === "active").length >= 3) {
      this.award("librarian");
    }
    if (this.player.items.filter((id) => itemKind(ITEM_BY_ID.get(id) ?? ({} as never)) === "trinket").length >= 3) {
      this.award("fashion");
    }
    if (kind === "relic") this.checkTransformations();
    if (!silent) {
      this.banner = {
        itemId,
        name: def.name,
        desc: def.desc,
        life: 3.4,
        max: 3.4,
      };
      this.audio.play("item");
      this.flash = 0.35;
      this.flashColor = "rgba(216,166,91,1)";
      this.spawnBurst(this.player.x, this.player.y - 10, "#d8a65b", 16, 90, 3, 10);
      this.ui?.setActiveItem(
        this.player.activeItem,
        this.player.activeCharges,
        this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
      );
    }
    saveMeta(this.meta);
  }

  private checkTransformations(): void {
    const tags: Record<string, number> = { stitch: 0, wax: 0, drowned: 0, gilt: 0 };
    for (const id of this.player.items) {
      const def = ITEM_BY_ID.get(id);
      if (!def || itemKind(def) !== "relic") continue;
      for (const tag of def.tags ?? []) {
        if (tag in tags) tags[tag] += 1;
      }
    }
    const sets: { tag: string; name: string; apply: () => void }[] = [
      {
        tag: "stitch",
        name: "The Stitch",
        apply: () => {
          this.player.stats.shots += 1;
          this.player.stats.fireDelay *= 0.88;
        },
      },
      {
        tag: "wax",
        name: "Waxbound",
        apply: () => {
          this.player.maxHp += 2;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
          this.player.bombs = Math.min(99, this.player.bombs + 1);
          this.player.stats.explosionSize += 0.15;
        },
      },
      {
        tag: "drowned",
        name: "The Drowned Choir",
        apply: () => {
          this.player.stats.enemySlow += 0.22;
          this.player.stats.range += 0.2;
        },
      },
      {
        tag: "gilt",
        name: "Gilded",
        apply: () => {
          this.player.stats.coinBonus += 0.35;
          this.player.stats.crit += 0.05;
        },
      },
    ];
    for (const set of sets) {
      if ((tags[set.tag] ?? 0) < 3 || this.player.transformations.includes(set.name)) continue;
      this.player.transformations.push(set.name);
      set.apply();
      this.run.transformed = true;
      this.award("transformation");
      this.showNotice(`TRANSFORMATION · ${set.name.toUpperCase()}`, "#d8a65b");
      this.flash = 0.5;
      this.flashColor = "rgba(216,166,91,1)";
      this.spawnBurst(this.player.x, this.player.y - 8, "#d8a65b", 24, 150, 3.5, 60);
      this.audio.play("revive");
    }
  }

  useActiveItem(): void {
    if (this.phase !== "playing" || this.player.dead) return;
    const def = this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem) : null;
    if (!def) {
      this.showNotice("NO ACTIVE RELIC", "#c9b28b");
      return;
    }
    if (this.player.activeCharges <= 0) {
      this.showNotice("THE CHARGE IS SPENT", "#c9b28b");
      this.audio.play("locked");
      return;
    }
    const effect = def.activeEffect;
    if (!effect) return;
    const p = this.player;
    switch (effect.type) {
      case "blast": {
        for (const e of [...this.room.enemies]) {
          if (e.dead) continue;
          if (dist(e.x, e.y, p.x, p.y) < effect.radius + e.r) {
            this.damageEnemy(e, effect.damage, false);
          }
        }
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * TAU;
          this.spawnBurst(
            p.x + Math.cos(a) * effect.radius * 0.7,
            p.y + Math.sin(a) * effect.radius * 0.7,
            "#e0a24e",
            2,
            110,
            3,
            50,
          );
        }
        this.addShake(9);
        this.flash = 0.4;
        this.flashColor = "rgba(232,179,108,1)";
        this.audio.play("explode");
        break;
      }
      case "heal": {
        p.hp = Math.min(p.maxHp, p.hp + effect.amount);
        this.audio.play("heart");
        this.spawnBurst(p.x, p.y - 10, "#b8402e", 18, 80, 3, 20);
        break;
      }
      case "freeze": {
        for (const e of this.room.enemies) {
          if (!e.dead) e.frozen = Math.max(e.frozen, effect.duration);
        }
        this.audio.play("bossdie");
        this.addShake(3);
        this.spawnBurst(p.x, p.y, "#b9d8dc", 24, 130, 3, 10);
        break;
      }
      case "volley": {
        const count = effect.count;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU;
          const speed = p.stats.shotSpeed;
          this.tears.push({
            x: p.x + Math.cos(a) * 16,
            y: p.y + Math.sin(a) * 16,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            r: 6.4 * p.stats.tearSize,
            damage: p.stats.damage * 0.8,
            life: 0.7,
            maxLife: 0.7,
            pierce: p.stats.pierce,
            hit: [],
            crit: false,
            poison: p.stats.poison > 0,
            explosive: p.stats.explosive > 0,
            homing: p.stats.homing,
            size: p.stats.tearSize,
            t: 0,
            color: "#171311",
            bounces: p.stats.bounces,
          });
        }
        this.audio.play("shoot");
        this.addShake(2);
        break;
      }
      case "reveal": {
        this.mapRevealed = true;
        this.showNotice("THE HOUSE OPENS ITS EYES", "#d8a65b");
        this.audio.play("door");
        break;
      }
      case "shield": {
        p.invuln = Math.max(p.invuln, effect.duration);
        this.showNotice("THE ROOTS HOLD", "#8fae64");
        this.audio.play("heart");
        break;
      }
      case "blink": {
        const spot = this.findFreeSpot(this.rng, 0, this.room.obstacles, 46);
        if (spot) {
          this.spawnBurst(p.x, p.y, "#c24a33", 12, 90, 3, 40);
          p.x = spot.x;
          p.y = spot.y;
          this.shots = [];
          p.invuln = Math.max(p.invuln, 0.6);
          this.spawnBurst(p.x, p.y, "#c24a33", 12, 90, 3, 40);
          this.audio.play("door");
        }
        break;
      }
      case "coins": {
        p.coins += effect.amount;
        this.audio.play("coin");
        this.spawnBurst(p.x, p.y, "#d8a65b", 18, 90, 3, 20);
        if (p.coins >= 40) this.award("deep-pockets");
        break;
      }
      case "reroll": {
        const rng = this.rng;
        let changed = 0;
        for (const pickup of this.room.pickups) {
          if (pickup.kind !== "item" || !pickup.itemId || pickup.sold) continue;
          const old = ITEM_BY_ID.get(pickup.itemId);
          const kind = old ? itemKind(old) : "relic";
          pickup.itemId = this.pickItemKind(kind, rng);
          changed += 1;
        }
        this.showNotice(changed ? "THE LEDGER REWRITES ITSELF" : "NOTHING TO REWRITE", "#d8a65b");
        this.audio.play("item");
        break;
      }
    }
    this.player.activeCharges -= 1;
    this.audio.play("item");
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      def.maxCharges ?? 0,
    );
  }

'''
s = s[:start] + new + s[end:]

# --- checkRoomClear rewards and active recharge / famine ---
old = '''      if (rng.chance(0.22)) {
        drops.push(
          makePickup("heart", ROOM_W / 2 + rng.range(-90, 90), ROOM_H / 2 + rng.range(-50, 50)),
        );
      }'''
new = '''      if (rng.chance(0.22) && this.floor.curse !== "famine") {
        drops.push(
          makePickup("heart", ROOM_W / 2 + rng.range(-90, 90), ROOM_H / 2 + rng.range(-50, 50)),
        );
      }'''
assert old in s
s = s.replace(old, new, 1)
old = '''      this.room.pickups.push(...drops);
    }
    this.showNotice("THE ROOM EXHALES", "#c9b28b");
  }'''
new = '''      this.room.pickups.push(...drops);
    }
    if (this.player.activeItem && this.player.activeCharges < (ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0)) {
      this.player.activeCharges += 1;
      this.ui?.setActiveItem(
        this.player.activeItem,
        this.player.activeCharges,
        ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0,
      );
    }
    this.audio.setIntensity(0);
    this.showNotice("THE ROOM EXHALES", "#c9b28b");
  }'''
assert old in s
s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("items/active patched", len(s))
