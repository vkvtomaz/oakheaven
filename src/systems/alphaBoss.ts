export type AlphaDamageSource =
  | 'tower'
  | 'kaelen'
  | 'ground_break';

export type AlphaThresholdEvent = 'roar' | 'obsidian_stance';

export interface AlphaBossState {
  roarTriggered: boolean;
  stanceTriggered: boolean;
  stanceActive: boolean;
  stunnedTicks: number;
  finalPhase: boolean;
}

export const ALPHA_ROAR_THRESHOLD = 0.7;
export const ALPHA_STANCE_THRESHOLD = 0.35;
export const ALPHA_ROAR_RADIUS = 240;
export const ALPHA_SUPPRESSION_TICKS = 300;
export const ALPHA_STUN_TICKS = 120;
export const ALPHA_STANCE_FLANKERS = 2;
export const ALPHA_FINAL_SPEED_MULTIPLIER = 1.35;

export function createAlphaBossState(): AlphaBossState {
  return {
    roarTriggered: false,
    stanceTriggered: false,
    stanceActive: false,
    stunnedTicks: 0,
    finalPhase: false,
  };
}

export function updateAlphaThresholds(
  state: AlphaBossState,
  hp: number,
  maxHp: number
): AlphaThresholdEvent[] {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  const events: AlphaThresholdEvent[] = [];

  if (!state.roarTriggered && ratio <= ALPHA_ROAR_THRESHOLD) {
    state.roarTriggered = true;
    events.push('roar');
  }

  if (!state.stanceTriggered && ratio <= ALPHA_STANCE_THRESHOLD) {
    state.stanceTriggered = true;
    state.stanceActive = true;
    events.push('obsidian_stance');
  }

  return events;
}

export function getAlphaDamageMultiplier(
  state: AlphaBossState,
  source: AlphaDamageSource
): number {
  if (!state.stanceActive) return 1;
  if (source === 'ground_break') return 2;
  if (source === 'tower') return 0.15;
  return 0.35;
}

export function isInsideAlphaRoar(
  alphaX: number,
  alphaY: number,
  targetX: number,
  targetY: number
): boolean {
  return (
    Math.hypot(targetX - alphaX, targetY - alphaY) <=
    ALPHA_ROAR_RADIUS
  );
}

export function breakObsidianStance(state: AlphaBossState): boolean {
  if (!state.stanceActive) return false;

  state.stanceActive = false;
  state.stunnedTicks = ALPHA_STUN_TICKS;
  return true;
}

export function updateAlphaStun(
  state: AlphaBossState,
  elapsedTicks: number
): boolean {
  if (state.stunnedTicks <= 0) return false;

  state.stunnedTicks = Math.max(0, state.stunnedTicks - elapsedTicks);

  if (state.stunnedTicks === 0 && !state.finalPhase) {
    state.finalPhase = true;
    return true;
  }

  return false;
}
