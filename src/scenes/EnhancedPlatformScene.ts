import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import { drawText } from '../core/draw';
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
import { createTraversalJump } from '../systems/traversalJump';
import { createTraversalHero, createTraversalSalvage, updateTraversalHero, paintTraversalScene, type TraversalPresentation } from '../visual/traversalArt';

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
  private bonusText: Text | null = null;
  private presentation!: TraversalPresentation;
  private velocityY = 0;
  private highRoute = false;
  private stumbleTicks = 0;
  private statusTicks = 0;
  private landingDust!: Graphics;
  private landingDustTicks = 0;
  private wetSplash = false;
  private wasInMud = false;
  private portalCommands: { element: HTMLElement; original: Node[] } | null = null;
  private airborne = false;
  private stepDistance = 0;
  private readonly jumpInput = createTraversalJump();
  private readonly goingBack: boolean;

  constructor(goingBack: boolean) {
    this.goingBack = goingBack;
  }

  enter(game: Game): void {
    this.layers = createSceneLayers(game.app.stage);
    const stage = this.layers.entities;

    this.presentation = paintTraversalScene(
      this.layers, HIGH_ROUTE_PLATFORMS, TRAVERSAL_GROUND, LOW_ROUTE_MUD
    );

    drawText(this.layers.worldUi, 'BASE', 21, 465, 13);
    drawText(this.layers.worldUi, 'MATA', 895, 465, 13);

    if (
      !this.goingBack &&
      game.state.expedition.telemetry.traversalBonusWood === 0
    ) {
      this.bonusGraphic = createTraversalSalvage();
      this.bonusGraphic.position.set(
        HIGH_ROUTE_BONUS.x,
        HIGH_ROUTE_PLATFORMS[2]!.y
      );
      this.bonusGraphic.zIndex = HIGH_ROUTE_PLATFORMS[2]!.y - 1;
      this.layers.entities.addChild(this.bonusGraphic);
      this.bonusText = drawText(
        this.layers.worldUi,
        '+1 MADEIRA',
        HIGH_ROUTE_BONUS.x - 42,
        HIGH_ROUTE_PLATFORMS[2]!.y - 33,
        11,
        THEME.colors.sanctuaryGlow
      );
      this.bonusText.visible = false;
    }

    this.player = createTraversalHero();
    this.player.position.set(
      this.goingBack ? 870 : 90,
      TRAVERSAL_GROUND
    );
    this.player.zIndex = this.player.y;
    stage.addChild(this.player);
    // Dust is presentation only; drawn idle/walk and aerial pose transitions
    // are driven separately from the unchanged movement/collision root.
    this.landingDust = new Graphics();
    this.landingDust.eventMode = 'none';
    this.landingDust.visible = false;
    this.layers.vfx.addChild(this.landingDust);

    const externalCommands = this.installTraversalCommands();
    drawHudPanel(this.layers.hud, 12, 10, 88, 30, 0.78);
    drawText(
      this.layers.hud,
      'Travessia',
      22, 14, 17, THEME.colors.sanctuaryGlow
    );
    drawHudPanel(this.layers.hud, 380, 10, 200, 34, 0.78);
    this.clockText = drawText(
      this.layers.hud, 'ANOITECER: 01:30', 480, 17, 16, 0xffd38a
    );
    this.clockText.anchor.set(.5, 0);
    this.routeText = drawText(
      this.layers.hud, '', 480, 50, 13, THEME.colors.textMuted
    );
    this.routeText.anchor.set(.5, 0);
    this.routeText.visible = false;
    this.statusText = drawText(
      this.layers.hud,
      externalCommands
        ? 'Rota alta: rápida, com risco. Rota baixa: segura, com lama.'
        : 'A/D ou setas: mover | ESPAÇO/W: pular | M: ÁUDIO',
      480, 512, 13, THEME.colors.text
    );
    this.statusText.anchor.set(.5, 0);
    this.statusTicks = 240;
  }

  exit(): void {
    this.presentation.destroy();
    if (this.portalCommands) {
      this.portalCommands.element.replaceChildren(...this.portalCommands.original);
      this.portalCommands = null;
    }
  }

  /** Contextual commands exist only for this scene; restore the actual portal nodes on exit. */
  private installTraversalCommands(): boolean {
    if (typeof document === 'undefined') return false;
    const element = document.querySelector<HTMLElement>('.command-ribbon');
    if (!element) return false;
    this.portalCommands = { element, original: Array.from(element.childNodes) };
    const commands = [['A/D · ←/→', 'Mover'], ['ESPAÇO/W/↑', 'Pular'], ['M', 'ÁUDIO']];
    element.replaceChildren(...commands.map(([key, action]) => {
      const item = document.createElement('span');
      const shortcut = document.createElement('kbd');
      shortcut.textContent = key!;
      item.append(shortcut, ` ${action}`);
      return item;
    }));
    return true;
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

  private showLandingDust(color = 0xa89a75, strength = 1, wet = false): void {
    this.wetSplash = wet;
    this.landingDust.clear().position.set(this.player.x, this.player.y);
    for (let index = 0; index < (strength > 1 ? 10 : strength < 1 ? 3 : 6); index++) {
      const side = index % 2 ? -1 : 1;
      const distance = 7 + index % 3 * 5;
      this.landingDust
        .ellipse(side * distance, -2 - index % 3 * 2,
          (wet ? 1.5 : 5 - index % 3) * Math.min(1.4, strength),
          (wet ? 2.2 : 1.7) * Math.min(1.3, strength))
        .fill({ color, alpha: 0.42 * Math.min(1.3, strength) });
    }
    this.landingDust.scale.set(1);
    this.landingDust.alpha = 1;
    this.landingDust.visible = true;
    this.landingDustTicks = 15;
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
    this.bonusText?.removeFromParent();
    this.bonusText?.destroy();
    this.bonusText = null;
    this.showLandingDust(THEME.colors.sanctuaryGlow);
    this.setStatus('Atalho dominado: +1 madeira para as defesas!', 180);
  }

  update(game: Game, dt: number): void {
    if (this.landingDustTicks > 0) {
      if (this.wetSplash) this.landingDust.y -= dt * .25;
      this.landingDustTicks = Math.max(0, this.landingDustTicks - dt);
      this.landingDust.alpha = this.landingDustTicks / 15;
      this.landingDust.scale.set(1 + (1 - this.landingDust.alpha) * 0.45);
      this.landingDust.visible = this.landingDustTicks > 0;
    }
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
    const jumpPressed =
      input.wasPressed('Space') ||
      input.wasPressed('KeyW') ||
      input.wasPressed('ArrowUp');
    const frameSeconds = game.app?.ticker.deltaMS / 1000;
    // Use real ticker time for grace windows; physics retains its existing dt.
    const inputSeconds = Number.isFinite(frameSeconds) && frameSeconds >= 0
      ? frameSeconds : Number.isFinite(dt) ? Math.max(0, dt) / 60 : 0;
    this.jumpInput.advance(inputSeconds, jumpPressed,
      !this.airborne && this.velocityY === 0 && this.standingSurface() !== null,
      this.stumbleTicks > 0);
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
    const previousX = this.player.x;
    this.player.x += direction * speed * dt;
    this.player.x = Math.max(
      PLAYER_HALF_WIDTH,
      Math.min(WIDTH - PLAYER_HALF_WIDTH, this.player.x)
    );

    let jumped = false;
    if (this.jumpInput.consume(this.stumbleTicks > 0)) {
      this.velocityY = JUMP_FORCE;
      jumped = true;
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
    let hardImpact = false;

    const justLanded = Boolean(landed && this.airborne);
    if (landed) {
      if (this.airborne) this.showLandingDust();
      const landedHigh = landed.y < TRAVERSAL_GROUND;
      if (landedHigh) {
        this.highRoute = true;
      } else if (this.highRoute) {
        const exitedRoute = this.player.x < 150 || this.player.x > 810;
        if (!exitedRoute) {
          this.stumbleTicks = FALL_STUMBLE_TICKS;
          recordHighRouteFall(game.state);
          hardImpact = true;
          this.showLandingDust(0xa89a75, 1.4);
          this.setStatus(
            'Impacto: recuperando o equilíbrio.',
            FALL_STUMBLE_TICKS
          );
        }
        this.highRoute = false;
      }
      this.jumpInput.support();
      // Resolve the landing's recovery rules before considering a buffered jump.
      // A stored press can launch on this contact, but cannot bypass stumbling.
      if (this.jumpInput.consume(this.stumbleTicks > 0)) {
        this.velocityY = JUMP_FORCE;
        jumped = true;
      }
    }
    this.airborne = jumped || (!landed && !this.standingSurface());

    this.presentation.update(dt, this.player.x, hardImpact);
    if (!this.airborne && !justLanded && this.stumbleTicks === 0) {
      this.stepDistance += Math.abs(this.player.x - previousX);
      if (this.stepDistance >= 30) {
        this.stepDistance %= 30;
        const wet = isInsideMud(this.player.x) && Math.abs(this.player.y - TRAVERSAL_GROUND) < 1;
        this.showLandingDust(wet ? 0x6b7067 : 0xa89a75, wet ? .6 : .4, wet);
      }
    } else this.stepDistance = 0;
    const inMud = !this.airborne && Math.abs(this.player.y - TRAVERSAL_GROUND) < 1 && isInsideMud(this.player.x);
    if (inMud && !this.wasInMud && this.statusTicks <= 0 && this.stumbleTicks === 0) {
      this.setStatus('Lama: passos mais lentos.', 120);
    }
    this.wasInMud = inMud;
    updateTraversalHero(this.player, dt, {
      distanceX: this.player.x - previousX,
      velocityY: this.velocityY,
      grounded: !this.airborne,
      landed: justLanded,
      stumbling: this.stumbleTicks > 0,
      jumped,
      recoveryProgress: 1 - this.stumbleTicks / FALL_STUMBLE_TICKS,
    });
    if (this.bonusGraphic) {
      const near = Math.abs(this.player.x - HIGH_ROUTE_BONUS.x) < 95
        && Math.abs(this.player.y - HIGH_ROUTE_PLATFORMS[2]!.y) < 80;
      if (this.bonusText) this.bonusText.visible = near;
      const glint = this.bonusGraphic.children[1];
      if (glint) glint.alpha = near ? .85 : .28;
    }
    this.player.zIndex = this.player.y;
    this.player.alpha = this.stumbleTicks > 0 ? 0.88 : 1;
    this.routeText.text = this.stumbleTicks > 0
      ? `RECUPERANDO: ${(Math.ceil(this.stumbleTicks / 6) / 10).toFixed(1).replace('.', ',')}s`
      : '';
    this.routeText.visible = this.stumbleTicks > 0;
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
