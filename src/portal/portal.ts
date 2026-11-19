import './fonts.css';
import './portal.css';
import './identity.css';
import './cinematic.css';
import { setupHeroVideo } from './heroVideo';

import {
  BESTIARY,
  CHARACTERS,
  PORTAL_ASSETS,
  TOWER_CODEX,
  type BestiaryEntry,
  type CharacterEntry,
} from './codexData';

export interface PortalOptions {
  startGame(): Promise<void>;
}

const GAME_KEYS = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'KeyR', 'KeyM',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Enter',
]);

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento do portal ausente: ${selector}`);
  return element;
}

function renderCharacter(profile: HTMLElement, entry: CharacterEntry): void {
  profile.replaceChildren();
  const image = document.createElement('img');
  image.src = entry.image;
  image.alt = entry.name;
  const copy = document.createElement('div');
  copy.innerHTML = `
    <p class="eyebrow">${entry.epithet}</p>
    <h3>${entry.name}</h3>
    <blockquote>“${entry.quote}”</blockquote>
    <p>${entry.description}</p>
  `;
  profile.append(image, copy);
}

function setupCharacters(): void {
  const list = required<HTMLElement>('#character-list');
  const profile = required<HTMLElement>('#character-profile');
  let activeIndex = 0;
  let transitionTimer = 0;

  const swapCharacter = (entry: CharacterEntry): void => {
    window.clearTimeout(transitionTimer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderCharacter(profile, entry);
      return;
    }
    profile.classList.add('is-switching');
    transitionTimer = window.setTimeout(() => {
      renderCharacter(profile, entry);
      profile.classList.remove('is-switching');
    }, 190);
  };

  const buttons = CHARACTERS.map((entry, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-tab';
    button.setAttribute('aria-pressed', String(index === 0));
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${entry.name}<small>${entry.epithet}</small>`;
    button.addEventListener('click', () => {
      if (index === activeIndex) return;
      activeIndex = index;
      for (const item of buttons) item.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      swapCharacter(entry);
    });
    list.append(button);
    return button;
  });
  renderCharacter(profile, CHARACTERS[0]);
}

function setupForge(): void {
  const grid = required<HTMLElement>('#forge-grid');
  grid.replaceChildren();
  for (const [index, item] of TOWER_CODEX.entries()) {
    const tower = item.definition;
    const article = document.createElement('article');
    article.className = 'forge-entry forge-' + tower.type;
    article.innerHTML = `
      <div class="forge-illustration"><img src="${item.image}" alt="${tower.name}" loading="lazy"><span>PROJETO ${String(index + 1).padStart(2, '0')}</span></div>
      <div class="forge-copy">
        <div class="forge-title"><div><small>${tower.placement === 'road' ? 'Estrutura de estrada' : 'Torre de margem'}</small><h3>${tower.name}</h3></div><b>${item.cost}</b></div>
        <p>${item.role}</p>
        <details class="forge-notes"><summary>Dados de engenharia</summary><dl>
          <div><dt>Alcance</dt><dd>${tower.range} unidades</dd></div>
          <div><dt>Dano</dt><dd>${tower.damage}</dd></div>
          <div><dt>Intervalo</dt><dd>${tower.fireInterval === 0 ? 'Contato' : tower.fireInterval + ' ticks'}</dd></div>
          <div><dt>Estrutura</dt><dd>${tower.maxHp} HP</dd></div>
        </dl><p class="engineering-note">Valores básicos da estrutura. Consulte os aprimoramentos durante a defesa.</p></details>
      </div>
    `;
    grid.append(article);
  }
}

function renderBestiaryDetail(container: HTMLElement, entry: BestiaryEntry): void {
  const badgeClass = entry.category === 'active' ? 'active' : 'expansion';
  container.innerHTML = `
    <div class="codex-detail-image"><img src="${entry.image}" alt="${entry.name}"></div>
    <div class="codex-detail-copy">
      <span class="codex-badge ${badgeClass}">${entry.category === 'expansion' ? 'Conceito futuro · ' : 'Primeira noite · '}${entry.designation}</span>
      <h2 id="codex-modal-title">${entry.name}</h2>
      <p>${entry.summary}</p>
      <div class="codex-stats">${entry.stats.map((stat) => `<span><small>${stat.label}</small><strong>${stat.value}</strong></span>`).join('')}</div>
      <h3>Nota de campo</h3><p>${entry.tactic}</p>
    </div>
  `;
}

