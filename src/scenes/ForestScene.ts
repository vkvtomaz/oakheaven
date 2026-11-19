
import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import type { ResourceType } from '../core/GameState';
import {
  EXPEDITION_NODES,
  EXPEDITION_ZONES,
  getExpeditionZone,
  type ExpeditionZone,
  type ResourceNodeKind,
} from '../data/expedition';

import { drawText } from '../core/draw';

import {
  DAYLIGHT_WARNING_SECONDS,
  beginExpeditionReturn,
  formatClock,
  recordExpeditionCollection,
  visitExpeditionZone,
} from '../systems/ExpeditionSystem';
import {
  createSceneLayers,
  type SceneLayers,
} from '../visual/layers';
import { THEME } from '../visual/theme';
import { drawHudPanel } from '../visual/ui';
import { createActor, paintForest, placeArt } from '../visual/art';
import { animateKaelenActor } from '../visual/kaelenArt';
import type { KaelenAnimation } from '../visual/kaelenAnimation';

// ======================================
// 1. CONFIGURAÇÕES DA FLORESTA
// ======================================

const WIDTH = 960;
const HEIGHT = 540;
const SPEED = 4.5;

// Configuração de cada recurso
interface ResourceDefinition {
  name: string;
  resource: ResourceType;
  quantity: number;
  hits: number;
  secondsPerHit: number;
  color: number;
}

// Objeto existente no mapa
interface ResourceNode {
  kind: ResourceNodeKind;
  zone: ExpeditionZone;
  x: number;
  y: number;
  hp: number;
  graphic: Graphics;
  healthBar: Graphics;
  light: Graphics | null;
}

// ======================================
// 2. DADOS DOS RECURSOS
// ======================================

const RESOURCE_DATA: Record<ResourceNodeKind, ResourceDefinition> = {
  tree: {
    name: 'Madeira de Carvalho',
    resource: 'wood',
    quantity: 3,
    hits: 6,
    secondsPerHit: 0.5,
    color: 0x75c17b,
  },

  scrap: {
    name: 'Destrocos Metalicos',
    resource: 'iron',
    quantity: 2,
    hits: 8,
    secondsPerHit: 0.6,
    color: 0xb9c2cf,
  },

  crystal: {
    name: 'Cristal de Eter',
    resource: 'ether',
    quantity: 1,
    hits: 12,
    secondsPerHit: 1,
    color: 0xc575f0,
  },

  remains: {
    name: 'Carcaca Alienigena',
    resource: 'chitin',
    quantity: 2,
    hits: 8,
    secondsPerHit: 0.8,
    color: 0xd18eaa,
  },
};

// ======================================
// 3. CLASSE DA FLORESTA
// ======================================

export class ForestScene implements Scene {
  private layers!: SceneLayers;
  private player!: Graphics;
  private playerAnimation!: KaelenAnimation;
  private harvestIndicator!: Graphics;
  private returnHalo!: Graphics;
  private visualClock = 0;

  private hud!: Text;
  private clockText!: Text;
  private zoneLabel!: Text;
  private instructions!: Text;
  private notification!: Text;

  private nodes: ResourceNode[] = [];

  private target: ResourceNode | null = null;
  private hitProgress = 0;

  private hitEffect!: Graphics;
  private hitEffectTime = 0;

  private notificationTime = 0;
  private currentZone: ExpeditionZone = 'safe';
  private warningShown = false;

  // ====================================
  // 4. CRIAÇÃO DO CENÁRIO
  // ====================================

