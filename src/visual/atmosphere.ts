import { Container, Graphics } from 'pixi.js';

/** Bounded procedural atmosphere, separate from authored entity animations.
 * 24 motes + 3 mist ribbons, below entities and HUD; no per-tick allocations.
 */
export function createAtmosphere(stage: Container, sceneId: string): { update(dt: number): void } {
  const root = new Container();
  root.eventMode = 'none';
  // Ground is stage child zero. Keep ambient light behind objects and hit targets.
  stage.addChildAt(root, Math.min(1, stage.children.length));
  const forest = sceneId === 'forest';
  const traversal = sceneId.startsWith('platform');
  const mist = new Graphics();
  for (let i = 0; i < 3; i++) {
    mist.ellipse(190 + i * 300, traversal ? 370 + i * 15 : 210 + i * 95, 240, 14 + i * 3)
      .fill({ color: forest ? 0x94bba5 : 0x9aabb0, alpha: .028 });
  }
  root.addChild(mist);
  const motes = Array.from({ length: 24 }, (_, index) => {
    const ember = traversal && index % 3 === 0;
    const graphic = new Graphics().circle(0, 0, index % 4 === 0 ? 1.5 : .8)
      .fill({ color: ember ? 0xf1b36d : forest ? 0xa9d2b1 : 0xa6a4e1, alpha: .6 });
    graphic.position.set((index * 173 + 47) % 960, 110 + (index * 67) % 420);
    root.addChild(graphic);
    return { graphic, x: graphic.x, y: graphic.y, speed: ember ? .28 : .08 };
  });
  let ticks = 0;
  return {
    update(dt: number): void {
      if (root.destroyed) return;
      ticks = (ticks + Math.max(0, dt)) % 36000;
      mist.x = Math.sin(ticks / 230) * 16;
      for (let i = 0; i < motes.length; i++) {
        const mote = motes[i]!;
        mote.graphic.y = 100 + ((mote.y - 100 - ticks * mote.speed) % 430 + 430) % 430;
        mote.graphic.x = mote.x + Math.sin(ticks / 95 + i) * 7;
        mote.graphic.alpha = .25 + (Math.sin(ticks / 45 + i) + 1) * .22;
      }
    },
  };
}
