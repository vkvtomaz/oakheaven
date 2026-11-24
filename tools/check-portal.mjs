import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createServer } from 'vite';

// A deliberately small DOM model: exercises portal handlers, not layout,
// browser event propagation, native dialog behavior or Pixi rendering.
let documentModel;
class ElementModel extends EventTarget {
  constructor(tag = 'div') {
    super(); this.tagName = tag.toLowerCase(); this.childNodes = []; this.attrs = {};
    this.dataset = {}; this.hidden = false; this.open = false; this.value = '';
    this.style = { values: {}, setProperty(k, v) { this.values[k] = v; }, getPropertyValue(k) { return this.values[k]; } };
    this.classList = {
      contains: c => this.className.split(/\s+/).includes(c),
      add: c => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), c])].join(' '); },
      remove: c => { this.className = this.className.split(/\s+/).filter(x => x !== c).join(' '); },
      toggle: (c, force) => { const next = force ?? !this.classList.contains(c); next ? this.classList.add(c) : this.classList.remove(c); return next; },
    };
  }
  get id() { return this.attrs.id ?? ''; }
  get hash() { return this.attrs.href ?? ''; }
  get className() { return this.attrs.class ?? ''; }
  set className(value) { this.attrs.class = value; }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
    if (k === 'hidden') this.hidden = true;
    if (k === 'value') this.value = String(v);
  }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  get textContent() { return this.childNodes.map(n => typeof n === 'string' ? n : n.textContent).join(''); }
  set textContent(v) { this.childNodes = [String(v)]; }
  set innerHTML(v) { this.replaceChildren(...parseHtml(v).childNodes); }
  append(...nodes) { for (const n of nodes) { if (typeof n !== 'string') n.parentElement = this; this.childNodes.push(n); } }
  replaceChildren(...nodes) { this.childNodes = []; this.append(...nodes); }
  matches(selector) {
    return selector.split(',').some(raw => {
      const s = raw.trim();
      if (s.startsWith('#')) return this.id === s.slice(1);
      if (s.startsWith('.')) return this.classList.contains(s.slice(1));
      const attr = s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
      if (attr) return attr[2] === undefined ? attr[1] in this.attrs : this.getAttribute(attr[1]) === attr[2];
      return this.tagName === s;
    });
  }
  querySelectorAll(selector) {
    const result = [];
    for (const n of this.childNodes) if (n instanceof ElementModel) {
      if (n.matches(selector)) result.push(n);
      result.push(...n.querySelectorAll(selector));
    }
    return result;
  }
  querySelector(s) { return this.querySelectorAll(s)[0] ?? null; }
  getElementById(id) { return this.querySelector('#' + id); }
  click() { this.dispatchEvent(new Event('click')); }
  closest(s) { return this.matches(s) ? this : this.parentElement?.closest(s) ?? null; }
  contains(node) { return node === this || this.childNodes.some(n => n instanceof ElementModel && n.contains(node)); }
  focus() { documentModel.activeElement = this; this.dispatchEvent(new Event('focusin')); }
  scrollIntoView(options) { this.lastScroll = options; }
  pause() { this.paused = true; }
  load() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
  async requestFullscreen() { documentModel.fullscreenElement = this; documentModel.dispatchEvent(new Event('fullscreenchange')); }
}
function parseHtml(html) {
  const root = new ElementModel('root'), stack = [root];
  const voids = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const token of html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g) ?? []) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (!token.startsWith('<')) { stack.at(-1).append(token); continue; }
    const tag = token.match(/^<([^\s/>]+)/)[1]; const el = new ElementModel(tag);
    for (const a of token.slice(tag.length + 1).matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) el.setAttribute(a[1], a[2] ?? '');
    stack.at(-1).append(el);
    if (!voids.has(tag) && !token.endsWith('/>')) stack.push(el);
  }
  return root;
}
function fire(target, type, props = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [k, v] of Object.entries(props)) Object.defineProperty(event, k, { value: v });
  target.dispatchEvent(event); return event;
}
const html = readFileSync('index.html', 'utf8');
const nodes = parseHtml(html).querySelectorAll('[id]');
const ids = nodes.map(n => n.id);
assert.equal(new Set(ids).size, ids.length, 'all static IDs are unique');
for (const a of parseHtml(html).querySelectorAll('a')) if (a.hash.startsWith('#')) assert.ok(ids.includes(a.hash.slice(1)), a.hash);
const original = execFileSync('git', ['show', 'HEAD:index.html'], { encoding: 'utf8' });
assert.equal(html.match(/<video\b[^>]*>/)[0], original.match(/<video\b[^>]*>/)[0], 'original ambient video element attributes preserved');
assert.equal(parseHtml(html).querySelectorAll('video').length, 1);
assert.match(parseHtml(html).querySelector('.brand').textContent.replace(/\s+/g, ' '), /OAKHEAVEN O/);
assert.ok(parseHtml(html).querySelector('#chronicle-title').textContent.includes(' juramento'));
assert.ok(parseHtml(html).querySelector('#history-title').textContent.includes(' de OakHeaven'));
assert.equal(html.match(/<h1 id="hero-title">[\s\S]*?<\/h1>/)[0], original.match(/<h1 id="hero-title">[\s\S]*?<\/h1>/)[0], 'approved title markup preserved');
const normalize = text => text.replace(/\r\n/g, '\n');
assert.ok(normalize(readFileSync('src/portal/identity.css', 'utf8')) === normalize(execFileSync('git', ['show', 'HEAD:src/portal/identity.css'], { encoding: 'utf8' })), 'approved wordmark CSS untouched');
assert.ok(normalize(readFileSync('src/main.ts', 'utf8')) === normalize(execFileSync('git', ['show', 'HEAD:src/main.ts'], { encoding: 'utf8' })), 'Pixi startup/960x540 untouched');
for (const [, path] of readFileSync('src/portal/codexData.ts', 'utf8').matchAll(/new URL\('([^']+)'/g)) assert.ok(existsSync(resolve('src/portal', path)), path);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  documentModel = parseHtml(html);
  documentModel.documentElement = documentModel.querySelector('html');
  documentModel.body = documentModel.querySelector('body');
  documentModel.createElement = tag => new ElementModel(tag);
  documentModel.hidden = false;
  documentModel.exitFullscreen = async () => { documentModel.fullscreenElement = null; documentModel.dispatchEvent(new Event('fullscreenchange')); };
  const media = new EventTarget(); media.matches = true;
  const windowModel = new EventTarget();
  const location = { hash: '' };
  Object.assign(windowModel, { matchMedia: () => media, setTimeout, clearTimeout, location, history: { pushState(_state, _title, hash) { location.hash = hash; } } });
  Object.assign(globalThis, { document: documentModel, window: windowModel, HTMLElement: ElementModel, Element: ElementModel });
  const { setupPortal } = await server.ssrLoadModule('/src/portal/portal.ts');
  const { TOWER_CODEX, BESTIARY } = await server.ssrLoadModule('/src/portal/codexData.ts');
  let starts = 0;
  setupPortal({ startGame: async () => { starts++; } });
  const q = s => documentModel.querySelector(s);
  assert.equal(q('#forge-grid').querySelectorAll('button').length, 5);
  TOWER_CODEX.forEach((entry, i) => {
    fire(q('#forge-grid').querySelectorAll('button')[i], 'click');
    assert.ok(q('#forge-detail').textContent.includes(entry.cost), 'selected tower actual cost');
    assert.ok(q('#forge-detail').textContent.includes(entry.definition.maxHp + ' HP'));
  });
  const filters = documentModel.querySelectorAll('[data-bestiary-filter]');
  fire(filters[1], 'click');
  assert.equal(q('#bestiary-grid').querySelectorAll('button').filter(n => !n.hidden).length, 3);
  fire(filters[2], 'click');
  assert.equal(q('#bestiary-grid').querySelectorAll('button').filter(n => !n.hidden).length, BESTIARY.filter(e => e.category === 'expansion').length);
  for (const n of q('#bestiary-grid').querySelectorAll('button').filter(n => !n.hidden)) assert.ok(n.textContent.includes('Conceito futuro'));
  const opener = q('#bestiary-detail').querySelector('button'); fire(opener, 'click');
  assert.equal(q('#codex-modal').open, true);
  assert.ok(q('#codex-modal-title'));
  fire(q('[data-close-modal]'), 'click');
  assert.equal(q('#codex-modal').open, false); assert.equal(documentModel.activeElement, opener);
  fire(filters[0], 'click');
  fire(q('#bestiary-grid').querySelector('button'), 'click');
  assert.deepEqual(q('#bestiary-detail').querySelectorAll('meter').map(n => n.value), ['45','100']);
  const codexTabs = q('#codice').querySelectorAll('[role="tab"]');
  fire(codexTabs[1], 'click');
  assert.equal(q('#forja').hidden, true); assert.equal(q('#bestiario').hidden, false);
  assert.equal(q('#manual-day').hidden, false, 'codex tabs never hide manual');
  fire(codexTabs[1], 'keydown', { key: 'End' });
  assert.equal(q('#pessoas').hidden, false); assert.ok(q('#character-profile').textContent.includes('Kaelen'));
  location.hash = '#forja'; fire(windowModel, 'hashchange');
  assert.equal(q('#forja').hidden, false); assert.equal(q('#pessoas').hidden, true);
  assert.equal(q('#codice').lastScroll.block, 'start');
  location.hash = '#bestiario'; fire(windowModel, 'hashchange'); assert.equal(q('#bestiario').hidden, false);
  assert.equal(documentModel.querySelectorAll('video').length, 1);
  assert.equal(documentModel.querySelectorAll('iframe').length, 0, 'no eager YouTube embed');
  const trailerTrigger = q('[data-open-trailer]'); fire(trailerTrigger, 'click');
  assert.equal(q('#trailer-modal').open, true);
  assert.ok(q('#trailer-player').querySelector('iframe').src.includes('youtube-nocookie.com/embed/U2E1_p_46II'));
  assert.equal(q('.hero-video').paused, true);
  fire(windowModel, 'keydown', {key:'Escape', code:'Escape', target:q('#trailer-close')});
  assert.equal(q('#trailer-modal').open, false); assert.equal(q('#trailer-player').querySelectorAll('iframe').length, 0);
  assert.equal(documentModel.activeElement, trailerTrigger);
  const tabs = documentModel.querySelectorAll('[role="tab"]');
  fire(tabs[0], 'keydown', { key: 'End' });
  assert.equal(tabs[2].getAttribute('aria-selected'), 'true');
  assert.equal(q('#manual-climax').hidden, false); assert.equal(q('#manual-day').hidden, true);
  fire(tabs[2], 'keydown', { key: 'Home' });
  assert.equal(tabs[0].tabIndex, 0); assert.equal(tabs[2].tabIndex, -1);
  const slider = q('#history-slider'); slider.value = '75'; fire(slider, 'input');
  assert.equal(q('#history-comparison').style.getPropertyValue('--comparison'), '75%');
  fire(q('.nav-toggle'), 'click'); assert.equal(q('.nav-toggle').getAttribute('aria-expanded'), 'true');
  fire(q('.site-header'), 'keydown', { key: 'Escape' }); assert.equal(q('.nav-toggle').getAttribute('aria-expanded'), 'false');
  fire(q('#theater-toggle'), 'click'); assert.equal(documentModel.body.classList.contains('theater-mode'), true);
  assert.equal(q('#theater-toggle').getAttribute('aria-pressed'), 'true');
  fire(q('#fullscreen-toggle'), 'click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(documentModel.fullscreenElement, q('#arena-shell'));
  assert.equal(q('#fullscreen-toggle').getAttribute('aria-pressed'), 'true');
  fire(q('#arena-start'), 'click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(starts, 1); assert.equal(q('#game-start-overlay').classList.contains('is-hidden'), true);
  assert.equal(q('#arena').lastScroll.behavior, 'auto', 'reduced motion scroll');
  fire(q('[data-start-game]'), 'click'); assert.equal(starts, 1, 'game starts only once');
  // The portal gate was registered before Game Input; verify gate ordering at window.
  let inputReceived = 0; windowModel.addEventListener('keydown', () => inputReceived++);
  fire(windowModel, 'keydown', { code: 'KeyD', key: 'd', target: q('#game-frame') });
  assert.equal(inputReceived, 1, 'focused game gets input');
  const jumpEvent = fire(windowModel, 'keydown', { code: 'Space', key: ' ', target: q('#game-frame') });
  assert.equal(jumpEvent.defaultPrevented, true, 'focused arena prevents page scrolling');
  fire(windowModel, 'keydown', { code: 'Space', key: ' ', target: q('#theater-toggle') });
  assert.equal(inputReceived, 2, 'portal button does not send a game action');
  fire(windowModel, 'keydown', { code: 'Escape', key: 'Escape', target: q('#game-frame') });
  fire(windowModel, 'keydown', { code: 'KeyD', key: 'd', target: q('#game-frame') });
  assert.equal(inputReceived, 3, 'Escape reached input once, then inactive game is gated');
  assert.equal(q('.hero-embers').classList.contains('is-paused'), true);
  console.log('PASS: portal IDs/anchors/assets, approved wordmark + Pixi startup unchanged, actual costs, filters/concept labels, modal focus restoration, manual keyboard selection, comparison, menu, theater/fullscreen handler state, start-once and input gating. DOM MODEL ONLY: no browser/layout/render validation.');
} finally {
  await server.close();
  for (const key of ['document', 'window', 'HTMLElement', 'Element']) delete globalThis[key];
}
