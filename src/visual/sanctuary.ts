import { Container, Graphics } from 'pixi.js';

import { THEME } from './theme';
import { artSprite } from './art';

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

  const art = artSprite('sanctuary', 172);
  art.y = 43;
  sanctuary.addChild(art);
  sanctuary.zIndex = y;
  parent.addChild(sanctuary);
  return sanctuary;
}
