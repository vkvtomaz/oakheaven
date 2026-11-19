import { CombatFeedback } from '../visual/combatFeedback';
import { Graphics, type Text } from 'pixi.js';

import type { Game } from '../core/Game';
import type { TowerState } from '../core/GameState';
import type { Scene } from '../core/Scene';
import { drawText } from '../core/draw';
import {
  ENEMY_STATS,
  getFlankSide,
  getLastStandHpMultiplier,
  getTowerDamageMultiplier,
  getWaveThreeRole,
  type EnemyRole,
  type FlankSide,
} from '../data/enemies';
import { getTowerDefinition } from '../data/towers';
import { getTowerRuntimeStats } from '../data/towerUpgrades';
import {
  REPAIR_COST,
  REPAIR_DURATION,
  repairTower,
} from '../systems/repair';
import {
  getRepulsorPush,
  selectTargetsInRange,
} from '../systems/towerCombat';
import {
  BASIC_ATTACK_COOLDOWN,
  BASIC_ATTACK_DAMAGE,
  BASIC_ATTACK_HITSTOP,
  BASIC_ATTACK_KNOCKBACK,
  BASIC_ATTACK_RANGE,
  GROUND_BREAK_COOLDOWN,
  GROUND_BREAK_DAMAGE,
  GROUND_BREAK_HITSTOP,
  GROUND_BREAK_KNOCKBACK,
  GROUND_BREAK_RADIUS,
  getChargeRatio,
  isInsideCleave,
  isInsideGroundBreak,
  resolveHammerRelease,
} from '../systems/kaelenCombat';
import {
  ALPHA_FINAL_SPEED_MULTIPLIER,
  ALPHA_ROAR_RADIUS,
  ALPHA_STANCE_FLANKERS,
  ALPHA_SUPPRESSION_TICKS,
  breakObsidianStance,
  createAlphaBossState,
  getAlphaDamageMultiplier,
  isInsideAlphaRoar,
  updateAlphaStun,
  updateAlphaThresholds,
  type AlphaBossState,
  type AlphaDamageSource,
} from '../systems/alphaBoss';
import { VISUAL_ASSETS } from '../visual/assets';
import { createActor, paintArena } from '../visual/art';
import { animateKaelenActor } from '../visual/kaelenArt';
import type { KaelenAnimation } from '../visual/kaelenAnimation';
import {
  createSceneLayers,
  type SceneLayers,
} from '../visual/layers';
import { drawSanctuary } from '../visual/sanctuary';
import { THEME } from '../visual/theme';
import { addFramedImage, drawHudPanel } from '../visual/ui';
import { createVoltaicBeam } from '../visual/vfx';
import type { EnemyKind, WaveSystem } from '../systems/WaveSystem';
import {
  ARENA_HEIGHT as HEIGHT,
  ARENA_WIDTH as WIDTH,
  FLANK_ROUTES,
  HUD_HEIGHT,
  KAELEN_START,
  MAIN_ROAD_WAYPOINTS,
  ROAD_SPAWN,
  SANCTUARY,
  type ArenaPoint as Point,
} from '../data/arena';

const PLAYER_SPEED = 4;
const PLAYER_RADIUS = 14;
const REPAIR_RANGE = 58;
const INTRO_DURATION = 180;
const FLANK_WARNING_DURATION = 36;
const PLAYER_INVULNERABILITY = 42;

