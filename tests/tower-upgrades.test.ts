import assert from 'node:assert/strict';
import test from 'node:test';

import type { TowerState } from '../src/core/GameState.ts';
import {
  TOWER_UPGRADES,
  formatUpgradeCost,
  getTowerRuntimeStats,
  getTowerUpgrade,
  upgradeTower,
} from '../src/data/towerUpgrades.ts';

function createTower(
  type: TowerState['type'],
  hp: number,
  maxHp: number
): TowerState {
  return {
    id: 1,
    type,
    tier: 1,
    x: 400,
    y: 180,
    hp,
    maxHp,
    cooldown: 20,
  };
}

test('Etapa 6 libera Tier 2 somente para Balesta e Barricada', () => {
  assert.deepEqual(
    TOWER_UPGRADES.map((upgrade) => upgrade.type),
    ['arc_ballista', 'spike_barricade']
  );
  assert.equal(
    getTowerUpgrade(createTower('slag_forge', 120, 120)),
    null
  );
});

test('custos Tier 2 sao exibidos antes da compra', () => {
  const ballista = getTowerUpgrade(
    createTower('arc_ballista', 100, 100)
  );
  const barricade = getTowerUpgrade(
    createTower('spike_barricade', 180, 180)
  );

  assert.ok(ballista);
  assert.ok(barricade);
  assert.equal(formatUpgradeCost(ballista), '2F 1E');
  assert.equal(formatUpgradeCost(barricade), '2M 1Q');
});

test('upgrade exige HP cheio e materiais suficientes', () => {
  const damaged = createTower('arc_ballista', 99, 100);
  const inventory = { wood: 10, iron: 10, ether: 10, chitin: 10 };

  assert.equal(upgradeTower(inventory, damaged), 'damaged');
  assert.equal(damaged.tier, 1);

  const full = createTower('arc_ballista', 100, 100);
  assert.equal(
    upgradeTower(
      { wood: 10, iron: 1, ether: 0, chitin: 10 },
      full
    ),
    'insufficient'
  );
  assert.equal(full.tier, 1);
});

test('Balesta Tier 2 persiste stats e encadeia metade do dano', () => {
  const tower = createTower('arc_ballista', 100, 100);
  const inventory = { wood: 0, iron: 2, ether: 1, chitin: 0 };

  assert.equal(upgradeTower(inventory, tower), 'upgraded');
  assert.equal(tower.tier, 2);
  assert.equal(tower.cooldown, 0);
  assert.deepEqual(inventory, {
    wood: 0,
    iron: 0,
    ether: 0,
    chitin: 0,
  });

  const stats = getTowerRuntimeStats(tower);
  assert.equal(stats.damage, 2.8);
  assert.equal(stats.chainTargets, 1);
  assert.equal(stats.chainRange, 90);
  assert.equal(stats.chainDamageMultiplier, 0.5);
});

test('Barricada Tier 2 atualiza HP maximo e dano de contato', () => {
  const tower = createTower('spike_barricade', 180, 180);
  const inventory = { wood: 2, iron: 0, ether: 0, chitin: 1 };

  assert.equal(upgradeTower(inventory, tower), 'upgraded');
  assert.equal(tower.tier, 2);
  assert.equal(tower.maxHp, 260);
  assert.equal(tower.hp, 260);
  assert.equal(getTowerRuntimeStats(tower).damage, 1.2);
});

test('uma torre Tier 2 nao pode comprar o mesmo upgrade novamente', () => {
  const tower = createTower('arc_ballista', 100, 100);
  const inventory = { wood: 0, iron: 4, ether: 2, chitin: 0 };

  assert.equal(upgradeTower(inventory, tower), 'upgraded');
  assert.equal(upgradeTower(inventory, tower), 'unavailable');
  assert.deepEqual(inventory, {
    wood: 0,
    iron: 2,
    ether: 1,
    chitin: 0,
  });
});
