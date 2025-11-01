import { applyFilters, shuffledIds, sortWords, State, subscribe } from '../state.js';

export function mountTopBar(container) {
  container.innerHTML = '';
  const p = document.createElement('div');
  p.className = 'panel';
  const r = document.createElement('div');
  r.className = 'row';

  // existing filters...
  const only = chip('Only ★', State.filters.starred, () => State.set('filters', { ...State.filters, starred: !State.filters.starred }));
  r.appendChild(only);

  for (let n = 0; n <= 4; n++) {
    r.appendChild(chip('W' + n, State.filters.weight.includes(n), () => {
      const s = new Set(State.filters.weight);
      s.has(n) ? s.delete(n) : s.add(n);
      State.set('filters', { ...State.filters, weight: [...s].sort((a, b) => a - b) });
    }));
  }

  const sh = chip('Shuffle', false, () => {
    const filtered = applyFilters(State.words);
    const ids = shuffledIds(sortWords(filtered));
    State.set('order', ids);
    window.location.hash = '#/cards';
  });
  r.appendChild(sh);

  // 🆕 Translation toggle — only visible in Flashcards view
  const trans = chip('Show translation', State.ui.showTranslation, () => {
    State.set('ui', { ...State.ui, showTranslation: !State.ui.showTranslation });
  });
  trans.id = 'toggle-translation';
  r.appendChild(trans);

  const sp = document.createElement('span'); sp.className = 'spacer'; r.appendChild(sp);
  p.appendChild(r); container.appendChild(p);

  // update dynamically when switching view
  function updateVisibility() {
    const inCards = location.hash.startsWith('#/cards');
    trans.style.display = inCards ? '' : 'none';
  }
  window.addEventListener('hashchange', updateVisibility);
  updateVisibility();

  return subscribe(() => {
    only.setAttribute('aria-pressed', String(State.filters.starred));
    trans.setAttribute('aria-pressed', String(State.ui.showTranslation));
  });

  function chip(label, pressed, onClick) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(!!pressed));
    b.onclick = onClick;
    if (/^W\\d$/.test(label)) b.dataset.weight = label.slice(1);
    return b;
  }
}
