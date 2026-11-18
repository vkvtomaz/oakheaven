import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { TowerState } from '../core/GameState';
import type { Scene } from '../core/Scene';
import { drawText } from '../core/draw';
import {
  ENEMY_STATS,
  getFlankSide,
  getWaveThreeRole,
  type EnemyRole,
  type FlankSide,
} from '../data/enemies';
import { getTowerDefinition } from '../data/towers';
import {
  REPAIR_COST,
  REPAIR_DURATION,
  repairTower,
} from '../systems/repair';
import {
  getRepulsorPush,
  selectTargetsInRange,
} from '../systems/towerCombat';
import type { EnemyKind, WaveSystem } from '../systems/WaveSystem';

const WIDTH = 960;
const HEIGHT = 540;
const HUD_HEIGHT = 92;
const ROAD_TOP = 240;
const ROAD_BOTTOM = 330;
const SANCTUARY = { x: 105, y: 285 };

const PLAYER_SPEED = 4;
const PLAYER_RADIUS = 14;
const ATTACK_RANGE = 66;
const ATTACK_DAMAGE = 4;
const ATTACK_COOLDOWN = 22;
const REPAIR_RANGE = 58;
const INTRO_DURATION = 180;
const FLANK_WARNING_DURATION = 36;
const PLAYER_INVULNERABILITY = 42;

interface Point {
  x: number;
  y: number;
}

interface Enemy {
  kind: EnemyKind;
  role: EnemyRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  baseDamage: number;
  slowTicks: number;
  attackCooldown: number;
  path: Point[];
  pathIndex: number;
  targetTowerId: number | null;
  specialUsed: boolean;
  graphic: Graphics;
  healthBar: Graphics;
}

interface Effect {
  graphic: Graphics;
  life: number;
}

interface PendingSpawn {
  kind: EnemyKind;
  role: EnemyRole;
  side: FlankSide | null;
  delay: number;
}

export class LastStandScene implements Scene {
  private readonly waves: WaveSystem;
  private player!: Graphics;
  private hud!: Text;
  private status!: Text;
  private interaction!: Text;
  private introText!: Text;
  private enemies: Enemy[] = [];
  private pendingSpawns: PendingSpawn[] = [];
  private effects: Effect[] = [];
  private towerGraphics = new Map<number, Graphics>();
  private towerHealthBars = new Map<number, Graphics>();
  private lastDirection: Point = { x: 1, y: 0 };
  private attackCooldown = 0;
  private queuedSequence = 0;
  private flankerSequence = 0;
  private statusTimer = 0;
  private resultShown = false;
  private introRemaining = INTRO_DURATION;
  private playerInvulnerability = 0;
  private repairTargetId: number | null = null;
  private repairProgress = 0;
  private repairLockedUntilRelease = false;

  constructor(waves: WaveSystem) {
    this.waves = waves;
  }

