import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFlankSide,
  getLastStandHpMultiplier,
  getTowerDamageMultiplier,
  getWaveThreeRole,
} from '../src/data/enemies.ts';
import type { TowerState } from '../src/core/GameState.ts';
import { repairTower } from '../src/systems/repair.ts';
import { selectTargetsInRange } from '../src/systems/towerCombat.ts';
import {
  WAVES,
  WaveSystem,
  type EnemyKind,
} from '../src/systems/WaveSystem.ts';

test('wave 3 tem 32 inimigos, 8 brutos e 1 Alpha', () => {
  const waves = new WaveSystem();
  waves.currentWave = 3;

  assert.equal(waves.startWave(), true);

  const schedule = waves.update(10_000);

  assert.equal(schedule.length, 32);
  assert.equal(schedule.filter((kind) => kind === 'brute').length, 8);
  assert.equal(schedule.filter((kind) => kind === 'alpha').length, 1);
  assert.equal(waves.isComplete(0), true);

  waves.completeWave();
  assert.equal(waves.phase, 'victory');
});

test('flanqueadores somam 25% e alternam norte e sul', () => {
  const kinds: EnemyKind[] = Array.from(
    { length: 31 },
    () => 'scout'
  );
  kinds.push('alpha');

  const flankers = kinds
    .map((kind, index) => getWaveThreeRole(index, kind))
    .filter((role) => role === 'flanker');

  assert.equal(flankers.length, 8);
  assert.deepEqual(
    flankers.map((_, index) => getFlankSide(index)),
    [
      'upper', 'lower', 'upper', 'lower',
      'upper', 'lower', 'upper', 'lower',
    ]
  );
});

test('wave 3 mantem mais de 45 segundos de janela de spawn', () => {
  const totalDelay = WAVES[3].spawnDelays?.reduce(
    (total, delay) => total + delay,
    0
  ) ?? 0;

  assert.ok(totalDelay >= 2_700);
});

test('flanqueadores exigem Kaelen e recebem menos dano das torres', () => {
  assert.equal(getTowerDamageMultiplier('route'), 1);
  assert.equal(getTowerDamageMultiplier('flanker'), 0.45);
  assert.ok(
    getLastStandHpMultiplier('scout', 'flanker') >
    getLastStandHpMultiplier('scout', 'route')
  );
});

test('reparo gasta madeira, respeita o limite e nao revive torre', () => {
  const inventory = {
    wood: 2,
    iron: 0,
    ether: 0,
    chitin: 0,
  };
  const tower: TowerState = {
    id: 1,
    type: 'arc_ballista',
    tier: 1,
    x: 300,
    y: 180,
    hp: 50,
    maxHp: 100,
    cooldown: 0,
  };

  assert.equal(repairTower(inventory, tower), 'repaired');
  assert.equal(tower.hp, 85);
  assert.equal(inventory.wood, 1);

  assert.equal(repairTower(inventory, tower), 'repaired');
  assert.equal(tower.hp, 100);
  assert.equal(inventory.wood, 0);

  tower.hp = 0;
  assert.equal(repairTower(inventory, tower), 'destroyed');
});

test('torres priorizam o alvo mais proximo do santuario', () => {
  const targets = [
    { id: 'longe', x: 500, y: 285 },
    { id: 'perto', x: 300, y: 285 },
    { id: 'fora', x: 900, y: 285 },
  ];

  const selected = selectTargetsInRange(
    targets,
    450,
    285,
    200,
    105,
    285
  );

  assert.deepEqual(
    selected.map((target) => target.id),
    ['perto', 'longe']
  );
});
