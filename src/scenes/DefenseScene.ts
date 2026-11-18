
import {
  Graphics,
  type Text,
  type FederatedPointerEvent,
} from 'pixi.js';

import type { Game } from '../core/Game';
import type { Scene } from '../core/Scene';
import type {
  TowerState,
  TowerType,
} from '../core/GameState';

import { drawRect, drawCircle, drawText } from '../core/draw';
import {
  TOWERS,
  getTowerDefinition,
  canAffordTower,
  spendTowerCost,
  formatTowerCost,
} from '../data/towers';

import {
  WaveSystem,
  type EnemyKind,
} from '../systems/WaveSystem';
import { ENEMY_STATS } from '../data/enemies';
import { repairTower } from '../systems/repair';
import {
  getRepulsorPush,
  selectTargetsInRange,
} from '../systems/towerCombat';


// =====================================
// CONFIGURAÇÕES
// =====================================

const WIDTH = 960;
const HEIGHT = 540;
const MENU_WIDTH = 240;

const ROAD_TOP = 240;
const ROAD_BOTTOM = 330;

interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  speed: number;
  radius: number;
  baseDamage: number;
  slowTicks: number;
  attackCooldown: number;
  graphic: Graphics;
}

interface Effect {
  graphic: Graphics;
  life: number;
}

export class DefenseScene implements Scene {
  private waves = new WaveSystem();
  private selected: TowerType | null = null;

  private hud!: Text;
  private status!: Text;
  private preview!: Graphics;

  private pointerX = 0;
  private pointerY = 0;

  private buttons: {
    type: TowerType;
    graphic: Graphics;
  }[] = [];

  private towerGraphics = new Map<number, Graphics>();
  private healthBars = new Map<number, Graphics>();

  private enemies: Enemy[] = [];
  private effects: Effect[] = [];

  // ==================================
  // CRIAÇÃO DO CENÁRIO
  // ==================================

  enter(game: Game): void {
    const stage = game.app.stage;

    game.state.wave = 1;

    drawRect(stage, 0, 0, WIDTH, HEIGHT, 0x365b45);

    // Estrada dos invasores
    drawRect(
      stage,
      MENU_WIDTH,
      ROAD_TOP,
      WIDTH - MENU_WIDTH,
      ROAD_BOTTOM - ROAD_TOP,
      0x897354
    );

    // Árvores decorativas
    for (const [x, y] of [
      [305, 145],
      [490, 450],
      [765, 150],
      [870, 430],
    ]) {
      drawCircle(stage, x, y, 27, 0x274f39);
    }

    // Santuário
    drawCircle(stage, 280, 285, 38, 0x506b9b);
    drawRect(stage, 262, 274, 36, 25, 0xb6c4d5);
    drawText(stage, 'SANTUARIO', 250, 335, 14);

    // Superfície que recebe os cliques
    const surface = new Graphics()
      .rect(
        MENU_WIDTH,
        90,
        WIDTH - MENU_WIDTH,
        HEIGHT - 90
      )
      .fill({ color: 0xffffff, alpha: 0.001 });

    surface.eventMode = 'static';
    surface.cursor = 'crosshair';
    stage.addChild(surface);

    surface.on(
      'pointermove',
      (event: FederatedPointerEvent) => {
        const position = stage.toLocal(event.global);

        this.pointerX = position.x;
        this.pointerY = position.y;

        this.updatePreview(game);
      }
    );

    surface.on('pointerout', () => {
      this.preview.visible = false;
    });

    surface.on(
      'pointerdown',
      (event: FederatedPointerEvent) => {
        const position = stage.toLocal(event.global);
        this.handleMapClick(game, position.x, position.y);
      }
    );

    // Painel lateral
    drawRect(stage, 0, 0, MENU_WIDTH, HEIGHT, 0x162633);

    drawText(stage, 'FORJA DE KAELEN', 15, 17, 19);

    drawText(
      stage,
      'Selecione uma estrutura',
      15,
      53,
      14,
      0xc1d2db
    );

    TOWERS.forEach((tower, index) => {
      this.createButton(game, tower.type, index);
    });

    // Interface
    this.hud = drawText(stage, '', 252, 15, 16);

    this.status = drawText(
      stage,
      'Selecione uma torre para construir.',
      252,
      48,
      14,
      0xe2e3bb
    );

    drawText(
      stage,
      'ENTER: iniciar | ESC: cancelar | Clique: reparar',
      252,
      75,
      12,
      0xd1d9d8
    );

    // Pré-visualização da construção
    this.preview = new Graphics();
    this.preview.eventMode = 'none';
    this.preview.visible = false;

    stage.addChild(this.preview);

    // Recupera torres do estado compartilhado
    for (const tower of game.state.towers) {
      this.drawTower(game, tower);
    }

    this.refreshButtons();
    this.refreshHUD(game);
  }

