/** Adjustable input grace windows for traversal, measured in seconds. */
export const TRAVERSAL_JUMP_TIMING = Object.freeze({
  coyoteSeconds: 0.11,
  bufferSeconds: 0.1,
});

/** Input forgiveness only: this controller never changes motion or colliders. */
export function createTraversalJump(timing = TRAVERSAL_JUMP_TIMING) {
  let elapsed = 0;
  let lastSupport = -Infinity;
  let lastPress = -Infinity;
  return {
    advance(seconds: number, pressed: boolean, supported: boolean, blocked: boolean): void {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      elapsed += seconds;
      if (supported) lastSupport = elapsed;
      if (blocked) {
        lastPress = -Infinity;
      } else if (pressed) {
        lastPress = elapsed;
      }
    },
    /** Called only after an actual collision resolves on a valid surface. */
    support(): void {
      lastSupport = elapsed;
    },
    consume(blocked: boolean): boolean {
      if (blocked) {
        lastPress = -Infinity;
        return false;
      }
      if (elapsed - lastPress > timing.bufferSeconds + 1e-9
        || elapsed - lastSupport > timing.coyoteSeconds + 1e-9) return false;
      // One press and one supporting contact can fund at most one launch.
      lastPress = -Infinity;
      lastSupport = -Infinity;
      return true;
    },
  };
}
