
import type { GameState } from '../core/GameState';

export const DAYLIGHT_SECONDS = 120;

export function formatClock(seconds: number): string {
  const total = Math.ceil(Math.max(0, seconds));

  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function updateDaylight(
  state: GameState,
  elapsedSeconds: number
): boolean {
  const expedition = state.expedition;

  if (expedition.remainingSeconds <= 0) {
    return false;
  }

  expedition.remainingSeconds = Math.max(
    0,
    expedition.remainingSeconds - elapsedSeconds
  );

  if (expedition.remainingSeconds === 0) {
    expedition.forcedRetreat = true;
    return true;
  }

  return false;
}