function setupBestiary(): { modal: HTMLDialogElement } {
  const grid = required<HTMLElement>('#bestiary-grid');
  const modal = required<HTMLDialogElement>('#codex-modal');
  const modalContent = required<HTMLElement>('#codex-modal-content');
  const closeButton = required<HTMLButtonElement>('[data-close-modal]');
  let opener: HTMLButtonElement | null = null;

  grid.replaceChildren();
  for (const entry of BESTIARY) {
      const article = document.createElement('article');
      article.className = `bestiary-entry ${entry.category}`;
      article.innerHTML = `
        <button type="button" aria-label="Abrir registro de ${entry.name}">
          <div class="bestiary-image"><img src="${entry.image}" alt="" loading="lazy"><span class="specimen-status">${entry.category === 'active' ? 'Primeira noite' : 'Conceito futuro'}</span></div>
          <div class="bestiary-copy"><small>${entry.designation}</small><h3>${entry.name}</h3><p>${entry.summary}</p><span class="record-link">Examinar registro</span></div>
        </button>
      `;
      article.querySelector('button')?.addEventListener('click', () => {
        opener = article.querySelector('button');
        renderBestiaryDetail(modalContent, entry);
        modal.showModal();
        closeButton.focus();
      });
      grid.append(article);
  }

  closeButton.addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => opener?.focus());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
  const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-bestiary-filter]')];
  const count = required<HTMLElement>('#bestiary-count');
  for (const filter of filters) filter.addEventListener('click', () => {
    const category = filter.dataset.bestiaryFilter;
    let visible = 0;
    for (const entry of grid.querySelectorAll<HTMLElement>('.bestiary-entry')) {
      entry.hidden = category !== 'all' && !entry.classList.contains(category!);
      if (!entry.hidden) visible++;
    }
    for (const button of filters) button.setAttribute('aria-pressed', String(button === filter));
    count.textContent = visible + ' registros no arquivo';
  });
  count.textContent = BESTIARY.length + ' registros no arquivo';
  return { modal };
}

function setupHistory(): void {
  const comparison = required<HTMLElement>('#history-comparison');
  const before = required<HTMLImageElement>('#history-before');
  const after = required<HTMLImageElement>('#history-after');
  const slider = required<HTMLInputElement>('#history-slider');

  before.src = PORTAL_ASSETS.oakBefore;
  after.src = PORTAL_ASSETS.oakAfter;
  slider.addEventListener('input', () => {
    comparison.style.setProperty('--comparison', `${slider.value}%`);
  });
}

function setupManualTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const activate = (tab: HTMLButtonElement): void => {
    for (const item of tabs) {
      item.setAttribute('aria-selected', String(item === tab));
      item.tabIndex = item === tab ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
  };
  for (const [index, tab] of tabs.entries()) {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + step + tabs.length) % tabs.length]!;
      activate(next);
      next.focus();
    });
  }
}

function setupReveal(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    for (const element of elements) element.classList.add('is-visible');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  for (const element of elements) observer.observe(element);
}

function setupChapters(): void {
  const header = required<HTMLElement>('.site-header');
  const toggle = required<HTMLButtonElement>('.nav-toggle');
  const nav = required<HTMLElement>('#chapter-nav');
  const hero = required<HTMLElement>('#inicio');
  const embers = required<HTMLElement>('.hero-embers');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let heroVisible = true;
  let arenaVisible = false;
  let gameActive = false;
  const closeNav = (): void => {
    toggle.setAttribute('aria-expanded', 'false');
    header.classList.remove('nav-open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('nav-open', open);
  });
  nav.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) closeNav();
  });
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) {
      closeNav(); toggle.focus();
    }
  });
  header.addEventListener('focusout', (event) => {
    if (!header.contains(event.relatedTarget as Node | null)) closeNav();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!header.contains(event.target as Node)) closeNav();
  });
  const updateAtmosphere = (): void => {
    embers.classList.toggle('is-paused', motion.matches || document.hidden || !heroVisible || arenaVisible || gameActive);
  };
  document.addEventListener('oakheaven:game-started', () => { gameActive = true; updateAtmosphere(); });
  document.addEventListener('visibilitychange', updateAtmosphere);
  motion.addEventListener('change', updateAtmosphere);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry!.isIntersecting;
      header.classList.toggle('is-scrolled', !heroVisible);
      updateAtmosphere();
    }, { threshold: .1 }).observe(hero);
    new IntersectionObserver(([entry]) => {
      arenaVisible = entry!.isIntersecting;
      updateAtmosphere();
    }).observe(required('#arena-shell'));
    const links = [...nav.querySelectorAll<HTMLAnchorElement>('a')];
    const sections = links.map(link => document.querySelector(link.hash)).filter((node): node is HTMLElement => node instanceof HTMLElement);
    const visible = new Set<Element>();
    const chapters = new IntersectionObserver(entries => {
      for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
      const current = sections.filter(section => visible.has(section)).at(-1);
      for (const link of links) {
        if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }, { rootMargin: '-15% 0px -55% 0px' });
    for (const section of sections) chapters.observe(section);
  }
  updateAtmosphere();
}

