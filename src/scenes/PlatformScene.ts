
import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import { formatClock } from '../systems/ExpeditionSystem';

import {
  drawRect,
  drawCircle,
  drawText,
} from '../core/draw';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WIDTH = 960;
const GROUND = 455;

const SPEED = 4.5;
const GRAVITY = 0.6;
const JUMP_FORCE = -12.5;

const platforms: Rectangle[] = [
  { x: 210, y: 365, width: 125, height: 16 },
  { x: 475, y: 332, width: 125, height: 16 },
  { x: 745, y: 365, width: 130, height: 16 },
];

const rocks: Rectangle[] = [
  { x: 350, y: 405, width: 45, height: 50 },
  { x: 655, y: 390, width: 55, height: 65 },
];

const surfaces: Rectangle[] = [
  ...platforms,
  ...rocks,
  { x: 0, y: GROUND, width: WIDTH, height: 85 },
];

export class PlatformScene implements Scene {
  private player!: Graphics;
  private clockText!: Text;
  private velocityY = 0;
  private readonly goingBack: boolean;

  constructor(goingBack: boolean) {
    this.goingBack = goingBack;
  }

  enter(game: Game): void {
    const stage = game.app.stage;

    // Céu e paisagem
    drawRect(stage, 0, 0, 960, 540, 0x172b3b);
    drawCircle(stage, 780, 105, 46, 0xe6dfa7);

    for (const x of [80, 250, 460, 680, 870]) {
      drawRect(stage, x, 275, 16, 180, 0x5b4534);
      drawCircle(stage, x + 8, 290, 55, 0x24543f);
    }

    // Chão
    drawRect(stage, 0, GROUND, WIDTH, 85, 0x385c3c);
    drawRect(stage, 0, GROUND, WIDTH, 12, 0x64925c);

    // Plataformas
    for (const p of platforms) {
      drawRect(stage, p.x, p.y, p.width, p.height, 0x9d7651);
      drawRect(stage, p.x, p.y, p.width, 5, 0x8db16b);
    }

    // Obstáculos
    for (const rock of rocks) {
      drawRect(
        stage,
        rock.x,
        rock.y,
        rock.width,
        rock.height,
        0x777d87
      );
    }

    // Portais
    drawRect(stage, 20, 380, 45, 75, 0x4878b5);
    drawText(stage, 'BASE', 21, 357, 16);

    drawRect(stage, 895, 380, 45, 75, 0x4c9f68);
    drawText(stage, 'MATA', 895, 357, 16);

    // Personagem provisório
    this.player = new Graphics()
      .roundRect(-14, -40, 28, 40, 5)
      .fill(0xf5d69b)
      .circle(5, -28, 3)
      .fill(0x252525);

    this.player.position.set(
      this.goingBack ? 870 : 100,
      GROUND
    );

    stage.addChild(this.player);

    drawText(
      stage,
      this.goingBack
        ? 'OAKHEAVEN | Retorno ao acampamento'
        : 'OAKHEAVEN | Expedicao',
      20,
      15
    );

    drawText(
      stage,
      'A/D: mover | ESPACO: pular',
      20,
      48,
      17,
      0xe1e8e8
    );

    this.clockText = drawText(
      stage,
      'ANOITECER: 02:00',
      735,
      15,
      17,
      0xffd38a
    );
  }

  private overlapsX(surface: Rectangle): boolean {
    return (
      this.player.x + 14 > surface.x &&
      this.player.x - 14 < surface.x + surface.width
    );
  }

  private isStanding(): boolean {
    return surfaces.some((surface) =>
      Math.abs(this.player.y - surface.y) < 1 &&
      this.overlapsX(surface)
    );
  }

  update(game: Game, dt: number): void {
    this.clockText.text =
      `ANOITECER: ${formatClock(game.state.expedition.remainingSeconds)}`;
    const input = game.input;
    const oldX = this.player.x;

    let direction = 0;

    if (input.isDown('KeyA', 'ArrowLeft')) direction--;
    if (input.isDown('KeyD', 'ArrowRight')) direction++;

    this.player.x += direction * SPEED * dt;

    this.player.x = Math.max(
      14,
      Math.min(WIDTH - 14, this.player.x)
    );

    // Colisões laterais
    for (const rock of rocks) {
      if (
        this.overlapsX(rock) &&
        this.player.y > rock.y + 6 &&
        this.player.y - 40 < rock.y + rock.height
      ) {
        this.player.x = oldX;
      }
    }

    // Pulo
    const jumpPressed =
      input.wasPressed('Space') ||
      input.wasPressed('KeyW') ||
      input.wasPressed('ArrowUp');

    if (jumpPressed && this.isStanding()) {
      this.velocityY = JUMP_FORCE;
    }

    // Gravidade
    this.velocityY += GRAVITY * dt;

    let nextY = this.player.y + this.velocityY * dt;

    // Pouso sobre as superfícies
    if (this.velocityY >= 0) {
      for (const surface of surfaces) {
        if (
          this.overlapsX(surface) &&
          this.player.y <= surface.y &&
          nextY >= surface.y
        ) {
          nextY = surface.y;
          this.velocityY = 0;
        }
      }
    }

    this.player.y = nextY;

    // Entrada na floresta
    if (
      !this.goingBack &&
      this.player.x > 915 &&
      this.player.y >= GROUND - 2
    ) {
      game.changeScene('forest');
      return;
    }

    // Retorno ao acampamento
    if (
      this.goingBack &&
      this.player.x < 45 &&
      this.player.y >= GROUND - 2
    ) {
      game.changeScene('defense');
    }
  }
}
