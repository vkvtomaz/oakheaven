import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { SceneLayers } from './layers';
import { createTraversalImpactMotion, createTraversalMotion, type TraversalMotionInput } from './traversalMotion';

interface Platform { x: number; y: number; width: number; height: number }
export interface TraversalPresentation {
  update(dt: number, playerX: number, hardImpact?: boolean): void;
  /** Release only textures generated for this visit, never loaded/shared art. */
  destroy(): void;
}

interface TraversalScenery {
  /** Transparent, full-canvas scenery; all art shares the backdrop's framing. */
  midground?: CanvasImageSource;
  foreground?: CanvasImageSource;
}

let backdrop: Texture;
let grain: HTMLCanvasElement;
let paving: HTMLCanvasElement;
let haze: Texture;
let glow: Texture;
let midground: Texture | undefined;
let foreground: Texture | undefined;
let salvageTexture: Texture | undefined;
const heroUpdates = new WeakMap<Graphics, (dt: number, input: TraversalMotionInput) => void>();

function surface(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = width; result.height = height;
  return result;
}

/** Material-only samples avoid the source prop's perspective and white fringe.
 * Derived canvases are prepared once, never in the animation loop.
 */
export function prepareTraversalArt(
  source: CanvasImageSource, timber: CanvasImageSource, stone: CanvasImageSource,
  scenery: TraversalScenery = {},
): void {
  backdrop = Texture.from(source);
  midground = scenery.midground ? Texture.from(scenery.midground) : undefined;
  foreground = scenery.foreground ? Texture.from(scenery.foreground) : undefined;
  grain = surface(64, 24);
  grain.getContext('2d')!.drawImage(timber, 222, 48, 64, 24, 0, 0, 64, 24);
  // The authored path supplies the paving in the same perspective as the world.
  // Keep stone in the preparation API for compatible future material variants.
  void stone;
  paving = surface(960, 540);
  const sourceSize = source as { width: number; height: number };
  const cover = Math.max(968 / sourceSize.width, 544 / sourceSize.height);
  paving.getContext('2d')!.drawImage(source,
    (960 - sourceSize.width * cover) / 2, (540 - sourceSize.height * cover) / 2,
    sourceSize.width * cover, sourceSize.height * cover);
  const cloud = surface(128, 128), ctx = cloud.getContext('2d')!;
  const fog = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  fog.addColorStop(0, '#8492a777'); fog.addColorStop(.55, '#75809528'); fog.addColorStop(1, '#75809500');
  ctx.fillStyle = fog; ctx.fillRect(0, 0, 128, 128); haze = Texture.from(cloud);
  const light = surface(128, 128), lightCtx = light.getContext('2d')!;
  const falloff = lightCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  falloff.addColorStop(0, '#ffffff99'); falloff.addColorStop(.3, '#ffffff44'); falloff.addColorStop(1, '#ffffff00');
  lightCtx.fillStyle = falloff; lightCtx.fillRect(0, 0, 128, 128); glow = Texture.from(light);
}

/** The existing SE atlas supplies real idle/walk frames. Takeoff, apex and fall
 * reuse existing poses; they are not authored aerial animation clips.
 */