  // ==================================
  // MENU DE CONSTRUÇÃO
  // ==================================

  private createButton(
    game: Game,
    type: TowerType,
    index: number
  ): void {
    const stage = game.app.stage;
    const definition = getTowerDefinition(type);
    const y = 95 + index * 73;

    const button = new Graphics();

    button.eventMode = 'static';
    button.cursor = 'pointer';

    button.on('pointerdown', () => {
      if (this.waves.phase !== 'preparation') return;

      this.selected =
        this.selected === type ? null : type;

      this.refreshButtons();
      this.updatePreview(game);

      this.status.text = this.selected
        ? definition.description
        : 'Selecao cancelada.';
    });

    stage.addChild(button);

    drawCircle(
      stage,
      34,
      y + 24,
      11,
      definition.color
    ).eventMode = 'none';

    drawText(
      stage,
      `${index + 1}. ${definition.name}`,
      55,
      y + 6,
      13
    ).eventMode = 'none';

    drawText(
      stage,
      formatTowerCost(definition),
      55,
      y + 29,
      12,
      0xc8d4ce
    ).eventMode = 'none';

    this.buttons.push({
      type,
      graphic: button,
    });
  }

  private refreshButtons(): void {
    this.buttons.forEach((button, index) => {
      const y = 95 + index * 73;
      const active = button.type === this.selected;

      button.graphic
        .clear()
        .roundRect(10, y, 218, 59, 8)
        .fill(active ? 0x34516b : 0x253847)
        .stroke({
          color: active ? 0x91c2e7 : 0x476071,
          width: active ? 2 : 1,
        });
    });
  }

  // ==================================
  // CLIQUES NO MAPA
  // ==================================

  private handleMapClick(
    game: Game,
    x: number,
    y: number
  ): void {
    if (this.waves.phase !== 'preparation') return;

    if (this.selected !== null) {
      this.tryBuild(game, x, y);
    } else {
      this.tryRepair(game, x, y);
    }
  }

  // ==================================
  // VALIDAÇÃO DE CONSTRUÇÃO
  // ==================================

  private placementError(
    game: Game,
    x: number,
    y: number,
    type: TowerType
  ): string | null {
    const definition = getTowerDefinition(type);

    if (
      x < MENU_WIDTH + 30 ||
      x > WIDTH - 30 ||
      y < 115 ||
      y > HEIGHT - 30
    ) {
      return 'Fora da area construivel.';
    }

    if (Math.hypot(x - 280, y - 285) < 85) {
      return 'Nao construa sobre o santuario.';
    }

    if (definition.placement === 'road') {
      if (y < 265 || y > 305) {
        return 'Barricadas precisam ficar na estrada.';
      }
    } else {
      if (
        y + 24 > ROAD_TOP &&
        y - 24 < ROAD_BOTTOM
      ) {
        return 'Torres devem ficar fora da estrada.';
      }
    }

    const overlapping = game.state.towers.some(
      (tower) =>
        Math.hypot(
          tower.x - x,
          tower.y - y
        ) < 52
    );

    if (overlapping) {
      return 'Muito proximo de outra estrutura.';
    }

    if (!canAffordTower(game.state.inventory, definition)) {
      return `Materiais insuficientes! Custo: ${formatTowerCost(definition)}`;
    }

    return null;
  }

  // ==================================
  // PRÉ-VISUALIZAÇÃO
  // ==================================

