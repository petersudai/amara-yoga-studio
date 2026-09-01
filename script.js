/* ============================================================
   Amara Yoga Studio — interactions
   All motion respects prefers-reduced-motion and touch input.
============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ----------------------------------------------------------
     LOADER  +  hero intro
  ---------------------------------------------------------- */
  var loader = document.getElementById('loader');
  var loaderCount = document.getElementById('loaderCount');
  var heroTitle = document.getElementById('heroTitle');
  var heroContent = document.getElementById('heroContent');

  function playHeroIntro() {
    // Small timeout so the initial (hidden) state paints before we flip to
    // the visible state — lets the CSS transition run. Timeouts (unlike rAF)
    // still fire in a background tab, so content can't get stuck hidden.
    setTimeout(function () {
      if (heroTitle) heroTitle.classList.add('is-in');
      if (heroContent) heroContent.classList.add('is-in');
    }, 60);
  }

  var loadDone = false;
  function dismissLoader() {
    if (loadDone) return;
    loadDone = true;
    if (loader) {
      loader.classList.add('done');
      // Hard fallback in case the slide transition is interrupted/janky.
      setTimeout(function () { loader.style.display = 'none'; }, 1200);
    }
    playHeroIntro();
  }

  function runCounter() {
    if (!loader || !loaderCount) { dismissLoader(); return; }
    var n = 0;
    var tick = setInterval(function () {
      n = Math.min(100, n + Math.round(5 + Math.random() * 14));
      loaderCount.textContent = n;
      if (n >= 100) {
        clearInterval(tick);
        setTimeout(dismissLoader, 200);
      }
    }, 60);
  }

  function finishLoad() {
    if (!loader || reduceMotion || document.visibilityState === 'hidden') {
      // Nobody's watching the loader (reduced motion, or a background tab
      // where timers are throttled) — don't animate it, just clear it.
      dismissLoader();
      return;
    }
    runCounter();
  }

  finishLoad();
  // Reliable independent triggers: `load` fires even in background tabs, and
  // the user returning to a backgrounded tab should never find the loader up.
  window.addEventListener('load', dismissLoader);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') dismissLoader();
  });
  setTimeout(dismissLoader, 3000);

  /* ----------------------------------------------------------
     NAV — shrink, hide on scroll-down, active link
  ---------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var lastY = window.scrollY;

  function onNavScroll() {
    var y = window.scrollY;
    if (y > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');

    if (y > 240 && y > lastY + 4) nav.classList.add('nav--hidden');
    else if (y < lastY - 4) nav.classList.remove('nav--hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  // Active link via IntersectionObserver
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('#navLinks a'));
  var linkFor = {};
  navLinks.forEach(function (a) {
    var id = a.getAttribute('href').replace('#', '');
    linkFor[id] = a;
  });
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('href').replace('#', '')); })
    .filter(Boolean);
  if (sections.length) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('is-active'); });
        var active = linkFor[e.target.id];
        if (active) active.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { secObs.observe(s); });
  }

  /* ----------------------------------------------------------
     MOBILE MENU
  ---------------------------------------------------------- */
  var menuBtn = document.getElementById('menuBtn');
  var mobilePanel = document.getElementById('mobilePanel');
  if (menuBtn && mobilePanel) {
    menuBtn.addEventListener('click', function () {
      var open = mobilePanel.classList.toggle('open');
      menuBtn.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobilePanel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobilePanel.classList.remove('open');
        menuBtn.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL
  ---------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function (el) { io.observe(el); });

  /* ----------------------------------------------------------
     SCROLL PROGRESS BAR
  ---------------------------------------------------------- */
  var progressBar = document.getElementById('scrollProgress');
  function updateProgress() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? h.scrollTop / max : 0;
    if (progressBar) progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ----------------------------------------------------------
     PARALLAX  (transform only, rAF-throttled)
  ---------------------------------------------------------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var parallaxTick = false;
  function runParallax() {
    parallaxTick = false;
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      var rect = el.getBoundingClientRect();
      var mid = rect.top + rect.height / 2;
      var offset = (mid - vh / 2) * speed;
      el.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
    });
  }
  if (parallaxEls.length && !reduceMotion) {
    window.addEventListener('scroll', function () {
      if (!parallaxTick) { parallaxTick = true; requestAnimationFrame(runParallax); }
    }, { passive: true });
    window.addEventListener('resize', runParallax);
    runParallax();
  }

  /* ----------------------------------------------------------
     HORIZONTAL PINNED CLASSES
  ---------------------------------------------------------- */
  var hSection = document.getElementById('classes');
  var hTrack = document.getElementById('hsTrack');
  var hProgress = document.getElementById('hsProgress');
  var hCount = document.getElementById('hsCount');
  var pinEnabled = false;
  var pinDistance = 0;

  function pinAllowed() {
    return !reduceMotion && window.matchMedia('(min-width: 821px)').matches;
  }

  function layoutPin() {
    if (!hSection || !hTrack) return;
    if (!pinAllowed()) {
      hSection.classList.add('no-pin');
      hSection.style.height = '';
      hTrack.style.transform = '';
      pinEnabled = false;
      return;
    }
    hSection.classList.remove('no-pin');
    pinEnabled = true;
    var extra = hTrack.scrollWidth - window.innerWidth;
    pinDistance = Math.max(0, extra + 80);
    hSection.style.height = (window.innerHeight + pinDistance) + 'px';
    updatePin();
  }

  function updatePin() {
    if (!pinEnabled || !hSection) return;
    var top = hSection.offsetTop;
    var p = clamp((window.scrollY - top) / pinDistance, 0, 1);
    hTrack.style.transform = 'translate3d(' + (-p * pinDistance).toFixed(2) + 'px,0,0)';
    if (hProgress) hProgress.style.transform = 'scaleX(' + (0.15 + p * 0.85).toFixed(4) + ')';
    if (hCount) {
      var idx = Math.min(6, 1 + Math.round(p * 5));
      hCount.textContent = idx < 10 ? '0' + idx : idx;
    }
  }

  if (hSection && hTrack) {
    window.addEventListener('scroll', function () {
      if (!parallaxTick) { requestAnimationFrame(updatePin); }
      else updatePin();
    }, { passive: true });
    var pinResizeT;
    window.addEventListener('resize', function () {
      clearTimeout(pinResizeT);
      pinResizeT = setTimeout(layoutPin, 150);
    });
    // Recompute once fonts/images settle
    window.addEventListener('load', layoutPin);
    setTimeout(layoutPin, 300);
    layoutPin();
  }

  /* ----------------------------------------------------------
     BREATH LABEL CYCLING
  ---------------------------------------------------------- */
  var breathLabel = document.getElementById('breathLabel');
  if (breathLabel && !reduceMotion) {
    var phases = [
      { text: 'Inhale', duration: 4000 },
      { text: 'Hold', duration: 1500 },
      { text: 'Exhale', duration: 4000 },
      { text: 'Hold', duration: 1500 }
    ];
    var pi = 0;
    var cycle = function () {
      breathLabel.textContent = phases[pi].text;
      setTimeout(function () { pi = (pi + 1) % phases.length; cycle(); }, phases[pi].duration);
    };
    cycle();
  }

  /* ----------------------------------------------------------
     TESTIMONIAL CAROUSEL
  ---------------------------------------------------------- */
  var quotes = [
    { text: '"I came in tight from a decade at a desk. Six months later I can touch the floor without thinking about it — but the real change was learning to exhale on purpose."', cite: 'Dana Whitfield · Member since 2023' },
    { text: '"The 6am class rearranged my whole day. I show up to work already having done the hardest, quietest thing."', cite: 'Owen Marsh · Member since 2022' },
    { text: '"Prenatal with Priya got me through both pregnancies. She teaches the body, not the pose."', cite: 'Farah Idris · Member since 2021' }
  ];
  var quoteText = document.getElementById('quoteText');
  var quoteCite = document.getElementById('quoteCite');
  var dots = document.querySelectorAll('#quoteDots button');
  var quoteIndex = 0;
  var quoteTimer;

  function setQuote(idx) {
    if (!quoteText || !quoteCite) return;
    quoteText.style.transition = 'opacity .4s ease';
    quoteCite.style.transition = 'opacity .4s ease';
    quoteText.style.opacity = 0;
    quoteCite.style.opacity = 0;
    setTimeout(function () {
      quoteText.textContent = quotes[idx].text;
      quoteCite.textContent = quotes[idx].cite;
      quoteText.style.opacity = 1;
      quoteCite.style.opacity = 1;
    }, 260);
    dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    quoteIndex = idx;
  }
  function autoQuote() {
    clearInterval(quoteTimer);
    quoteTimer = setInterval(function () { setQuote((quoteIndex + 1) % quotes.length); }, 7000);
  }
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { setQuote(i); autoQuote(); });
  });
  if (dots.length) autoQuote();

  /* ----------------------------------------------------------
     DARK SECTION SPOTLIGHT
  ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.section-dark').forEach(function (sec) {
      sec.addEventListener('pointermove', function (e) {
        var r = sec.getBoundingClientRect();
        sec.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        sec.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        sec.classList.add('spot-on');
      });
      sec.addEventListener('pointerleave', function () { sec.classList.remove('spot-on'); });
    });
  }

  /* ----------------------------------------------------------
     NEWSLETTER FORM (front-end demo)
  ---------------------------------------------------------- */
  var newsForm = document.getElementById('newsForm');
  if (newsForm) {
    newsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = newsForm.querySelector('input');
      input.value = '';
      input.placeholder = 'Thank you — check your inbox';
    });
  }

  /* ----------------------------------------------------------
     CUSTOM CURSOR  +  MAGNETIC BUTTONS
     (fine-pointer, non-reduced-motion only)
  ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    var cursor = document.getElementById('cursor');
    var dot = document.getElementById('cursorDot');
    if (cursor && dot) {
      document.body.classList.add('cursor-on');
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      var rx = cx, ry = cy, dx = cx, dy = cy;
      var raf;

      function render() {
        rx = lerp(rx, cx, 0.16);
        ry = lerp(ry, cy, 0.16);
        dx = lerp(dx, cx, 0.35);
        dy = lerp(dy, cy, 0.35);
        cursor.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-50%)';
        dot.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0) translate(-50%,-50%)';
        raf = requestAnimationFrame(render);
      }
      render();

      window.addEventListener('pointermove', function (e) {
        cx = e.clientX; cy = e.clientY;
        cursor.classList.remove('is-hidden');
        dot.classList.remove('is-hidden');
      }, { passive: true });
      document.addEventListener('pointerleave', function () {
        cursor.classList.add('is-hidden');
        dot.classList.add('is-hidden');
      });
      window.addEventListener('blur', function () {
        if (raf) cancelAnimationFrame(raf);
      });
      window.addEventListener('focus', function () {
        if (raf) cancelAnimationFrame(raf);
        render();
      });

      var growSel = 'a, button, [data-cursor-grow]';
      document.querySelectorAll(growSel).forEach(function (el) {
        el.addEventListener('pointerenter', function () { cursor.classList.add('is-grow'); });
        el.addEventListener('pointerleave', function () { cursor.classList.remove('is-grow'); });
      });
      document.querySelectorAll('[data-cursor-drag]').forEach(function (el) {
        el.addEventListener('pointerenter', function () { cursor.classList.add('is-drag'); });
        el.addEventListener('pointerleave', function () { cursor.classList.remove('is-drag'); });
      });

      // Magnetic
      document.querySelectorAll('[data-magnetic]').forEach(function (el) {
        var strength = 0.32;
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var mx = e.clientX - (r.left + r.width / 2);
          var my = e.clientY - (r.top + r.height / 2);
          el.style.transform = 'translate(' + (mx * strength) + 'px,' + (my * strength) + 'px)';
        });
        el.addEventListener('pointerleave', function () {
          el.style.transform = '';
        });
      });
    }
  }

})();
