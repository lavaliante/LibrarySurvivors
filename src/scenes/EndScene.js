import Phaser from 'phaser';
import { WORLD } from '../config/tuning.js';

const LOSE_VIDEO = { key: 'library-burning-video', path: 'images/library_burning.mp4' };

export class EndScene extends Phaser.Scene {
  constructor() {
    super('end');
  }

  preload() {
    if (!this.cache.audio.exists('game-loss')) {
      this.load.audio('game-loss', 'audio/public_uh_oh.mp3');
    }

    if (!this.cache.video.exists(LOSE_VIDEO.key)) {
      this.load.video(LOSE_VIDEO.key, LOSE_VIDEO.path, 'loadeddata', false, true);
    }
  }

  create(data) {
    const won = Boolean(data?.won);
    this.cameras.main.setBackgroundColor(won ? '#d7f4dc' : '#120604');

    if (!won) {
      this.createLossBackdrop();
      this.sound.play('game-loss', { volume: 0.4 });
    }

    if (won) {
      this.createCelebrationBackdrop();
    }

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, 980, 560, won ? 0xfff8ec : 0x2a120d, won ? 0.97 : 0.88)
      .setStrokeStyle(5, won ? 0x2d6a4f : 0xb85c38);
    this.add.text(WORLD.width / 2, 156, won ? 'You win' : 'Library Overwhelmed', {
      fontSize: '54px',
      color: won ? '#1b5e20' : '#9d0208',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 212, won ? 'The librarian kept the chaos under control for 10 minutes.' : 'Chaos reached 100% before the shift ended.', {
      fontSize: '24px',
      color: won ? '#2d6a4f' : '#7f1d1d',
      align: 'center'
    }).setOrigin(0.5);

    const stats = [
      `Time Survived: ${data.timeText ?? '0:00'}`,
      `Books Shelved: ${data.booksShelved ?? 0}`,
      `Interceptions: ${data.interceptions ?? 0}`,
      `Level Reached: ${data.level ?? 1}`,
      `Final Score: ${data.score ?? 0}`,
      `Final Chaos: ${Math.round(data.chaos ?? 0)}%`
    ];

    this.add.text(WORLD.width / 2, 344, stats, {
      fontSize: '28px',
      color: won ? '#463526' : '#f7d8c5',
      align: 'center',
      lineSpacing: 12
    }).setOrigin(0.5);

    const upgrades = data.upgrades?.length
      ? `Upgrades: ${data.upgrades.join(', ')}`
      : 'Upgrades: None';

    this.add.text(WORLD.width / 2, 516, upgrades, {
      fontSize: '22px',
      color: won ? '#6a523d' : '#f0c2aa',
      align: 'center',
      wordWrap: { width: 860 }
    }).setOrigin(0.5);

    this.add.text(WORLD.width / 2, 615, 'Press SPACE, SHIFT, ENTER, or tap to play again', {
      fontSize: '24px',
      color: won ? '#7f5539' : '#ffd7ba'
    }).setOrigin(0.5);

    const restartGame = () => this.scene.start('game');
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).once('down', restartGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT).once('down', restartGame);
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).once('down', restartGame);
    this.input.once('pointerdown', restartGame);
  }

  createLossBackdrop() {
    this.backgroundVideo = this.add.video(WORLD.width / 2, WORLD.height / 2, LOSE_VIDEO.key)
      .setOrigin(0.5)
      .setAlpha(0.95);
    this.backgroundVideo.setMute(true);
    this.backgroundVideo.on('created', () => this.fitBackdropVideo());
    this.backgroundVideo.play(true);
    this.fitBackdropVideo();

    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x190806, 0.38);
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

  createCelebrationBackdrop() {
    const colors = [0xf4c542, 0xff7b72, 0x70d6ff, 0x7ae582, 0xffa94d];

    for (let i = 0; i < 28; i += 1) {
      const confetti = this.add.rectangle(
        Phaser.Math.Between(40, WORLD.width - 40),
        Phaser.Math.Between(-220, -20),
        Phaser.Math.Between(10, 18),
        Phaser.Math.Between(18, 34),
        colors[i % colors.length],
        0.9
      ).setAngle(Phaser.Math.Between(-25, 25));

      this.tweens.add({
        targets: confetti,
        y: WORLD.height + 120,
        x: confetti.x + Phaser.Math.Between(-120, 120),
        angle: confetti.angle + Phaser.Math.Between(120, 300),
        alpha: { from: 1, to: 0.25 },
        duration: Phaser.Math.Between(2200, 3600),
        ease: 'Sine.in',
        repeat: -1,
        delay: Phaser.Math.Between(0, 1200),
        onRepeat: () => {
          confetti.setPosition(Phaser.Math.Between(40, WORLD.width - 40), Phaser.Math.Between(-220, -20));
          confetti.setAlpha(1);
          confetti.setAngle(Phaser.Math.Between(-25, 25));
        }
      });
    }
  }
}
