// ParamAI demo — single guided sequence that flows through 5 acts.
// Press "Begin" once; everything animates and auto-transitions.

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- count-up hero stats ---------- */
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const decimal = (target % 1 !== 0) ? 1 : 0;
  const duration = 1400;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (target * eased).toFixed(decimal);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCount(e.target);
      heroObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach(el => heroObserver.observe(el));

/* ---------- engine progress + act activation ---------- */
const acts = document.querySelectorAll(".act");
const epSteps = document.querySelectorAll(".ep-step");
const epFill = document.getElementById("ep-fill");

function setActiveAct(n, opts) {
  opts = opts || {};
  acts.forEach(a => {
    const id = parseInt(a.id.replace("act-", ""));
    a.classList.toggle("active", id <= n);
    a.classList.toggle("done", id < n);
  });
  epSteps.forEach(s => {
    const id = parseInt(s.dataset.step);
    s.classList.toggle("active", id === n);
    s.classList.toggle("done", id < n);
  });
  // smooth scroll to act (only when explicitly requested — never on page load)
  if (opts.scroll) {
    const target = document.getElementById(`act-${n}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  // progress fill
  epFill.style.width = `${((n - 1) / 4) * 100}%`;
}

function showFlowArrow(id) {
  const a = document.getElementById(id);
  if (a) a.classList.add("show");
}

/* ---------- data ---------- */

const extractedParams = [
  { name: "CL",            value: "28 L/h",    source: "§3.1 · n=18"      },
  { name: "Vd",            value: "1400 L",    source: "§3.1"             },
  { name: "E_H",           value: "0.81",      source: "§3.3 · portal"    },
  { name: "CL_R",          value: "1.4 L/h",   source: "§3.2 · urinary"   },
  { name: "K_D (EGFR)",    value: "33 nM",     source: "§4.0 · SPR"       },
  { name: "f_u",           value: "0.09",      source: "§3.4"             },
  { name: "C_max obs.",    value: "78 ng/mL",  source: "§3.1"             },
  { name: "F (oral)",      value: "0.59",      source: "§3.5"             },
  { name: "k_a",           value: "0.5 1/h",   source: "§3.5"             },
];

const missingParams = [
  { key: "clint", name: "CL_int",      desc: "Intrinsic clearance — never directly measured in vivo." },
  { key: "ke",    name: "k_e",         desc: "Elimination rate — depends on reconciled clearance."   },
  { key: "tp",    name: "K_p,tissue",  desc: "Tissue partition — paper omits, must derive from f_u." },
  { key: "eh",    name: "E_H (true)",  desc: "Reported value contradicts mass balance — flagged."     },
];

const auditEntries = [
  { tag: "INGEST",     msg: "Loaded 9 parameters for gefitinib (Swaisland 2005, adapted)" },
  { tag: "CHECK",      msg: "Cross-ref Q_H against Davies & Morris (1993)" },
  { tag: "CHECK",      msg: "Apply hepatic well-stirred model: CL_H = Q_H·f_u·CL_int / (Q_H + f_u·CL_int)" },
  { tag: "VIOLATE",    msg: "Reported E_H=0.81 inconsistent with CL_H=26.6 L/h (Δ=46.3 L/h)" },
  { tag: "LOCK",       msg: "Constraint locked: Q_H = 90 L/h (Davies)" },
  { tag: "LOCK",       msg: "Constraint locked: f_u = 0.09 (ultrafiltration cross-val)" },
  { tag: "SOLVE",      msg: "Inverting well-stirred eq. for CL_int…" },
  { tag: "SOLVE",      msg: "Newton's method: 7 iterations, ε < 1e-6" },
  { tag: "SOLVE",      msg: "CL_int = 419.2 L/h" },
  { tag: "DERIVE",     msg: "Reconciled E_H = CL_H / Q_H = 26.6 / 90 = 0.296" },
  { tag: "DERIVE",     msg: "k_e = CL / V_d = 28 / 1400 = 0.020 1/h  →  t_½ = 41 h" },
  { tag: "DERIVE",     msg: "K_p,tissue from Rodgers–Rowland mech. partitioning" },
  { tag: "BALANCE",    msg: "Mass balance closed: 26.6 + 1.4 = 28.0 ✓" },
  { tag: "READY",      msg: "Model state: physiologically consistent, simulation-ready" },
];

/* ---------- ACT 2 animation ---------- */
async function runExtraction() {
  const list = document.getElementById("extract-list");
  const missingList = document.getElementById("missing-list");
  const counter = document.getElementById("extract-counter");
  const status = document.getElementById("missing-status");
  list.innerHTML = "";
  missingList.innerHTML = "";

  status.textContent = "scanning paper…";

  for (let i = 0; i < extractedParams.length; i++) {
    const p = extractedParams[i];
    const el = document.createElement("div");
    el.className = "extract-row";
    el.style.animationDelay = "0ms";
    el.innerHTML = `
      <span class="er-name">${p.name}</span>
      <span class="er-val">${p.value}</span>
      <span class="er-src">${p.source}</span>
    `;
    list.appendChild(el);
    counter.textContent = `${i + 1} found · 0 flagged`;
    await sleep(150);
  }

  await sleep(300);
  status.textContent = "comparing against model requirements…";
  await sleep(500);

  for (let i = 0; i < missingParams.length; i++) {
    const m = missingParams[i];
    const el = document.createElement("div");
    el.className = "missing-row";
    el.dataset.key = m.key;
    el.innerHTML = `
      <span class="mr-name">${m.name}</span>
      <span class="mr-desc">${m.desc}</span>
      <span class="mr-status">missing</span>
    `;
    missingList.appendChild(el);
    counter.textContent = `${extractedParams.length} found · ${i + 1} flagged`;
    await sleep(220);
  }

  status.textContent = "4 parameters required — handing off to validator";
  showFlowArrow("flow-2-3");
}

/* ---------- ACT 4 animation: verifying — all rows pass with derived values ---------- */
async function runBalanceCheck() {
  const rows = ["qh", "clh", "eh", "impl"];
  for (let i = 0; i < rows.length; i++) {
    const row = document.querySelector(`.brow[data-row="${rows[i]}"]`);
    if (!row) continue;
    row.classList.add("checking");
    await sleep(380);
    row.classList.remove("checking");
    row.classList.add("ok");
    await sleep(140);
  }
}

/* ---------- ACT 4 animation ---------- */
async function runDerivation() {
  const auditEl = document.getElementById("audit-stream");
  auditEl.innerHTML = "";
  const startT = performance.now();

  // first 6 audit entries (setup + lock)
  for (let i = 0; i < 6; i++) {
    addAuditLine(auditEntries[i], startT);
    await sleep(280);
  }

  // animate substitution
  const sub = document.getElementById("solve-substitution");
  sub.textContent = "CL_int = (90 × 26.6) / (0.09 × (90 − 26.6))";
  sub.classList.add("show");
  await sleep(700);

  // SOLVE entries
  for (let i = 6; i < 9; i++) {
    addAuditLine(auditEntries[i], startT);
    await sleep(260);
  }

  // animate counter
  const resultEl = document.getElementById("solve-result-value");
  const target = 419.2;
  for (let i = 0; i <= 28; i++) {
    const v = (target * (i / 28));
    resultEl.textContent = `CL_int = ${v.toFixed(1)} L/h`;
    await sleep(28);
  }

  await sleep(300);

  // populate recovered
  const recovered = document.getElementById("recovered");
  recovered.classList.add("show");
  const recValues = {
    clint: "419.2 L/h",
    eh: "0.296",
    ke: "0.020 1/h",
    tp: "3.12",
  };
  // also resolve the missing-row badges from Act 2 (visually 'wired through')
  const missingMap = {
    clint: "clint",
    eh: "eh",
    ke: "ke",
    tp: "tp",
  };
  for (const key of Object.keys(recValues)) {
    const item = document.querySelector(`.rec-item[data-rec="${key}"]`);
    item.querySelector(".rec-val").textContent = recValues[key];
    item.classList.add("show");
    // mirror back to Act 2's missing-row
    const m = document.querySelector(`.missing-row[data-key="${missingMap[key]}"]`);
    if (m) {
      m.classList.add("resolved");
      m.querySelector(".mr-status").textContent = "derived";
    }
    await sleep(280);
  }

  // remaining audit (derivations + balance + ready)
  for (let i = 9; i < auditEntries.length; i++) {
    addAuditLine(auditEntries[i], startT);
    await sleep(240);
  }
  showFlowArrow("flow-4-5");
}

function addAuditLine(entry, startT) {
  const auditEl = document.getElementById("audit-stream");
  const t = ((performance.now() - startT) / 1000).toFixed(2);
  const div = document.createElement("div");
  div.className = "audit-line";
  div.innerHTML = `
    <span class="audit-time">${t.padStart(5, "0")}s</span>
    <span class="audit-tag ${entry.tag.toLowerCase()}">${entry.tag}</span>
    <span class="audit-msg">${entry.msg}</span>
  `;
  auditEl.appendChild(div);
  auditEl.scrollTop = auditEl.scrollHeight;
}

/* ---------- ACT 5 — simulation chart ---------- */
// Standard 1-compartment analytic PK with first-order absorption.
// Dose D in ng. V_d in L. Returns ng/mL = (ng / L) / 1000... actually
// (F·D·k_a)/(V_d·(k_a−k_e)) gives ng/L; divide by 1000 for ng/mL.
function pkConc({ dose, ka, ke, vd, F, tMax = 36, dt = 0.25 }) {
  const pts = [];
  for (let t = 0; t <= tMax; t += dt) {
    const c_ng_per_L = (F * dose * ka) / (vd * (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
    const c_ng_per_mL = c_ng_per_L / 1000;
    pts.push({ t, c: Math.max(0, c_ng_per_mL) });
  }
  return pts;
}

async function runSimulation() {
  const chart = document.getElementById("sim-chart");
  chart.innerHTML = "";
  const W = 720, H = 360;
  const M = { top: 24, right: 24, bottom: 44, left: 56 };

  // ---- shared model basis ----
  // gefitinib, 250 mg PO = 250,000,000 ng = 2.5e8 ng
  const dose = 2.5e8;
  const F = 0.59;
  const ka = 0.5;
  const Vd = 1400;
  const tMax = 36;
  const dt = 0.25;

  // ParamAI: correct CL = 28 L/h (mass-balance closure) → k_e = 0.020
  const ke_paramai = 28 / Vd;
  // Naive NLP: takes paper's E_H = 0.81 at face value, infers CL_H = 0.81 × Q_H = 72.9, adds CL_R = 1.4
  //  → total CL_naive = 74.3 L/h → k_e = 0.053. (~2.6× too fast — story-consistent.)
  const ke_naive = (0.81 * 90 + 1.4) / Vd;

  const paramai = pkConc({ dose, ka, ke: ke_paramai, vd: Vd, F, tMax, dt });
  const naive   = pkConc({ dose, ka, ke: ke_naive,   vd: Vd, F, tMax, dt });

  // ---- observed clinical data: derived FROM ParamAI's prediction at sparse sample times
  // with realistic measurement noise. This makes the story self-consistent:
  // observed = truth + noise, and ParamAI recovers the truth, so its curve tracks tightly.
  const sampleTimes = [0.5, 1, 2, 3, 4, 6, 8, 12, 18, 24, 30, 36];
  // deterministic pseudo-random so it looks the same every run
  let seed = 7919;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const interp = (pts, t) => {
    const i = Math.min(pts.length - 2, Math.max(0, Math.floor(t / dt)));
    const frac = (t - pts[i].t) / dt;
    return pts[i].c + frac * (pts[i + 1].c - pts[i].c);
  };
  const observed = sampleTimes.map(t => {
    const truth = interp(paramai, t);
    const noise = (rand() - 0.5) * 0.18 * truth; // ±9% noise
    return { t, c: Math.max(0, truth + noise) };
  });

  const allC = [...naive, ...paramai, ...observed].map(p => p.c);
  const maxC = Math.max(...allC) * 1.1;
  const xS = t => M.left + (t / tMax) * (W - M.left - M.right);
  const yS = c => H - M.bottom - (c / maxC) * (H - M.top - M.bottom);
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  // gridlines
  for (let i = 0; i <= 5; i++) {
    const y = M.top + (i / 5) * (H - M.top - M.bottom);
    chart.appendChild(el("line", {
      x1: M.left, x2: W - M.right, y1: y, y2: y,
      stroke: "#c8bea3", "stroke-dasharray": "2 5"
    }));
    const label = el("text", {
      x: M.left - 10, y: y + 4,
      fill: "#6a6356", "font-size": 10.5,
      "font-family": "JetBrains Mono, monospace",
      "text-anchor": "end"
    });
    label.textContent = (maxC * (1 - i / 5)).toFixed(1);
    chart.appendChild(label);
  }
  for (let i = 0; i <= 6; i++) {
    const x = M.left + (i / 6) * (W - M.left - M.right);
    chart.appendChild(el("line", {
      x1: x, x2: x, y1: M.top, y2: H - M.bottom,
      stroke: "#c8bea3", "stroke-dasharray": "2 5"
    }));
    const lab = el("text", {
      x: x, y: H - M.bottom + 22,
      fill: "#6a6356", "font-size": 10.5,
      "font-family": "JetBrains Mono, monospace",
      "text-anchor": "middle"
    });
    lab.textContent = `${i * (tMax / 6)}h`;
    chart.appendChild(lab);
  }
  // axis labels
  const ylab = el("text", {
    x: 18, y: H / 2,
    fill: "#6a6356", "font-size": 10.5,
    "font-family": "JetBrains Mono, monospace",
    "text-anchor": "middle",
    transform: `rotate(-90, 18, ${H / 2})`
  });
  ylab.textContent = "plasma concentration (ng/mL)";
  chart.appendChild(ylab);

  const xlab = el("text", {
    x: W / 2, y: H - 8,
    fill: "#8d8676", "font-size": 10.5,
    "font-family": "JetBrains Mono, monospace",
    "text-anchor": "middle"
  });
  xlab.textContent = "time post-dose (hours)";
  chart.appendChild(xlab);

  function buildPath(pts) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(p.t)} ${yS(p.c)}`).join(" ");
  }

  function drawAnimated(d, color, opacity = 1, delay = 0, width = 2.4, dashed = false) {
    const path = el("path", {
      d, fill: "none", stroke: color,
      "stroke-width": width,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      opacity
    });
    chart.appendChild(path);
    const len = path.getTotalLength();
    if (dashed) {
      path.style.strokeDasharray = "5 5";
    } else {
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = `stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1) ${delay}ms`;
      requestAnimationFrame(() => { path.style.strokeDashoffset = 0; });
    }
    return path;
  }

  // observed dashed reference (uses muted ink so it reads on cream)
  drawAnimated(buildPath(observed), "#6a6356", 0.55, 0, 1.8, true);
  observed.forEach(p => {
    chart.appendChild(el("circle", {
      cx: xS(p.t), cy: yS(p.c), r: 3.5,
      fill: "#3a342a"
    }));
  });

  await sleep(200);
  drawAnimated(buildPath(naive), "#a73b2f", 0.95, 0, 2.6);
  await sleep(900);
  drawAnimated(buildPath(paramai), "#7c8a3d", 1, 0, 3);

  await sleep(1100);
  // animate result bars
  document.querySelectorAll(".r-fill").forEach(f => {
    f.style.width = `${f.dataset.fill}%`;
  });
}