export function createTraversalHero(): Graphics {
  const base = import.meta.env.BASE_URL + 'art/kaelen/';
  const atlas = Assets.get<{ cell: { width: number; height: number };
    pivot: { x: number; y: number }; bodyHeight: number;
    clips: Record<'idle' | 'walk', { frames: { x: number; y: number; width: number; height: number }[] }> }>(base + 'atlas.json');
  const sheet = Assets.get<Texture>(base + 'kaelen-se.png');
  const frames = { idle: [] as Texture[], walk: [] as Texture[] };
  for (const clip of ['idle', 'walk'] as const) {
    frames[clip] = atlas.clips[clip].frames.map(rect => new Texture({ source: sheet.source,
      frame: new Rectangle(rect.x, rect.y, rect.width, rect.height) }));
  }
  const root = new Graphics();
  const contactShadow = new Graphics().ellipse(0, 0, 15, 3)
    .fill({ color: 0x03070c, alpha: .55 });
  contactShadow.position.set(0, 1);
  contactShadow.label = 'kaelen-contact-shadow';
  contactShadow.eventMode = 'none';
  const sprite = new Sprite(frames.idle[0]);
  sprite.anchor.set(atlas.pivot.x / atlas.cell.width, atlas.pivot.y / atlas.cell.height);
  const scale = 62 / atlas.bodyHeight;
  sprite.scale.set(scale);
  // A second, softly tinted silhouette separates armor from the ruined backdrop.
  // It shares the frame texture and moves with the body; no blur/filter pass.
  const rim = new Sprite(sprite.texture);
  rim.anchor.copyFrom(sprite.anchor); rim.scale.set(scale * 1.035);
  rim.tint = 0xffd9a0; rim.alpha = .18; rim.position.set(-.6, -.6);
  const recoveryBar = new Graphics().rect(-19, -72, 38, 4)
    .fill({ color: 0x10171b, alpha: .8 });
  recoveryBar.label = 'kaelen-recovery-bar'; recoveryBar.visible = false;
  const recoveryFill = new Graphics().rect(0, 0, 36, 2)
    .fill({ color: 0xd5b47a, alpha: .8 });
  recoveryFill.position.set(-18, -71); recoveryBar.addChild(recoveryFill);
  root.addChild(contactShadow, rim, sprite, recoveryBar); root.eventMode = 'none';
  const motion = createTraversalMotion(frames.idle.length, frames.walk.length);
  heroUpdates.set(root, (dt, input) => {
    const pose = motion.update(dt, input);
    // Contact follows actual support from scene collisions, never the airborne
    // sprite. Hide only this child so Kaelen remains visible throughout flight.
    contactShadow.visible = input.grounded;
    recoveryBar.visible = input.stumbling && input.grounded;
    recoveryFill.scale.x = Math.max(0, Math.min(1, input.recoveryProgress ?? 0));
    sprite.texture = frames[pose.clip][pose.frameIndex]!;
    sprite.label = 'kaelen-' + pose.state;
    // Screen-direction reflection is only a traversal presentation compromise:
    // the available atlas has one oblique direction, not left/right lateral art.
    sprite.scale.set(scale * pose.scaleX * pose.facing, scale * pose.scaleY);
    sprite.rotation = pose.rotation; sprite.y = pose.offsetY;
    rim.texture = sprite.texture;
    rim.scale.set(sprite.scale.x * 1.035, sprite.scale.y * 1.035);
    rim.rotation = sprite.rotation; rim.y = sprite.y - .6;
  });
  root.on('destroyed', () => {
    heroUpdates.delete(root);
    for (const texture of [...frames.idle, ...frames.walk]) texture.destroy(false);
  });
  return root;
}

export function updateTraversalHero(root: Graphics, dt: number, input: TraversalMotionInput): void {
  heroUpdates.get(root)?.(dt, input);
}

/** Reclaimed scaffold boards: shared wood material, splintered ends, old nail
 * holes and binding cord. The base rests exactly on the existing platform deck.
 */
export function createTraversalSalvage(): Graphics {
  if (!salvageTexture) {
    const canvas = surface(144, 80), ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2); ctx.translate(36, 34);
    const material = ctx.createPattern(grain, 'repeat')!;
    const boards = [
      { x: -25, y: -4, w: 45, h: 6, angle: -.06 },
      { x: -21, y: -9, w: 47, h: 6, angle: .04 },
      { x: -24, y: -13, w: 41, h: 6, angle: -.12 },
      { x: -15, y: -18, w: 39, h: 6, angle: .13 },
    ];
    for (const board of boards) {
      ctx.save(); ctx.translate(board.x, board.y); ctx.rotate(board.angle);
      ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(board.w - 3, 0);
      ctx.lineTo(board.w, 1); ctx.lineTo(board.w - 2, 3);
      ctx.lineTo(board.w, board.h - 1); ctx.lineTo(2, board.h);
      ctx.lineTo(0, board.h - 2); ctx.closePath();
      ctx.shadowColor = '#030609'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
      ctx.fillStyle = material; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#a8874944'; ctx.fill();
      ctx.strokeStyle = '#d0b27b88'; ctx.lineWidth = .65;
      ctx.beginPath(); ctx.moveTo(2, .6); ctx.lineTo(board.w - 4, .6); ctx.stroke();
      ctx.fillStyle = '#10181b';
      ctx.fillRect(5, 2, 1.3, 1.3); ctx.fillRect(board.w - 7, 2, 1.3, 1.3);
      ctx.restore();
    }
    // Loosely bound salvage, already gathered by workers before the collapse.
    for (const x of [-9, 10]) {
      ctx.strokeStyle = '#211b14'; ctx.lineWidth = 2.3;
      ctx.beginPath(); ctx.moveTo(x - 1, -18); ctx.lineTo(x + 2, -1); ctx.stroke();
      ctx.strokeStyle = '#b49b6c'; ctx.lineWidth = .8; ctx.stroke();
    }
    salvageTexture = Texture.from({ resource: canvas, resolution: 2 });
  }
  const root = new Graphics().ellipse(0, -.1, 27, 3)
    .fill({ color: 0x060a0b, alpha: .65 });
  const sprite = new Sprite(salvageTexture); sprite.anchor.set(.5, 34 / 40);
  root.addChild(sprite);
  const glint = new Graphics().moveTo(18, -14).lineTo(18, -9)
    .moveTo(15.5, -11.5).lineTo(20.5, -11.5)
    .stroke({ color: 0xf6d399, alpha: .65, width: .8 });
  glint.label = 'salvage-glint'; root.addChild(glint);
  root.eventMode = 'none';
  return root;
}

