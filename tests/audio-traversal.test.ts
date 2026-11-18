import assert from 'node:assert/strict';
import test from 'node:test';

import { SoundFX } from '../src/audio/SoundFX.ts';
import { createInitialState } from '../src/core/GameState.ts';
import {
  HIGH_ROUTE_PLATFORMS,
  claimHighRouteBonus,
  getTraversalSpeed,
  recordHighRouteFall,
} from '../src/systems/traversal.ts';

test('audio possui fallback silencioso fora do navegador', () => {
  const audio = new SoundFX();

  assert.equal(audio.initialize(), false);
  assert.equal(audio.isMuted(), false);
  assert.equal(audio.toggleMute(), true);
  assert.doesNotThrow(() => audio.play('groundBreak'));
});

test('rota alta e mais rapida, rota baixa tem terreno lento', () => {
  const regularLow = getTraversalSpeed(false, false, false);
  const muddyLow = getTraversalSpeed(false, true, false);
  const high = getTraversalSpeed(true, false, false);

  assert.ok(HIGH_ROUTE_PLATFORMS.length >= 5);
  assert.ok(high > regularLow);
  assert.ok(regularLow > muddyLow);
  assert.equal(getTraversalSpeed(true, false, true), 0);
});

test('bonus da rota alta concede uma madeira uma unica vez', () => {
  const state = createInitialState();
  const initialWood = state.inventory.wood;

  assert.equal(claimHighRouteBonus(state), true);
  assert.equal(claimHighRouteBonus(state), false);
  assert.equal(state.inventory.wood, initialWood + 1);
  assert.equal(state.expedition.telemetry.resourcesCollected.wood, 1);
  assert.equal(state.expedition.telemetry.traversalBonusWood, 1);
});

test('quedas da rota alta ficam registradas na expedicao', () => {
  const state = createInitialState();

  recordHighRouteFall(state);
  recordHighRouteFall(state);

  assert.equal(state.expedition.telemetry.highRouteFalls, 2);
});
