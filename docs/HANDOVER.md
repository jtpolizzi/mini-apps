# Handover Notes – v2.13.0

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.

## Upcoming Step B Items
1. **Svelte prototype** – rebuild the Word List view in Svelte using the existing typed store to evaluate DX/perf.
2. **Docs** – capture findings from the prototype in NOTES/ARCHITECTURE to decide on a broader migration.
3. **Follow-up tooling** – if Svelte sticks, plan how ESLint/Prettier/Vitest configs extend into the hybrid setup; otherwise continue iterative vanilla cleanups.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
Kick off Step B by scaffolding the Svelte Word List prototype, wiring it to the existing state store, and documenting initial impressions.
