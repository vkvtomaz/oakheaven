import type {
  ResourceType,
  TowerState,
} from '../core/GameState';

export const REPAIR_COST = 1;
export const REPAIR_AMOUNT = 35;
export const REPAIR_DURATION = 45;

export type RepairResult =
  | 'destroyed'
  | 'full'
  | 'insufficient'
  | 'repaired';

export function repairTower(
  inventory: Record<ResourceType, number>,
  tower: TowerState
): RepairResult {
  if (tower.hp <= 0) return 'destroyed';
  if (tower.hp >= tower.maxHp) return 'full';
  if (inventory.wood < REPAIR_COST) return 'insufficient';

  inventory.wood -= REPAIR_COST;
  tower.hp = Math.min(tower.maxHp, tower.hp + REPAIR_AMOUNT);
  return 'repaired';
}
