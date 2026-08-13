/* =============================================================
   ParamAI — paramai.bio
   Scroll engine. The flow-field hero lives in flowfield.js.
   ============================================================= */

(function () {
  'use strict';

  document.documentElement.classList.add('anim-ready');

  function init() {
    // Belt-and-suspenders against scroll restoration — some browsers restore
    // scroll position after DOMContentLoaded even with scrollRestoration=manual.
    window.scrollTo(0, 0);
    setupScrollAnimations();
    setupReadProgress();
    setupSmoothScroll();
    setupYearStamps();
    setupNarrativeHero();
    setupHero2();
  }

  // ---------- Narrative hero scene controller (Hero 1) ----------
  function setupNarrativeHero() {
    // Scope to the FIRST hero block only — Hero 2 has its own controller.
    const hero1 = document.querySelector('.hero-narrative:not(.hero-deck-2)');
    if (!hero1) return;
    const headlines = hero1.querySelectorAll('.scene-headline');
    const scenes    = hero1.querySelectorAll('.narrative-scene');
    const dots      = hero1.querySelectorAll('.scene-dot');
    const adrGrid      = document.querySelector('.adr-grid');

    if (!headlines.length || !scenes.length) return;

    // ADR grid: 200 cells, ~8.5% marked bad (≈ serious ADR rate of total reports)
    if (adrGrid && !adrGrid.children.length) {
      const total = 200;
      const badCount = 17;
      // Deterministic-ish distribution so it doesn't look clumped
      const badIndices = new Set();
      const step = total / badCount;
      for (let i = 0; i < badCount; i++) {
        badIndices.add(Math.floor(i * step + (i * 7) % 9));
      }
      for (let i = 0; i < total; i++) {
        const c = document.createElement('span');
        c.className = 'adr-cell' + (badIndices.has(i) ? ' adr-cell-bad' : '');
        adrGrid.appendChild(c);
      }
    }

    // Respect prefers-reduced-motion: just show the final hero-1 scene statically.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      const lastIdx = scenes.length - 1;
      headlines.forEach((el, i) => el.classList.toggle('shown', i === lastIdx));
      scenes.forEach((el, i) => el.classList.toggle('shown', i === lastIdx));
      dots.forEach((el, i) => el.classList.toggle('active', i === lastIdx));
      return;
    }

    // (Curve-drawing helpers are now module-level; see drawPredictionCurves below.)

    // Manual control: no auto-rotation. Visitor drives with keyboard or dots.
    let current = 0;
    let autoTimer = null;
    let autoKilled = true; // disabled — kept for compatibility with existing kill paths

    function playChoreo(sceneEl) {
      // Force a reflow so the class removal/add restarts the transitions.
      sceneEl.classList.remove('choreo-play');
      void sceneEl.getBoundingClientRect();
      requestAnimationFrame(() => sceneEl.classList.add('choreo-play'));
    }

    // ---------- Scene 2 funnel: count-down animation -------------
    // Each .funnel-bar-count text starts displaying "100" and tweens down to
    // its data-target value as the bar shrinks. Aligned with the CSS keyframe
    // timing in styles.css (bar 2: 0.40s delay 0.9s duration; bar 3: 0.80s+0.9s;
    // bar 4: 1.20s+0.9s).
    function animateFunnelCounts() {
      // Only the 4 trial-phase bars carry data-target (Pre-clinical bar shows "ParamAI" instead).
      const counts = document.querySelectorAll('.funnel-bar-count[data-target]');
      // bar index → [delay ms, duration ms]
      const timings = [
        [0, 0],            // Phase I stays at 100
        [400, 900],        // Phase II 100→63
        [800, 900],        // Phase III 100→31
        [1200, 900],       // Approved 100→12
      ];
      counts.forEach((el, i) => {
        const target = parseInt(el.dataset.target, 10);
        const [delay, duration] = timings[i];
        // Reset to 100 each time the scene plays
        el.textContent = '100';
        if (duration === 0) return;
        setTimeout(() => {
          const start = performance.now();
          function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(100 + (target - 100) * eased);
            el.textContent = value;
            if (t < 1) requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }, delay);
      });
    }

    function showScene(idx) {
      headlines.forEach((el) => el.classList.remove('shown'));
      scenes.forEach((el) => {
        el.classList.remove('shown');
        el.classList.remove('choreo-play');
      });
      dots.forEach((el) => el.classList.remove('active'));

      // data-scene attributes are 0-indexed and match `idx` directly.
      const h = document.querySelector(`.scene-headline[data-scene="${idx}"]`);
      const s = document.querySelector(`.narrative-scene[data-scene="${idx}"]`);
      const d = document.querySelector(`.scene-dot[data-scene="${idx}"]`);
      if (h) h.classList.add('shown');
      if (s) {
        s.classList.add('shown');
        // Kick off the per-scene choreography on the next frame so the
        // class change registers as a transition trigger.
        requestAnimationFrame(() => playChoreo(s));
      }
      if (d) d.classList.add('active');

      if (idx === 1) {
        // Combined funnel + Phase I timeline (idx=1): count-down animation
        animateFunnelCounts();
      }
      if (idx === 3) {
        // Pipeline scene (idx=3): extract → verify → derive
        animatePipeline();
      }
    }

    // ---------- Scene 3 pipeline: extract → verify → derive -----------
    // Mirrors the engine demo's sequential-reveal animation style.
    let pipelineRunId = 0;
    async function animatePipeline() {
      const myRun = ++pipelineRunId; // cancel any in-flight animation if revisited

      const step1 = document.querySelector('.pipe-step[data-step="0"]');
      const step2 = document.querySelector('.pipe-step[data-step="1"]');
      const step3 = document.querySelector('.pipe-step[data-step="2"]');
      const vals = document.querySelectorAll('.choreo-pipe-val');
      const checks = document.querySelectorAll('.choreo-pipe-check');
      const oldDerive = document.querySelector('.choreo-pipe-old');
      const arrowDerive = document.querySelector('.choreo-pipe-arrow');
      const newDerive = document.querySelector('.choreo-pipe-new');

      // Reset everything to hidden
      [step1, step2, step3].forEach(el => el && el.classList.remove('pipe-active'));
      vals.forEach(el => el.classList.remove('pipe-on'));
      checks.forEach(el => {
        el.classList.remove('pipe-on', 'pipe-checking', 'pipe-ok-done', 'pipe-bad-done');
      });
      [oldDerive, arrowDerive, newDerive].forEach(el => el && el.classList.remove('pipe-on'));

      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const stillCurrent = () => pipelineRunId === myRun;

      // STEP 1: Extract — show card, then values cascade in
      await wait(200);
      if (!stillCurrent()) return;
      step1 && step1.classList.add('pipe-active');
      await wait(300);
      for (const v of vals) {
        if (!stillCurrent()) return;
        v.classList.add('pipe-on');
        await wait(160);
      }

      // STEP 2: Verify — card appears, then checks fire with a "checking" pulse
      await wait(350);
      if (!stillCurrent()) return;
      step2 && step2.classList.add('pipe-active');
      await wait(280);
      for (let i = 0; i < checks.length; i++) {
        if (!stillCurrent()) return;
        const c = checks[i];
        c.classList.add('pipe-on', 'pipe-checking');
        await wait(280);
        if (!stillCurrent()) return;
        c.classList.remove('pipe-checking');
        const isBad = c.classList.contains('pipe-check-bad');
        c.classList.add(isBad ? 'pipe-bad-done' : 'pipe-ok-done');
        await wait(140);
      }

      // STEP 3: Derive — old value, arrow, new value
      await wait(450);
      if (!stillCurrent()) return;
      step3 && step3.classList.add('pipe-active');
      await wait(280);
      oldDerive && oldDerive.classList.add('pipe-on');
      await wait(400);
      if (!stillCurrent()) return;
      arrowDerive && arrowDerive.classList.add('pipe-on');
      await wait(300);
      if (!stillCurrent()) return;
      newDerive && newDerive.classList.add('pipe-on');
    }

    function scheduleNext() { /* auto-rotate disabled */ }
    function killAutoRotate() { /* no-op */ }

    // Kick off: show the first scene, choreography plays automatically.
    showScene(0);

    // Clicking a dot: jump to that scene. Clicking the active dot replays it.
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.scene, 10);
        current = target;
        showScene(target);
      });
      dot.style.cursor = 'pointer';
    });

    // Keyboard navigation: left/right arrows and space/PageDown to advance.
    function isInputFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }
    function isHeroInView() {
      // Only intercept keys while the hero is the primary focus on screen.
      return window.scrollY < window.innerHeight * 0.7;
    }
    window.addEventListener('keydown', (e) => {
      if (isInputFocused()) return;
      if (!isHeroInView()) return;
      const sceneCount = scenes.length;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (current < sceneCount - 1) {
          e.preventDefault();
          current++;
          showScene(current);
        } else {
          // Already on the last Hero 1 scene — pressing right hands off to the engine demo.
          e.preventDefault();
          const engineSection = document.getElementById('engine');
          if (engineSection) engineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            if (typeof window.runEngineDemo === 'function') window.runEngineDemo();
          }, 700);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (current > 0) {
          e.preventDefault();
          current--;
          showScene(current);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        current = 0;
        showScene(current);
      } else if (e.key === 'End') {
        e.preventDefault();
        current = sceneCount - 1;
        showScene(current);
      }
    });
  }

  // ---------- Curve drawing helpers (shared between Hero 2 and reduced-motion) ----------
  // Same PK model as the engine demo: same dose, same ka, different ke.
  //   ParamAI: ka=0.5, ke=0.020 (slow elimination, long tail — sits HIGHER)
  //   Naive:   ka=0.5, ke=0.053 (fast elimination — drops off, sits LOWER)
  function pkRaw(ka, ke, tMax, dt) {
    const F = 1.0, D = 100;
    const pts = [];
    for (let t = 0; t <= tMax; t += dt) {
      const c = (F * D * ka) / (ka - ke) * (Math.exp(-ke * t) - Math.exp(-ka * t));
      pts.push([t, Math.max(0, c)]);
    }
    return pts;
  }
  function ptsToPath(pts) {
    let d = '';
    pts.forEach(([x, y], i) => {
      d += (i === 0 ? 'M' : 'L') + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    });
    return d;
  }
  function trapezoidalAUC(points) {
    let auc = 0;
    for (let i = 1; i < points.length; i++) {
      const [t0, c0] = points[i - 1];
      const [t1, c1] = points[i];
      auc += (c0 + c1) * 0.5 * (t1 - t0);
    }
    return auc;
  }

  // Draws the two-curve + observed-dots prediction chart for the given element IDs and viewBox geometry.
  function drawPredictionCurves(opts) {
    const {
      curveGoodId, curveNaiveId, aucGoodId, aucNaiveId,
      aucGoodTextId, aucNaiveTextId, ratioTextId,
      observedLineId, observedDotsId,
      xLeft, xRight, yAxis, peakY
    } = opts;

    const tMax = 24;
    const goodRaw  = pkRaw(0.5, 0.020, tMax, 0.3);
    const naiveRaw = pkRaw(0.5, 0.053, tMax, 0.3);
    const sharedCmax = Math.max.apply(null, goodRaw.map(p => p[1]));

    function plotRaw(raw) {
      const targetH = yAxis - peakY;
      const spanX = xRight - xLeft;
      return raw.map(([t, c]) => [
        xLeft + (t / tMax) * spanX,
        yAxis - (c / sharedCmax) * targetH
      ]);
    }
    function closeUnderAxis(pts) {
      const last = pts[pts.length - 1];
      const first = pts[0];
      let d = ptsToPath(pts);
      d += `L ${last[0].toFixed(1)} ${yAxis.toFixed(1)} `;
      d += `L ${first[0].toFixed(1)} ${yAxis.toFixed(1)} Z`;
      return d;
    }

    const goodPts  = plotRaw(goodRaw);
    const naivePts = plotRaw(naiveRaw);

    const curveGood = document.getElementById(curveGoodId);
    const curveNaive = document.getElementById(curveNaiveId);
    if (curveGood) {
      curveGood.setAttribute('d', ptsToPath(goodPts));
      void curveGood.getBoundingClientRect();
      requestAnimationFrame(() => curveGood.classList.add('drawn'));
    }
    if (curveNaive) {
      curveNaive.setAttribute('d', ptsToPath(naivePts));
      void curveNaive.getBoundingClientRect();
      requestAnimationFrame(() => curveNaive.classList.add('drawn'));
    }

    const aucGood = document.getElementById(aucGoodId);
    const aucNaive = document.getElementById(aucNaiveId);
    if (aucGood)  aucGood.setAttribute('d',  closeUnderAxis(goodPts));
    if (aucNaive) aucNaive.setAttribute('d', closeUnderAxis(naivePts));

    // Observed clinical samples — pulled from the ParamAI ground truth with realistic ±9% noise.
    // (Mirrors the engine demo's approach.)
    const sampleTimes = [0.5, 1, 2, 3, 4, 6, 8, 12, 18, 24];
    let seed = 7919;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    function interp(raw, t) {
      const dt = raw[1][0] - raw[0][0];
      const i = Math.min(raw.length - 2, Math.max(0, Math.floor(t / dt)));
      const frac = (t - raw[i][0]) / dt;
      return raw[i][1] + frac * (raw[i + 1][1] - raw[i][1]);
    }
    const observedRaw = sampleTimes.map(t => {
      const truth = interp(goodRaw, t);
      const noise = (rand() - 0.5) * 0.18 * truth;
      return [t, Math.max(0, truth + noise)];
    });
    const obsPts = plotRaw(observedRaw);

    const obsLine = document.getElementById(observedLineId);
    if (obsLine) obsLine.setAttribute('d', ptsToPath(obsPts));

    const obsDots = document.getElementById(observedDotsId);
    if (obsDots) {
      obsDots.innerHTML = '';
      obsPts.forEach(([x, y]) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x.toFixed(1));
        c.setAttribute('cy', y.toFixed(1));
        c.setAttribute('r', 3.5);
        c.setAttribute('class', 'cv-observed-dot');
        obsDots.appendChild(c);
      });
    }

    const goodAuc  = trapezoidalAUC(goodRaw);
    const naiveAuc = trapezoidalAUC(naiveRaw);
    const gText = document.getElementById(aucGoodTextId);
    const nText = document.getElementById(aucNaiveTextId);
    const rText = document.getElementById(ratioTextId);
    if (gText) gText.textContent = `AUC = ${goodAuc.toFixed(0)}`;
    if (nText) nText.textContent = `AUC = ${naiveAuc.toFixed(0)}`;
    if (rText) {
      // Preserve the leading asterisk tspan; only replace the trailing text.
      rText.innerHTML = `<tspan class="cv-asterisk">*</tspan> underestimates by ${(goodAuc / naiveAuc).toFixed(1)}×`;
    }
  }

  // Hero 2 controller — handles multi-scene rotation (prediction, competitive, ...)
  // and triggers the curve draw-in animation when the deck enters view (or when
  // the engine demo explicitly hands off via window.__playHero2Curves).
  function setupHero2() {
    const hero2 = document.getElementById('deck-2');
    if (!hero2) return;

    // --- Scene navigation (parallel structure to Hero 1) ---
    const h2Headlines = hero2.querySelectorAll('.scene-headline');
    const h2Scenes    = hero2.querySelectorAll('.narrative-scene');
    const h2Dots      = hero2.querySelectorAll('.scene-dot');
    let h2Current = 0;

    function h2PlayChoreo(sceneEl) {
      sceneEl.classList.remove('choreo-play');
      void sceneEl.getBoundingClientRect();
      requestAnimationFrame(() => sceneEl.classList.add('choreo-play'));
    }
    // JS-driven pulse for the ParamAI dot on the quadrant chart. Animating SVG `r`
    // via CSS keyframes is unreliable across browser versions, so we set it
    // explicitly per frame. Starts when scene 1 is active, stops when leaving.
    let pulseRaf = null;
    let pulseStart = 0;
    const PULSE_DUR_MS = 1800;
    const PULSE_R_FROM = 14;
    const PULSE_R_TO = 60;
    function stopParamaiPulse() {
      if (pulseRaf) {
        cancelAnimationFrame(pulseRaf);
        pulseRaf = null;
      }
      const pulseEl = hero2.querySelector('.q-point-paramai-pulse');
      if (pulseEl) pulseEl.style.opacity = '0';
    }
    function startParamaiPulse() {
      const pulseEl = hero2.querySelector('.q-point-paramai-pulse');
      if (!pulseEl) return;
      pulseStart = performance.now();
      function frame(now) {
        const elapsed = (now - pulseStart) % PULSE_DUR_MS;
        const t = elapsed / PULSE_DUR_MS; // 0..1
        // ease-out cubic so the ring slows as it expands
        const eased = 1 - Math.pow(1 - t, 3);
        const r = PULSE_R_FROM + (PULSE_R_TO - PULSE_R_FROM) * eased;
        const opacity = 0.6 * (1 - t);
        pulseEl.setAttribute('r', r.toFixed(1));
        pulseEl.style.opacity = opacity.toFixed(2);
        pulseRaf = requestAnimationFrame(frame);
      }
      pulseRaf = requestAnimationFrame(frame);
    }

    function h2ShowScene(idx) {
      h2Headlines.forEach((el) => el.classList.remove('shown'));
      h2Scenes.forEach((el) => {
        el.classList.remove('shown');
        el.classList.remove('choreo-play');
      });
      h2Dots.forEach((el) => el.classList.remove('active'));

      const h = hero2.querySelector(`.scene-headline[data-deck-scene="${idx}"]`);
      const s = hero2.querySelector(`.narrative-scene[data-deck-scene="${idx}"]`);
      const d = hero2.querySelector(`.scene-dot[data-deck-scene="${idx}"]`);
      if (h) h.classList.add('shown');
      if (s) {
        s.classList.add('shown');
        requestAnimationFrame(() => h2PlayChoreo(s));
      }
      if (d) d.classList.add('active');

      // Start/stop the ParamAI pulse based on whether the quadrant scene is active.
      if (idx === 1) {
        // Defer slightly so the ParamAI point has had time to land via its choreo entrance
        setTimeout(() => startParamaiPulse(), 1400);
      } else {
        stopParamaiPulse();
      }
    }

    // Dot clicks
    h2Dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.deckScene, 10);
        h2Current = target;
        h2ShowScene(target);
      });
      dot.style.cursor = 'pointer';
    });

    // Keyboard: arrow keys advance/rewind, but ONLY when Hero 2 is in view.
    function isHero2InView() {
      const rect = hero2.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5;
    }
    function isInputFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    }
    window.addEventListener('keydown', (e) => {
      if (isInputFocused()) return;
      if (!isHero2InView()) return;
      const count = h2Scenes.length;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (h2Current < count - 1) {
          e.preventDefault();
          h2Current++;
          h2ShowScene(h2Current);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (h2Current > 0) {
          e.preventDefault();
          h2Current--;
          h2ShowScene(h2Current);
        }
      }
    });

    // First: compute the paths and populate the AUC numbers (instantly, but keep
    // the stroke-dashoffset at max so the curves are invisible until we animate them in).
    const curveGood  = document.getElementById('d2-cv-curve-path');
    const curveNaive = document.getElementById('d2-cv-curve-naive-path');
    const obsLine    = document.getElementById('d2-cv-observed-line');

    drawPredictionCurves({
      curveGoodId:    'd2-cv-curve-path',
      curveNaiveId:   'd2-cv-curve-naive-path',
      aucGoodId:      'd2-cv-auc-good-path',
      aucNaiveId:     'd2-cv-auc-naive-path',
      aucGoodTextId:  'd2-cv-auc-good-text',
      aucNaiveTextId: 'd2-cv-auc-naive-text',
      ratioTextId:    'd2-cv-auc-ratio',
      observedLineId: 'd2-cv-observed-line',
      observedDotsId: 'd2-cv-observed-dots',
      xLeft: 56, xRight: 540, yAxis: 205, peakY: 80,
    });

    // Reset to undrawn state. The animation only plays when explicitly triggered
    // by playHero2Curves() — called from the engine demo's runAll() after act 4 completes.
    // (Falls back to IntersectionObserver at high threshold if the demo isn't run.)
    [curveGood, curveNaive, obsLine].forEach(el => el && el.classList.remove('drawn'));
    const legendBlocks = hero2.querySelectorAll('.cv-legend-block');
    legendBlocks.forEach(b => b.classList.remove('shown'));
    hero2.classList.add('d2-curves-pending');

    // Expose a trigger that the engine demo can call.
    window.__playHero2Curves = function () {
      if (hero2.dataset.played === 'true') return;
      hero2.dataset.played = 'true';
      hero2.classList.remove('d2-curves-pending');

      const legendGood  = hero2.querySelector('#d2-legend-good');
      const legendNaive = hero2.querySelector('#d2-legend-naive');
      const legendObs   = hero2.querySelector('#d2-legend-obs');
      const legendRatio = hero2.querySelector('#d2-legend-ratio');

      // Curves draw in sequence (CSS transition is 2.2s).
      // Legend blocks fade in as their matching curve nears completion.
      setTimeout(() => curveGood  && curveGood.classList.add('drawn'),   100);
      setTimeout(() => legendGood && legendGood.classList.add('shown'), 1900);

      setTimeout(() => curveNaive  && curveNaive.classList.add('drawn'),  700);
      setTimeout(() => legendNaive && legendNaive.classList.add('shown'), 2500);

      setTimeout(() => obsLine   && obsLine.classList.add('drawn'),    1700);
      setTimeout(() => legendObs && legendObs.classList.add('shown'),  2200);

      const dots = hero2.querySelectorAll('.cv-observed-dot');
      dots.forEach((d, i) => {
        setTimeout(() => d.classList.add('drawn'), 1900 + i * 90);
      });

      // Ratio line lands last, after everything else
      setTimeout(() => legendRatio && legendRatio.classList.add('shown'), 3100);
    };

    // Fallback: if the user scrolls into Hero 2 without running the demo first
    // (e.g., navigates by keyboard or clicks "Talk to us" first), trigger anyway.
    // Threshold 0.85 means Hero 2 has to be almost entirely visible.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          window.__playHero2Curves();
          io.disconnect();
        }
      });
    }, { threshold: 0.85 });
    io.observe(hero2);
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

