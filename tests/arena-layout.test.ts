import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILD_AREA,
  FLANK_ROUTES,
  MAIN_ROAD_DRAW_POINTS,
  MAIN_ROAD_WAYPOINTS,
  ROAD_WIDTH,
  SANCTUARY,
  distanceToMainRoad,
  isInsideBuildArea,
} from '../src/data/arena.ts';

test('a rota principal termina no santuario e forma uma curva em S', () => {
  const destination = MAIN_ROAD_WAYPOINTS.at(-1);

  assert.deepEqual(destination, {
    x: SANCTUARY.x,
    y: SANCTUARY.y,
  });

  const verticalDirections = MAIN_ROAD_DRAW_POINTS
    .slice(1)
    .map((point, index) =>
      Math.sign(point.y - MAIN_ROAD_DRAW_POINTS[index].y)
    )
    .filter((direction) => direction !== 0);

  assert.ok(verticalDirections.includes(1));
  assert.ok(verticalDirections.includes(-1));
});

test('a validacao da estrada acompanha todos os segmentos curvos', () => {
  for (const point of MAIN_ROAD_WAYPOINTS) {
    assert.equal(distanceToMainRoad(point.x, point.y), 0);
  }

  assert.ok(
    distanceToMainRoad(900, 500) > ROAD_WIDTH / 2
  );
});

test('area de construcao e entradas de flanco ficam dentro da arena util', () => {
  assert.equal(
    isInsideBuildArea(BUILD_AREA.minX, BUILD_AREA.minY),
    true
  );
  assert.equal(isInsideBuildArea(BUILD_AREA.minX - 1, 300), false);

  assert.ok(FLANK_ROUTES.upper.warning.y < SANCTUARY.y);
  assert.ok(FLANK_ROUTES.lower.warning.y > SANCTUARY.y);
});