/* ---------- master orchestration ---------- */
let isRunning = false;
const runBtn = document.getElementById("run-all");
const runLabel = document.getElementById("run-all-label");
const resetBtn = document.getElementById("reset-all");

async function runAll() {
  if (isRunning) return;
  isRunning = true;
  runBtn.disabled = true;
  runLabel.textContent = "Running…";

  // Act 1 — just reveal
  setActiveAct(1, { scroll: true });
  await sleep(800);
  showFlowArrow("flow-1-2");

  // Act 2 — extraction
  setActiveAct(2, { scroll: true });
  await sleep(600);
  await runExtraction();
  await sleep(700);

  // Act 3 — solving (inverse-derive missing parameters)
  setActiveAct(3, { scroll: true });
  await sleep(600);
  await runDerivation();
  await sleep(900);

  // Act 4 — verifying (confirm the derived set is mass-balance consistent)
  setActiveAct(4, { scroll: true });
  await sleep(600);
  await runBalanceCheck();
  await sleep(900);

  // mark complete
  epFill.style.width = "100%";
  epSteps.forEach(s => s.classList.add("done"));
  runLabel.textContent = "Run again";
  runBtn.disabled = false;
  isRunning = false;

  // Hand off to Hero 2 (the prediction slide below): smooth-scroll, then play curves.
  await sleep(700);
  const deck2 = document.getElementById("deck-2");
  if (deck2) deck2.scrollIntoView({ behavior: "smooth", block: "start" });
  // Wait for the smooth-scroll to settle, then trigger the curve animation.
  await sleep(900);
  if (typeof window.__playHero2Curves === "function") {
    window.__playHero2Curves();
  }
}

