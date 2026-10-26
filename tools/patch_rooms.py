import io

p = "src/game/game.ts"
s = io.open(p, encoding="utf-8").read()

start = s.index("  private buildFloor(index: number): void {")
end = s.index("  // -------------------------------------------------------------------------\n  // Room content", start)
new = r'''  private buildFloor(index: number): void {
    this.floorIndex = index;
    this.run.floor = index;
    this.theme = getTheme(index);
    this.floor = generateFloor(index, mixSeed(this.seed, 0xf10a, index + 1));
    this.room = this.floor.start;
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.particles = [];
    this.texts = [];
    this.telegraphs = [];
    this.banner = null;
    this.notice = null;
    this.transition = null;
    this.bossIntro = 0;
    this.mapRevealed = false;
    this.floorDamageTaken = 0;
    this.bossRoomDamage = 0;
    this.floorBossesCleared = 0;
    this.processed.clear();
    this.orbitalNext.clear();
    this.voice.stop();
    this.audio.setIntensity(0);
    this.player.x = ROOM_W / 2;
    this.player.y = ROOM_H / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dead = false;
    this.player.invuln = 1.2;
    this.activateRoom(this.floor.start, null, true);
    this.player.hp = Math.min(
      this.player.hp > 0 ? this.player.hp : this.player.maxHp,
      this.player.maxHp,
    );
  }

  private activateRoom(room: Room, fromDir: Dir | null, counting = false): void {
    const firstVisit = !room.visited;
    this.room = room;
    room.visited = true;
    this.ensureContent(room);
    if (room.enemies.length === 0) room.cleared = true;
    this.tears = [];
    this.shots = [];
    this.bombs = [];
    this.telegraphs = [];
    this.processed.clear();
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.fireCd = 0;
    this.player.invuln = Math.max(this.player.invuln, 0.8);
    if (fromDir) {
      const doorDir = OPPOSITE[fromDir];
      switch (doorDir) {
        case "n":
          this.player.x = ROOM_W / 2;
          this.player.y = 58;
          break;
        case "s":
          this.player.x = ROOM_W / 2;
          this.player.y = ROOM_H - 58;
          break;
        case "w":
          this.player.x = 58;
          this.player.y = ROOM_H / 2;
          break;
        case "e":
          this.player.x = ROOM_W - 58;
          this.player.y = ROOM_H / 2;
          break;
      }
    } else {
      this.player.x = ROOM_W / 2;
      this.player.y = ROOM_H / 2;
    }
    this.player.x = clamp(this.player.x, 24, ROOM_W - 24);
    this.player.y = clamp(this.player.y, 24, ROOM_H - 24);
    if (firstVisit || counting) {
      this.run.rooms += 1;
      this.meta.stats.rooms += 1;
    }
    if (room.type === "treasure" && firstVisit) {
      this.run.treasures += 1;
      this.meta.stats.treasures += 1;
      if (this.run.treasures >= 3) this.award("keymaster");
    }
    if (room.type === "secret" && firstVisit) {
      this.run.secrets += 1;
      this.meta.stats.secrets += 1;
      this.award("secret");
    }
    const boss = this.room.enemies.find((e) => e.kind === "boss" && !e.dead);
    if (boss && !room.cleared) {
      this.bossIntro = 3.0;
      this.bossRoomDamage = 0;
      this.audio.play("boss");
      this.addShake(5);
      if (boss.boss) {
        discoverEnemy(this.meta, `boss:${boss.boss}`);
        this.voice.play(BOSS_VOICE[boss.boss], { interrupt: true });
      }
      this.audio.setIntensity(2);
    } else {
      this.bossIntro = 0;
      this.audio.setIntensity(this.room.enemies.length ? 1 : 0);
    }
    this.ui?.setActiveItem(
      this.player.activeItem,
      this.player.activeCharges,
      this.player.activeItem ? ITEM_BY_ID.get(this.player.activeItem)?.maxCharges ?? 0 : 0,
    );
    saveMeta(this.meta);
  }

'''
s = s[:start] + new + s[end:]

