/** Presentation only. Never writes to actor position, velocity or collision bounds. */
export interface TraversalMotionInput {
  distanceX: number;
  velocityY: number;
  grounded: boolean;
  landed: boolean;
  stumbling: boolean;
  /** Set only when the scene actually accepts the jump input. */
  jumped?: boolean;
  /** Completed fraction of the existing gameplay recovery timer, 0..1. */
  recoveryProgress?: number;
}
export type TraversalPoseState = 'idle' | 'walk' | 'jump' | 'fall' | 'land' | 'recover';
export type TraversalJumpPhase = 'ground' | 'compress' | 'extend' | 'apex' | 'fall' | 'land' | 'recover';
export function createTraversalMotion(idleFrames = 5, walkFrames = 6) {
  let state: TraversalPoseState = 'idle';
  let elapsed = 0, stride = 0, landingTicks = 0;
  let jumpAge: number | null = null;
  let facing = 1, scaleX = 1, scaleY = 1, rotation = 0, offsetY = 0;
  return {
    update(dt: number, input: TraversalMotionInput) {
      const ticks = Number.isFinite(dt) ? Math.max(0, dt) : 0;
      const moving = Math.abs(input.distanceX) > .001 && !input.stumbling;
      if (moving) facing = Math.sign(input.distanceX);
      if (input.landed) landingTicks = 9;
      if (!input.grounded) landingTicks = 0;
      if (input.jumped) jumpAge = 0;
      else if (input.grounded) jumpAge = null;
      // A ledge fall has no accepted jump event, so it cannot play takeoff.
      // Compression is visual during launch; it never holds the physical root.
      const phase: TraversalJumpPhase = input.grounded
        ? input.stumbling ? 'recover' : landingTicks > 0 ? 'land' : 'ground'
        : jumpAge !== null && jumpAge < 3 && input.velocityY < -2 ? 'compress'
        : jumpAge !== null && Math.abs(input.velocityY) <= 2 ? 'apex'
        : input.velocityY < -2 ? 'extend' : 'fall';
      const next: TraversalPoseState = !input.grounded
        ? phase === 'fall' ? 'fall' : 'jump'
        : input.stumbling ? 'recover' : landingTicks > 0 ? 'land' : moving ? 'walk' : 'idle';
      if (next !== state) { state = next; elapsed = 0; }
      elapsed += ticks;
      if (moving && input.grounded) stride += Math.abs(input.distanceX);
      const clip = state === 'walk' || (state === 'jump' && phase !== 'compress') || state === 'fall' ? 'walk' : 'idle';
      const frameIndex = state === 'walk' ? Math.floor(stride / 15) % Math.max(1, walkFrames)
        : phase === 'compress' ? 0
        : phase === 'apex' ? Math.min(3, walkFrames - 1)
        : state === 'jump' ? Math.min(2, walkFrames - 1)
        : state === 'fall' ? Math.min(4, walkFrames - 1)
        : state === 'land' || state === 'recover' ? 0 : Math.floor(elapsed / 12) % Math.max(1, idleFrames);
      const compression = state === 'land' ? landingTicks / 9 : 0;
      const recoveryWeight = 1 - Math.max(0, Math.min(1, input.recoveryProgress ?? 0));
      const targetX = state === 'recover' ? 1 + recoveryWeight * .035
        : phase === 'compress' ? 1.055 : phase === 'extend' ? .965
        : phase === 'apex' ? 1.015 : state === 'fall' ? .98 : 1 + compression * .045;
      const targetY = state === 'recover' ? 1 - recoveryWeight * .065
        : phase === 'compress' ? .94 : phase === 'extend' ? 1.045
        : phase === 'apex' ? .985 : state === 'fall' ? 1.025
        : state === 'land' ? 1 - compression * .065 : 1 + Math.sin(elapsed * .055) * .006;
      const lean = state === 'recover' ? facing * .018 * recoveryWeight
        : state === 'walk' ? facing * .02 : phase === 'extend' ? facing * -.025
        : phase === 'compress' ? facing * .018
        : state === 'fall' ? facing * .018 : 0;
      const lift = state === 'walk' ? -Math.abs(Math.sin(stride / 15 * Math.PI)) * .45 : 0;
      const blend = 1 - Math.exp(-ticks * .4);
      scaleX += (targetX - scaleX) * blend;
      scaleY += (targetY - scaleY) * blend;
      rotation += (lean - rotation) * blend;
      offsetY += (lift - offsetY) * blend;
      landingTicks = Math.max(0, landingTicks - ticks);
      if (jumpAge !== null) jumpAge += ticks;
      return { state, phase, frameIndex, clip: clip as 'idle' | 'walk', scaleX, scaleY, rotation, offsetY, facing };
    },
  };
}

/** Finite camera impulse, presentation only. Reduced motion cancels immediately. */
export function createTraversalImpactMotion(reducedMotion = false) {
  let remaining = 0;
  return {
    update(dt: number, hardImpact = false, reduce = reducedMotion) {
      if (reduce) { remaining = 0; return { x: 0, y: 0 }; }
      if (hardImpact) remaining = 7;
      if (remaining <= 0) return { x: 0, y: 0 };
      const envelope = remaining / 7;
      const x = Math.sin((7 - remaining) * 2.6 + 1) * 1.6 * envelope;
      const y = Math.cos((7 - remaining) * 2.1) * .8 * envelope;
      remaining = Math.max(0, remaining - (Number.isFinite(dt) ? Math.max(0, dt) : 0));
      return { x, y };
    },
  };
}