/** A supported timber scaffold. Deck y=0 is the EXACT landing surface.
 * Supports and ropes are presentation only; they never create a collider.
 */
function scaffold(platform: Platform, ground: number, textures: Texture[]): Sprite {
  const width = platform.width, height = ground - platform.y;
  const canvas = surface((width + 16) * 2, (height + 12) * 2), ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.translate(8, 0);
  const material = ctx.createPattern(grain, 'repeat')!;
  function beam(ax: number, ay: number, bx: number, by: number, thickness: number): void {
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(by - ay, bx - ax));
    const length = Math.hypot(bx - ax, by - ay);
    ctx.shadowColor = '#05090bd9'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#151a1c'; ctx.fillRect(0, -thickness / 2 - 1, length, thickness + 2);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = material; ctx.fillRect(0, -thickness / 2, length, thickness);
    // Warm reflection fades with distance from the left-hand fire.
    ctx.fillStyle = platform.x < 300 ? '#332b2377' : '#10191c99';
    ctx.fillRect(0, -thickness / 2, length, thickness);
    ctx.fillStyle = '#bcac7b44'; ctx.fillRect(0, -thickness / 2, length, 1);
    ctx.fillStyle = '#070b0bcc'; ctx.fillRect(0, thickness / 2 - 2, length, 2);
    ctx.restore();
  }
  // Uprights touch ground, with a mid rail and diagonal bracing.
  beam(12, 12, 12, height + 2, 9);
  beam(width - 12, 12, width - 12, height + 2, 9);
  beam(12, height * .55, width - 12, height * .55, 7);
  beam(16, 18, width - 16, height - 8, 6);
  if (height > 100) beam(16, height - 8, width - 16, 18, 5);
  beam(-2, 11, width + 2, 11, 10);
  // Authored wood grain on individual boards, with irregular end grain.
  for (let x = 0; x < width; x += 15) {
    const boardWidth = Math.min(14, width - x);
    ctx.fillStyle = material; ctx.fillRect(x, 0, boardWidth, 7);
    ctx.fillStyle = x % 30 ? '#17232677' : '#1c242488';
    ctx.fillRect(x, 0, boardWidth, 7);
    ctx.fillStyle = '#b7a57a77'; ctx.fillRect(x, 0, boardWidth, 1);
    ctx.fillStyle = '#0b1011'; ctx.fillRect(x + 3, 3, 1.5, 1.5);
  }
  // Iron nails / joinery; rope collars bind the believable structural joints.
  for (const x of [12, width - 12]) {
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = '#8f7e5966'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 5, 16 + k * 2); ctx.lineTo(x + 5, 17 + k * 2); ctx.stroke();
    }
    ctx.fillStyle = '#9c997566'; ctx.fillRect(x - 1, height * .55 - 1, 2, 2);
    // Buried ends and fractured masonry anchor the posts to the paving.
    ctx.fillStyle = '#151c1d';
    ctx.beginPath(); ctx.moveTo(x - 9, height + 6); ctx.lineTo(x - 5, height - 1);
    ctx.lineTo(x + 7, height - 2); ctx.lineTo(x + 11, height + 6); ctx.fill();
    ctx.strokeStyle = '#6d756055'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x - 5, height); ctx.lineTo(x + 7, height - 1); ctx.stroke();
  }
  const texture = Texture.from({ resource: canvas, resolution: 2 });
  textures.push(texture);
  const sprite = new Sprite(texture);
  sprite.position.set(platform.x - 8, platform.y);
  sprite.eventMode = 'none';
  return sprite;
}