# ensureContent
start = s.index("  private ensureContent(room: Room): void {")
end = s.index("  private pickItem(rng: Rng): string {", start)
new = r'''  private ensureContent(room: Room): void {
    if (room.generated) return;
    room.generated = true;
    const rng = new Rng(room.seed ^ 0x7a11c0de);
    if (room.type === "start") {
      room.cleared = true;
      room.pickups.push(makePickup("coin", ROOM_W / 2 + 62, ROOM_H / 2 + 8, { value: 2 }));
    } else if (room.type === "treasure") {
      room.cleared = true;
      room.itemId = this.pickItemKind("relic", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2, ROOM_H / 2 + 8, { itemId: room.itemId }),
      );
    } else if (room.type === "secret") {
      room.cleared = true;
      room.itemId = this.pickItemKind(rng.chance(0.55) ? "trinket" : "relic", rng);
      room.pickups.push(makePickup("item", ROOM_W / 2, ROOM_H / 2 - 18, { itemId: room.itemId }));
      room.pickups.push(makePickup("coin", ROOM_W / 2 - 74, ROOM_H / 2 + 58, { value: 4 }));
      room.pickups.push(makePickup("coin", ROOM_W / 2 + 66, ROOM_H / 2 + 58, { value: 4 }));
    } else if (room.type === "sacrifice") {
      room.cleared = true;
      room.itemId = this.pickItemKind(rng.chance(0.6) ? "relic" : "active", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2, ROOM_H / 2 + 8, {
          itemId: room.itemId,
          hpPrice: 2,
          special: "sacrifice",
        }),
      );
      room.pickups.push(makePickup("halfheart", ROOM_W / 2 - 150, ROOM_H / 2 + 40));
    } else if (room.type === "library") {
      room.cleared = true;
      const ids = this.pickItemKindList("active", 3, rng);
      ids.forEach((id, index) => {
        room.pickups.push(
          makePickup("item", ROOM_W / 2 - 162 + index * 162, ROOM_H * 0.54, {
            itemId: id,
            special: "library",
          }),
        );
      });
    } else if (room.type === "vault") {
      room.cleared = true;
      room.itemId = this.pickItemKind("relic", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2, ROOM_H / 2 + 8, {
          itemId: room.itemId,
          price: 15 + this.floorIndex * 2,
          special: "vault",
        }),
      );
      room.pickups.push(makePickup("coin", ROOM_W / 2 - 130, ROOM_H / 2 + 70, { value: 5 }));
    } else if (room.type === "challenge") {
      room.obstacles = generateObstacles(room, this.floorIndex, rng).filter((o) => o.kind === "spike");
      const mini: BossKind = this.floorIndex >= 3 ? "curator" : "sexton";
      room.challengeBoss = mini;
      const boss = makeBoss(mini, this.floorIndex, ROOM_W / 2, ROOM_H * 0.42);
      boss.boss = mini;
      room.enemies = [boss];
      for (let i = 0; i < 2; i++) {
        const spot = this.findFreeSpot(rng, 90, room.obstacles, 44);
        if (spot) {
          room.enemies.push(
            makeEnemy(
              this.floorIndex >= 3 ? "bonewheel" : "wretch",
              spot.x,
              spot.y,
              this.floorIndex,
              rng,
            ),
          );
        }
      }
      room.cleared = false;
    } else if (room.type === "shop") {
      room.cleared = true;
      const basePrice = 9 + this.floorIndex * 2;
      const itemId =
        room.seed % 3 === 0
          ? this.pickItemKind("active", rng)
          : room.seed % 3 === 1
            ? this.pickItemKind("trinket", rng)
            : this.pickItemKind("relic", rng);
      room.pickups.push(
        makePickup("item", ROOM_W / 2 - 158, ROOM_H * 0.54, {
          itemId,
          price: basePrice,
        }),
      );
      room.pickups.push(
        makePickup("heart", ROOM_W / 2, ROOM_H * 0.56, {
          price: 4,
        }),
      );
      room.pickups.push(
        makePickup("key", ROOM_W / 2 + 158, ROOM_H * 0.56, {
          price: 5,
        }),
      );
    } else if (room.type === "boss") {
      room.obstacles = [];
      const boss = makeBoss(this.theme.boss, this.floorIndex, ROOM_W / 2, ROOM_H * 0.42);
      room.enemies = [boss];
      room.cleared = false;
    } else {
      this.generateCombatContent(room, rng);
    }
  }

'''
s = s[:start] + new + s[end:]

