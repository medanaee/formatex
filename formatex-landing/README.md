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

- `src/content.ts`: every text of the page, in both languages, and the links (the repository and its latest release).
- `src/App.tsx`: the page. `src/components/HeroMock.tsx`: the drawing of the app in the hero (boxes, not a screenshot).
- `src/lib/preferences.ts`: language (and the page's direction) and theme, kept in `localStorage`; `index.html` applies them before the first paint.
- `src/components/ui/`: shadcn components (`npx shadcn@latest add <name>`; `components.json` is the app's, RTL on).
- `public/`: the icon, favicon and Apple touch icon, copied from the app (`npm run icons` there makes them).
