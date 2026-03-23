import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  preload() {
    this.load.audio('soundtrack', 'audio/whistling_in_the_wind.mp3');
  }

  create() {
    this.cameras.main.setBackgroundColor('#cbb38a');
    this.soundtrack = this.sound.get('soundtrack') ?? this.sound.add('soundtrack', { loop: true, volume: 0.42 });
    this.instructionsVisible = false;

    this.drawBackdrop();
    this.drawShell();
    this.drawHeroText();
    this.createButtons();
    this.createInstructionsPanel();
    this.registerInput();
  }

  drawBackdrop() {
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0xc8ad7f);

    for (let index = 0; index < 8; index += 1) {
      const x = 120 + index * 150;
      this.add.rectangle(x, WORLD.height / 2, 90, WORLD.height + 140, 0xf7e7b7, 0.07).setRotation(0.09);
    }

    this.add.rectangle(WORLD.width / 2, WORLD.height - 74, WORLD.width, 148, 0x7d5a3b, 0.55);
    this.add.rectangle(WORLD.width / 2, WORLD.height - 36, WORLD.width, 72, 0x5a3d28, 0.7);
  }

  drawShell() {
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 1080, 580, 0xf7efd9, 0.95).setStrokeStyle(6, 0x6d4c41);
    this.add.rectangle(WORLD.width / 2, 120, 920, 80, 0xefe1bf, 0.8).setStrokeStyle(2, 0x8f6d46, 0.9);
    this.add.rectangle(260, 500, 250, 190, 0x6a4526, 0.15).setStrokeStyle(2, 0x6a4526, 0.3);
    this.add.rectangle(1020, 500, 250, 190, 0x6a4526, 0.15).setStrokeStyle(2, 0x6a4526, 0.3);
  }

  drawHeroText() {
    this.add.text(WORLD.width / 2, 92, 'LIBRARY SURVIVORS', {
      fontSize: '58px',
      color: '#3a2a1d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 205, 'Hold the line between neat shelves and total mayhem.', {
      fontSize: '28px',
      color: '#4f3b2b',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 265, 'Intercept mischievous kids, rescue scattered books, and keep chaos below 100% through a full 30-minute shift.', {
      fontSize: '22px',
      color: '#5c4736',
      align: 'center',
      wordWrap: { width: 840 }
    }).setOrigin(0.5);

    this.musicHint = this.add.text(WORLD.width / 2, 330, 'Click Start or Instructions to begin the soundtrack.', {
      fontSize: '18px',
      color: '#7f5539',
      align: 'center'
    }).setOrigin(0.5);
  }

  createButtons() {
    this.buildButton(WORLD.width / 2, 440, 320, 68, 'START GAME', 0x2a1b12, 0x8d6a43, () => {
      this.ensureSoundtrack();
      this.scene.start('game');
    });

    this.buildButton(WORLD.width / 2, 530, 320, 60, 'INSTRUCTIONS', 0x5f4330, 0xc49a6c, () => {
      this.ensureSoundtrack();
      this.toggleInstructions();
    });

    this.add.text(WORLD.width / 2, 615, 'Keyboard shortcut: press ENTER or SPACE to start', {
      fontSize: '21px',
      color: '#7f5539'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 675, 'Soundtrack copyright Ruth Lachs (rutilachs@gmail.com)', {
      fontSize: '16px',
      color: '#6b513d',
      align: 'center'
    }).setOrigin(0.5);
  }

  createInstructionsPanel() {
    this.instructionsContainer = this.add.container(0, 0).setVisible(false);

    const overlay = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x120c08, 0.62)
      .setInteractive();
    const panel = this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 860, 430, 0xfff6e8, 0.98)
      .setStrokeStyle(5, 0x6d4c41);

    const title = this.add.text(WORLD.width / 2, 200, 'How To Play', {
      fontSize: '42px',
      color: '#3a2a1d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const body = this.add.text(WORLD.width / 2, 345, [
      'Move with WASD or the arrow keys.',
      'Books are picked up automatically when you walk close to them.',
      'Stand near the correct shelf to file matching books back in place.',
      'Catch kids while they are carrying books to intercept them before they dump them.',
      'Press P during the run to pause your shift.'
    ], {
      fontSize: '24px',
      color: '#4f3b2b',
      align: 'center',
      lineSpacing: 14,
      wordWrap: { width: 700 }
    }).setOrigin(0.5);

    const closeButton = this.buildButton(WORLD.width / 2, 540, 220, 56, 'CLOSE', 0x2a1b12, 0x8d6a43, () => {
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
      fontSize: '28px',
      color: '#fff6e5',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.on('pointerover', () => {
      const hoveredColor = Phaser.Display.Color.IntegerToColor(fillColor).brighten(12).color;
      button.setFillStyle(hoveredColor);
      button.setScale(1.02);
      text.setScale(1.02);
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

