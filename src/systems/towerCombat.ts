export interface CombatTarget {
  x: number;
  y: number;
}

export function selectTargetsInRange<T extends CombatTarget>(
  targets: readonly T[],
  originX: number,
  originY: number,
  range: number,
  priorityX: number,
  priorityY: number
): T[] {
  return targets
    .filter(
      (target) =>
        Math.hypot(
          target.x - originX,
          target.y - originY
        ) <= range
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - priorityX, a.y - priorityY) -
        Math.hypot(b.x - priorityX, b.y - priorityY)
    );
}

export function getRepulsorPush(kind: string): number {
  if (kind === 'alpha') return 8;
  if (kind === 'brute') return 20;
  return 45;
}
