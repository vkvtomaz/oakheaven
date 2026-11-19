import assert from 'node:assert/strict';
import test from 'node:test';
import { createKaelenFeedback, KAELEN_FEEDBACK } from '../src/visual/kaelenFeedback.ts';
import type { Container } from 'pixi.js';

const idle = { moving: false, directionX: 1, directionY: 0 };
function setup() {
  const sprite = {
    x: 0, y: 8, rotation: 0, tint: 0xffffff,
    scale: { x: 0.232, y: 0.232, set(x: number, y: number) { this.x = x; this.y = y; } },
  };
  const actor = { x: 365, y: 405, rotation: 0, alpha: 1, children: [sprite] };
  const feedback = createKaelenFeedback(actor as unknown as Container);
  return { actor, sprite, feedback };
}

test('visual priority follows hurt > attack > moving > idle and expires', () => {
  const { feedback } = setup();
  feedback.update(1, { ...idle, moving: true });
  assert.equal(feedback.state, 'move');
  feedback.attack(1, 0);
  feedback.update(1, { ...idle, moving: true });
  assert.equal(feedback.state, 'attack');
  feedback.hurt(1, 0);
  feedback.update(1, { ...idle, moving: true });
  assert.equal(feedback.state, 'hurt');
  feedback.update(KAELEN_FEEDBACK.hurtTicks, idle);
  assert.equal(feedback.state, 'idle');
});

test('feedback never moves the logical actor or changes its invulnerability alpha', () => {
  const { actor, sprite, feedback } = setup();
  feedback.attack(1, 0, true);
  feedback.update(5, idle);
  assert.equal(sprite.x, 3);
  assert.deepEqual([actor.x, actor.y, actor.rotation, actor.alpha], [365, 405, 0, 1]);
  feedback.reset();
  assert.deepEqual([sprite.x, sprite.y, sprite.rotation, sprite.scale.x, sprite.scale.y, sprite.tint], [0, 8, 0, 0.232, 0.232, 0xffffff]);
});

test('feedback reaches the same pose at 30, 60 and 120 FPS', () => {
  const poses = [30, 60, 120].map(fps => {
    const { sprite, feedback } = setup();
    let remainingTicks = 0.37 * 60;
    while (remainingTicks > 1e-12) {
      const step = Math.min(60 / fps, remainingTicks);
      feedback.update(step, { ...idle, moving: true });
      remainingTicks -= step;
    }
    assert.ok(Math.abs(sprite.y - 8) > 1, 'sample must exercise a visible nonzero movement pose');
    assert.ok(Math.abs(sprite.rotation) > 0.02);
    return [sprite.y, sprite.rotation];
  });
  for (const pose of poses) {
    assert.ok(Math.abs(pose[0]! - poses[0]![0]!) < 1e-10);
    assert.ok(Math.abs(pose[1]! - poses[0]![1]!) < 1e-10);
  }
});

test('attack and damage expire at equivalent elapsed times across frame rates', () => {
  for (const fps of [30, 60, 120]) {
    for (const kind of ['attack', 'hurt'] as const) {
      const { sprite, feedback } = setup();
      if (kind === 'attack') feedback.attack(1, 0, true);
      else feedback.hurt(1, 0);
      const duration = kind === 'attack' ? KAELEN_FEEDBACK.attackTicks : KAELEN_FEEDBACK.hurtTicks;
      let remainingTicks = duration - 0.1;
      while (remainingTicks > 1e-12) {
        const step = Math.min(60 / fps, remainingTicks);
        feedback.update(step, { ...idle, charging: true });
        remainingTicks -= step;
      }
      assert.equal(feedback.state, kind, `${kind} must remain active before its deadline at ${fps} FPS`);
      feedback.update(0.2, { ...idle, charging: true });
      assert.equal(feedback.state, 'idle', `${kind} must expire after its deadline at ${fps} FPS`);
      assert.deepEqual([sprite.x, sprite.y, sprite.rotation, sprite.tint], [0, 8, 0, 0xffffff]);
    }
  }
});

test('damage tint restores and transforms do not accumulate after repeated actions', () => {
  const { sprite, feedback } = setup();
  for (let i = 0; i < 100; i++) {
    feedback.hurt(1, 1);
    feedback.update(1, idle);
    assert.equal(sprite.tint, KAELEN_FEEDBACK.hurtTint);
    feedback.update(10, idle);
    assert.equal(sprite.tint, 0xffffff);
    feedback.attack(-1, 0);
    feedback.update(4, idle);
  }
  feedback.reset();
  assert.deepEqual([sprite.x, sprite.y, sprite.rotation, sprite.scale.x, sprite.scale.y], [0, 8, 0, 0.232, 0.232]);
});

test('world-distance directions cannot amplify attack or damage displacement', () => {
  const { sprite, feedback } = setup();
  feedback.attack(30, 40, true);
  feedback.update(5, idle);
  assert.ok(Math.hypot(sprite.x, sprite.y - 8) <= 3 + 1e-10);
  feedback.hurt(300, 400);
  feedback.update(1, idle);
  assert.ok(Math.hypot(sprite.x, sprite.y - 8) <= 2);
  assert.ok(sprite.x > 0 && sprite.y > 8, 'recoil follows the direction away from the hit');
});
