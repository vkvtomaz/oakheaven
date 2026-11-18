
import { DAYLIGHT_SECONDS } from '../systems/ExpeditionSystem.ts';
import {
  EXPEDITION_NODE_COUNT,
  type ExpeditionZone,
} from '../data/expedition.ts';

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
  telemetry: ExpeditionTelemetry;
}

export type ExpeditionOutcome =
  | 'exploring'
  | 'returning'
  | 'voluntary'
  | 'forced';

export interface ExpeditionTelemetry {
  nodesCollected: number;
  totalNodes: number;
  resourcesCollected: Record<ResourceType, number>;
  nodesByZone: Record<ExpeditionZone, number>;
  deepestZone: ExpeditionZone;
  outcome: ExpeditionOutcome;
  remainingSecondsAtExit: number | null;
  traversalBonusWood: number;
  highRouteFalls: number;
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
      telemetry: {
        nodesCollected: 0,
        totalNodes: EXPEDITION_NODE_COUNT,
        resourcesCollected: {
          wood: 0,
          iron: 0,
          ether: 0,
          chitin: 0,
        },
        nodesByZone: {
          safe: 0,
          intermediate: 0,
          depths: 0,
        },
        deepestZone: 'safe',
        outcome: 'exploring',
        remainingSecondsAtExit: null,
        traversalBonusWood: 0,
        highRouteFalls: 0,
      },
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
