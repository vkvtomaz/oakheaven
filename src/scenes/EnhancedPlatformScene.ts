import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import { drawCircle, drawRect, drawText } from '../core/draw';
import {
  DAYLIGHT_WARNING_SECONDS,
  finishExpedition,
  formatClock,
  getExpeditionReport,
} from '../systems/ExpeditionSystem';
import {
  FALL_STUMBLE_TICKS,
  HIGH_ROUTE_BONUS,
  HIGH_ROUTE_PLATFORMS,
  LOW_ROUTE_MUD,
  TRAVERSAL_GROUND,
  claimHighRouteBonus,
  getTraversalSpeed,
  isInsideMud,
  recordHighRouteFall,
  type TraversalRectangle,
} from '../systems/traversal';
import {
  createSceneLayers,
  type SceneLayers,
} from '../visual/layers';
import { THEME } from '../visual/theme';
import { drawHudPanel } from '../visual/ui';
import { createActor, paintTraversal, platformArt } from '../visual/art';

const WIDTH = 960;
const GRAVITY = 0.6;
const JUMP_FORCE = -12.5;
const PLAYER_HALF_WIDTH = 14;
const PLAYER_HEIGHT = 40;

const surfaces: TraversalRectangle[] = [
  ...HIGH_ROUTE_PLATFORMS,
  { x: 0, y: TRAVERSAL_GROUND, width: WIDTH, height: 85 },
];

export class EnhancedPlatformScene implements Scene {
  private layers!: SceneLayers;
  private player!: Graphics;
  private clockText!: Text;
  private routeText!: Text;
  private statusText!: Text;
  private bonusGraphic: Graphics | null = null;
  private velocityY = 0;
  private highRoute = false;
  private stumbleTicks = 0;
  private statusTicks = 0;
  private readonly goingBack: boolean;

  constructor(goingBack: boolean) {
    this.goingBack = goingBack;
  }

  enter(game: Game): void {
    this.layers = createSceneLayers(game.app.stage);
    const stage = this.layers.entities;

    paintTraversal(this.layers);

    const first = HIGH_ROUTE_PLATFORMS[0];
    const highGuide = new Graphics().moveTo(
      first.x + first.width / 2,
      first.y - 14
    );
    for (const platform of HIGH_ROUTE_PLATFORMS.slice(1)) {
      highGuide.lineTo(
        platform.x + platform.width / 2,
        platform.y - 14
      );
    }
    highGuide.stroke({
      color: THEME.colors.sanctuaryGlow,
      width: 3,
      alpha: 0.42,
    });
    this.layers.groundDecals.addChild(highGuide);

    for (const platform of HIGH_ROUTE_PLATFORMS) {
      platformArt(this.layers.groundDecals, platform.x, platform.y, platform.width);
    }

    for (const mud of LOW_ROUTE_MUD) {
      drawRect(
        this.layers.groundDecals,
        mud.x,
        mud.y,
        mud.width,
        mud.height,
        0x49372d
      );
      for (let x = mud.x + 12; x < mud.x + mud.width; x += 24) {
        drawCircle(this.layers.groundDecals, x, mud.y + 2, 5, 0x30271f);
      }
    }

    drawText(
      this.layers.worldUi,
      'ROTA ALTA  •  RAPIDA  •  RISCO',
      350,
      180,
      15,
      THEME.colors.sanctuaryGlow
    );
    drawText(
      this.layers.worldUi,
      'ROTA BAIXA  •  SEGURA  •  LENTA',
      347,
      425,
      15,
      THEME.colors.textMuted
    );

    drawText(this.layers.worldUi, 'BASE', 21, 465, 13);
    drawText(this.layers.worldUi, 'MATA', 895, 465, 13);

    if (
      !this.goingBack &&
      game.state.expedition.telemetry.traversalBonusWood === 0
    ) {
      this.bonusGraphic = createActor('wood', 28, 0);
      this.bonusGraphic.position.set(
        HIGH_ROUTE_BONUS.x,
        HIGH_ROUTE_BONUS.y
      );
      this.bonusGraphic.zIndex = HIGH_ROUTE_BONUS.y;
      this.layers.entities.addChild(this.bonusGraphic);
      drawText(
        this.layers.worldUi,
        '+1 MADEIRA',
        HIGH_ROUTE_BONUS.x - 42,
        HIGH_ROUTE_BONUS.y - 35,
        13,
        THEME.colors.sanctuaryGlow
      );
    }

    this.player = createActor('hero', 58, 0);
    this.player.position.set(
      this.goingBack ? 870 : 90,
      TRAVERSAL_GROUND
    );
    this.player.zIndex = this.player.y;
    stage.addChild(this.player);

    drawHudPanel(this.layers.hud, 8, 7, 944, 92, 0.92);
    drawText(
      this.layers.hud,
      this.goingBack
        ? 'OAKHEAVEN | Retorno ao acampamento'
        : 'OAKHEAVEN | Travessia para a floresta',
      20,
      15,
      20,
      THEME.colors.sanctuaryGlow
    );
    drawText(
      this.layers.hud,
      'A/D: mover | ESPACO: pular | M: audio',
      20,
      44,
      15,
      THEME.colors.text
    );
    this.statusText = drawText(
      this.layers.hud,
      'Escolha: embaixo e seguro, ou por cima e mais rapido.',
      20,
      70,
      14,
      THEME.colors.textMuted
    );
    this.routeText = drawText(
      this.layers.hud,
      'ROTA: BAIXA',
      735,
      44,
      15,
      THEME.colors.textMuted
    );
    this.clockText = drawText(
      this.layers.hud,
      'ANOITECER: 01:30',
      735,
      15,
      17,
      0xffd38a
    );
  }

