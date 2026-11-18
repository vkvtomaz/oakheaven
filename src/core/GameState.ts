
import { DAYLIGHT_SECONDS } from '../systems/ExpeditionSystem';

export type ResourceType =
  | 'wood'
  | 'iron'
  | 'ether'
  | 'chitin';

export type TowerType =
  | 'arc_ballista'
  | 'slag_forge'
  | 'repulsor'
  | 'chitin_cannon'
  | 'spike_barricade';

export interface TowerState {
  id: number;
  type: TowerType;
  tier: 1 | 2 | 3;

  x: number;
  y: number;

  hp: number;
  maxHp: number;
  cooldown: number;
}

export interface CharacterState {
  hp: number;
  maxHp: number;
}

export interface ExpeditionState {
  remainingSeconds: number;
  forcedRetreat: boolean;
}

export interface GameState {
  act: 1 | 2 | 3;
  night: number;
  wave: 1 | 2 | 3;

  inventory: Record<ResourceType, number>;

  expedition: ExpeditionState;

  kaelen: CharacterState;
  sanctuary: CharacterState;

  towers: TowerState[];
  defeatedEnemies: number;
}

export function createInitialState(): GameState {
  return {
    act: 1,
    night: 1,
    wave: 1,

    // Pequena reserva inicial da forja
    inventory: {
      wood: 3,
      iron: 1,
      ether: 0,
      chitin: 0,
    },

    expedition: {
      remainingSeconds: DAYLIGHT_SECONDS,
      forcedRetreat: false,
    },

    kaelen: {
      hp: 100,
      maxHp: 100,
    },

    sanctuary: {
      hp: 5,
      maxHp: 5,
    },

    towers: [],
    defeatedEnemies: 0,
  };
}
