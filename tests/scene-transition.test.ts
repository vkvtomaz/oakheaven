import assert from 'node:assert/strict';
import test from 'node:test';
import { Container, Graphics } from 'pixi.js';
import { createSceneTransition } from '../src/visual/sceneTransition.ts';

test('scene reveal leaves world transforms and input untouched and releases its overlay', () => {
  const stage = new Container();
  const world = stage.addChild(new Container());
  world.position.set(75, 110);
  world.eventMode = 'static';
  const transition = createSceneTransition(stage, 960, 540);
  const overlay = stage.children[1] as Graphics;
  assert.equal(overlay.eventMode, 'none');
  assert.equal(overlay.interactiveChildren, false);
  transition.update(9);
  assert.ok(Math.abs(overlay.alpha - 0.225) < 1e-8);
  assert.deepEqual([world.x, world.y, world.eventMode], [75, 110, 'static']);
  transition.update(9);
  assert.equal(overlay.destroyed, true);
  assert.deepEqual(stage.children, [world]);
  assert.doesNotThrow(() => transition.update(18));
  stage.destroy({ children: true });
});

test('scene replacement may destroy an unfinished reveal without stale graphics updates', () => {
  const stage = new Container();
  const transition = createSceneTransition(stage, 960, 540);
  stage.removeChildren().forEach(child => child.destroy());
  assert.doesNotThrow(() => transition.update(1));
  assert.equal(stage.children.length, 0);
  stage.destroy();
});
