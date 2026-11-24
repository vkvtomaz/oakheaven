import { PORTAL_ASSETS } from './codexData';

export const TRAILER_YOUTUBE_ID = 'U2E1_p_46II';
// Copy the official thumbnail to img/thumb-trailer.jpg; Vite includes it when present.
const thumbs = import.meta.glob('../../img/thumb-trailer.jpg', { eager: true, query: '?url', import: 'default' });

export function setupTrailer(): HTMLDialogElement {
  const modal = document.querySelector<HTMLDialogElement>('#trailer-modal')!;
  const player = document.querySelector<HTMLElement>('#trailer-player')!;
  const close = document.querySelector<HTMLButtonElement>('#trailer-close')!;
  const thumb = document.querySelector<HTMLImageElement>('#trailer-thumb')!;
  thumb.addEventListener('error', () => { thumb.src = PORTAL_ASSETS.cover; }, { once: true });
  thumb.src = thumbs['../../img/thumb-trailer.jpg'] as string || PORTAL_ASSETS.cover;
  let opener: HTMLElement | null = null;
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-open-trailer]')) trigger.addEventListener('click', () => {
    if (modal.open) return;
    opener = trigger;
    document.dispatchEvent(new Event('oakheaven:trailer-open'));
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${TRAILER_YOUTUBE_ID}?autoplay=1&rel=0`;
    iframe.title = 'Trailer oficial de OAKHEAVEN — O Último Juramento';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture'; iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    player.replaceChildren(iframe); modal.showModal(); close.focus();
  });
  close.addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    player.replaceChildren();
    document.dispatchEvent(new Event('oakheaven:trailer-close'));
    opener?.focus();
  });
  return modal;
}
