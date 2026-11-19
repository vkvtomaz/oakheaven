import { Graphics, type Container } from 'pixi.js';

/** Presentation only: scene logic and input continue throughout the short reveal. */
export function createSceneTransition(stage: Container, width: number, height: number): { update(dt: number): void } {
  const overlay = new Graphics().rect(0, 0, width, height).fill(0x081310);
  overlay.eventMode = 'none';
  overlay.interactiveChildren = false;
  overlay.alpha = 0.45;
  stage.addChild(overlay);
  let remaining = 18;

  return {
    update(dt: number): void {
      if (remaining <= 0 || overlay.destroyed) return;
      remaining = Math.max(0, remaining - Math.max(0, Number.isFinite(dt) ? dt : 0));
      overlay.alpha = 0.45 * remaining / 18;
      if (remaining === 0) {
        overlay.removeFromParent();
        overlay.destroy();
      }
    },
  };
}
