/* ============================================================
   PORTFOLIO.JS — Command Center Interface
   christopherkleinman.com/portfolio
   ============================================================ */

'use strict';

/* ============================================================
   BOOT SEQUENCE
   ============================================================ */
(function initBoot() {
  const overlay = document.getElementById('boot-overlay');
  const bootLines = document.querySelectorAll('.boot-line');
  const mainContent = document.getElementById('main-content');

  if (!overlay || !mainContent) return;

  // Stagger reveal of each boot line
  bootLines.forEach((line) => {
    const delay = parseInt(line.dataset.delay, 10) || 0;
    setTimeout(() => {
      line.classList.add('visible');
    }, delay);
  });

  // After boot sequence completes, fade out overlay and reveal content
  const totalBootTime = 1500; // ms — fast but readable

  setTimeout(() => {
    overlay.classList.add('hidden');
    mainContent.classList.add('visible');
    // Trigger intersection observer checks after content is visible
    triggerObserver();
  }, totalBootTime);
})();

/* ============================================================
   PARTICLE GRID BACKGROUND
   ============================================================ */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Particle configuration
  const CONFIG = {
    gridSpacing: 72,   // px between grid nodes
    particleRadius: 1.2,
    particleColor: 'rgba(0, 255, 65, 0.55)',
    lineColor: 'rgba(0, 255, 65, 0.06)',
    driftSpeed: 0.18,  // px per frame max
    driftAmplitude: 14, // max drift distance from home
    connectionDistance: 80,
  };

  let particles = [];
  let width = 0;
  let height = 0;
  let animFrameId = null;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    buildParticles();
  }

  function buildParticles() {
    particles = [];
    const cols = Math.ceil(width / CONFIG.gridSpacing) + 2;
    const rows = Math.ceil(height / CONFIG.gridSpacing) + 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const homeX = c * CONFIG.gridSpacing - CONFIG.gridSpacing;
        const homeY = r * CONFIG.gridSpacing - CONFIG.gridSpacing;

        particles.push({
          homeX,
          homeY,
          x: homeX,
          y: homeY,
          // Phase offsets so each particle drifts independently
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          speedX: 0.002 + Math.random() * 0.003,
          speedY: 0.002 + Math.random() * 0.003,
          opacity: 0.25 + Math.random() * 0.55,
        });
      }
    }
  }

  let tick = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    tick += 1;

    // Update positions (gentle sine drift)
    particles.forEach((p) => {
      p.x = p.homeX + Math.sin(tick * p.speedX + p.phaseX) * CONFIG.driftAmplitude;
      p.y = p.homeY + Math.cos(tick * p.speedY + p.phaseY) * CONFIG.driftAmplitude;
    });

    // Draw connections between close neighbours
    ctx.strokeStyle = CONFIG.lineColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.connectionDistance) {
          const alpha = (1 - dist / CONFIG.connectionDistance) * 0.07;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Draw dots
    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONFIG.particleRadius, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.particleColor;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    animFrameId = requestAnimationFrame(draw);
  }

  // Handle resize with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Pause animation when tab is hidden for performance
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    } else {
      draw();
    }
  });

  resize();
  draw();
})();

/* ============================================================
   INTERSECTION OBSERVER — staggered card reveal
   ============================================================ */
let observerInstance = null;

function triggerObserver() {
  if (observerInstance) {
    // Disconnect and reconnect to re-check all entries
    observerInstance.disconnect();
  }
  initObserver();
}

function initObserver() {
  const cards = document.querySelectorAll('.card, .other-work-list');

  observerInstance = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Stagger siblings within same grid
          const parent = entry.target.parentElement;
          const siblings = Array.from(
            parent.querySelectorAll('.card, .other-work-list')
          );
          const index = siblings.indexOf(entry.target);
          const delay = index * 90; // ms stagger

          setTimeout(() => {
            entry.target.classList.add('card-visible');
          }, delay);

          observerInstance.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -30px 0px',
    }
  );

  cards.forEach((card) => {
    observerInstance.observe(card);
  });
}

// Initialize observer immediately (boot sequence will trigger re-check)
initObserver();

/* ============================================================
   3D TILT EFFECT
   ============================================================ */
(function initTilt() {
  const TILT_MAX = 8; // degrees
  const PERSPECTIVE = 700; // px

  function applyTilt(card, e) {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    const rotateX = -dy * TILT_MAX;
    const rotateY = dx * TILT_MAX;

    card.style.transform = [
      `perspective(${PERSPECTIVE}px)`,
      `rotateX(${rotateX}deg)`,
      `rotateY(${rotateY}deg)`,
      `scale3d(1.02, 1.02, 1.02)`,
    ].join(' ');
  }

  function resetTilt(card) {
    card.style.transform = [
      `perspective(${PERSPECTIVE}px)`,
      `rotateX(0deg)`,
      `rotateY(0deg)`,
      `scale3d(1, 1, 1)`,
    ].join(' ');
    card.style.transition =
      'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, border-color 0.25s ease';
  }

  function attachTilt(card) {
    card.addEventListener('mousemove', (e) => {
      // Disable tilt override when card is animating in
      if (!card.classList.contains('card-visible')) return;
      card.style.transition = 'transform 0.08s ease, box-shadow 0.25s ease, border-color 0.25s ease';
      applyTilt(card, e);
    });

    card.addEventListener('mouseleave', () => {
      resetTilt(card);
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.15s ease, box-shadow 0.25s ease, border-color 0.25s ease';
    });
  }

  // Attach to all tilt-enabled cards (data-tilt attribute)
  document.querySelectorAll('[data-tilt]').forEach(attachTilt);

  // Disable tilt on touch devices
  if ('ontouchstart' in window) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.style.transform = 'none';
    });
  }
})();

/* ============================================================
   FOOTER YEAR
   ============================================================ */
(function setFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();

/* ============================================================
   SMOOTH SCROLL for anchor links
   ============================================================ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

/* ============================================================
   REDUCED MOTION SUPPORT
   ============================================================ */
(function respectMotionPreference() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function handleMotion(mq) {
    if (mq.matches) {
      // Skip boot animation, show content immediately
      const overlay = document.getElementById('boot-overlay');
      const mainContent = document.getElementById('main-content');
      if (overlay) overlay.classList.add('hidden');
      if (mainContent) mainContent.classList.add('visible');

      // Reveal all cards immediately
      document.querySelectorAll('.card, .other-work-list').forEach((el) => {
        el.classList.add('card-visible');
      });
    }
  }

  handleMotion(mq);
  mq.addEventListener('change', handleMotion);
})();
