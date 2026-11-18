import { Graphics } from 'pixi.js';

export function createVoltaicBeam(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number
): Graphics {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;
  const points = [{ x: x1, y: y1 }];

  for (let index = 1; index < 5; index++) {
    const ratio = index / 5;
    const jitter = (index % 2 === 0 ? -1 : 1) * 6;
    points.push({
      x: x1 + dx * ratio + normalX * jitter,
      y: y1 + dy * ratio + normalY * jitter,
    });
  }
  points.push({ x: x2, y: y2 });

  const beam = new Graphics().moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) beam.lineTo(point.x, point.y);
  beam.stroke({ color: 0x9d4edd, width: 7, alpha: 0.32 });

  beam.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) beam.lineTo(point.x, point.y);
  beam.stroke({ color, width: 3, alpha: 0.95 });
  return beam;
}
