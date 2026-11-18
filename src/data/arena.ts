export interface ArenaPoint {
  x: number;
  y: number;
}

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 540;
export const HUD_HEIGHT = 92;
export const BUILD_PANEL_WIDTH = 240;

export const ROAD_WIDTH = 78;
export const ROAD_SPAWN: ArenaPoint = { x: 975, y: 280 };

export const SANCTUARY = {
  x: 280,
  y: 285,
  radius: 38,
  buildClearance: 85,
} as const;

export const MAIN_ROAD_WAYPOINTS: readonly ArenaPoint[] = [
  { x: 875, y: 280 },
  { x: 745, y: 215 },
  { x: 610, y: 220 },
  { x: 515, y: 350 },
  { x: 395, y: 345 },
  { x: 325, y: 285 },
  { x: SANCTUARY.x, y: SANCTUARY.y },
];

export const MAIN_ROAD_DRAW_POINTS: readonly ArenaPoint[] = [
  ROAD_SPAWN,
  ...MAIN_ROAD_WAYPOINTS,
];

export const BUILD_AREA = {
  minX: BUILD_PANEL_WIDTH + 30,
  maxX: ARENA_WIDTH - 30,
  minY: 115,
  maxY: ARENA_HEIGHT - 30,
} as const;

export const KAELEN_START: ArenaPoint = { x: 365, y: 405 };

export const FLANK_ROUTES = {
  upper: {
    spawn: { x: 975, y: 145 },
    warning: { x: 925, y: 145 },
    waypoints: [
      { x: 790, y: 145 },
      { x: 635, y: 170 },
    ],
  },
  lower: {
    spawn: { x: 975, y: 430 },
    warning: { x: 925, y: 430 },
    waypoints: [
      { x: 790, y: 430 },
      { x: 635, y: 405 },
    ],
  },
} as const;

function distanceToSegment(
  x: number,
  y: number,
  start: ArenaPoint,
  end: ArenaPoint
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    return Math.hypot(x - start.x, y - start.y);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((x - start.x) * segmentX + (y - start.y) * segmentY) /
        lengthSquared
    )
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;

  return Math.hypot(x - closestX, y - closestY);
}

export function distanceToMainRoad(x: number, y: number): number {
  let shortest = Number.POSITIVE_INFINITY;

  for (let index = 1; index < MAIN_ROAD_DRAW_POINTS.length; index++) {
    shortest = Math.min(
      shortest,
      distanceToSegment(
        x,
        y,
        MAIN_ROAD_DRAW_POINTS[index - 1],
        MAIN_ROAD_DRAW_POINTS[index]
      )
    );
  }

  return shortest;
}

export function isInsideBuildArea(x: number, y: number): boolean {
  return (
    x >= BUILD_AREA.minX &&
    x <= BUILD_AREA.maxX &&
    y >= BUILD_AREA.minY &&
    y <= BUILD_AREA.maxY
  );
}
