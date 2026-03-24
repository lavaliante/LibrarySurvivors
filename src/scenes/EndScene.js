import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('end');
  }

  preload() {
    if (!this.cache.audio.exists('game-loss')) {
      this.load.audio('game-loss', 'audio/public_uh_oh.mp3');
    }
  }

  create(data) {
    const won = Boolean(data?.won);
    this.cameras.main.setBackgroundColor(won ? '#d3ead7' : '#f5d5cf');

    if (!won) {
      this.sound.play('game-loss', { volume: 0.4 });
    }

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 980, 560, 0xfff8ec, 0.97).setStrokeStyle(5, 0x6d4c41);
    this.add.text(WORLD.width / 2, 170, won ? 'Order Restored' : 'Library Overwhelmed', {
      fontSize: '50px',
      color: won ? '#2d6a4f' : '#9d0208',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const stats = [
      `Time Survived: ${data.timeText ?? '0:00'}`,
      `Books Shelved: ${data.booksShelved ?? 0}`,
      `Interceptions: ${data.interceptions ?? 0}`,
      `Level Reached: ${data.level ?? 1}`,
      `Final Score: ${data.score ?? 0}`,
      `Final Chaos: ${Math.round(data.chaos ?? 0)}%`
    ];

    this.add.text(WORLD.width / 2, 330, stats, {
      fontSize: '28px',
      color: '#463526',
      align: 'center',
      lineSpacing: 12
    }).setOrigin(0.5);

    const upgrades = data.upgrades?.length
      ? `Upgrades: ${data.upgrades.join(', ')}`
      : 'Upgrades: None';

    this.add.text(WORLD.width / 2, 500, upgrades, {
      fontSize: '22px',
      color: '#6a523d',
      align: 'center',
      wordWrap: { width: 860 }
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 615, 'Press SPACE, SHIFT, ENTER, or click to play again', {
      fontSize: '24px',
      color: '#7f5539'
    }).setOrigin(0.5);

    const restartGame = () => this.scene.start('game');
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).once('down', restartGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).once('down', restartGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).once('down', restartGame);
    this.input.once('pointerdown', restartGame);
  }
}
