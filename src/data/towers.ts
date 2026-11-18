
import type {
  ResourceType,
  TowerType,
} from '../core/GameState';

// ======================================
// 1. INTERFACE DAS TORRES
// ======================================

export interface TowerDefinition {
  type: TowerType;
  name: string;
  description: string;

  // Quantidade de madeira necessária
  cost: number;

  // Outros materiais necessários
  materials?: Partial<Record<ResourceType, number>>;

  range: number;
  damage: number;
  fireInterval: number;
  maxHp: number;
  color: number;

  placement: 'ground' | 'road';
}

// ======================================
// 2. CONFIGURAÇÕES DAS CINCO TORRES
// ======================================

export const TOWERS: TowerDefinition[] = [
  {
    type: 'arc_ballista',
    name: 'Balesta Voltaica',
    description: 'Alvo unico e antiaerea',

    cost: 3,
    materials: {
      iron: 1,
    },

    range: 220,
    damage: 2,
    fireInterval: 30,
    maxHp: 100,
    color: 0xe9b75f,
    placement: 'ground',
  },

  {
    type: 'slag_forge',
    name: 'Forja de Escoria',
    description: 'Dano em area e lentidao',

    cost: 2,
    materials: {
      iron: 2,
      ether: 1,
    },

    range: 110,
    damage: 0.8,
    fireInterval: 40,
    maxHp: 120,
    color: 0xb276da,
    placement: 'ground',
  },

  {
    type: 'repulsor',
    name: 'Monolito Repulsor',
    description: 'Controle gravitacional',

    cost: 2,
    materials: {
      iron: 1,
      ether: 2,
    },

    range: 125,
    damage: 0,
    fireInterval: 85,
    maxHp: 110,
    color: 0x7ec6e2,
    placement: 'ground',
  },

  {
    type: 'chitin_cannon',
    name: 'Canhao de Quitina',
    description: 'Rajada pesada de curto alcance',

    cost: 2,
    materials: {
      iron: 2,
      chitin: 2,
    },

    range: 135,
    damage: 3,
    fireInterval: 60,
    maxHp: 140,
    color: 0xe3908a,
    placement: 'ground',
  },

  {
    type: 'spike_barricade',
    name: 'Barricada Energizada',
    description: 'Bloqueio terrestre',

    cost: 3,

    range: 0,
    damage: 0.7,
    fireInterval: 0,
    maxHp: 180,
    color: 0x9dc675,
    placement: 'road',
  },
];

// ======================================
// 3. BUSCAR UMA TORRE
// ======================================

export function getTowerDefinition(
  type: TowerType
): TowerDefinition {
  const definition = TOWERS.find(
    (tower) => tower.type === type
  );

  if (!definition) {
    throw new Error(`Torre desconhecida: ${type}`);
  }

  return definition;
}

// ======================================
// 4. LISTA DE MATERIAIS EXTRAS
// ======================================

const EXTRA_RESOURCES: ResourceType[] = [
  'iron',
  'ether',
  'chitin',
];

// ======================================
// 5. VERIFICAR MATERIAIS DISPONÍVEIS
// ======================================

export function canAffordTower(
  inventory: Record<ResourceType, number>,
  tower: TowerDefinition
): boolean {

  // Primeiro verifica a madeira
  if (inventory.wood < tower.cost) {
    return false;
  }

  // Depois verifica ferro, éter e quitina
  return EXTRA_RESOURCES.every((resource) => {
    const required = tower.materials?.[resource] ?? 0;

    return inventory[resource] >= required;
  });
}

// ======================================
// 6. DESCONTAR MATERIAIS
// ======================================

export function spendTowerCost(
  inventory: Record<ResourceType, number>,
  tower: TowerDefinition
): void {

  // Impede construção sem materiais
  if (!canAffordTower(inventory, tower)) {
    throw new Error('Materiais insuficientes!');
  }

  // Desconta madeira
  inventory.wood -= tower.cost;

  // Desconta os materiais adicionais
  for (const resource of EXTRA_RESOURCES) {
    inventory[resource] -=
      tower.materials?.[resource] ?? 0;
  }
}

// ======================================
// 7. FORMATAR OS CUSTOS PARA O MENU
// ======================================

export function formatTowerCost(
  tower: TowerDefinition
): string {

  const costs = [`${tower.cost}M`];

  const symbols: Record<ResourceType, string> = {
    wood: 'M',
    iron: 'F',
    ether: 'E',
    chitin: 'Q',
  };

  for (const resource of EXTRA_RESOURCES) {
    const amount = tower.materials?.[resource] ?? 0;

    if (amount > 0) {
      costs.push(`${amount}${symbols[resource]}`);
    }
  }

  return costs.join(' ');
}
