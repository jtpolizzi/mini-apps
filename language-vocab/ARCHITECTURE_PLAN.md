# Architecture & Modernization Plan

## 1. Cleanup Status (v2.12.x)
- **Phase 1 (v2.12.2)** – Removed the legacy weight-migration helper and switched all `localStorage` keys to the `lv:` prefix while purging the old `v23:` entries.
- **Phase 2 (v2.12.3)** – Added canonical `termKey`s (word + POS) so overlapping data files share stars/weights; components now use `termKey` for persistence.
- **Phase 3 (in progress)** – Architectural/code review to capture recommendations before deeper refactors.

### Phase 3 Review Notes (working doc)
**State & persistence**
- Split `assets/state.js` into `state/persistence.js` (LS helpers + migrations), `state/store.js` (mutable store + `subscribe`), and `state/selectors.js` (`applyFilters`, `sortWords`, `shuffledIds`). This keeps the observable store tiny and lets future TS types describe each surface.
- Treat `State.words` as derived, not persisted. `loadData()` should dispatch a `hydrateWords(raw)` action that strips DOM concerns, runs `mapRaw`, and records metadata (source file, loadedAt) for debugging.
- Document every state transition, especially the implicit coupling between `State.set('filters')` and `setCurrentWordId('')`. Move those cascades into dedicated actions so components no longer have to remember side-effects.
- Create a small event map (`State.on('filtersChanged', handler)`) instead of calling every subscriber on any change. The Word List rerender should only fire when data affecting it actually changes.

**Component boundaries**
- Standardize every view mount to return `{ destroy, render }`. `assets/app.js` currently relies on a mutable `cleanupView`; replace that with a typed contract plus a `mountView(route, container)` registry. This removes repeated `(() => {})` fallbacks and makes SSR/testing easier.
- Extract reusable DOM helpers from `assets/components/TopBar.js` (chip factory, filter grid, popover) into `components/ui/` so Match/Choice screens can share consistent chips and focus management. The same helpers can host keyboard/a11y attributes instead of duplicating `aria-pressed` toggles.
- Introduce a thin presenter for Word List rows that only accepts data + callbacks; the current module mixes pointer gesture logic, selection state, and DOM building in one file. Breaking it apart will let us unit-test long-press behavior separately from table rendering.

**Effects & async work**
- Wrap data loading in an `assets/data/loader.js` module that exposes `loadWords({ preferTSV: true })` and events for “started/failed/complete.” `app.js` should listen for those events and show a loading skeleton in `#view` until the initial render can run.
- Normalize interval/timer cleanup. Components such as flashcards and Word Match set timers but rely on GC; track timers in each mount and clear them in `destroy()` so switching routes cannot leak handlers.
- Consolidate Drive/PWA side-effects behind `tools/integrations/*.js` stubs now, so the later Step A TypeScript build just swaps the implementations instead of rewriting each component.

**Testing & instrumentation**
- Add a “debug” build flag (can just be an env var consumed by a lightweight build script) that exposes the store on `window.__LV_STATE__` plus helper logging for subscription frequency. This lets us validate the event storm fixes before bringing in a real framework.
- Once the TS build lands (Step A), add Vitest suites for `state/*.ts` plus DOM tests for the extracted UI helpers via happy-dom. Cover `filtersEqual`, `termKey`, and the shuffle order logic because they are the easiest places to regress silently.

## 2. Near-Term Modernization

### Step A – TypeScript + ES Modules (target v2.13.x)
1. Introduce a lightweight build (tsc or Vite) that outputs the same static assets for GitHub Pages.
2. Define types for `VocabEntry`, `TermKey`, `State`, `Prog`, etc., and convert existing JS files incrementally (`state.ts`, `components/*.ts`, utilities).
3. Keep the current DOM-driven UI while benefiting from type safety and clearer module boundaries.

### Step B – Svelte Evaluation (target v2.14.x)
1. Rebuild a single view (Word List) in Svelte using the typed stores to gauge ergonomics, bundle size, and complexity.
2. Document findings (pros/cons vs. vanilla) to decide whether a full migration is worthwhile.

### Step C – Conditional Svelte Migration (post-evaluation)
1. If Svelte proves valuable, plan a phased component migration (TopBar, WordList, Flashcards, Match, Choice, Settings).
2. Establish shared stores for global state, Drive/OPFS integration hooks, and PWA plumbing.
3. Ensure the build still emits static files for GitHub Pages (SvelteKit static adapter or Vite build).

## 3. Cross-Cutting Cleanup Items
- Complete the Phase 3 review with concrete recommendations (state organization, event handling, shared utilities, testing strategy).
- Consolidate naming (language-neutral field names, consistent module paths).
- Add linting/formatting + basic automated tests once the TS build is in place.

## 4. Version Milestones
- **v2.12.4+** – Publish the code-review findings and finalize Phase 3.
- **v2.13.x** – Land TypeScript + module build (Step A).
- **v2.14.x** – Prototype a Svelte view and decide on full migration (Step B).
- **v2.15.x+** – Execute the migration plan if approved (Step C), or extend the vanilla codebase with the review recommendations if not.
