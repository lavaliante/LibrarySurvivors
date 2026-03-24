import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

const BACKGROUND_IMAGES = [
  ['library-bg-1', 'images/library1.jpg'],
  ['library-bg-2', 'images/library2.png'],
  ['library-bg-3', 'images/library3.png'],
  ['library-bg-4', 'images/library4.png'],
  ['library-bg-5', 'images/library5.png'],
  ['library-bg-6', 'images/library6.png']
];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  preload() {
    this.load.audio('soundtrack', 'audio/whistling_in_the_wind.mp3');

    for (const [key, path] of BACKGROUND_IMAGES) {
      if (!this.textures.exists(key)) {
        this.load.image(key, path);
      }
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#14100d');
    this.soundtrack = this.sound.get('soundtrack') ?? this.sound.add('soundtrack', { loop: true, volume: 0.42 });
    this.instructionsVisible = false;
    this.backgroundIndex = 0;

    this.drawBackdrop();
    this.drawShell();
    this.drawHeroText();
    this.createButtons();
    this.createInstructionsPanel();
    this.registerInput();
    this.startBackdropCycle();
  }

  drawBackdrop() {
    this.backgroundImages = BACKGROUND_IMAGES.map(([key], index) => {
      return this.add.image(WORLD.width / 2, WORLD.height / 2, key)
        .setDisplaySize(WORLD.width, WORLD.height)
        .setAlpha(index === 0 ? 1 : 0);
    });

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x120d09, 0.38);

    for (let index = 0; index < 6; index += 1) {
      const y = 70 + index * 120;
      this.add.rectangle(WORLD.width / 2, y, WORLD.width, 2, 0xfff1c1, 0.05);
    }

    this.add.rectangle(WORLD.width / 2, WORLD.height - 54, WORLD.width, 108, 0x1d130d, 0.72);
  }

  startBackdropCycle() {
    this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        const previousImage = this.backgroundImages[this.backgroundIndex];
        this.backgroundIndex = (this.backgroundIndex + 1) % this.backgroundImages.length;
        const nextImage = this.backgroundImages[this.backgroundIndex];

        previousImage.setDepth(0);
        nextImage.setDepth(1);

        this.tweens.add({
          targets: previousImage,
          alpha: 0,
          duration: 900,
          ease: 'Sine.easeInOut'
        });

        this.tweens.add({
          targets: nextImage,
          alpha: 1,
          duration: 900,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  drawShell() {
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 1110, 595, 0xf4e7c9, 0.82).setStrokeStyle(6, 0x4f3423, 0.95);
    this.add.rectangle(WORLD.width / 2, 135, 960, 126, 0x1c120c, 0.78).setStrokeStyle(3, 0xe2bf72, 0.85);
    this.add.rectangle(WORLD.width / 2, 302, 920, 130, 0xfff7e6, 0.82).setStrokeStyle(2, 0xa77b54, 0.45);
  }

  drawHeroText() {
    const titleShadow = this.add.text(WORLD.width / 2 + 6, 120, 'LIBRARY\nSURVIVORS', {
      fontFamily: 'monospace',
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#2a160d',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5, 0.5);

    this.add.text(WORLD.width / 2, 114, 'LIBRARY\nSURVIVORS', {
      fontFamily: 'monospace',
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#ffe7a7',
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
    }).setOrigin(0.5, 0.5);

    titleShadow.setLetterSpacing(6);

    this.add.text(WORLD.width / 2, 250, 'Restore order before the whole library turns into 16-bit chaos.', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#4f3b2b',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 302, 'Intercept rowdy kids, rescue scattered books, and survive a full thirty-minute shift.', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#6a523d',
      align: 'center',
      wordWrap: { width: 780 }
    }).setOrigin(0.5);

    this.musicHint = this.add.text(WORLD.width / 2, 368, 'Click Start or Instructions to begin the soundtrack.', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#6f4f33',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 396, 'Soundtrack copyright Ruth Lachs (rutilachs@gmail.com)', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#5e422d',
      align: 'center'
    }).setOrigin(0.5);
  }

  createButtons() {
    this.buildButton(WORLD.width / 2, 482, 360, 72, 'START GAME', 0x24140d, 0xe0b56a, () => {
      this.ensureSoundtrack();
      this.scene.start('game');
    });

    this.buildButton(WORLD.width / 2, 570, 360, 62, 'INSTRUCTIONS', 0x5a3a25, 0xf0c98e, () => {
      this.ensureSoundtrack();
      this.toggleInstructions();
    });

    this.add.text(WORLD.width / 2, 644, 'PRESS ENTER OR SPACE TO START', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f6d89a'
    }).setOrigin(0.5);
  }

  createInstructionsPanel() {
    this.instructionsContainer = this.add.container(0, 0).setVisible(false);

    const overlay = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x090604, 0.82)
      .setInteractive();
    const panel = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 900, 450, 0xfff4df, 0.98)
      .setStrokeStyle(5, 0x4f3423);

    const title = this.add.text(WORLD.width / 2, 190, 'HOW TO PLAY', {
      fontFamily: 'monospace',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#2d1a10'
    }).setOrigin(0.5);

    const body = this.add.text(WORLD.width / 2, 340, [
      'MOVE WITH WASD OR THE ARROW KEYS.',
      'BOOKS ARE PICKED UP AUTOMATICALLY WHEN YOU WALK CLOSE TO THEM.',
      'STAND NEAR THE CORRECT SHELF TO FILE MATCHING BOOKS BACK IN PLACE.',
      'CATCH KIDS WHILE THEY ARE CARRYING BOOKS TO INTERCEPT THEM.',
      'PRESS P DURING THE RUN TO PAUSE YOUR SHIFT.'
    ], {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#4f3b2b',
      align: 'center',
      lineSpacing: 14,
      wordWrap: { width: 720 }
    }).setOrigin(0.5);

    const closeButton = this.buildButton(WORLD.width / 2, 545, 240, 56, 'CLOSE', 0x24140d, 0xe0b56a, () => {
      this.toggleInstructions(false);
    });

    overlay.on('pointerup', () => this.toggleInstructions(false));

    this.instructionsContainer.add([overlay, panel, title, body, ...closeButton]);
  }

  buildButton(x, y, width, height, label, fillColor, strokeColor, onPress) {
    const button = this.add.rectangle(x, y, width, height, fillColor)
      .setStrokeStyle(3, strokeColor)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#fff3d4'
    }).setOrigin(0.5);

    button.on('pointerover', () => {
      const hoveredColor = Phaser.Display.Color.IntegerToColor(fillColor).brighten(18).color;
      button.setFillStyle(hoveredColor);
      button.setScale(1.03);
      text.setScale(1.03);
    });

    button.on('pointerout', () => {
      button.setFillStyle(fillColor);
      button.setScale(1);
      text.setScale(1);
    });

    button.on('pointerup', onPress);

    return [button, text];
  }

  registerInput() {
    const startGame = () => {
      this.ensureSoundtrack();
      this.scene.start('game');
    };

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', startGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', startGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I).on('down', () => {
      this.ensureSoundtrack();
      this.toggleInstructions();
    });
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (this.instructionsVisible) {
        this.toggleInstructions(false);
      }
    });
  }

  ensureSoundtrack() {
    if (!this.soundtrack.isPlaying) {
      this.soundtrack.play();
      this.musicHint.setText('Soundtrack playing: Whistling in the Wind');
    }
  }

  toggleInstructions(forceState) {
    this.instructionsVisible = typeof forceState === 'boolean' ? forceState : !this.instructionsVisible;
    this.instructionsContainer.setVisible(this.instructionsVisible);
  }
}
