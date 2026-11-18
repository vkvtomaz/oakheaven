
import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import type { ResourceType } from '../core/GameState';

import {
  drawRect,
  drawCircle,
  drawText,
} from '../core/draw';

import { formatClock } from '../systems/ExpeditionSystem';

// ======================================
// 1. CONFIGURAÇÕES DA FLORESTA
// ======================================

const WIDTH = 960;
const HEIGHT = 540;
const SPEED = 4.5;

// Tipos de objetos que podemos extrair
type NodeKind =
  | 'tree'
  | 'scrap'
  | 'crystal'
  | 'remains';

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
  kind: NodeKind;
  x: number;
  y: number;
  hp: number;
  graphic: Graphics;
  healthBar: Graphics;
}

// ======================================
// 2. DADOS DOS RECURSOS
// ======================================

const RESOURCE_DATA: Record<NodeKind, ResourceDefinition> = {
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

// Objetos espalhados pelo mapa
const RESOURCE_POSITIONS: {
  kind: NodeKind;
  x: number;
  y: number;
}[] = [
  { kind: 'tree', x: 185, y: 180 },
  { kind: 'tree', x: 345, y: 310 },
  { kind: 'tree', x: 740, y: 175 },
  { kind: 'tree', x: 805, y: 365 },

  { kind: 'scrap', x: 310, y: 200 },
  { kind: 'scrap', x: 600, y: 335 },
  { kind: 'scrap', x: 825, y: 455 },

  { kind: 'crystal', x: 545, y: 145 },
  { kind: 'crystal', x: 895, y: 170 },

  { kind: 'remains', x: 480, y: 310 },
  { kind: 'remains', x: 690, y: 435 },
];

// ======================================
// 3. CLASSE DA FLORESTA
// ======================================

export class ForestScene implements Scene {
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

  // ====================================
  // 4. CRIAÇÃO DO CENÁRIO
  // ====================================

  enter(game: Game): void {
    const stage = game.app.stage;

    // Fundo da floresta
    drawRect(stage, 0, 0, WIDTH, HEIGHT, 0x345b40);

    // Caminhos de terra
    drawRect(stage, 0, 420, WIDTH, 85, 0x756849);
    drawRect(stage, 420, 90, 95, 350, 0x756849);

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
    drawRect(stage, 20, 435, 92, 62, 0x4878b5);
    drawText(stage, 'VOLTAR', 27, 452, 17);

    // Criação dos objetos extraíveis
    this.nodes = [];

    for (const position of RESOURCE_POSITIONS) {
      this.createResourceNode(
        game,
        position.kind,
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

    this.player.position.set(470, 460);
    stage.addChild(this.player);

    // Efeito de impacto
    this.hitEffect = new Graphics();
    this.hitEffect.eventMode = 'none';
    this.hitEffect.visible = false;
    stage.addChild(this.hitEffect);

    // HUD
    this.hud = drawText(stage, '', 20, 12, 16);

    this.clockText = drawText(
      stage,
      '',
      750,
      12,
      18,
      0xffd38a
    );

    this.instructions = drawText(
      stage,
      '',
      20,
      49,
      16,
      0xe7e6c9
    );

    this.notification = drawText(
      stage,
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
    game: Game,
    kind: NodeKind,
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
    game.app.stage.addChild(graphic);

    // Barra de resistência
    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    game.app.stage.addChild(healthBar);

    const node: ResourceNode = {
      kind,
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

    // Remove o objeto coletado
    game.app.stage.removeChild(node.graphic);
    game.app.stage.removeChild(node.healthBar);

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

    // Mudou de recurso? Reinicia o golpe.
    if (nearby !== this.target) {
      this.target = nearby;
      this.hitProgress = 0;
    }

    if (!nearby) {
      this.instructions.text =
        'WASD: mover | Aproxime-se de um recurso | Portal azul: voltar';
      return;
    }

    const definition = RESOURCE_DATA[nearby.kind];

    if (!game.input.isDown('KeyE')) {
      this.hitProgress = 0;

      this.instructions.text =
        `Segure E para extrair: ${definition.name}` +
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
      ` | Quitina: ${inventory.chitin}`;
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

    // Atualiza o cronômetro
    const remaining =
      game.state.expedition.remainingSeconds;

    this.clockText.text =
      `ANOITECER: ${formatClock(remaining)}`;

    this.clockText.tint =
      remaining <= 30 ? 0xff7777 : 0xffffff;

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
      game.changeScene('platform-back');
    }
  }
}
