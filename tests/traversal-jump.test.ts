import assert from 'node:assert/strict';
import test from 'node:test';
import { createTraversalJump } from '../src/systems/traversalJump.ts';

test('jump at a supporting contact consumes both input and airborne allowance', () => {
  const jump = createTraversalJump();
  jump.advance(1 / 60, true, true, false);
  assert.equal(jump.consume(false), true);
  assert.equal(jump.consume(false), false);
  jump.advance(1 / 60, true, false, false);
  assert.equal(jump.consume(false), false, 'another press in the air cannot jump twice');
});

test('coyote time accepts a late press inside 110ms and rejects expired support', () => {
  for (const seconds of [.1, .11, .12]) {
    const jump = createTraversalJump();
    jump.advance(0, false, true, false);
    jump.advance(seconds, true, false, false);
    assert.equal(jump.consume(false), seconds <= .11);
  }
});

test('buffer executes once on landing within 100ms, expires outside its window', () => {
  for (const delay of [.09, .1, .11]) {
    const jump = createTraversalJump();
    jump.advance(0, true, false, false);
    assert.equal(jump.consume(false), false);
    jump.advance(delay, false, false, false);
    jump.support();
    assert.equal(jump.consume(false), delay <= .1);
    assert.equal(jump.consume(false), false);
  }
});

test('holding a button does not replay a consumed press on the next landing', () => {
  const jump = createTraversalJump();
  jump.advance(0, true, true, false);
  assert.equal(jump.consume(false), true);
  jump.advance(.6, false, false, false);
  jump.support();
  assert.equal(jump.consume(false), false);
  jump.advance(.01, true, true, false);
  assert.equal(jump.consume(false), true, 'a genuinely new press can launch again');
});

test('recovery discards a buffered press and cannot be bypassed at contact', () => {
  const jump = createTraversalJump();
  jump.advance(0, true, false, false);
  jump.support();
  assert.equal(jump.consume(true), false);
  jump.advance(.6, false, true, true);
  assert.equal(jump.consume(false), false);
  jump.advance(.01, true, true, false);
  assert.equal(jump.consume(false), true);
});

test('window lengths use elapsed seconds at 30/60/120FPS and after a long frame', () => {
  for (const fps of [30, 60, 120]) {
    const jump = createTraversalJump();
    jump.advance(0, false, true, false);
    const steps = Math.round(fps * .1);
    for (let i = 0; i < steps; i++) jump.advance(1 / fps, i === steps - 1, false, false);
    assert.equal(jump.consume(false), true);
    const late = createTraversalJump();
    late.advance(0, false, true, false);
    for (let i = 0; i < Math.ceil(fps * .12); i++) late.advance(1 / fps, false, false, false);
    late.advance(0, true, false, false);
    assert.equal(late.consume(false), false);
  }
  const longFrame = createTraversalJump();
  longFrame.advance(0, true, false, false);
  longFrame.advance(.25, false, false, false);
  longFrame.support();
  assert.equal(longFrame.consume(false), false, 'a long frame cannot stretch the input buffer');
});

test('invalid elapsed values cannot create new input buffers', () => {
  for (const seconds of [NaN, Infinity, -1]) {
    const jump = createTraversalJump();
    jump.advance(seconds, true, true, false);
    assert.equal(jump.consume(false), false);
  }
});
