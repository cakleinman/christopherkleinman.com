(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isCoarse = window.matchMedia('(pointer: coarse)').matches;

  /* ============================================
     THEME TOGGLE
     ============================================ */
  var themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });

  /* ============================================
     MOBILE NAV
     ============================================ */
  var hamburger = document.querySelector('.nav-hamburger');
  var mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    mobileMenu.querySelectorAll('.nav-mobile-link').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ============================================
     SCROLLSPY
     ============================================ */
  var navLinks = document.querySelectorAll('.nav-link');
  var mobileLinks = document.querySelectorAll('.nav-mobile-link');
  var sections = document.querySelectorAll('[id]');
  var sectionRatios = new Map();

  function highlightNav(activeId) {
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === activeId);
    });
    mobileLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-section') === activeId);
    });
  }

  function resolveNavId(sectionId) {
    if (sectionId === 'more-projects') return 'projects';
    return sectionId;
  }

  var thresholds = [];
  for (var t = 0; t <= 1; t += 0.1) thresholds.push(Math.round(t * 10) / 10);

  var spyObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      sectionRatios.set(entry.target.id, {
        ratio: entry.intersectionRatio,
        isIntersecting: entry.isIntersecting
      });
    });
    var maxId = null;
    var maxRatio = 0;
    sectionRatios.forEach(function (data, id) {
      if (data.isIntersecting && data.ratio > maxRatio) {
        maxRatio = data.ratio;
        maxId = id;
      }
    });
    if (maxId) highlightNav(resolveNavId(maxId));
  }, {
    threshold: thresholds,
    rootMargin: '-60px 0px -20% 0px'
  });

  sections.forEach(function (section) {
    if (section.id === 'about' || section.id === 'projects' ||
        section.id === 'more-projects' || section.id === 'contact') {
      spyObserver.observe(section);
    }
  });

  /* ============================================
     SCROLL REVEAL (with multi-direction cards)
     ============================================ */
  var reveals = document.querySelectorAll('.reveal');

  if (reveals.length > 0 && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var siblings = el.parentElement.querySelectorAll('.reveal');
        var index = 0;
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i] === el) { index = i; break; }
        }

        // Multi-direction reveals for cards in the grid
        var gridEl = el.closest('.projects-grid');
        if (gridEl && el.classList.contains('card')) {
          var cols = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;
          var cards = Array.from(gridEl.querySelectorAll('.card'));
          var cardIndex = cards.indexOf(el);
          var colIndex = cardIndex % cols;
          if (cols > 1) {
            if (colIndex === 0) el.classList.add('reveal-from-left');
            else if (colIndex === cols - 1) el.classList.add('reveal-from-right');
          }
        }

        var delay = el.classList.contains('credential') ? index * 120 : index * 70;

        setTimeout(function () {
          el.classList.add('visible');
        }, delay);

        revealObserver.unobserve(el);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -30px 0px'
    });

    reveals.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* ============================================
     SCROLL FRAME LOOP (shared rAF for all scroll effects)
     ============================================ */
  var featuredImages = document.querySelectorAll('.showcase-screenshot');
  var scrollTicking = false;

  // Showcase sections for scroll-driven entrance
  var showcases = document.querySelectorAll('.showcase-inner');

  function onScrollFrame() {
    var vh = window.innerHeight;

    // Scroll-driven entrance for showcase sections
    if (!reducedMotion) {
      showcases.forEach(function (showcase) {
        var rect = showcase.getBoundingClientRect();
        // Progress: 0 = just entering bottom, 1 = fully in viewport
        var progress = Math.min(1, Math.max(0, 1 - (rect.top - vh * 0.3) / (vh * 0.5)));

        var screenshot = showcase.querySelector('.showcase-screenshot');
        var text = showcase.querySelector('.showcase-text');

        if (screenshot && progress > 0 && progress < 1) {
          var translateY = (1 - progress) * 40;
          var scale = 0.95 + progress * 0.05;
          screenshot.style.transform = 'translateY(' + translateY + 'px) scale(' + scale + ')';
          screenshot.style.opacity = Math.min(1, progress * 1.5);
        } else if (screenshot && progress >= 1) {
          screenshot.style.transform = 'translateY(0) scale(1)';
          screenshot.style.opacity = '1';
        }

        if (text) {
          var textProgress = Math.min(1, Math.max(0, progress - 0.15) / 0.85);
          text.style.opacity = textProgress;
          text.style.transform = 'translateY(' + ((1 - textProgress) * 24) + 'px)';
        }
      });
    }

    // Subtle parallax on screenshots (when fully visible)
    if (featuredImages.length > 0 && !reducedMotion) {
      var viewportCenter = vh / 2;
      featuredImages.forEach(function (img) {
        var rect = img.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) {
          var elCenter = rect.top + rect.height / 2;
          var offset = (elCenter - viewportCenter) * 0.03;
          // Only apply parallax if the scroll entrance is complete
          var parent = img.closest('.showcase-inner');
          if (parent) {
            var pRect = parent.getBoundingClientRect();
            var pProgress = 1 - (pRect.top - vh * 0.3) / (vh * 0.5);
            if (pProgress >= 1) {
              img.style.transform = 'translateY(' + offset + 'px)';
            }
          }
        }
      });
    }

    scrollTicking = false;
  }

  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      requestAnimationFrame(onScrollFrame);
      scrollTicking = true;
    }
  }, { passive: true });

  /* ============================================
     FEATURED SCREENSHOT TILT ON HOVER
     ============================================ */
  if (!isCoarse && !reducedMotion) {
    featuredImages.forEach(function (img) {
      img.addEventListener('mousemove', function (e) {
        var rect = img.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        var rotateX = y * -6;
        var rotateY = x * 6;
        img.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
        img.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
        img.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
      });

      img.addEventListener('mouseleave', function () {
        img.style.transform = '';
        img.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
        setTimeout(function () { img.style.transition = ''; }, 400);
      });

      img.addEventListener('mouseenter', function () {
        img.style.transition = 'transform 0.15s ease-out';
      });
    });
  }

  /* ============================================
     MAGNETIC BUTTONS
     ============================================ */
  if (!isCoarse && !reducedMotion) {
    var magneticBtns = document.querySelectorAll('.hero-cta, .btn-primary');
    magneticBtns.forEach(function (btn) {
      btn.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), background 0.15s ease, box-shadow 0.15s ease';

      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var maxDist = Math.max(rect.width, rect.height);
        var pullX = Math.max(-4, Math.min(4, (dx / maxDist) * 8));
        var pullY = Math.max(-4, Math.min(4, (dy / maxDist) * 8));
        btn.style.transform = 'translate(' + pullX + 'px, ' + pullY + 'px)';
      });

      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'translate(0, 0)';
      });

      // Ripple on click
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var ripple = document.createElement('span');
        var size = Math.max(rect.width, rect.height) * 2;
        ripple.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;' +
          'background:rgba(255,255,255,0.3);' +
          'width:' + size + 'px;height:' + size + 'px;' +
          'left:' + (e.clientX - rect.left - size / 2) + 'px;' +
          'top:' + (e.clientY - rect.top - size / 2) + 'px;' +
          'animation:ripple 0.5s cubic-bezier(0.22,1,0.36,1) forwards;';
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function () { ripple.remove(); });
      });
    });
  }

  /* ============================================
     CURSOR-FOLLOWING AMBIENT GRADIENT
     ============================================ */
  if (!isCoarse) {
    document.addEventListener('mousemove', function (e) {
      document.documentElement.style.setProperty('--cursor-x', e.clientX + 'px');
      document.documentElement.style.setProperty('--cursor-y', e.clientY + 'px');
    });
  }

  /* ============================================
     SCROLL PROGRESS BAR
     ============================================ */
  var progressSegments = document.querySelectorAll('.scroll-progress-segment');
  var progressSections = ['hero', 'about', 'projects', 'more-projects', 'contact'];

  // Build section offset cache
  var progressSectionEls = progressSections.map(function (id) {
    if (id === 'hero') return document.querySelector('.hero');
    return document.getElementById(id);
  }).filter(Boolean);

  function updateProgressBar() {
    if (progressSegments.length === 0) return;
    var scrollY = window.pageYOffset;
    var offsets = progressSectionEls.map(function (el) { return el.offsetTop; });
    offsets.push(document.documentElement.scrollHeight);

    progressSegments.forEach(function (seg, i) {
      if (i >= offsets.length - 1) return;
      var sectionStart = offsets[i];
      var sectionEnd = offsets[i + 1];
      var sectionHeight = sectionEnd - sectionStart;
      var viewMiddle = scrollY + window.innerHeight * 0.4;

      var fill = seg.querySelector('.scroll-progress-fill');
      if (!fill) {
        fill = document.createElement('div');
        fill.className = 'scroll-progress-fill';
        fill.style.cssText = 'position:absolute;inset:0;background:var(--accent);transform-origin:top;transition:transform 0.15s ease;';
        seg.appendChild(fill);
      }

      if (viewMiddle >= sectionEnd) {
        fill.style.transform = 'scaleY(1)';
      } else if (viewMiddle > sectionStart) {
        var pct = Math.min(1, (viewMiddle - sectionStart) / sectionHeight);
        fill.style.transform = 'scaleY(' + pct + ')';
      } else {
        fill.style.transform = 'scaleY(0)';
      }
    });
  }

  // Integrate progress bar into the shared scroll frame
  var origOnScroll = onScrollFrame;
  onScrollFrame = function () {
    origOnScroll();
    updateProgressBar();
  };

  updateProgressBar();

  /* ============================================
     SMOOTH SCROLL
     ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ============================================
     FOOTER YEAR
     ============================================ */
  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