export function setupPortal(options: PortalOptions): void {
  document.documentElement.style.setProperty('--hero-image', `url("${PORTAL_ASSETS.cover}")`);
  for (const image of document.querySelectorAll<HTMLImageElement>('[data-portal-art]')) {
    const key = image.dataset.portalArt as keyof typeof PORTAL_ASSETS;
    if (key in PORTAL_ASSETS) image.src = PORTAL_ASSETS[key];
  }
  const cover = required<HTMLImageElement>('#game-cover');
  cover.src = PORTAL_ASSETS.cover;
  setupHeroVideo(required<HTMLVideoElement>('.hero-video'), required<HTMLElement>('#inicio'), PORTAL_ASSETS.cover);

  setupCharacters();
  setupForge();
  setupManualTabs();
  const { modal } = setupBestiary();
  setupHistory();
  setupReveal();
  setupChapters();

  const arena = required<HTMLElement>('#arena');
  const shell = required<HTMLElement>('#arena-shell');
  const gameFrame = required<HTMLElement>('#game-frame');
  const overlay = required<HTMLElement>('#game-start-overlay');
  const arenaStart = required<HTMLButtonElement>('#arena-start');
  const focusStatus = required<HTMLElement>('#focus-status');
  const theaterToggle = required<HTMLButtonElement>('#theater-toggle');
  const fullscreenToggle = required<HTMLButtonElement>('#fullscreen-toggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = (): ScrollBehavior => reducedMotion.matches ? 'auto' : 'smooth';
  gameFrame.tabIndex = 0;
  gameFrame.setAttribute('aria-label', 'Arena de OAKHEAVEN. Entre para ativar os controles; Escape libera o teclado.');
  theaterToggle.setAttribute('aria-pressed', 'false');
  fullscreenToggle.setAttribute('aria-pressed', 'false');
  if (typeof shell.requestFullscreen !== 'function') {
    fullscreenToggle.disabled = true;
    fullscreenToggle.title = 'Tela cheia não disponível neste navegador';
  }

  let gameStarted = false;
  let gameStarting = false;
  let gameFocused = false;

  const modalOpen = (): boolean => modal.open;
  const setGameFocus = (focused: boolean): void => {
    gameFocused = focused && gameStarted && !modalOpen();
    shell.classList.toggle('has-game-focus', gameFocused);
    focusStatus.innerHTML = gameFocused
      ? '<span></span> Arena em Foco — Comandos Ativos'
      : '<span></span> Clique na Arena para Controlar Kaelen';
  };

  const start = async (): Promise<void> => {
    arena.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    if (gameStarted) {
      gameFrame.focus({ preventScroll: true });
      setGameFocus(true);
      return;
    }
    if (gameStarting) return;
    gameStarting = true;
    arenaStart.disabled = true;
    arenaStart.textContent = 'Acendendo a forja…';
    try {
      await options.startGame();
      gameStarted = true;
      document.dispatchEvent(new Event('oakheaven:game-started'));
      overlay.classList.add('is-hidden');
      gameFrame.focus({ preventScroll: true });
      setGameFocus(true);
    } catch (error) {
      console.error('[OAKHEAVEN] Falha ao iniciar o jogo:', error);
      arenaStart.disabled = false;
      arenaStart.textContent = 'Tentar novamente';
    } finally {
      gameStarting = false;
    }
  };

  arenaStart.addEventListener('click', () => void start());
  for (const button of document.querySelectorAll<HTMLElement>('[data-start-game]')) {
    button.addEventListener('click', () => void start());
  }

  gameFrame.addEventListener('pointerdown', () => setGameFocus(true));
  gameFrame.addEventListener('focusin', () => setGameFocus(true));
  document.addEventListener('focusin', (event) => {
    if (!gameFrame.contains(event.target as Node)) setGameFocus(false);
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Node;
    if (!gameFrame.contains(target) && !shell.querySelector('.arena-tools')?.contains(target)) {
      setGameFocus(false);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (modalOpen()) {
      if (event.key === 'Tab') return;
      if (event.key === 'Escape') {
        modal.close();
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === 'Escape' && gameFocused) {
      setGameFocus(false);
      return;
    }
    const target = event.target as Element | null;
    const portalControl = target?.closest?.('button,a,input,select,textarea,[contenteditable="true"]');
    if ((!gameFocused || portalControl) && GAME_KEYS.has(event.code)) {
      event.stopImmediatePropagation();
    }
  }); // Bubble: tabs/range controls receive their keys before the later Game Input listener.

  theaterToggle.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('theater-mode');
    theaterToggle.setAttribute('aria-pressed', String(enabled));
    theaterToggle.textContent = enabled ? 'Sair do Teatro' : 'Modo Teatro';
    shell.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  });

  fullscreenToggle.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      focusStatus.textContent = 'Tela cheia indisponível. O Modo Teatro continua disponível.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenToggle.setAttribute('aria-pressed', String(document.fullscreenElement === shell));
    fullscreenToggle.textContent = document.fullscreenElement
      ? 'Sair da Tela Cheia'
      : 'Tela Cheia';
  });
}
