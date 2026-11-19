import { Application } from 'pixi.js';
import { Game } from '../core/Game';
import { ForestScene } from '../scenes/ForestScene';
import { createInitialState } from '../core/GameState';
import { loadGameArt } from '../visual/art';
import { loadArenaArt } from '../visual/arenaArt';
import { loadInterfaceFonts } from '../visual/fonts';

if (!import.meta.env.DEV) throw new Error('Revisão apenas em desenvolvimento.');
await loadInterfaceFonts();
await loadGameArt();
await loadArenaArt();
const app = new Application();
await app.init({ width: 960, height: 540, antialias: true, background: 0x15251e });
document.querySelector('#app')!.appendChild(app.canvas);
const game = new Game(app, 'forest');
const status = document.querySelector('#status')!;
// Diagnostic access only; the production input, scene and state are unchanged.
const internal = game as unknown as { scene: ForestScene; currentSceneId: string };
type Probe = { player: { x: number; y: number; position: { set(x: number, y: number): void } }; nodes: { x: number; y: number; hp: number }[] };
const probe = () => internal.scene as unknown as Probe;
const tick = (n: number) => { for (let i = 0; i < n; i++) { internal.scene.update(game, 1); game.input.endFrame(); } };
const key = (code: string, n: number) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code })); tick(n);
  window.dispatchEvent(new KeyboardEvent('keyup', { code })); tick(1);
};
function reset(paused = false) {
  window.dispatchEvent(new Event('blur')); app.stop();
  game.state = createInitialState(); game.changeScene('forest');
  if (paused) {
    // Same world, daylight, inventory and hero position for every comparison.
    probe().player.position.set(237, 320); tick(24);
    app.renderer.render(app.stage);
  } else app.start();
  status.textContent = paused ? 'Comparação: 960×540, Kaelen (237,320), estado inicial; relógio pausado.' : 'WASD/setas: mover. Segure E junto ao recurso. Portal inferior esquerdo: retornar.';
}
document.querySelector('#reset')!.addEventListener('click', () => reset());
document.querySelector('#freeze')!.addEventListener('click', () => reset(true));
document.querySelector('#smoke')!.addEventListener('click', () => {
  const checks: string[] = [];
  const check = (ok: boolean, label: string) => { if (!ok) throw new Error(label); checks.push('PASS ' + label); };
  try {
    reset(true);
    const x = probe().player.x; key('KeyD', 8);
    check(probe().player.x > x, 'movimento via Input real');
    key('KeyW', 150); check(probe().player.y === 95, 'limite superior preservado');
    const node = probe().nodes[0]!;
    probe().player.position.set(node.x + 22, node.y);
    const wood = game.state.inventory.wood;
    key('KeyE', 185);
    check(game.state.inventory.wood === wood + 3, 'seis golpes coletam 3 madeiras');
    check(probe().nodes.length === 14, 'recurso consumido sem alterar outros nós');
    probe().player.position.set(100, 460); tick(1);
    check(internal.currentSceneId === 'platform-back', 'portal inicia retorno real');
    status.textContent = checks.join('\n');
  } catch (error) { status.textContent = checks.join('\n') + '\nFAIL ' + String(error); }
  app.stop(); app.renderer.render(app.stage);
});
status.textContent = 'Cena real pronta. WASD/setas: mover; E: coletar. Revisão direta complementa o percurso normal.';