  enter(game: Game): void {
    const stage = game.app.stage;

    stage.addChild(
      new Graphics().rect(0, 0, WIDTH, HEIGHT).fill(0x294638)
    );
    stage.addChild(
      new Graphics()
        .rect(0, HUD_HEIGHT, WIDTH, HEIGHT - HUD_HEIGHT)
        .fill(0x355b45)
        .rect(0, ROAD_TOP, WIDTH, ROAD_BOTTOM - ROAD_TOP)
        .fill(0x897354)
        .rect(0, ROAD_TOP - 5, WIDTH, 5)
        .fill(0x6f5c43)
        .rect(0, ROAD_BOTTOM, WIDTH, 5)
        .fill(0x6f5c43)
    );

    for (const [x, y] of [
      [235, 155], [430, 430], [690, 150], [850, 440],
    ]) {
      stage.addChild(
        new Graphics()
          .circle(x, y, 26)
          .fill(0x234b34)
          .circle(x - 8, y - 5, 14)
          .fill(0x2d5d40)
      );
    }

    stage.addChild(
      new Graphics()
        .moveTo(945, 135)
        .lineTo(918, 150)
        .lineTo(945, 165)
        .closePath()
        .fill({ color: 0x70e4ff, alpha: 0.72 })
        .moveTo(945, 415)
        .lineTo(918, 430)
        .lineTo(945, 445)
        .closePath()
        .fill({ color: 0x70e4ff, alpha: 0.72 })
    );

    stage.addChild(
      new Graphics()
        .circle(SANCTUARY.x, SANCTUARY.y, 46)
        .fill(0x405b82)
        .circle(SANCTUARY.x, SANCTUARY.y, 34)
        .fill(0x7995bb)
        .rect(SANCTUARY.x - 17, SANCTUARY.y - 15, 34, 30)
        .fill(0xc5d4e4)
    );
    drawText(stage, 'SANTUARIO', 60, 338, 13, 0xe7eef6);

    for (const tower of game.state.towers) {
      this.drawTower(game, tower);
    }

    this.player = new Graphics()
      .circle(0, 0, PLAYER_RADIUS)
      .fill(0xc59768)
      .circle(0, -3, 8)
      .fill(0xead0ad)
      .rect(9, -3, 18, 6)
      .fill(0x9da5ad);
    this.player.position.set(185, 385);
    stage.addChild(this.player);

    drawText(
      stage,
      'OAKHEAVEN — A ULTIMA LINHA',
      20,
      14,
      22,
      0xffd38a
    );
    drawText(
      stage,
      'WASD/setas: mover | ESPACO/F: atacar | E: reparar | R: reiniciar apos o fim',
      20,
      44,
      13,
      0xe0e0e0
    );
    this.hud = drawText(stage, '', 20, 67, 14, 0xb3dfb5);
    this.status = drawText(
      stage,
      'Defenda o santuario e intercepte os flanqueadores!',
      505,
      14,
      13,
      0xffe5a5
    );
    this.interaction = drawText(
      stage,
      '',
      505,
      67,
      13,
      0x9fe8ff
    );
    this.introText = drawText(
      stage,
      'A ULTIMA LINHA\nPrepare-se: 3',
      365,
      185,
      28,
      0xffd38a
    );
    this.updateHUD(game);
  }

  private drawTower(game: Game, tower: TowerState): void {
    const definition = getTowerDefinition(tower.type);
    const graphic = new Graphics();

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

    graphic.position.set(tower.x, tower.y);
    graphic.eventMode = 'none';
    game.app.stage.addChild(graphic);

    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    game.app.stage.addChild(healthBar);
    this.towerGraphics.set(tower.id, graphic);
    this.towerHealthBars.set(tower.id, healthBar);
    this.refreshTowerHealth(tower);
  }

  private refreshTowerHealth(tower: TowerState): void {
    const bar = this.towerHealthBars.get(tower.id);
    const graphic = this.towerGraphics.get(tower.id);
    if (!bar || !graphic) return;

    const ratio = Math.max(0, Math.min(1, tower.hp / tower.maxHp));
    bar
      .clear()
      .rect(tower.x - 22, tower.y - 37, 44, 6)
      .fill(0x172029)
      .rect(tower.x - 22, tower.y - 37, 44 * ratio, 6)
      .fill(ratio > 0.5 ? 0x76dc8f : 0xe4a35d);
    graphic.tint = tower.hp > 0 ? 0xffffff : 0x555555;
  }

  private queueEnemy(game: Game, kind: EnemyKind): void {
    const role = getWaveThreeRole(this.queuedSequence, kind);
    const side = role === 'flanker'
      ? getFlankSide(this.flankerSequence++)
      : null;

    this.queuedSequence++;

    if (kind === 'alpha') {
      this.addEffect(
        game,
        new Graphics()
          .circle(925, SANCTUARY.y, 45)
          .stroke({ color: 0xbb3d96, width: 9 }),
        55
      );
      this.setStatus('O Alpha se aproxima pela rota principal!', 100);
    }

    if (role === 'flanker' && side) {
      const y = side === 'upper' ? 150 : 430;
      this.addEffect(
        game,
        new Graphics()
          .circle(925, y, 31)
          .stroke({ color: 0x70e4ff, width: 6 })
          .circle(925, y, 18)
          .stroke({ color: 0xffffff, width: 2 }),
        FLANK_WARNING_DURATION
      );
      this.setStatus(
        side === 'upper'
          ? 'Alerta: flanqueador pelo norte!'
          : 'Alerta: flanqueador pelo sul!',
        FLANK_WARNING_DURATION + 24
      );
    }

    this.pendingSpawns.push({
      kind,
      role,
      side,
      delay: role === 'flanker' ? FLANK_WARNING_DURATION : 0,
    });
  }

