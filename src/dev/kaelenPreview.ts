import { Application } from 'pixi.js';
import { Game } from '../core/Game';
import { WaveSystem } from '../systems/WaveSystem';
import { loadGameArt } from '../visual/art';
import { loadArenaArt } from '../visual/arenaArt';
import { loadInterfaceFonts } from '../visual/fonts';

// Vite development entry only: reuse the real scene, input and combat code.
if (!import.meta.env.DEV) throw new Error('Prévia disponível apenas no servidor de desenvolvimento.');
await loadInterfaceFonts();
await loadGameArt();
await loadArenaArt();
const app = new Application();
await app.init({ width: 960, height: 540, background: 0x172b3b, antialias: true });
document.querySelector('#app')!.replaceChildren(app.canvas);
app.canvas.setAttribute('aria-label', 'Última Linha — validação de Kaelen');
const game = new Game(app);
const waves = new WaveSystem();
waves.currentWave = 3;
waves.startWave();
game.state.wave = 3;
game.changeScene('last-stand', waves);
document.querySelector('#validation-status')!.textContent = 'Cena real carregada; animações em direção SE. Clique no palco para focar os controles.';