  private updatePreview(game: Game): void {
    if (
      this.waves.phase !== 'preparation' ||
      this.selected === null
    ) {
      this.preview.visible = false;
      return;
    }

    const x = this.pointerX;
    const y = this.pointerY;

    if (x <= MENU_WIDTH || y < 90) {
      this.preview.visible = false;
      return;
    }

    const definition = getTowerDefinition(this.selected);
    const valid =
      this.placementError(game, x, y, this.selected) === null;

    const color = valid ? 0x65e09a : 0xf16f77;

    this.preview.visible = true;
    this.preview.clear();

    if (definition.range > 0) {
      this.preview
        .circle(x, y, definition.range)
        .fill({ color, alpha: 0.09 })
        .stroke({
          color,
          width: 1.5,
          alpha: 0.45,
        });
    }

    if (definition.placement === 'road') {
      this.preview
        .roundRect(x - 21, y - 14, 42, 28, 4)
        .fill({ color, alpha: 0.65 });
    } else {
      this.preview
        .circle(x, y, 20)
        .fill({ color, alpha: 0.65 });
    }
  }

  // ==================================
  // CONSTRUIR TORRES
  // ==================================

  private tryBuild(
    game: Game,
    x: number,
    y: number
  ): void {
    const type = this.selected;

    if (type === null) return;

    const error = this.placementError(
      game,
      x,
      y,
      type
    );

    if (error) {
      this.status.text = error;
      return;
    }

    const definition = getTowerDefinition(type);

    spendTowerCost(game.state.inventory, definition);

    const tower: TowerState = {
      id:
        Math.max(
          0,
          ...game.state.towers.map((t) => t.id)
        ) + 1,

      type,
      tier: 1,
      x,
      y,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      cooldown: 0,
    };

    game.state.towers.push(tower);

    this.drawTower(game, tower);

    // Cancela a seleção após a construção
    this.selected = null;

    this.refreshButtons();
    this.refreshHUD(game);
    this.updatePreview(game);

    this.status.text =
      `${definition.name} construida!`;
  }

  // ==================================
  // REPARO ENTRE WAVES
  // ==================================

  private tryRepair(
    game: Game,
    x: number,
    y: number
  ): void {
    const tower = game.state.towers.find(
      (tower) =>
        Math.hypot(
          tower.x - x,
          tower.y - y
        ) < 30
    );

    if (!tower) return;

    const result = repairTower(game.state.inventory, tower);

    if (result === 'destroyed') {
      this.status.text =
        'Estrutura destruida. Nao pode ser reparada.';
      return;
    }

    if (result === 'full') {
      this.status.text =
        'Esta estrutura ja esta totalmente reparada.';
      return;
    }

    if (result === 'insufficient') {
      this.status.text =
        'Madeira insuficiente para reparo.';
      return;
    }

    this.refreshTowerHealth(tower);
    this.refreshHUD(game);

    this.status.text =
      `Torre reparada! HP: ${Math.ceil(tower.hp)}/${tower.maxHp}`;
  }

  // ==================================
  // DESENHO DAS TORRES
  // ==================================

  private drawTower(
    game: Game,
    tower: TowerState
  ): void {
    const stage = game.app.stage;
    const definition = getTowerDefinition(tower.type);

    const graphic = new Graphics();
    graphic.position.set(tower.x, tower.y);
    graphic.eventMode = 'none';

    if (tower.type === 'spike_barricade') {
      graphic
        .roundRect(-22, -14, 44, 28, 4)
        .fill(definition.color)
        .rect(-15, -19, 7, 13)
        .rect(2, -19, 7, 13)
        .fill(0x59452e);
    } else {
      graphic
        .circle(0, 0, 21)
        .fill(0x574532)
        .circle(0, -4, 16)
        .fill(definition.color)
        .rect(-5, -22, 10, 17)
        .fill(0x424a52);
    }

    if (tower.hp <= 0) {
      graphic.tint = 0x555555;
    }

    stage.addChild(graphic);
    this.towerGraphics.set(tower.id, graphic);

    const bar = new Graphics();
    bar.eventMode = 'none';

    stage.addChild(bar);
    this.healthBars.set(tower.id, bar);

    this.refreshTowerHealth(tower);
  }

  private refreshTowerHealth(tower: TowerState): void {
    const bar = this.healthBars.get(tower.id);

    if (!bar) return;

    const ratio = Math.max(
      0,
      Math.min(1, tower.hp / tower.maxHp)
    );

    bar
      .clear()
      .rect(tower.x - 22, tower.y - 37, 44, 6)
      .fill(0x172029)
      .rect(
        tower.x - 22,
        tower.y - 37,
        44 * ratio,
        6
      )
      .fill(
        ratio > 0.5
          ? 0x76dc8f
          : 0xe4a35d
      );

    if (tower.hp <= 0) {
      const graphic = this.towerGraphics.get(tower.id);

      if (graphic) {
        graphic.tint = 0x555555;
      }
    }
  }

