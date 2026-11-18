
import { Container, Graphics, Text } from 'pixi.js';
import { THEME } from '../visual/theme';

export function drawRect(
  stage: Container,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number
): Graphics {
  const graphic = new Graphics()
    .rect(x, y, width, height)
    .fill(color);

  stage.addChild(graphic);
  return graphic;
}

export function drawCircle(
  stage: Container,
  x: number,
  y: number,
  radius: number,
  color: number
): Graphics {
  const graphic = new Graphics()
    .circle(x, y, radius)
    .fill(color);

  stage.addChild(graphic);
  return graphic;
}

export function drawText(
  stage: Container,
  content: string,
  x: number,
  y: number,
  size = 20,
  color = 0xffffff
): Text {
  const text = new Text({
    text: content,
    style: {
      fontFamily: size >= 24 ? THEME.fonts.display : THEME.fonts.body,
      fontSize: size,
      fill: color,
      fontWeight: 'normal',
    },
  });

  text.position.set(x, y);
  stage.addChild(text);

  return text;
}
