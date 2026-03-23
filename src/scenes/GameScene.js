import Phaser from 'phaser';
import {
  EVENT_DEFS,
  KID_ARCHETYPES,
  PLAYER_BASE,
  RUN,
  UPGRADE_POOL,
  WORLD
} from '../config/tuning.js';
import { createLibraryLayout } from '../data/layout.js';
import { clamp, distance, normalize, randomPointInCircle } from '../utils/geometry.js';

const CHAOS_RELIEF_PER_SHELVED_BOOK = 3.5;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  preload() {
    this.load.audio('soundtrack', 'audio/whistling_in_the_wind.mp3');
  }

  create() {
    this.layout = createLibraryLayout();
    this.mathRng = new Phaser.Math.RandomDataGenerator([`${Date.now()}`]);
    this.shelfIdCounter = 0;
    this.bookIdCounter = 0;
    this.kidIdCounter = 0;
    this.shelfAccumulator = 0;
    this.spawnAccumulator = 0;
    this.eventAccumulator = 0;
    this.shelfTimer = 0;
    this.isPausedByMenu = false;
    this.pauseReason = '';

    this.state = this.createInitialState();
    this.buildWorld();
    this.buildPlayer();
    this.buildUI();
    this.createInput();
    this.configureCamera();
    this.updateHud();
    this.spawnKid('wanderer');
    this.spawnAccumulator = 4;
    this.setStatus('Keep the shelves under control.');

    // Play background soundtrack on loop
    this.sound.play('soundtrack', { loop: true, volume: 0.5 });
  }

  createInitialState() {
    return {
      run: {
        elapsed: 0,
        timerRemaining: RUN.durationSeconds,
        chaos: 0,
        chaosMultiplier: 1,
        spawnMultiplier: 1,
        level: 1,
        xp: 0,
        xpToNext: RUN.levelXpBase,
        score: 0,
        booksShelved: 0,
        interceptions: 0,
        streak: 0,
        maxStreak: 0,
        activeEvent: null,
        eventEndsAt: 0,
        lastEventLabel: 'Steady shift'
      },
      player: {
        x: this.layout.playerSpawn.x,
        y: this.layout.playerSpawn.y,
        ...PLAYER_BASE,
        carriedBooks: [],
        upgrades: []
      },
      shelves: [],
      books: [],
      kids: []
    };
  }

  buildWorld() {
    this.cameras.main.setBackgroundColor('#8b5e34');
    this.drawWoodFloor();
    this.drawLightStripes();

    for (const zone of this.layout.zones) {
      this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xffffff, 0.03).setStrokeStyle(1, 0xe0bc7f, 0.16);
      this.add.text(zone.x, zone.y - zone.height / 2 + 12, zone.label, {
        fontSize: '20px',
        color: '#5c3920'
      }).setOrigin(0.5, 0);
    }

    this.wallBodies = this.layout.walls.map((wall) => {
      return this.add.rectangle(wall.x, wall.y, wall.width, wall.height, 0x6a4526, 0.001);
    });

    for (const def of this.layout.shelves) {
      this.createShelf(def);
    }
  }

  drawWoodFloor() {
    this.add.rectangle(this.layout.worldWidth / 2, this.layout.worldHeight / 2, this.layout.worldWidth, this.layout.worldHeight, 0xb98553);

    const rows = Math.ceil(this.layout.worldHeight / 34) + 1;
    const cols = Math.ceil(this.layout.worldWidth / 68) + 2;

    for (let row = 0; row < rows; row += 1) {
      const y = WORLD.headerHeight + 10 + row * 34;
      const offset = row % 2 === 0 ? 0 : 34;
      for (let col = -1; col < cols; col += 1) {
        const x = 20 + offset + col * 68;
        const tone = row % 3 === 0 ? 0xc58f59 : row % 3 === 1 ? 0xb57f4a : 0xa56d3f;
        this.add.rectangle(x, y, 66, 30, tone).setOrigin(0, 0).setStrokeStyle(1, 0x7a512e, 0.25);
      }
    }
  }

  drawLightStripes() {
    const stripeCount = 10;
    for (let index = 0; index < stripeCount; index += 1) {
      const beam = this.add.ellipse(120 + index * 220, this.layout.worldHeight / 2 + 60, 230, this.layout.worldHeight + 400, 0xfce9b9, 0.12);
      beam.rotation = 0.28;
    }
  }

  buildPlayer() {
    this.player = this.add.container(this.state.player.x, this.state.player.y);
    const shadow = this.add.ellipse(0, 18, 26, 12, 0x000000, 0.24);
    const body = this.add.rectangle(0, 0, 26, 40, 0x3b82f6).setStrokeStyle(2, 0x16345f);
    const head = this.add.circle(0, -14, 8, 0xffd7b5).setStrokeStyle(1, 0x8f5c3e);
    this.player.add([shadow, body, head]);

    this.playerLabel = this.add.text(this.player.x, this.player.y - 42, 'Librarian', {
      fontSize: '14px',
      color: '#fff9ef',
      backgroundColor: '#22150d',
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5);

    this.heldBookIndicator = this.add.rectangle(this.player.x + 22, this.player.y - 8, 12, 16, 0xffffff)
      .setStrokeStyle(1, 0x2a180d)
      .setVisible(false);
    this.heldBookCount = this.add.text(this.player.x + 38, this.player.y - 16, '', {
      fontSize: '14px',
      color: '#fff9ef',
      backgroundColor: '#22150d',
      padding: { x: 4, y: 2 }
    }).setOrigin(0, 0.5).setVisible(false);

    this.pickupRing = this.add.circle(this.player.x, this.player.y, this.state.player.pickupRadius, 0x8ecae6, 0.05).setStrokeStyle(1, 0x8ecae6, 0.2);
    this.repelRing = this.add.circle(this.player.x, this.player.y, this.state.player.repelRadius, 0xffd166, 0.035).setStrokeStyle(1, 0xffd166, 0.14);
  }

  configureCamera() {
    this.cameras.main.setBounds(0, 0, this.layout.worldWidth, this.layout.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setZoom(1);
  }

  buildUI() {
    this.leftPanel = this.add.rectangle(126, 50, 212, 68, 0x21160f, 0.92).setStrokeStyle(2, 0x6f5238, 0.95).setScrollFactor(0);
    this.centerPanel = this.add.rectangle(640, 42, 360, 54, 0x21160f, 0.92).setStrokeStyle(2, 0x6f5238, 0.95).setScrollFactor(0);
    this.rightPanel = this.add.rectangle(1138, 50, 236, 68, 0x21160f, 0.92).setStrokeStyle(2, 0x6f5238, 0.95).setScrollFactor(0);

    this.leftTitle = this.add.text(24, 18, 'Level 1', {
      fontSize: '24px',
      color: '#fff7e6',
      fontStyle: 'bold'
    }).setScrollFactor(0);

    this.statsText = this.add.text(24, 44, '', {
      fontSize: '15px',
      color: '#f1e6d2'
    }).setScrollFactor(0);

    this.rightStatsText = this.add.text(1238, 18, '', {
      fontSize: '18px',
      color: '#fff7e6',
      align: 'right'
    }).setOrigin(1, 0).setScrollFactor(0);

    this.eventText = this.add.text(640, 16, 'CHAOS: 0%', {
      fontSize: '24px',
      color: '#fff7e6',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.subEventText = this.add.text(640, 64, 'Steady shift', {
      fontSize: '13px',
      color: '#f3d79d'
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.chaosBarBg = this.add.rectangle(470, 47, 340, 10, 0x120c08).setOrigin(0, 0.5).setScrollFactor(0);
    this.chaosBar = this.add.rectangle(470, 47, 0, 10, 0x46d34d).setOrigin(0, 0.5).setScrollFactor(0);
    this.xpBarBg = this.add.rectangle(24, 86, 188, 8, 0x120c08).setOrigin(0, 0.5).setScrollFactor(0);
    this.xpBar = this.add.rectangle(24, 86, 0, 8, 0x62c370).setOrigin(0, 0.5).setScrollFactor(0);

    this.statusText = this.add.text(WORLD.width / 2, WORLD.height - 30, '', {
      fontSize: '18px',
      color: '#fff4dd',
      backgroundColor: '#2a1b12',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.pauseOverlay = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x0c0806, 0.7).setVisible(false).setScrollFactor(0);
    this.pauseTitle = this.add.text(WORLD.width / 2, 168, '', {
      fontSize: '42px',
      color: '#fff8e8',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setVisible(false).setScrollFactor(0);

    this.pauseDescription = this.add.text(WORLD.width / 2, 230, '', {
      fontSize: '22px',
      color: '#f7ede2',
      align: 'center',
      wordWrap: { width: 800 }
    }).setOrigin(0.5).setVisible(false).setScrollFactor(0);

    this.optionTexts = [];
    for (let index = 0; index < 3; index += 1) {
      const optionText = this.add.text(WORLD.width / 2, 320 + index * 92, '', {
        fontSize: '24px',
        color: '#2c1f14',
        backgroundColor: '#f4d6a0',
        padding: { x: 14, y: 10 },
        align: 'center',
        wordWrap: { width: 760 }
      }).setOrigin(0.5).setVisible(false).setScrollFactor(0);

      this.optionTexts.push(optionText);
    }
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.input.keyboard.on('keydown-P', () => {
      if (this.pauseReason === 'levelup') {
        return;
      }

      if (this.isPausedByMenu) {
        this.resumeSimulation();
      } else {
        this.pauseSimulation('Paused', 'Press P to continue your shift.');
      }
    });

    this.input.keyboard.on('keydown-ONE', () => this.selectUpgrade(0));
    this.input.keyboard.on('keydown-TWO', () => this.selectUpgrade(1));
    this.input.keyboard.on('keydown-THREE', () => this.selectUpgrade(2));
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    if (this.isPausedByMenu) {
      return;
    }

    this.state.run.elapsed += delta;
    this.state.run.timerRemaining = Math.max(0, RUN.durationSeconds - this.state.run.elapsed);
    this.shelfTimer += delta;
    this.spawnAccumulator += delta;
    this.eventAccumulator += delta;

    this.updatePlayer(delta);
    this.updateKids(delta);
    this.handleBookPickup();
    this.handleInterceptions();
    this.handleShelving();
    this.updateChaos(delta);
    this.handleKidSpawns();
    this.updateEvents();
    this.updateBookAges(delta);
    this.updateVisuals();
    this.updateHud();
    this.checkEndConditions();
  }

  updatePlayer(delta) {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.down.isDown) dy += 1;

    const direction = normalize(dx, dy);
    const movementX = dx === 0 && dy === 0 ? 0 : direction.x * this.state.player.speed * delta;
    const movementY = dx === 0 && dy === 0 ? 0 : direction.y * this.state.player.speed * delta;

    if (movementX !== 0) {
      const previousX = this.player.x;
      this.player.x = clamp(this.player.x + movementX, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width);
      if (this.isBlocked(this.player, 26, 40, true)) this.player.x = previousX;
    }

    if (movementY !== 0) {
      const previousY = this.player.y;
      this.player.y = clamp(this.player.y + movementY, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height);
      if (this.isBlocked(this.player, 26, 40, true)) this.player.y = previousY;
    }

    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
  }

  updateKids(delta) {
    const playerPosition = { x: this.player.x, y: this.player.y };

    for (const kid of this.state.kids) {
      const archetype = KID_ARCHETYPES[kid.archetype];
      const previous = { x: kid.x, y: kid.y };

      if (distance(kid, playerPosition) < this.state.player.repelRadius) {
        kid.fleeTimer = Math.max(kid.fleeTimer, this.state.player.repelDuration);
        if (kid.state !== 'carrying') kid.state = 'fleeing';
      }

      if (kid.fleeTimer > 0) kid.fleeTimer -= delta;

      switch (kid.state) {
        case 'idle':
          this.assignKidTargetShelf(kid);
          break;
        case 'movingToShelf':
          this.moveKidTowards(kid, kid.targetShelf, archetype.speed, delta);
          if (kid.targetShelf && distance(kid, kid.targetShelf) < 18) {
            kid.state = 'looting';
            kid.actionTimer = archetype.shelfTime;
          }
          break;
        case 'looting':
          kid.actionTimer -= delta;
          if (kid.actionTimer <= 0) {
            const grabbed = this.takeBooksFromShelf(kid.targetShelf, archetype.disruptCount);
            if (grabbed.length > 0) {
              kid.carrying = grabbed;
              kid.state = 'carrying';
              kid.dropTarget = this.chooseDropTarget(kid, archetype);
              this.updateKidVisual(kid);
            } else {
              kid.state = 'idle';
            }
          }
          break;
        case 'carrying': {
          const speed = kid.fleeTimer > 0 ? archetype.fleeSpeed : archetype.speed;
          this.moveKidTowards(kid, kid.dropTarget, speed, delta);
          if (distance(kid, kid.dropTarget) < 18) {
            this.dropKidBooks(kid);
            kid.state = kid.fleeTimer > 0 ? 'fleeing' : 'idle';
            kid.carrying = [];
            kid.dropTarget = null;
            this.updateKidVisual(kid);
          }
          break;
        }
        case 'fleeing': {
          const away = normalize(kid.x - this.player.x, kid.y - this.player.y);
          kid.x += away.x * archetype.fleeSpeed * delta;
          kid.y += away.y * archetype.fleeSpeed * delta;
          kid.x = clamp(kid.x, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width);
          kid.y = clamp(kid.y, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height);
          if (kid.fleeTimer <= 0) kid.state = 'idle';
          break;
        }
        default:
          break;
      }

      if (this.isBlocked(kid, 22, 30, false)) {
        kid.x = previous.x;
        kid.y = previous.y;
        if (kid.state === 'movingToShelf') kid.state = 'idle';
      }

      kid.container.x = kid.x;
      kid.container.y = kid.y;
      kid.label.x = kid.x;
      kid.label.y = kid.y - 24;
    }
  }

  moveKidTowards(kid, target, speed, delta) {
    if (!target) {
      kid.state = 'idle';
      return;
    }

    const vector = normalize(target.x - kid.x, target.y - kid.y);
    kid.x += vector.x * speed * delta;
    kid.y += vector.y * speed * delta;
    kid.x = clamp(kid.x, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width);
    kid.y = clamp(kid.y, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height);
  }

  handleBookPickup() {
    if (this.state.player.carriedBooks.length >= this.state.player.capacity) return;

    const floorBooks = this.state.books
      .filter((book) => book.state === 'floor')
      .sort((a, b) => distance(a, this.player) - distance(b, this.player));

    for (const book of floorBooks) {
      if (this.state.player.carriedBooks.length >= this.state.player.capacity) break;

      if (distance(book, this.player) <= this.state.player.pickupRadius) {
        book.state = 'carried_by_player';
        book.floorAge = 0;
        book.ownerId = 'player';
        book.shadow.setVisible(false);
        book.sprite.setVisible(false);
        this.state.player.carriedBooks.push(book);
        this.setStatus(`Picked up a ${book.label} book`);
      }
    }
  }

  handleInterceptions() {
    for (const kid of this.state.kids) {
      if (kid.state !== 'carrying' || kid.carrying.length === 0) continue;
      if (distance(kid, this.player) > this.state.player.interceptRadius) continue;

      while (kid.carrying.length > 0 && this.state.player.carriedBooks.length < this.state.player.capacity) {
        const book = kid.carrying.shift();
        book.state = 'carried_by_player';
        book.ownerId = 'player';
        book.floorAge = 0;
        book.shadow.setVisible(false);
        book.sprite.setVisible(false);
        this.state.player.carriedBooks.push(book);
        this.state.run.interceptions += 1;
        this.state.run.score += 12;
        this.state.run.xp += 5;
      }

      if (kid.carrying.length === 0) {
        kid.state = 'fleeing';
        kid.fleeTimer = Math.max(kid.fleeTimer, 0.9);
        kid.dropTarget = null;
        this.updateKidVisual(kid);
        this.setStatus('Interception! You rescued a carried book.');
      }
    }
  }

  handleShelving() {
    if (this.state.player.carriedBooks.length === 0) return;

    const nearbyShelves = this.state.shelves.filter((shelf) => distance(shelf, this.player) <= this.state.player.shelfRadius);
    if (nearbyShelves.length === 0) return;

    const shelfLimit = Math.max(1, Math.floor(this.shelfTimer * this.state.player.shelfRatePerSecond));
    if (shelfLimit <= 0) return;

    let shelvedCount = 0;
    for (const shelf of nearbyShelves) {
      for (let index = this.state.player.carriedBooks.length - 1; index >= 0; index -= 1) {
        if (shelvedCount >= shelfLimit) break;

        const book = this.state.player.carriedBooks[index];
        if (book.categoryId !== shelf.categoryId) continue;

        book.state = 'shelved';
        book.ownerId = shelf.id;
        book.floorAge = 0;
        book.shadow.setVisible(false);
        book.sprite.setVisible(false);
        this.state.player.carriedBooks.splice(index, 1);
        shelf.shelvedCount = Math.min(shelf.totalSlots, shelf.shelvedCount + 1);
        shelvedCount += 1;
        this.awardShelvingRewards();
      }
    }

    if (shelvedCount > 0) {
      this.state.run.chaos = clamp(this.state.run.chaos - shelvedCount * CHAOS_RELIEF_PER_SHELVED_BOOK, 0, 100);
      this.shelfTimer = 0;
      this.setStatus(`Shelved ${shelvedCount} book${shelvedCount > 1 ? 's' : ''} and lowered chaos`);
    }
  }

  awardShelvingRewards() {
    this.state.run.booksShelved += 1;
    this.state.run.streak += 1;
    this.state.run.maxStreak = Math.max(this.state.run.maxStreak, this.state.run.streak);
    this.state.run.score += 10 + this.state.run.streak + this.state.player.streakBonus;
    this.state.run.xp += 5;

    if (this.state.run.streak > 0 && this.state.run.streak % 5 === 0) {
      this.state.run.score += 20;
      this.setStatus('Clean section bonus!');
    }

    while (this.state.run.xp >= this.state.run.xpToNext) {
      this.state.run.xp -= this.state.run.xpToNext;
      this.state.run.level += 1;
      this.state.run.xpToNext = Math.round(RUN.levelXpBase * Math.pow(RUN.levelXpGrowth, this.state.run.level - 1));
      this.showLevelUp();
      break;
    }
  }

  updateChaos(delta) {
    const floorBooks = this.state.books.filter((book) => book.state === 'floor');
    const agedPressure = floorBooks.reduce((sum, book) => sum + book.floorAge, 0);
    let chaosDelta = RUN.baseChaosPerSecond + floorBooks.length * RUN.floorBookChaosWeight + agedPressure * RUN.agedBookChaosWeight;
    chaosDelta *= this.state.run.chaosMultiplier;

    if (floorBooks.length <= 2) chaosDelta -= RUN.lowMessChaosRecovery;

    this.state.run.chaos = clamp(this.state.run.chaos + chaosDelta * delta, 0, 100);
  }

  handleKidSpawns() {
    const maxKids = 2 + Math.floor(this.state.run.elapsed / 95);
    if (this.state.kids.length >= Math.ceil(maxKids * this.state.run.spawnMultiplier)) return;

    const baseInterval = Math.max(4.5, 7.6 - this.state.run.elapsed / 320);
    if (this.spawnAccumulator < baseInterval / this.state.run.spawnMultiplier) return;

    this.spawnAccumulator = 0;
    this.spawnKid(this.chooseKidArchetype());
  }

  chooseKidArchetype() {
    const progress = this.state.run.elapsed / RUN.durationSeconds;
    const roll = this.mathRng.realInRange(0, 1);

    if (progress < 0.2 || roll < 0.55) return 'wanderer';
    if (progress < 0.55 || roll < 0.82) return 'runner';
    return 'stackToppler';
  }

  createShelf(def) {
    const shelf = {
      id: 'shelf-' + (++this.shelfIdCounter),
      ...def,
      unlockedSlots: def.totalSlots,
      shelvedCount: def.totalSlots
    };

    shelf.shadow = this.add.rectangle(shelf.x + 4, shelf.y + 6, shelf.width, shelf.height, 0x000000, 0.16);
    shelf.body = this.add.rectangle(shelf.x, shelf.y, shelf.width, shelf.height, 0x5b381f).setStrokeStyle(2, 0x2d1a0f);
    shelf.strip = this.add.rectangle(shelf.x, shelf.y - shelf.height / 2 + 6, shelf.width - 8, 8, shelf.color);
    shelf.base = this.add.rectangle(shelf.x, shelf.y + shelf.height / 2 + 6, 20, 10, 0x49301a);
    shelf.leftFoot = this.add.rectangle(shelf.x - 14, shelf.y + shelf.height / 2 + 11, 6, 10, 0x3a2415);
    shelf.rightFoot = this.add.rectangle(shelf.x + 14, shelf.y + shelf.height / 2 + 11, 6, 10, 0x3a2415);
    shelf.bookSlots = [];

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const slotX = shelf.x - 18 + col * 18;
        const slotY = shelf.y - 20 + row * 26;
        const slot = this.add.rectangle(slotX, slotY, 10, 16, shelf.color, 0.85).setStrokeStyle(1, 0x2a180d, 0.65);
        shelf.bookSlots.push(slot);
      }
    }

    this.state.shelves.push(shelf);
  }

  createBookFromShelf(shelf) {
    const book = {
      id: 'book-' + (++this.bookIdCounter),
      categoryId: shelf.categoryId,
      label: shelf.label,
      color: shelf.color,
      homeShelfId: shelf.id,
      state: 'shelved',
      floorAge: 0,
      x: shelf.x,
      y: shelf.y,
      ownerId: shelf.id
    };

    book.shadow = this.add.ellipse(shelf.x, shelf.y + 7, 14, 8, 0x000000, 0.18).setVisible(false);
    book.sprite = this.add.rectangle(shelf.x, shelf.y, 12, 20, shelf.color).setStrokeStyle(1, 0x3a261a).setVisible(false);
    this.state.books.push(book);
    return book;
  }
  spawnKid(archetype) {
    const spawn = Phaser.Utils.Array.GetRandom(this.layout.kidSpawns);
    const kid = {
      id: 'kid-' + (++this.kidIdCounter),
      archetype,
      state: 'idle',
      x: spawn.x + this.mathRng.integerInRange(-26, 26),
      y: spawn.y + this.mathRng.integerInRange(-26, 26),
      targetShelf: null,
      actionTimer: 0,
      dropTarget: null,
      carrying: [],
      fleeTimer: 0
    };

    const sprite = this.add.container(kid.x, kid.y);
    const shadow = this.add.ellipse(0, 11, 20, 10, 0x000000, 0.18);
    const body = this.add.rectangle(0, 0, 18, 28, KID_ARCHETYPES[archetype].tint).setStrokeStyle(2, 0x4e2f20);
    const head = this.add.circle(0, -12, 6, 0xffd7b5).setStrokeStyle(1, 0x8f5c3e);
    const carriedIndicator = this.add.rectangle(0, -22, 12, 16, 0xffffff).setStrokeStyle(1, 0x3a261a).setVisible(false);
    sprite.add([shadow, body, head, carriedIndicator]);

    kid.container = sprite;
    kid.carriedIndicator = carriedIndicator;
    kid.label = this.add.text(kid.x, kid.y - 24, '', {
      fontSize: '12px',
      color: '#fff4dd',
      backgroundColor: '#2a1b12',
      padding: { x: 4, y: 1 }
    }).setOrigin(0.5).setVisible(false);

    this.state.kids.push(kid);
    this.setStatus(KID_ARCHETYPES[archetype].label + ' entered the library');
  }
  assignKidTargetShelf(kid) {
    const candidates = this.state.shelves
      .filter((shelf) => shelf.shelvedCount > 0)
      .sort((a, b) => distance(kid, a) - distance(kid, b));

    if (candidates.length === 0) return;

    kid.targetShelf = candidates[0];
    kid.state = 'movingToShelf';
  }

  takeBooksFromShelf(shelf, desiredCount) {
    if (!shelf || shelf.shelvedCount <= 0) return [];

    const amount = Math.min(desiredCount, shelf.shelvedCount);
    const books = [];

    for (let index = 0; index < amount; index += 1) {
      const book = this.createBookFromShelf(shelf);
      book.state = 'carried_by_kid';
      books.push(book);
      shelf.shelvedCount -= 1;
    }

    return books;
  }

  chooseDropTarget(kid, archetype) {
    const targetShelf = kid.targetShelf;
    const farCarry = this.mathRng.realInRange(0, 1) < archetype.farCarryChance;
    const [minDistance, maxDistance] = farCarry ? archetype.farCarryDistance : [40, 120];
    const angle = this.mathRng.realInRange(0, Math.PI * 2);
    const radius = this.mathRng.realInRange(minDistance, maxDistance);

    return {
      x: clamp(targetShelf.x + Math.cos(angle) * radius, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width),
      y: clamp(targetShelf.y + Math.sin(angle) * radius, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height)
    };
  }

  dropKidBooks(kid) {
    for (const book of kid.carrying) {
      const scatter = randomPointInCircle(this, kid.x, kid.y, 24);
      book.state = 'floor';
      book.x = scatter.x;
      book.y = scatter.y;
      book.ownerId = null;
      book.floorAge = 0;
      book.shadow.setPosition(scatter.x, scatter.y + 7).setVisible(true);
      book.sprite.setPosition(scatter.x, scatter.y).setVisible(true);
    }

    if (kid.carrying.length > 0) {
      this.state.run.streak = 0;
      this.setStatus('Books hit the floor. Chaos is rising.');
    }
  }
  scatterEventBooks(count) {
    for (let index = 0; index < count; index += 1) {
      const shelf = Phaser.Utils.Array.GetRandom(this.state.shelves);
      if (shelf.shelvedCount <= 0) continue;

      const books = this.takeBooksFromShelf(shelf, 1);
      if (books.length === 0) continue;

      const book = books[0];
      const scatter = randomPointInCircle(this, shelf.x, shelf.y, 90);
      book.state = 'floor';
      book.floorAge = 0;
      book.x = scatter.x;
      book.y = scatter.y;
      book.ownerId = null;
      book.shadow.setPosition(scatter.x, scatter.y + 7).setVisible(true);
      book.sprite.setPosition(scatter.x, scatter.y).setVisible(true);
    }

    this.state.run.streak = 0;
  }

  updateEvents() {
    if (this.state.run.activeEvent && this.state.run.elapsed >= this.state.run.eventEndsAt) {
      this.state.run.activeEvent.end(this.state, this);
      this.state.run.activeEvent = null;
      this.state.run.lastEventLabel = 'Steady shift';
    }

    if (this.state.run.activeEvent || this.eventAccumulator < RUN.eventIntervalSeconds) return;

    this.eventAccumulator = 0;
    const event = Phaser.Utils.Array.GetRandom(EVENT_DEFS);
    event.start(this.state, this);
    this.state.run.activeEvent = event;
    this.state.run.eventEndsAt = this.state.run.elapsed + event.duration;
    this.state.run.lastEventLabel = event.name;
    this.setStatus(event.description);
  }

  updateBookAges(delta) {
    for (const book of this.state.books) {
      if (book.state === 'floor') book.floorAge += delta;
    }
  }

  updateVisuals() {
    this.playerLabel.x = this.player.x;
    this.playerLabel.y = this.player.y - 42;
    if (this.state.player.carriedBooks.length > 0) {
      this.heldBookIndicator.setVisible(true);
      this.heldBookIndicator.x = this.player.x + 22;
      this.heldBookIndicator.y = this.player.y - 8;
      this.heldBookIndicator.fillColor = this.state.player.carriedBooks[0].color;
      this.heldBookCount.setVisible(true);
      this.heldBookCount.x = this.player.x + 34;
      this.heldBookCount.y = this.player.y - 16;
      this.heldBookCount.setText('x' + this.state.player.carriedBooks.length);
    } else {
      this.heldBookIndicator.setVisible(false);
      this.heldBookCount.setVisible(false);
    }
    this.pickupRing.x = this.player.x;
    this.pickupRing.y = this.player.y;
    this.pickupRing.radius = this.state.player.pickupRadius;
    this.repelRing.x = this.player.x;
    this.repelRing.y = this.player.y;
    this.repelRing.radius = this.state.player.repelRadius;

    for (const shelf of this.state.shelves) {
      shelf.bookSlots.forEach((slot, index) => {
        slot.setVisible(index < shelf.shelvedCount);
      });
    }

    for (const kid of this.state.kids) {
      kid.carriedIndicator.setVisible(kid.carrying.length > 0);
      kid.label.setVisible(kid.carrying.length > 0);
      if (kid.carrying.length > 0) {
        kid.carriedIndicator.fillColor = kid.carrying[0].color;
        kid.label.setText('BOOK');
      }
    }
  }

  updateHud() {
    const carried = this.state.player.carriedBooks.length;
    const floorBooks = this.state.books.filter((book) => book.state === 'floor').length;
    const maxKids = 2 + Math.floor(this.state.run.elapsed / 95);

    this.leftTitle.setText(`Level ${this.state.run.level}`);
    this.statsText.setText(`XP ${Math.floor(this.state.run.xp)}/${this.state.run.xpToNext}\nBooks ${carried}/${this.state.player.capacity}`);
    this.rightStatsText.setText(`${this.formatTime(this.state.run.timerRemaining)}\nKids: ${this.state.kids.length}/${maxKids}`);
    this.eventText.setText(`CHAOS: ${Math.round(this.state.run.chaos)}%`);
    this.subEventText.setText(`${this.state.run.lastEventLabel} | Floor books: ${floorBooks}`);

    const chaosRatio = this.state.run.chaos / 100;
    this.chaosBar.width = 340 * chaosRatio;
    this.chaosBar.fillColor = chaosRatio < 0.35 ? 0x49d35c : chaosRatio < 0.7 ? 0xf4c542 : 0xe24d4d;
    this.xpBar.width = 188 * (this.state.run.xp / this.state.run.xpToNext);
  }

  updateKidVisual(kid) {
    kid.carriedIndicator.setVisible(kid.carrying.length > 0);
    kid.label.setVisible(kid.carrying.length > 0);
  }

  showLevelUp() {
    this.pauseSimulation('Level Up', 'Choose an upgrade with 1, 2, or 3.');
    this.pauseReason = 'levelup';
    this.currentUpgradeChoices = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]).slice(0, 3);

    this.optionTexts.forEach((text, index) => {
      const choice = this.currentUpgradeChoices[index];
      text.setText(`${index + 1}. ${choice.label}\n${choice.description}`).setVisible(true);
    });
  }

  selectUpgrade(index) {
    if (this.pauseReason !== 'levelup' || !this.currentUpgradeChoices?.[index]) return;

    const choice = this.currentUpgradeChoices[index];
    choice.apply(this.state);
    this.state.player.upgrades.push(choice.label);
    this.setStatus(`${choice.label} acquired`);
    this.resumeSimulation();
  }

  pauseSimulation(title, description) {
    this.isPausedByMenu = true;
    this.pauseReason = this.pauseReason || 'pause';
    this.pauseOverlay.setVisible(true);
    this.pauseTitle.setText(title).setVisible(true);
    this.pauseDescription.setText(description).setVisible(true);
  }

  resumeSimulation() {
    this.isPausedByMenu = false;
    this.pauseReason = '';
    this.pauseOverlay.setVisible(false);
    this.pauseTitle.setVisible(false);
    this.pauseDescription.setVisible(false);
    this.currentUpgradeChoices = null;
    this.optionTexts.forEach((text) => text.setVisible(false));
  }

  checkEndConditions() {
    if (this.state.run.chaos >= 100) {
      this.endRun(false);
      return;
    }

    if (this.state.run.timerRemaining <= 0) this.endRun(true);
  }

  endRun(won) {
    this.scene.start('end', {
      won,
      timeText: this.formatTime(Math.max(0, this.state.run.timerRemaining), true),
      booksShelved: this.state.run.booksShelved,
      interceptions: this.state.run.interceptions,
      level: this.state.run.level,
      score: this.state.run.score,
      chaos: this.state.run.chaos,
      upgrades: this.state.player.upgrades
    });
  }

  formatTime(secondsRemaining, elapsedMode = false) {
    const total = elapsedMode ? Math.round(RUN.durationSeconds - secondsRemaining) : Math.round(secondsRemaining);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  isBlocked(target, width, height, includeShelves = true) {
    const left = target.x - width / 2;
    const right = target.x + width / 2;
    const top = target.y - height / 2;
    const bottom = target.y + height / 2;

    const overlaps = (body) => {
      const bodyLeft = body.x - body.width / 2;
      const bodyRight = body.x + body.width / 2;
      const bodyTop = body.y - body.height / 2;
      const bodyBottom = body.y + body.height / 2;
      return right > bodyLeft && left < bodyRight && bottom > bodyTop && top < bodyBottom;
    };

    return this.wallBodies.some((wall) => overlaps(wall)) || (includeShelves && this.state.shelves.some((shelf) => overlaps(shelf.body)));
  }

  setStatus(message) {
    this.statusText.setText(message);
  }
}






