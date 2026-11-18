import type { GameState } from '../core/GameState';

export interface TraversalRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TRAVERSAL_GROUND = 455;
export const LOW_ROUTE_SPEED = 3.45;
export const LOW_ROUTE_MUD_SPEED = 2.35;
export const HIGH_ROUTE_SPEED = 5.35;
export const FALL_STUMBLE_TICKS = 36;

export const HIGH_ROUTE_PLATFORMS: TraversalRectangle[] = [
  { x: 130, y: 392, width: 120, height: 16 },
  { x: 292, y: 334, width: 118, height: 16 },
  { x: 452, y: 278, width: 120, height: 16 },
  { x: 615, y: 330, width: 118, height: 16 },
  { x: 775, y: 390, width: 120, height: 16 },
];

export const LOW_ROUTE_MUD: TraversalRectangle[] = [
  { x: 275, y: TRAVERSAL_GROUND - 8, width: 125, height: 8 },
  { x: 585, y: TRAVERSAL_GROUND - 8, width: 135, height: 8 },
];

export const HIGH_ROUTE_BONUS = { x: 512, y: 240 };

export function isInsideMud(x: number): boolean {
  return LOW_ROUTE_MUD.some(
    (mud) => x >= mud.x && x <= mud.x + mud.width
  );
}

export function getTraversalSpeed(
  highRoute: boolean,
  inMud: boolean,
  stumbling: boolean
): number {
  if (stumbling) return 0;
  if (highRoute) return HIGH_ROUTE_SPEED;
  return inMud ? LOW_ROUTE_MUD_SPEED : LOW_ROUTE_SPEED;
}

export function claimHighRouteBonus(state: GameState): boolean {
  const telemetry = state.expedition.telemetry;
  if (telemetry.traversalBonusWood > 0) return false;
  telemetry.traversalBonusWood = 1;
  telemetry.resourcesCollected.wood++;
  state.inventory.wood++;
  return true;
}

export function recordHighRouteFall(state: GameState): void {
  state.expedition.telemetry.highRouteFalls++;
}
