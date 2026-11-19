import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Container, Rectangle, Sprite, Texture, TextureSource } from 'pixi.js';
import { createKaelenAnimation, type KaelenAnimationClips } from '../src/visual/kaelenAnimation.ts';

test('shipped clips animate real Pixi sprites without changing actor transforms or foot anchor', () => {
  const atlas = JSON.parse(readFileSync(new URL('../public/art/kaelen/atlas.json', import.meta.url), 'utf8'));
  const source = new TextureSource({ width: 1536, height: 1024 });
  const clips: KaelenAnimationClips = {};
  for (const state of ['idle', 'walk', 'attack', 'hurt'] as const) {
    clips[state] = { frameTicks: atlas.clips[state].frameTicks,
      frames: atlas.clips[state].frames.map((r: {x:number;y:number;width:number;height:number}) =>
        new Texture({ source, frame: new Rectangle(r.x,r.y,r.width,r.height) })) };
  }
  const actor = new Container();
  actor.position.set(365,405);
  actor.alpha = 0.45;
  const sprite = new Sprite(clips.idle!.frames[0]);
  sprite.anchor.set(atlas.pivot.x / atlas.cell.width,atlas.pivot.y / atlas.cell.height);
  sprite.position.set(0,8);
  sprite.scale.set(58/atlas.bodyHeight);
  actor.addChild(sprite);
  const animation = createKaelenAnimation(sprite,clips);
  const input = { moving: true, directionX: 1, directionY: 0 };
  const properties = () => [actor.x,actor.y,actor.alpha,sprite.x,sprite.y,sprite.rotation,
    sprite.scale.x,sprite.scale.y,sprite.anchor.x,sprite.anchor.y];
  const before = properties();
  function invariant() {
    assert.deepEqual(properties(),before);
    assert.equal(sprite.texture.source,source);
    assert.equal(sprite.texture.width,256);
    assert.equal(sprite.texture.height,256);
  }
  try {
    animation.update(0,input);
    assert.equal(sprite.texture,clips.walk!.frames[0]);
    animation.update(5,input);
    assert.equal(sprite.texture,clips.walk!.frames[1]);
    invariant();
    animation.attack(1,0);
    animation.update(4,input);
    assert.equal(sprite.texture,clips.attack!.frames[2]);
    invariant();
    animation.hurt(-1,0);
    animation.update(6,input);
    assert.equal(sprite.texture,clips.hurt!.frames[3]);
    invariant();
    animation.update(6,{...input,moving:false});
    assert.equal(animation.state,'idle');
    assert.equal(sprite.texture,clips.idle!.frames[0]);
    invariant();
    animation.reset();
    invariant();
  } finally {
    actor.destroy({children:true});
    for (const clip of Object.values(clips)) for (const texture of clip.frames) texture.destroy();
    source.destroy();
  }
});
