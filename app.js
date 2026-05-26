/* =============================================================
   ParamAI — paramai.bio
   Scroll engine (borrowed from EOHF, fail-safe) + map sequence.
   ============================================================= */

(function () {
  'use strict';

  document.documentElement.classList.add('anim-ready');

  function init() {
    // ---------- Generic scroll-in animations ----------
    document.querySelectorAll('[data-anim]').forEach((el) => {
      el.classList.add('anim');
      el.classList.add('anim-' + el.dataset.anim);
      if (el.dataset.delay) {
        el.style.transitionDelay = el.dataset.delay + 'ms';
      }
    });

    // Auto-stagger children of [data-stagger] containers
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

    // Observe and toggle .in
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          if (e.target.dataset.once !== 'false') {
            io.unobserve(e.target);
          }
        } else if (e.target.dataset.once === 'false') {
          e.target.classList.remove('in');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.anim').forEach((el) => io.observe(el));

    // ---------- Reading-progress bar ----------
    const bar = document.querySelector('.read-progress');
    if (bar) {
      const onScroll = () => {
        const h = document.documentElement;
        const pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
        bar.style.transform = `scaleX(${Math.max(0, Math.min(1, pct))})`;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // ---------- Smooth scroll for in-page anchors ----------
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

    // ---------- Year stamp ----------
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    // ---------- Physiology map sequence ----------
    runMapSequence();
  }

  /* =====================================================
     Physiology map: animates the drug-disposition flow.
     Sequence:
       1. Drug arrives at gut (oral absorption)
       2. Travels portal vein to liver (first pass)
       3. Liver to systemic circulation
       4. Systemic distributes to brain, kidneys, tissue
       5. Pause, callouts fade in showing parameters
       6. Loop with a slight delay
     ===================================================== */

  const SEQUENCE = [
    { compartment: 'comp-gut',      flow: 'flow-gut-liver',     caption: 'Drug enters at the gut · F_oral, k_a',           olive: true },
    { compartment: 'comp-liver',    flow: 'flow-liver-systemic', caption: 'First-pass metabolism · Q_H = 90 L/h, CL_int' },
    { compartment: 'comp-heart',    flow: null,                  caption: 'Systemic distribution · cardiac output' },
    { compartment: 'comp-lung',     flow: 'flow-heart-lung',     caption: 'Lung perfusion · Q_lung' },
    { compartment: 'comp-brain',    flow: 'flow-heart-brain',    caption: 'Brain · BBB permeability, K_p,brain' },
    { compartment: 'comp-kidney-l', flow: 'flow-heart-kidney-l', caption: 'Renal clearance · Q_R = 74 L/h, CL_R' },
    { compartment: 'comp-kidney-r', flow: 'flow-heart-kidney-r', caption: '' },  // sibling, no caption
    { compartment: 'comp-rest',     flow: null,                  caption: 'Tissue distribution · K_p,tissue, V_d',         olive: true },
  ];

  const CALLOUTS = ['callout-1', 'callout-2', 'callout-3', 'callout-4'];

  let mapTimers = [];
  let mapRunning = false;

  function clearMapTimers() {
    mapTimers.forEach(clearTimeout);
    mapTimers = [];
  }

  function setT(fn, ms) {
    const id = setTimeout(fn, ms);
    mapTimers.push(id);
    return id;
  }

  function resetMap() {
    document.querySelectorAll('.compartment').forEach((el) => {
      el.classList.remove('lit', 'olive');
    });
    document.querySelectorAll('.flow-line').forEach((el) => {
      el.classList.remove('active');
    });
    CALLOUTS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('shown');
    });
    const cap = document.getElementById('map-caption');
    if (cap) cap.textContent = '';
  }

  function runMapSequence() {
    if (mapRunning) return;
    mapRunning = true;
    clearMapTimers();
    resetMap();

    let t = 400; // initial delay
    const step = 750;

    SEQUENCE.forEach((entry, idx) => {
      setT(() => {
        // Light the compartment
        const compGroup = document.getElementById(entry.compartment);
        if (compGroup) {
          const circle = compGroup.querySelector('.compartment');
          if (circle) {
            circle.classList.add('lit');
            if (entry.olive) circle.classList.add('olive');
          }
        }
        // Activate the inbound flow line
        if (entry.flow) {
          const flow = document.getElementById(entry.flow);
          if (flow) flow.classList.add('active');
        }
        // Update caption
        if (entry.caption) {
          const cap = document.getElementById('map-caption');
          if (cap) {
            cap.style.opacity = '0';
            setTimeout(() => {
              cap.textContent = entry.caption;
              cap.style.opacity = '1';
            }, 200);
          }
        }
      }, t);
      t += step;
    });

    // After the sequence, fade in callouts
    CALLOUTS.forEach((id, i) => {
      setT(() => {
        const el = document.getElementById(id);
        if (el) el.classList.add('shown');
      }, t + i * 350);
    });

    // Loop after a long pause
    const totalDuration = t + CALLOUTS.length * 350 + 3500;
    setT(() => {
      mapRunning = false;
      runMapSequence();
    }, totalDuration);
  }

  // ---------- Boot ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
