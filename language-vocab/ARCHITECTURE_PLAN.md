# Architecture & Modernization Plan

## 1. Cleanup Status (v2.12.x)
- **Phase 1 (v2.12.2)** – Removed the legacy weight-migration helper and switched all `localStorage` keys to the `lv:` prefix while purging the old `v23:` entries.
- **Phase 2 (v2.12.3)** – Added canonical `termKey`s (word + POS) so overlapping data files share stars/weights; components now use `termKey` for persistence.
- **Phase 3 (in progress)** – Architectural/code review to capture recommendations before deeper refactors.

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