  private spawnEnemy(
    game: Game,
    kind: EnemyKind,
    role: EnemyRole,
    side: FlankSide | null
  ): void {
    const values = ENEMY_STATS[kind];
    const upperFlank = side === 'upper';
    const spawnY = role === 'route'
      ? SANCTUARY.y
      : upperFlank ? 150 : 430;
    const path: Point[] = role === 'route'
      ? [
          { x: 780, y: SANCTUARY.y },
          { x: 600, y: SANCTUARY.y },
          { x: 420, y: SANCTUARY.y },
          { x: 170, y: SANCTUARY.y },
        ]
      : [
          { x: 780, y: spawnY },
          { x: 610, y: upperFlank ? 155 : 425 },
        ];

    const graphic = new Graphics()
      .circle(0, 0, values.radius)
      .fill(values.color)
      .circle(-4, -3, 3)
      .fill(0xffffff);
    if (role === 'flanker') {
      graphic
        .moveTo(-7, -values.radius - 5)
        .lineTo(0, -values.radius - 12)
        .lineTo(7, -values.radius - 5)
        .stroke({ color: 0x70e4ff, width: 3 });
    }
    graphic.position.set(975, spawnY);
    graphic.eventMode = 'none';
    game.app.stage.addChild(graphic);

    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    game.app.stage.addChild(healthBar);
    const enemy: Enemy = {
      kind,
      role,
      x: 975,
      y: spawnY,
      hp: values.hp,
      maxHp: values.hp,
      speed: values.speed,
      radius: values.radius,
      baseDamage: values.damage,
      slowTicks: 0,
      attackCooldown: 0,
      path,
      pathIndex: 0,
      targetTowerId: null,
      specialUsed: false,
      graphic,
      healthBar,
    };
    this.enemies.push(enemy);
    this.refreshEnemyHealth(enemy);
  }

  private updatePendingSpawns(game: Game, dt: number): void {
    for (const pending of [...this.pendingSpawns]) {
      pending.delay -= dt;
      if (pending.delay > 0) continue;

      this.spawnEnemy(
        game,
        pending.kind,
        pending.role,
        pending.side
      );
      this.pendingSpawns.splice(
        this.pendingSpawns.indexOf(pending),
        1
      );
    }
  }

  private refreshEnemyHealth(enemy: Enemy): void {
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    const width = Math.max(26, enemy.radius * 2);
    enemy.healthBar
      .clear()
      .rect(
        enemy.x - width / 2,
        enemy.y - enemy.radius - 13,
        width,
        4
      )
      .fill(0x271b22)
      .rect(
        enemy.x - width / 2,
        enemy.y - enemy.radius - 13,
        width * ratio,
        4
      )
      .fill(0xe66d78);
  }

  private removeEnemy(game: Game, enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.enemies.splice(index, 1);
    game.app.stage.removeChild(enemy.graphic);
    game.app.stage.removeChild(enemy.healthBar);
    enemy.graphic.destroy();
    enemy.healthBar.destroy();
  }