type DamageSource = AlphaDamageSource;

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
  alphaState: AlphaBossState | null;
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
  private layers!: SceneLayers;
  private feedback!: CombatFeedback;
  private readonly waves: WaveSystem;
  private player!: Graphics;
  private playerAnimation!: KaelenAnimation;
  private playerMoved = false;
  private chargeIndicator!: Graphics;
  private hud!: Text;
  private status!: Text;
  private interaction!: Text;
  private introText!: Text;
  private enemies: Enemy[] = [];
  private pendingSpawns: PendingSpawn[] = [];
  private effects: Effect[] = [];
  private towerGraphics = new Map<number, Graphics>();
  private towerHealthBars = new Map<number, Graphics>();
  private towerSuppression = new Map<number, number>();
  private lastDirection: Point = { x: 1, y: 0 };
  private attackCooldown = 0;
  private groundBreakCooldown = 0;
  private attackCharge = 0;
  private attackCharging = false;
  private hitstopRemaining = 0;
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
    this.layers = createSceneLayers(game.app.stage);
    this.feedback = new CombatFeedback(this.layers.vfx);
    const stage = this.layers.entities;

    paintArena(this.layers);

    this.layers.worldUi.addChild(
      new Graphics()
        .moveTo(945, FLANK_ROUTES.upper.warning.y - 15)
        .lineTo(918, FLANK_ROUTES.upper.warning.y)
        .lineTo(945, FLANK_ROUTES.upper.warning.y + 15)
        .closePath()
        .fill({ color: 0x70e4ff, alpha: 0.72 })
        .moveTo(945, FLANK_ROUTES.lower.warning.y - 15)
        .lineTo(918, FLANK_ROUTES.lower.warning.y)
        .lineTo(945, FLANK_ROUTES.lower.warning.y + 15)
        .closePath()
        .fill({ color: 0x70e4ff, alpha: 0.72 })
    );

    drawSanctuary(stage, SANCTUARY.x, SANCTUARY.y, 0.92);
    drawText(
      this.layers.worldUi,
      'SANTUARIO',
      SANCTUARY.x - 45,
      SANCTUARY.y + 53,
      13,
      THEME.colors.sanctuaryGlow
    );

    for (const tower of game.state.towers) {
      this.drawTower(game, tower);
    }

    this.player = createActor('hero', 58);
    this.playerAnimation = animateKaelenActor(this.player);
    this.player.position.set(KAELEN_START.x, KAELEN_START.y);
    this.player.zIndex = this.player.y;
    stage.addChild(this.player);

    this.chargeIndicator = new Graphics();
    this.chargeIndicator.eventMode = 'none';
    this.chargeIndicator.visible = false;
    this.layers.vfx.addChild(this.chargeIndicator);

    drawHudPanel(this.layers.hud, 5, 5, WIDTH - 10, HUD_HEIGHT - 10, 0.94);
    addFramedImage(
      this.layers.hud,
      VISUAL_ASSETS.kaelen,
      12,
      13,
      52,
      52,
      true
    );

    drawText(
      this.layers.hud,
      'OAKHEAVEN — A ULTIMA LINHA',
      76,
      12,
      20,
      THEME.colors.sanctuaryGlow
    );
    drawText(
      this.layers.hud,
      'WASD/setas: mover | toque ESPACO/F: golpe | segure: Quebra-Terra | E: reparar',
      76,
      44,
      13,
      0xe0e0e0
    );
    this.hud = drawText(this.layers.hud, '', 76, 65, 13, 0xb3dfb5);
    this.status = drawText(
      this.layers.hud,
      'Defenda o santuario e intercepte os flanqueadores!',
      505,
      14,
      13,
      0xffe5a5
    );
    this.interaction = drawText(
      this.layers.hud,
      '',
      505,
      67,
      13,
      0x9fe8ff
    );
    this.introText = drawText(
      this.layers.hud,
      'A ULTIMA LINHA\nPrepare-se: 3',
      365,
      185,
      28,
      0xffd38a
    );
    this.updateHUD(game);
  }

  private drawTower(_game: Game, tower: TowerState): void {
    const graphic = createActor(tower.type, tower.type === 'spike_barricade' ? 48 : 76);

    if (tower.tier >= 2) {
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

    graphic.position.set(tower.x, tower.y);
    graphic.zIndex = tower.y;
    graphic.eventMode = 'none';
    this.layers.entities.addChild(graphic);

    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    this.layers.worldUi.addChild(healthBar);
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
      .rect(tower.x - 22, tower.y - (tower.type === 'spike_barricade' ? 56 : 84), 44, 6)
      .fill(0x172029)
      .rect(tower.x - 22, tower.y - (tower.type === 'spike_barricade' ? 56 : 84), 44 * ratio, 6)
      .fill(ratio > 0.5 ? 0x76dc8f : 0xe4a35d);
    const suppressed = (this.towerSuppression.get(tower.id) ?? 0) > 0;
    graphic.tint = tower.hp <= 0
      ? 0x555555
      : suppressed ? 0x9b69c7 : 0xffffff;
    graphic.alpha = tower.hp > 0 && suppressed ? 0.55 : 1;
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
          .circle(ROAD_SPAWN.x - 50, ROAD_SPAWN.y, 45)
          .stroke({ color: 0xbb3d96, width: 9 }),
        55
      );
      this.setStatus('O Alpha se aproxima pela rota principal!', 100);
    }

    if (role === 'flanker' && side) {
      game.audio.play('flankAlert');
      const warning = FLANK_ROUTES[side].warning;
      this.addEffect(
        game,
        new Graphics()
          .circle(warning.x, warning.y, 31)
          .stroke({ color: 0x70e4ff, width: 6 })
          .circle(warning.x, warning.y, 18)
          .stroke({ color: 0xffffff, width: 2 }),
        FLANK_WARNING_DURATION
      );
      this.setStatus(
        side === 'upper'
          ? 'Flanqueador ao norte: Kaelen causa dano total!'
          : 'Flanqueador ao sul: Kaelen causa dano total!',
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
    _game: Game,
    kind: EnemyKind,
    role: EnemyRole,
    side: FlankSide | null
  ): void {
    const values = ENEMY_STATS[kind];
    const hpMultiplier = getLastStandHpMultiplier(kind, role);
    const maxHp = Math.ceil(values.hp * hpMultiplier);
    const flankRoute = side ? FLANK_ROUTES[side] : null;
    const spawn = role === 'route'
      ? ROAD_SPAWN
      : flankRoute?.spawn ?? ROAD_SPAWN;
    const path: Point[] = role === 'route'
      ? MAIN_ROAD_WAYPOINTS.map((point) => ({ ...point }))
      : (flankRoute?.waypoints ?? []).map((point) => ({ ...point }));

    const artHeight = kind === 'alpha' ? 94 : kind === 'brute' ? 58 : 44;
    const graphic = createActor(kind, artHeight);
    if (role === 'flanker') {
      graphic
        .moveTo(-7, -artHeight - 5)
        .lineTo(0, -artHeight - 12)
        .lineTo(7, -artHeight - 5)
        .stroke({ color: 0x70e4ff, width: 3 });
    }
    graphic.position.set(spawn.x, spawn.y);
    graphic.zIndex = spawn.y;
    graphic.eventMode = 'none';
    this.layers.entities.addChild(graphic);

    const healthBar = new Graphics();
    healthBar.eventMode = 'none';
    this.layers.worldUi.addChild(healthBar);
    const enemy: Enemy = {
      kind,
      role,
      x: spawn.x,
      y: spawn.y,
      hp: maxHp,
      maxHp,
      speed: values.speed * (role === 'flanker' ? 1.12 : 1),
      radius: values.radius,
      baseDamage:
        values.damage * (role === 'flanker' ? 1.25 : 1),
      slowTicks: 0,
      attackCooldown: 0,
      path,
      pathIndex: 0,
      targetTowerId: null,
      alphaState: kind === 'alpha' ? createAlphaBossState() : null,
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
        enemy.y - (enemy.kind === 'alpha' ? 102 : enemy.kind === 'brute' ? 66 : 52),
        width,
        4
      )
      .fill(0x271b22)
      .rect(
        enemy.x - width / 2,
        enemy.y - (enemy.kind === 'alpha' ? 102 : enemy.kind === 'brute' ? 66 : 52),
        width * ratio,
        4
      )
      .fill(0xe66d78);
  }

  private removeEnemy(_game: Game, enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.enemies.splice(index, 1);
    enemy.graphic.removeFromParent();
    enemy.healthBar.removeFromParent();
    enemy.graphic.destroy({ children: true, context: true });
    enemy.healthBar.destroy();
  }

  private damageEnemy(
    game: Game,
    enemy: Enemy,
    damage: number,
    source: DamageSource = 'tower'
  ): void {
    if (!this.enemies.includes(enemy)) return;
    let effectiveDamage = source === 'tower'
      ? damage * getTowerDamageMultiplier(enemy.role)
      : damage;

    if (enemy.alphaState) {
      const stanceWasActive = enemy.alphaState.stanceActive;
      effectiveDamage *= getAlphaDamageMultiplier(
        enemy.alphaState,
        source
      );

      if (
        stanceWasActive &&
        source === 'ground_break' &&
        breakObsidianStance(enemy.alphaState)
      ) {
        this.refreshAlphaAppearance(enemy);
        this.addEffect(
          game,
          new Graphics()
            .circle(enemy.x, enemy.y, 68)
            .stroke({ color: 0xf8df9a, width: 10 })
            .circle(enemy.x, enemy.y, 42)
            .stroke({ color: 0xffffff, width: 4 }),
          24
        );
        this.setStatus(
          'POSTURA DE OBSIDIANA QUEBRADA! Alpha atordoado!',
          150
        );
      }
    }

    enemy.hp -= effectiveDamage;
    this.feedback.hurt(enemy.graphic);
    if (enemy.hp <= 0) {
      this.feedback.death(enemy.graphic, ENEMY_STATS[enemy.kind].color);
      this.removeEnemy(game, enemy);
      game.state.defeatedEnemies++;
      return;
    }


    if (enemy.alphaState) {
      this.handleAlphaThresholds(game, enemy);
    }
    this.refreshEnemyHealth(enemy);
  }

  private handleAlphaThresholds(game: Game, enemy: Enemy): void {
    const alphaState = enemy.alphaState;
    if (!alphaState) return;

    for (const event of updateAlphaThresholds(
      alphaState,
      enemy.hp,
      enemy.maxHp
    )) {
      if (event === 'roar') {
        this.triggerAlphaRoar(game, enemy);
      } else {
        this.triggerObsidianStance(game, enemy);
      }
    }
    this.refreshAlphaAppearance(enemy);
  }

  private triggerAlphaRoar(game: Game, enemy: Enemy): void {
    game.audio.play('alphaRoar');
    let suppressed = 0;

    for (const tower of game.state.towers) {
      if (
        tower.hp <= 0 ||
        tower.type === 'spike_barricade' ||
        !isInsideAlphaRoar(
          enemy.x,
          enemy.y,
          tower.x,
          tower.y
        )
      ) continue;

      this.towerSuppression.set(tower.id, ALPHA_SUPPRESSION_TICKS);
      this.refreshTowerHealth(tower);
      suppressed++;
      this.addEffect(
        game,
        new Graphics()
          .circle(tower.x, tower.y, 31)
          .stroke({ color: 0xbb68df, width: 5 }),
        45
      );
    }

    this.addEffect(
      game,
      new Graphics()
        .circle(enemy.x, enemy.y, ALPHA_ROAR_RADIUS)
        .stroke({ color: 0xbb3d96, width: 9, alpha: 0.85 }),
      45
    );
    this.setStatus(
      `RUGIDO SUPRESSOR! ${suppressed} torre${suppressed === 1 ? '' : 's'} silenciada${suppressed === 1 ? '' : 's'} por 5s.`,
      150
    );
  }

  private triggerObsidianStance(game: Game, enemy: Enemy): void {
    const sides: FlankSide[] = ['upper', 'lower'];

    for (let index = 0; index < ALPHA_STANCE_FLANKERS; index++) {
      const side = sides[index % sides.length];
      const warning = FLANK_ROUTES[side].warning;
      this.pendingSpawns.push({
        kind: 'scout',
        role: 'flanker',
        side,
        delay: 18 + index * 24,
      });
      this.addEffect(
        game,
        new Graphics()
          .circle(warning.x, warning.y, 35)
          .stroke({ color: 0x70e4ff, width: 7 })
          .circle(warning.x, warning.y, 20)
          .stroke({ color: 0xffffff, width: 3 }),
        55
      );
    }

    this.addEffect(
      game,
      new Graphics()
        .circle(enemy.x, enemy.y, 58)
        .fill({ color: 0x252636, alpha: 0.28 })
        .stroke({ color: 0x8f92b8, width: 9 }),
      80
    );
    this.setStatus(
      'POSTURA DE OBSIDIANA! Use o Quebra-Terra para rompe-la!',
      180
    );
  }

  private refreshAlphaAppearance(enemy: Enemy): void {
    const state = enemy.alphaState;
    if (!state) return;

    if (state.stanceActive) {
      enemy.graphic.tint = 0x65677d;
      enemy.graphic.alpha = 1;
    } else if (state.stunnedTicks > 0) {
      enemy.graphic.tint = 0xd7e6ef;
      enemy.graphic.alpha = 0.55;
    } else if (state.finalPhase) {
      enemy.graphic.tint = 0xff7878;
      enemy.graphic.alpha = 1;
    } else {
      enemy.graphic.tint = 0xffffff;
      enemy.graphic.alpha = 1;
    }
  }

  private damageTower(tower: TowerState, damage: number): void {
    tower.hp = Math.max(0, tower.hp - damage);
    const graphic = this.towerGraphics.get(tower.id);
    if (graphic) this.feedback.hurt(graphic, 0xf1ac84);
    this.refreshTowerHealth(tower);
  }

  private moveToward(enemy: Enemy, target: Point, distance: number): number {
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const magnitude = Math.hypot(dx, dy);
    const previousX = enemy.x;
    const previousY = enemy.y;
    if (magnitude > 0) {
      const step = Math.min(distance, magnitude);
      enemy.x += dx / magnitude * step;
      enemy.y += dy / magnitude * step;
    }
    // Use logical displacement even before the scene synchronizes the sprite.
    if (Math.hypot(enemy.x - previousX, enemy.y - previousY) > 0.1) {
      this.feedback.travel(enemy.graphic, enemy.x, enemy.y);
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
    this.feedback.attack(enemy.graphic, this.player.x, this.player.y);
    this.playerInvulnerability = PLAYER_INVULNERABILITY;
    this.playerAnimation.hurt(this.player.x - enemy.x, this.player.y - enemy.y);
    this.repairProgress = 0;
    this.repairTargetId = null;
    this.repairLockedUntilRelease = true;
    this.attackCharge = 0;
    this.attackCharging = false;
    this.chargeIndicator.visible = false;

    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    this.player.x += dx / magnitude * 24;
    this.player.y += dy / magnitude * 24;
    enemy.x -= dx / magnitude * 10;
    enemy.y -= dy / magnitude * 10;
    // Knockback obeys the same boundaries/obstacles immediately, including a fatal hit.
    this.resolvePlayerCollisions(game);
    this.player.zIndex = this.player.y;
    this.setStatus('Kaelen foi atingido! Reparo interrompido.', 60);
  }

  private updateEnemy(game: Game, enemy: Enemy, dt: number): void {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.slowTicks = Math.max(0, enemy.slowTicks - dt);

    if (enemy.alphaState?.stunnedTicks) {
      const finalPhaseStarted = updateAlphaStun(enemy.alphaState, dt);
      this.refreshAlphaAppearance(enemy);

      if (finalPhaseStarted) {
        this.setStatus(
          'FASE FINAL! O Alpha investe contra o Santuario!',
          150
        );
      } else {
        enemy.graphic.position.set(enemy.x, enemy.y);
        enemy.graphic.zIndex = enemy.y;
        this.refreshEnemyHealth(enemy);
        return;
      }
    }

    const phaseSpeed = enemy.alphaState?.finalPhase
      ? ALPHA_FINAL_SPEED_MULTIPLIER
      : 1;
    const step =
      enemy.speed *
      phaseSpeed *
      (enemy.slowTicks > 0 ? 0.55 : 1) *
      dt;
    const playerDistance = Math.hypot(
      this.player.x - enemy.x,
      this.player.y - enemy.y
    );

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
          this.feedback.attack(enemy.graphic, barricade.x, barricade.y);
          this.damageTower(
            barricade,
            enemy.kind === 'alpha'
              ? 30
              : enemy.kind === 'brute' ? 18 : 12
          );
          this.damageEnemy(
            game,
            enemy,
            getTowerRuntimeStats(barricade).damage
          );
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
            this.feedback.attack(enemy.graphic, target.x, target.y);
            this.damageTower(
              target,
              enemy.kind === 'brute' ? 18 : 12
            );
            enemy.attackCooldown = 42;
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

    enemy.graphic.zIndex = enemy.y;
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
      enemy.graphic.zIndex = enemy.y;
      this.refreshEnemyHealth(enemy);
    }
  }

  private attackWithTower(game: Game, tower: TowerState): void {
    if (tower.hp <= 0) return;
    const stats = getTowerRuntimeStats(tower);

    if (tower.type === 'spike_barricade') {
      for (const enemy of [...this.enemies]) {
        if (
          Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <=
          enemy.radius + 25
        ) {
          const graphic = this.towerGraphics.get(tower.id);
          if (graphic) this.feedback.tower(tower.type, graphic, enemy.x, enemy.y);
          this.damageEnemy(game, enemy, stats.damage * 0.12);
        }
      }
      return;
    }

    if ((this.towerSuppression.get(tower.id) ?? 0) > 0) return;

    const targets = selectTargetsInRange(
      this.enemies,
      tower.x,
      tower.y,
      stats.range,
      SANCTUARY.x,
      SANCTUARY.y
    );
    if (tower.cooldown > 0 || targets.length === 0) return;
    tower.cooldown = stats.fireInterval;
    const towerGraphic = this.towerGraphics.get(tower.id);
    if (towerGraphic) this.feedback.tower(tower.type, towerGraphic, targets[0]!.x, targets[0]!.y);

    if (tower.type === 'arc_ballista') {
      game.audio.play('ballista');
      const target = targets[0];
      this.showBeam(game, tower, target, 0xf5df82);
      this.damageEnemy(game, target, stats.damage);
      const chainedTargets = targets
        .slice(1)
        .filter(
          (candidate) =>
            Math.hypot(candidate.x - target.x, candidate.y - target.y) <=
            stats.chainRange
        )
        .slice(0, stats.chainTargets);
      for (const chained of chainedTargets) {
        this.showBeam(game, tower, chained, 0x90e0ef);
        this.damageEnemy(
          game,
          chained,
          stats.damage * stats.chainDamageMultiplier
        );
      }
    } else if (tower.type === 'slag_forge') {
      for (const target of [...targets]) {
        target.slowTicks = Math.max(target.slowTicks, 65);
        this.damageEnemy(game, target, stats.damage);
      }
      this.addEffect(
        game,
        new Graphics()
          .circle(tower.x, tower.y, stats.range)
          .fill({ color: THEME.colors.ether, alpha: 0.1 })
          .stroke({ color: 0xbd70ec, width: 4 })
          .circle(tower.x, tower.y, stats.range * 0.62)
          .stroke({ color: THEME.colors.etherGlow, width: 2 }),
        12
      );
    } else if (tower.type === 'repulsor') {
      game.audio.play('repulsor');
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
        target.graphic.zIndex = target.y;
        this.refreshEnemyHealth(target);
      }
      this.addEffect(
        game,
        new Graphics()
          .circle(tower.x, tower.y, stats.range)
          .stroke({ color: 0x8ddbe9, width: 4 })
          .circle(tower.x, tower.y, stats.range * 0.72)
          .stroke({ color: THEME.colors.etherGlow, width: 2 }),
        12
      );
    } else if (tower.type === 'chitin_cannon') {
      for (const target of targets.slice(0, 3)) {
        this.showBeam(game, tower, target, 0xf3a09c);
        this.damageEnemy(game, target, stats.damage);
      }
    }
  }

  private updateTowerSuppression(game: Game, dt: number): void {
    for (const [towerId, remaining] of this.towerSuppression) {
      const next = Math.max(0, remaining - dt);
      const tower = game.state.towers.find((item) => item.id === towerId);

      if (next === 0 || !tower || tower.hp <= 0) {
        this.towerSuppression.delete(towerId);
      } else {
        this.towerSuppression.set(towerId, next);
      }

      if (tower) this.refreshTowerHealth(tower);
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
      createVoltaicBeam(
        tower.x,
        tower.y,
        target.x,
        target.y,
        color
      ),
      7
    );
  }

  private updatePlayer(game: Game, dt: number): void {
    const previousX = this.player.x;
    const previousY = this.player.y;
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
    this.player.zIndex = this.player.y;
    // Animate actual travel, not held input while blocked by a tower or world edge.
    this.playerMoved = Math.hypot(this.player.x - previousX, this.player.y - previousY) > 0.001;

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
    this.groundBreakCooldown = Math.max(
      0,
      this.groundBreakCooldown - dt
    );

    const attackHeld = game.input.isDown('Space', 'KeyF');
    const attackPressed =
      game.input.wasPressed('Space') ||
      game.input.wasPressed('KeyF');
    const attackReleased =
      game.input.wasReleased('Space') ||
      game.input.wasReleased('KeyF');
    const repairing =
      game.input.isDown('KeyE') || this.repairProgress > 0;

    if (
      attackPressed &&
      this.attackCooldown <= 0 &&
      !repairing
    ) {
      this.attackCharging = true;
      this.attackCharge = 0;
      this.repairProgress = 0;
      this.repairTargetId = null;
    }

    if (this.attackCharging && attackHeld) {
      this.attackCharge += dt;
      this.updateChargeIndicator();
    }

    if (this.attackCharging && attackReleased) {
      const action = resolveHammerRelease(
        this.attackCharge,
        this.attackCooldown <= 0,
        this.groundBreakCooldown <= 0,
        repairing
      );

      this.attackCharging = false;
      this.attackCharge = 0;
      this.chargeIndicator.visible = false;

      if (action === 'ground_break') {
        this.playerGroundBreak(game);
      } else if (action === 'basic') {
        this.playerAttack(game);
      }
    } else if (this.attackCharging && !attackHeld) {
      // Cancela uma carga perdida por blur/foco sem gerar um ataque.
      this.attackCharging = false;
      this.attackCharge = 0;
      this.chargeIndicator.visible = false;
    }

    this.updateRepair(game, dt);
  }

  private updateChargeIndicator(): void {
    const ratio = getChargeRatio(this.attackCharge);
    const ready = ratio >= 1 && this.groundBreakCooldown <= 0;
    const color = ready ? 0xffd36f : 0x8fd9ff;
    const radius = 24 + ratio * 22;

    this.chargeIndicator
      .clear()
      .circle(this.player.x, this.player.y, radius)
      .stroke({ color, width: ready ? 6 : 3, alpha: 0.9 })
      .circle(this.player.x, this.player.y, 18 + ratio * 8)
      .fill({ color, alpha: 0.08 + ratio * 0.16 });
    this.chargeIndicator.visible = true;

    const percent = Math.floor(ratio * 100);
    this.interaction.text = ready
      ? 'QUEBRA-TERRA PRONTO — solte o ataque!'
      : `Carregando Quebra-Terra... ${percent}%`;
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
    this.attackCooldown = BASIC_ATTACK_COOLDOWN;
    this.playerAnimation.attack(this.lastDirection.x, this.lastDirection.y);
    game.audio.play('kaelenAttack');
    const angle = Math.atan2(this.lastDirection.y, this.lastDirection.x);
    const cleave = new Graphics()
      .moveTo(this.player.x, this.player.y)
      .arc(
        this.player.x,
        this.player.y,
        BASIC_ATTACK_RANGE,
        angle - 0.9,
        angle + 0.9
      )
      .lineTo(this.player.x, this.player.y)
      .fill({ color: 0xffd36f, alpha: 0.18 })
      .stroke({ color: 0xffdf8b, width: 6, alpha: 0.92 });
    this.addEffect(
      game,
      cleave,
      9
    );

    let hits = 0;
    for (const enemy of [...this.enemies]) {
      if (!isInsideCleave(
        this.player.x,
        this.player.y,
        this.lastDirection.x,
        this.lastDirection.y,
        enemy.x,
        enemy.y,
        enemy.radius
      )) continue;

      this.damageEnemy(
        game,
        enemy,
        enemy.kind === 'alpha'
          ? BASIC_ATTACK_DAMAGE * 0.8
          : BASIC_ATTACK_DAMAGE,
        'kaelen'
      );
      if (this.enemies.includes(enemy)) {
        this.applyEnemyKnockback(enemy, BASIC_ATTACK_KNOCKBACK);
      }
      hits++;
    }
    if (hits > 0) {
      this.hitstopRemaining = BASIC_ATTACK_HITSTOP;
      this.setStatus(
        hits === 1 ? 'Golpe certeiro!' : `${hits} inimigos atingidos!`,
        40
      );
    }
  }

  private playerGroundBreak(game: Game): void {
    this.attackCooldown = BASIC_ATTACK_COOLDOWN;
    this.playerAnimation.attack(this.lastDirection.x, this.lastDirection.y, true);
    this.groundBreakCooldown = GROUND_BREAK_COOLDOWN;
    game.audio.play('groundBreak');

    this.addEffect(
      game,
      new Graphics()
        .circle(this.player.x, this.player.y, GROUND_BREAK_RADIUS)
        .fill({ color: 0xf0b85f, alpha: 0.2 })
        .stroke({ color: 0xffdc82, width: 8, alpha: 0.95 })
        .circle(this.player.x, this.player.y, GROUND_BREAK_RADIUS * 0.55)
        .stroke({ color: 0xffffff, width: 3, alpha: 0.7 }),
      18
    );

    let hits = 0;
    let brokeStance = false;
    for (const enemy of [...this.enemies]) {
      if (!isInsideGroundBreak(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
        enemy.radius
      )) continue;

      brokeStance = brokeStance || Boolean(
        enemy.alphaState?.stanceActive
      );
      this.damageEnemy(
        game,
        enemy,
        enemy.kind === 'alpha'
          ? GROUND_BREAK_DAMAGE * 0.8
          : GROUND_BREAK_DAMAGE,
        'ground_break'
      );
      if (this.enemies.includes(enemy)) {
        const resistance = enemy.kind === 'alpha'
          ? 0.4
          : enemy.kind === 'brute' ? 0.7 : 1;
        this.applyEnemyKnockback(
          enemy,
          GROUND_BREAK_KNOCKBACK * resistance
        );
      }
      hits++;
    }

    this.hitstopRemaining = hits > 0 ? GROUND_BREAK_HITSTOP : 0;
    this.setStatus(
      brokeStance
        ? 'POSTURA DE OBSIDIANA QUEBRADA! Alpha atordoado!'
        : hits > 0
          ? `QUEBRA-TERRA! ${hits} inimigo${hits === 1 ? '' : 's'} atingido${hits === 1 ? '' : 's'}!`
          : 'QUEBRA-TERRA! O impacto sacudiu a arena.',
      brokeStance ? 150 : 80
    );
  }

  private applyEnemyKnockback(enemy: Enemy, distance: number): void {
    let dx = enemy.x - this.player.x;
    let dy = enemy.y - this.player.y;
    const magnitude = Math.hypot(dx, dy);

    if (magnitude === 0) {
      dx = this.lastDirection.x;
      dy = this.lastDirection.y;
    } else {
      dx /= magnitude;
      dy /= magnitude;
    }

    enemy.x = Math.max(
      enemy.radius,
      Math.min(WIDTH - enemy.radius, enemy.x + dx * distance)
    );
    enemy.y = Math.max(
      HUD_HEIGHT + enemy.radius,
      Math.min(HEIGHT - enemy.radius, enemy.y + dy * distance)
    );
    enemy.graphic.position.set(enemy.x, enemy.y);
    enemy.graphic.zIndex = enemy.y;
    this.refreshEnemyHealth(enemy);
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

    if (this.attackCharging) {
      this.repairProgress = 0;
      this.repairTargetId = null;
      return;
    }

    if (!holdingRepair) {
      this.repairProgress = 0;
      this.repairTargetId = null;
      this.repairLockedUntilRelease = false;
    }

    const tower = this.findRepairTarget(game);

    if (!tower) {
      this.interaction.text = this.groundBreakCooldown <= 0
        ? 'Quebra-Terra pronto'
        : `Quebra-Terra: ${Math.ceil(this.groundBreakCooldown / 60)}s`;
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

  private addEffect(_game: Game, graphic: Graphics, life: number): void {
    graphic.eventMode = 'none';
    this.layers.vfx.addChild(graphic);
    this.effects.push({ graphic, life });
  }

  private updateEffects(_game: Game, dt: number): void {
    for (const effect of [...this.effects]) {
      effect.life -= dt;
      if (effect.life <= 0) {
        effect.graphic.removeFromParent();
        effect.graphic.destroy({ children: true, context: true });
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
    this.layers.hud.addChild(
      new Graphics()
        .roundRect(235, 175, 490, 190, 16)
        .fill({ color: 0x111820, alpha: 0.94 })
        .stroke({ color: victory ? 0x7de39b : 0xe47676, width: 4 })
    );
    drawText(
      this.layers.hud,
      victory ? 'OAKHEAVEN RESISTIU!' : 'A ULTIMA LINHA CAIU',
      victory ? 330 : 315,
      220,
      27,
      victory ? 0x8af0a5 : 0xff8b8b
    );
    drawText(
      this.layers.hud,
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
      this.layers.hud,
      'Pressione R para reiniciar',
      360,
      315,
      16,
      0xffd38a
    );
  }

  private updateCombat(game: Game, dt: number): void {
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining = Math.max(0, this.hitstopRemaining - dt);
      this.updateEffects(game, dt);
      return;
    }

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
    this.updateTowerSuppression(game, dt);
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
    this.feedback.update(dt);
    this.playerMoved = false;
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
    this.playerAnimation.update(dt, {
      moving: this.playerMoved,
      directionX: this.lastDirection.x,
      directionY: this.lastDirection.y,
      charging: this.attackCharging,
    });
    this.updateHUD(game);
  }
}
