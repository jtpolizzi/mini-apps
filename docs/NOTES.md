# Vocab Mini-App Notes (v2.14.9)

> **Purpose & scope** – living snapshot of the product: what features exist today, how they behave, and which improvements we’re considering next. Implementation details and release-by-release histories live in `ARCHITECTURE_PLAN.md` and `CHANGELOG.md` respectively.

## Snapshot
- SPA written in vanilla HTML/CSS/JS; routes driven via hash (`#/list`, `#/cards`, `#/match`, `#/choice`).
- Vocabulary loaded from `data/words.tsv` (preferred) or `data/words.json`, then normalized through `mapRaw()` into `State.words`.
- Global `State` persists filters, stars, weights, and UI prefs in `localStorage`; `subscribe()` notifies mounted views.
- Components live in `assets/components/` and mount/unmount via `mount*` helpers; shared top bar + settings modal stay resident.

## Current Views
### Word List
- Sortable table with sticky header and columns for ⭐, weight, Spanish, English, POS, CEFR, Tags.
- Filter/search chips in the shared top bar (Only★, Shuffle, Filters popover, Search, Settings).
- Filters offer multi-select for POS/CEFR/Tags/Weights plus quick clear; result count shown live.

### Flashcards
- Large center card plus persistent bottom nav (← counter →) with keyboard + touch parity.
- Click/tap center to flip; left/right tap zones or horizontal swipes move prev/next.
- Keyboard: ←/→ prev/next, Space/Enter/↑/↓ flip, `s` toggles star, digits `0`-`4` set weight.
- Top-right overlays expose ⭐ toggle, weight chips, and optional translation line tied to settings.

### Match & Multiple Choice
- Word Match pairs Spanish ↔ English tiles with progress tracking.
- Multiple Choice generates lightweight quizzes pulling from the filtered word pool.

## Data & Persistence
- `State` fields: `words`, `filters`, `order` (shuffle), `ui` prefs, plus derived helpers in `state.js`.
- User progress lives under the `Prog` namespace (stars + weights) and syncs across all views.
- Filters and shuffle order survive reloads; resetting happens via Settings → “Reset filters & order”.

## Next Targets / Ideas
1. Progress export/import (JSON) for stars + weights.
2. Optional TTS button + auto-speak toggle on flashcards.
3. Enhanced filter UX (clear-all, select-all weights) and Edge sticky-header workaround.
4. Hosting story (GitHub Pages) and/or packaging as a simple PWA.

## Document Map
- **Architecture details** – see `docs/ARCHITECTURE_PLAN.md` for modernization phases, component conventions, and technical decisions.
- **Release history** – see `CHANGELOG.md` for version-by-version bullet points from v2.5 onward.

## Current Focus
- Finish the v2.14 Svelte cleanup: all major views run through Svelte 5 + the shared store bridge; remaining work centers on CSS colocation and tooling/tests so we can retire the legacy helpers.
- Shared UI primitives (`ChipButton`, `WeightSparkControl`) are the baseline; future UI tweaks should either extend those components or introduce new shared primitives instead of reintroducing global CSS.
