
import { Application } from 'pixi.js';
import { Game } from './core/Game';

import './style.css';

const app = new Application();

await app.init({
  width: 960,
  height: 540,
  background: 0x172b3b,
  antialias: true,
});

const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Elemento #app não encontrado!');
}

container.replaceChildren(app.canvas);

// Inicializa OAKHEAVEN
new Game(app);
