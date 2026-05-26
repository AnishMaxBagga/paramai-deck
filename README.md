# paramai.bio

Marketing website for ParamAI — an orchestrated agent system for mechanistic pharmacology modeling.

## Stack

Static HTML/CSS/JS. No build step. Deployable to any static host (Cloudflare Pages, Vercel, GitHub Pages, Netlify).

- `index.html` — single-page editorial
- `styles.css` — design tokens, layout, components
- `app.js` — scroll engine, animations, interactive map

## Local development

```
python3 -m http.server 7458
# then open http://localhost:7458
```

## Design

- Type: Fraunces (display serif), Inter (sans), JetBrains Mono (equations)
- Palette: warm cream paper for prose; deep ink for engine sections; rust + olive + gold accents
- Inspired by `ethiopian-orphan-health-foundation` (scroll engine, map-driven hero) and the gefitinib demo (editorial / scientific-instrument aesthetic)

## Deployment

Recommended: Cloudflare Pages connected to this repo, deploying `main` branch.