  private damageTower(
    tower: TowerState,
    damage: number
  ): void {
    tower.hp = Math.max(
      0,
      tower.hp - damage
    );

    this.refreshTowerHealth(tower);
  }

  // ==================================
  // CRIAÇÃO DOS INIMIGOS
  // ==================================

  private spawnEnemy(
    game: Game,
    kind: EnemyKind
  ): void {


    const values = ENEMY_STATS[kind];

    const y =
      kind === 'alpha'
        ? 280
        : 280 + ((this.waves.spawned % 3) - 1) * 15;

    const graphic = new Graphics()
      .circle(0, 0, values.radius)
      .fill(values.color)
      .circle(-4, -3, 3)
      .fill(0xffffff);

    graphic.position.set(975, y);
    graphic.eventMode = 'none';

    game.app.stage.addChild(graphic);

    this.enemies.push({
      kind,
      x: 975,
      y,
      hp: values.hp,
      speed: values.speed,
      radius: values.radius,
      baseDamage: values.damage,
      slowTicks: 0,
      attackCooldown: 0,
      graphic,
    });
  }

  private removeEnemy(
    game: Game,
    enemy: Enemy
  ): void {
    const index = this.enemies.indexOf(enemy);

    if (index < 0) return;

    this.enemies.splice(index, 1);

    game.app.stage.removeChild(enemy.graphic);
    enemy.graphic.destroy();
  }

  private damageEnemy(
    game: Game,
    enemy: Enemy,
    damage: number
  ): void {
    if (!this.enemies.includes(enemy)) return;

    enemy.hp -= damage;

    if (enemy.hp <= 0) {
      this.removeEnemy(game, enemy);
      game.state.defeatedEnemies++;
    }
  }

  // ==================================
  // EFEITOS VISUAIS
  // ==================================

  private addEffect(
    game: Game,
    graphic: Graphics
  ): void {
    graphic.eventMode = 'none';

    game.app.stage.addChild(graphic);

    this.effects.push({
      graphic,
      life: 9,
    });
  }

  private showBeam(
    game: Game,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number
  ): void {
    this.addEffect(
      game,
      new Graphics()
        .moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke({
          color,
          width: 3,
        })
    );
  }

  // ==================================
  // ATAQUES DAS TORRES
  // ==================================

  private attack(
    game: Game,
    tower: TowerState
  ): void {
    if (tower.hp <= 0) return;
    if (tower.type === 'spike_barricade') return;
    if (tower.cooldown > 0) return;

    const definition = getTowerDefinition(tower.type);

    const targets = selectTargetsInRange(
      this.enemies,
      tower.x,
      tower.y,
      definition.range,
      280,
      285
    );

    if (targets.length === 0) return;

    tower.cooldown = definition.fireInterval;

    switch (tower.type) {
      case 'arc_ballista': {
        const target = targets[0];

        this.showBeam(
          game,
          tower.x,
          tower.y,
          target.x,
          target.y,
          0xf5df82
        );

        this.damageEnemy(
          game,
          target,
          definition.damage
        );

        break;
      }

      case 'slag_forge': {
        for (const target of targets) {
          target.slowTicks = Math.max(
            target.slowTicks,
            65
          );

          this.damageEnemy(
            game,
            target,
            definition.damage
          );
        }

        this.addEffect(
          game,
          new Graphics()
            .circle(
              tower.x,
              tower.y,
              definition.range
            )
            .stroke({
              color: 0xbd70ec,
              width: 5,
            })
        );

        break;
      }

      case 'repulsor': {
        for (const target of targets) {

          // Cada classe resiste de forma diferente
          const pushDistance = getRepulsorPush(target.kind);

          target.x = Math.min(
            975,
            target.x + pushDistance
          );

          target.graphic.x = target.x;
        }

        this.addEffect(
          game,
          new Graphics()
            .circle(
              tower.x,
              tower.y,
              definition.range
            )
            .stroke({
              color: 0x8ddbe9,
              width: 4,
            })
        );

        break;
      }


      case 'chitin_cannon': {
        for (const target of targets.slice(0, 3)) {
          this.showBeam(
            game,
            tower.x,
            tower.y,
            target.x,
            target.y,
            0xf3a09c
          );

          this.damageEnemy(
            game,
            target,
            definition.damage
          );
        }

        break;
      }
    }
  }

