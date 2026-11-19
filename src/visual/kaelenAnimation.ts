import type { Sprite, Texture } from 'pixi.js';

/** Drawn frame playback for docs/KAELEN-ANIMATION-ART.md.
 * Presentation only: never moves the actor or schedules damage/gameplay events.
 * Frame durations use the scene's normalized 60 Hz ticks, not rendered frames.
 */
export type KaelenAnimationState = 'idle' | 'walk' | 'attack' | 'hurt';
export interface KaelenAnimationClip {
  readonly frames: readonly Texture[];
  readonly frameTicks: number;
}
export type KaelenAnimationClips = Partial<Record<KaelenAnimationState, KaelenAnimationClip>>;
export interface KaelenAnimationInput {
  moving: boolean;
  directionX?: number;
  directionY?: number;
  charging?: boolean;
}
export interface KaelenAnimation {
  readonly state: KaelenAnimationState;
  readonly frameIndex: number;
  update(dtTicks: number, input: KaelenAnimationInput): void;
  attack(directionX?: number, directionY?: number, strong?: boolean): void;
  hurt(directionX?: number, directionY?: number): void;
  reset(): void;
}

export function createKaelenAnimation(
  sprite: Pick<Sprite, 'texture'>,
  clips: KaelenAnimationClips,
): KaelenAnimation {
  const original = sprite.texture;
  const usable: KaelenAnimationClips = {};
  for (const state of ['idle', 'walk', 'attack', 'hurt'] as const) {
    const clip = clips[state];
    if (clip && clip.frames.length > 0 && Number.isFinite(clip.frameTicks) && clip.frameTicks > 0) {
      usable[state] = clip;
    }
  }
  let state: KaelenAnimationState = 'idle';
  let elapsed = 0;
  let frameIndex = 0;

  function paint(): void {
    const clip = usable[state] ?? usable.idle;
    if (!clip) {
      frameIndex = 0;
      sprite.texture = original;
      return;
    }
    const index = Math.floor((elapsed + 1e-9) / clip.frameTicks);
    frameIndex = state === 'attack' || state === 'hurt'
      ? Math.min(clip.frames.length - 1, index)
      : index % clip.frames.length;
    sprite.texture = clip.frames[frameIndex]!;
  }

  function enter(next: KaelenAnimationState): void {
    if (state !== next) {
      state = next;
      elapsed = 0;
    }
  }

  paint();
  return {
    get state() { return state; },
    get frameIndex() { return frameIndex; },
    attack(_directionX, _directionY, _strong) {
      // Hits cannot queue a stale attack pose behind damage recovery.
      if (state === 'hurt' || !usable.attack) return;
      state = 'attack';
      elapsed = 0;
      paint();
    },
    hurt(_directionX, _directionY) {
      if (!usable.hurt) return;
      state = 'hurt';
      elapsed = 0;
      paint();
    },
    update(dtTicks, input) {
      let dt = Number.isFinite(dtTicks) ? Math.max(0, dtTicks) : 0;
      if (state === 'attack' || state === 'hurt') {
        const clip = usable[state]!;
        const duration = clip.frames.length * clip.frameTicks;
        const remaining = Math.max(0, duration - elapsed);
        if (dt + 1e-9 < remaining) {
          elapsed += dt;
          paint();
          return;
        }
        dt = Math.max(0, dt - remaining);
        enter(input.moving ? 'walk' : 'idle');
      } else {
        enter(input.moving ? 'walk' : 'idle');
      }
      const clip = usable[state] ?? usable.idle;
      elapsed = clip ? (elapsed + dt) % (clip.frames.length * clip.frameTicks) : 0;
      paint();
    },
    reset() {
      state = 'idle';
      elapsed = 0;
      paint();
    },
  };
}
