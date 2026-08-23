/* ==========================================================================
   KŌRI — NIGHT CURRENT
   Vanilla JS. No dependencies. All interactions fully wired.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- SHARED STATE ---------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
  const body = document.body;

  /* ==========================================================================
     01 — OPENING SEQUENCE
     ========================================================================== */
  function runOpeningSequence() {
    const opening = document.getElementById('opening');

    if (!opening) return;

    // Safety net: whatever happens above, never let the preloader block
    // the page (and its buttons) forever, even if some asset never fires
    // a load/error event.
    const MAX_WAIT = 12000;
    let hidden = false;

    const hideOpening = () => {
      if (hidden) return;
      hidden = true;
      opening.classList.add('is-hidden');
      opening.setAttribute('aria-hidden', 'true');
      body.classList.remove('is-loading');
      triggerHeroReveal();
    };

    const forceHide = () => hideOpening();
    window.setTimeout(forceHide, MAX_WAIT);

    if (prefersReducedMotion) {
      hideOpening();
      return;
    }

    body.classList.add('is-loading');

    // Choreography (ms from start): frost spreads across the glass, then a
    // warm circle melts through it at center as the wordmark resolves —
    // echoing KŌRI, "ice". The mark/line/subtitle animate on a fixed
    // schedule, but the mask only actually lifts once the page has
    // genuinely finished loading (images, fonts, etc.) — whichever of the
    // two (animation vs. real load) finishes last wins.
    // 0    — black screen; frost begins branching outward from center
    // 900  — finer frost twigs fill in around the main branches
    // 1500 — a warm circle starts melting through the frost; mark resolves
    // 1600 — thin line draws itself under the mark
    // 2000 — subtitle fades in
    // 2850 — earliest the mask is allowed to lift (min. display time)
    let minDisplayTimeElapsed = false;
    let pageFullyLoaded = false;

    const maybeLiftMask = () => {
      if (minDisplayTimeElapsed && pageFullyLoaded) {
        hideOpening();
      }
    };

    requestAnimationFrame(() => {
      setTimeout(() => opening.classList.add('is-frosting'), 0);
      setTimeout(() => {
        opening.classList.add('is-melting');
        opening.classList.add('is-mark-active');
      }, 1500);
      setTimeout(() => opening.classList.add('is-line-active'), 1600);
      setTimeout(() => opening.classList.add('is-sub-active'), 2000);

      // Minimum time the preloader stays up, so the animation always
      // reads as intentional rather than a flash on fast connections.
      setTimeout(() => {
        minDisplayTimeElapsed = true;
        maybeLiftMask();
      }, 2850);
    });

    // Wait for the page to be genuinely ready: all images and fonts.
    // Many images below the fold use loading="lazy", so the native
    // window "load" event fires before they're actually fetched — we
    // wait on each <img> element directly instead, which also forces
    // the browser to fetch lazy images immediately rather than waiting
    // for them to scroll into view.
    const fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready.catch(() => {})
      : Promise.resolve();

    const allImages = Array.from(document.images);
    const imagesReady = Promise.all(
      allImages.map((img) => {
        // Force-fetch lazy images now instead of waiting for scroll.
        if (img.loading === 'lazy') img.loading = 'eager';

        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();

        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })
    );

    const windowLoaded = new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve(), { once: true });
      }
    });

    Promise.all([windowLoaded, fontsReady, imagesReady]).then(() => {
      pageFullyLoaded = true;
      maybeLiftMask();
    });
  }

  function triggerHeroReveal() {
    document.querySelectorAll('.hero [data-delay]').forEach((el) => {
      el.classList.add('is-visible');
    });
  }

  /* ==========================================================================
     02 — SCROLL REVEAL (IntersectionObserver)
     ========================================================================== */
  function initScrollReveal() {
    const revealTargets = document.querySelectorAll('[data-reveal], [data-reveal-media], .reveal-up');

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      revealTargets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );

    revealTargets.forEach((el) => observer.observe(el));
  }

  /* ==========================================================================
     03 — NAVIGATION SCROLL STATE
     ========================================================================== */
  function initNavScroll() {
    const nav = document.getElementById('siteNav');
    if (!nav) return;

    let ticking = false;

    function update() {
      if (window.scrollY > 40) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  }

  /* ==========================================================================
     04 — MOBILE NAVIGATION
     ========================================================================== */
  function initMobileMenu() {
    const burger = document.getElementById('burgerBtn');
    const menu = document.getElementById('mobileMenu');
    const nav = document.getElementById('siteNav');
    if (!burger || !menu) return;

    function openMenu() {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Закрыть меню');
      body.style.overflow = 'hidden';
      if (nav) nav.classList.add('menu-open');
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      body.style.overflow = '';
      if (nav) nav.classList.remove('menu-open');
    }

    burger.addEventListener('click', () => {
      const isOpen = menu.classList.contains('is-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.querySelectorAll('[data-mobile-link]').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    menu.querySelector('.mobile-menu__cta')?.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
        burger.focus();
      }
    });
  }

  /* ==========================================================================
     05 — DISH SCROLL STORYTELLING (Section 03)
     ========================================================================== */
  function initDishGallery() {
    const dishes = document.querySelectorAll('.dish');
    if (!dishes.length) return;

    if (!('IntersectionObserver' in window)) {
      dishes.forEach((d) => d.classList.add('is-active'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-active');
          }
        });
      },
      { threshold: 0.4 }
    );

    dishes.forEach((dish) => observer.observe(dish));
  }

  /* ==========================================================================
     06 — MENU TABS (Section 06)
     ========================================================================== */
  function initMenuTabs() {
    const tabs = document.querySelectorAll('[data-menu-tab]');
    const panels = document.querySelectorAll('[data-menu-panel]');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-menu-tab');

        tabs.forEach((t) => {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach((panel) => {
          const match = panel.getAttribute('data-menu-panel') === target;
          panel.classList.toggle('is-active', match);
          panel.hidden = !match;
        });
      });

      tab.addEventListener('keydown', (e) => {
        const tabArray = Array.from(tabs);
        const idx = tabArray.indexOf(tab);
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          tabArray[(idx + 1) % tabArray.length].focus();
          tabArray[(idx + 1) % tabArray.length].click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          tabArray[(idx - 1 + tabArray.length) % tabArray.length].focus();
          tabArray[(idx - 1 + tabArray.length) % tabArray.length].click();
        }
      });
    });
  }

  /* ==========================================================================
     07 — MAGNETIC BUTTONS (desktop only)
     ========================================================================== */
  function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) return;

    const buttons = document.querySelectorAll('[data-magnetic]');
    const maxMove = 8;

    buttons.forEach((btn) => {
      let rafId = null;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;

      function animate() {
        currentX += (targetX - currentX) * 0.2;
        currentY += (targetY - currentY) * 0.2;
        btn.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px)`;

        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
          rafId = requestAnimationFrame(animate);
        } else {
          rafId = null;
        }
      }

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        targetX = (relX / (rect.width / 2)) * maxMove;
        targetY = (relY / (rect.height / 2)) * maxMove;

        if (!rafId) rafId = requestAnimationFrame(animate);
      });

      btn.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
        if (!rafId) rafId = requestAnimationFrame(animate);
      });
    });
  }

  /* ==========================================================================
     08 — SPOTLIGHT CURSOR (desktop only)
     ========================================================================== */
  function initSpotlightCursor() {
    if (isTouchDevice || prefersReducedMotion) return;

    const spotlight = document.getElementById('spotlight');
    if (!spotlight) return;

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId = null;
    let active = false;

    function loop() {
      currentX += (mouseX - currentX) * 0.12;
      currentY += (mouseY - currentY) * 0.12;
      spotlight.style.transform = `translate(${currentX}px, ${currentY}px)`;
      rafId = requestAnimationFrame(loop);
    }

    window.addEventListener(
      'mousemove',
      (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!active) {
          active = true;
          spotlight.classList.add('is-active');
        }
        if (!rafId) rafId = requestAnimationFrame(loop);
      },
      { passive: true }
    );

    document.addEventListener('mouseleave', () => {
      spotlight.classList.remove('is-active');
    });
  }

  /* ==========================================================================
     09 — DEPTH PARALLAX (lightweight, transform-only)
     ========================================================================== */
  function initParallax() {
    if (prefersReducedMotion) return;

    const layers = document.querySelectorAll('.counter__image--offset, .night-bar__glass');
    if (!layers.length) return;

    let ticking = false;

    function update() {
      const scrollY = window.scrollY;
      layers.forEach((layer, i) => {
        const speed = 0.06 + i * 0.02;
        const offset = scrollY * speed * (isTouchDevice ? 0.4 : 1);
        layer.style.transform = `translateY(${Math.min(offset, 40)}px)`;
      });
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ==========================================================================
     10 — 3D TILT (select interactive panels, desktop only)
     ========================================================================== */
  function initTilt() {
    if (isTouchDevice || prefersReducedMotion) return;

    const tiltTargets = document.querySelectorAll('.counter__media, .chef__media');
    const maxTilt = 3;

    tiltTargets.forEach((el) => {
      el.setAttribute('data-tilt', '');

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = (-py * maxTilt).toFixed(2);
        const rotateY = (px * maxTilt).toFixed(2);
        el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  /* ==========================================================================
     11 — RESERVATION PANEL
     ========================================================================== */
  function initReservationPanel() {
    const panel = document.getElementById('resPanel');
    const form = document.getElementById('resForm');
    const status = document.getElementById('resStatus');
    if (!panel) return;

    let lastFocused = null;

    function openPanel() {
      lastFocused = document.activeElement;
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      body.style.overflow = 'hidden';

      const firstField = panel.querySelector('input, select, button');
      if (firstField) firstField.focus();
    }

    function closePanel() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    document.querySelectorAll('[data-open-reservation]').forEach((trigger) => {
      trigger.addEventListener('click', openPanel);
    });

    panel.querySelectorAll('[data-close-reservation]').forEach((trigger) => {
      trigger.addEventListener('click', closePanel);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        closePanel();
      }
    });

    // focus trap
    panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !panel.classList.contains('is-open')) return;

      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = new FormData(form);
        const name = (data.get('name') || '').toString().trim();
        const date = data.get('date');
        const time = data.get('time');
        const guests = data.get('guests');
        const experience = data.get('experience');
        const phone = (data.get('phone') || '').toString().trim();

        if (!name || !date || !time || !guests || !experience || !phone) {
          if (status) status.textContent = 'Пожалуйста, заполните все поля перед запросом места.';
          return;
        }

        if (status) {
          status.textContent = `Запрос получен, ${name.split(' ')[0]}. Мы удерживаем ваше место до подтверждения по телефону.`;
        }

        form.reset();

        setTimeout(() => {
          closePanel();
          if (status) status.textContent = '';
        }, 2600);
      });
    }
  }

  /* ==========================================================================
     12 — SMOOTH ANCHOR SCROLL (progressive enhancement)
     ========================================================================== */
  function initAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        const navHeight = document.getElementById('siteNav')?.offsetHeight || 0;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight + 1;

        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      });
    });
  }

  /* ==========================================================================
     INIT
     ========================================================================== */
  function init() {
    const steps = [
      runOpeningSequence,
      initScrollReveal,
      initNavScroll,
      initMobileMenu,
      initDishGallery,
      initMenuTabs,
      initMagneticButtons,
      initSpotlightCursor,
      initParallax,
      initTilt,
      initReservationPanel,
      initAnchorScroll,
    ];

    // Run every init step independently: if one throws (e.g. an
    // unsupported API in an older browser), the rest — including the
    // reservation panel and menu tabs — still get wired up.
    steps.forEach((step) => {
      try {
        step();
      } catch (err) {
        console.error(`[KŌRI] ${step.name} failed:`, err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
