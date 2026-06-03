# ParamAI Handoff — Website (paramai-bio)

> Single source of truth for picking up the website work in a fresh context.
> Read this top-to-bottom and you should be able to resume without re-litigating
> any decisions that have already been made.

---

## The 30-second summary

We are building **paramai.bio**, the public marketing website for ParamAI. The strategic doc set lives in a separate private repo (`parameter-ai/paramai`); this repo is just the website. Everything in this repo is intended to eventually be public.

**Current state of the page:**
1. A 3-scene narrative hero (auto-rotating: problem → cause → solution)
2. A logo lab section showing 4 refined Compartments variations (A, B, C, D) — *waiting on the user's pick*
3. The full gefitinib parameterization demo inlined as the engine section
4. A problem section, a why-now section, a contact CTA

**Immediate next action:** The user is picking one of the 4 Compartments logo variations (A, B, C, or D). When the user replies with a letter, the picked logo gets rolled across the nav, footer, and favicon, and the entire logo lab section is deleted.

**After that:** restart on the broader website polish — likely typography refinement (Fraunces → something less "AI startup"), copy tightening, and the final commit + push.

---

## Where things live

### Repo

- **Local:** `~/Desktop/paramai-bio/`
- **Remote:** https://github.com/parameter-ai/paramai-bio (private)
- **Default branch:** `main`

### Files

| Path | Purpose |
|---|---|
| `index.html` | Single-page site. Hero + logo lab + engine + problem + why-now + contact |
| `styles.css` | Design tokens, layout, hero scenes, logo lab styles, narrative engine |
| `app.js` | Scroll engine, read-progress, smooth scroll, narrative hero controller (auto-rotates 3 scenes), curve drawing for scene 3 |
| `engine.css` | Trimmed from the original gefitinib demo (`~/paramai-demo/styles.css`); globals stripped, only engine-section selectors kept (~1230 lines) |
| `engine.js` | The 5-act gefitinib walkthrough controller, copied from `~/paramai-demo/app.js` |
| `.gitignore` | Standard; excludes PDFs, secrets, env files, macOS junk |
| `README.md` | Brief; will need a polish pass before going public |
| `HANDOFF.md` | This file |

### Git state at handoff

```
40dbf13 (origin/main) Drop flow field; embed demo on homepage as the centerpiece
ae81a84               Generative flow-field hero + demo page split
4afd519               Initial site scaffold: hero physiology map + design language
```

**Uncommitted local changes:**
- `app.js` — added the narrative hero scene controller (`setupNarrativeHero`, `drawCurve`, `showScene`, `tick`)
- `index.html` — replaced the static hero with the 3-scene narrative hero, then added the 4-variation logo lab section
- `styles.css` — replaced `.hero-quiet` block with `.hero-narrative` styles; added all the scene-specific viz styles (`.timeline-viz`, `.papers-viz`, `.curve-viz`); added `.logo-grid-four` and the logo lab styles

These are NOT committed yet. The user wanted to evaluate the visual changes before committing. **Commit + push happens after the user picks a logo variation, so we can include the chosen logo and the cleaned-up lab removal in one coherent commit.**

---

## How to run locally

```bash
cd ~/Desktop/paramai-bio
python3 -m http.server 7458
# open http://localhost:7458
```

