/* ==========================================================================
   Scroll Reveal + Chapter Reading Progress
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupReveal() {
    var seen = new Set();
    var revealTargets = [];

    function collect(selectors, speed) {
      selectors.forEach(function (selector) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
          if (seen.has(nodes[i])) {
            continue;
          }
          seen.add(nodes[i]);
          revealTargets.push({ node: nodes[i], speed: speed });
        }
      });
    }

    collect(
      [
        '.hero h1',
        '.hero .subtitle',
        '.hero .author-bio',
        '.hero .description',
        '.download-btn',
        '.toc h2',
        '.toc-part',
        '.integrity',
        '.hash-display',
      ],
      'fast'
    );
    collect(
      [
        '.sealed-proof',
        'figure.figure',
        '.key-findings',
        'table.longtable',
        '.chapter-nav',
      ],
      'slow'
    );

    if (!revealTargets.length) {
      return;
    }

    revealTargets.forEach(function (target, index) {
      var node = target.node;
      node.classList.add('reveal');
      node.setAttribute('data-reveal', 'pending');
      node.setAttribute('data-reveal-speed', target.speed);
      node.style.setProperty('--reveal-order', String(index % 10));
    });

    function revealNode(node) {
      node.classList.add('is-visible');
      node.setAttribute('data-reveal', 'shown');
    }

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      revealTargets.forEach(function (target) {
        revealNode(target.node);
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries, currentObserver) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        revealNode(entry.target);
        currentObserver.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    });

    revealTargets.forEach(function (target) {
      observer.observe(target.node);
    });
  }

  function setupReadingProgress() {
    var progressRoot = document.querySelector('[data-progress="chapter"]');
    if (!progressRoot) {
      return;
    }

    var progressBar = progressRoot.querySelector('.reading-progress__bar');
    if (!progressBar) {
      return;
    }

    var ticking = false;

    function updateProgress() {
      ticking = false;

      var docEl = document.documentElement;
      var maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      var scrollTop = window.pageYOffset || docEl.scrollTop || 0;
      var ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));

      progressBar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';

      if (docEl.scrollHeight - window.innerHeight > 120) {
        progressRoot.classList.add('is-active');
        progressRoot.setAttribute('aria-hidden', 'false');
      } else {
        progressRoot.classList.remove('is-active');
        progressRoot.setAttribute('aria-hidden', 'true');
      }
    }

    function requestUpdate() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateProgress);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    updateProgress();
  }

  setupReveal();
  setupReadingProgress();
})();
