import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#d6c3a3');
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 1120, 580, 0xf4ead4, 0.96).setStrokeStyle(6, 0x6d4c41);
    this.add.text(WORLD.width / 2, 150, 'Library Survivors', {
      fontSize: '54px',
      color: '#3a2a1d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 250, 'Restore order. Intercept rowdy kids. Survive 30 minutes before chaos wins.', {
      fontSize: '24px',
      color: '#4f3b2b',
      align: 'center',
      wordWrap: { width: 860 }
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 375, [
      'WASD / Arrow Keys: Move',
      'P: Pause',
      'Books are picked up and shelved automatically when you are in range.',
      'Stay near kids carrying books to intercept them before they spread chaos.'
    ], {
      fontSize: '22px',
      color: '#5c4736',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 560, 'Press SPACE, SHIFT, ENTER, or click to begin your shift', {
      fontSize: '26px',
      color: '#7f5539'
    }).setOrigin(0.5);

    const startButton = this.add.rectangle(WORLD.width / 2, 620, 280, 58, 0x2a1b12)
      .setStrokeStyle(3, 0x8d6a43)
      .setInteractive({ useHandCursor: true });

    this.add.text(WORLD.width / 2, 620, 'START SHIFT', {
      fontSize: '28px',
      color: '#fff6e5',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    let started = false;
    const startGame = () => {
      if (started) {
        return;
      }
      started = true;
      this.scene.start('game');
    };

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).once('down', startGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).once('down', startGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).once('down', startGame);
    this.input.once('pointerdown', startGame);
    startButton.on('pointerup', startGame);

    // Fallback so the game always starts even if keyboard input is not captured.
    this.time.delayedCall(2000, startGame);
  }
}
