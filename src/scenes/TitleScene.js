import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

const BACKGROUND_IMAGES = [
  { key: 'library-bg-1', path: 'images/library1.jpg', lift: 0.0 },
  { key: 'library-bg-2', path: 'images/library2.png', lift: 0.03 },
  { key: 'library-bg-3', path: 'images/library3.png', lift: 0.045 },
  { key: 'library-bg-4', path: 'images/library4.png', lift: 0.06 },
  { key: 'library-bg-5', path: 'images/library5.png', lift: 0.08 },
  { key: 'library-bg-6', path: 'images/library6.png', lift: 0.095 }
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

    for (const background of BACKGROUND_IMAGES) {
      if (!this.textures.exists(background.key)) {
        this.load.image(background.key, background.path);
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
    this.backgroundImages = [];
    this.backgroundLifts = [];

    BACKGROUND_IMAGES.forEach((background, index) => {
      const image = this.add.image(WORLD.width / 2, WORLD.height / 2, background.key)
        .setDisplaySize(WORLD.width, WORLD.height)
        .setAlpha(index === 0 ? 1 : 0)
        .setDepth(DEPTHS.background);

      const lift = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0xfff1d0, background.lift)
        .setAlpha(index === 0 ? background.lift : 0)
        .setDepth(DEPTHS.background + 1);

      this.backgroundImages.push(image);
      this.backgroundLifts.push(lift);
    });

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x120b08, 0.18)
      .setDepth(DEPTHS.overlay);
    this.add.rectangle(WORLD.width / 2, WORLD.height - 56, WORLD.width, 112, 0x140d09, 0.48)
      .setDepth(DEPTHS.overlay);
  }

  startBackdropCycle() {
    this.time.addEvent({
      delay: 950,
      loop: true,
      callback: () => {
        const previousImage = this.backgroundImages[this.backgroundIndex];
        const previousLift = this.backgroundLifts[this.backgroundIndex];

        if (this.backgroundIndex === this.backgroundImages.length - 1) {
          this.backgroundDirection = -1;
        } else if (this.backgroundIndex === 0) {
          this.backgroundDirection = 1;
        }

        this.backgroundIndex += this.backgroundDirection;

        const nextImage = this.backgroundImages[this.backgroundIndex];
        const nextLift = this.backgroundLifts[this.backgroundIndex];
        const nextLiftAlpha = BACKGROUND_IMAGES[this.backgroundIndex].lift;

        previousImage.setDepth(DEPTHS.background);
        nextImage.setDepth(DEPTHS.background + 1);
        previousLift.setDepth(DEPTHS.background + 1);
        nextLift.setDepth(DEPTHS.background + 2);

        this.tweens.add({
          targets: [previousImage, previousLift],
          alpha: 0,
          duration: 420,
          ease: 'Sine.easeInOut'
        });

        this.tweens.add({
          targets: nextImage,
          alpha: 1,
          duration: 420,
          ease: 'Sine.easeInOut'
        });

        this.tweens.add({
          targets: nextLift,
          alpha: nextLiftAlpha,
          duration: 420,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  drawHeroText() {
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

    this.musicHint = this.add.text(WORLD.width / 2, 378, 'Click Start or Instructions to begin the soundtrack.', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f2cf8f',
      align: 'center',
      stroke: '#2b1a11',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTHS.ui);

    this.add.text(WORLD.width / 2, 406, 'Soundtrack copyright Ruth Lachs (rutilachs@gmail.com)', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ebc17d',
      align: 'center',
      stroke: '#2b1a11',
      strokeThickness: 3
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
      color: '#f6d89a',
      stroke: '#2b1a11',
      strokeThickness: 3
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

