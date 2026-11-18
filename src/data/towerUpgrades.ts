import type {
  ResourceType,
  TowerState,
  TowerType,
} from '../core/GameState';
import { getTowerDefinition } from './towers.ts';

export interface TowerRuntimeStats {
  range: number;
  damage: number;
  fireInterval: number;
  maxHp: number;
  chainTargets: number;
  chainRange: number;
  chainDamageMultiplier: number;
}

export interface TowerUpgradeDefinition {
  type: TowerType;
  fromTier: 1;
  toTier: 2;
  name: string;
  cost: Partial<Record<ResourceType, number>>;
  stats: TowerRuntimeStats;
}

export const TOWER_UPGRADES: readonly TowerUpgradeDefinition[] = [
  {
    type: 'arc_ballista',
    fromTier: 1,
    toTier: 2,
    name: 'Arco Encadeado',
    cost: { iron: 2, ether: 1 },
    stats: {
      range: 220,
      damage: 2.8,
      fireInterval: 30,
      maxHp: 100,
      chainTargets: 1,
      chainRange: 90,
      chainDamageMultiplier: 0.5,
    },
  },
  {
    type: 'spike_barricade',
    fromTier: 1,
    toTier: 2,
    name: 'Espinhos Reforcados',
    cost: { wood: 2, chitin: 1 },
    stats: {
      range: 0,
      damage: 1.2,
      fireInterval: 0,
      maxHp: 260,
      chainTargets: 0,
      chainRange: 0,
      chainDamageMultiplier: 0,
    },
  },
];

const RESOURCE_ORDER: ResourceType[] = [
  'wood',
  'iron',
  'ether',
  'chitin',
];

const RESOURCE_SYMBOLS: Record<ResourceType, string> = {
  wood: 'M',
  iron: 'F',
  ether: 'E',
  chitin: 'Q',
};

export type UpgradeResult =
  | 'upgraded'
  | 'unavailable'
  | 'damaged'
  | 'insufficient';

export function getTowerUpgrade(
  tower: Pick<TowerState, 'type' | 'tier'>
): TowerUpgradeDefinition | null {
  if (tower.tier !== 1) return null;

  return TOWER_UPGRADES.find(
    (upgrade) =>
      upgrade.type === tower.type &&
      upgrade.fromTier === tower.tier
  ) ?? null;
}

export function getTowerRuntimeStats(
  tower: Pick<TowerState, 'type' | 'tier'>
): TowerRuntimeStats {
  const base = getTowerDefinition(tower.type);
  const upgrade = tower.tier >= 2
    ? TOWER_UPGRADES.find((item) => item.type === tower.type)
    : null;

  return upgrade?.stats ?? {
    range: base.range,
    damage: base.damage,
    fireInterval: base.fireInterval,
    maxHp: base.maxHp,
    chainTargets: 0,
    chainRange: 0,
    chainDamageMultiplier: 0,
  };
}

export function formatUpgradeCost(
  upgrade: TowerUpgradeDefinition
): string {
  return RESOURCE_ORDER
    .filter((resource) => (upgrade.cost[resource] ?? 0) > 0)
    .map(
      (resource) =>
        `${upgrade.cost[resource]}${RESOURCE_SYMBOLS[resource]}`
    )
    .join(' ');
}

export function canAffordUpgrade(
  inventory: Record<ResourceType, number>,
  upgrade: TowerUpgradeDefinition
): boolean {
  return RESOURCE_ORDER.every(
    (resource) =>
      inventory[resource] >= (upgrade.cost[resource] ?? 0)
  );
}

export function upgradeTower(
  inventory: Record<ResourceType, number>,
  tower: TowerState
): UpgradeResult {
  const upgrade = getTowerUpgrade(tower);
  if (!upgrade) return 'unavailable';
  if (tower.hp < tower.maxHp) return 'damaged';
  if (!canAffordUpgrade(inventory, upgrade)) return 'insufficient';

  for (const resource of RESOURCE_ORDER) {
    inventory[resource] -= upgrade.cost[resource] ?? 0;
  }

  tower.tier = upgrade.toTier;
  tower.maxHp = upgrade.stats.maxHp;
  tower.hp = upgrade.stats.maxHp;
  tower.cooldown = 0;
  return 'upgraded';
}
