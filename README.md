# Haidi — Marketing Site

Static marketing site for Haidi (supply chain demand planning). Plain HTML/CSS/JS — no build step.

## Pages
- `home.html` — homepage (served at `/`)
- `product-overview.html` — product overview
- `about.html` — about / IBP Ready
- `contact.html` — multi-step "Prepare to launch" form
- `assets/` — shared CSS, JS, logo

## Local preview
Run a static server from this folder (don't open via `file://` — the scripts are fetched over HTTP):

```bash
python -m http.server 8000
# then visit http://localhost:8000/home.html
```

## Deploy to Vercel via GitHub
1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Other**. Leave build command empty and output directory as the repo root (it's a static site).
4. Deploy.

`vercel.json` handles routing:
- `cleanUrls` serves pages without the `.html` extension (e.g. `/contact`).
- `/` redirects to `/home`.

## External dependencies (loaded at runtime via CDN)
- Google Fonts — Instrument Serif
- React + ReactDOM + Babel (unpkg) — only powers the floating "Tweaks" design panel

These require an internet connection to render fully. The Tweaks panel is a design-time control; it can be removed for production by deleting the `<!-- TWEAKS -->` script block in each HTML file if not needed.
