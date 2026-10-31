# Formatex landing

A minimal, compact landing page for Formatex: React 19 + Vite + Tailwind v4 + shadcn (the same tokens as the app), in Persian and English, light and dark. It is static: a Cloudflare Worker serves `dist/client` as static assets (`wrangler.jsonc`), with the single-page fallback.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck && npm run lint
npm run build      # dist/client + dist/formatex_landing (the Worker)
npm run preview    # build, then serve it the way Cloudflare does
```

## Deploy to Cloudflare

Once, `npx wrangler login`. Then:

```bash
npm run deploy     # builds and publishes to <name>.<account>.workers.dev
```

Or connect the GitHub repository in the Cloudflare dashboard (Workers & Pages, Create, Import a repository) with:

- Root directory: `formatex-landing`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

A custom domain is added under the Worker's Settings, Domains & Routes (or as `routes` in `wrangler.jsonc`).

## Where things are

- `src/content.ts`: every text of the page, in both languages (English first), and the links (the repository and its latest release).
- `src/App.tsx`: the page. `src/components/Intro.tsx`: the white logo arriving as liquid glass on black (`liquid-glass-logo*` are the installed ReactDrops component; `public/logo.svg` is the white mark it draws).
- `src/sections/`: `Lens.tsx` (the hero: a line that comes down on scroll and shows the Markdown above it), `Studio.tsx` (a drawn copy of the app), `Wall.tsx` (the count, the bars of tag names and the slider of rendered tags), `Refs.tsx` (contents, lists, references), `Library.tsx` (the theme dial), `Forge.tsx` (your own theme and component).
- `src/landing.css`: the styles of those sections and the intro. `src/index.css`: tokens (dark only, the colors of the logo) and fonts: titles in Domine (Latin) and Abar (Persian; variable, `wght` 400 to 1000 and `CNTR`, the thick-thin contrast), text in Inter (Latin) and Iran Sans X (Persian).
- `src/lib/preferences.ts`: language (and the page's direction), kept in `localStorage`; `index.html` applies the direction before the first paint.
- `scripts/render-pages.py`: renders, with the same engine, the page of the theme dial (one fixed page in each of the eight themes, `src/assets/themes/`) and the three pages of contents, lists and references (`src/assets/refs/`). `scripts/typst_page.py` holds what both scripts share.
- `scripts/render-tags.py`: renders the tags of the component slider with the real engine (`../formatex-typ`, the Typst CLI, midnight theme) into `src/assets/tags/<lang>/<tag>.svg`, with the Markdown it came from in `<tag>.md`. Run it again after a change in the engine's look (needs Pillow).
- `concepts/`: the earlier standalone design studies (not deployed).
- `public/`: the icon, favicon, Apple touch icon and the white logo.

## Auto deploy

Cloudflare Workers Builds is connected to the repository: a push to `main` that changes `formatex-landing/` builds (`npm run build`) and deploys (`npx wrangler deploy`) it. Root directory: `formatex-landing`.
