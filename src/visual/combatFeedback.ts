import { Container, Graphics } from 'pixi.js';
import type { TowerType } from '../core/GameState';

interface Pulse { graphic: Graphics; remaining: number; duration: number; expansion: number }
const TOWER_COLOR: Record<TowerType, number> = {
  arc_ballista: 0xa9e6ed, slag_forge: 0xf7a55a, repulsor: 0x9fd8e7,
  chitin_cannon: 0xe1a293, spike_barricade: 0xb8d685,
};

/** Shared procedural feedback, not authored entity animation frames.
 * Events are supplied by combat; this layer never changes actors or gameplay.
 * Fixed cap bounds overdraw, including rapid barricade contact damage.
 */
export class CombatFeedback {
  private pulses: Pulse[] = [];
  private clock = 0;
  private contactTimes = new WeakMap<Graphics, number>();
  private hurtTimes = new WeakMap<Graphics, number>();
  private trailTimes = new WeakMap<Graphics, number>();
  private readonly layer: Container;
  private readonly capacity: number;
  constructor(layer: Container, capacity = 64) {
    this.layer = layer;
    this.capacity = capacity;
  }

  private emit(graphic: Graphics, duration: number, expansion = 0.3): void {
    if (this.pulses.length >= this.capacity) {
      this.pulses.shift()!.graphic.destroy({ context: true });
    }
    graphic.eventMode = 'none';
    this.layer.addChild(graphic);
    this.pulses.push({ graphic, remaining: duration, duration, expansion });
  }

  tower(type: TowerType, actor: Graphics, targetX: number, targetY: number): void {
    if (type === 'spike_barricade') {
      if (this.clock < (this.contactTimes.get(actor) ?? -1)) return;
      this.contactTimes.set(actor, this.clock + 12);
    }
    const color = TOWER_COLOR[type];
    const effect = new Graphics();
    effect.position.copyFrom(actor.position);
    if (type === 'arc_ballista' || type === 'chitin_cannon') {
      const angle = Math.atan2(targetY - actor.y, targetX - actor.x);
      const tipX = Math.cos(angle) * 22, tipY = -28 + Math.sin(angle) * 15;
      for (let index = -1; index <= 1; index++) {
        const ray = angle + index * 0.4;
        effect.moveTo(tipX, tipY).lineTo(tipX + Math.cos(ray) * 18, tipY + Math.sin(ray) * 12)
          .stroke({ color, width: type === 'chitin_cannon' ? 3 : 1.5, alpha: 0.85 });
      }
    } else if (type === 'slag_forge') {
      for (let index = -1; index <= 1; index++) {
        effect.moveTo(index * 10, -8).lineTo(index * 13 + 3, -24 - (1 - Math.abs(index)) * 13)
          .stroke({ color, width: 3, alpha: 0.8 });
      }
      effect.ellipse(0, -8, 24, 9).fill({ color, alpha: 0.2 });
    } else if (type === 'repulsor') {
      effect.ellipse(0, -4, 24, 10).ellipse(0, -4, 15, 6)
        .stroke({ color, width: 2, alpha: 0.8 });
    } else {
      effect.poly([-25, -8, -13, -20, -2, -7, 10, -22, 24, -8], false)
        .stroke({ color, width: 2, alpha: 0.9 });
    }
    this.emit(effect, type === 'slag_forge' ? 20 : 12, type === 'repulsor' ? 1.2 : 0.2);
  }

  hurt(actor: Graphics, color = 0xffdcac): void {
    // Continuous contact damage remains readable without spawning every tick.
    if (this.clock < (this.hurtTimes.get(actor) ?? -1)) return;
    this.hurtTimes.set(actor, this.clock + 6);
    const effect = new Graphics().ellipse(0, -14, 13, 8)
      .stroke({ color, width: 2, alpha: 0.9 });
    effect.position.copyFrom(actor.position);
    this.emit(effect, 10);
  }

  attack(actor: Graphics, x: number, y: number): void {
    const angle = Math.atan2(y - actor.y, x - actor.x);
    const effect = new Graphics().arc(0, -10, 22, angle - 0.55, angle + 0.55)
      .stroke({ color: 0xd6a0a0, width: 2, alpha: 0.8 });
    effect.position.copyFrom(actor.position);
    this.emit(effect, 10, 0.1);
  }

  death(actor: Graphics, color: number): void {
    const effect = new Graphics();
    for (let index = 0; index < 7; index++) {
      const angle = index * Math.PI * 2 / 7;
      effect.moveTo(Math.cos(angle) * 7, -8 + Math.sin(angle) * 4)
        .lineTo(Math.cos(angle) * 23, -8 + Math.sin(angle) * 14)
        .stroke({ color, width: 2, alpha: 0.8 });
    }
    effect.position.copyFrom(actor.position);
    this.emit(effect, 22, 0.6);
  }

  travel(actor: Graphics, previousX: number, previousY: number): void {
    if (Math.hypot(actor.x - previousX, actor.y - previousY) < 0.1
      || this.clock < (this.trailTimes.get(actor) ?? -1)) return;
    this.trailTimes.set(actor, this.clock + 15);
    const effect = new Graphics().ellipse(0, 1, 7, 2)
      .fill({ color: 0xa9ae91, alpha: 0.18 });
    effect.position.set(previousX, previousY);
    this.emit(effect, 16, 0.5);
  }

  update(dt: number): void {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.clock += step;
    for (let index = this.pulses.length - 1; index >= 0; index--) {
      const pulse = this.pulses[index]!;
      pulse.remaining -= step;
      if (pulse.remaining <= 0) {
        pulse.graphic.destroy({ context: true });
        this.pulses.splice(index, 1);
      } else {
        pulse.graphic.alpha = pulse.remaining / pulse.duration;
        pulse.graphic.scale.set(1 + (1 - pulse.graphic.alpha) * pulse.expansion);
      }
    }
  }
}
