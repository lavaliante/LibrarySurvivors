import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

const TITLE_VIDEO = { key: 'library-video', path: 'images/library.mp4' };
const TITLE_SOUNDTRACK_VOLUME = 0.10;
const GAME_SOUNDTRACK_VOLUME = 0.42;

const DEPTHS = {
  background: 0,
  overlay: 2,
  ui: 10,
  modal: 20
};

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  preload() {
    this.load.audio('soundtrack', 'audio/whistling_in_the_wind.mp3');
    this.load.audio('menu-select', 'audio/public_menu_select.mp3');

    if (!this.cache.video.exists(TITLE_VIDEO.key)) {
      this.load.video(TITLE_VIDEO.key, TITLE_VIDEO.path, 'loadeddata', false, true);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#14100d');
    this.soundtrack = this.sound.get('soundtrack') ?? this.sound.add('soundtrack', { loop: true, volume: TITLE_SOUNDTRACK_VOLUME });
    this.soundtrack.setVolume(TITLE_SOUNDTRACK_VOLUME);
    this.menuSelectSound = this.sound.add('menu-select', { volume: 0.35 });
    this.instructionsVisible = false;

    this.drawBackdrop();
    this.drawHeroText();
    this.createButtons();
    this.createInstructionsPanel();
    this.registerInput();
    this.registerAudioUnlock();
    this.ensureSoundtrack();
  }

  drawBackdrop() {
    this.backgroundVideo = this.add.video(WORLD.width / 2, WORLD.height / 2, TITLE_VIDEO.key)
      .setOrigin(0.5)
      .setDepth(DEPTHS.background);
    this.backgroundVideo.setMute(true);
    this.backgroundVideo.on('created', () => this.fitBackdropVideo());
    this.backgroundVideo.play(true);
    this.fitBackdropVideo();

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x120b08, 0.18)
      .setDepth(DEPTHS.overlay);
    this.add.rectangle(WORLD.width / 2, WORLD.height - 56, WORLD.width, 112, 0x140d09, 0.48)
      .setDepth(DEPTHS.overlay);
  }

  fitBackdropVideo() {
    const source = this.backgroundVideo?.video;
    const sourceWidth = source?.videoWidth ?? source?.width ?? 0;
    const sourceHeight = source?.videoHeight ?? source?.height ?? 0;

    if (!sourceWidth || !sourceHeight) {
      this.time.delayedCall(120, () => this.fitBackdropVideo());
      return;
    }

    const scale = Math.max(WORLD.width / sourceWidth, WORLD.height / sourceHeight);
    this.backgroundVideo
      .setPosition(WORLD.width / 2, WORLD.height / 2)
      .setScale(scale);
  }

  drawHeroText() {
    this.add.text(WORLD.width / 2, 112, 'LIBRARY\nSURVIVORS', {
      fontFamily: 'monospace',
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#ffe6a0',
      stroke: '#4d2d17',
      strokeThickness: 10,
      align: 'center',
      lineSpacing: 8,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#4d2d17',
        blur: 0,
        stroke: true,
        fill: false
      }
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.add.text(WORLD.width / 2, 252, 'Restore order before the whole library turns into 16-bit chaos.', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fff2d0',
      align: 'center',
      stroke: '#2b1a11',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.add.text(WORLD.width / 2, 308, 'Intercept rowdy kids, rescue scattered books, and survive a full thirty-minute shift.', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f9ddb0',
      align: 'center',
      wordWrap: { width: 760 },
      stroke: '#2b1a11',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.add.text(WORLD.width / 2, 392, 'Soundtrack copyright Ruth Lachs (rutilachs@gmail.com)', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ebc17d',
      align: 'center',
      stroke: '#2b1a11',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
  }

  createButtons() {
    this.buildButton(WORLD.width / 2, 494, 360, 72, 'START GAME', 0x24140d, 0xe0b56a, async () => {
      await this.unlockAudio();
      this.ensureSoundtrack();
      if (this.soundtrack) {
        this.soundtrack.setVolume(GAME_SOUNDTRACK_VOLUME);
      }
      this.scene.start('game');
    });

    this.buildButton(WORLD.width / 2, 582, 360, 62, 'INSTRUCTIONS', 0x5a3a25, 0xf0c98e, () => {
      this.toggleInstructions();
    });
  }

  createInstructionsPanel() {
    this.instructionsContainer = this.add.container(0, 0).setVisible(false).setDepth(DEPTHS.modal);

    const overlay = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x090604, 0.82)
      .setInteractive();
    const panel = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 900, 450, 0xfff4df, 0.98)
      .setStrokeStyle(5, 0x4f3423);

    const title = this.add.text(WORLD.width / 2, 180, 'How to play', {
      fontFamily: 'monospace',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#2d1a10'
    }).setOrigin(0.5);

    const body = this.add.text(WORLD.width / 2, 352, [
      '- Move with WASD or the arrow keys.',
      '- Hold Shift to sprint until your stamina bar runs out.',
      '- Stamina recovers a few seconds after you stop sprinting.',
      '- Books are picked up automatically when you walk close to them.',
      '- Stand near the correct shelf to file matching books back in place.',
      '- Catch kids while they are carrying books to intercept them.',
      '- Press P during the run to pause your shift.'
    ], {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#4f3b2b',
      align: 'left',
      lineSpacing: 16,
      wordWrap: { width: 720 }
    }).setOrigin(0.5);

    const closeButton = this.buildButton(WORLD.width / 2, 545, 240, 56, 'CLOSE', 0x24140d, 0xe0b56a, () => {
      this.toggleInstructions(false);
    }, DEPTHS.modal);

    overlay.on('pointerup', () => this.toggleInstructions(false));

    this.instructionsContainer.add([overlay, panel, title, body, ...closeButton]);
  }

  buildButton(x, y, width, height, label, fillColor, strokeColor, onPress, depth = DEPTHS.ui) {
    const button = this.add.rectangle(x, y, width, height, fillColor, 0.8)
      .setStrokeStyle(3, strokeColor)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#fff3d4'
    }).setOrigin(0.5).setDepth(depth);

    button.on('pointerover', () => {
      const hoveredColor = Phaser.Display.Color.IntegerToColor(fillColor).brighten(18).color;
      button.setFillStyle(hoveredColor, 0.9);
      button.setScale(1.03);
      text.setScale(1.03);
      this.playMenuHoverSound();
    });

    button.on('pointerout', () => {
      button.setFillStyle(fillColor, 0.8);
      button.setScale(1);
      text.setScale(1);
    });

    button.on('pointerup', onPress);

    return [button, text];
  }

  registerInput() {
    const startGame = async () => {
      await this.unlockAudio();
      this.ensureSoundtrack();
      if (this.soundtrack) {
        this.soundtrack.setVolume(GAME_SOUNDTRACK_VOLUME);
      }
      this.scene.start('game');
    };

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', startGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', startGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I).on('down', () => {
      this.toggleInstructions();
    });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (this.instructionsVisible) {
        this.toggleInstructions(false);
      }
    });
  }

  registerAudioUnlock() {
    const unlockAndStart = async () => {
      await this.unlockAudio();
      this.tryStartTitleAudio();
    };

    this.input.once('pointerdown', unlockAndStart);
    this.sound.once('unlocked', () => this.tryStartTitleAudio());

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
    if (this.sound.locked) {
      this.sound.unlock();
    }

    if (this.sound.context?.state === 'suspended') {
      try {
        await this.sound.context.resume();
      } catch (error) {
      }
    }
  }

  tryStartTitleAudio() {
    if (this.sound.locked || this.sound.context?.state === 'suspended') {
      return false;
    }

    this.ensureSoundtrack();
    return this.soundtrack?.isPlaying ?? false;
  }

  ensureSoundtrack() {
    if (this.sound.locked || this.sound.context?.state === 'suspended') {
      return;
    }

    if (!this.soundtrack) {
      this.soundtrack = this.sound.get('soundtrack') ?? this.sound.add('soundtrack', { loop: true, volume: TITLE_SOUNDTRACK_VOLUME });
    }

    if (!this.soundtrack.isPlaying) {
      this.soundtrack.play({ loop: true, volume: TITLE_SOUNDTRACK_VOLUME });
    }

    this.soundtrack.setVolume(TITLE_SOUNDTRACK_VOLUME);
  }

  playMenuHoverSound() {
    if (!this.menuSelectSound) {
      return;
    }

    if (this.menuSelectSound.isPlaying) {
      this.menuSelectSound.stop();
    }

    this.menuSelectSound.play();
  }

  toggleInstructions(forceState) {
    this.instructionsVisible = typeof forceState === 'boolean' ? forceState : !this.instructionsVisible;
    this.instructionsContainer.setVisible(this.instructionsVisible);
  }
}
