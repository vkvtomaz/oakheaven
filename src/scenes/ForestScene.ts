
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

import {
  drawRect,
  drawCircle,
  drawText,
} from '../core/draw';

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
}

// ======================================
// 2. DADOS DOS RECURSOS
// ======================================

const RESOURCE_DATA: Record<ResourceNodeKind, ResourceDefinition> = {
  tree: {
    name: 'Arvore de Carvalho',
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

  private hud!: Text;
  private clockText!: Text;
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
    drawRect(this.layers.ground, 0, 0, WIDTH, HEIGHT, 0x223b31);

    // As três zonas deixam distância, raridade e risco legíveis.
    for (const zone of [
      EXPEDITION_ZONES.safe,
      EXPEDITION_ZONES.intermediate,
      EXPEDITION_ZONES.depths,
    ]) {
      this.layers.groundDecals.addChild(
        new Graphics()
          .rect(zone.minX, 95, zone.maxX - zone.minX, HEIGHT - 95)
          .fill({ color: zone.color, alpha: 0.16 })
      );
      drawText(
        this.layers.worldUi,
        `${zone.name} | RISCO ${zone.risk}`,
        zone.minX + 14,
        104,
        12,
        0xe7e6c9
      );
    }

    // Caminhos de terra
    drawRect(this.layers.ground, 0, 420, WIDTH, 85, 0x5f523d);
    drawRect(this.layers.ground, 420, 90, 95, 350, 0x5f523d);

    // Vegetação decorativa
    const trees = [
      [130, 100],
      [295, 115],
      [680, 115],
      [890, 370],
      [135, 330],
      [700, 440],
    ];

    for (const [x, y] of trees) {
      drawCircle(stage, x, y, 30, 0x244a35);

      drawRect(
        stage,
        x - 5,
        y - 3,
        12,
        24,
        0x684b32
      );

      drawCircle(stage, x, y - 15, 32, 0x286947);
    }

    // Portal de retorno
    drawRect(stage, 15, 430, 100, 70, 0x4878b5);
    drawText(stage, 'PORTAL', 29, 440, 16);
    drawText(stage, 'VOLTAR', 27, 466, 14, 0xdcecff);

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

    // Kaelen - representação provisória
    this.player = new Graphics()
      .circle(0, 0, 15)
      .fill(0xf5d69b)
      .circle(4, -4, 3)
      .fill(0x202020);

    this.player.position.set(135, 460);
    stage.addChild(this.player);
    this.currentZone = 'safe';
    this.warningShown = false;
    visitExpeditionZone(game.state, this.currentZone);

    // Efeito de impacto
    this.hitEffect = new Graphics();
    this.hitEffect.eventMode = 'none';
    this.hitEffect.visible = false;
    this.layers.vfx.addChild(this.hitEffect);

    // HUD
    drawHudPanel(this.layers.hud, 8, 6, 944, 84, 0.92);
    this.hud = drawText(this.layers.hud, '', 22, 17, 15);

    this.clockText = drawText(
      this.layers.hud,
      '',
      762,
      13,
      22,
      THEME.colors.sanctuaryGlow
    );

    this.instructions = drawText(
      this.layers.hud,
      '',
      20,
      49,
      16,
      0xe7e6c9
    );

    this.notification = drawText(
      this.layers.hud,
      '',
      20,
      78,
      17,
      0xa0ffb2
    );

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

    const graphic = new Graphics();

    switch (kind) {
      case 'tree':
        graphic
          .rect(-7, -7, 14, 32)
          .fill(0x765039)
          .circle(0, -16, 26)
          .fill(0x34774d)
          .circle(-11, -24, 16)
          .fill(0x479a59);
        break;

      case 'scrap':
        graphic
          .roundRect(-19, -13, 38, 26, 4)
          .fill(0x8994a2)
          .rect(-10, -22, 12, 28)
          .fill(0x505966)
          .circle(10, 4, 5)
          .fill(0x333b43);
        break;

      case 'crystal':
        graphic
          .moveTo(0, -28)
          .lineTo(20, -5)
          .lineTo(8, 22)
          .lineTo(-17, 11)
          .lineTo(-12, -13)
          .closePath()
          .fill(0xa450d6);
        break;

      case 'remains':
        graphic
          .roundRect(-23, -10, 46, 20, 9)
          .fill(0x855d88)
          .circle(-14, -7, 9)
          .circle(12, 7, 9)
          .fill(0xc790b4)
          .circle(0, 0, 7)
          .fill(0x643b73);
        break;
    }

    graphic.position.set(x, y);
    this.layers.entities.addChild(graphic);

    // Barra de resistência
    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    this.layers.worldUi.addChild(healthBar);

    const node: ResourceNode = {
      kind,
      zone,
      x,
      y,
      hp: definition.hits,
      graphic,
      healthBar,
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
      .rect(node.x - 22, node.y - 49, 44, 6)
      .fill(0x182a27)
      .rect(
        node.x - 22,
        node.y - 49,
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

    // Efeito visual do golpe
    this.hitEffect
      .clear()
      .moveTo(this.player.x, this.player.y)
      .lineTo(node.x, node.y)
      .stroke({
        color: 0xffe3a2,
        width: 5,
      });

    this.hitEffect.visible = true;
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

    node.graphic.destroy();
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
    const zoneName = EXPEDITION_ZONES[this.currentZone].name;

    // Mudou de recurso? Reinicia o golpe.
    if (nearby !== this.target) {
      this.target = nearby;
      this.hitProgress = 0;
    }

    if (!nearby) {
      this.instructions.text =
        `${zoneName} | WASD: mover | Recurso: segure E | Portal: voltar`;
      return;
    }

    const definition = RESOURCE_DATA[nearby.kind];

    if (!game.input.isDown('KeyE')) {
      this.hitProgress = 0;

      this.instructions.text =
        `${zoneName} | Segure E: ${definition.name}` +
        ` (${nearby.hp} golpes restantes)`;

      return;
    }

    // Acumula o tempo enquanto E é pressionado
    this.hitProgress += dtSeconds;

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
