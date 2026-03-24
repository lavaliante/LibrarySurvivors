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
        .setAlpha(index === 0 ? 1 : 0)
        .setDepth(DEPTHS.background);
    });

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x100a07, 0.26)
      .setDepth(DEPTHS.overlay);
    this.add.rectangle(WORLD.width / 2, WORLD.height - 56, WORLD.width, 112, 0x140d09, 0.58)
      .setDepth(DEPTHS.overlay);
  }

  startBackdropCycle() {
    this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        const previousImage = this.backgroundImages[this.backgroundIndex];
        this.backgroundIndex = (this.backgroundIndex + 1) % this.backgroundImages.length;
        const nextImage = this.backgroundImages[this.backgroundIndex];

        previousImage.setDepth(DEPTHS.background);
        nextImage.setDepth(DEPTHS.background + 1);

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

  drawHeroText() {
    this.add.rectangle(WORLD.width / 2, 132, 760, 136, 0x120c09, 0.64)
      .setStrokeStyle(3, 0xe6c173, 0.82)
      .setDepth(DEPTHS.ui);
    this.add.rectangle(WORLD.width / 2, 304, 860, 152, 0x120c09, 0.58)
      .setStrokeStyle(2, 0xe6c173, 0.55)
      .setDepth(DEPTHS.ui);

    const titleShadow = this.add.text(WORLD.width / 2 + 6, 118, 'LIBRARY\nSURVIVORS', {
      fontFamily: 'monospace',
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#1f120b',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
    titleShadow.setLetterSpacing(6);

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

    this.add.text(WORLD.width / 2, 258, 'Restore order before the whole library turns into 16-bit chaos.', {
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fff0c8',
      align: 'center'
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.add.text(WORLD.width / 2, 314, 'Intercept rowdy kids, rescue scattered books, and survive a full thirty-minute shift.', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f9ddb0',
      align: 'center',
      wordWrap: { width: 760 }
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.musicHint = this.add.text(WORLD.width / 2, 382, 'Click Start or Instructions to begin the soundtrack.', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f2cf8f',
      align: 'center'
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.add.text(WORLD.width / 2, 410, 'Soundtrack copyright Ruth Lachs (rutilachs@gmail.com)', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ebc17d',
      align: 'center'
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
  }

  createButtons() {
    this.buildButton(WORLD.width / 2, 494, 360, 72, 'START GAME', 0x24140d, 0xe0b56a, () => {
      this.ensureSoundtrack();
      this.scene.start('game');
    });

    this.buildButton(WORLD.width / 2, 582, 360, 62, 'INSTRUCTIONS', 0x5a3a25, 0xf0c98e, () => {
      this.ensureSoundtrack();
      this.toggleInstructions();
    });

    this.add.text(WORLD.width / 2, 650, 'PRESS ENTER OR SPACE TO START', {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f6d89a'
    }).setOrigin(0.5).setDepth(DEPTHS.ui);
  }

  createInstructionsPanel() {
    this.instructionsContainer = this.add.container(0, 0).setVisible(false).setDepth(DEPTHS.modal);

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
    }, DEPTHS.modal);

    overlay.on('pointerup', () => this.toggleInstructions(false));

    this.instructionsContainer.add([overlay, panel, title, body, ...closeButton]);
  }

  buildButton(x, y, width, height, label, fillColor, strokeColor, onPress, depth = DEPTHS.ui) {
    const button = this.add.rectangle(x, y, width, height, fillColor, 0.82)
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
    });

    button.on('pointerout', () => {
      button.setFillStyle(fillColor, 0.82);
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
