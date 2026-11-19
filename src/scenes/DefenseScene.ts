import { CombatFeedback } from '../visual/combatFeedback';

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

import { drawRect } from '../core/draw';
import {
  TOWERS,
  getTowerDefinition,
  canAffordTower,
  spendTowerCost,
  formatTowerCost,
} from '../data/towers';
import {
  canAffordUpgrade,
  formatUpgradeCost,
  getTowerRuntimeStats,
  getTowerUpgrade,
  upgradeTower,
} from '../data/towerUpgrades';

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
import {
  ARENA_HEIGHT as HEIGHT,
  ARENA_WIDTH as WIDTH,
  BUILD_PANEL_WIDTH as MENU_WIDTH,
  MAIN_ROAD_WAYPOINTS,
  ROAD_SPAWN,
  ROAD_WIDTH,
  SANCTUARY,
  distanceToMainRoad,
  isInsideBuildArea,
} from '../data/arena';
import { ARENA_TOWER_HEIGHT, ARENA_TOWER_NAME, arenaActor, arenaSprite, arenaPanel, arenaText as drawText, paintMainArena, mainArenaSanctuary } from '../visual/arenaArt';
import {
  createSceneLayers,
  type SceneLayers,
} from '../visual/layers';
import { THEME } from '../visual/theme';
import { createVoltaicBeam } from '../visual/vfx';


// =====================================
// CONFIGURAÇÕES
// =====================================

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
  pathIndex: number;
  pathOffsetY: number;
  graphic: Graphics;
}

interface Effect {
  graphic: Graphics;
  life: number;
}

export class DefenseScene implements Scene {
  private layers!: SceneLayers;
  private feedback!: CombatFeedback;
  private waves = new WaveSystem();
  private selected: TowerType | null = null;

  private hud!: Text;
  private status!: Text;
  private phaseLabel!: Text;
  private waveButton!: Graphics;
  private preview!: Graphics;

  private pointerX = 0;
  private pointerY = 0;
  private upgradeCandidateId: number | null = null;

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
    this.layers = createSceneLayers(game.app.stage);
    this.feedback = new CombatFeedback(this.layers.vfx);
    const stage = this.layers.entities;

    game.state.wave = 1;

    paintMainArena(this.layers);