  private damageEnemy(game: Game, enemy: Enemy, damage: number): void {
    if (!this.enemies.includes(enemy)) return;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      this.addEffect(
        game,
        new Graphics()
          .circle(enemy.x, enemy.y, 22)
          .stroke({ color: ENEMY_STATS[enemy.kind].color, width: 5 }),
        10
      );
      this.removeEnemy(game, enemy);
      game.state.defeatedEnemies++;
      return;
    }
    this.refreshEnemyHealth(enemy);
  }

  private damageTower(tower: TowerState, damage: number): void {
    tower.hp = Math.max(0, tower.hp - damage);
    this.refreshTowerHealth(tower);
  }

  private moveToward(enemy: Enemy, target: Point, distance: number): number {
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 0) {
      const step = Math.min(distance, magnitude);
      enemy.x += dx / magnitude * step;
      enemy.y += dy / magnitude * step;
    }
    return magnitude;
  }

  private nearestLivingTower(game: Game, enemy: Enemy): TowerState | null {
    return game.state.towers
      .filter((tower) => tower.hp > 0)
      .sort(
        (a, b) =>
          Math.hypot(a.x - enemy.x, a.y - enemy.y) -
          Math.hypot(b.x - enemy.x, b.y - enemy.y)
      )[0] ?? null;
  }

  private damagePlayer(game: Game, enemy: Enemy): void {
    if (this.playerInvulnerability > 0) return;

    game.state.kaelen.hp = Math.max(
      0,
      game.state.kaelen.hp - enemy.baseDamage * 3
    );
    this.playerInvulnerability = PLAYER_INVULNERABILITY;
    this.repairProgress = 0;
    this.repairTargetId = null;
    this.repairLockedUntilRelease = true;

    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    this.player.x += dx / magnitude * 24;
    this.player.y += dy / magnitude * 24;
    enemy.x -= dx / magnitude * 10;
    enemy.y -= dy / magnitude * 10;
    this.setStatus('Kaelen foi atingido! Reparo interrompido.', 60);
  }

  private updateEnemy(game: Game, enemy: Enemy, dt: number): void {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.slowTicks = Math.max(0, enemy.slowTicks - dt);
    const step = enemy.speed * (enemy.slowTicks > 0 ? 0.55 : 1) * dt;
    const playerDistance = Math.hypot(
      this.player.x - enemy.x,
      this.player.y - enemy.y
    );

    if (
      enemy.kind === 'alpha' &&
      !enemy.specialUsed &&
      enemy.x < 700
    ) {
      enemy.specialUsed = true;
      for (const tower of game.state.towers) {
        tower.cooldown += 60;
      }
      this.addEffect(
        game,
        new Graphics()
          .circle(enemy.x, enemy.y, 125)
          .stroke({ color: 0xbb3d96, width: 8 }),
        28
      );
      this.setStatus(
        'O Alpha rugiu: torres temporariamente desestabilizadas!',
        120
      );
    }

    if (playerDistance <= enemy.radius + PLAYER_RADIUS + 4) {
      if (enemy.attackCooldown <= 0) {
        this.damagePlayer(game, enemy);
        enemy.attackCooldown = 45;
      }
      return;
    }

    if (enemy.role === 'route') {
      const barricade = game.state.towers.find(
        (tower) =>
          tower.type === 'spike_barricade' &&
          tower.hp > 0 &&
          Math.hypot(tower.x - enemy.x, tower.y - enemy.y) <=
            enemy.radius + 30
      );
      if (barricade) {
        if (enemy.attackCooldown <= 0) {
          this.damageTower(
            barricade,
            enemy.kind === 'alpha'
              ? 30
              : enemy.kind === 'brute' ? 18 : 12
          );
          this.damageEnemy(game, enemy, 0.7);
          enemy.attackCooldown = 42;
        }
        return;
      }
    }

    if (enemy.pathIndex < enemy.path.length) {
      const distance = this.moveToward(
        enemy,
        enemy.path[enemy.pathIndex],
        step
      );
      if (distance <= Math.max(5, step)) enemy.pathIndex++;
    } else if (enemy.role === 'flanker') {
      let target = game.state.towers.find(
        (tower) =>
          tower.id === enemy.targetTowerId && tower.hp > 0
      ) ?? null;
      if (!target) {
        target = this.nearestLivingTower(game, enemy);
        enemy.targetTowerId = target?.id ?? null;
      }
      if (target) {
        const distance = Math.hypot(
          target.x - enemy.x,
          target.y - enemy.y
        );
        if (distance <= enemy.radius + 25) {
          if (enemy.attackCooldown <= 0) {
            this.damageTower(
              target,
              enemy.kind === 'brute' ? 14 : 9
            );
            enemy.attackCooldown = 48;
          }
        } else {
          this.moveToward(enemy, target, step);
        }
      } else {
        this.moveToward(enemy, SANCTUARY, step);
      }
    } else {
      this.moveToward(enemy, SANCTUARY, step);
    }

    enemy.graphic.position.set(enemy.x, enemy.y);
    this.refreshEnemyHealth(enemy);
    if (
      Math.hypot(
        SANCTUARY.x - enemy.x,
        SANCTUARY.y - enemy.y
      ) <= enemy.radius + 34
    ) {
      this.removeEnemy(game, enemy);
      game.state.sanctuary.hp = enemy.kind === 'alpha'
        ? 0
        : Math.max(
            0,
            game.state.sanctuary.hp - enemy.baseDamage
          );
    }
  }

  private separateEnemies(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const first = this.enemies[i];
        const second = this.enemies[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const minimum = first.radius + second.radius + 3;

        if (distance >= minimum) continue;

        const safeDistance = Math.max(distance, 0.001);
        const normalX = distance === 0 ? 1 : dx / safeDistance;
        const normalY = distance === 0 ? 0 : dy / safeDistance;
        const correction = (minimum - distance) / 2;

        first.x -= normalX * correction;
        first.y -= normalY * correction;
        second.x += normalX * correction;
        second.y += normalY * correction;
      }
    }

    for (const enemy of this.enemies) {
      enemy.graphic.position.set(enemy.x, enemy.y);
      this.refreshEnemyHealth(enemy);
    }
  }

  private attackWithTower(game: Game, tower: TowerState): void {
    if (tower.hp <= 0) return;
    const definition = getTowerDefinition(tower.type);

    if (tower.type === 'spike_barricade') {
      for (const enemy of [...this.enemies]) {
        if (
          Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <=
          enemy.radius + 25
        ) {
          this.damageEnemy(game, enemy, definition.damage * 0.12);
        }
      }
      return;
    }

    const targets = selectTargetsInRange(
      this.enemies,
      tower.x,
      tower.y,
      definition.range,
      SANCTUARY.x,
      SANCTUARY.y
    );
    if (tower.cooldown > 0 || targets.length === 0) return;
    tower.cooldown = definition.fireInterval;

    if (tower.type === 'arc_ballista') {
      const target = targets[0];
      this.showBeam(game, tower, target, 0xf5df82);
      this.damageEnemy(game, target, definition.damage);
    } else if (tower.type === 'slag_forge') {
      for (const target of [...targets]) {
        target.slowTicks = Math.max(target.slowTicks, 65);
        this.damageEnemy(game, target, definition.damage);
      }
      this.addEffect(
        game,
        new Graphics()
          .circle(tower.x, tower.y, definition.range)
          .stroke({ color: 0xbd70ec, width: 4 }),
        12
      );
    } else if (tower.type === 'repulsor') {
      for (const target of targets) {
        const dx = target.x - SANCTUARY.x;
        const dy = target.y - SANCTUARY.y;
        const magnitude = Math.max(1, Math.hypot(dx, dy));
        const push = getRepulsorPush(target.kind);
        target.x = Math.min(WIDTH + 25, target.x + dx / magnitude * push);
        target.y = Math.max(
          HUD_HEIGHT + 10,
          Math.min(HEIGHT - 10, target.y + dy / magnitude * push)
        );
        target.graphic.position.set(target.x, target.y);
        this.refreshEnemyHealth(target);
      }
      this.addEffect(
        game,
        new Graphics()
          .circle(tower.x, tower.y, definition.range)
          .stroke({ color: 0x8ddbe9, width: 4 }),
        12
      );
    } else if (tower.type === 'chitin_cannon') {
      for (const target of targets.slice(0, 3)) {
        this.showBeam(game, tower, target, 0xf3a09c);
        this.damageEnemy(game, target, definition.damage);
      }
    }
  }

  private showBeam(
    game: Game,
    tower: TowerState,
    target: Enemy,
    color: number
  ): void {
    this.addEffect(
      game,
      new Graphics()
        .moveTo(tower.x, tower.y)
        .lineTo(target.x, target.y)
        .stroke({ color, width: 3 }),
      7
    );
  }

  private updatePlayer(game: Game, dt: number): void {
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
      this.lastDirection = { x: dx, y: dy };
    }
    this.player.x += dx * PLAYER_SPEED * dt;
    this.player.y += dy * PLAYER_SPEED * dt;
    this.player.x = Math.max(
      PLAYER_RADIUS,
      Math.min(WIDTH - PLAYER_RADIUS, this.player.x)
    );
    this.player.y = Math.max(
      HUD_HEIGHT + PLAYER_RADIUS,
      Math.min(HEIGHT - PLAYER_RADIUS, this.player.y)
    );
    this.resolvePlayerCollisions(game);

    this.playerInvulnerability = Math.max(
      0,
      this.playerInvulnerability - dt
    );
    this.player.alpha =
      this.playerInvulnerability > 0 &&
      Math.floor(this.playerInvulnerability / 5) % 2 === 0
        ? 0.35
        : 1;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (
      this.attackCooldown <= 0 &&
      (game.input.wasPressed('Space') || game.input.wasPressed('KeyF'))
    ) {
      this.playerAttack(game);
    }

    this.updateRepair(game, dt);
  }

  private resolvePlayerCollisions(game: Game): void {
    this.pushPlayerOutside(
      SANCTUARY.x,
      SANCTUARY.y,
      50 + PLAYER_RADIUS
    );

    for (const tower of game.state.towers) {
      if (tower.hp <= 0) continue;
      this.pushPlayerOutside(
        tower.x,
        tower.y,
        25 + PLAYER_RADIUS
      );
    }

    this.player.x = Math.max(
      PLAYER_RADIUS,
      Math.min(WIDTH - PLAYER_RADIUS, this.player.x)
    );
    this.player.y = Math.max(
      HUD_HEIGHT + PLAYER_RADIUS,
      Math.min(HEIGHT - PLAYER_RADIUS, this.player.y)
    );
  }

  private pushPlayerOutside(x: number, y: number, radius: number): void {
    const dx = this.player.x - x;
    const dy = this.player.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance >= radius) return;

    const safeDistance = Math.max(distance, 0.001);
    const normalX = distance === 0 ? 1 : dx / safeDistance;
    const normalY = distance === 0 ? 0 : dy / safeDistance;
    this.player.x = x + normalX * radius;
    this.player.y = y + normalY * radius;
  }

  private playerAttack(game: Game): void {
    this.attackCooldown = ATTACK_COOLDOWN;
    const impactX = this.player.x + this.lastDirection.x * 38;
    const impactY = this.player.y + this.lastDirection.y * 38;
    this.addEffect(
      game,
      new Graphics()
        .circle(impactX, impactY, 30)
        .stroke({ color: 0xffdf8b, width: 6 }),
      9
    );

    let hits = 0;
    for (const enemy of [...this.enemies]) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const distance = Math.hypot(dx, dy);
      const dot = distance > 0
        ? dx / distance * this.lastDirection.x +
          dy / distance * this.lastDirection.y
        : 1;
      if (distance <= ATTACK_RANGE + enemy.radius && dot >= 0.15) {
        this.damageEnemy(
          game,
          enemy,
          enemy.kind === 'alpha' ? ATTACK_DAMAGE * 0.8 : ATTACK_DAMAGE
        );
        hits++;
      }
    }
    if (hits > 0) {
      this.setStatus(
        hits === 1 ? 'Golpe certeiro!' : `${hits} inimigos atingidos!`,
        40
      );
    }
  }

  private findRepairTarget(game: Game): TowerState | null {
    return game.state.towers
      .filter(
        (tower) =>
          tower.hp > 0 &&
          tower.hp < tower.maxHp &&
          Math.hypot(
            tower.x - this.player.x,
            tower.y - this.player.y
          ) <= REPAIR_RANGE
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.player.x, a.y - this.player.y) -
          Math.hypot(b.x - this.player.x, b.y - this.player.y)
      )[0] ?? null;
  }

  private updateRepair(game: Game, dt: number): void {
    const holdingRepair = game.input.isDown('KeyE');

    if (!holdingRepair) {
      this.repairProgress = 0;
      this.repairTargetId = null;
      this.repairLockedUntilRelease = false;
    }

    const tower = this.findRepairTarget(game);

    if (!tower) {
      this.interaction.text = '';
      this.repairProgress = 0;
      this.repairTargetId = null;
      return;
    }

    const name = getTowerDefinition(tower.type).name;

    if (this.repairLockedUntilRelease) {
      this.interaction.text =
        `Solte E para reparar ${name} novamente`;
      return;
    }

    if (!holdingRepair) {
      this.interaction.text =
        `Segure E: reparar ${name} (${REPAIR_COST} madeira)`;
      return;
    }

    if (game.state.inventory.wood < REPAIR_COST) {
      this.interaction.text = 'Madeira insuficiente para reparo';
      this.repairProgress = 0;
      return;
    }

    if (this.repairTargetId !== tower.id) {
      this.repairTargetId = tower.id;
      this.repairProgress = 0;
    }

    this.repairProgress += dt;
    const percent = Math.min(
      100,
      Math.floor(this.repairProgress / REPAIR_DURATION * 100)
    );
    this.interaction.text = `Reparando ${name}... ${percent}%`;

    if (this.repairProgress < REPAIR_DURATION) return;

    const result = repairTower(game.state.inventory, tower);
    this.repairProgress = 0;
    this.repairTargetId = null;
    this.repairLockedUntilRelease = true;

    if (result === 'repaired') {
      this.refreshTowerHealth(tower);
      this.setStatus(
        `Torre reparada: ${Math.ceil(tower.hp)}/${tower.maxHp} HP`,
        90
      );
    }
  }

  private addEffect(game: Game, graphic: Graphics, life: number): void {
    graphic.eventMode = 'none';
    game.app.stage.addChild(graphic);
    this.effects.push({ graphic, life });
  }

  private updateEffects(game: Game, dt: number): void {
    for (const effect of [...this.effects]) {
      effect.life -= dt;
      if (effect.life <= 0) {
        game.app.stage.removeChild(effect.graphic);
        effect.graphic.destroy();
        this.effects.splice(this.effects.indexOf(effect), 1);
      }
    }
  }

  private setStatus(message: string, duration: number): void {
    this.status.text = message;
    this.statusTimer = duration;
  }

  private updateHUD(game: Game): void {
    const livingTowers = game.state.towers.filter(
      (tower) => tower.hp > 0
    ).length;
    this.hud.text =
      `W${this.waves.currentWave}/3` +
      ` | K:${Math.ceil(game.state.kaelen.hp)}/${game.state.kaelen.maxHp}` +
      ` | S:${game.state.sanctuary.hp}/${game.state.sanctuary.maxHp}` +
      ` | T:${livingTowers}/${game.state.towers.length}` +
      ` | M:${game.state.inventory.wood}` +
      ` | INV:${this.waves.spawned}/${this.waves.config.enemyCount}` +
      ` A:${this.enemies.length + this.pendingSpawns.length}`;
  }

  private showResult(game: Game, victory: boolean): void {
    if (this.resultShown) return;
    this.resultShown = true;
    game.app.stage.addChild(
      new Graphics()
        .roundRect(235, 175, 490, 190, 16)
        .fill({ color: 0x111820, alpha: 0.94 })
        .stroke({ color: victory ? 0x7de39b : 0xe47676, width: 4 })
    );
    drawText(
      game.app.stage,
      victory ? 'OAKHEAVEN RESISTIU!' : 'A ULTIMA LINHA CAIU',
      victory ? 330 : 315,
      220,
      27,
      victory ? 0x8af0a5 : 0xff8b8b
    );
    drawText(
      game.app.stage,
      victory
        ? `Inimigos derrotados: ${game.state.defeatedEnemies}`
        : game.state.kaelen.hp <= 0
          ? 'Kaelen foi derrotado.'
          : 'O santuario foi destruido.',
      350,
      270,
      17,
      0xffffff
    );
    drawText(
      game.app.stage,
      'Pressione R para reiniciar',
      360,
      315,
      16,
      0xffd38a
    );
  }

  private updateCombat(game: Game, dt: number): void {
    for (const kind of this.waves.update(dt)) {
      this.queueEnemy(game, kind);
    }
    this.updatePendingSpawns(game, dt);
    this.updatePlayer(game, dt);
    for (const enemy of [...this.enemies]) {
      if (this.enemies.includes(enemy)) {
        this.updateEnemy(game, enemy, dt);
      }
    }
    this.separateEnemies();
    for (const tower of game.state.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      this.attackWithTower(game, tower);
    }
    this.updateEffects(game, dt);

    if (game.state.sanctuary.hp <= 0 || game.state.kaelen.hp <= 0) {
      this.waves.lose();
      this.showResult(game, false);
    } else if (
      this.waves.isComplete(
        this.enemies.length + this.pendingSpawns.length
      )
    ) {
      this.waves.completeWave();
      this.showResult(game, true);
    }
  }

  private updateIntro(game: Game, dt: number): void {
    this.introRemaining = Math.max(0, this.introRemaining - dt);
    this.updatePlayer(game, dt);
    this.updateEffects(game, dt);

    const seconds = Math.max(1, Math.ceil(this.introRemaining / 60));
    this.introText.text =
      `A ULTIMA LINHA\nPrepare-se: ${seconds}`;

    if (this.introRemaining === 0) {
      this.introText.visible = false;
      this.setStatus('A batalha comecou!', 60);
    }
  }

  update(game: Game, dt: number): void {
    if (this.waves.phase === 'combat') {
      if (this.introRemaining > 0) {
        this.updateIntro(game, dt);
      } else {
        this.updateCombat(game, dt);
      }
    } else if (
      (this.waves.phase === 'victory' || this.waves.phase === 'defeat') &&
      game.input.wasPressed('KeyR')
    ) {
      game.restart();
      return;
    }

    if (this.statusTimer > 0) {
      this.statusTimer -= dt;
    } else if (!this.resultShown) {
      this.status.text =
        'Defenda o santuario e intercepte os flanqueadores!';
    }
    this.updateHUD(game);
  }
}