start = s.index("  private pickItem(rng: Rng): string {")
end = s.index("  private findFreeSpot(", start)
new = r'''  private pickItem(rng: Rng): string {
    return this.pickItemKind("relic", rng);
  }

  private pickItemKind(kind: "relic" | "active" | "trinket", rng: Rng): string {
    const pool = ITEMS.filter(
      (item) => itemKind(item) === kind && !this.offeredItems.has(item.id),
    );
    const fallback = ITEMS.filter((item) => itemKind(item) === kind);
    const list = pool.length ? pool : fallback;
    const item = list[Math.floor(rng.next() * list.length)] ?? ITEMS[0];
    this.offeredItems.add(item.id);
    return item.id;
  }

  private pickItemKindList(
    kind: "relic" | "active" | "trinket",
    count: number,
    rng: Rng,
  ): string[] {
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(this.pickItemKind(kind, rng));
    return out;
  }

  private generateCombatContent(room: Room, rng: Rng): void {
    room.obstacles = generateObstacles(room, this.floorIndex, rng);
    const distance = this.floor.distance.get(room.id) ?? 2;
    const curseBonus = this.floor.curse === "swarm" ? 2 : 0;
    const count = clamp(
      2 +
        Math.floor(distance / 2) +
        Math.floor(this.floorIndex / 2) +
        curseBonus +
        (rng.chance(0.3) ? 1 : 0),
      2,
      8,
    );
    for (let i = 0; i < count; i++) {
      const spot = this.findFreeSpot(rng, 70, room.obstacles, 46);
      if (!spot) continue;
      const kind = rng.weighted(this.theme.enemyPool);
      const elite = rng.chance(0.1 + this.floorIndex * 0.014)
        ? rng.pick(["stitched", "blessed", "swift"] as const)
        : null;
      room.enemies.push(makeEnemy(kind, spot.x, spot.y, this.floorIndex, rng, elite));
      discoverEnemy(this.meta, kind);
    }
    room.cleared = room.enemies.length === 0;
  }

'''
s = s[:start] + new + s[end:]

# spawnEnemyAt mark elite
s = s.replace(
    '''  private spawnEnemyAt(kind: EnemyKind, x: number, y: number): void {
    if (this.room.enemies.length > 24) return;
    const nx = clamp(x, 26, ROOM_W - 26);
    const ny = clamp(y, 26, ROOM_H - 26);
    this.room.enemies.push(makeEnemy(kind, nx, ny, this.floorIndex, this.rng));
    this.spawnBurst(nx, ny, "rgba(50,40,30,0.8)", 5, 45, 3, 100);
  }''',
    '''  private spawnEnemyAt(kind: EnemyKind, x: number, y: number): void {
    if (this.room.enemies.length > 28) return;
    const nx = clamp(x, 26, ROOM_W - 26);
    const ny = clamp(y, 26, ROOM_H - 26);
    this.room.enemies.push(makeEnemy(kind, nx, ny, this.floorIndex, this.rng));
    discoverEnemy(this.meta, kind);
    this.spawnBurst(nx, ny, "rgba(50,40,30,0.8)", 5, 45, 3, 100);
  }''',
    1,
)

# add BossKind import
s = s.replace(
    '  Curse,\n  CharacterId,\n  EliteKind,\n} from "./types";',
    '  Curse,\n  CharacterId,\n  EliteKind,\n  BossKind,\n} from "./types";',
    1,
)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("rooms patched", len(s))
