import assert from 'node:assert/strict';
import test from 'node:test';
import type { Texture } from 'pixi.js';
import { createKaelenAnimation } from '../src/visual/kaelenAnimation.ts';
import type { KaelenAnimationClips } from '../src/visual/kaelenAnimation.ts';

const texture = (id: string) => ({ id }) as unknown as Texture;
const idle = { moving: false, directionX: 1, directionY: 0 };
const moving = { ...idle, moving: true };
function setup() {
  const clips = Object.fromEntries(['idle', 'walk', 'attack', 'hurt'].map(state => [state, {
    frames: [0, 1, 2].map(index => texture(`${state}${index}`)),
    frameTicks: 2,
  }])) as KaelenAnimationClips;
  const sprite = { texture: texture('original'), x: 40, y: 80, alpha: 0.4, rotation: 0 };
  return { sprite, clips, animation: createKaelenAnimation(sprite, clips) };
}

test('drawn walk frames advance and loop; stopping starts idle immediately', () => {
  const { sprite, clips, animation } = setup();
  animation.update(0, moving);
  assert.equal(sprite.texture, clips.walk!.frames[0]);
  animation.update(2, moving);
  assert.equal(sprite.texture, clips.walk!.frames[1]);
  animation.update(2, moving);
  assert.equal(sprite.texture, clips.walk!.frames[2]);
  animation.update(2, moving);
  assert.equal(sprite.texture, clips.walk!.frames[0]);
  animation.update(0, idle);
  assert.equal(animation.state, 'idle');
  assert.equal(sprite.texture, clips.idle!.frames[0]);
  assert.deepEqual([sprite.x, sprite.y, sprite.alpha, sprite.rotation], [40, 80, 0.4, 0]);
});

test('one-shots start at frame zero, damage interrupts attack, attacks cannot queue through hurt', () => {
  const { sprite, clips, animation } = setup();
  animation.attack(1, 0, true);
  assert.equal(sprite.texture, clips.attack!.frames[0]);
  animation.update(4, moving);
  assert.equal(sprite.texture, clips.attack!.frames[2]);
  animation.hurt();
  assert.equal(sprite.texture, clips.hurt!.frames[0]);
  animation.attack();
  assert.equal(animation.state, 'hurt');
  animation.update(6, moving);
  assert.equal(animation.state, 'walk');
  assert.equal(sprite.texture, clips.walk!.frames[0]);
});

test('one-shot expiry carries surplus elapsed time into locomotion consistently at 30/60/120 FPS', () => {
  const results = [30, 60, 120].map(fps => {
    const { animation, sprite, clips } = setup();
    animation.attack();
    let remaining = 9;
    while (remaining > 1e-9) {
      const step = Math.min(60 / fps, remaining);
      animation.update(step, moving);
      remaining -= step;
    }
    assert.equal(sprite.texture, clips.walk!.frames[1]);
    return [animation.state, animation.frameIndex];
  });
  for (const result of results) assert.deepEqual(result, ['walk', 1]);
});

test('missing and malformed clips fall back safely without leaving stale action texture', () => {
  const original = texture('original');
  const sprite = { texture: original };
  const animation = createKaelenAnimation(sprite, {
    walk: { frames: [], frameTicks: 1 },
    attack: { frames: [texture('attack')], frameTicks: Number.NaN },
  });
  animation.attack();
  animation.hurt();
  animation.update(100, moving);
  assert.equal(sprite.texture, original);
  animation.reset();
  assert.equal(animation.state, 'idle');
  assert.equal(sprite.texture, original);
});

test('invalid deltas do not poison playback, reset restores first idle frame', () => {
  const { animation, sprite, clips } = setup();
  animation.update(2, moving);
  for (const dt of [Number.NaN, Infinity, -5]) animation.update(dt, moving);
  assert.equal(sprite.texture, clips.walk!.frames[1]);
  animation.reset();
  assert.equal(sprite.texture, clips.idle!.frames[0]);
  assert.equal(animation.frameIndex, 0);
});