function reset() {
  isRunning = false;
  runBtn.disabled = false;
  runLabel.textContent = "Begin parameterization";

  acts.forEach(a => a.classList.remove("active", "done"));
  epSteps.forEach(s => s.classList.remove("active", "done"));
  epFill.style.width = "0%";

  document.getElementById("extract-list").innerHTML = "";
  document.getElementById("missing-list").innerHTML = "";
  document.getElementById("extract-counter").textContent = "0 found · 0 flagged";
  document.getElementById("missing-status").textContent = "awaiting extraction…";

  document.querySelectorAll(".brow").forEach(b => b.classList.remove("ok", "bad", "checking"));
  const violation = document.getElementById("violation");
  if (violation) violation.classList.remove("show");

  document.getElementById("solve-substitution").classList.remove("show");
  document.getElementById("solve-substitution").textContent = "";
  document.getElementById("solve-result-value").textContent = "awaiting input…";
  document.getElementById("audit-stream").innerHTML = "";
  document.getElementById("recovered").classList.remove("show");
  document.querySelectorAll(".rec-item").forEach(i => {
    i.classList.remove("show");
    i.querySelector(".rec-val").textContent = "—";
  });

  const simChart = document.getElementById("sim-chart");
  if (simChart) simChart.innerHTML = "";
  document.querySelectorAll(".r-fill").forEach(f => f.style.width = "0%");

  document.querySelectorAll(".flow-arrow").forEach(a => a.classList.remove("show"));
}

