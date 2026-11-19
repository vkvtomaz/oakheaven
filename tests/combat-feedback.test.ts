import assert from 'node:assert/strict';
import test from 'node:test';
import { Container, Graphics } from 'pixi.js';
import { CombatFeedback } from '../src/visual/combatFeedback.ts';

test('combat feedback expires, caps effects, and never changes actor gameplay transforms', () => {
  const layer = new Container();
  const actor = new Graphics();
  actor.position.set(340, 260);
  actor.alpha = 0.4;
  actor.tint = 0x65677d;
  const feedback = new CombatFeedback(layer, 5);
  const before = [actor.x, actor.y, actor.alpha, actor.tint, actor.rotation, actor.scale.x];
  for (const type of ['arc_ballista', 'slag_forge', 'repulsor', 'chitin_cannon', 'spike_barricade'] as const) {
    feedback.tower(type, actor, 440, 260);
  }
  assert.equal(layer.children.length, 5);
  const first = layer.children[0]!;
  feedback.death(actor, 0x88aa99);
  assert.equal(first.destroyed, true);
  assert.equal(layer.children.length, 5);
  feedback.update(6);
  assert.ok(layer.children.every(child => child.alpha < 1));
  feedback.update(100);
  assert.equal(layer.children.length, 0);
  assert.deepEqual([actor.x, actor.y, actor.alpha, actor.tint, actor.rotation, actor.scale.x], before);
  layer.destroy(); actor.destroy();
});

test('contact and travel emissions obey separate budgets and require actual displacement', () => {
  const layer = new Container();
  const actor = new Graphics();
  actor.position.set(50, 50);
  const feedback = new CombatFeedback(layer);
  feedback.travel(actor, 50, 50);
  assert.equal(layer.children.length, 0);
  feedback.travel(actor, 49, 50);
  feedback.travel(actor, 49, 50);
  assert.equal(layer.children.length, 1);
  feedback.hurt(actor);
  feedback.hurt(actor);
  assert.equal(layer.children.length, 2);
  feedback.update(6);
  feedback.hurt(actor);
  assert.equal(layer.children.length, 3);
  feedback.update(100);
  assert.equal(layer.children.length, 0);
  layer.destroy(); actor.destroy();
});

test('barricade contact and damage feedback have independent throttles', () => {
  const layer = new Container();
  const actor = new Graphics();
  const feedback = new CombatFeedback(layer);
  feedback.tower('spike_barricade', actor, 100, 100);
  feedback.hurt(actor);
  assert.equal(layer.children.length, 2);
  feedback.tower('spike_barricade', actor, 100, 100);
  feedback.hurt(actor);
  assert.equal(layer.children.length, 2);
  feedback.update(6);
  feedback.hurt(actor);
  assert.equal(layer.children.length, 3);
  feedback.tower('spike_barricade', actor, 100, 100);
  assert.equal(layer.children.length, 3);
  feedback.update(30);
  layer.destroy(); actor.destroy();
});
