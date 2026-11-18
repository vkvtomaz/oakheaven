import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAffordTower,
  formatTowerCost,
  getTowerDefinition,
  spendTowerCost,
} from '../src/data/towers.ts';

test('Monolito custa 2M, 1F e 1E e continua sem dano', () => {
  const monolith = getTowerDefinition('repulsor');

  assert.equal(monolith.cost, 2);
  assert.equal(monolith.materials?.iron, 1);
  assert.equal(monolith.materials?.ether, 1);
  assert.equal(monolith.damage, 0);
  assert.equal(formatTowerCost(monolith), '2M 1F 1E');
});

test('um unico Eter permite construir o Monolito', () => {
  const inventory = {
    wood: 2,
    iron: 1,
    ether: 1,
    chitin: 0,
  };
  const monolith = getTowerDefinition('repulsor');

  assert.equal(canAffordTower(inventory, monolith), true);
  spendTowerCost(inventory, monolith);
  assert.deepEqual(inventory, {
    wood: 0,
    iron: 0,
    ether: 0,
    chitin: 0,
  });
});

test('Monolito ainda nao pode ser construido sem Eter', () => {
  const monolith = getTowerDefinition('repulsor');

  assert.equal(
    canAffordTower(
      { wood: 10, iron: 10, ether: 0, chitin: 10 },
      monolith
    ),
    false
  );
});