  enter(game: Game): void {
    this.layers = createSceneLayers(game.app.stage);
    const stage = this.layers.entities;

    // Fundo da floresta
    paintForest(this.layers);

    // Quiet zone grading; the active name and risk live in the compact HUD.
    for (const zone of [
      EXPEDITION_ZONES.safe,
      EXPEDITION_ZONES.intermediate,
      EXPEDITION_ZONES.depths,
    ]) {
      this.layers.groundDecals.addChild(
        new Graphics()
          .rect(zone.minX, 95, zone.maxX - zone.minX, HEIGHT - 95)
          .fill({ color: zone.color, alpha: 0.025 })
      );
    }

    // Portal remains at the original return trigger.
    this.returnHalo = new Graphics()
      .ellipse(65, 490, 43, 15)
      .stroke({ color: 0xa8b9ba, width: 1, alpha: 0.55 })
      .ellipse(65, 490, 34, 11)
      .stroke({ color: THEME.colors.sanctuaryGlow, width: 2, alpha: 0.38 });
    this.returnHalo.eventMode = 'none';
    this.layers.groundDecals.addChild(this.returnHalo);
    placeArt(stage, 'pad', 65, 490, 65);
    drawText(this.layers.worldUi, 'VOLTAR', 32, 500, 13, 0x90e0ef);

    // Criação dos objetos extraíveis
    this.nodes = [];

    for (const position of EXPEDITION_NODES) {
      this.createResourceNode(
        game,
        position.kind,
        position.zone,
        position.x,
        position.y
      );
    }

    // Kaelen: visual independente da posição lógica de coleta.
    this.player = createActor('hero', 58);
    // The forest uses the same oblique XY camera as the existing SE animation.
    // Other facing directions still need authored art; never mirror the hammer.
    this.playerAnimation = animateKaelenActor(this.player);

    this.player.position.set(135, 460);
    this.player.zIndex = this.player.y;
    stage.addChild(this.player);
    this.currentZone = 'safe';
    this.warningShown = false;
    visitExpeditionZone(game.state, this.currentZone);

    // Efeito de impacto
    this.hitEffect = new Graphics();
    this.hitEffect.eventMode = 'none';
    this.hitEffect.visible = false;
    this.layers.vfx.addChild(this.hitEffect);
    this.harvestIndicator = new Graphics();
    this.harvestIndicator.eventMode = 'none';
    this.layers.groundDecals.addChild(this.harvestIndicator);

    // HUD
    drawHudPanel(this.layers.hud, 8, 8, 944, 62, 0.92);
    this.hud = drawText(this.layers.hud, '', 22, 17, 16);

    this.clockText = drawText(
      this.layers.hud,
      '',
      754,
      15,
      20,
      THEME.colors.sanctuaryGlow
    );

    this.zoneLabel = drawText(
      this.layers.hud,
      `${EXPEDITION_ZONES.safe.name} | RISCO ${EXPEDITION_ZONES.safe.risk}`,
      22,
      46,
      13,
      THEME.colors.textMuted
    );

    this.instructions = drawText(
      this.layers.hud,
      '',
      298,
      44,
      14,
      0xe7e6c9
    );

    this.notification = drawText(
      this.layers.hud,
      '',
      22,
      76,
      14,
      0xa0ffb2
    );
    // Keep transient messages away from the top-right resource health bars.
    this.notification.style.wordWrap = true;
    this.notification.style.wordWrapWidth = 600;

    this.refreshHUD(game);
  }

  // ====================================
  // 5. DESENHAR RECURSOS
  // ====================================

  private createResourceNode(
    _game: Game,
    kind: ResourceNodeKind,
    zone: ExpeditionZone,
    x: number,
    y: number
  ): void {
    const definition = RESOURCE_DATA[kind];

    const asset = kind === 'tree' ? 'wood' : kind === 'scrap' ? 'scrap'
      : kind === 'crystal' ? 'crystal' : 'scout';
    const graphic = createActor(asset, kind === 'crystal' ? 58 : 45);
    if (kind === 'remains') { graphic.angle = -18; graphic.tint = 0x94849d; }
    const light = kind === 'crystal' ? new Graphics()
      .ellipse(0, 0, 28, 11).fill({ color: 0xa377e2, alpha: .12 })
      .ellipse(0, 0, 17, 7).fill({ color: 0xd2a0ff, alpha: .18 }) : null;
    if (light) { light.eventMode = 'none'; graphic.addChildAt(light, 0); }
    graphic.zIndex = y;
    graphic.position.set(x, y);
    this.layers.entities.addChild(graphic);

    // Barra de resistência
    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    healthBar.visible = false;
    this.layers.worldUi.addChild(healthBar);

    const node: ResourceNode = {
      kind,
      zone,
      x,
      y,
      hp: definition.hits,
      graphic,
      healthBar,
      light,
    };

    this.nodes.push(node);
    this.drawResourceHealth(node);
  }

  // ====================================
  // 6. BARRA DE RESISTÊNCIA
  // ====================================

  private drawResourceHealth(node: ResourceNode): void {
    const definition = RESOURCE_DATA[node.kind];

    const ratio = Math.max(
      0,
      node.hp / definition.hits
    );

    node.healthBar
      .clear()
      .rect(node.x - 22, node.y - 58, 44, 6)
      .fill(0x182a27)
      .rect(
        node.x - 22,
        node.y - 58,
        44 * ratio,
        6
      )
      .fill(definition.color);
  }

