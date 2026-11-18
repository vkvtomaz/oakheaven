import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialState } from '../src/core/GameState.ts';
import {
  EXPEDITION_NODE_COUNT,
  EXPEDITION_NODES,
} from '../src/data/expedition.ts';
import {
  DAYLIGHT_SECONDS,
  DAYLIGHT_WARNING_SECONDS,
  beginExpeditionReturn,
  finishExpedition,
  formatClock,
  recordExpeditionCollection,
  updateDaylight,
} from '../src/systems/ExpeditionSystem.ts';

test('expedicao dura 90 segundos e avisa nos 15 finais', () => {
  assert.equal(DAYLIGHT_SECONDS, 90);
  assert.equal(DAYLIGHT_WARNING_SECONDS, 15);
  assert.equal(formatClock(DAYLIGHT_SECONDS), '01:30');
});

test('floresta possui 15 nos distribuidos nas tres zonas', () => {
  assert.equal(EXPEDITION_NODE_COUNT, 15);

  const safe = EXPEDITION_NODES.filter((node) => node.zone === 'safe');
  const intermediate = EXPEDITION_NODES.filter(
    (node) => node.zone === 'intermediate'
  );
  const depths = EXPEDITION_NODES.filter(
    (node) => node.zone === 'depths'
  );

  assert.equal(safe.length, 6);
  assert.equal(intermediate.length, 5);
  assert.equal(depths.length, 4);
  assert.ok(safe.every((node) => ['tree', 'scrap'].includes(node.kind)));
  assert.deepEqual(
    new Set(intermediate.map((node) => node.kind)),
    new Set(['tree', 'scrap', 'remains'])
  );
  assert.deepEqual(
    new Set(depths.map((node) => node.kind)),
    new Set(['crystal', 'remains'])
  );
});

test('telemetria registra coleta, profundidade e retorno voluntario', () => {
  const state = createInitialState();

  recordExpeditionCollection(state, 'wood', 3, 'safe');
  recordExpeditionCollection(state, 'chitin', 2, 'intermediate');
  recordExpeditionCollection(state, 'ether', 1, 'depths');
  beginExpeditionReturn(state);
  finishExpedition(state, 'voluntary');

  assert.equal(state.expedition.telemetry.nodesCollected, 3);
  assert.equal(state.expedition.telemetry.resourcesCollected.wood, 3);
  assert.equal(state.expedition.telemetry.resourcesCollected.chitin, 2);
  assert.equal(state.expedition.telemetry.resourcesCollected.ether, 1);
  assert.equal(state.expedition.telemetry.deepestZone, 'depths');
  assert.equal(state.expedition.telemetry.outcome, 'voluntary');
  assert.equal(
    state.expedition.telemetry.remainingSecondsAtExit,
    DAYLIGHT_SECONDS
  );
});

test('anoitecer faz retirada automatica sem perder recursos', () => {
  const state = createInitialState();
  state.inventory.wood = 12;
  state.inventory.iron = 5;
  state.expedition.remainingSeconds = 1;
  const inventoryBefore = { ...state.inventory };

  assert.equal(updateDaylight(state, 1), true);
  assert.equal(state.expedition.forcedRetreat, true);
  assert.equal(state.expedition.telemetry.outcome, 'forced');
  assert.deepEqual(state.inventory, inventoryBefore);
});
