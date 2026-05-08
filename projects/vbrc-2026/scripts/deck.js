/* ============================================================
   VBRC 2026 — Making Internal Business Tools With AI
   ----------------------------------------------------------------
   Deck navigation, scaling, slide entrance animations,
   keyboard contract, and atmosphere (gold-dust particles).
   ============================================================ */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const deck = $(".deck");
  // Direct children of .stage only — keeps Reveal/Stage internals out of the
  // slide array if any third-party library decides to add a "slide" class.
  const slides = $$(".stage > .slide");
  const COLD_OPEN_LAST_INDEX = 14; // slides 0..14 are cold-open
  let current = 0;
  let activeTyped = [];

  /* ---------- Stage scaling ---------- */
  const stage = $(".stage");
  function fit() {
    const sx = window.innerWidth  / 1920;
    const sy = window.innerHeight / 1080;
    const s  = Math.min(sx, sy);
    stage.style.setProperty("--scale", Math.round(s * 100) / 100);
  }
  window.addEventListener("resize", fit);
  fit();

  /* ---------- Per-slide hooks ---------- */
  const slideResets = {};
  const slideEnters = {};

  function isColdSlide(slide) {
    return slide && slide.classList.contains("slide--cold");
  }

  // Slides that own their own entrance animations — the deck's generic
  // GSAP entrance must not run on them or it'll fight their CSS keyframes.
  function ownsOwnEntrance(slide) {
    return slide && (
      slide.classList.contains("slide--cold") ||
      slide.classList.contains("slide--bridge")
    );
  }

  function resetSlide(idx) {
    const slide = slides[idx];
    // Cold slides + bridge slide own their own animation state — don't let
    // the deck's GSAP killTweens / clearProps trample CSS-driven state.
    if (ownsOwnEntrance(slide)) return;

    if (window.gsap) {
      const all = slide.querySelectorAll("*");
      gsap.killTweensOf(all);
      gsap.set(all, { clearProps: "opacity,transform,x,y,scale,boxShadow" });
    }
    activeTyped.forEach(t => { try { t.destroy(); } catch (e) {} });
    activeTyped = [];
    $$(".terminal", slide).forEach(term => {
      term.classList.remove("is-live");
      const live = $(".terminal__live", term);
      if (live) live.innerHTML = "";
    });
    if (slideResets[idx]) slideResets[idx]();
  }

  function enterSlide(idx) {
    const slide = slides[idx];
    resetSlide(idx);

    // Cold slides + bridge slide skip the deck's generic GSAP entrance —
    // they have their own CSS-driven entrance animations.
    if (ownsOwnEntrance(slide)) {
      if (slideEnters[idx]) slideEnters[idx](slide);
      return;
    }

    if (!window.gsap) {
      if (slideEnters[idx]) slideEnters[idx](slide);
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    tl.from($$(".corner", slide),    { opacity: 0, duration: 0.2 }, 0)
      .from($(".meta-top", slide),   { x: -20, opacity: 0, duration: 0.25 }, 0.08)
      .from($(".meta-bot", slide),   { x:  20, opacity: 0, duration: 0.25 }, 0.08)
      .from($(".fig-label", slide),  { y: -8, opacity: 0, duration: 0.2 }, 0.18)
      .from($(".headline", slide),   { y: 24, opacity: 0, duration: 0.4 }, 0.26)
      .from($(".subhead", slide),    { y: 12, opacity: 0, duration: 0.35 }, 0.42)
      .from(slide.querySelectorAll(".content > *, .split-card, .subs-list, .subs-tally, .singleuse-card, .device, .demo-caption, .howto-row, .qr-frame, .share-info, .anecdote-quote, .anecdote-attribution, .title-headline, .title-eyebrow, .title-sub, .title-byline, .close-headline, .close-sub, .caveat-card, .caveat-summary, .demo-intro-card"), {
        y: 16, opacity: 0, scale: 0.985, duration: 0.45, stagger: 0.06
      }, 0.48)
      .add(() => {
        if (slideEnters[idx]) slideEnters[idx](slide);
      }, 1.0);
  }

  function exitSlide(idx) {
    const slide = slides[idx];
    if (ownsOwnEntrance(slide)) return;
    if (window.gsap) {
      gsap.to($(".headline, .title-headline, .close-headline", slide), {
        y: -12, opacity: 0, duration: 0.25, ease: "power2.in"
      });
    }
  }

  /* ---------- Navigation ---------- */
  function go(target) {
    if (target < 0 || target >= slides.length || target === current) return;

    const oldIdx = current;
    const old = slides[oldIdx];
    const neu = slides[target];

    // If we're leaving the cold-open zone, fade-and-pause the audio so the
    // exit doesn't thump (the cold-open's natural fade may already be in
    // progress). Quick 400ms ramp from current volume to 0, then pause.
    const wasCold = oldIdx <= COLD_OPEN_LAST_INDEX;
    const willCold = target <= COLD_OPEN_LAST_INDEX;
    if (wasCold && !willCold) {
      const audio = document.getElementById("cold-audio");
      if (audio && !audio.paused) {
        const startVol = audio.volume;
        const startT = performance.now();
        const fadeMs = 400;
        const tick = () => {
          const elapsed = performance.now() - startT;
          const k = Math.min(1, elapsed / fadeMs);
          audio.volume = startVol * (1 - k);
          if (k < 1) requestAnimationFrame(tick);
          else {
            audio.pause();
            audio.volume = startVol; // restore baseline so a future replay isn't silent
          }
        };
        requestAnimationFrame(tick);
      }
    }

    exitSlide(oldIdx);
    old.classList.remove("is-active");
    old.classList.add("is-leaving");
    setTimeout(() => old.classList.remove("is-leaving"), 420);
    neu.classList.add("is-active");
    current = target;

    // Toggle deck-level mode classes
    if (neu.classList.contains("slide--tool")) {
      deck.classList.add("deck--on-tool");
    } else {
      deck.classList.remove("deck--on-tool");
    }
    if (neu.classList.contains("slide--bridge")) {
      deck.classList.add("deck--on-bridge");
    } else {
      deck.classList.remove("deck--on-bridge");
    }
    if (willCold) {
      deck.classList.add("deck--cold-open");
    } else {
      deck.classList.remove("deck--cold-open");
    }

    enterSlide(current);

    // Broadcast for cold-open.js (and any future listener)
    document.dispatchEvent(new CustomEvent("deck:slidechange", {
      detail: {
        current: oldIdx,
        target,
        isAuto: !!window.__deckAutoAdvance,
      }
    }));
  }
  function next() { go(current + 1); }
  function prev() { go(current - 1); }

  /* ---------- Typed.js skip ---------- */
  function skipActiveTyped() {
    if (activeTyped.length === 0) return false;
    activeTyped.forEach(t => {
      if (t && !t.isComplete) {
        try {
          t.stop();
          const el = t.el;
          if (el && t.strings) {
            el.innerHTML = t.strings.map(s => s.replace(/\^\d+/g, "")).join("<br>");
          }
        } catch (e) {}
      }
    });
    return true;
  }

  /* ---------- Keyboard contract ---------- */
  document.addEventListener("keydown", (e) => {
    // Don't capture keys when an input/textarea inside a demo has focus
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) {
      if (e.key === "Escape") e.target.blur();
      return;
    }

    if (e.key === "b" || e.key === "B") {
      deck.classList.toggle("deck--black");
      e.preventDefault(); return;
    }
    if (e.key === "p" || e.key === "P") {
      deck.classList.toggle("deck--projector");
      e.preventDefault(); return;
    }
    if (e.key === "t" || e.key === "T") {
      deck.classList.toggle("deck--timer");
      e.preventDefault(); return;
    }
    if (e.key === "r" || e.key === "R") {
      enterSlide(current);
      e.preventDefault(); return;
    }
    if (e.key === "s" || e.key === "S") {
      deck.classList.toggle("deck--source");
      e.preventDefault(); return;
    }

    if (e.key === " ") {
      const skipped = skipActiveTyped();
      if (!skipped) next();
      e.preventDefault(); return;
    }
    if (e.key === "ArrowRight") {
      skipActiveTyped();
      next();
      e.preventDefault(); return;
    }
    if (e.key === "ArrowLeft") {
      prev();
      e.preventDefault(); return;
    }
  });

  /* ---------- Click-to-advance ---------- */
  deck.addEventListener("click", (e) => {
    if (e.target.closest("button, a, input, textarea, select, .device, iframe, [data-no-advance]")) return;
    next();
  });

  /* ---------- Elapsed-time ---------- */
  const startTime = Date.now();
  const timerEl = document.createElement("div");
  timerEl.className = "timer";
  document.body.appendChild(timerEl);
  setInterval(() => {
    const ms = Date.now() - startTime;
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  }, 500);

  /* ---------- Atmosphere: spawn drifting gold-dust particles ---------- */
  const particleHost = $(".bg-particles");
  if (particleHost) {
    const COUNT = 36;
    for (let i = 0; i < COUNT; i++) {
      const span = document.createElement("span");
      const dur = 18 + Math.random() * 22;
      const delay = Math.random() * dur;
      const left = Math.random() * 100;
      const size = 2 + Math.random() * 4;
      span.style.left = left + "%";
      span.style.bottom = "-10px";
      span.style.width = size + "px";
      span.style.height = size + "px";
      span.style.animationDuration = dur + "s";
      span.style.animationDelay = "-" + delay + "s";
      particleHost.appendChild(span);
    }
  }

  /* ---------- Helpers ---------- */
  function runTerminal(termEl, opts = {}) {
    const promptEl = $(".terminal__live-prompt", termEl);
    const streamEl = $(".terminal__live-stream", termEl);
    if (!promptEl || !streamEl) return;

    let prompt, stream;
    try {
      prompt = JSON.parse(termEl.dataset.typedPrompt || "[]");
      stream = JSON.parse(termEl.dataset.typedStream || "[]");
    } catch (e) {
      console.error("Failed to parse terminal data", e);
      return;
    }
    if (!window.Typed) return;

    termEl.classList.add("is-live");
    promptEl.innerHTML = "";
    streamEl.innerHTML = "";

    const promptTyped = new Typed(promptEl, {
      strings: prompt,
      typeSpeed: 55,
      startDelay: 600,
      showCursor: true,
      cursorChar: "▍",
      onComplete: () => {
        promptTyped.cursor && (promptTyped.cursor.style.display = "none");
        const streamTyped = new Typed(streamEl, {
          strings: [stream.join("<br>")],
          typeSpeed: 22,
          startDelay: 500,
          showCursor: true,
          cursorChar: "▍",
          onComplete: () => { if (opts.onComplete) opts.onComplete(); }
        });
        activeTyped.push(streamTyped);
      }
    });
    activeTyped.push(promptTyped);
  }

  /* ---------- Cinematic blackout transition ---------- */
  // Fade everything to black, hold, switch slides under cover of black,
  // then fade back up. Used by cold-open.js to bridge into the deck proper
  // without a record-scratch.
  function blackoutTransition(targetIdx, opts = {}) {
    const fadeIn  = opts.fadeIn  ?? 1200;
    const hold    = opts.hold    ?? 1000;
    const fadeOut = opts.fadeOut ?? 1100;

    deck.style.setProperty("--blackout-fade-ms", `${fadeIn}ms`);
    deck.classList.add("deck--blackout");

    setTimeout(() => {
      // Black is full. Switch slides silently.
      window.__deckAutoAdvance = true;
      go(targetIdx);
      window.__deckAutoAdvance = false;

      setTimeout(() => {
        deck.style.setProperty("--blackout-fade-ms", `${fadeOut}ms`);
        deck.classList.remove("deck--blackout");
      }, hold);
    }, fadeIn);
  }

  window.deckAPI = {
    runTerminal,
    registerEnter: (idx, fn) => { slideEnters[idx] = fn; },
    registerReset: (idx, fn) => { slideResets[idx] = fn; },
    next, prev, go, blackoutTransition,
  };

  /* ---------- Boot ---------- */
  if (!window.Typed) {
    deck.classList.add("deck--no-typed");
  }
  slides[0].classList.add("is-active");
  // Cold open is the first slide — establish the deck mode before any
  // entrance animations run.
  if (isColdSlide(slides[0])) {
    deck.classList.add("deck--cold-open");
  }
  enterSlide(0);
})();
