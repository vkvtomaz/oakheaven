import './portal.css';

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

function statBar(label: string, value: string, ratio: number): string {
  const width = Math.max(4, Math.min(100, ratio * 100));
  return `<div class="forge-stat"><span>${label}</span><i><b style="width:${width}%"></b></i><strong>${value}</strong></div>`;
}

function setupForge(): void {
  const grid = required<HTMLElement>('#forge-grid');
  const maxRange = Math.max(...TOWER_CODEX.map((item) => item.definition.range));
  const maxDamage = Math.max(...TOWER_CODEX.map((item) => item.definition.damage));
  const maxHp = Math.max(...TOWER_CODEX.map((item) => item.definition.maxHp));
  const maxInterval = Math.max(...TOWER_CODEX.map((item) => item.definition.fireInterval));

  for (const [index, item] of TOWER_CODEX.entries()) {
    const tower = item.definition;
    const cadenceRatio = tower.fireInterval === 0
      ? 1
      : 1 - tower.fireInterval / (maxInterval + 20);
    const article = document.createElement('article');
    article.className = 'forge-entry';
    article.innerHTML = `
      <div class="forge-illustration" style="--forge-image: url('${item.image}')"><img src="${item.image}" alt="${tower.name}" loading="lazy"><span>0${index + 1}</span></div>
      <div class="forge-copy">
        <div class="forge-title"><div><small>${tower.placement === 'road' ? 'Estrutura de estrada' : 'Torre de margem'}</small><h3>${tower.name}</h3></div><b>${item.cost}</b></div>
        <p>${item.role}</p>
        <div class="forge-stats">
          ${statBar('Alcance', String(tower.range), tower.range / maxRange)}
          ${statBar('Dano', String(tower.damage), maxDamage === 0 ? 0 : tower.damage / maxDamage)}
          ${statBar('Cadência', tower.fireInterval === 0 ? 'Contato' : `${tower.fireInterval}t`, cadenceRatio)}
          ${statBar('Estrutura', `${tower.maxHp} HP`, tower.maxHp / maxHp)}
        </div>
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
      <span class="codex-badge ${badgeClass}">${entry.designation}</span>
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

  grid.replaceChildren();
  for (const entry of BESTIARY) {
      const article = document.createElement('article');
      article.className = `bestiary-entry ${entry.category}`;
      article.innerHTML = `
        <button type="button" aria-label="Abrir registro de ${entry.name}">
          <div class="bestiary-image" style="--beast-image: url('${entry.image}')"><img src="${entry.image}" alt="" loading="lazy"></div>
          <div class="bestiary-copy"><small>${entry.designation}</small><h3>${entry.name}</h3><p>${entry.summary}</p><span class="record-link">Abrir registro completo <b>→</b></span></div>
        </button>
      `;
      article.querySelector('button')?.addEventListener('click', () => {
        renderBestiaryDetail(modalContent, entry);
        modal.showModal();
        closeButton.focus();
      });
      grid.append(article);
  }

  closeButton.addEventListener('click', () => modal.close());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
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
    for (const item of tabs) item.setAttribute('aria-selected', String(item === tab));
    for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
  };
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + step + tabs.length) % tabs.length];
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

export function setupPortal(options: PortalOptions): void {
  document.documentElement.style.setProperty('--hero-image', `url("${PORTAL_ASSETS.cover}")`);
  const cover = required<HTMLImageElement>('#game-cover');
  cover.src = PORTAL_ASSETS.cover;

  setupCharacters();
  setupForge();
  setupManualTabs();
  const { modal } = setupBestiary();
  setupHistory();
  setupReveal();

  const arena = required<HTMLElement>('#arena');
  const shell = required<HTMLElement>('#arena-shell');
  const gameFrame = required<HTMLElement>('#game-frame');
  const overlay = required<HTMLElement>('#game-start-overlay');
  const arenaStart = required<HTMLButtonElement>('#arena-start');
  const focusStatus = required<HTMLElement>('#focus-status');
  const theaterToggle = required<HTMLButtonElement>('#theater-toggle');
  const fullscreenToggle = required<HTMLButtonElement>('#fullscreen-toggle');

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
    arena.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (gameStarted) {
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
      overlay.classList.add('is-hidden');
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
    if (!gameFocused && GAME_KEYS.has(event.code)) {
      event.stopImmediatePropagation();
    }
  }, { capture: true });

  theaterToggle.addEventListener('click', () => {
    const enabled = document.body.classList.toggle('theater-mode');
    theaterToggle.textContent = enabled ? 'Sair do Teatro' : 'Modo Teatro';
    shell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  fullscreenToggle.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await shell.requestFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreenToggle.textContent = document.fullscreenElement
      ? 'Sair da Tela Cheia'
      : 'Tela Cheia';
  });
}
