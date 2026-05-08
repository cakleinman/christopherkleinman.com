/* ============================================================
   VBRC 2026 — Cold Open (Opossums sequence) runtime
   ----------------------------------------------------------------
   Drives the audio-synced beat advance over the deck's first 15
   slides (slide--cold cold-01 .. cold-15). Replaces the previous
   Reveal.js-based opossums.js — same beat data, same musical feel,
   but native to the deck's slide system.

   Public API (window.coldOpen):
     start()       — begin audio + tick loop (must run inside a
                     real user gesture for autoplay to succeed)
     stop()        — pause audio + cancel rAF
     isStarted()   — has start() been called?
     hasEnded()    — has the audio fade-out completed?
   ============================================================ */
(() => {
  const COLD_OPEN_LAST_INDEX = 14;       // slides 0..14 are cold-open
  const SYNC_OFFSET = -0.04;
  const BASE_VOLUME = 0.55;

  // Beat data from the original Opossums (Villain Season.mp3, 123 BPM).
  const BEATS = [1.713,4.153,7.081,8.057,8.568,9.079,9.567,10.054,10.565,11.053,11.564,12.051,12.562,13.050,13.560,14.048,14.559,15.070,15.581,16.068,16.556,17.067,17.554,18.065,18.576,19.064,19.551,20.039,20.550,21.060,21.548,22.059,22.547,23.057,23.568,24.056,24.567,25.054,25.542,26.053,26.564,27.051,27.562,28.050,28.561,29.048,29.559,30.070,30.557,31.068,31.556,32.067,32.578,33.065,33.553,34.064,34.575,35.062,35.550,36.061,36.571,37.059,37.547,38.058,38.568,39.056,39.567,40.054,40.565,41.053,41.540,42.075,42.562,43.073,43.561,44.048,44.559,45.047,45.558,46.068,46.556,47.044,47.578,48.065,48.576,49.064,49.551,50.039,50.503,51.061,51.572,52.059,52.570,53.058,53.568,54.056,54.520,55.055,55.565,56.053,56.564,57.051,57.562,58.050,58.514,59.048,59.559,60.047,60.534,61.068,61.556,62.020,62.555,63.042,63.553,64.064,64.575,65.062,65.550,66.061,66.572,67.059,67.570,68.058,68.569,69.056,69.544,70.055,70.565,71.053,71.564,72.052,72.562,73.050,73.561,74.072,74.559,75.070,75.558,76.045,76.556,77.067,77.555,78.065,78.553,79.018,79.459,79.900,80.387,80.875,81.363,81.827,82.315,82.779,83.244,83.708,84.172,84.614,85.055,85.542,86.100,86.610,87.075,87.586,88.050,88.561,89.072,89.559,90.093,90.581,91.069,91.556,92.067,92.601,93.066,93.553,94.087,94.598,95.062,95.573,96.061,96.549,97.059,97.617,98.104,98.638,99.103,99.590,100.101,100.612,101.100,101.587,102.075,102.586,103.073,103.584,104.049,104.536,105.047,105.558,106.046,106.533,107.044,107.555,108.066,108.577,109.064,109.575,110.063,110.550,111.038,111.549,112.060,112.570,113.058,113.569,114.056,114.521,115.032,115.566,116.053,116.541,117.052,117.563];
  const DOWNBEATS = [8.057,9.567,11.564,13.560,15.581,17.554,19.551,21.548,23.568,25.542,27.562,29.559,31.556,33.553,35.550,37.547,39.567,41.540,43.561,45.558,47.044,47.578,49.551,51.572,53.568,55.565,57.562,59.559,61.556,63.553,65.550,67.570,69.544,71.564,73.561,75.558,77.555,79.459,81.363,83.244,85.055,87.075,89.072,91.069,93.066,95.062,97.059,99.103,101.100,103.073,105.047,107.044,109.064,111.038,113.058,115.032,117.052];
  const POPS = [
    { t: 8.057,   intensity: 0.7, color: 'green' },
    { t: 21.548,  intensity: 0.6, color: 'cyan'  },
    { t: 25.542,  intensity: 0.5, color: 'amber' },
    { t: 28.050,  intensity: 0.5, color: 'amber' },
    { t: 37.547,  intensity: 0.5, color: 'amber' },
    { t: 47.044,  intensity: 1.0, color: 'red'   },
    { t: 50.039,  intensity: 0.6, color: 'red'   },
    { t: 54.056,  intensity: 0.4, color: 'pink'  },
    { t: 58.050,  intensity: 1.0, color: 'green' },
    { t: 102.075, intensity: 0.9, color: 'amber' },
  ];
  const FLASH_COLORS = {
    white: 'rgba(255,255,255,0.85)',
    green: 'rgba(43,255,0,0.55)',
    cyan:  'rgba(0,229,255,0.55)',
    amber: 'rgba(255,176,0,0.55)',
    red:   'rgba(255,42,42,0.55)',
    pink:  'rgba(255,107,218,0.55)',
  };

  // ----- State -----
  let started = false;
  let finalized = false;
  let coldExited = false;          // natural-exit auto-advance off the verdict slide fired
  let beatI = 0, downbeatI = 0, popI = 0;
  let downbeatsHeldOnSlide = 0;
  let manualOverride = false;
  let rafId = null;
  let mouseMoveHandler = null;
  let lastSlideIndex = -1;

  // Where the cold open should auto-advance off the verdict slide. The music
  // builds toward DROP #4 at 102.075s; we exit just before so the visual cut
  // lands musically while the audio fades down.
  const COLD_EXIT_T = 100.0;

  // ----- DOM refs (resolved lazily so this works regardless of script order) -----
  function getAudio()        { return document.getElementById('cold-audio'); }
  function getFlashEl()      { return document.getElementById('cold-flash'); }
  function getOverlayEl()    { return document.getElementById('cold-start-overlay'); }
  function getDeck()         { return document.querySelector('.deck'); }
  function getSlides()       { return Array.from(document.querySelectorAll('.stage > .slide')); }
  function currentDeckIndex() {
    const slides = getSlides();
    return slides.findIndex(s => s.classList.contains('is-active'));
  }
  function isInColdOpen() {
    const i = currentDeckIndex();
    return i >= 0 && i <= COLD_OPEN_LAST_INDEX;
  }

  // ----- Fragment helpers -----
  function fragmentsOn(slide) {
    return slide ? Array.from(slide.querySelectorAll('.cold-fragment')) : [];
  }
  function remainingFragments(slide) {
    return fragmentsOn(slide).filter(el => !el.classList.contains('visible')).length;
  }
  function revealNextFragment(slide) {
    const next = fragmentsOn(slide).find(el => !el.classList.contains('visible'));
    if (next) {
      next.classList.add('visible');
      // Counter animation hook
      if (next.classList.contains('cold-counter') && next.dataset.count) {
        animateCounter(next, parseInt(next.dataset.count, 10));
      }
      // Also catch nested .cold-counter children
      next.querySelectorAll && next.querySelectorAll('.cold-counter[data-count]').forEach(c => {
        animateCounter(c, parseInt(c.dataset.count, 10));
      });
    }
  }
  function revealAllFragmentsOn(slide) {
    fragmentsOn(slide).forEach(el => {
      if (!el.classList.contains('visible')) {
        el.classList.add('visible');
      }
    });
  }

  // ----- Counter animation (preserved from opossums.js) -----
  function animateCounter(el, target, duration = 900) {
    const t0 = performance.now();
    const suffix = el.textContent.replace(/[\d,.]/g, '');
    function frame(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = Math.floor(target * eased);
      el.textContent = (target >= 1000 ? Math.round(cur/1000) + 'K' : cur.toLocaleString()) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ----- Flash -----
  function flash(intensity, color) {
    const el = getFlashEl();
    if (!el) return;
    const c = FLASH_COLORS[color] || FLASH_COLORS.white;
    el.style.transition = 'none';
    el.style.background = `radial-gradient(ellipse at 50% 50%, ${c} 0%, transparent 60%)`;
    el.style.opacity = String(intensity);
    void el.offsetHeight;
    el.style.transition = 'opacity 380ms ease-out';
    el.style.opacity = '0';
  }

  // ----- Audio fade-out -----
  // The audio fade is timed to coast under DROP #4 (t≈102.075s) so the
  // closing visual cut lands while the music is already on its way down.
  function updateFade(t) {
    const audio = getAudio();
    if (!audio) return;
    const fadeStart = 99.0, fadeEnd = 102.0;
    let k = 0;
    if (t > fadeStart) k = Math.min(1, (t - fadeStart) / (fadeEnd - fadeStart));
    audio.volume = BASE_VOLUME * (1 - k);
    if (k >= 1) finalize();
  }

  function finalize() {
    if (finalized) return;
    finalized = true;
    const audio = getAudio();
    if (audio && !audio.paused) audio.pause();
    // Safety: reveal any remaining fragments on the current slide.
    const slides = getSlides();
    const slide = slides[currentDeckIndex()];
    if (slide && slide.classList.contains('slide--cold')) {
      revealAllFragmentsOn(slide);
    }
    cancelRAF();
  }

  // ----- Cursor sync (after manual nav, jump audio cursors to current time) -----
  function resyncCursors() {
    const audio = getAudio();
    if (!audio) return;
    const t = audio.currentTime;
    while (beatI < BEATS.length && BEATS[beatI] <= t) beatI++;
    while (downbeatI < DOWNBEATS.length && DOWNBEATS[downbeatI] <= t) downbeatI++;
    while (popI < POPS.length && POPS[popI].t <= t) popI++;
  }

  // ----- Tick loop -----
  function tick() {
    if (!started) return;
    if (!isInColdOpen()) { stop(); return; }
    const audio = getAudio();
    if (!audio) return;
    if (audio.ended) { finalize(); return; }

    const t = audio.currentTime + SYNC_OFFSET;
    const slides = getSlides();
    const slide = slides[currentDeckIndex()];
    if (!slide) { rafId = requestAnimationFrame(tick); return; }

    // Beat-driven fragment reveal
    while (beatI < BEATS.length && BEATS[beatI] <= t) {
      if (remainingFragments(slide) > 0) revealNextFragment(slide);
      beatI++;
    }

    // Downbeat-driven slide advance (skipped after manual override)
    while (downbeatI < DOWNBEATS.length && DOWNBEATS[downbeatI] <= t) {
      if (!manualOverride && remainingFragments(slide) === 0) {
        downbeatsHeldOnSlide++;
        const hold = parseInt(slide.dataset.coldHold || '1', 10);
        const idx = currentDeckIndex();
        if (downbeatsHeldOnSlide >= hold && idx < COLD_OPEN_LAST_INDEX) {
          window.__deckAutoAdvance = true;
          try { window.deckAPI && window.deckAPI.next && window.deckAPI.next(); } catch (e) {}
          window.__deckAutoAdvance = false;
        }
      }
      downbeatI++;
    }

    // Pop flashes
    while (popI < POPS.length && POPS[popI].t <= t) {
      flash(POPS[popI].intensity, POPS[popI].color);
      popI++;
    }

    updateFade(t);

    // Natural exit: when we reach the cold-exit timestamp on the verdict
    // slide, force-reveal any remaining fragments and bridge into the deck
    // via a cinematic blackout. Audio is mid-fade by now so the cut lands
    // musically; the blackout gives the audience a beat of silence before
    // the formal talk begins.
    if (!coldExited && t >= COLD_EXIT_T) {
      const idx = currentDeckIndex();
      if (idx === COLD_OPEN_LAST_INDEX) {
        coldExited = true;
        if (slide) revealAllFragmentsOn(slide);
        try {
          if (window.deckAPI && window.deckAPI.blackoutTransition) {
            window.deckAPI.blackoutTransition(COLD_OPEN_LAST_INDEX + 1, {
              fadeIn: 1400,
              hold: 1100,
              fadeOut: 1100,
            });
          } else if (window.deckAPI && window.deckAPI.next) {
            window.__deckAutoAdvance = true;
            window.deckAPI.next();
            window.__deckAutoAdvance = false;
          }
        } catch (e) {}
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function cancelRAF() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ----- Public API -----
  function start() {
    if (started) {
      // Recovery: if audio was paused (left + returned), resume.
      const audio = getAudio();
      if (audio && audio.paused && !finalized) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
        if (rafId === null) rafId = requestAnimationFrame(tick);
      }
      return;
    }
    started = true;
    const audio = getAudio();
    if (!audio) return;

    // Hide the start overlay
    const overlay = getOverlayEl();
    if (overlay) {
      overlay.style.transition = 'opacity 400ms ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 450);
    }

    // Begin playback
    audio.currentTime = 0;
    audio.volume = BASE_VOLUME;
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
    audio.addEventListener('timeupdate', () => updateFade(audio.currentTime), { passive: true });
    audio.addEventListener('ended', finalize);

    // Hookup mousemove parallax
    mouseMoveHandler = (e) => {
      if (!isInColdOpen()) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      const slides = getSlides();
      const slide = slides[currentDeckIndex()];
      if (!slide) return;
      slide.querySelectorAll('.cold-bg').forEach(el => {
        el.style.translate = `${x}px ${y}px`;
      });
    };
    document.addEventListener('mousemove', mouseMoveHandler, { passive: true });

    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    cancelRAF();
    const audio = getAudio();
    if (audio && !audio.paused) audio.pause();
    if (mouseMoveHandler) {
      document.removeEventListener('mousemove', mouseMoveHandler);
      mouseMoveHandler = null;
    }
  }

  // ----- Wire keyboard / click for the initial start gesture -----
  // Capture-phase listeners on the document fire BEFORE the deck's bubble-
  // phase handlers — so we can intercept the first gesture, kick off the
  // cold-open, and stop propagation so the deck doesn't also advance.
  function onFirstGesture(e) {
    if (started || finalized) return;
    if (currentDeckIndex() !== 0) return;
    start();
    // Stop here: the deck's own keydown/click handlers must NOT also fire
    // for this press, otherwise they'd advance us straight to slide 2.
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
  }
  document.addEventListener('keydown', (e) => {
    if (started) return;
    if (currentDeckIndex() !== 0) return;
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
      onFirstGesture(e);
    }
  }, true);
  document.addEventListener('click', (e) => {
    if (started) return;
    if (currentDeckIndex() !== 0) return;
    onFirstGesture(e);
  }, true);

  // ----- React to deck slide changes -----
  document.addEventListener('deck:slidechange', (e) => {
    const detail = e.detail || {};
    const newIdx = detail.target;
    const oldIdx = detail.current;
    const isAuto = !!detail.isAuto;

    const inCold = newIdx >= 0 && newIdx <= COLD_OPEN_LAST_INDEX;
    const wasInCold = oldIdx >= 0 && oldIdx <= COLD_OPEN_LAST_INDEX;

    // Track manual override: if THIS transition was user-initiated and we're
    // still inside the cold-open zone, lock in manual mode for the remainder.
    if (started && !isAuto && inCold) {
      manualOverride = true;
    }

    if (wasInCold && !inCold) {
      // Leaving the cold open: pause audio + halt tick.
      stop();
    } else if (!wasInCold && inCold) {
      // Re-entering the cold open: resume audio if it had been paused mid-run.
      const audio = getAudio();
      if (started && !finalized && audio && audio.paused) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
        if (rafId === null) rafId = requestAnimationFrame(tick);
      }
    }

    // Reset slide-hold counter and re-sync cursors on any slide change.
    downbeatsHeldOnSlide = 0;
    if (started) resyncCursors();

    // Backward manual nav within cold open: reveal all fragments on the new
    // slide so revisits don't show half-empty.
    if (started && inCold && !isAuto && newIdx < oldIdx) {
      const slide = getSlides()[newIdx];
      if (slide) revealAllFragmentsOn(slide);
    }

    lastSlideIndex = newIdx;
  });

  window.coldOpen = {
    start,
    stop,
    isStarted: () => started,
    hasEnded: () => finalized,
  };
})();
