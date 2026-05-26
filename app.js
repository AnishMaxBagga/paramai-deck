/* =============================================================
   ParamAI — paramai.bio
   Scroll engine. The flow-field hero lives in flowfield.js.
   ============================================================= */

(function () {
  'use strict';

  document.documentElement.classList.add('anim-ready');

  function init() {
    setupScrollAnimations();
    setupReadProgress();
    setupSmoothScroll();
    setupYearStamps();
  }

  function setupScrollAnimations() {
    document.querySelectorAll('[data-anim]').forEach((el) => {
      el.classList.add('anim');
      el.classList.add('anim-' + el.dataset.anim);
      if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay + 'ms';
    });

    document.querySelectorAll('[data-stagger]').forEach((container) => {
      const step = parseInt(container.dataset.stagger || '120', 10);
      Array.from(container.children).forEach((child, i) => {
        if (!child.classList.contains('anim')) {
          child.classList.add('anim', 'anim-fade-up');
        }
        const base = parseInt(child.style.transitionDelay || '0', 10) || 0;
        child.style.transitionDelay = (base + i * step) + 'ms';
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          if (e.target.dataset.once !== 'false') io.unobserve(e.target);
        } else if (e.target.dataset.once === 'false') {
          e.target.classList.remove('in');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.anim').forEach((el) => io.observe(el));
  }

  function setupReadProgress() {
    const bar = document.querySelector('.read-progress');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement;
      const pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
      bar.style.transform = `scaleX(${Math.max(0, Math.min(1, pct))})`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + id);
        }
      });
    });
  }

  function setupYearStamps() {
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
