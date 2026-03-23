import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { EndScene } from './scenes/EndScene.js';

const config = {
  type: Phaser.AUTO,
  ...GAME_CONFIG,
  scene: [TitleScene, GameScene, EndScene]
};

new Phaser.Game(config);