    // Santuário
    mainArenaSanctuary(stage);
    drawText(
      this.layers.worldUi,
      'SANTUARIO',
      SANCTUARY.x - 33,
      SANCTUARY.y + 46,
      10,
      THEME.colors.sanctuaryGlow
    );

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
    this.layers.groundDecals.addChild(surface);

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
        this.handleMapClick(
          game,
          position.x,
          position.y,
          event.shiftKey
        );
      }
    );

    // Compact overlay; logical build bounds remain x >= 270, y >= 115.
    arenaPanel(this.layers.hud, 12, 12, 936, 58);
    const title = drawText(this.layers.hud, 'OAKHEAVEN', 27, 18, 22, 0xe5d8ac);
    title.style.fontFamily = 'IM Fell English, Georgia, serif';
    drawText(this.layers.hud, 'O ÚLTIMO JURAMENTO', 29, 47, 9, 0x8d9b8a);
    arenaPanel(this.layers.hud, 12, 94, 208, 358);
    this.phaseLabel = drawText(this.layers.hud, 'PREPARAÇÃO', 28, 109, 11, 0xb2b99a);
    drawText(this.layers.hud, 'Defesas da forja', 28, 127, 17, 0xdfd8bc);
    TOWERS.forEach((tower, index) => this.createButton(game, tower.type, index));
    this.hud = drawText(this.layers.hud, '', 252, 23, 13, 0xe0ddc9);
    this.status = drawText(this.layers.hud,
      `Expedição: ${game.state.expedition.telemetry.nodesCollected}/${game.state.expedition.telemetry.totalNodes} recursos coletados.`,
      252, 46, 11, 0x9ca992);
    this.status.style.wordWrap = true;
    this.status.style.wordWrapWidth = 670;
    // Thin help rail sits below the original build area, never over placement.
    drawText(this.layers.hud, '1–5 selecionar  ·  ESC cancelar  ·  clique reparar  ·  SHIFT + clique aprimorar', 270, 520, 10, 0x9da58c);
    this.waveButton = new Graphics().roundRect(24, 468, 184, 36, 4)
      .fill(0x394431).stroke({ color: 0xb8aa70, width: 1 });
    this.waveButton.eventMode = 'static'; this.waveButton.cursor = 'pointer';
    this.waveButton.on('pointerdown', () => { if(this.waves.phase === 'preparation') this.startWave(game); });
    this.layers.hud.addChild(this.waveButton);
    drawText(this.waveButton, 'INICIAR ONDA  [ENTER]', 43, 479, 12, 0xe6d8a0);

    // Pré-visualização da construção
    this.preview = new Graphics();
    this.preview.eventMode = 'none';
    this.preview.visible = false;

    this.layers.vfx.addChild(this.preview);

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
    const stage = this.layers.hud;
    const definition = getTowerDefinition(type);
    const y = 159 + index * 57;

    const button = new Graphics();

    button.eventMode = 'static';
    button.cursor = 'pointer';

    button.on('pointerdown', () => {
      if (this.waves.phase !== 'preparation') return;

      this.selected =
        this.selected === type ? null : type;
      this.upgradeCandidateId = null;

      this.refreshButtons();
      this.updatePreview(game);

      this.status.text = this.selected
        ? definition.description
        : 'Selecao cancelada.';
    });

    stage.addChild(button);

    const thumbnail = arenaSprite(type, type === 'spike_barricade' ? 25 : 40);
    thumbnail.position.set(51, y + 43);
    stage.addChild(thumbnail);
    drawText(stage, `${index + 1}  ${ARENA_TOWER_NAME[type]}`, 78, y + 8, 11, 0xdad9c3);
    drawText(stage, formatTowerCost(definition), 78, y + 27, 10, 0x95a18e);

    this.buttons.push({
      type,
      graphic: button,
    });
  }

  private refreshButtons(): void {
    this.buttons.forEach((button, index) => {
      const y = 159 + index * 57;
      const active = button.type === this.selected;

      button.graphic
        .clear()
        .roundRect(22, y, 188, 50, 4)
        .fill({color: active ? 0x394837 : 0x16241f, alpha: active ? 1 : .45})
        .stroke({
          color: active ? 0xc5b876 : 0x485342,
          width: 1,
          alpha: active ? .9 : .45,
        });
    });
  }

  // ==================================
  // CLIQUES NO MAPA
  // ==================================

  private handleMapClick(
    game: Game,
    x: number,
    y: number,
    shiftKey: boolean
  ): void {
    if (this.waves.phase !== 'preparation') return;

    if (shiftKey) {
      this.tryUpgrade(game, x, y);
      return;
    }

    this.upgradeCandidateId = null;

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

    if (!isInsideBuildArea(x, y)) {
      return 'Fora da area construivel.';
    }

    if (
      Math.hypot(x - SANCTUARY.x, y - SANCTUARY.y) <
      SANCTUARY.buildClearance
    ) {
      return 'Nao construa sobre o santuario.';
    }

    if (definition.placement === 'road') {
      if (distanceToMainRoad(x, y) > ROAD_WIDTH / 2 - 8) {
        return 'Barricadas precisam ficar na estrada.';
      }
    } else {
      if (distanceToMainRoad(x, y) < ROAD_WIDTH / 2 + 24) {
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

  private tryUpgrade(game: Game, x: number, y: number): void {
    const tower = game.state.towers.find(
      (item) => Math.hypot(item.x - x, item.y - y) < 32
    );

    if (!tower) {
      this.upgradeCandidateId = null;
      this.status.text = 'Use SHIFT+clique sobre uma estrutura.';
      return;
    }

    this.selected = null;
    this.refreshButtons();
    this.updatePreview(game);

    const upgrade = getTowerUpgrade(tower);
    if (!upgrade) {
      this.upgradeCandidateId = null;
      this.status.text = tower.tier >= 2
        ? 'Esta estrutura ja esta no Tier 2.'
        : 'Upgrade Tier 2 ainda indisponivel para esta torre.';
      return;
    }

    const towerName = getTowerDefinition(tower.type).name;
    const cost = formatUpgradeCost(upgrade);

    if (tower.hp < tower.maxHp) {
      this.upgradeCandidateId = null;
      this.status.text =
        `${towerName} precisa estar com HP cheio. Custo T2: ${cost}.`;
      return;
    }

    if (!canAffordUpgrade(game.state.inventory, upgrade)) {
      this.upgradeCandidateId = null;
      this.status.text = `Materiais insuficientes. ${upgrade.name}: ${cost}.`;
      return;
    }

    if (this.upgradeCandidateId !== tower.id) {
      this.upgradeCandidateId = tower.id;
      this.status.text =
        `${towerName} -> ${upgrade.name} | Custo ${cost}. ` +
        'SHIFT+clique novamente para confirmar.';
      return;
    }

    const result = upgradeTower(game.state.inventory, tower);
    this.upgradeCandidateId = null;

    if (result !== 'upgraded') {
      this.status.text = 'O upgrade nao pode mais ser aplicado.';
      return;
    }

    const graphic = this.towerGraphics.get(tower.id);
    if (graphic) this.drawTierMark(graphic, tower);
    this.refreshTowerHealth(tower);
    this.refreshHUD(game);
    this.status.text = `${towerName} aprimorada para Tier 2!`;
  }

  // ==================================
  // DESENHO DAS TORRES
  // ==================================

  private drawTower(
    _game: Game,
    tower: TowerState
  ): void {
    const stage = this.layers.entities;
    const graphic = arenaActor(tower.type);
    graphic.position.set(tower.x, tower.y);
    graphic.zIndex = tower.y;
    graphic.eventMode = 'none';

    this.drawTierMark(graphic, tower);

    if (tower.hp <= 0) {
      graphic.tint = 0x555555;
    }

    stage.addChild(graphic);
    this.towerGraphics.set(tower.id, graphic);

    const bar = new Graphics();
    bar.eventMode = 'none';

    this.layers.worldUi.addChild(bar);
    this.healthBars.set(tower.id, bar);

    this.refreshTowerHealth(tower);
  }

  private drawTierMark(graphic: Graphics, tower: TowerState): void {
    if (tower.tier < 2) return;

    if (tower.type === 'spike_barricade') {
      graphic
        .roundRect(-27, -19, 54, 38, 6)
        .stroke({ color: 0xffd36f, width: 3 });
    } else {
      graphic
        .circle(0, 0, 26)
        .stroke({ color: 0xffd36f, width: 3 });
    }

    graphic
      .rect(-6, 9, 4, 9)
      .rect(2, 9, 4, 9)
      .fill(0xffe6a3);
  }

  private refreshTowerHealth(tower: TowerState): void {
    const bar = this.healthBars.get(tower.id);

    if (!bar) return;

    const ratio = Math.max(
      0,
      Math.min(1, tower.hp / tower.maxHp)
    );

    bar.visible = ratio < 1;
    bar
      .clear()
      .rect(tower.x - 22, tower.y - ARENA_TOWER_HEIGHT[tower.type] - 4, 44, 6)
      .fill(0x172029)
      .rect(
        tower.x - 22,
        tower.y - ARENA_TOWER_HEIGHT[tower.type] - 4,
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

    const graphic = this.towerGraphics.get(tower.id);
    if (graphic) this.feedback.hurt(graphic, 0xf1ac84);
    this.refreshTowerHealth(tower);
  }

  // ==================================
  // CRIAÇÃO DOS INIMIGOS
  // ==================================

  private spawnEnemy(
    _game: Game,
    kind: EnemyKind
  ): void {


    const values = ENEMY_STATS[kind];

    const pathOffsetY =
      kind === 'alpha'
        ? 0
        : ((this.waves.spawned % 3) - 1) * 15;
    const y = ROAD_SPAWN.y + pathOffsetY;

    const graphic = arenaActor(kind, kind === 'alpha' ? 94 : kind === 'brute' ? 52 : 37);

    graphic.position.set(ROAD_SPAWN.x, y);
    graphic.zIndex = y;
    graphic.eventMode = 'none';

    this.layers.entities.addChild(graphic);

    this.enemies.push({
      kind,
      x: ROAD_SPAWN.x,
      y,
      hp: values.hp,
      speed: values.speed,
      radius: values.radius,
      baseDamage: values.damage,
      slowTicks: 0,
      attackCooldown: 0,
      pathIndex: 0,
      pathOffsetY,
      graphic,
    });
  }

  private removeEnemy(
    _game: Game,
    enemy: Enemy
  ): void {
    const index = this.enemies.indexOf(enemy);

    if (index < 0) return;

    this.enemies.splice(index, 1);

    enemy.graphic.removeFromParent();
    enemy.graphic.destroy({ children: true, context: true });
  }

  private damageEnemy(
    game: Game,
    enemy: Enemy,
    damage: number
  ): void {
    if (!this.enemies.includes(enemy)) return;

    enemy.hp -= damage;
    this.feedback.hurt(enemy.graphic);

    if (enemy.hp <= 0) {
      this.feedback.death(enemy.graphic, ENEMY_STATS[enemy.kind].color);
      this.removeEnemy(game, enemy);
      game.state.defeatedEnemies++;
    }
  }

  // ==================================
  // EFEITOS VISUAIS
  // ==================================

  private addEffect(
    _game: Game,
    graphic: Graphics
  ): void {
    graphic.eventMode = 'none';

    this.layers.vfx.addChild(graphic);

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
      createVoltaicBeam(x1, y1, x2, y2, color)
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

    const stats = getTowerRuntimeStats(tower);

    const targets = selectTargetsInRange(
      this.enemies,
      tower.x,
      tower.y,
      stats.range,
      SANCTUARY.x,
      SANCTUARY.y
    );

    if (targets.length === 0) return;

    tower.cooldown = stats.fireInterval;
    const towerGraphic = this.towerGraphics.get(tower.id);
    if (towerGraphic) this.feedback.tower(tower.type, towerGraphic, targets[0]!.x, targets[0]!.y);

    switch (tower.type) {
      case 'arc_ballista': {
        game.audio.play('ballista');
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
          stats.damage
        );

        const chainedTargets = targets
          .slice(1)
          .filter(
            (candidate) =>
              Math.hypot(candidate.x - target.x, candidate.y - target.y) <=
              stats.chainRange
          )
          .slice(0, stats.chainTargets);

        for (const chained of chainedTargets) {
          this.showBeam(
            game,
            target.x,
            target.y,
            chained.x,
            chained.y,
            0x90e0ef
          );
          this.damageEnemy(
            game,
            chained,
            stats.damage * stats.chainDamageMultiplier
          );
        }

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
            stats.damage
          );
        }

        this.addEffect(
          game,
          new Graphics()
            .circle(
              tower.x,
              tower.y,
              stats.range
            )
            .fill({ color: THEME.colors.ether, alpha: 0.1 })
            .stroke({
              color: 0xbd70ec,
              width: 5,
            })
            .circle(tower.x, tower.y, stats.range * 0.62)
            .stroke({ color: THEME.colors.etherGlow, width: 2 })
        );

        break;
      }

      case 'repulsor': {
        game.audio.play('repulsor');
        for (const target of targets) {

          // Cada classe resiste de forma diferente
          const pushDistance = getRepulsorPush(target.kind);

          target.x = Math.min(
            ROAD_SPAWN.x,
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
              stats.range
            )
            .stroke({
              color: 0x8ddbe9,
              width: 4,
            })
            .circle(tower.x, tower.y, stats.range * 0.72)
            .stroke({ color: THEME.colors.etherGlow, width: 2 })
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
            stats.damage
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
      const previousX = enemy.x;
      const previousY = enemy.y;
      enemy.attackCooldown -= dt;

      const multiplier =
        enemy.slowTicks > 0 ? 0.55 : 1;

      enemy.slowTicks = Math.max(
        0,
        enemy.slowTicks - dt
      );

      const step = enemy.speed * multiplier * dt;

      // Barricadas bloqueiam o trajeto curvo pelo contato real.
      const barricade = game.state.towers.find(
        (tower) =>
          tower.type === 'spike_barricade' &&
          tower.hp > 0 &&
          Math.hypot(tower.x - enemy.x, tower.y - enemy.y) <=
            enemy.radius + 30
      );

      if (barricade) {
        if (enemy.attackCooldown <= 0) {
          const damage =
            enemy.kind === 'alpha'
              ? 30
              : enemy.kind === 'brute'
                ? 18
                : 12;

          this.feedback.attack(enemy.graphic, barricade.x, barricade.y);
          const barricadeGraphic = this.towerGraphics.get(barricade.id);
          if (barricadeGraphic) this.feedback.tower(barricade.type, barricadeGraphic, enemy.x, enemy.y);
          this.damageTower(barricade, damage);
          this.damageEnemy(
            game,
            enemy,
            getTowerRuntimeStats(barricade).damage
          );

          enemy.attackCooldown = 42;
        }
      } else {
        const target = MAIN_ROAD_WAYPOINTS[enemy.pathIndex];

        if (target) {
          const targetY = target.y + enemy.pathOffsetY;
          const dx = target.x - enemy.x;
          const dy = targetY - enemy.y;
          const distance = Math.hypot(dx, dy);

          if (distance <= Math.max(5, step)) {
            enemy.x = target.x;
            enemy.y = targetY;
            enemy.pathIndex++;
          } else if (distance > 0) {
            enemy.x += dx / distance * step;
            enemy.y += dy / distance * step;
          }
        }
      }

      if (!this.enemies.includes(enemy)) {
        continue;
      }

      enemy.graphic.position.set(enemy.x, enemy.y);
      enemy.graphic.zIndex = enemy.y;
      this.feedback.travel(enemy.graphic, previousX, previousY);

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
          this.feedback.attack(enemy.graphic, nearbyTower.x, nearbyTower.y);
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
      if (
        Math.hypot(
          SANCTUARY.x - enemy.x,
          SANCTUARY.y - enemy.y
        ) <= enemy.radius + SANCTUARY.radius - 4
      ) {
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
  // WAVE 3 — TRANSIÇÃO PARA A ARENA TOP-DOWN
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
  this.upgradeCandidateId = null;

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
        effect.graphic.removeFromParent();
        effect.graphic.destroy({ children: true, context: true });

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
      `MADEIRA ${state.inventory.wood}    FERRO ${state.inventory.iron}    ÉTER ${state.inventory.ether}    QUITINA ${state.inventory.chitin}       SANTUÁRIO ${state.sanctuary.hp}/${state.sanctuary.maxHp}`;
    this.phaseLabel.text = `NOITE ${state.night}  /  ONDA ${this.waves.currentWave} DE 3`;
    this.waveButton.alpha = this.waves.phase === 'preparation' ? 1 : .4;
    this.waveButton.eventMode = this.waves.phase === 'preparation' ? 'static' : 'none';

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

    const stage = this.layers.hud;

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
    this.feedback.update(dt);
    if (this.waves.phase === 'preparation') {
      // Selecionar torres por números
      TOWERS.forEach((definition, index) => {
        if (
          game.input.wasPressed(
            `Digit${index + 1}`
          )
        ) {
          this.selected = definition.type;
          this.upgradeCandidateId = null;
          this.refreshButtons();
          this.updatePreview(game);
        }
      });

      // Cancelar seleção
      if (game.input.wasPressed('Escape')) {
        this.selected = null;
        this.upgradeCandidateId = null;
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
