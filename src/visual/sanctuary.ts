import { Container, Graphics } from 'pixi.js';

import { THEME } from './theme';

export function drawSanctuary(
  parent: Container,
  x: number,
  y: number,
  scale = 1
): Container {
  const sanctuary = new Container();
  sanctuary.position.set(x, y);
  sanctuary.scale.set(scale);

  sanctuary.addChild(
    new Graphics()
      .circle(0, 0, 55)
      .fill({ color: THEME.colors.sanctuary, alpha: 0.12 })
      .stroke({ color: THEME.colors.sanctuaryGlow, width: 3, alpha: 0.75 })
      .circle(0, 0, 45)
      .stroke({ color: THEME.colors.sanctuary, width: 6, alpha: 0.28 })
  );

  const tree = new Graphics()
    .moveTo(-8, 18)
    .lineTo(-11, -15)
    .lineTo(-24, -35)
    .moveTo(8, 18)
    .lineTo(11, -14)
    .lineTo(29, -31)
    .moveTo(0, -4)
    .lineTo(0, -42)
    .moveTo(0, -27)
    .lineTo(-18, -47)
    .moveTo(2, -31)
    .lineTo(19, -51)
    .stroke({ color: 0x6c5b52, width: 8 });
  sanctuary.addChild(tree);

  const graves = new Graphics();
  for (const [graveX, graveY] of [
    [-27, 18],
    [0, 24],
    [27, 18],
  ]) {
    graves
      .roundRect(graveX - 7, graveY - 13, 14, 24, 6)
      .fill(0xa6a8ad)
      .stroke({ color: THEME.colors.sanctuaryGlow, width: 1.5 });
  }
  sanctuary.addChild(graves);
  parent.addChild(sanctuary);
  return sanctuary;
}
