import { Application, Assets } from 'pixi.js';
import { Game } from '../src/core/Game';
import { createInitialState, type TowerType } from '../src/core/GameState';
import { loadInterfaceFonts } from '../src/visual/fonts';
import { loadGameArt } from '../src/visual/art';
import { loadArenaArt } from '../src/visual/arenaArt';
import { getTowerDefinition } from '../src/data/towers';

// Diagnostic entry only; production Game and scenes are used unchanged.
async function main() {
  const status = document.querySelector<HTMLPreElement>('#status')!;
  await Assets.init({ preferences: { preferWorkers: false, preferCreateImageBitmap: false } });
  await loadInterfaceFonts(); await loadGameArt(); await loadArenaArt();
  const app = new Application();
  await app.init({ width: 960, height: 540, antialias: true, preference: 'webgl', background: 0x19221d });
  document.querySelector('#stage')!.appendChild(app.canvas);
  const game = new Game(app);
  // Private members are accessed only by this out-of-production diagnostic tool.
  const internal = game as any;
  const scene = () => internal.scene as any;
  const render = () => app.renderer.render(app.stage);
  const tick = (count = 1) => {
    for (let index = 0; index < count; index++) {
      scene().update(game, 1);
      internal.atmosphere?.update(1); internal.transition?.update(1);
      game.input.endFrame();
    }
    render();
  };
  const key = (code: string, heldTicks = 1) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    tick(heldTicks);
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    tick();
  };
  function seed() {
    game.state = createInitialState();
    game.state.inventory = { wood: 30, iron: 20, ether: 10, chitin: 10 };
    game.state.sanctuary = { hp: 100, maxHp: 100 };
    game.state.towers = ([['arc_ballista', 590, 420], ['slag_forge', 685, 345],
      ['repulsor', 805, 410], ['chitin_cannon', 835, 140], ['spike_barricade', 805, 245]] as [TowerType, number, number][])
      .map(([type, x, y], index) => {
        const { maxHp } = getTowerDefinition(type);
        return { id: index + 1, type, x, y, tier: 1, hp: maxHp, maxHp, cooldown: 0 };
      });
  }
  function open(label: string, running = true) {
    window.dispatchEvent(new Event('blur'));
    app.stop(); seed();
    if (label === 'normal') game.restart();
    else if (label === 'traversal') game.changeScene('platform-out');
    else if (label === 'return') game.changeScene('platform-back');
    else if (label === 'forest') game.changeScene('forest');
    else {
      game.changeScene('defense');
      scene().waves.currentWave = Number(label.slice(-1));
      scene().startWave(game); // Wave 3 changes to LastStand using the existing WaveSystem.
    }
    status.textContent = `Cena: ${label}. WASD/setas; espaço: pulo; E: coleta/reparo; F: martelo na Última Linha.\n${running ? 'Executando' : 'Pausado para revisão determinística'}.`;
    render(); if (running) app.start();
  }
  function smoke() {
    const checks: string[] = [];
    const check = (condition: boolean, label: string) => {
      if (!condition) throw new Error('FALHOU: ' + label);
      checks.push('PASS ' + label);
    };
    try {
      open('normal', false); key('Enter');
      check(internal.currentSceneId === 'platform-out', 'título inicia a travessia real');
      const x = scene().player.x; key('KeyD', 12);
      check(scene().player.x > x, 'movimento lateral via Input real');
      const groundY = scene().player.y; key('Space', 4);
      check(scene().player.y < groundY, 'pulo respeita física da travessia');
      tick(70); key('KeyA', 150);
      check(scene().player.x >= 14, 'limite esquerdo da travessia');
      scene().player.position.set(912, 455); key('KeyD', 3);
      check(internal.currentSceneId === 'forest', 'saída da travessia abre floresta');
      const forest = scene(); const node = forest.nodes[0];
      forest.player.position.set(node.x + 22, node.y);
      const hp = node.hp; key('KeyE', 65);
      check(node.hp < hp, 'coleta aciona golpe e reduz resistência real');
      check(forest.playerAnimation.state === 'attack' || forest.playerAnimation.state === 'idle', 'atlas de Kaelen ativo na coleta');
      const forestX = forest.player.x; key('KeyD', 4);
      check(forest.player.x > forestX, 'movimento XY real da floresta');
      key('KeyW', 150); check(forest.player.y >= 95, 'limite superior da floresta');
      forest.player.position.set(100, 460); tick();
      check(internal.currentSceneId === 'platform-back', 'portal abre travessia de retorno');
      scene().player.position.set(42, 455); tick();
      check(internal.currentSceneId === 'defense', 'retorno abre preparação da defesa');
      for (const wave of [1, 2, 3]) {
        open('wave' + wave, false);
        check(scene().waves.currentWave === wave && scene().waves.phase === 'combat', `onda ${wave} inicia com WaveSystem real`);
        if (wave === 3) tick(190);
        tick(105);
        check(scene().enemies.length > 0, `onda ${wave} emite inimigos reais`);
        const combat = scene();
        for (const tower of game.state.towers) {
          // Isolate this event so target priority cannot select a previous probe.
          for (const existing of [...combat.enemies]) combat.removeEnemy(game, existing);
          combat.spawnEnemy(game, 'brute', 'route', null);
          const enemy = combat.enemies.at(-1);
          enemy.x = tower.x + 10; enemy.y = tower.y; enemy.graphic.position.set(enemy.x, enemy.y);
          const beforeHp = enemy.hp, beforeX = enemy.x;
          tower.cooldown = 0;
          if (wave === 3) combat.attackWithTower(game, tower);
          else if (tower.type === 'spike_barricade') combat.moveEnemies(game, 1);
          else combat.attack(game, tower);
          check(tower.type === 'repulsor' ? enemy.x !== beforeX : enemy.hp < beforeHp,
            `onda ${wave}: ação real de ${tower.type}`);
        }
        if (wave === 3) {
          const beforeX = combat.player.x; key('KeyD', 4);
          check(combat.player.x !== beforeX, 'Última Linha: movimento real de Kaelen');
          key('KeyF', 1);
          check(combat.attackCooldown > 0, 'Última Linha: ataque do martelo');
        }
        render();
      }
      document.body.dataset.smoke = 'passed';
      status.textContent = checks.join('\n') + '\nSmoke concluído; onda 3 pausada. A observação visual continua necessária.';
    } catch (error) {
      document.body.dataset.smoke = 'failed';
      status.textContent = checks.join('\n') + '\n' + String((error as Error).stack ?? error);
    }
    app.stop(); render();
  }
  const controls = document.querySelector('#controls')!;
  for (const [label, action] of [['Início normal', () => open('normal')], ['Travessia', () => open('traversal')],
    ['Floresta', () => open('forest')], ['Retorno', () => open('return')], ['Onda 1', () => open('wave1')],
    ['Onda 2', () => open('wave2')], ['Onda 3', () => open('wave3')], ['Pausar', () => { app.stop(); render(); }],
    ['Continuar', () => app.start()], ['Smoke das cenas reais', smoke]] as [string, () => void][]) {
    const button = document.createElement('button'); button.textContent = label;
    button.onclick = action; controls.appendChild(button);
  }
  (window as any).oakReview = { game, app, open, tick, smoke };
  document.body.dataset.ready = 'true';
  status.textContent = 'Pronto. Início normal preserva valores originais; atalhos usam estado de diagnóstico.';
}
main().catch(error => {
  document.body.dataset.error = 'true';
  document.querySelector('#status')!.textContent = String(error?.stack ?? error);
});
