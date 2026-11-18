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
    .stroke({ color: THEME.colors.slateLight, width: 1, alpha: 0.55 })
    .roundRect(x + 5, y + 5, width - 10, height - 10, 5)
    .stroke({ color: THEME.colors.oakLight, width: 1, alpha: 0.15 });
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
  const scale = Math.max(width / image.texture.width, height / image.texture.height);
  image.scale.set(scale);
  image.position.set((width - image.width) / 2, (height - image.height) / 2);

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
      .stroke({ color: THEME.colors.sanctuary, width: 1, alpha: 0.55 });
  } else {
    border
      .roundRect(0, 0, width, height, 5)
      .stroke({ color: THEME.colors.slateLight, width: 2 });
  }
  frame.addChild(border);
  parent.addChild(frame);
  return frame;
}