  // ==================================
  // MOVIMENTAÇÃO DOS INIMIGOS
  // ==================================

  private moveEnemies(
    game: Game,
    dt: number
  ): void {
    for (const enemy of [...this.enemies]) {
      enemy.attackCooldown -= dt;

      const multiplier =
        enemy.slowTicks > 0 ? 0.55 : 1;

      enemy.slowTicks = Math.max(
        0,
        enemy.slowTicks - dt
      );

      const nextX =
        enemy.x - enemy.speed * multiplier * dt;

      // Verifica barricadas no caminho
      const barricade = game.state.towers.find(
        (tower) =>
          tower.type === 'spike_barricade' &&
          tower.hp > 0 &&
          Math.abs(tower.y - enemy.y) <= 32 &&
          enemy.x >= tower.x + 20 &&
          nextX <= tower.x + 25
      );

      if (barricade) {
        enemy.x = barricade.x + 25;

        if (enemy.attackCooldown <= 0) {
          const damage =
            enemy.kind === 'alpha'
              ? 30
              : enemy.kind === 'brute'
                ? 18
                : 12;

          this.damageTower(barricade, damage);
          this.damageEnemy(game, enemy, 0.7);

          enemy.attackCooldown = 42;
        }
      } else {
        enemy.x = nextX;
      }

      if (!this.enemies.includes(enemy)) {
        continue;
      }

      enemy.graphic.x = enemy.x;

      // Unidades maiores atacam torres próximas
      if (
        !barricade &&
        enemy.kind !== 'scout' &&
        enemy.attackCooldown <= 0
      ) {
        const nearbyTower = game.state.towers.find(
          (tower) =>
            tower.hp > 0 &&
            tower.type !== 'spike_barricade' &&
            Math.hypot(
              tower.x - enemy.x,
              tower.y - enemy.y
            ) < 120
        );

        if (nearbyTower) {
          this.damageTower(
            nearbyTower,
            enemy.kind === 'alpha' ? 15 : 7
          );

          this.showBeam(
            game,
            enemy.x,
            enemy.y,
            nearbyTower.x,
            nearbyTower.y,
            0xc96dda
          );

          enemy.attackCooldown = 80;
        }
      }

      // Dano ao santuário
      if (enemy.x <= 310) {
        this.removeEnemy(game, enemy);
        //se o chefe alcançar o santuário,
        //a defesa é considerada perdida.
        if (enemy.kind === 'alpha') {
          game.state.sanctuary.hp = 0;
        } else {
          //inimigos comuns causam dano normal
          game.state.sanctuary.hp = Math.max(
            0,
            game.state.sanctuary.hp - enemy.baseDamage
          );
      }
    }
  }
}

  // ==================================
  // GERENCIAMENTO DAS TRÊS WAVES
  // ==================================


private startWave(game: Game): void {
  // Verifica se existe alguma torre funcional
  const hasDefense = game.state.towers.some(
    (tower) => tower.hp > 0
  );

  if (!hasDefense) {
    this.status.text =
      'Construa ao menos uma defesa antes de iniciar.';
    return;
  }

  // Inicia a wave atual
  if (!this.waves.startWave()) return;

  // Atualiza o estado compartilhado
  game.state.wave = this.waves.currentWave;

  // =====================================
  // WAVE 3 — TRANSIÇÃO PARA VISÃO LATERAL
  // =====================================

  if (this.waves.currentWave === 3) {
    // Passa o WaveSystem EXISTENTE para
    // a nova cena, sem reiniciar as waves.
    game.changeScene('last-stand', this.waves);
    return;
  }

  // =====================================
  // WAVES 1 E 2 — VISÃO SUPERIOR
  // =====================================

  this.selected = null;

  this.refreshButtons();
  this.updatePreview(game);
  this.refreshHUD(game);
}


