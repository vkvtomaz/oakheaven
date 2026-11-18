export const BASIC_ATTACK_RANGE = 66;
export const BASIC_ATTACK_DAMAGE = 4;
export const BASIC_ATTACK_COOLDOWN = 22;
export const BASIC_ATTACK_KNOCKBACK = 12;
export const BASIC_ATTACK_HITSTOP = 3;

export const GROUND_BREAK_CHARGE_TICKS = 35;
export const GROUND_BREAK_RADIUS = 75;
export const GROUND_BREAK_DAMAGE = 10;
export const GROUND_BREAK_KNOCKBACK = 55;
export const GROUND_BREAK_COOLDOWN = 240;
export const GROUND_BREAK_HITSTOP = 6;

export type HammerAction = 'none' | 'basic' | 'ground_break';

export function resolveHammerRelease(
  chargeTicks: number,
  basicReady: boolean,
  groundBreakReady: boolean,
  blocked: boolean
): HammerAction {
  if (blocked || !basicReady) return 'none';

  if (
    chargeTicks >= GROUND_BREAK_CHARGE_TICKS &&
    groundBreakReady
  ) {
    return 'ground_break';
  }

  return 'basic';
}

export function getChargeRatio(chargeTicks: number): number {
  return Math.max(
    0,
    Math.min(1, chargeTicks / GROUND_BREAK_CHARGE_TICKS)
  );
}

export function isInsideCleave(
  originX: number,
  originY: number,
  directionX: number,
  directionY: number,
  targetX: number,
  targetY: number,
  targetRadius = 0
): boolean {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const distance = Math.hypot(dx, dy);
  const dot = distance > 0
    ? dx / distance * directionX + dy / distance * directionY
    : 1;

  return distance <= BASIC_ATTACK_RANGE + targetRadius && dot >= 0.15;
}

export function isInsideGroundBreak(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  targetRadius = 0
): boolean {
  return (
    Math.hypot(targetX - originX, targetY - originY) <=
    GROUND_BREAK_RADIUS + targetRadius
  );
}