  private overlapsX(surface: TraversalRectangle): boolean {
    return (
      this.player.x + PLAYER_HALF_WIDTH > surface.x &&
      this.player.x - PLAYER_HALF_WIDTH < surface.x + surface.width
    );
  }

  private standingSurface(): TraversalRectangle | null {
    return surfaces.find(
      (surface) =>
        Math.abs(this.player.y - surface.y) < 1 &&
        this.overlapsX(surface)
    ) ?? null;
  }

  private setStatus(message: string, ticks = 120): void {
    this.statusText.text = message;
    this.statusTicks = ticks;
  }

  private collectBonus(game: Game): void {
    if (!this.bonusGraphic) return;
    const distance = Math.hypot(
      this.player.x - HIGH_ROUTE_BONUS.x,
      this.player.y - PLAYER_HEIGHT / 2 - HIGH_ROUTE_BONUS.y
    );
    if (distance > 32 || !claimHighRouteBonus(game.state)) return;
    this.bonusGraphic.removeFromParent();
    this.bonusGraphic.destroy({ children: true, context: true });
    this.bonusGraphic = null;
    this.setStatus('Atalho dominado: +1 madeira para as defesas!', 180);
  }

  update(game: Game, dt: number): void {
    const remaining = game.state.expedition.remainingSeconds;
    this.clockText.text = `ANOITECER: ${formatClock(remaining)}`;
    this.clockText.tint = remaining <= DAYLIGHT_WARNING_SECONDS
      ? 0xff7777
      : 0xffffff;

    if (this.statusTicks > 0) {
      this.statusTicks -= dt;
      if (this.statusTicks <= 0) this.statusText.text = '';
    }
    this.stumbleTicks = Math.max(0, this.stumbleTicks - dt);

    const input = game.input;
    let direction = 0;
    if (input.isDown('KeyA', 'ArrowLeft')) direction--;
    if (input.isDown('KeyD', 'ArrowRight')) direction++;

    const onGround = Math.abs(
      this.player.y - TRAVERSAL_GROUND
    ) < 1;
    const speed = getTraversalSpeed(
      this.highRoute,
      onGround && isInsideMud(this.player.x),
      this.stumbleTicks > 0
    );
    this.player.x += direction * speed * dt;
    this.player.x = Math.max(
      PLAYER_HALF_WIDTH,
      Math.min(WIDTH - PLAYER_HALF_WIDTH, this.player.x)
    );

    const jumpPressed =
      input.wasPressed('Space') ||
      input.wasPressed('KeyW') ||
      input.wasPressed('ArrowUp');
    if (
      jumpPressed &&
      this.standingSurface() &&
      this.stumbleTicks <= 0
    ) {
      this.velocityY = JUMP_FORCE;
    }

    this.velocityY += GRAVITY * dt;
    let nextY = this.player.y + this.velocityY * dt;
    let landed: TraversalRectangle | null = null;
    if (this.velocityY >= 0) {
      for (const surface of surfaces) {
        if (
          this.overlapsX(surface) &&
          this.player.y <= surface.y &&
          nextY >= surface.y
        ) {
          nextY = surface.y;
          this.velocityY = 0;
          landed = surface;
          break;
        }
      }
    }
    this.player.y = nextY;

    if (landed) {
      const landedHigh = landed.y < TRAVERSAL_GROUND;
      if (landedHigh) {
        this.highRoute = true;
      } else if (this.highRoute) {
        const exitedRoute = this.player.x < 150 || this.player.x > 810;
        if (!exitedRoute) {
          this.stumbleTicks = FALL_STUMBLE_TICKS;
          recordHighRouteFall(game.state);
          this.setStatus(
            'Queda na rota alta: Kaelen perdeu tempo se recuperando.',
            150
          );
        }
        this.highRoute = false;
      }
    }

    this.player.zIndex = this.player.y;
    this.player.alpha = this.stumbleTicks > 0 ? 0.58 : 1;
    this.routeText.text = this.stumbleTicks > 0
      ? 'ROTA: RECUPERANDO'
      : this.highRoute ? 'ROTA: ALTA' : 'ROTA: BAIXA';
    this.routeText.tint = this.highRoute
      ? THEME.colors.sanctuaryGlow
      : THEME.colors.textMuted;

    this.collectBonus(game);

    if (
      !this.goingBack &&
      this.player.x > 915 &&
      this.player.y >= TRAVERSAL_GROUND - 2
    ) {
      game.changeScene('forest');
      return;
    }

    if (
      this.goingBack &&
      this.player.x < 45 &&
      this.player.y >= TRAVERSAL_GROUND - 2
    ) {
      finishExpedition(game.state, 'voluntary');
      console.info(
        '[OAKHEAVEN] Expedicao concluida:',
        getExpeditionReport(game.state)
      );
      game.changeScene('defense');
    }
  }
}