  private updateCombat(
    game: Game,
    dt: number
  ): void {
    // Solicita novos inimigos ao WaveSystem
    const incoming = this.waves.update(dt);

    for (const kind of incoming) {
      this.spawnEnemy(game, kind);
    }

    // Movimento e ataque dos inimigos
    this.moveEnemies(game, dt);

    // Funcionamento das torres
    for (const tower of game.state.towers) {
      tower.cooldown = Math.max(
        0,
        tower.cooldown - dt
      );

      this.attack(game, tower);
    }

    // Atualização dos efeitos
    for (const effect of [...this.effects]) {
      effect.life -= dt;

      if (effect.life <= 0) {
        game.app.stage.removeChild(effect.graphic);
        effect.graphic.destroy();

        this.effects.splice(
          this.effects.indexOf(effect),
          1
        );
      }
    }

    this.refreshHUD(game);

    // Derrota da campanha de teste
    if (game.state.sanctuary.hp <= 0) {
      this.waves.lose();
      this.showResult(game, false);
      return;
    }

    // A wave terminou?
    if (this.waves.isComplete(this.enemies.length)) {
      const completedWave = this.waves.currentWave;
      const result = this.waves.completeWave();

      if (result.finishedNight) {
        this.showResult(game, true);
        return;
      }

      // Recompensa entre ondas
      game.state.inventory.wood += result.woodReward;
      game.state.wave = this.waves.currentWave;

      this.refreshHUD(game);

      this.status.text =
        `Wave ${completedWave} vencida! ` +
        `+${result.woodReward} madeira. ` +
        `Reforce as defesas e pressione ENTER.`;
    }
  }

  // ==================================
  // INTERFACE
  // ==================================

  private refreshHUD(game: Game): void {
    const state = game.state;

    this.hud.text =
      `ATO ${state.act} | NOITE ${state.night}` +
      ` | W${this.waves.currentWave}/3` +
      ` | M:${state.inventory.wood}` +
      ` F:${state.inventory.iron}` +
      ` E:${state.inventory.ether}` +
      ` Q:${state.inventory.chitin}` +
      ` | BASE:${state.sanctuary.hp}`;

    if (this.waves.phase === 'combat') {
      const total = this.waves.config.enemyCount;

      const alphaAlive = this.enemies.some(
        (enemy) => enemy.kind === 'alpha'
      );

      this.status.text = alphaAlive
        ? 'RASTEJADOR ALFA NO CAMPO! Proteja o santuario!'
        : `${this.waves.config.name}` +
          ` | Invasores: ${this.waves.spawned}/${total}` +
          ` | Abates totais: ${state.defeatedEnemies}`;
    }
  }

  private showResult(
    game: Game,
    victory: boolean
  ): void {
    this.preview.visible = false;

    const stage = game.app.stage;

    drawRect(
      stage,
      295,
      174,
      440,
      190,
      0x142437
    );

    drawText(
      stage,
      victory
        ? 'NOITE SOBREVIVIDA!'
        : 'SANTUARIO DESTRUIDO!',
      315,
      207,
      25,
      victory ? 0x91e5a0 : 0xff8585
    );

    drawText(
      stage,
      `Inimigos eliminados: ${game.state.defeatedEnemies}`,
      340,
      269,
      19
    );

    drawText(
      stage,
      'Pressione R para reiniciar',
      340,
      315,
      18
    );
  }

  // ==================================
  // GAME LOOP
  // ==================================

  update(game: Game, dt: number): void {
    if (this.waves.phase === 'preparation') {
      // Selecionar torres por números
      TOWERS.forEach((definition, index) => {
        if (
          game.input.wasPressed(
            `Digit${index + 1}`
          )
        ) {
          this.selected = definition.type;
          this.refreshButtons();
          this.updatePreview(game);
        }
      });

      // Cancelar seleção
      if (game.input.wasPressed('Escape')) {
        this.selected = null;
        this.refreshButtons();
        this.updatePreview(game);

        this.status.text = 'Selecao cancelada.';
      }

      // Iniciar a wave
      if (game.input.wasPressed('Enter')) {
        this.startWave(game);
      }

      return;
    }

    if (this.waves.phase === 'combat') {
      this.updateCombat(game, dt);
      return;
    }

    // Reiniciar após a vitória ou derrota
    if (
      (
        this.waves.phase === 'victory' ||
        this.waves.phase === 'defeat'
      ) &&
      game.input.wasPressed('KeyR')
    ) {
      game.restart();
    }
  }
}