The narrative hero auto-rotates scenes every 5.5 seconds; the third scene holds (doesn't loop back).

Jump directly to the logo lab with: `http://localhost:7458/#logo-lab`

If the engine demo (gefitinib walkthrough) doesn't run, look in browser console for errors in `engine.js`. Most likely cause is a missing element ID — the engine binds to `#run-all`, `#ep-fill`, `#extract-list`, `#missing-list`, etc. by ID.

---

## Account routing (DO NOT SKIP)

Per the user's memory and the `gh-account-router` skill, **pushing to this repo requires switching gh accounts**:

```bash
# Before pushing or doing any gh repo work:
gh auth switch --user parameter-ai

# Do the work:
git add . && git commit -m "..." && git push

# IMMEDIATELY after:
gh auth switch --user AnishMaxBagga
```

The `gh-account-router` skill should fire automatically in any session that touches this repo. If it doesn't, manually run the commands above. **`parameter-ai` is the gh account for everything under `github.com/parameter-ai/`; `AnishMaxBagga` is the default for everything else.**

Folder-scoped git identity is already set in `~/Desktop/paramai-bio/.git/config`:
- `user.name = Max Bagga`
- `user.email = parameter-ai@users.noreply.github.com`

Commits from this folder are correctly attributed without touching the global git config.

---

## Strategic decisions already locked in

These don't need to be relitigated. If a fresh context tries to reopen any of them, push back.

### What ParamAI is (public-safe phrasing)

> "A biological world model that holds an internal representation of human physiology and uses it to generate parameterized drug models for pre-clinical trial simulation."

### What's the public-facing tagline

The current draft is the 3-scene rotating hero. The user has also approved this longer one-sentence version for use as a visionary description elsewhere (LinkedIn outreach, deck cover, intro emails):

> "Drug development today takes years of expensive trial and error to learn how a molecule will behave in a person; ParamAI is a biological world model that understands the underlying physiology, turning that uncertainty into predictions you can trust, so safer drugs reach patients faster."

Don't put architecture details on the public page. We explicitly stripped the worker-agent enumeration, supervisor diagram, and moat table out of the homepage because those are competitive intelligence. **The internal architecture (supervisor + workers + interpretability layer) lives in the strategic doc set, NOT on paramai.bio.**

### Design language

- **Palette:** warm cream paper (`#f5f1e8`) for prose sections, deep ink (`#0e1116`) for engine sections, rust + olive + gold accents (`#b94e2a`, `#7c8a3d`, `#c79a3a`)
- **Type stack (current):** Fraunces serif for display, Inter for body, JetBrains Mono for equations and parameters
- **Type stack (under reconsideration):** the user flagged that Fraunces reads as "AI startup default" because it's been over-used by Anthropic, Cradle Bio, Lila, Hugging Face, etc. The candidate replacements were Source Serif 4 (free), Newsreader (free), Tiempos or GT Sectra (commercial). **This decision is paused; the user wanted to nail the logo first, then revisit fonts.**

### Architecture decisions that already happened

- **Static hero with empty whitespace** was rejected for being too thin (the visitor saw a headline and a giant blank rectangle)
- **Generative flow field hero** was built then rejected: visually cool but communicated nothing specific. Decorative without semantic meaning. "Looks like AI slop"
- **Anatomical body silhouette with floating compartment labels** was built then rejected: looked too cartoonish, also gave away architecture
- **Cinematic 5-act zoom-into-liver scene** was attempted, deemed too ambitious for the time available
- **Current narrative hero (3 auto-rotating scenes)** is what we landed on. The user approves the *direction*; the polish on individual scenes still has room to improve

### Logo decisions in flight

The user picked **"The Compartments"** direction from a list of 10 concepts. We narrowed to 4 refinements:

| Code | Name | Visual |
|---|---|---|
| A | Two circles, one line (baseline) | The original — two outlined circles nested, horizontal line through both |
| B | Directional curved arrow | Same circles, smaller one filled rust, with a curved arrow showing flow direction |
| C | With rate constant | Two equal-weight side-by-side compartments connected by line, tiny `k` rate-constant label above |
| D | Concentric rings | Three nested rings (outer body, middle organ, inner rust dot) — most graphically distinctive at favicon size |

**The user is choosing between A, B, C, D as the next action.** When they reply with a letter:

1. Replace the nav `<svg class="brand-mark">` SVG in `index.html` (line ~22-26) with the chosen mark
2. Add a `<link rel="icon">` to the `<head>` with an inline SVG data URI of the chosen mark at favicon size, so it appears in browser tabs
3. Update the footer if it has a logo (currently the footer doesn't have the mark; consider adding it)
4. Delete the entire `<section id="logo-lab">` from `index.html` (currently lines 196-414 of the un-trimmed file; will shift after edits)
5. Delete the `.logo-lab`, `.logo-grid`, `.logo-grid-ten`, `.logo-grid-four`, `.logo-card`, and related selectors from `styles.css`
6. Commit + push via parameter-ai account

The user's likely pick based on their hints: leaning toward **D** (concentric rings) because it survives the favicon test best. But the user explicitly hasn't decided yet.

---

## Open work in priority order

### 1. Logo finalization (immediate)
Pick winner, roll out, delete lab. See section above for the exact steps.

### 2. Typography reconsideration
Specifically the Fraunces question. Once the logo is done, revisit whether to swap Fraunces for Source Serif 4 / Newsreader / a sans-only system. The user's gut says the current type stack still reads as "AI startup."

### 3. Hero scene polish
The 3 narrative scenes work but each could be tightened:
- Scene 1 (timeline + "$2.6B per approved drug" + "FAILED" stamp): the text is dense. May want to simplify to just the headline number and the failure rate
- Scene 2 (3 contradictory papers): the tilted cards work; the "contradiction caught" red tag in the corner might be too punchy
- Scene 3 (concentration-time curve drawing): currently draws cleanly. Could add a small "validated" or "derived" label next to the curve
- Scene timing: 5.5s per scene. User has not pushed back on timing; leave as-is unless asked

### 4. Engine demo integration polish
The gefitinib demo runs in place but it's still using the original `engine.css` from `~/paramai-demo`. Two known issues to potentially fix:
- The `.engine` background is much darker than the homepage's cream; the visual transition from cream hero → dark engine → cream problem is intentional but could be smoother
- The engine's `.btn` styles may conflict with the homepage's `.btn` — verify nothing looks off

### 5. README polish
Currently a brief stub. Once the site is public-ready, write a real README with deployment instructions for Cloudflare Pages.

### 6. Cloudflare Pages deployment
Once the user is happy with the site, deploy to Cloudflare Pages. They have not registered `paramai.bio` yet (as of last conversation); the first deployment will be on a `*.pages.dev` subdomain.

### 7. The strategic doc set (separate repo, parallel work)
The doc set at `~/Desktop/paramai/` is in a separate private repo (`parameter-ai/paramai`). It contains all the strategic, financial, and architectural detail that does NOT belong on paramai.bio. Don't mix them up. If the user asks to update strategy docs, that work happens in the OTHER repo.

---

## Recent conversation context the user may bring up

These threads ended in unresolved or partially-resolved states. A fresh context should know they happened:

### Email drafts to investors and advisors

The user has been actively writing outreach. Two recent drafts that landed at near-final states:

**To Victoria** (intro from "Stephen", first-time investor reach-out):
```
Hi Victoria,
Thank you for the introduction, Stephen. (Moving you to Bcc to save your inbox.)
It is great to meet you and I hope you enjoyed your Memorial Day Weekend! As Stephen
mentioned, I am currently a WashU medical student building a biological world model
that holds an internal representation of human physiology and uses it to generate
parameterized drug models for pre-clinical trial simulation. The goal is to speed up
drug development and prevent the failures that today are only caught after years
and millions of dollars.
I am attaching my resume here to provide a bit more context on my background and
the work I have been doing.
If you have some time, it would be great to grab coffee or jump on a quick call. I
would love to hear how you grew and built your businesses, and your approach to
raising capital along the way.
Best,
Anish (Max) Bagga
```

**To Guillermo Rivera-Gonzalez at CapyBio** (asking for AstraZeneca intros):
Long-form reply that ended with: "Some individuals I would be interested in meeting are senior leaders on the buyer side, in areas like clinical pharmacology, translational medicine, or drug development strategy. I would also welcome connections with people who have visibility into how their organization adopts new pre-clinical platforms. I would love to walk you through the platform whenever it's convenient, or answer any follow-up questions you have over a quick call. Either way, no pressure on timing."

These don't need action; just context.

### The WashU pitch (May 28)

The user gave a 3-minute pitch at FLTC 401 (Linda Wu's session). We prepped them on:
- Customers vs. stakeholders distinction
- TAM ($4.6B biosimulation market) / SAM (~$1B parameter curation across 3,000 active programs) / SOM ($10-15M ARR in 5 years)
- Cost / value / savings: $50-150K pilot, prevented Phase II failure = $100M+, ROI is 100-1000x
- St. Louis stat: ~750 plant + medical science orgs (Cortex 400+); ~8% of US biotech
- "Years and hundreds of millions per failed trial" — the corrected per-failure number (we previously had $2.6B per drug which is the aggregate, not the per-failure figure)

The pitch happened. We haven't debriefed it. If the user wants to incorporate feedback they got, they'll bring it up.

### Strategy doc set (`~/Desktop/paramai/`, separate repo)

This is the deep private working set. 9 documents totaling ~3,840 lines. Includes the equation library, regulatory pathway, team & hiring plan with named candidates and salary ranges, competitive landscape, supervisor architecture, execution plan with burn table. **Confidential. Never paste contents into the website.**

If the user asks to "work on the strategy docs," that's in the OTHER repo. Don't confuse the two.

---

## Decisions explicitly NOT made yet (do not assume)

- **Domain registration:** `paramai.bio` has not been purchased as of the last check. The user is using `founders@paramai.bio` as the email in mockups but that address may or may not exist yet.
- **Demo page (separate `/demo`):** previously existed, was deleted, the demo is now inline on the homepage. Don't recreate the separate `/demo` page unless the user asks.
- **Cloudflare Pages deployment:** not configured. The user said "after we have something worth deploying."
- **Typography swap (Fraunces out):** discussed but paused. Don't preemptively swap fonts.
- **Logo winner:** A, B, C, or D — waiting on the user.

---

## Useful prompts the user might say when picking up

If the user comes back and says:

- **"A" / "B" / "C" / "D"** → roll out the logo per Section "Logo decisions in flight" above
- **"continue on the website"** → ask whether they want to finalize the logo first or jump to typography / hero polish
- **"deploy it"** → ask about domain status first; if no domain, set up Cloudflare Pages on a `pages.dev` subdomain
- **"strategy docs"** → switch to the OTHER repo (`~/Desktop/paramai/`, `parameter-ai/paramai`)
- **"start the server"** → `cd ~/Desktop/paramai-bio && python3 -m http.server 7458`

---

## Honest open questions worth raising next session

These are things I would push back on if I were the next assistant picking this up:

1. **Is the logo lab worth one more iteration?** The user picked Compartments but never tested it against fundamentally different directions (the Curve was the second-best fit). Worth asking "are you sure Compartments is the family before we lock it in?" — but only briefly.

2. **The narrative hero — is 5.5 seconds per scene right?** Has not been formally evaluated. May be too fast or too slow depending on reading speed.

3. **The engine demo's color scheme vs. the homepage palette.** The engine section's deep-ink background is heavy compared to the rest of the page. Could be a feature (signals "now the engine is running") or a bug (jarring transition).

4. **No analytics, no SEO meta tags beyond title/description.** Pre-launch this is fine. Before publishing, add OpenGraph tags, Twitter card meta, and at minimum a basic Plausible / Fathom / Cloudflare Analytics tag.

5. **No accessibility audit yet.** SVGs have `aria-hidden`, but the rotating headlines and the demo cycle have no screen-reader announcements. Address before public launch.

---

## File-system snapshot at handoff

```
~/Desktop/paramai-bio/
├── .git/                  (3 commits on main, ~3 uncommitted local changes)
├── .gitignore
├── HANDOFF.md             ← you are here
├── README.md
├── app.js                 (modified — narrative hero controller added)
├── engine.css             (unchanged since last commit)
├── engine.js              (unchanged since last commit)
├── index.html             (modified — narrative hero + logo lab v3)
└── styles.css             (modified — hero-narrative + logo-grid-four)
```

The server (if still running) is on port 7458. If killed, restart with the command in "How to run locally."

End of handoff.
