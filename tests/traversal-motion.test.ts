import assert from 'node:assert/strict';
import test from 'node:test';
import { createTraversalImpactMotion, createTraversalMotion, type TraversalMotionInput } from '../src/visual/traversalMotion.ts';

const idle: TraversalMotionInput = {
  distanceX: 0, velocityY: 0, grounded: true, landed: false, stumbling: false,
};

test('travessia avança idle e sincroniza caminhada com distância real, inclusive na lama', () => {
  const motion = createTraversalMotion();
  assert.equal(motion.update(12, idle).frameIndex, 1);
  const walk = { ...idle, distanceX: 15 };
  const pose = motion.update(1, walk);
  assert.equal(pose.state, 'walk');
  assert.equal(pose.clip, 'walk');
  assert.equal(pose.frameIndex, 1);
  assert.equal(motion.update(1, { ...walk, distanceX: 75 }).frameIndex, 0);
  const slow = createTraversalMotion();
  const fast = createTraversalMotion();
  let a, b;
  for (let i = 0; i < 6; i++) a = slow.update(1, { ...idle, distanceX: 2.5 });
  for (let i = 0; i < 3; i++) b = fast.update(1, { ...idle, distanceX: 5 });
  assert.equal(a!.frameIndex, b!.frameIndex);
  assert.equal(slow.update(1, idle).state, 'idle');
});

test('salto, queda e pouso possuem poses distintas e pouso recupera sem bloquear movimento', () => {
  const motion = createTraversalMotion();
  const jump = motion.update(1, { ...idle, grounded: false, velocityY: -12 });
  assert.equal(jump.state, 'jump');
  assert.equal(jump.clip, 'walk');
  const fall = motion.update(1, { ...idle, grounded: false, velocityY: 3 });
  assert.equal(fall.state, 'fall');
  assert.notEqual(jump.frameIndex, fall.frameIndex);
  let land = motion.update(1, { ...idle, landed: true, distanceX: 3.45 });
  assert.equal(land.state, 'land');
  assert.ok(land.scaleX > fall.scaleX);
  assert.ok(land.scaleY < fall.scaleY);
  for (let i = 0; i < 12; i++) land = motion.update(1, { ...idle, distanceX: 3.45 });
  assert.equal(land.state, 'walk');
  // A new jump immediately interrupts cosmetic landing recovery.
  motion.update(1, { ...idle, landed: true });
  assert.equal(motion.update(1, { ...idle, grounded: false, velocityY: -8 }).state, 'jump');
});

test('direção persiste ao parar e recuperação não reproduz passos sem deslocamento', () => {
  const motion = createTraversalMotion();
  assert.equal(motion.update(1, { ...idle, distanceX: -4 }).facing, -1);
  assert.equal(motion.update(1, idle).facing, -1);
  assert.equal(motion.update(1, { ...idle, stumbling: true }).state, 'recover');
  assert.equal(motion.update(1, { ...idle, distanceX: 4 }).facing, 1);
});

test('recuperação comunica a fração restante e retoma caminhada ao terminar', () => {
  const motion = createTraversalMotion();
  let pose = motion.update(1, { ...idle, stumbling: true, recoveryProgress: 0 });
  assert.equal(pose.state, 'recover');
  assert.equal(pose.phase, 'recover');
  const compressed = pose.scaleY;
  for (let i = 0; i < 36; i++) {
    pose = motion.update(1, { ...idle, stumbling: true, recoveryProgress: i / 36 });
    assert.equal(pose.state, 'recover');
    assert.ok(Math.abs(pose.rotation) < .05);
  }
  assert.ok(pose.scaleY > compressed);
  pose = motion.update(1, { ...idle, distanceX: 3.45 });
  assert.equal(pose.state, 'walk');
});

