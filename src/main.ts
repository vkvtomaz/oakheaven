import { loadInterfaceFonts } from './visual/fonts';

import { Application } from 'pixi.js';
import { Game } from './core/Game';
import { setupPortal } from './portal/portal';
import { loadGameArt } from './visual/art';
import { loadArenaArt } from './visual/arenaArt';

const container = document.querySelector<HTMLDivElement>('#app');

if (!container) {
  throw new Error('Elemento #app não encontrado!');
}

const gameMount = container;

let startPromise: Promise<void> | null = null;

function startGame(): Promise<void> {
  if (startPromise) return startPromise;

  startPromise = (async () => {
    await loadInterfaceFonts();
    const app = new Application();
    await loadGameArt();
    await loadArenaArt();
    await app.init({
      width: 960,
      height: 540,
      background: 0x172b3b,
      antialias: true,
    });

    app.canvas.setAttribute('aria-label', 'Jogo OAKHEAVEN');
    gameMount.replaceChildren(app.canvas);

    const game = new Game(app, 'platform-out');
    game.audio.initialize();
    game.audio.play('uiStart');
  })();

  startPromise.catch(() => {
    startPromise = null;
  });

  return startPromise;
}

setupPortal({ startGame });
