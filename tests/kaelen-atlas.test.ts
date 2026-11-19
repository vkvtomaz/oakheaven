import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const directory = new URL('../public/art/kaelen/', import.meta.url);
const atlas = JSON.parse(readFileSync(new URL('atlas.json', directory), 'utf8'));
const png = readFileSync(new URL(atlas.image, directory));

test('shipped Kaelen atlas is RGBA PNG and every playback rectangle fits one shared image', () => {
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png[24], 8, '8-bit channels');
  assert.equal(png[25], 6, 'real RGBA storage');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.ok(atlas.bodyHeight > 0 && atlas.bodyHeight <= atlas.cell.height);
  assert.ok(atlas.pivot.x > 0 && atlas.pivot.x < atlas.cell.width);
  assert.ok(atlas.pivot.y > 0 && atlas.pivot.y <= atlas.cell.height);
  const positions = new Set<string>();
  for (const state of ['idle', 'walk', 'attack', 'hurt']) {
    const clip = atlas.clips[state];
    assert.ok(clip.frames.length >= 2, state + ' needs distinct drawn frames');
    assert.ok(Number.isFinite(clip.frameTicks) && clip.frameTicks > 0);
    for (const frame of clip.frames) {
      assert.equal(frame.width, atlas.cell.width);
      assert.equal(frame.height, atlas.cell.height);
      assert.ok(frame.x >= 0 && frame.y >= 0);
      assert.ok(frame.x + frame.width <= width && frame.y + frame.height <= height);
      const key = frame.x + ',' + frame.y;
      assert.ok(!positions.has(key), 'different clips cannot reuse a static pose as animation');
      positions.add(key);
    }
  }
});

test('attack recovers within basic cooldown and damage within existing invulnerability', () => {
  assert.ok(atlas.clips.attack.frames.length * atlas.clips.attack.frameTicks <= 22);
  assert.ok(atlas.clips.hurt.frames.length * atlas.clips.hurt.frameTicks <= 42);
});
