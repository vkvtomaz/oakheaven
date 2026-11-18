export type ExpeditionZone = 'safe' | 'intermediate' | 'depths';

export type ResourceNodeKind =
  | 'tree'
  | 'scrap'
  | 'crystal'
  | 'remains';

export interface ExpeditionNodeDefinition {
  kind: ResourceNodeKind;
  zone: ExpeditionZone;
  x: number;
  y: number;
}

export const EXPEDITION_ZONES = {
  safe: {
    name: 'BOSQUE SEGURO',
    minX: 0,
    maxX: 400,
    color: 0x4f8b58,
    risk: 1,
  },
  intermediate: {
    name: 'MATA INTERMEDIARIA',
    minX: 400,
    maxX: 700,
    color: 0x8a7445,
    risk: 2,
  },
  depths: {
    name: 'PROFUNDEZAS',
    minX: 700,
    maxX: 960,
    color: 0x65456f,
    risk: 3,
  },
} as const;

export const EXPEDITION_NODES: readonly ExpeditionNodeDefinition[] = [
  // Zona segura: madeira e ferro.
  { kind: 'tree', zone: 'safe', x: 170, y: 165 },
  { kind: 'tree', zone: 'safe', x: 215, y: 320 },
  { kind: 'tree', zone: 'safe', x: 335, y: 420 },
  { kind: 'tree', zone: 'safe', x: 365, y: 300 },
  { kind: 'scrap', zone: 'safe', x: 330, y: 175 },
  { kind: 'scrap', zone: 'safe', x: 165, y: 430 },

  // Zona intermediaria: madeira, ferro e quitina.
  { kind: 'tree', zone: 'intermediate', x: 450, y: 155 },
  { kind: 'tree', zone: 'intermediate', x: 610, y: 235 },
  { kind: 'scrap', zone: 'intermediate', x: 500, y: 335 },
  { kind: 'scrap', zone: 'intermediate', x: 675, y: 140 },
  { kind: 'remains', zone: 'intermediate', x: 585, y: 430 },

  // Profundezas: Eter e quitina.
  { kind: 'remains', zone: 'depths', x: 750, y: 270 },
  { kind: 'crystal', zone: 'depths', x: 820, y: 145 },
  { kind: 'remains', zone: 'depths', x: 850, y: 410 },
  { kind: 'crystal', zone: 'depths', x: 910, y: 245 },
];

export const EXPEDITION_NODE_COUNT = EXPEDITION_NODES.length;

export function getExpeditionZone(x: number): ExpeditionZone {
  if (x < EXPEDITION_ZONES.safe.maxX) return 'safe';
  if (x < EXPEDITION_ZONES.intermediate.maxX) return 'intermediate';
  return 'depths';
}
