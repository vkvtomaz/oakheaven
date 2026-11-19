import type { Container, Sprite } from 'pixi.js';

/** Transitional pose feedback for the single hero texture, NOT frame animation.
 * Timings use the same 60 Hz normalized ticks as the existing scene ticker.
 * Only the child sprite is transformed: world position, shadow and hitbox stay intact.
 */
export const KAELEN_FEEDBACK = {
  attackTicks: 10,
  hurtTicks: 6,
  idleHz: 0.65,
  moveHz: 2,
  hurtTint: 0xffb4a0,
} as const;

export type KaelenVisualState = 'idle' | 'move' | 'attack' | 'hurt';
export interface KaelenFeedbackInput {
  moving: boolean;
  directionX: number;
  directionY: number;
  charging?: boolean;
}

export interface KaelenFeedback {
  readonly state: KaelenVisualState;
  update(dtTicks: number, input: KaelenFeedbackInput): void;
  attack(directionX: number, directionY: number, strong?: boolean): void;
  hurt(directionX?: number, directionY?: number): void;
  reset(): void;
}

export function createKaelenFeedback(actor: Pick<Container, 'children'>): KaelenFeedback {
  const sprite = actor.children[0] as Sprite;
  const base = {
    x: sprite.x, y: sprite.y, rotation: sprite.rotation,
    scaleX: sprite.scale.x, scaleY: sprite.scale.y, tint: sprite.tint,
  };
  let state: KaelenVisualState = 'idle';
  let clock = 0;
  let attackRemaining = 0;
  let hurtRemaining = 0;
  let attackX = 0;
  let attackY = 0;
  let hurtX = 0;
  let hurtY = 0;
  let heavy = false;

  function restore(): void {
    sprite.x = base.x;
    sprite.y = base.y;
    sprite.rotation = base.rotation;
    sprite.scale.set(base.scaleX, base.scaleY);
    sprite.tint = base.tint;
  }

  return {
    get state() { return state; },
    attack(directionX, directionY, strong = false) {
      attackRemaining = KAELEN_FEEDBACK.attackTicks;
      const magnitude = Math.hypot(directionX, directionY) || 1;
      attackX = directionX / magnitude;
      attackY = directionY / magnitude;
      heavy = strong;
    },
    hurt(directionX = 0, directionY = 0) {
      hurtRemaining = KAELEN_FEEDBACK.hurtTicks;
      // Interrupt an attack's presentation, never its gameplay result/cooldown.
      attackRemaining = 0;
      const magnitude = Math.hypot(directionX, directionY) || 1;
      hurtX = directionX / magnitude;
      hurtY = directionY / magnitude;
    },
    update(dtTicks, input) {
      const dt = Math.max(0, dtTicks);
      clock = (clock + dt / 60) % 60;
      attackRemaining = Math.max(0, attackRemaining - dt);
      hurtRemaining = Math.max(0, hurtRemaining - dt);
      restore();
      if (hurtRemaining > 0) {
        state = 'hurt';
        const recovery = hurtRemaining / KAELEN_FEEDBACK.hurtTicks;
        sprite.x += hurtX * 2 * recovery;
        sprite.y += hurtY * 2 * recovery;
        sprite.tint = KAELEN_FEEDBACK.hurtTint;
      } else if (attackRemaining > 0) {
        state = 'attack';
        const progress = 1 - attackRemaining / KAELEN_FEEDBACK.attackTicks;
        const impulse = Math.sin(Math.PI * progress);
        const strength = heavy ? 3 : 2;
        sprite.x += attackX * strength * impulse;
        sprite.y += attackY * strength * impulse;
        sprite.rotation += (attackX || 1) * (heavy ? 0.08 : 0.055) * impulse;
      } else if (input.moving) {
        state = 'move';
        const phase = clock * Math.PI * 2 * KAELEN_FEEDBACK.moveHz;
        sprite.y -= Math.abs(Math.sin(phase)) * 1.5;
        sprite.rotation += Math.sin(phase) * 0.025;
      } else {
        state = 'idle';
        // A charged hammer holds its pose; the existing ring communicates charging.
        const breath = input.charging ? 0 : Math.sin(clock * Math.PI * 2 * KAELEN_FEEDBACK.idleHz);
        sprite.y += breath * 0.3;
        sprite.scale.y = base.scaleY * (1 + breath * 0.004);
      }
    },
    reset() {
      clock = 0;
      attackRemaining = 0;
      hurtRemaining = 0;
      state = 'idle';
      restore();
    },
  };
}
