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
const CHASE_LAUGH_DISTANCE = 260;
const CHASE_LAUGH_COOLDOWN = 1.4;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  preload() {
    if (!this.cache.audio.exists('soundtrack')) {
      this.load.audio('soundtrack', 'audio/whistling_in_the_wind.mp3');
    }

    if (!this.textures.exists('library-floor')) {
      this.load.image('library-floor', 'images/floor.png');
    }

    if (!this.textures.exists('librarian-walk-1')) {
      this.load.image('librarian-walk-1', 'images/librarian1.png');
    }

    if (!this.textures.exists('librarian-walk-2')) {
      this.load.image('librarian-walk-2', 'images/librarian2.png');
    }

    if (!this.textures.exists('kids-sheet')) {
      this.load.spritesheet('kids-sheet', 'images/kids.png', { frameWidth: 135, frameHeight: 184, endFrame: 9 });
    }

    if (!this.cache.audio.exists('kid-book-pickup')) {
      this.load.audio('kid-book-pickup', 'audio/public_yay.mp3');
    }

    if (!this.cache.audio.exists('player-sprint')) {
      this.load.audio('player-sprint', 'audio/public_out_of_breath.mp3');
    }

    if (!this.cache.audio.exists('kid-laugh-1')) {
      this.load.audio('kid-laugh-1', 'audio/public_kid_laughing_1.mp3');
    }

    if (!this.cache.audio.exists('kid-laugh-2')) {
      this.load.audio('kid-laugh-2', 'audio/public_kid_laughing_2.mp3');
    }

    if (!this.cache.audio.exists('kid-laugh-3')) {
      this.load.audio('kid-laugh-3', 'audio/public_kid_laughing_3.mp3');
    }
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
    this.isMobileDevice = this.shouldUseMobileControls();
    this.debugFloorBookEvents = [];

    this.state = this.createInitialState();
    this.buildWorld();
    this.buildPlayer();
    this.buildUI();
    this.createInput();
    this.createMobileControls();
    this.configureCamera();
    this.applyResponsiveLayout();
    this.registerScaleHandlers();
    this.registerAudioUnlock();
    this.updateHud();
    this.spawnKid('wanderer');
    this.spawnAccumulator = 4;
    this.setStatus('Keep the shelves under control.');
    this.soundtrack = this.sound.get('soundtrack') ?? this.sound.add('soundtrack', { loop: true, volume: 0.42 });
    this.sprintSound = this.sound.add('player-sprint', { loop: true, volume: 0.2 });
    this.kidLaughSounds = ['kid-laugh-1', 'kid-laugh-2', 'kid-laugh-3'];
    this.kidPickupSounds = ['kid-book-pickup', ...this.kidLaughSounds];
    this.chaseLaughCooldown = 0;

    this.ensureGameplaySoundtrack();
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
        stamina: PLAYER_BASE.staminaMax,
        staminaRecoveryCooldown: 0,
        isSprinting: false,
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
    this.add.tileSprite(this.layout.worldWidth / 2, this.layout.worldHeight / 2, this.layout.worldWidth, this.layout.worldHeight, 'library-floor')
      .setTileScale(0.58, 0.58);
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
    const shadow = this.add.ellipse(0, 24, 34, 15, 0x000000, 0.24);
    this.playerSprite = this.add.image(0, 26, 'librarian-walk-1').setOrigin(0.5, 1).setScale(0.135);
    this.player.add([shadow, this.playerSprite]);

    this.playerWalkTimer = 0;
    this.playerWalkFrame = 0;
    this.playerFacing = 'right';

    this.heldBookIndicator = this.add.rectangle(this.player.x + 30, this.player.y - 26, 14, 20, 0xffffff)
      .setStrokeStyle(1, 0x2a180d)
      .setVisible(false);
    this.heldBookCount = this.add.text(this.player.x + 48, this.player.y - 34, '', {
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
    this.staminaBarBg = this.add.rectangle(24, 102, 188, 8, 0x120c08).setOrigin(0, 0.5).setScrollFactor(0);
    this.staminaBar = this.add.rectangle(24, 102, 188, 8, 0x5cc8ff).setOrigin(0, 0.5).setScrollFactor(0);

    this.statusText = this.add.text(WORLD.width / 2, WORLD.height - 30, '', {
      fontSize: '18px',
      color: '#fff4dd',
      backgroundColor: '#2a1b12',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0);

    this.debugFloorText = this.add.text(24, WORLD.height - 72, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffd6a5',
      backgroundColor: '#1f120c',
      padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(140).setVisible(false);

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
      right: Phaser.Input.Keyboard.KeyCodes.D,
      sprint: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });
    this.mobileInput = {
      moveX: 0,
      moveY: 0,
      sprint: false,
      joystickPointerId: null,
      sprintPointerId: null
    };

    this.input.keyboard.on('keydown-P', () => {
      this.togglePauseMenu();
    });

    this.input.keyboard.on('keydown-ONE', () => this.selectUpgrade(0));
    this.input.keyboard.on('keydown-TWO', () => this.selectUpgrade(1));
    this.input.keyboard.on('keydown-THREE', () => this.selectUpgrade(2));
  }

  shouldUseMobileControls() {
    const device = this.sys.game.device;
    return Boolean(device.input.touch && !device.os.desktop);
  }

  createMobileControls() {
    if (!this.isMobileDevice) {
      return;
    }

    this.mobileControlLayer = this.add.layer().setDepth(120);

    this.joystickBase = this.add.circle(126, WORLD.height - 118, 82, 0x170f0a, 0.28)
      .setStrokeStyle(4, 0xe6c07a, 0.52)
      .setScrollFactor(0);
    this.joystickThumb = this.add.circle(126, WORLD.height - 118, 34, 0xe6c07a, 0.72)
      .setStrokeStyle(2, 0x2f1c12, 0.9)
      .setScrollFactor(0);
    this.joystickZone = this.add.zone(126, WORLD.height - 118, 236, 236)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: false });

    this.sprintButton = this.add.circle(WORLD.width - 118, WORLD.height - 124, 58, 0x915b2b, 0.72)
      .setStrokeStyle(4, 0xf1d196, 0.82)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: false });
    this.sprintLabel = this.add.text(WORLD.width - 118, WORLD.height - 124, 'SPRINT', {
      fontFamily: 'monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff6df'
    }).setOrigin(0.5).setScrollFactor(0);

    this.pauseButtonMobile = this.add.circle(WORLD.width - 68, 68, 34, 0x25150d, 0.76)
      .setStrokeStyle(3, 0xf0cf95, 0.85)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: false });
    this.pauseLabelMobile = this.add.text(WORLD.width - 68, 68, 'II', {
      fontFamily: 'monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff4d8'
    }).setOrigin(0.5).setScrollFactor(0);

    this.mobileControlLayer.add([
      this.joystickBase,
      this.joystickThumb,
      this.sprintButton,
      this.sprintLabel,
      this.pauseButtonMobile,
      this.pauseLabelMobile
    ]);

    this.joystickZone.on('pointerdown', (pointer) => {
      if (this.mobileInput.joystickPointerId !== null) {
        return;
      }

      this.mobileInput.joystickPointerId = pointer.id;
      this.updateMobileJoystick(pointer);
    });

    this.sprintButton.on('pointerdown', (pointer) => {
      this.mobileInput.sprintPointerId = pointer.id;
      this.mobileInput.sprint = true;
      this.refreshMobileControlVisuals();
    });

    this.pauseButtonMobile.on('pointerdown', () => {
      this.togglePauseMenu();
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.id === this.mobileInput.joystickPointerId) {
        this.updateMobileJoystick(pointer);
      }
    });

    this.input.on('pointerup', (pointer) => {
      this.releaseMobilePointer(pointer);
    });

    this.input.on('pointerupoutside', (pointer) => {
      this.releaseMobilePointer(pointer);
    });

    this.layoutMobileControls();
    this.refreshMobileControlVisuals();
  }

  releaseMobilePointer(pointer) {
    if (!this.isMobileDevice) {
      return;
    }

    if (pointer.id === this.mobileInput.joystickPointerId) {
      this.resetMobileJoystick();
    }

    if (pointer.id === this.mobileInput.sprintPointerId) {
      this.mobileInput.sprintPointerId = null;
      this.mobileInput.sprint = false;
      this.refreshMobileControlVisuals();
    }
  }

  updateMobileJoystick(pointer) {
    const centerX = this.joystickBase.x;
    const centerY = this.joystickBase.y;
    const maxRadius = 62;
    const deltaX = pointer.x - centerX;
    const deltaY = pointer.y - centerY;
    const distanceFromCenter = Math.hypot(deltaX, deltaY);
    const clampedDistance = Math.min(maxRadius, distanceFromCenter || 0);
    const angle = Math.atan2(deltaY, deltaX);
    const thumbX = centerX + Math.cos(angle) * clampedDistance;
    const thumbY = centerY + Math.sin(angle) * clampedDistance;

    this.joystickThumb.setPosition(distanceFromCenter > 0 ? thumbX : centerX, distanceFromCenter > 0 ? thumbY : centerY);
    this.mobileInput.moveX = Phaser.Math.Clamp(deltaX / maxRadius, -1, 1);
    this.mobileInput.moveY = Phaser.Math.Clamp(deltaY / maxRadius, -1, 1);
  }

  resetMobileJoystick() {
    this.mobileInput.joystickPointerId = null;
    this.mobileInput.moveX = 0;
    this.mobileInput.moveY = 0;

    if (this.joystickThumb && this.joystickBase) {
      this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
    }
  }

  refreshMobileControlVisuals() {
    if (!this.isMobileDevice) {
      return;
    }

    this.sprintButton.setFillStyle(this.mobileInput.sprint ? 0xd48a41 : 0x915b2b, this.mobileInput.sprint ? 0.92 : 0.72);
    this.joystickBase.setAlpha(this.mobileInput.joystickPointerId === null ? 0.9 : 1);
    this.joystickThumb.setAlpha(this.mobileInput.joystickPointerId === null ? 0.8 : 1);
  }

  layoutMobileControls() {
    if (!this.isMobileDevice) {
      return;
    }

    const bottomInset = 112;
    this.joystickBase.setPosition(126, WORLD.height - bottomInset);
    this.joystickThumb.setPosition(126, WORLD.height - bottomInset);
    this.joystickZone.setPosition(126, WORLD.height - bottomInset);
    this.sprintButton.setPosition(WORLD.width - 118, WORLD.height - 118);
    this.sprintLabel.setPosition(WORLD.width - 118, WORLD.height - 118);
    this.pauseButtonMobile.setPosition(WORLD.width - 68, 68);
    this.pauseLabelMobile.setPosition(WORLD.width - 68, 68);
  }

  applyResponsiveLayout() {
    if (!this.isMobileDevice) {
      return;
    }

    this.leftPanel.setScale(1.02, 1.04);
    this.centerPanel.setScale(1.08, 1.06);
    this.rightPanel.setScale(1.02, 1.04);
    this.leftTitle.setFontSize('26px');
    this.statsText.setFontSize('17px');
    this.rightStatsText.setFontSize('20px');
    this.eventText.setFontSize('26px');
    this.subEventText.setFontSize('15px');
    this.statusText.setFontSize('20px');
  }

  registerScaleHandlers() {
    this.scale.on('resize', () => {
      this.layoutMobileControls();
    });
  }

  registerAudioUnlock() {
    const unlockAndStart = async () => {
      await this.unlockAudio();
      this.ensureGameplaySoundtrack();
    };

    this.input.once('pointerdown', unlockAndStart);

    const canvas = this.game.canvas;
    if (canvas) {
      const domUnlock = async () => {
        canvas.removeEventListener('touchend', domUnlock);
        canvas.removeEventListener('click', domUnlock);
        await unlockAndStart();
      };

      canvas.addEventListener('touchend', domUnlock, { once: true, passive: true });
      canvas.addEventListener('click', domUnlock, { once: true, passive: true });
    }
  }

  async unlockAudio() {
    if (this.sound.context?.state === 'suspended') {
      try {
        await this.sound.context.resume();
      } catch (error) {
      }
    }

    if (this.sound.locked) {
      this.sound.unlock();
    }

    if (this.sound.context?.state === 'suspended') {
      await new Promise((resolve) => this.time.delayedCall(50, resolve));
      try {
        await this.sound.context.resume();
      } catch (error) {
      }
    }
  }

  ensureGameplaySoundtrack() {
    if (this.sound.locked || this.sound.context?.state === 'suspended') {
      return;
    }

    if (!this.soundtrack) {
      this.soundtrack = this.sound.get('soundtrack') ?? this.sound.add('soundtrack', { loop: true, volume: 0.42 });
    }

    if (!this.soundtrack.isPlaying) {
      this.soundtrack.play({ loop: true, volume: 0.42 });
    }

    this.soundtrack.setVolume(0.42);
  }

  togglePauseMenu() {
    if (this.pauseReason === 'levelup') {
      return;
    }

    if (this.isPausedByMenu) {
      this.resumeSimulation();
    } else {
      this.pauseSimulation('Paused', 'Press P or tap pause to continue your shift.');
    }
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
    this.updateChaseLaughs(delta);
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

    dx += this.mobileInput?.moveX ?? 0;
    dy += this.mobileInput?.moveY ?? 0;

    const wantsToSprint = (this.cursors.shift?.isDown || this.keys.sprint.isDown || this.mobileInput?.sprint) && (dx !== 0 || dy !== 0);
    const canStartSprint = wantsToSprint && this.state.player.stamina > 0 && (this.state.player.staminaRecoveryCooldown <= 0 || this.state.player.isSprinting);
    this.state.player.isSprinting = canStartSprint;

    if (this.state.player.isSprinting) {
      this.state.player.stamina = Math.max(0, this.state.player.stamina - this.state.player.staminaDrainPerSecond * delta);
      this.state.player.staminaRecoveryCooldown = this.state.player.staminaRecoveryDelay;
      if (this.state.player.stamina <= 0) {
        this.state.player.isSprinting = false;
      }
    } else {
      this.state.player.staminaRecoveryCooldown = Math.max(0, this.state.player.staminaRecoveryCooldown - delta);
      if (this.state.player.staminaRecoveryCooldown <= 0) {
        this.state.player.stamina = Math.min(this.state.player.staminaMax, this.state.player.stamina + this.state.player.staminaRecoveryPerSecond * delta);
      }
    }

    const speed = this.state.player.speed * (this.state.player.isSprinting ? this.state.player.sprintMultiplier : 1);
    const direction = normalize(dx, dy);
    const movementX = dx === 0 && dy === 0 ? 0 : direction.x * speed * delta;
    const movementY = dx === 0 && dy === 0 ? 0 : direction.y * speed * delta;

    if (movementX !== 0) {
      const previousX = this.player.x;
      this.player.x = clamp(this.player.x + movementX, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width);
      if (this.isBlocked(this.player, 34, 56, true)) this.player.x = previousX;
    }

    if (movementY !== 0) {
      const previousY = this.player.y;
      this.player.y = clamp(this.player.y + movementY, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height);
      if (this.isBlocked(this.player, 34, 56, true)) this.player.y = previousY;
    }

    this.updatePlayerAnimation(delta, movementX, movementY);
    this.updateSprintSound();

    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
  }

  updateSprintSound() {
    if (!this.sprintSound) {
      return;
    }

    if (this.state.player.isSprinting) {
      if (!this.sprintSound.isPlaying) {
        this.sprintSound.play();
      }
      return;
    }

    if (this.sprintSound.isPlaying) {
      this.sprintSound.stop();
    }
  }

  updateChaseLaughs(delta) {
    this.chaseLaughCooldown = Math.max(0, (this.chaseLaughCooldown ?? 0) - delta);

    const carryingKids = this.state.kids.filter((kid) => kid.state === 'carrying' && kid.carrying.length > 0);
    for (const kid of carryingKids) {
      const currentDistance = distance(kid, this.player);
      const previousDistance = kid.lastPlayerDistance ?? currentDistance;
      const isApproaching = currentDistance < previousDistance - 2;

      if (this.state.player.isSprinting && isApproaching && currentDistance <= CHASE_LAUGH_DISTANCE && this.chaseLaughCooldown <= 0) {
        const soundKey = Phaser.Utils.Array.GetRandom(this.kidLaughSounds);
        this.sound.play(soundKey, { volume: 0.34 });
        this.chaseLaughCooldown = CHASE_LAUGH_COOLDOWN;
      }

      kid.lastPlayerDistance = currentDistance;
    }

    for (const kid of this.state.kids) {
      if (kid.state !== 'carrying' || kid.carrying.length === 0) {
        kid.lastPlayerDistance = distance(kid, this.player);
      }
    }
  }

  updatePlayerAnimation(delta, movementX, movementY) {
    const isMoving = movementX !== 0 || movementY !== 0;

    if (movementX < 0) {
      this.playerFacing = 'left';
    } else if (movementX > 0) {
      this.playerFacing = 'right';
    }

    this.playerSprite.setFlipX(this.playerFacing === 'left');

    if (!isMoving) {
      this.playerWalkTimer = 0;
      this.playerWalkFrame = 0;
      this.playerSprite.setTexture('librarian-walk-1');
      return;
    }

    this.playerWalkTimer += delta;
    if (this.playerWalkTimer >= 0.18) {
      this.playerWalkTimer = 0;
      this.playerWalkFrame = this.playerWalkFrame === 0 ? 1 : 0;
      this.playerSprite.setTexture(this.playerWalkFrame === 0 ? 'librarian-walk-1' : 'librarian-walk-2');
    }
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
          if (this.isTouchingShelf(kid, kid.targetShelf, 10)) {
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
              const pickupSoundKey = Phaser.Utils.Array.GetRandom(this.kidPickupSounds);
              this.sound.play(pickupSoundKey, { volume: 0.32 });
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

      if (this.isBlocked(kid, 28, 44, false)) {
        kid.x = previous.x;
        kid.y = previous.y;
        if (kid.state === 'movingToShelf' && this.isTouchingShelf(previous, kid.targetShelf, 12)) {
          kid.state = 'looting';
          kid.actionTimer = archetype.shelfTime;
        } else if (kid.state === 'movingToShelf') {
          kid.state = 'idle';
        }
      }

      this.updateKidSprite(kid, previous);

      kid.container.x = kid.x;
      kid.container.y = kid.y;
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

    const nearbyShelves = this.state.shelves.filter((shelf) => {
      return Math.abs(this.player.x - shelf.x) <= shelf.width / 2 + this.state.player.shelfRadius
        && Math.abs(this.player.y - shelf.y) <= shelf.height / 2 + this.state.player.shelfRadius;
    });
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

    shelf.shadow = this.add.rectangle(shelf.x + 5, shelf.y + 8, shelf.width + 6, shelf.height + 6, 0x000000, 0.16);
    shelf.body = this.add.rectangle(shelf.x, shelf.y, shelf.width, shelf.height, 0x5b381f).setStrokeStyle(3, 0x2d1a0f);
    shelf.strip = this.add.rectangle(shelf.x, shelf.y - shelf.height / 2 + 8, shelf.width - 10, 10, shelf.color);
    shelf.labelText = this.add.text(shelf.x, shelf.y - shelf.height / 2 + 24, shelf.label.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#fff5dc',
      align: 'center',
      stroke: '#2d1a0f',
      strokeThickness: 2,
      wordWrap: { width: shelf.width - 14, useAdvancedWrap: true }
    }).setOrigin(0.5, 0.5);
    shelf.base = this.add.rectangle(shelf.x, shelf.y + shelf.height / 2 + 8, 28, 12, 0x49301a);
    shelf.leftFoot = this.add.rectangle(shelf.x - 20, shelf.y + shelf.height / 2 + 15, 8, 14, 0x3a2415);
    shelf.rightFoot = this.add.rectangle(shelf.x + 20, shelf.y + shelf.height / 2 + 15, 8, 14, 0x3a2415);
    shelf.bookSlots = [];

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const slotX = shelf.x - 26 + col * 26;
        const slotY = shelf.y - 30 + row * 34;
        const slot = this.add.rectangle(slotX, slotY, 14, 22, shelf.color, 0.85).setStrokeStyle(1, 0x2a180d, 0.65);
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

    book.shadow = this.add.ellipse(shelf.x, shelf.y + 8, 18, 10, 0x000000, 0.18).setVisible(false);
    book.sprite = this.add.rectangle(shelf.x, shelf.y, 16, 26, shelf.color).setStrokeStyle(1, 0x3a261a).setVisible(false);
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
      fleeTimer: 0,
      appearanceIndex: this.mathRng.integerInRange(0, 4),
      facing: this.mathRng.pick(['left', 'right']),
      lastPlayerDistance: distance({ x: spawn.x, y: spawn.y }, this.player ?? { x: this.layout.playerSpawn.x, y: this.layout.playerSpawn.y })
    };

    const sprite = this.add.container(kid.x, kid.y);
    const shadow = this.add.ellipse(0, 14, 24, 12, 0x000000, 0.18);
    const kidSprite = this.add.sprite(0, 18, 'kids-sheet', kid.appearanceIndex + 5)
      .setOrigin(0.5, 1)
      .setScale(0.24)
      .setFlipX(kid.facing === 'left');
    const carriedIndicator = this.add.rectangle(0, -28, 12, 16, 0xffffff).setStrokeStyle(1, 0x3a261a).setVisible(false);
    sprite.add([shadow, kidSprite, carriedIndicator]);

    kid.container = sprite;
    kid.sprite = kidSprite;
    kid.carriedIndicator = carriedIndicator;

    this.state.kids.push(kid);
    this.setStatus(KID_ARCHETYPES[archetype].label + ' entered the library');
  }

  isTouchingShelf(actor, shelf, padding = 0) {
    if (!actor || !shelf) {
      return false;
    }

    const actorHalfWidth = 14;
    const actorHalfHeight = 22;
    return Math.abs(actor.x - shelf.x) <= shelf.width / 2 + actorHalfWidth + padding
      && Math.abs(actor.y - shelf.y) <= shelf.height / 2 + actorHalfHeight + padding;
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

  recordFloorBookEvent(source, book, position, extra = {}) {
    const event = {
      time: Math.round(this.state.run.elapsed),
      source,
      book: book?.label ?? 'Unknown',
      x: Math.round(position.x),
      y: Math.round(position.y),
      ...extra
    };

    this.debugFloorBookEvents.unshift(event);
    this.debugFloorBookEvents = this.debugFloorBookEvents.slice(0, 3);

    const summary = `${source}: ${event.book} @ ${event.x},${event.y}` + (event.kidId ? ` by ${event.kidId}` : '');
    this.debugFloorText?.setText(`Floor debug\n${summary}`).setVisible(true);
    console.info('[FloorBookDebug]', event);
  }

  dropKidBooks(kid) {
    for (const book of kid.carrying) {
      const scatter = this.findOpenFloorPoint(kid.x, kid.y, 38, 16, 26);
      book.state = 'floor';
      book.x = scatter.x;
      book.y = scatter.y;
      book.ownerId = null;
      book.floorAge = 0;
      book.shadow.setPosition(scatter.x, scatter.y + 7).setVisible(true);
      book.sprite.setPosition(scatter.x, scatter.y).setVisible(true);
      this.recordFloorBookEvent('kid-drop', book, scatter, { kidId: kid.id });
    }

    if (kid.carrying.length > 0) {
      this.state.run.streak = 0;
      this.setStatus('Books hit the floor. Chaos is rising.');
    }
  }
  isTooCloseToShelf(target, width, height, padding = 0) {
    const left = target.x - width / 2;
    const right = target.x + width / 2;
    const top = target.y - height / 2;
    const bottom = target.y + height / 2;

    return this.state.shelves.some((shelf) => {
      const shelfLeft = shelf.x - shelf.width / 2 - padding;
      const shelfRight = shelf.x + shelf.width / 2 + padding;
      const shelfTop = shelf.y - shelf.height / 2 - padding;
      const shelfBottom = shelf.y + shelf.height / 2 + padding;
      return right > shelfLeft && left < shelfRight && bottom > shelfTop && top < shelfBottom;
    });
  }
  findOpenFloorPoint(originX, originY, radius, width, height) {
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const point = randomPointInCircle(this, originX, originY, radius);
      const candidate = {
        x: clamp(point.x, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width),
        y: clamp(point.y, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height)
      };

      if (!this.isBlocked(candidate, width, height, true) && !this.isTooCloseToShelf(candidate, width, height, 18)) {
        return candidate;
      }
    }

    const fallback = {
      x: clamp(originX, this.layout.bounds.x, this.layout.bounds.x + this.layout.bounds.width),
      y: clamp(originY, this.layout.bounds.y, this.layout.bounds.y + this.layout.bounds.height)
    };

    if (!this.isBlocked(fallback, width, height, true) && !this.isTooCloseToShelf(fallback, width, height, 18)) {
      return fallback;
    }

    return {
      x: this.layout.playerSpawn.x,
      y: this.layout.playerSpawn.y
    };
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
    if (this.state.player.carriedBooks.length > 0) {
      this.heldBookIndicator.setVisible(true);
      this.heldBookIndicator.x = this.player.x + 30;
      this.heldBookIndicator.y = this.player.y - 26;
      this.heldBookIndicator.fillColor = this.state.player.carriedBooks[0].color;
      this.heldBookCount.setVisible(true);
      this.heldBookCount.x = this.player.x + 48;
      this.heldBookCount.y = this.player.y - 34;
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
      if (kid.carrying.length > 0) {
        kid.carriedIndicator.fillColor = kid.carrying[0].color;
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
    const staminaRatio = this.state.player.stamina / this.state.player.staminaMax;
    this.staminaBar.width = 188 * staminaRatio;
    this.staminaBar.fillColor = staminaRatio > 0.45 ? 0x5cc8ff : staminaRatio > 0.15 ? 0xf2c14e : 0xe45858;
  }

  updateKidVisual(kid) {
    kid.carriedIndicator.setVisible(kid.carrying.length > 0);
  }

  updateKidSprite(kid, previous) {
    const movedX = kid.x - previous.x;
    const movedY = kid.y - previous.y;
    const isMoving = Math.abs(movedX) > 0.01 || Math.abs(movedY) > 0.01;
    const shouldAnimate = isMoving && kid.state !== 'looting';

    if (movedX < -0.01) {
      kid.facing = 'left';
    } else if (movedX > 0.01) {
      kid.facing = 'right';
    }

    kid.sprite.setFlipX(kid.facing === 'left');

    if (!shouldAnimate) {
      kid.walkTimer = 0;
      kid.walkFrame = 0;
      kid.sprite.setFrame(kid.appearanceIndex + 5);
      return;
    }

    kid.walkTimer = kid.walkTimer ?? 0;
    kid.walkFrame = kid.walkFrame ?? 0;
    kid.walkTimer += this.game.loop.delta / 1000;
    if (kid.walkTimer >= 0.18) {
      kid.walkTimer = 0;
      kid.walkFrame = kid.walkFrame === 0 ? 1 : 0;
    }

    kid.sprite.setFrame(kid.appearanceIndex + (kid.walkFrame === 0 ? 0 : 5));
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
    if (this.sprintSound?.isPlaying) {
      this.sprintSound.stop();
    }

    this.mobileInput.sprint = false;
    this.mobileInput.sprintPointerId = null;
    this.resetMobileJoystick();
    this.refreshMobileControlVisuals();

    this.isPausedByMenu = true;
    this.pauseReason = this.pauseReason || 'pause';
    this.pauseOverlay.setVisible(true);
    this.pauseTitle.setText(title).setVisible(true);
    this.pauseDescription.setText(description).setVisible(true);
  }

  resumeSimulation() {
    this.mobileInput.sprint = false;
    this.mobileInput.sprintPointerId = null;
    this.resetMobileJoystick();
    this.refreshMobileControlVisuals();
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
    if (this.sprintSound?.isPlaying) {
      this.sprintSound.stop();
    }

    this.mobileInput.sprint = false;
    this.mobileInput.sprintPointerId = null;
    this.resetMobileJoystick();
    this.refreshMobileControlVisuals();

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

