  // ====================================
  // 7. ENCONTRAR RECURSO PRÓXIMO
  // ====================================

  private findNearbyNode(): ResourceNode | null {
    let closest: ResourceNode | null = null;
    let smallestDistance = 58;

    for (const node of this.nodes) {
      const distance = Math.hypot(
        this.player.x - node.x,
        this.player.y - node.y
      );

      if (distance < smallestDistance) {
        smallestDistance = distance;
        closest = node;
      }
    }

    return closest;
  }

  // ====================================
  // 8. GOLPEAR RECURSO
  // ====================================

  private strike(
    game: Game,
    node: ResourceNode
  ): void {
    node.hp--;
    this.playerAnimation.attack(node.x - this.player.x, node.y - this.player.y);

    // Efeito visual do golpe
    this.hitEffect
      .clear()
      .ellipse(node.x, node.y, 23, 10)
      .stroke({ color: RESOURCE_DATA[node.kind].color, width: 2, alpha: 0.75 });
    // Intentional procedural impact, emitted by the real harvest strike.
    for (let index = 0; index < 6; index++) {
      const angle = index * Math.PI / 3;
      this.hitEffect
        .moveTo(node.x + Math.cos(angle) * 9, node.y - 15 + Math.sin(angle) * 7)
        .lineTo(node.x + Math.cos(angle) * 23, node.y - 15 + Math.sin(angle) * 17)
        .stroke({ color: 0xffe3a2, width: 1.5, alpha: 0.9 });
    }

    this.hitEffect.visible = true;
    this.hitEffect.alpha = 1;
    this.hitEffectTime = 0.12;

    this.drawResourceHealth(node);

    // Ainda precisa de golpes
    if (node.hp > 0) return;

    const definition = RESOURCE_DATA[node.kind];

    // Adiciona ao inventário global
    game.state.inventory[definition.resource] +=
      definition.quantity;
    recordExpeditionCollection(
      game.state,
      definition.resource,
      definition.quantity,
      node.zone
    );

    // Remove o objeto coletado
    node.graphic.removeFromParent();
    node.healthBar.removeFromParent();

    node.graphic.destroy({ children: true, context: true });
    node.healthBar.destroy();

    this.nodes = this.nodes.filter(
      (item) => item !== node
    );

    this.target = null;
    this.hitProgress = 0;

    // Notificação de coleta
    this.notification.text =
      `+${definition.quantity} | ${definition.name}`;
    this.notification.tint = 0xa0ffb2;

    this.notificationTime = 1.6;

    this.refreshHUD(game);
  }

  // ====================================
  // 9. ATUALIZAR EXTRAÇÃO
  // ====================================

  private updateHarvest(
    game: Game,
    dtSeconds: number
  ): void {
    const nearby = this.findNearbyNode();
    const zone = EXPEDITION_ZONES[this.currentZone];
    this.zoneLabel.text = `${zone.name} | RISCO ${zone.risk}`;
    this.harvestIndicator.clear();
    for (const node of this.nodes) {
      node.healthBar.visible = node === nearby || node.hp < RESOURCE_DATA[node.kind].hits;
    }

    // Mudou de recurso? Reinicia o golpe.
    if (nearby !== this.target) {
      this.target = nearby;
      this.hitProgress = 0;
    }

    if (!nearby) {
      this.instructions.text =
        'WASD: mover | E: coletar | Portal: voltar';
      return;
    }

    const definition = RESOURCE_DATA[nearby.kind];
    this.harvestIndicator
      .ellipse(nearby.x, nearby.y, 29, 12)
      .stroke({ color: definition.color, width: 1.5, alpha: 0.7 });

    if (!game.input.isDown('KeyE')) {
      this.hitProgress = 0;

      this.instructions.text =
        `Segure E: ${definition.name}` +
        ` | ${nearby.hp} golpes`;

      return;
    }

    // Acumula o tempo enquanto E é pressionado
    this.hitProgress += dtSeconds;
    this.harvestIndicator
      .moveTo(nearby.x, nearby.y - 53)
      .arc(nearby.x, nearby.y - 36, 17, -Math.PI / 2,
        -Math.PI / 2 + Math.min(1, this.hitProgress / definition.secondsPerHit) * Math.PI * 2)
      .stroke({ color: definition.color, width: 2.5, alpha: 0.85 });

    this.instructions.text =
      `Extraindo ${definition.name}...` +
      ` ${Math.min(100, Math.floor(
        (this.hitProgress / definition.secondsPerHit) * 100
      ))}%`;

    if (this.hitProgress >= definition.secondsPerHit) {
      this.hitProgress = 0;
      this.strike(game, nearby);
    }
  }

