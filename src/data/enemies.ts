import type { EnemyKind } from '../systems/WaveSystem';

export interface EnemyStats {
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  color: number;
}

export type EnemyRole = 'route' | 'flanker';
export type FlankSide = 'upper' | 'lower';

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  scout: {
    hp: 6,
    speed: 1.55,
    radius: 12,
    damage: 1,
    color: 0xcf6075,
  },
  brute: {
    hp: 16,
    speed: 1.1,
    radius: 17,
    damage: 2,
    color: 0x9165be,
  },
  alpha: {
    hp: 85,
    speed: 0.8,
    radius: 27,
    damage: 3,
    color: 0xbb3d96,
  },
};

export function getWaveThreeRole(
  sequence: number,
  kind: EnemyKind
): EnemyRole {
  return kind !== 'alpha' && sequence % 4 === 1
    ? 'flanker'
    : 'route';
}

export function getFlankSide(
  flankerSequence: number
): FlankSide {
  return flankerSequence % 2 === 0 ? 'upper' : 'lower';
}

export function getLastStandHpMultiplier(
  kind: EnemyKind,
  role: EnemyRole
): number {
  if (kind === 'alpha') return 1.9;
  if (role === 'flanker') return 1.8;
  if (kind === 'brute') return 1.55;
  return 1.45;
}

export function getTowerDamageMultiplier(
  role: EnemyRole
): number {
  return role === 'flanker' ? 0.45 : 1;
}