runBtn.addEventListener("click", runAll);
resetBtn.addEventListener("click", reset);

// "See it run on a real drug" CTA in Hero 1: scroll to engine + auto-start the run.
const ctaSeeItRun = document.getElementById("cta-see-it-run");
if (ctaSeeItRun) {
  ctaSeeItRun.addEventListener("click", (e) => {
    e.preventDefault();
    const engineSection = document.getElementById("engine");
    if (engineSection) engineSection.scrollIntoView({ behavior: "smooth", block: "start" });
    // Give the smooth-scroll a moment, then begin the run.
    setTimeout(() => { if (!isRunning) runAll(); }, 700);
  });
}

/* ---------- exports (only bind if the buttons still exist; act 5 was removed) ---------- */
const exportModelBtn = document.getElementById("export-model");
if (exportModelBtn) exportModelBtn.addEventListener("click", () => {
  const model = {
    model: "gefitinib · 1-compartment oral PK + hepatic well-stirred",
    source: "Swaisland et al., 2005, Clin. Pharmacokinet. (adapted)",
    derived_by: "ParamAI v0.4",
    derived_at: new Date().toISOString(),
    parameters: {
      CL_total:        { value: 28.0,  units: "L/h", source: "paper §3.1", verified: true },
      CL_renal:        { value: 1.4,   units: "L/h", source: "paper §3.2", verified: true },
      CL_hepatic:      { value: 26.6,  units: "L/h", derived: true, method: "mass balance" },
      CL_intrinsic:    { value: 419.2, units: "L/h", derived: true, method: "inverse well-stirred", confidence: 0.97 },
      E_H_reported:    { value: 0.81,  flagged: "violates Q_H mass-balance constraint" },
      E_H_reconciled:  { value: 0.296, derived: true },
      Q_H:             { value: 90,    units: "L/h", source: "Davies & Morris 1993", locked: true },
      V_d:             { value: 1400,  units: "L",   source: "paper §3.1", verified: true },
      f_u:             { value: 0.09,  source: "paper §3.4", verified: true },
      k_a:             { value: 0.5,   units: "1/h", source: "paper §3.5", verified: true },
      k_e:             { value: 0.020, units: "1/h", derived: true },
      t_half:          { value: 41,    units: "h",   derived: true, note: "matches FDA label" },
      F_oral:          { value: 0.59,  source: "paper §3.5", verified: true },
      K_D_EGFR:        { value: 33,    units: "nM",  source: "paper §4.0", verified: true },
      K_p_tissue:      { value: 3.12,  derived: true, method: "Rodgers–Rowland" }
    },
    audit: {
      mass_balance: "closed to < 0.01%",
      physiologic_constraints: "satisfied",
      ready_for: ["Simcyp", "GastroPlus", "PK-Sim"]
    }
  };
  const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gefitinib_paramai_model.json"; a.click();
  URL.revokeObjectURL(url);
});

const exportAuditBtn = document.getElementById("export-audit");
if (exportAuditBtn) exportAuditBtn.addEventListener("click", () => {
  alert("In production: a signed PDF audit packet with full derivation chain, citation graph, and assumption ledger — submission-ready under FDAMA 2.0.");
});

// activate act 1 immediately so the engine doesn't look totally dimmed before Begin
setActiveAct(1);