/* ============================================================
   Bayesian belief demo (deck 2, scene 7)
   Shows what inference actually does: 4,000 guesses at clearance,
   reweighted as each piece of evidence lands.

   The step data is the real run from demo/results.json, not
   invented for the animation. Particles are resampled from a
   lognormal matching each step's reported [lo, median, hi] for
   clearance, so the visual narrowing tracks the real posterior.
   ============================================================ */
(function () {
  const STEPS = [
    { label: "Prior belief, nothing read yet",              cl:[8.2,30.6,110.4], med:0.043, lo:0.002, hi:0.330, p:0.125, H:6.73 },
    { label: "Ran the steady-state trough experiment",      cl:[6.6,13.3,24.0],  med:0.209, lo:0.140, hi:0.307, p:0.577, H:5.85 },
    { label: "Read the terminal half-life",                 cl:[8.5,15.4,25.3],  med:0.210, lo:0.135, hi:0.324, p:0.587, H:5.00 },
    { label: "Read Cmax from the PK summary",               cl:[8.2,15.1,25.4],  med:0.212, lo:0.131, hi:0.343, p:0.579, H:4.52 },
    { label: "Read Tmax from the PK summary",               cl:[9.0,15.9,24.7],  med:0.207, lo:0.128, hi:0.332, p:0.546, H:3.60 },
    { label: "Read the Phase I AUC table",                  cl:[8.1,14.4,23.1],  med:0.253, lo:0.150, hi:0.390, p:0.791, H:3.63 }
  ];
  const N = 900;               // drawn particles; the real filter carries 4,000
  const XMIN = 3, XMAX = 160;  // clearance axis, L/h, log spaced
  const TRUTH = 15.9;

  const cv = document.getElementById('bay-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W = cv.width, H = cv.height;

  // Match the backing store to the CSS box so the dots stay crisp.
  // Returns false when the element has no layout yet (scene still hidden),
  // which is the normal case at load time.
  function resize() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw || cv.height !== bh) {
      cv.width = bw; cv.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = r.width; H = r.height;
    return true;
  }
  window.addEventListener('resize', () => { if (resize()) paint(); });

  const $ = id => document.getElementById(id);
  const elN = $('bay-stepn'), elLabel = $('bay-label'), elMed = $('bay-med'),
        elRange = $('bay-range'), elFill = $('bay-fill'), elP = $('bay-p'),
        elH = $('bay-h'), elReplay = $('bay-replay');

  // Log axis: clearance spans more than an order of magnitude at the prior,
  // and a linear axis pins most of the cloud against the right edge.
  const LM = Math.log(XMIN), LX = Math.log(XMAX);
  const xpix = cl => {
    const v = Math.log(Math.min(Math.max(cl, XMIN), XMAX));
    return ((v - LM) / (LX - LM)) * (W - 40) + 20;
  };

  // Draw from a lognormal whose 5th/95th percentiles match the step's reported
  // interval, so the cloud is the posterior rather than decoration.
  function sample(step) {
    const [lo, med, hi] = step.cl;
    const mu = Math.log(med);
    const sigma = Math.max((Math.log(hi) - Math.log(lo)) / 3.29, 0.02);
    const out = [];
    for (let i = 0; i < N; i++) {
      const u1 = Math.random() || 1e-9, u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      out.push(Math.exp(mu + sigma * z));
    }
    return out;
  }

  let particles = sample(STEPS[0]).map(v => ({ x: v, tx: v, y: Math.random(), seed: Math.random() }));

  function paint() {
    // The scene is hidden at load, so the first successful measurement
    // happens here rather than at init.
    if (!W || !H || cv.width === 0) { if (!resize()) return; }
    ctx.clearRect(0, 0, W, H);

    // truth marker
    const tx = xpix(TRUTH);
    ctx.strokeStyle = '#b94e2a'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(tx, 8); ctx.lineTo(tx, H - 8); ctx.stroke();
    ctx.setLineDash([]);

    for (const p of particles) {
      const px = xpix(p.x);
      const py = 18 + p.y * (H - 42);
      ctx.beginPath();
      ctx.arc(px, py, 2.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(107,95,214,0.42)';
      ctx.fill();
    }
  }

  let raf = null;
  function animateTo(targets) {
    particles.forEach((p, i) => { p.sx = p.x; p.tx = targets[i]; });
    const t0 = performance.now(), DUR = 900;
    if (raf) cancelAnimationFrame(raf);
    (function frame(now) {
      const t = Math.min((now - t0) / DUR, 1);
      const e = 1 - Math.pow(1 - t, 3);
      for (const p of particles) p.x = p.sx + (p.tx - p.sx) * e;
      paint();
      if (t < 1) raf = requestAnimationFrame(frame);
    })(t0);
  }

  function render(i) {
    const s = STEPS[i];
    elN.textContent = i + ' of 5';
    elLabel.textContent = s.label;
    elMed.textContent = s.med.toFixed(3);
    elRange.textContent = 'could be anywhere from ' + s.lo.toFixed(3) + ' to ' + s.hi.toFixed(3);
    elP.textContent = Math.round(s.p * 100);
    elFill.style.width = (s.p * 100).toFixed(0) + '%';
    elH.textContent = s.H.toFixed(2);
    animateTo(sample(s));
  }

  let timer = null, idx = 0;
  function play() {
    clearInterval(timer);
    idx = 0; render(0);
    timer = setInterval(() => {
      idx++;
      if (idx >= STEPS.length) { clearInterval(timer); return; }
      render(idx);
    }, 1700);
  }

  resize();
  paint();
  if (elReplay) elReplay.addEventListener('click', play);

  // Autoplay once the slide is actually shown. Two triggers, because
  // neither alone is sufficient: the class observer misses the case where
  // the scene is already .shown, and the intersection observer misses
  // scene switches that happen while the deck is already on screen.
  const scene = document.querySelector('.scene-deck2-7');
  if (scene) {
    let played = false;

    function maybePlay() {
      if (!scene.classList.contains('shown')) return;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;      // not laid out yet
      if (played) return;
      played = true;
      resize();
      setTimeout(play, 300);
    }

    new MutationObserver(() => {
      if (scene.classList.contains('shown')) maybePlay();
      else { played = false; clearInterval(timer); }
    }).observe(scene, { attributes: true, attributeFilter: ['class'] });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) maybePlay();
      }, { threshold: 0.25 }).observe(scene);
    }

    // Covers a hard reload that lands directly on this scene.
    maybePlay();
  }
})();