export function paintTraversalScene(
  layers: SceneLayers, platforms: readonly Platform[], ground: number,
  mudAreas: readonly Platform[] = [],
): TraversalPresentation {
  if (!backdrop || !grain) throw new Error('Traversal art not prepared');
  const ownedTextures: Texture[] = [];
  const groups: Container[] = [];
  let disposed = false;
  function group(parent: Container): Container {
    const result = new Container(); result.eventMode = 'none';
    parent.addChild(result); groups.push(result); return result;
  }
  function raster(texture: Texture): Sprite {
    const sprite = new Sprite(texture);
    const cover = Math.max(968 / texture.width, 544 / texture.height);
    sprite.scale.set(cover);
    sprite.position.set((960 - sprite.width) / 2, (540 - sprite.height) / 2);
    sprite.eventMode = 'none'; return sprite;
  }
  function generated(canvas: HTMLCanvasElement): Texture {
    const texture = Texture.from(canvas); ownedTextures.push(texture); return texture;
  }
  const distant = group(layers.ground);
  // The supplied image is environment-only, never a baked playable scene/HUD.
  distant.addChild(raster(backdrop));
  const architecture = group(layers.ground);
  if (midground) architecture.addChild(raster(midground));

  // Material paving is feathered into the illustrated ground, never a hard tile.
  const floor = surface(960, 110), floorCtx = floor.getContext('2d')!;
  floorCtx.drawImage(paving, 0, ground - 25, 960, 110, 0, 0, 960, 110);
  floorCtx.globalCompositeOperation = 'destination-in';
  const edge = floorCtx.createLinearGradient(0, 0, 0, 110);
  edge.addColorStop(0, '#ffffff00'); edge.addColorStop(.23, '#ffffff'); edge.addColorStop(1, '#ffffff');
  floorCtx.fillStyle = edge; floorCtx.fillRect(0, 0, 960, 110);
  // Break the repeated sample with dirt seams and low-opacity irregular rubble.
  floorCtx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 65; i++) {
    const x = i * 137 % 960, y = 15 + i * 43 % 69;
    floorCtx.fillStyle = i % 3 ? '#0b161c55' : '#73816b33';
    floorCtx.beginPath(); floorCtx.moveTo(x, y); floorCtx.lineTo(x + 3, y - 2);
    floorCtx.lineTo(x + 8 + i % 5, y); floorCtx.lineTo(x + 6, y + 3); floorCtx.closePath(); floorCtx.fill();
  }
  const pavingSprite = new Sprite(generated(floor)); pavingSprite.position.set(0, ground - 25);
  pavingSprite.eventMode = 'none'; architecture.addChild(pavingSprite);

  const structure = group(layers.groundDecals);
  // Reuse the authored paving's grain instead of laying flat polygon slabs on it.
  // The dark cores stay inside the gameplay zones; feathering softens their edges.
  for (const area of mudAreas) {
    const width = area.width + 24, height = 42;
    const patch = surface(width * 2, height * 2), ctx = patch.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.beginPath(); ctx.moveTo(3, 16); ctx.lineTo(14, 9);
    ctx.lineTo(width * .32, 6); ctx.lineTo(width * .59, 9);
    ctx.lineTo(width - 17, 7); ctx.lineTo(width - 2, 19);
    ctx.lineTo(width - 12, 32); ctx.lineTo(width * .65, 36);
    ctx.lineTo(width * .39, 33); ctx.lineTo(15, 36); ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.drawImage(paving, area.x - 12, area.y - 10, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#4d4934'; ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 7; i++) {
      const x = 18 + i * 23 % (width - 36), y = 15 + i * 7 % 14;
      ctx.fillStyle = i % 2 ? '#19211dcc' : '#262a2099';
      ctx.beginPath(); ctx.ellipse(x, y, 9 + i % 3 * 3, 1.8 + i % 2, -.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a6a28c55'; ctx.lineWidth = .65;
      ctx.beginPath(); ctx.ellipse(x - 1, y - .6, 6 + i % 3, 1.1, -.1, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'destination-in';
    const fadeX = ctx.createLinearGradient(0, 0, width, 0);
    fadeX.addColorStop(0, '#ffffff00'); fadeX.addColorStop(.12, '#ffffff');
    fadeX.addColorStop(.88, '#ffffff'); fadeX.addColorStop(1, '#ffffff00');
    ctx.fillStyle = fadeX; ctx.fillRect(0, 0, width, height);
    const fadeY = ctx.createLinearGradient(0, 0, 0, height);
    fadeY.addColorStop(0, '#ffffff00'); fadeY.addColorStop(.34, '#ffffffbb');
    fadeY.addColorStop(.68, '#ffffffaa'); fadeY.addColorStop(1, '#ffffff00');
    ctx.fillStyle = fadeY; ctx.fillRect(0, 0, width, height);
    const texture = Texture.from({ resource: patch, resolution: 2 });
    ownedTextures.push(texture);
    const sprite = new Sprite(texture); sprite.position.set(area.x - 12, area.y - 10);
    sprite.eventMode = 'none'; structure.addChild(sprite);
  }
  for (const p of platforms) {
    const shadow = new Graphics().ellipse(p.x + p.width / 2, ground + 3, p.width * .55, 6)
      .fill({ color: 0x03090d, alpha: .38 });
    shadow.eventMode = 'none'; structure.addChild(shadow, scaffold(p, ground, ownedTextures));
  }
  // Sagging safety ropes attach at deck corners; they do not depict walkways.
  const ropeCanvas = surface(960, 540), ropeCtx = ropeCanvas.getContext('2d')!;
  for (let i = 1; i < platforms.length; i++) {
    const a = platforms[i - 1]!, b = platforms[i]!;
    for (const [color, width] of [['#0a101299', 3], ['#72644888', 1.4], ['#baa47744', .45]] as const) {
      ropeCtx.beginPath(); ropeCtx.moveTo(a.x + a.width - 4, a.y + 10);
      ropeCtx.quadraticCurveTo((a.x + a.width + b.x) / 2, Math.max(a.y, b.y) + 48, b.x + 4, b.y + 10);
      ropeCtx.strokeStyle = color; ropeCtx.lineWidth = width; ropeCtx.stroke();
    }
  }
  // Rope collars are continuous with the deck joint, not floating over empty air.
  for (const p of platforms) {
    for (const x of [p.x + 12, p.x + p.width - 12]) {
      for (let i = 0; i < 3; i++) {
        ropeCtx.strokeStyle = '#a08b5b'; ropeCtx.lineWidth = .65;
        ropeCtx.beginPath(); ropeCtx.moveTo(x - 5, p.y + 10 + i * 2);
        ropeCtx.lineTo(x + 5, p.y + 11 + i * 2); ropeCtx.stroke();
      }
    }
  }
  const ropes = new Sprite(generated(ropeCanvas)); ropes.eventMode = 'none'; structure.addChild(ropes);

  const warm = new Sprite(glow); warm.anchor.set(.5); warm.position.set(100, 391);
  warm.width = 240; warm.height = 190; warm.tint = 0xff8a33; warm.alpha = .36;
  const violet = new Sprite(glow); violet.anchor.set(.5); violet.position.set(914, 380);
  violet.width = 190; violet.height = 150; violet.tint = 0xbb64ff; violet.alpha = .3;
  warm.eventMode = 'none'; violet.eventMode = 'none'; structure.addChild(warm, violet);
  // A low reflected pool and a localized opening light lead into the existing
  // violet passage, without drawing an arrow or obscuring the walkable floor.
  const passageLight = new Sprite(glow); passageLight.anchor.set(.5);
  passageLight.position.set(923, ground - 35); passageLight.width = 128; passageLight.height = 116;
  passageLight.tint = 0xd7b1ff; passageLight.alpha = .22; passageLight.eventMode = 'none';
  const exitReflection = new Sprite(glow); exitReflection.anchor.set(.5);
  exitReflection.position.set(915, ground + 3); exitReflection.width = 130; exitReflection.height = 19;
  exitReflection.tint = 0xbb9dd4; exitReflection.alpha = .2; exitReflection.eventMode = 'none';
  structure.addChild(passageLight, exitReflection);

  // Finite pools: five soft smoke wisps and fourteen sparks, no allocations/update.
  const smoke = Array.from({ length: 5 }, (_, i) => {
    const sprite = new Sprite(haze); sprite.anchor.set(.5); sprite.tint = 0x404751;
    sprite.position.set(72 + i * 11, 364 - i * 40); sprite.scale.set(1 + i * .2); sprite.alpha = .3;
    sprite.eventMode = 'none'; architecture.addChild(sprite); return sprite;
  });
  const atmosphere = group(layers.vfx);
  const sparks = Array.from({ length: 14 }, (_, i) => {
    const spark = new Graphics().ellipse(0, 0, i % 3 ? .8 : 1.2, 1.6)
      .fill({ color: i % 2 ? 0xffb967 : 0xef7438, alpha: .7 });
    spark.eventMode = 'none'; atmosphere.addChild(spark); return spark;
  });
  const foregroundGroup = group(layers.vfx);
  if (foreground) {
    // Keep near-camera props below both the actor's feet and the exit labels.
    const front = raster(foreground);
    const mask = new Graphics().rect(0, 490, 960, 50).fill(0xffffff);
    foregroundGroup.addChild(front, mask); front.mask = mask;
  }
  const groundMist = new Sprite(haze); groundMist.anchor.set(.5);
  groundMist.position.set(925, ground + 8); groundMist.scale.set(1.8, .28);
  groundMist.tint = 0x8661a2; groundMist.alpha = .13; groundMist.eventMode = 'none';
  atmosphere.addChild(groundMist);
  let ticks = 0;
  const impactMotion = createTraversalImpactMotion();
  const worldLayers = [layers.ground, layers.groundDecals, layers.entities, layers.vfx, layers.worldUi];
  const origins = worldLayers.map(layer => ({ x: layer.x, y: layer.y }));
  const reducedMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  return {
    update(dt, playerX, hardImpact = false) {
      if (disposed) return;
      ticks = (ticks + dt) % 36000;
      const shake = impactMotion.update(dt, hardImpact, reducedMotion?.matches ?? false);
      worldLayers.forEach((layer, index) => {
        layer.position.set(origins[index]!.x + shake.x, origins[index]!.y + shake.y);
      });
      // Less than 4 px across the whole map; fixed platforms never drift.
      distant.x = -(playerX - 480) * .004;
      warm.alpha = .29 + Math.sin(ticks * .11) * .035 + Math.sin(ticks * .037) * .025;
      const nearExit = Math.max(0, Math.min(1, (playerX - 800) / 120));
      violet.alpha = .23 + Math.sin(ticks * .018) * .045;
      passageLight.alpha = .2 + nearExit * .1;
      exitReflection.alpha = .18 + nearExit * .065;
      groundMist.alpha = .1 + nearExit * .035 + Math.sin(ticks * .012) * .018;
      smoke.forEach((sprite, i) => {
        const phase = (ticks * .0025 + i / 5) % 1;
        sprite.position.set(100 + Math.sin(phase * 4 + i) * 18 + phase * 24, 391 - phase * 270);
        sprite.alpha = Math.sin(phase * Math.PI) * .26;
        sprite.scale.set(.65 + phase * 1.15);
      });
      sparks.forEach((spark, i) => {
        const phase = (ticks * (.004 + i % 3 * .0005) + i / 14) % 1;
        spark.position.set(76 + i * 3.5 + Math.sin(phase * 7 + i) * 10, 400 - phase * (85 + i % 4 * 16));
        spark.alpha = Math.sin(phase * Math.PI) * .68;
      });
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      worldLayers.forEach((layer, index) => layer.position.set(origins[index]!.x, origins[index]!.y));
      for (const container of groups) {
        container.removeFromParent();
        container.destroy({ children: true, context: true });
      }
      for (const texture of ownedTextures) texture.destroy(true);
    },
  };
}
