import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALPHA_STANCE_FLANKERS,
  ALPHA_STUN_TICKS,
  breakObsidianStance,
  createAlphaBossState,
  getAlphaDamageMultiplier,
  isInsideAlphaRoar,
  updateAlphaStun,
  updateAlphaThresholds,
} from '../src/systems/alphaBoss.ts';
import { WaveSystem } from '../src/systems/WaveSystem.ts';

test('Rugido e Postura do Alpha disparam uma unica vez por HP', () => {
  const state = createAlphaBossState();

  assert.deepEqual(updateAlphaThresholds(state, 69, 100), ['roar']);
  assert.deepEqual(updateAlphaThresholds(state, 60, 100), []);
  assert.deepEqual(
    updateAlphaThresholds(state, 34, 100),
    ['obsidian_stance']
  );
  assert.deepEqual(updateAlphaThresholds(state, 20, 100), []);
  assert.equal(state.roarTriggered, true);
  assert.equal(state.stanceTriggered, true);
  assert.equal(state.stanceActive, true);
});

test('Postura reduz dano sem tornar o Alpha permanentemente invulneravel', () => {
  const state = createAlphaBossState();
  updateAlphaThresholds(state, 34, 100);

  const towerMultiplier = getAlphaDamageMultiplier(state, 'tower');
  const basicMultiplier = getAlphaDamageMultiplier(state, 'kaelen');
  const groundMultiplier = getAlphaDamageMultiplier(
    state,
    'ground_break'
  );

  assert.ok(towerMultiplier > 0 && towerMultiplier < 1);
  assert.ok(basicMultiplier > towerMultiplier && basicMultiplier < 1);
  assert.ok(groundMultiplier > 1);
});

test('Rugido afeta somente torres dentro do raio local', () => {
  assert.equal(isInsideAlphaRoar(500, 300, 700, 300), true);
  assert.equal(isInsideAlphaRoar(500, 300, 800, 300), false);
});

test('Quebra-Terra rompe a Postura, atordoa e inicia a fase final', () => {
  const state = createAlphaBossState();
  updateAlphaThresholds(state, 34, 100);

  assert.equal(breakObsidianStance(state), true);
  assert.equal(breakObsidianStance(state), false);
  assert.equal(state.stunnedTicks, ALPHA_STUN_TICKS);
  assert.equal(updateAlphaStun(state, ALPHA_STUN_TICKS - 1), false);
  assert.equal(updateAlphaStun(state, 1), true);
  assert.equal(state.stunnedTicks, 0);
  assert.equal(state.finalPhase, true);
});

test('reforcos da Postura permanecem na contagem de conclusao da wave', () => {
  const waves = new WaveSystem();
  waves.currentWave = 3;
  waves.startWave();
  waves.update(10_000);

  assert.equal(ALPHA_STANCE_FLANKERS, 2);
  assert.equal(waves.isComplete(ALPHA_STANCE_FLANKERS), false);
  assert.equal(waves.isComplete(0), true);
});
