import { BESTIARY, CHARACTERS, TOWER_CODEX, type BestiaryEntry } from './codexData';
import { REPAIR_AMOUNT, REPAIR_COST } from '../systems/repair';
import { getTowerDamageMultiplier } from '../data/enemies';

const q = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error('Arquivo do códice ausente: ' + id);
  return node as T;
};
function inspection(image: string, title: string, eyebrow: string, copy: string): string {
  return `<div class="inspection-art"><img src="${image}" alt="${title}" loading="lazy"></div><div class="inspection-copy"><p class="eyebrow">${eyebrow}</p><h3>${title}</h3>${copy}</div>`;
}
function stats(values: Array<{ label: string; value: string }>): string {
  return `<dl class="inspection-stats">${values.map(v => `<div><dt>${v.label}</dt><dd>${v.value}</dd></div>`).join('')}</dl>`;
}
function beastCopy(entry: BestiaryEntry): string {
  const flanker = entry.id === 'scout' || entry.id === 'brute';
  const ratio = getTowerDamageMultiplier('flanker') * 100;
  return `<p>${entry.summary}</p>${stats(entry.stats)}<h4>Nota de campo</h4><p>${entry.tactic}</p>${flanker ? `<aside class="tactical-study"><h4>Variante de flanco · marca ciano</h4><p>Na Última Linha, esta criatura pode atacar pelo flanco. Priorize o combate direto com Kaelen.</p><div class="tactical-meter"><span>Dano de torres <b>${ratio}%</b></span><meter min="0" max="100" value="${ratio}" aria-label="Dano de torres contra flanqueadores">${ratio}%</meter></div><div class="tactical-meter direct"><span>Dano direto de Kaelen <b>100%</b></span><meter min="0" max="100" value="100" aria-label="Dano direto de Kaelen contra flanqueadores">100%</meter></div></aside>` : ''}`;
}
function selectList<T>(container: HTMLElement, items: readonly T[], label: (item: T) => string, render: (item: T) => void): HTMLButtonElement[] {
  const buttons: HTMLButtonElement[] = [];
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'codex-option';
    button.textContent = label(item); button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      render(item);
    });
    container.append(button); buttons.push(button);
  }
  buttons[0]?.click();
  return buttons;
}
export function setupCodex(): { modal: HTMLDialogElement } {
  const modal = q<HTMLDialogElement>('codex-modal');
  const close = modal.querySelector<HTMLButtonElement>('[data-close-modal]')!;
  let opener: HTMLButtonElement | null = null;
  selectList(q('forge-grid'), TOWER_CODEX, item => item.definition.name, item => {
    const tower = item.definition;
    const upgrade = tower.type === 'arc_ballista' || tower.type === 'spike_barricade';
    q('forge-detail').innerHTML = inspection(item.image, tower.name, tower.placement === 'road' ? 'Estrutura de estrada' : 'Torre de margem',
      `<p>${item.role}</p><p class="material-cost">Materiais: <strong>${item.cost}</strong></p>${stats([{label:'Alcance',value:String(tower.range)}, {label:'Dano',value:String(tower.damage)}, {label:'Intervalo',value:tower.fireInterval ? tower.fireInterval + ' ticks' : 'Contato'}, {label:'Estrutura',value:tower.maxHp + ' HP'}])}<aside class="engineering-note"><p>Reparo: ${REPAIR_COST} Madeira → +${REPAIR_AMOUNT} HP, limitado à vida máxima. Estruturas destruídas não são revividas.</p><p>${upgrade ? 'Aprimoramento disponível para estruturas elegíveis: Shift + clique durante a defesa.' : 'Sem aprimoramento implementado nesta estrutura.'}</p></aside>`);
  });
  const beastButtons = selectList(q('bestiary-grid'), BESTIARY,
    item => item.name + (item.category === 'expansion' ? ' · Conceito futuro' : ''), entry => {
      q('bestiary-detail').innerHTML = inspection(entry.image, entry.name,
        (entry.category === 'expansion' ? 'Conceito futuro · ' : 'Primeira noite · ') + entry.designation, beastCopy(entry));
      const expand = document.createElement('button'); expand.type = 'button'; expand.className = 'inspect-expand'; expand.textContent = 'Ampliar registro';
      expand.addEventListener('click', () => {
        opener = expand;
        q('codex-modal-content').innerHTML = `<h2 id="codex-modal-title">${entry.name}</h2>` + inspection(entry.image, entry.name, entry.designation, beastCopy(entry));
        modal.showModal(); close.focus();
      });
      q('bestiary-detail').append(expand);
    });
  const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-bestiary-filter]')];
  for (const filter of filters) filter.addEventListener('click', () => {
    let visible = 0;
    beastButtons.forEach((button, index) => {
      button.hidden = filter.dataset.bestiaryFilter !== 'all' && BESTIARY[index]!.category !== filter.dataset.bestiaryFilter;
      if (!button.hidden) visible++;
    });
    for (const button of filters) button.setAttribute('aria-pressed', String(button === filter));
    q('bestiary-count').textContent = `${visible} registros no arquivo`;
    if (!beastButtons.some(b => !b.hidden && b.getAttribute('aria-pressed') === 'true')) beastButtons.find(b => !b.hidden)?.click();
  });
  q('bestiary-count').textContent = `${BESTIARY.length} registros no arquivo`;
  selectList(q('character-list'), CHARACTERS, item => item.name, entry => {
    q('character-profile').innerHTML = inspection(entry.image, entry.name, entry.epithet, `<blockquote>“${entry.quote}”</blockquote><p>${entry.description}</p>`);
  });
  close.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => opener?.focus());

  const root = q('codice');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const activate = (tab: HTMLButtonElement, scroll = false): void => {
    for (const button of tabs) {
      button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1;
    }
    for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
    if (scroll) root.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]!;
      activate(next); next.focus();
    });
  });
  activate(tabs[0]!);
  const legacy = (hash: string): boolean => {
    const tab = tabs.find(button => '#' + button.getAttribute('aria-controls') === hash);
    if (!tab) return false;
    activate(tab, true); return true;
  };
  window.addEventListener('hashchange', () => legacy(window.location.hash));
  window.addEventListener('load', () => legacy(window.location.hash), { once: true });
  document.addEventListener('click', event => {
    const link = (event.target as Element).closest?.('a');
    const hash = link?.getAttribute('href');
    if (hash && ['#forja','#bestiario','#pessoas'].includes(hash)) {
      event.preventDefault(); window.history.pushState(null, '', hash); legacy(hash);
    }
  });
  legacy(window.location?.hash ?? '');
  return { modal };
}
