import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { Assets, Graphics, Sprite, Texture, TextureSource } from 'pixi.js';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { EnhancedPlatformScene } = await server.ssrLoadModule('/src/scenes/EnhancedPlatformScene.ts');
  const { createInitialState } = await server.ssrLoadModule('/src/core/GameState.ts');
  const { HIGH_ROUTE_PLATFORMS } = await server.ssrLoadModule('/src/systems/traversal.ts');
  const { createTraversalHero } = await server.ssrLoadModule('/src/visual/traversalArt.ts');
  const atlas = JSON.parse(await readFile(new URL('../public/art/kaelen/atlas.json', import.meta.url), 'utf8'));
  // Metadata-only texture: validates scene/renderer wiring, NOT GPU pixels or appearance.
  const source = new TextureSource({ width: 1536, height: 1024 });
  const sheet = new Texture({ source });
  Assets.cache.set('/art/kaelen/atlas.json', atlas);
  Assets.cache.set('/art/kaelen/kaelen-se.png', sheet);
  const geometry = JSON.stringify(HIGH_ROUTE_PLATFORMS);
  function harness(back = false) {
    const scene = new EnhancedPlatformScene(back);
    const down = new Set(), pressed = new Set(), transitions = [];
    let presented = 0, impacts = 0, disposed = false;
    scene.player = createTraversalHero();
    scene.player.position.set(back ? 870 : 90, 455);
    scene.clockText = {}; scene.routeText = {}; scene.statusText = {};
    scene.landingDust = new Graphics();
    scene.presentation = { update(_dt, _x, hardImpact) { presented++; if (hardImpact) impacts++; }, destroy() { disposed = true; } };
    const game = { state: createInitialState(), app: { ticker: { deltaMS: 1000 / 60 } },
      input: { isDown: (...keys) => keys.some(k => down.has(k)),
        wasPressed: key => pressed.has(key) },
      changeScene: id => transitions.push(id) };
    return { scene, game, down, pressed, transitions,
      step(dt = 1, elapsedMS = dt * 1000 / 60) {
        game.app.ticker.deltaMS = elapsedMS;
        scene.update(game, dt); pressed.clear();
      },
      get presented() { return presented; }, get impacts() { return impacts; }, get disposed() { return disposed; } };
  }

  const h = harness();
  const shadow = h.scene.player.getChildByLabel('kaelen-contact-shadow');
  assert.ok(shadow, 'contact shadow is a separate visual from the body');
  const body = h.scene.player.children.filter(child => child instanceof Sprite).at(-1);
  assert.ok(body, 'real presentation body is attached');
  for (let i = 0; i < 12; i++) {
    h.step();
    assert.equal(shadow.visible, true, 'ground idle keeps contact shadow visible');
  }
  assert.deepEqual([shadow.x, shadow.y, shadow.rotation, shadow.scale.x, shadow.scale.y], [0, 1, 0, 1, 1]);
  assert.equal(body.label, 'kaelen-idle');
  assert.equal(body.texture.frame.x, atlas.clips.idle.frames[1].x, 'idle advances real atlas frame');
  h.down.add('KeyD'); h.step();
  assert.ok(Math.abs(h.scene.player.x - 93.45) < 1e-8);
  assert.equal(body.label, 'kaelen-walk');
  for (let i = 0; i < 4; i++) h.step();
  assert.equal(shadow.visible, true, 'walking shadow remains attached to root foot pivot');
  assert.equal(body.texture.frame.x, atlas.clips.walk.frames[1].x, 'walking advances real atlas frame');
  assert.equal(body.texture.frame.y, atlas.clips.walk.frames[1].y);
  assert.deepEqual([h.scene.player.scale.x, h.scene.player.scale.y, h.scene.player.rotation], [1, 1, 0]);
  h.scene.player.position.set(300, 455); h.step();
  assert.ok(Math.abs(h.scene.player.x - 302.35) < 1e-8);
  h.down.clear(); h.scene.player.position.set(190, 455);
  h.pressed.add('Space'); h.step();
  assert.ok(h.scene.player.y < 455, 'jump actually moves the actor');
  assert.equal(h.scene.player.y, 443.1, 'first jump tick retains original immediate physical impulse');
  assert.equal(shadow.visible, false, 'shadow disappears in the same tick as takeoff');
  let sawFall = false, sawLanding = false;
  for (let i = 0; i < 60; i++) {
    h.step();
    assert.equal(shadow.visible, !h.scene.airborne, 'shadow exactly follows collision support each airborne/landing tick');
    sawFall ||= body.label === 'kaelen-fall';
    sawLanding ||= body.label === 'kaelen-land';
  }
  assert.ok(sawFall && sawLanding, 'real scene transitions through aerial fall and landing presentation');
  assert.equal(h.scene.player.y, 392, 'lands on first original platform');
  assert.equal(h.scene.highRoute, true);
  assert.equal(h.impacts, 0, 'regular platform landing never shakes the camera');
  assert.equal(shadow.visible, true, 'shadow reappears on platform contact');
  h.down.add('KeyD'); const priorX = h.scene.player.x; h.step();
  assert.ok(Math.abs(h.scene.player.x - priorX - 5.35) < 1e-8);
  h.down.clear(); h.scene.player.position.set(270, 392);
  for (let i = 0; i < 30; i++) h.step();
  assert.equal(h.scene.player.y, 455);
  assert.equal(h.game.state.expedition.telemetry.highRouteFalls, 1);

  const jumpRuns = [];
  function jumpHarness() { const run = harness(); jumpRuns.push(run); return run; }
  // Walk out of overlap during the same update as the input: the old scene lost this jump.
  const edge = jumpHarness();
  edge.scene.player.position.set(263, 392); edge.step();
  edge.down.add('KeyD'); edge.pressed.add('Space'); edge.step();
  assert.ok(edge.scene.player.x > 264 && edge.scene.velocityY < 0, 'edge input survives loss of overlap in the same tick');
  const launchVelocity = edge.scene.velocityY;
  edge.pressed.add('Space'); edge.step();
  assert.ok(edge.scene.velocityY > launchVelocity, 'second airborne press cannot reset jump impulse');

  for (const dt of [.5, 1, 2]) {
    const coyote = jumpHarness();
    coyote.scene.player.position.set(263, 392); coyote.step(dt);
    coyote.scene.player.position.set(270, 392);
    for (let tick = 0; tick < 4; tick += dt) coyote.step(dt);
    coyote.pressed.add('Space'); coyote.step(dt);
    assert.ok(coyote.scene.velocityY < 0, `coyote accepts about 80ms after support at dt=${dt}`);
    const expired = jumpHarness();
    expired.scene.player.position.set(263, 392); expired.step(dt);
    expired.scene.player.position.set(270, 392);
    for (let tick = 0; tick < 9; tick += dt) expired.step(dt);
    expired.pressed.add('Space'); expired.step(dt);
    assert.ok(expired.scene.velocityY > 0, `coyote expires after 150ms at dt=${dt}`);

    const buffer = jumpHarness();
    buffer.scene.player.position.set(90, 430); buffer.scene.velocityY = 4; buffer.scene.airborne = true;
    buffer.down.add('Space'); buffer.pressed.add('Space');
    let launched = false;
    for (let tick = 0; tick < 8; tick += dt) {
      buffer.step(dt);
      if (buffer.scene.velocityY < 0) { launched = true; break; }
    }
    assert.ok(launched, `landing consumes buffered press within 100ms at dt=${dt}`);
    assert.equal(buffer.scene.player.y, 455, 'buffer launches at the resolved contact without moving physical feet early');
    assert.equal(buffer.scene.player.getChildByLabel('kaelen-contact-shadow').visible, false, 'buffered takeoff has no suspended shadow');
    let extraLaunch = false, previousV = buffer.scene.velocityY;
    for (let tick = 0; tick < 110; tick += dt) {
      buffer.step(dt);
      if (previousV >= 0 && buffer.scene.velocityY < 0) extraLaunch = true;
      previousV = buffer.scene.velocityY;
    }
    assert.equal(extraLaunch, false, 'holding the button never repeats a buffered jump');
  }
  const stale = jumpHarness();
  stale.scene.player.position.set(90, 350); stale.scene.airborne = true;
  stale.pressed.add('Space'); stale.step();
  for (let i = 0; i < 45; i++) stale.step();
  assert.equal(stale.scene.player.y, 455);
  assert.equal(stale.scene.velocityY, 0, 'expired buffer does not execute on later contact');
  const longFrame = jumpHarness();
  longFrame.scene.player.position.set(263, 392); longFrame.step();
  longFrame.scene.player.position.set(270, 392); longFrame.step();
  longFrame.pressed.add('Space'); longFrame.step(2, 200);
  assert.ok(longFrame.scene.velocityY > 0, 'real 200ms frame expires coyote despite physics dt cap');

  const recovery = jumpHarness();
  recovery.scene.player.position.set(430, 334); recovery.scene.highRoute = true; recovery.scene.airborne = true;
  let impact = false;
  for (let i = 0; i < 45; i++) {
    recovery.step();
    if (recovery.scene.stumbleTicks > 0) { impact = true; break; }
  }
  assert.ok(impact, 'high route fall enters existing recovery');
  assert.equal(recovery.impacts, 1, 'only the penalized fall triggers a hard impact');
  assert.equal(recovery.scene.stumbleTicks, 36, 'recovery duration is unchanged');
  const recoveryBar = recovery.scene.player.getChildByLabel('kaelen-recovery-bar');
  assert.ok(recoveryBar && recoveryBar.visible, 'recovery displays a contextual progress bar');
  assert.equal(recovery.scene.player.children.filter(child => child instanceof Sprite).at(-1).label, 'kaelen-recover');
  assert.match(recovery.scene.routeText.text, /0[,.]6/, 'HUD reports remaining recovery time');
  const recoveryX = recovery.scene.player.x;
  recovery.down.add('KeyD'); recovery.pressed.add('Space'); recovery.step();
  assert.equal(recovery.scene.player.x, recoveryX);
  assert.equal(recovery.scene.velocityY, 0, 'recovery blocks jump and consumes its buffer');
  for (let i = 0; i < 36; i++) recovery.step();
  assert.equal(recovery.scene.stumbleTicks, 0);
  assert.equal(recoveryBar.visible, false, 'recovery indicator disappears when control returns');
  assert.ok(recovery.scene.player.x > recoveryX && recovery.scene.velocityY === 0, 'control returns without a queued recovery jump');

  const mud = jumpHarness();
  mud.scene.player.position.set(300, 455); mud.down.add('KeyD');
  for (let i = 0; i < 13; i++) mud.step();
  assert.ok(Math.abs(mud.scene.player.x - (300 + 13 * 2.35)) < 1e-8, 'wet terrain retains original slow speed');
  assert.equal(mud.scene.wetSplash, true, 'actual steps in mud emit wet feedback');
  assert.equal(mud.scene.landingDust.visible, true);
  assert.match(mud.scene.statusText.text, /Lama/);
  const dryStep = jumpHarness(); dryStep.down.add('KeyD');
  for (let i = 0; i < 10; i++) dryStep.step();
  assert.equal(dryStep.scene.wetSplash, false, 'dry ground does not emit wet feedback');

  // A full lower-route walk still reaches the unchanged forest exit.
  const lowExit = jumpHarness(); lowExit.down.add('KeyD');
  for (let i = 0; i < 330 && lowExit.transitions.length === 0; i++) lowExit.step();
  assert.deepEqual(lowExit.transitions, ['forest']);
  const highExit = jumpHarness();
  highExit.scene.player.position.set(850, 390); highExit.step(); highExit.down.add('KeyD');
  for (let i = 0; i < 60 && highExit.transitions.length === 0; i++) highExit.step();
  assert.deepEqual(highExit.transitions, ['forest'], 'upper route descent still reaches forest');
  assert.equal(highExit.game.state.expedition.telemetry.highRouteFalls, 0, 'planned upper exit is not penalized');

  // Exercise only the portal lifecycle, using a minimal DOM model without browser rendering.
  const portal = new EnhancedPlatformScene(false);
  portal.presentation = { destroy() {} };
  assert.equal(portal.installTraversalCommands(), false, 'canvas remains usable without portal markup');
  class ElementModel {
    childNodes = []; textContent = '';
    append(...nodes) { this.childNodes.push(...nodes); }
    replaceChildren(...nodes) { this.childNodes = nodes; }
  }
  const ribbon = new ElementModel();
  const originalNodes = [new ElementModel(), new ElementModel()];
  ribbon.replaceChildren(...originalNodes);
  const previousDocument = globalThis.document;
  globalThis.document = { querySelector: () => ribbon, createElement: () => new ElementModel() };
  try {
    assert.equal(portal.installTraversalCommands(), true);
    const labels = ribbon.childNodes.map(item => item.childNodes.map(node => typeof node === 'string' ? node : node.textContent).join(''));
    assert.deepEqual(labels, ['A/D · ←/→ Mover', 'ESPAÇO/W/↑ Pular', 'M ÁUDIO']);
    portal.exit();
    assert.deepEqual(ribbon.childNodes, originalNodes, 'scene exit restores exact original portal nodes for other phases');
    assert.equal(ribbon.childNodes[0], originalNodes[0]);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }

  // Actual flight between the first two platform colliders, at multiple tick rates.
  const platformRuns = [];
  for (const dt of [.5, 1, 2]) {
    const p = harness(); platformRuns.push(p);
    p.scene.player.position.set(190, 392); p.step(dt);
    const contact = p.scene.player.getChildByLabel('kaelen-contact-shadow');
    assert.equal(contact.visible, true);
    p.down.add('KeyD'); p.pressed.add('Space'); p.step(dt);
    assert.equal(contact.visible, false);
    let arrived = false;
    for (let i = 0; i < Math.ceil(45 / dt); i++) {
      p.step(dt);
      assert.equal(contact.visible, !p.scene.airborne, 'no suspended/flickering shadow between platforms');
      if (!p.scene.airborne) {
        assert.equal(p.scene.player.y, 334, 'lands on the actual second platform');
        arrived = true; break;
      }
    }
    assert.ok(arrived, 'platform jump completes at each tick rate');
    // Walking off an edge must also hide the shadow, without a jump input.
    p.down.clear(); p.scene.player.position.set(430, 334); p.step(dt);
    assert.equal(contact.visible, false);
    assert.equal(p.scene.player.children.filter(child => child instanceof Sprite).at(-1).label, 'kaelen-fall');
  }

  const b = harness();
  b.scene.player.position.set(512, 278);
  b.scene.bonusGraphic = new Graphics();
  const wood = b.game.state.inventory.wood;
  b.step(); b.step();
  assert.equal(b.game.state.inventory.wood, wood + 1);
  assert.equal(b.game.state.expedition.telemetry.traversalBonusWood, 1);
  assert.equal(b.scene.bonusGraphic, null);

  const out = harness();
  out.scene.player.position.set(916, 455); out.step();
  assert.deepEqual(out.transitions, ['forest']);
  const back = harness(true);
  back.down.add('KeyA'); back.step();
  const backBody = back.scene.player.children.filter(child => child instanceof Sprite).at(-1);
  assert.ok(backBody.scale.x < 0, 'leftward movement updates presentation facing');
  assert.equal(back.scene.player.scale.x, 1, 'facing never reflects collision root');
  back.down.clear();
  back.scene.player.position.set(40, 455); back.step();
  assert.deepEqual(back.transitions, ['defense']);
  h.scene.exit(); assert.equal(h.disposed, true);
  assert.ok(h.presented > 0, 'visual update follows scene movement');
  assert.equal(JSON.stringify(HIGH_ROUTE_PLATFORMS), geometry);
  for (const t of [h, b, out, back, ...platformRuns, ...jumpRuns]) {
    t.scene.player.destroy({ children: true }); t.scene.landingDust.destroy();
  }
  assert.equal(source.destroyed, false, 'destroying scene frames preserves shared atlas source');
  Assets.cache.remove('/art/kaelen/atlas.json'); Assets.cache.remove('/art/kaelen/kaelen-se.png');
  sheet.destroy(true);
  console.log('PASS: real scene coyote/buffer at 30/60/120FPS, long-frame expiry, no double/held jump, shadow/atlas/motion, recovery and impact signal, mud speed/splash, both routes to forest, return exit, portal command restoration, bonus once and unchanged geometry. Metadata/DOM-model validation; not a visual render.');
} finally { await server.close(); }
