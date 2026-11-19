import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { setupHeroVideo } = await server.ssrLoadModule('/src/portal/heroVideo.ts');
  async function harness({ mobile = false, reduced = false, blocked = false, saveData = false } = {}) {
    let observer, plays = 0;
    const document = new EventTarget(); document.hidden = false;
    const motion = new EventTarget(); motion.matches = reduced;
    const connection = new EventTarget(); connection.saveData = saveData;
    const classes = new Set();
    const video = new EventTarget(); Object.assign(video, {
      paused: true, classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
      pause() { this.paused = true; }, load() {}, removeAttribute() { this.src = ''; },
      async play() { plays++; if (blocked) throw new Error('policy'); this.paused = false; },
    });
    globalThis.document = document;
    globalThis.window = { IntersectionObserver: true, matchMedia: q => q.includes('reduced') ? motion : { matches: mobile } };
    globalThis.IntersectionObserver = class { constructor(cb) { observer = cb; } observe() {} };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { connection } });
    setupHeroVideo(video, {}, 'poster.jpg');
    const settle = async () => { await new Promise(resolve => setTimeout(resolve, 0)); };
    const visible = async value => { observer([{ isIntersecting: value }]); await settle(); };
    return { video, document, motion, classes, visible, settle, get plays() { return plays; } };
  }
  for (const mobile of [false, true]) {
    const h = await harness({ mobile });
    assert.equal(h.video.src, undefined, 'no eager download');
    await h.visible(true);
    assert.ok(h.video.src.split('?')[0].endsWith(mobile ? '-720.mp4' : '-1080.mp4'));
    assert.equal(h.video.poster, 'poster.jpg'); assert.equal(h.video.muted, true); assert.equal(h.video.loop, true);
    assert.equal(h.classes.size, 0, 'poster until playing');
    h.video.dispatchEvent(new Event('playing')); assert.ok(h.classes.has('is-playing'));
    await h.visible(false); assert.equal(h.video.paused, true);
    await h.visible(true); assert.equal(h.plays, 2);
    h.document.hidden = true; h.document.dispatchEvent(new Event('visibilitychange')); assert.equal(h.video.paused, true);
    h.document.hidden = false; h.document.dispatchEvent(new Event('visibilitychange')); await h.settle();
    h.motion.matches = true; h.motion.dispatchEvent(new Event('change')); assert.equal(h.video.paused, true);
    h.document.dispatchEvent(new Event('oakheaven:game-started'));
    h.motion.matches = false; h.motion.dispatchEvent(new Event('change')); await h.visible(true);
    assert.equal(h.video.paused, true, 'gameplay permanently suppresses background');
  }
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const h = await harness(options); await h.visible(true);
    assert.equal(h.plays, 0); assert.equal(h.video.src, undefined);
  }
  const blocked = await harness({ blocked: true }); await blocked.visible(true); await blocked.visible(false); await blocked.visible(true);
  assert.equal(blocked.plays, 1, 'autoplay rejection is not retried');
  const error = await harness(); await error.visible(true); error.video.dispatchEvent(new Event('error')); await error.visible(true);
  assert.equal(error.video.src, ''); assert.equal(error.plays, 1);
  for (const size of ['1080', '720']) {
    const data = readFileSync(`public/media/oakheaven-hero-${size}.mp4`);
    assert.ok(data.indexOf(Buffer.from('moov')) < data.indexOf(Buffer.from('mdat')), 'faststart');
    assert.ok(data.length < 5_000_000); assert.equal(data.includes(Buffer.from('soun')), false, 'no audio track');
  }
  console.log('PASS: lazy single-source selection, poster/playing/error, visibility, reduced motion, Save-Data, gameplay pause, no autoplay retry, faststart and silent MP4 sizes. Model only, no browser decode/visual validation.');
} finally { await server.close(); }