  // ====================================
  // 10. ATUALIZAR INVENTÁRIO VISUAL
  // ====================================

  private refreshHUD(game: Game): void {
    const inventory = game.state.inventory;

    this.hud.text =
      `Madeira: ${inventory.wood}` +
      ` | Ferro: ${inventory.iron}` +
      ` | Eter: ${inventory.ether}` +
      ` | Quitina: ${inventory.chitin}` +
      ` | Nos: ${game.state.expedition.telemetry.nodesCollected}` +
      `/${game.state.expedition.telemetry.totalNodes}`;
  }

  // ====================================
  // 11. GAME LOOP DA FLORESTA
  // ====================================

  update(game: Game, dt: number): void {
    const dtSeconds = dt / 60;
    const previousX = this.player.x;
    const previousY = this.player.y;
    this.visualClock = (this.visualClock + dtSeconds) % 60;

    // Movimento
    let dx = 0;
    let dy = 0;

    if (game.input.isDown('KeyA', 'ArrowLeft')) dx--;
    if (game.input.isDown('KeyD', 'ArrowRight')) dx++;
    if (game.input.isDown('KeyW', 'ArrowUp')) dy--;
    if (game.input.isDown('KeyS', 'ArrowDown')) dy++;

    const magnitude = Math.hypot(dx, dy);

    if (magnitude > 0) {
      dx /= magnitude;
      dy /= magnitude;
    }

    this.player.x += dx * SPEED * dt;
    this.player.y += dy * SPEED * dt;

    this.player.x = Math.max(
      15,
      Math.min(WIDTH - 15, this.player.x)
    );

    this.player.y = Math.max(
      95,
      Math.min(HEIGHT - 15, this.player.y)
    );
    this.player.zIndex = this.player.y;
    this.returnHalo.alpha = 0.65 + Math.sin(this.visualClock * 2) * 0.15;
    for (const node of this.nodes) {
      if (node.light) node.light.alpha = .65 + Math.sin(this.visualClock * 2 + node.x) * .25;
    }

    const zone = getExpeditionZone(this.player.x);
    if (zone !== this.currentZone) {
      this.currentZone = zone;
      visitExpeditionZone(game.state, zone);
      this.notification.text =
        `${EXPEDITION_ZONES[zone].name} | RISCO ${EXPEDITION_ZONES[zone].risk}`;
      this.notification.tint = EXPEDITION_ZONES[zone].color;
      this.notificationTime = 1.8;
    }

    // Atualiza o cronômetro
    const remaining =
      game.state.expedition.remainingSeconds;

    this.clockText.text =
      `ANOITECER: ${formatClock(remaining)}`;

    this.clockText.tint =
      remaining <= DAYLIGHT_WARNING_SECONDS ? 0xff7777 : 0xffffff;

    if (
      remaining <= DAYLIGHT_WARNING_SECONDS &&
      remaining > 0 &&
      !this.warningShown
    ) {
      this.warningShown = true;
      this.notification.text =
        '15 SEGUNDOS! Volte pelo portal ou a retirada sera automatica.';
      this.notification.tint = 0xff7777;
      this.notificationTime = 4;
    }

    // Atualiza efeito de impacto
    if (this.hitEffectTime > 0) {
      this.hitEffectTime -= dtSeconds;
      this.hitEffect.alpha = Math.max(0, this.hitEffectTime / 0.12);

      if (this.hitEffectTime <= 0) {
        this.hitEffect.visible = false;
      }
    }

    // Atualiza notificação
    if (this.notificationTime > 0) {
      this.notificationTime -= dtSeconds;

      if (this.notificationTime <= 0) {
        this.notification.text = '';
      }
    }

    // Extração dos recursos
    this.updateHarvest(game, dtSeconds);
    this.playerAnimation.update(dt, {
      moving: Math.hypot(this.player.x - previousX, this.player.y - previousY) > 0.001,
      directionX: dx,
      directionY: dy,
    });

    // Retorno voluntário ao acampamento
    if (
      this.player.x < 115 &&
      this.player.y > 425
    ) {
      beginExpeditionReturn(game.state);
      game.changeScene('platform-back');
    }
  }
}
