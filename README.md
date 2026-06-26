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
- Google Fonts — Inter, JetBrains Mono (via `haidi.css`)
- React + ReactDOM + Babel (unpkg) — only when `?tweaks=1` is in the URL (design panel)

## Contact form delivery (Vercel)
Set one of these in your Vercel project environment:

- `CONTACT_WEBHOOK_URL` — Slack/Zapier webhook; receives JSON `{ text, payload }`
- `RESEND_API_KEY` + `CONTACT_TO_EMAIL` — sends email via [Resend](https://resend.com)
- Optional: `CONTACT_FROM_EMAIL` (defaults to `Haidi <onboarding@resend.dev>`)

Without either configured, the form still completes for the user but submissions are not delivered (`503` from `/api/contact`).

## Design tweaks panel
Append `?tweaks=1` to any page URL to load the floating design panel (typography, canvas, accent).
