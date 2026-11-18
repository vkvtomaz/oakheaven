import { Container, Graphics, Sprite } from 'pixi.js';

import { THEME } from './theme';

export function drawHudPanel(
  parent: Container,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.94
): Graphics {
  const panel = new Graphics()
    .roundRect(x, y, width, height, 8)
    .fill({ color: THEME.colors.slate, alpha })
    .stroke({ color: THEME.colors.slateLight, width: 3 })
    .roundRect(x + 5, y + 5, width - 10, height - 10, 5)
    .stroke({ color: THEME.colors.oakLight, width: 1 });
  parent.addChild(panel);
  return panel;
}

export function addFramedImage(
  parent: Container,
  source: string,
  x: number,
  y: number,
  width: number,
  height: number,
  circle = false
): Container {
  const frame = new Container();
  frame.position.set(x, y);

  const fallback = new Graphics();
  if (circle) {
    fallback.circle(width / 2, height / 2, Math.min(width, height) / 2);
  } else {
    fallback.roundRect(0, 0, width, height, 5);
  }
  fallback.fill(THEME.colors.oakLight);
  frame.addChild(fallback);

  const image = Sprite.from(source);
  image.width = width;
  image.height = height;

  const mask = new Graphics();
  if (circle) {
    mask.circle(width / 2, height / 2, Math.min(width, height) / 2);
  } else {
    mask.roundRect(0, 0, width, height, 5);
  }
  mask.fill(0xffffff);
  image.mask = mask;
  frame.addChild(image, mask);

  const border = new Graphics();
  if (circle) {
    border
      .circle(width / 2, height / 2, Math.min(width, height) / 2)
      .stroke({ color: THEME.colors.sanctuary, width: 3 });
  } else {
    border
      .roundRect(0, 0, width, height, 5)
      .stroke({ color: THEME.colors.slateLight, width: 2 });
  }
  frame.addChild(border);
  parent.addChild(frame);
  return frame;
}
