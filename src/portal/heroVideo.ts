interface ResourceConnection extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}

/** Decorative enhancement only; the existing Hero background always remains.
 * setupHeroVideo(video, hero, PORTAL_ASSETS.cover);
 */
export function setupHeroVideo(video: HTMLVideoElement, hero: HTMLElement, poster: string): void {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: ResourceConnection }).connection;
  let visible = false;
  let gameActive = false;
  let trailerOpen = false;
  let failed = false;
  let assigned = false;
  let pending = false;
  let resumeAfterPending = false;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  video.poster = poster;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  // Playback is requested explicitly so native autoplay cannot bypass eligibility.
  video.autoplay = false;
  video.preload = 'none';

  const eligible = (): boolean => visible && !document.hidden && !gameActive && !trailerOpen && !failed
    && !motion.matches && !connection?.saveData
    && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
  const clearWatchdog = (): void => {
    if (watchdog !== undefined) clearTimeout(watchdog);
    watchdog = undefined;
  };
  const fallback = (): void => {
    if (failed) return;
    failed = true;
    clearWatchdog();
    video.classList.remove('is-playing');
    video.pause();
    if (assigned) { video.removeAttribute('src'); video.load(); }
  };
  const waitForFrame = (): void => {
    video.classList.remove('is-playing');
    if (eligible() && watchdog === undefined) watchdog = setTimeout(fallback, 12000);
  };
  const synchronize = (): void => {
    if (!eligible()) {
      clearWatchdog();
      video.classList.remove('is-playing');
      video.pause();
      return;
    }
    if (pending) { resumeAfterPending = true; return; }
    if (!assigned) {
      const mobile = window.matchMedia('(max-width: 780px)').matches;
      const constrained = connection?.effectiveType === '3g';
      const pixels = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
      const resolution = constrained ? '720' : !mobile && pixels > 1920 ? '2160' : '1080';
      video.src = import.meta.env.BASE_URL + `media/oakheaven-hero-${resolution}.mp4?v=20261124-hq`;
      assigned = true;
    }
    if (!video.paused) return;
    waitForFrame();
    pending = true;
    resumeAfterPending = false;
    void video.play().catch((error: unknown) => {
      // An interruption caused by our visibility pause is safe to resume on a
      // subsequent visibility event; policy/codec failures are terminal here.
      if (!(error instanceof DOMException && error.name === 'AbortError')) fallback();
    }).finally(() => {
      pending = false;
      if (!eligible()) video.pause();
      else if (resumeAfterPending) { resumeAfterPending = false; synchronize(); }
    });
  };
  video.addEventListener('playing', () => {
    if (!eligible()) { video.pause(); return; }
    clearWatchdog();
    video.classList.add('is-playing');
  });
  video.addEventListener('waiting', waitForFrame);
  video.addEventListener('stalled', waitForFrame);
  video.addEventListener('error', fallback);
  document.addEventListener('visibilitychange', synchronize);
  document.addEventListener('oakheaven:trailer-open', () => { trailerOpen = true; synchronize(); });
  document.addEventListener('oakheaven:trailer-close', () => { trailerOpen = false; synchronize(); });
  document.addEventListener('oakheaven:game-started', () => { gameActive = true; synchronize(); });
  motion.addEventListener('change', synchronize);
  connection?.addEventListener('change', synchronize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const nextVisible = entry?.isIntersecting ?? false;
      // Returning to the Hero after leaving gameplay makes the background
      // eligible again; a trailer dialog still suppresses it independently.
      if (nextVisible && !visible) gameActive = false;
      visible = nextVisible;
      synchronize();
    }, { threshold: .05 }).observe(hero);
  }
}
