
import type {
  ExpeditionOutcome,
  GameState,
  ResourceType,
} from '../core/GameState';
import type { ExpeditionZone } from '../data/expedition';

export const DAYLIGHT_SECONDS = 90;
export const DAYLIGHT_WARNING_SECONDS = 15;

const ZONE_DEPTH: Record<ExpeditionZone, number> = {
  safe: 1,
  intermediate: 2,
  depths: 3,
};

export function formatClock(seconds: number): string {
  const total = Math.ceil(Math.max(0, seconds));

  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function updateDaylight(
  state: GameState,
  elapsedSeconds: number
): boolean {
  const expedition = state.expedition;

  if (expedition.remainingSeconds <= 0) {
    return false;
  }

  expedition.remainingSeconds = Math.max(
    0,
    expedition.remainingSeconds - elapsedSeconds
  );

  if (expedition.remainingSeconds === 0) {
    expedition.forcedRetreat = true;
    finishExpedition(state, 'forced');
    return true;
  }

  return false;
}

export function visitExpeditionZone(
  state: GameState,
  zone: ExpeditionZone
): void {
  const telemetry = state.expedition.telemetry;

  if (ZONE_DEPTH[zone] > ZONE_DEPTH[telemetry.deepestZone]) {
    telemetry.deepestZone = zone;
  }
}

export function recordExpeditionCollection(
  state: GameState,
  resource: ResourceType,
  quantity: number,
  zone: ExpeditionZone
): void {
  const telemetry = state.expedition.telemetry;
  telemetry.nodesCollected++;
  telemetry.resourcesCollected[resource] += quantity;
  telemetry.nodesByZone[zone]++;
  visitExpeditionZone(state, zone);
}

export function beginExpeditionReturn(state: GameState): void {
  const telemetry = state.expedition.telemetry;

  if (telemetry.outcome === 'exploring') {
    telemetry.outcome = 'returning';
  }
}

export function finishExpedition(
  state: GameState,
  outcome: Extract<ExpeditionOutcome, 'voluntary' | 'forced'>
): void {
  const telemetry = state.expedition.telemetry;

  if (
    telemetry.outcome === 'voluntary' ||
    telemetry.outcome === 'forced'
  ) {
    return;
  }

  telemetry.outcome = outcome;
  telemetry.remainingSecondsAtExit = state.expedition.remainingSeconds;
}

export function getExpeditionReport(state: GameState): string {
  const telemetry = state.expedition.telemetry;

  return (
    `${telemetry.nodesCollected}/${telemetry.totalNodes} nos` +
    ` | M:${telemetry.resourcesCollected.wood}` +
    ` F:${telemetry.resourcesCollected.iron}` +
    ` E:${telemetry.resourcesCollected.ether}` +
    ` Q:${telemetry.resourcesCollected.chitin}` +
    ` | rota:+${telemetry.traversalBonusWood}M` +
    ` quedas:${telemetry.highRouteFalls}` +
    ` | zona:${telemetry.deepestZone}` +
    ` | retorno:${telemetry.outcome}`
  );
}
