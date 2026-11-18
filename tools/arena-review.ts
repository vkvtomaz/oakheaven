import { loadInterfaceFonts } from '../src/visual/fonts';
// Development-only fixture: renders the real Game/DefenseScene, not a mockup.
import { Application, Assets } from 'pixi.js';
import { Game } from '../src/core/Game';
import { loadGameArt } from '../src/visual/art';
import { loadArenaArt } from '../src/visual/arenaArt';
import { getTowerDefinition } from '../src/data/towers';
import type { TowerType } from '../src/core/GameState';

async function run() {
  await loadInterfaceFonts();
  await Assets.init({ preferences: { preferWorkers: false, preferCreateImageBitmap: false } });
  await loadGameArt();
  await loadArenaArt();
  const app = new Application();
  await app.init({ width: 960, height: 540, antialias: true, preference: 'webgl', background: 0x19221d });
  document.body.appendChild(app.canvas);
  const game = new Game(app, 'defense');
  game.state.inventory = { wood: 20, iron: 10, ether: 6, chitin: 8 };
  game.state.towers = ([
    ['arc_ballista', 590, 420], ['slag_forge', 685, 345], ['repulsor', 805, 410],
    ['chitin_cannon', 835, 140], ['spike_barricade', 805, 245],
  ] as [TowerType, number, number][]).map(([type, x, y], index) => {
    const definition = getTowerDefinition(type);
    return { id: index + 1, type, x, y, tier: 1, hp: definition.maxHp, maxHp: definition.maxHp, cooldown: 0 };
  });
  game.changeScene('defense');
  app.stop();
  // Fixed updates enable deterministic screenshots and exercise the actual input/combat loop.
  const defense = (game as unknown as { scene: { update(g:Game,dt:number):void; selected:TowerType|null; enemies: {x:number;y:number}[]; waves: { phase:string } } }).scene;
  app.renderer.render(app.stage);
  if (location.hash.includes('combat')) {
    const check = (condition:boolean, label:string) => { if(!condition) throw new Error(`Smoke failed: ${label}`); };
    const key = (code:string) => {
      window.dispatchEvent(new KeyboardEvent('keydown', {code})); defense.update(game,1);game.input.endFrame();
      window.dispatchEvent(new KeyboardEvent('keyup', {code}));
    };
    const click = (x:number,y:number,shiftKey=false) => {
      app.canvas.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:1,pointerType:'mouse',bubbles:true,shiftKey}));
      app.canvas.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:1,pointerType:'mouse',bubbles:true,shiftKey}));
    };
    key('Digit1');click(490,145);
    check(game.state.towers.length===6,'keyboard selection and map construction');
    const built=game.state.towers[5]!; const wood=game.state.inventory.wood;
    built.hp-=10;click(490,145);
    check(built.hp===built.maxHp&&game.state.inventory.wood===wood-1,'map repair and economy');
    click(490,145,true);click(490,145,true);
    check(built.tier===2,'two-step upgrade');
    key('Digit2');key('Escape');check(defense.selected===null,'cancel selection');
    click(110,485);check(defense.waves.phase==='combat','wave button input');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    defense.update(game, 1); game.input.endFrame();
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }));
    for (let tick = 0; tick < 360; tick++) { defense.update(game, 1); game.input.endFrame(); }
    check(game.state.defeatedEnemies>0,'towers attack and defeat enemies');
    check(defense.enemies.some(enemy=>enemy.x<970),'enemies follow the route');
    document.body.dataset.smoke='build,repair,upgrade,cancel,start,combat';
  }
  app.renderer.render(app.stage);
  document.body.dataset.ready = 'true';
  document.body.dataset.phase = defense.waves.phase;
  document.body.dataset.enemies = String(defense.enemies.length);
  document.body.dataset.kills = String(game.state.defeatedEnemies);
  document.title = 'OAKHEAVEN arena review ready';
}
run().catch(error => { document.body.textContent = String(error?.stack ?? error); document.body.dataset.error = 'true'; });
