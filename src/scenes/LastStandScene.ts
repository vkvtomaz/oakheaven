
import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import type { WaveSystem } from '../systems/WaveSystem';
import { drawText } from '../core/draw';
import { getTowerDefinition } from '../data/towers';

const WIDTH = 960;
const HEIGHT = 540;
const GROUND = 435;
const PLAYER_SPEED = 4;


export class LastStandScene implements Scene {
  // Propriedade que armazena o sistema de waves
  private readonly waves: WaveSystem;

  // Recebe o sistema de waves da cena anterior
  constructor(waves: WaveSystem) {
    this.waves = waves;
  }

  private player!: Graphics;
  private hud!: Text;


  // =====================================
  // 1. CRIAR O CENÁRIO LATERAL
  // =====================================

  enter(game: Game): void {
    const stage = game.app.stage;

    // Céu noturno
    stage.addChild(
      new Graphics()
        .rect(0, 0, WIDTH, HEIGHT)
        .fill(0x111b2c)
    );

    // Montanhas ao fundo
    stage.addChild(
      new Graphics()
        .moveTo(0, 355)
        .lineTo(175, 135)
        .lineTo(360, 355)
        .lineTo(560, 175)
        .lineTo(800, 355)
        .lineTo(960, 220)
        .lineTo(960, HEIGHT)
        .lineTo(0, HEIGHT)
        .closePath()
        .fill(0x273449)
    );

    // Plataforma superior para estruturas
    stage.addChild(
      new Graphics()
        .rect(180, 365, 730, 14)
        .fill(0x626877)
    );

    // Chão principal
    stage.addChild(
      new Graphics()
        .rect(0, GROUND, WIDTH, HEIGHT - GROUND)
        .fill(0x485443)
    );

    // Santuário à esquerda
    stage.addChild(
      new Graphics()
        .roundRect(35, GROUND - 85, 95, 85, 8)
        .fill(0x77818a)
        .rect(60, GROUND - 55, 45, 55)
        .fill(0x343b49)
    );

    drawText(
      stage,
      'SANTUARIO',
      35,
      GROUND - 115,
      16,
      0xffd38a
    );

    // =====================================
    // 2. MOSTRAR TORRES EXISTENTES
    // =====================================

    for (const tower of game.state.towers) {
      const definition = getTowerDefinition(tower.type);

      // Mantém a posição horizontal da torre
      const x = Math.max(
        190,
        Math.min(915, tower.x)
      );

      // Converte a posição vertical do mapa
      // para um dos dois níveis laterais
      const y = tower.y < 300
        ? 335
        : GROUND - 30;

      const graphic = new Graphics()
        .roundRect(-16, -10, 32, 30, 4)
        .fill(
          tower.hp > 0
            ? definition.color
            : 0x555555
        )
        .rect(-7, -20, 14, 12)
        .fill(0xd8d3c5);

      graphic.position.set(x, y);
      stage.addChild(graphic);

      // Barra de vida da torre
      const healthRatio = Math.max(
        0,
        tower.hp / tower.maxHp
      );

      stage.addChild(
        new Graphics()
          .rect(x - 19, y - 34, 38, 5)
          .fill(0x322d31)
          .rect(
            x - 19,
            y - 34,
            38 * healthRatio,
            5
          )
          .fill(0x75d38b)
      );
    }

    // =====================================
    // 3. CRIAR KAELEN
    // =====================================

    this.player = new Graphics()
      .roundRect(-12, -35, 24, 35, 4)
      .fill(0x9b775b)
      .circle(0, -43, 11)
      .fill(0xe1c4a2)
      .rect(11, -19, 22, 7)
      .fill(0x8d929a);

    this.player.position.set(165, GROUND);

    stage.addChild(this.player);

    // =====================================
    // 4. INTERFACE
    // =====================================

    drawText(
      stage,
      'OAKHEAVEN — A ULTIMA LINHA',
      25,
      20,
      23,
      0xffd38a
    );

    drawText(
      stage,
      'A/D ou setas: mover',
      25,
      52,
      15,
      0xe0e0e0
    );

    this.hud = drawText(
      stage,
      '',
      25,
      82,
      16,
      0xb3dfb5
    );

    this.updateHUD(game);
  }

  // =====================================
  // 5. ATUALIZAR INTERFACE
  // =====================================

  private updateHUD(game: Game): void {
    this.hud.text =
      `WAVE: ${this.waves.currentWave}/3` +
      ` | KAELEN: ${game.state.kaelen.hp} HP` +
      ` | SANTUARIO: ${game.state.sanctuary.hp} HP` +
      ` | TORRES: ${game.state.towers.length}`;
  }

  // =====================================
  // 6. MOVIMENTAÇÃO PROVISÓRIA
  // =====================================

  update(game: Game, dt: number): void {
    let direction = 0;

    if (game.input.isDown('KeyA', 'ArrowLeft')) {
      direction--;
    }

    if (game.input.isDown('KeyD', 'ArrowRight')) {
      direction++;
    }

    this.player.x += direction * PLAYER_SPEED * dt;

    // Impede Kaelen de sair do cenário
    this.player.x = Math.max(
      145,
      Math.min(WIDTH - 25, this.player.x)
    );

    this.updateHUD(game);
  }
}
