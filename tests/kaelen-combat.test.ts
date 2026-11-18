import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GROUND_BREAK_CHARGE_TICKS,
  GROUND_BREAK_RADIUS,
  getChargeRatio,
  isInsideCleave,
  isInsideGroundBreak,
  resolveHammerRelease,
} from '../src/systems/kaelenCombat.ts';

test('toque curto executa somente o ataque basico', () => {
  assert.equal(resolveHammerRelease(8, true, true, false), 'basic');
});

test('carga completa executa somente o Quebra-Terra', () => {
  assert.equal(
    resolveHammerRelease(
      GROUND_BREAK_CHARGE_TICKS,
      true,
      true,
      false
    ),
    'ground_break'
  );
});

test('Quebra-Terra em recarga preserva o golpe basico', () => {
  assert.equal(
    resolveHammerRelease(
      GROUND_BREAK_CHARGE_TICKS + 20,
      true,
      false,
      false
    ),
    'basic'
  );
});

test('reparo bloqueia qualquer ataque na mesma acao', () => {
  assert.equal(
    resolveHammerRelease(
      GROUND_BREAK_CHARGE_TICKS,
      true,
      true,
      true
    ),
    'none'
  );
});

test('indicador de carga fica limitado entre zero e cem por cento', () => {
  assert.equal(getChargeRatio(-10), 0);
  assert.equal(getChargeRatio(GROUND_BREAK_CHARGE_TICKS / 2), 0.5);
  assert.equal(getChargeRatio(GROUND_BREAK_CHARGE_TICKS * 2), 1);
});

test('cleave atinge alvos a frente e ignora alvos atras', () => {
  assert.equal(isInsideCleave(0, 0, 1, 0, 50, 10), true);
  assert.equal(isInsideCleave(0, 0, 1, 0, -20, 0), false);
});

test('Quebra-Terra respeita o raio de 75 pixels', () => {
  assert.equal(isInsideGroundBreak(0, 0, GROUND_BREAK_RADIUS, 0), true);
  assert.equal(
    isInsideGroundBreak(0, 0, GROUND_BREAK_RADIUS + 1, 0),
    false
  );
});
