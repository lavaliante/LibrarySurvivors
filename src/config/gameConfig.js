import Phaser from 'phaser';

export const GAME_CONFIG = {
  parent: 'game-root',
  width: 1280,
  height: 720,
  backgroundColor: '#d7c7a7',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  input: {
    activePointers: 4,
    touch: {
      capture: true
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};
