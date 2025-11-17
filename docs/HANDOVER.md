# Handover Notes – v2.14.2

## Current Status
- Repository renamed to `language-vocab` and the app now lives at the repo root.
- Build tooling: `npm run dev` (Vite dev server), `npm run test` (Vitest + happy-dom), `npm run build` (Vite production bundle).
- GitHub Pages workflow (`.github/workflows/pages.yml`) builds with Node 22 and deploys the `dist/` output. Pages URL: https://jtpolizzi.github.io/language-vocab/ (formerly `/mini-apps/language-vocab`).
- Public assets (e.g., `public/data/words.tsv`) are copied automatically by Vite and included in the build.
- Step B kicked off: Svelte (+ plugin) is now in the toolchain with a `#/svelte-list` route and a state-bridged Word List prototype that shares the existing store/actions.
- The Svelte Word List is now the default route (`#/svelte-list` / “Word List” nav item) while the legacy view lives under “Word List (Legacy)” for side-by-side comparisons.
- The shared Top Bar now ships as a Svelte component (shuffle, search, filters popover, saved sets, weight/facet toggles, settings modal) while every route still runs on the legacy logic.

## Upcoming Step B Items
1. **Render the Svelte table** – bring the filtered/sorted rows into the prototype, then layer sorting controls, star/weight toggles, and row-selection parity.
2. **Document findings** – record DX/perf learnings from the prototype in NOTES/ARCHITECTURE to guide the go/no-go decision.
3. **Tooling follow-ups** – if Svelte becomes permanent, extend ESLint/Prettier/Vitest configs accordingly; otherwise continue vanilla cleanups once the evaluation wraps.

## Deployment Checklist
1. `npm install`
2. `npm run build`
3. Commit/push to `main` – the “Deploy static site” workflow builds/tests and publishes to GitHub Pages automatically.

## Next Session
- Prep a parity checklist + work plan for the next Svelte migration target (Flashcards is the most interactive, so it’s a good stress test). Checklist should cover layout constraints, typography, interactions (keyboard/touch), gestures, overlays, and edge cases.
- Agree on the store contract the new Svelte view will consume/emit (card order, flip state, star/weight updates, settings toggles) and decide which shared styles remain global vs. move into the component.
- Once the plan is approved, implement the component in deliberate batches (card rendering + controls first, styling second) and only then retire the duplicate CSS when the legacy view goes away.

### Svelte Flashcards – Parity Checklist & Store Contract
**Layout / visual**
- Preserve the centered card stack (`width: min(100%, 720px)`), bottom nav counter, and the persistent overlays in the top-right corner. Respect current spacing tokens so cards sit flush under the header/top bar.
- Typography: keep the card word/definition sizes, the nav counter font (16 px bold), and the overlay chip sizes. Translation line still uses the muted style that toggles via settings.
- Layout must flex between portrait/landscape and small widths without collapsing the swipe targets or nav buttons.

**Interactions**
- Keyboard: `←/→` move prev/next, `Space/Enter/↑/↓` flip, `s` toggles star, digits `0`-`4` (or `1`-`5` if we keep the new scale) set the weight, `Esc` cancels any pending action without moving cards.
- Pointer/touch: tap center to flip, left/right tap zones for prev/next, horizontal swipe gestures for navigation, and long-press on the overlays should not steal focus from the card.
- Overlays (star toggle, weight chips, translation toggle) must remain clickable/tappable even while the card is mid-animation.
- Bottom nav buttons must stay disabled/enabled in sync with the available prev/next cards and preserve the focus ring order.

**Data contract**
- Inputs from the store bridge: filtered/shuffled card list, current index, flip state, `Prog` star/weight values, and UI prefs (show translation, debug panel).
- Events emitted: `setCurrentWordId` (to sync with other views), `Prog.setStar`, `Prog.setWeight`, navigation actions (prev/next), and `State.set('ui', ...)` when settings toggles update.
- Derived helpers: formatted counter text, disabled states for nav buttons, whether translation text renders, and whether the overlays should show weight chips or spark icons.

**Shared styling**
- Keep design tokens (colors, spacing, typography) in `assets/styles.css`; move card-specific layout into the `.svelte` file so we can remove the legacy CSS once Flashcards migrates.
- Reuse shared chip/overlay styles where possible so the Svelte and legacy views stay visually interchangeable until the legacy code is deleted.