test('vibração breve só dispara em impacto forte e respeita movimento reduzido', () => {
  const normal = createTraversalImpactMotion();
  assert.deepEqual(normal.update(1, false), { x: 0, y: 0 });
  let moved = false;
  for (let i = 0; i < 12; i++) {
    const offset = normal.update(1, i === 0);
    moved ||= Math.abs(offset.x) + Math.abs(offset.y) > 0;
    assert.ok(Math.abs(offset.x) <= 1.6 && Math.abs(offset.y) <= 1.6);
    if (i >= 7) assert.deepEqual(offset, { x: 0, y: 0 });
  }
  assert.ok(moved);
  const reduced = createTraversalImpactMotion(true);
  for (let i = 0; i < 10; i++) assert.deepEqual(reduced.update(1, i === 0), { x: 0, y: 0 });
  normal.update(1, true);
  assert.deepEqual(normal.update(1, false, true), { x: 0, y: 0 }, 'changing preference suppresses active shake');
});

test('salto aceito comprime, estende, passa pelo ápice e absorve pouso sem alterar entradas físicas', () => {
  for (const dt of [.5, 1, 2]) {
    const motion = createTraversalMotion();
    motion.update(dt, idle);
    const phases = new Set<string>();
    let velocityY = -12.5;
    let minScale = 1, maxScale = 1;
    for (let tick = 0; tick < 42; tick += dt) {
      velocityY += .6 * dt;
      const input = Object.freeze({ ...idle, grounded: false, velocityY, jumped: tick === 0 });
      const pose = motion.update(dt, input);
      phases.add(pose.phase);
      minScale = Math.min(minScale, pose.scaleY);
      maxScale = Math.max(maxScale, pose.scaleY);
      assert.equal(input.velocityY, velocityY);
      assert.equal(input.grounded, false);
      assert.ok(Number.isFinite(pose.offsetY));
    }
    for (const phase of ['compress', 'extend', 'apex', 'fall']) assert.ok(phases.has(phase), `phase ${phase} at dt=${dt}`);
    assert.ok(minScale < .99, 'takeoff visibly flexes');
    assert.ok(maxScale > 1.01, 'takeoff extends after flexion');
    assert.equal(motion.update(dt, { ...idle, landed: true }).phase, 'land');
    let recovered;
    for (let ticks = 0; ticks < 24; ticks += dt) recovered = motion.update(dt, idle);
    assert.equal(recovered!.state, 'idle');
    assert.ok(Math.abs(recovered!.scaleY - 1) < .02);
  }
});

test('queda de borda não inventa impulsão e novo salto interrompe recuperação', () => {
  const motion = createTraversalMotion();
  motion.update(1, idle);
  const ledge = motion.update(1, { ...idle, grounded: false, velocityY: .6 });
  assert.equal(ledge.phase, 'fall');
  assert.equal(ledge.state, 'fall');
  motion.update(1, { ...idle, landed: true });
  const jump = motion.update(1, { ...idle, grounded: false, velocityY: -11.9, jumped: true });
  assert.equal(jump.phase, 'compress');
  assert.equal(jump.state, 'jump');
});

test('apresentação mantém entradas imutáveis e transforms leves em 30/60/120 FPS', () => {
  for (const fps of [30, 60, 120]) {
    const motion = createTraversalMotion();
    const ticks = 60 / fps;
    const input = Object.freeze({ ...idle, distanceX: 3.45 * ticks });
    for (let i = 0; i < fps * 2; i++) {
      const pose = motion.update(ticks, input);
      assert.ok(pose.scaleX >= .95 && pose.scaleX <= 1.09);
      assert.ok(pose.scaleY >= .87 && pose.scaleY <= 1.05);
      assert.ok(Math.abs(pose.rotation) <= .04);
      assert.ok(Math.abs(pose.offsetY) <= .71);
      assert.ok(pose.frameIndex >= 0 && pose.frameIndex < 6);
    }
    assert.deepEqual(input, { ...idle, distanceX: 3.45 * ticks });
    for (const dt of [NaN, Infinity, -5]) {
      const pose = motion.update(dt, idle);
      for (const value of [pose.scaleX, pose.scaleY, pose.rotation, pose.offsetY]) assert.ok(Number.isFinite(value));
    }
  }
});
