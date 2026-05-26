/* =============================================================
   ParamAI — flowfield.js
   Generative particle hero. Continuous procedural motion in the
   site palette. Responds to scroll position and mouse gravity.
   No external dependencies. Canvas2D only.
   ============================================================= */

(function () {
  'use strict';

  const TARGET_ID = 'flow-canvas';

  // ---------- Palette (must mirror styles.css tokens) ----------
  const PALETTE = [
    { color: 'rgba(185, 78, 42, ALPHA)',   weight: 0.40 }, // rust
    { color: 'rgba(124, 138, 61, ALPHA)',  weight: 0.30 }, // olive
    { color: 'rgba(199, 154, 58, ALPHA)',  weight: 0.20 }, // gold
    { color: 'rgba(58, 52, 42, ALPHA)',    weight: 0.10 }, // ink-soft (rare accents)
  ];

  // ---------- Tuning constants ----------
  const PARTICLE_COUNT_BASE = 900;          // for ~1440px width; scaled by area
  const TRAIL_FADE          = 0.045;        // higher = shorter trails
  const FIELD_SCALE         = 0.0019;       // smaller = larger swirls (noise frequency)
  const FIELD_DRIFT_RATE    = 0.00009;      // how fast the field evolves over time
  const PARTICLE_SPEED      = 1.05;         // base speed scalar
  const MOUSE_INFLUENCE_R   = 220;          // px radius of mouse pull
  const MOUSE_PULL_STRENGTH = 0.55;
  const SCROLL_ROTATION_MAX = 0.85;         // radians at full scroll
  const RESPAWN_MARGIN      = 60;           // px outside canvas where particles wrap

  // ---------- 2D Perlin noise (Stefan Gustavson's classic, condensed) ----------
  // Adapted from public-domain noise source; lightweight enough to inline.
  const Noise = (function () {
    const perm = new Uint8Array(512);
    const grad3 = new Float32Array([
      1, 1,  -1, 1,  1, -1,  -1, -1,
      1, 0,  -1, 0,  0,  1,   0, -1,
      0, 1,   0, -1, 1,  0,  -1,  0,
    ]);
    function seed(s) {
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      // Simple Fisher–Yates with seedable LCG
      let rng = s | 0 || 1;
      for (let i = 255; i > 0; i--) {
        rng = (rng * 1664525 + 1013904223) | 0;
        const j = Math.abs(rng) % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function dot2(g, x, y) { return grad3[g * 2] * x + grad3[g * 2 + 1] * y; }
    function noise2(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      const u = fade(x);
      const v = fade(y);
      const A = perm[X] + Y;
      const B = perm[X + 1] + Y;
      const g00 = perm[A]     % 12;
      const g10 = perm[B]     % 12;
      const g01 = perm[A + 1] % 12;
      const g11 = perm[B + 1] % 12;
      const n00 = dot2(g00, x,     y);
      const n10 = dot2(g10, x - 1, y);
      const n01 = dot2(g01, x,     y - 1);
      const n11 = dot2(g11, x - 1, y - 1);
      const x1 = lerp(n00, n10, u);
      const x2 = lerp(n01, n11, u);
      return lerp(x1, x2, v); // in approx [-1, 1]
    }
    seed(42);
    return { noise2, seed };
  })();

  // ---------- Particle class ----------
  class Particle {
    constructor(w, h) {
      this.respawn(w, h, true);
    }
    respawn(w, h, anywhere) {
      if (anywhere) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
      } else {
        // Re-enter from a random edge for smoother loop
        const side = Math.floor(Math.random() * 4);
        if (side === 0)      { this.x = Math.random() * w; this.y = -RESPAWN_MARGIN / 2; }
        else if (side === 1) { this.x = w + RESPAWN_MARGIN / 2; this.y = Math.random() * h; }
        else if (side === 2) { this.x = Math.random() * w; this.y = h + RESPAWN_MARGIN / 2; }
        else                 { this.x = -RESPAWN_MARGIN / 2; this.y = Math.random() * h; }
      }
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      // Size: most small, a few larger
      this.r = 0.4 + Math.pow(Math.random(), 3) * 1.8;
      // Lifetime: 200–600 ticks before fade-out re-spawn
      this.life = 0;
      this.maxLife = 200 + Math.random() * 400;
      // Pick color by palette weights
      const roll = Math.random();
      let acc = 0;
      for (const p of PALETTE) {
        acc += p.weight;
        if (roll <= acc) { this.colorTpl = p.color; break; }
      }
    }
    // Returns rgba string with given alpha
    color(alpha) { return this.colorTpl.replace('ALPHA', alpha.toFixed(3)); }
  }

  // ---------- Main field instance ----------
  class FlowField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.particles = [];
      this.mouse = { x: -9999, y: -9999, active: false };
      this.scrollNorm = 0;
      this.t = 0;
      this.running = false;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.attachInput();
    }

    attachInput() {
      const onMove = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left);
        this.mouse.y = (e.clientY - rect.top);
        this.mouse.active = true;
      };
      const onLeave = () => { this.mouse.active = false; };
      this.canvas.addEventListener('mousemove', onMove, { passive: true });
      this.canvas.addEventListener('mouseleave', onLeave);
      window.addEventListener('scroll', () => {
        const doc = document.documentElement;
        this.scrollNorm = Math.max(0, Math.min(1, doc.scrollTop / Math.max(1, window.innerHeight)));
      }, { passive: true });
    }

    resize() {
      const w = this.canvas.clientWidth || 600;
      const h = this.canvas.clientHeight || 600;
      this.canvas.width  = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.W = w; this.H = h;

      // Re-seed particles, scaled to canvas area
      const target = Math.round(PARTICLE_COUNT_BASE * (w * h) / (1440 * 800));
      const desired = Math.max(280, Math.min(1400, target));
      this.particles = [];
      for (let i = 0; i < desired; i++) {
        this.particles.push(new Particle(w, h));
      }
      // Initial fill on the canvas (a soft cream wash)
      this.ctx.fillStyle = 'rgba(245, 241, 232, 1)';
      this.ctx.fillRect(0, 0, w, h);
    }

    sampleField(x, y, t) {
      // Two-octave noise → smooth, organic flow
      const n1 = Noise.noise2(x * FIELD_SCALE,       y * FIELD_SCALE + t);
      const n2 = Noise.noise2(x * FIELD_SCALE * 2.3, y * FIELD_SCALE * 2.3 - t * 0.6) * 0.5;
      const angle = (n1 + n2) * Math.PI * 1.8;
      return angle;
    }

    step() {
      this.t += FIELD_DRIFT_RATE;
      const ctx = this.ctx;
      const W = this.W, H = this.H;

      // 1) Fade the previous frame into the cream — leaves trails
      ctx.fillStyle = `rgba(245, 241, 232, ${TRAIL_FADE})`;
      ctx.fillRect(0, 0, W, H);

      // 2) Scroll-driven bias: rotates the field as the user scrolls
      const scrollBias = this.scrollNorm * SCROLL_ROTATION_MAX;

      // 3) Update + draw particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        const angle = this.sampleField(p.x, p.y, this.t) + scrollBias;
        let ax = Math.cos(angle) * PARTICLE_SPEED;
        let ay = Math.sin(angle) * PARTICLE_SPEED;

        // Mouse gravity (gentle pull toward cursor with falloff)
        if (this.mouse.active) {
          const dx = this.mouse.x - p.x;
          const dy = this.mouse.y - p.y;
          const d  = Math.hypot(dx, dy);
          if (d < MOUSE_INFLUENCE_R && d > 1) {
            const f = (1 - d / MOUSE_INFLUENCE_R) * MOUSE_PULL_STRENGTH;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }

        // Soft velocity blending — gives particles momentum
        p.vx = p.vx * 0.92 + ax * 0.08;
        p.vy = p.vy * 0.92 + ay * 0.08;

        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Wrap or respawn when off-canvas / aged out
        if (
          p.x < -RESPAWN_MARGIN || p.x > W + RESPAWN_MARGIN ||
          p.y < -RESPAWN_MARGIN || p.y > H + RESPAWN_MARGIN ||
          p.life > p.maxLife
        ) {
          p.respawn(W, H, false);
          continue;
        }

        // Alpha fade in and out over lifetime — gives appearance of breathing
        const lifeT = p.life / p.maxLife;
        const fadeIn  = Math.min(1, p.life / 30);
        const fadeOut = Math.min(1, (p.maxLife - p.life) / 60);
        const alpha = 0.55 * fadeIn * fadeOut;

        ctx.fillStyle = p.color(alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    start() {
      if (this.running) return;
      this.running = true;
      const tick = () => {
        if (!this.running) return;
        this.step();
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    }

    stop() {
      this.running = false;
      if (this.frame) cancelAnimationFrame(this.frame);
    }
  }

  // ---------- Boot ----------
  function boot() {
    const canvas = document.getElementById(TARGET_ID);
    if (!canvas) return;

    // Honor reduced-motion: render one frame, don't animate
    const field = new FlowField(canvas);

    if (field.reducedMotion) {
      // Single static composition
      for (let i = 0; i < 60; i++) field.step();
      return;
    }

    field.start();

    // Pause when tab hidden — saves battery + makes the reveal nicer on return
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) field.stop();
      else field.start();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
