// assets/components/TopBar.ts
import {
  applyFilters,
  shuffledIds,
  sortWords,
  State,
  sanitizeFilters,
  filtersEqual,
  onStateEvent,
  setFilters,
  setFilterSets,
  setSort,
  setOrder,
  type FilterSet,
  type Filters,
  type VocabEntry
} from '../state.ts';
import { createChip, createIconChip } from './ui/elements.ts';
import { createSparkIcon, WEIGHT_DESCRIPTIONS, WEIGHT_SHORT_LABELS } from './WeightControl.ts';
import { openSettingsModal } from './SettingsModal.ts';

let lastSelectedFilterSetId = '';

type Destroyable = { destroy: () => void };
type FilterPopoverElement = HTMLDivElement & { _unsub?: () => void };
type SavedSetSection = { wrap: HTMLDivElement; refresh: () => void };
type FacetKey = 'pos' | 'cefr' | 'tags';
type FacetTitle = 'POS' | 'CEFR' | 'Tags';
interface FacetSection {
  wrap: HTMLDivElement;
  refresh: () => void;
}

const ALL_WEIGHTS = [1, 2, 3, 4, 5] as const;
const facetKeyMap: Record<FacetTitle, FacetKey> = {
  POS: 'pos',
  CEFR: 'cefr',
  Tags: 'tags'
};

export function mountTopBar(container: HTMLElement): Destroyable {
  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'panel panel--topbar';
  panel.style.position = 'relative';

  const row = document.createElement('div');
  row.className = 'row';

  // Shuffle (stay on current view) + clear sort indicators
  const shuffleChip = createChip('Shuffle', {
    onClick: () => {
      const filtered = applyFilters(State.words);
      const sorted = sortWords(filtered);
      setOrder(shuffledIds(sorted));
      setSort({ key: '', dir: 'asc' }); // ← clear sort UI after shuffle
    }
  });
  row.appendChild(shuffleChip);

  // Filters (popover)
  const filtersChip = createChip('Filters', { pressed: hasActiveFilters(), onClick: (event) => toggleFilters(event) });
  filtersChip.id = 'filters-chip';
  row.appendChild(filtersChip);

  // spacer
  const spacer = document.createElement('span');
  spacer.className = 'spacer';
  row.appendChild(spacer);

  // Results count
  const resultCount = document.createElement('span');
  resultCount.className = 'countpill';
  Object.assign(resultCount.style, { opacity: 0.85, fontWeight: '700', marginRight: '8px' });
  row.appendChild(resultCount);

  // Gear (Settings)
  const gear = createChip('', { icon: '⚙︎', title: 'Settings', onClick: () => openSettingsModal() });
  row.appendChild(gear);

  // Search
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search…';
  search.value = State.filters.search || '';
  search.className = 'search';
  search.autocapitalize = 'off';
  search.autocomplete = 'off';
  search.spellcheck = false;
  let searchDebounce: number | null = null;
  search.addEventListener('input', () => {
    if (searchDebounce !== null) window.clearTimeout(searchDebounce);
    const val = search.value;
    searchDebounce = window.setTimeout(() => {
      setFilters({ ...State.filters, search: val });
    }, 200);
  });
  row.appendChild(search);

  panel.appendChild(row);
  container.appendChild(panel);

  // ---- Filters popover ----
  let pop: FilterPopoverElement | null = null;
  function toggleFilters(event?: MouseEvent) {
    event?.stopPropagation();
    if (pop) {
      closePop();
      return;
    }
    pop = buildFiltersPopover();
    panel.appendChild(pop);
    window.setTimeout(() => window.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(ev: MouseEvent) {
    if (!pop) return;
    const target = ev.target;
    if (target instanceof Node && (pop.contains(target) || target === filtersChip)) return;
    closePop();
  }
  function closePop() {
    if (pop?._unsub) pop._unsub();
    pop?.remove();
    pop = null;
    window.removeEventListener('click', onDocClick);
  }

  function buildFiltersPopover(): FilterPopoverElement {
    const el = document.createElement('div') as FilterPopoverElement;
    el.className = 'popover';
    Object.assign(el.style, {
      border: '1px solid var(--line)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,.35)',
      marginTop: '12px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    });
    el.addEventListener('click', (e) => e.stopPropagation());

    const availableSets = Array.isArray(State.filterSets) ? State.filterSets : [];
    const matchingSet = availableSets.find((s) => filtersEqual(State.filters, s.filters));
    let selectedSetId = '';
    if (lastSelectedFilterSetId && availableSets.some((s) => s.id === lastSelectedFilterSetId)) {
      selectedSetId = lastSelectedFilterSetId;
    } else if (matchingSet) {
      selectedSetId = matchingSet.id;
    }
    if (selectedSetId) {
      lastSelectedFilterSetId = selectedSetId;
    }

    const savedSection = buildSavedSetsSection();
    el.appendChild(savedSection.wrap);

    const quickRow = document.createElement('div');
    Object.assign(quickRow.style, {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px'
    });
    const quickLabel = document.createElement('div');
    quickLabel.textContent = 'Quick filters';
    quickLabel.style.fontWeight = '700';
    const starToggle = createChip('Only ★', {
      pressed: !!State.filters.starred,
      onClick: () => {
        setFilters({ ...State.filters, starred: !State.filters.starred });
      }
    });
    const refreshStarToggle = () => {
      starToggle.setAttribute('aria-pressed', String(!!State.filters.starred));
    };
    quickRow.append(quickLabel, starToggle);
    el.appendChild(quickRow);

    const facetSections: FacetSection[] = [];
    const refreshFacetSections = () => facetSections.forEach((sec) => sec.refresh());

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px'
    });

    const { posValues, cefrValues, tagValues } = collectFacetValues(State.words);

    const posSection = sectionChecks('POS', posValues, State.filters.pos || [], (next) => {
      setFilters({ ...State.filters, pos: next });
    });
    facetSections.push(posSection);
    grid.appendChild(posSection.wrap);

    const cefrSection = sectionChecks('CEFR', cefrValues, State.filters.cefr || [], (next) => {
      setFilters({ ...State.filters, cefr: next });
    });
    facetSections.push(cefrSection);
    grid.appendChild(cefrSection.wrap);

    const tagSection = sectionChecks('Tags', tagValues, State.filters.tags || [], (next) => {
      setFilters({ ...State.filters, tags: next });
    });
    facetSections.push(tagSection);
    grid.appendChild(tagSection.wrap);

    // Weight row (buttons) with live UI refresh
    const weightWrap = document.createElement('div');
    weightWrap.style.gridColumn = '1 / -1';
    const weightTitle = document.createElement('div');
    weightTitle.textContent = 'Weight';
    Object.assign(weightTitle.style, { fontWeight: '700', marginTop: '8px', marginBottom: '6px' });
    const weightRow = document.createElement('div');
    weightRow.className = 'weight-chip-row';

    const weightBtns: HTMLButtonElement[] = [];
    const refreshWeightBtns = () => {
      const set = new Set(State.filters.weight || ALL_WEIGHTS);
      weightBtns.forEach((btn) => {
        const n = Number.parseInt(btn.dataset.weight || '', 10);
        if (!Number.isFinite(n)) return;
        btn.setAttribute('aria-pressed', String(set.has(n)));
      });
    };
    ALL_WEIGHTS.forEach((n) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `weight-chip weight-chip--${n}`;
      button.dataset.weight = String(n);
      button.setAttribute('aria-pressed', 'true');
      button.title = WEIGHT_DESCRIPTIONS[n] || `Weight ${n}`;
      const icon = createSparkIcon('weight-chip__icon');
      const label = document.createElement('span');
      label.textContent = WEIGHT_SHORT_LABELS[n] || `W${n}`;
      button.append(icon, label);
      button.addEventListener('click', () => {
        const set = new Set(State.filters.weight || ALL_WEIGHTS);
        if (set.has(n)) {
          set.delete(n);
        } else {
          set.add(n);
        }
        setFilters({ ...State.filters, weight: [...set].sort((a, b) => a - b) });
        refreshWeightBtns();
      });
      weightBtns.push(button);
      weightRow.appendChild(button);
    });
    weightWrap.append(weightTitle, weightRow);

    el.appendChild(grid);
    el.appendChild(weightWrap);

    const footer = document.createElement('div');
    Object.assign(footer.style, { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' });

    const clearBtn = createChip('Clear', {
      onClick: () => {
        setFilters({ ...State.filters, pos: [], cefr: [], tags: [], weight: [...ALL_WEIGHTS] });
        selectedSetId = '';
        lastSelectedFilterSetId = '';
        refreshWeightBtns();
        savedSection.refresh();
        refreshFacetSections();
      }
    });

    const closeBtn = createChip('Close', { onClick: () => closePop() });

    footer.append(clearBtn, closeBtn);
    el.appendChild(footer);

    const popUnsubs = [
      onStateEvent('filtersChanged', () => {
        refreshStarToggle();
        refreshWeightBtns();
        savedSection.refresh();
        refreshFacetSections();
      }),
      onStateEvent('filterSetsChanged', () => savedSection.refresh()),
      onStateEvent('wordsChanged', () => refreshFacetSections()),
      onStateEvent('progressChanged', () => refreshStarToggle())
    ];
    el._unsub = () => popUnsubs.forEach((unsub) => unsub());
    refreshStarToggle();
    refreshWeightBtns();
    savedSection.refresh();
    refreshFacetSections();
    return el;

    function buildSavedSetsSection(): SavedSetSection {
      const wrap = document.createElement('div');
      Object.assign(wrap.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--line)'
      });

      const title = document.createElement('div');
      title.textContent = 'Saved filter sets';
      title.style.fontWeight = '700';
      wrap.appendChild(title);

      const rowEl = document.createElement('div');
      Object.assign(rowEl.style, {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        alignItems: 'center'
      });

      const select = document.createElement('select');
      Object.assign(select.style, { flex: '1 1 220px', minWidth: '200px' });
      rowEl.appendChild(select);

      const load = createIconChip('⇩', 'Load selected set', { disabled: true });
      rowEl.appendChild(load);

      const update = createIconChip('⟳', 'Update selected set', { disabled: true });
      rowEl.appendChild(update);

      const save = createIconChip('＋', 'Save current filters as new set');
      rowEl.appendChild(save);

      const del = createIconChip('🗑', 'Delete selected set', { disabled: true });
      rowEl.appendChild(del);

      wrap.appendChild(rowEl);

      const status = document.createElement('div');
      status.style.fontSize = '12px';
      status.style.color = 'var(--fg-dim)';
      wrap.appendChild(status);

      const getSets = (): FilterSet[] => (Array.isArray(State.filterSets) ? State.filterSets : []);

      select.addEventListener('change', () => {
        selectedSetId = select.value;
        lastSelectedFilterSetId = selectedSetId || '';
        refresh();
      });

      load.addEventListener('click', () => {
        if (!selectedSetId) return;
        const sets = getSets();
        const found = sets.find((s) => s.id === selectedSetId);
        if (!found) return;
        lastSelectedFilterSetId = selectedSetId;
        setFilters(sanitizeFilters(found.filters));
        closePop();
      });

      save.addEventListener('click', () => {
        const sets = getSets();
        const defaultName = (selectedSetId && sets.find((s) => s.id === selectedSetId)?.name) || '';
        const input = prompt('Save current filters as…', defaultName || 'New filter set');
        if (input == null) return;
        const name = input.trim();
        if (!name) return;
        const filters = sanitizeFilters(State.filters);
        const existing = sets.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          const ok = confirm(`Replace the saved set “${existing.name}”?`);
          if (!ok) return;
          const next = sets.map((s) => (s.id === existing.id ? { ...s, name, filters } : s));
          selectedSetId = existing.id;
          lastSelectedFilterSetId = existing.id;
          setFilterSets(next);
        } else {
          const newSet = { id: newFilterSetId(), name, filters };
          selectedSetId = newSet.id;
          lastSelectedFilterSetId = newSet.id;
          setFilterSets([...sets, newSet]);
        }
        refresh();
      });

      update.addEventListener('click', () => {
        if (!selectedSetId) return;
        const sets = getSets();
        if (!sets.some((s) => s.id === selectedSetId)) return;
        const filters = sanitizeFilters(State.filters);
        const next = sets.map((s) => (s.id === selectedSetId ? { ...s, filters } : s));
        lastSelectedFilterSetId = selectedSetId;
        setFilterSets(next);
        refresh();
      });

      del.addEventListener('click', () => {
        if (!selectedSetId) return;
        const sets = getSets();
        const target = sets.find((s) => s.id === selectedSetId);
        if (!target) return;
        if (!confirm(`Delete the saved set “${target.name}”?`)) return;
        const next = sets.filter((s) => s.id !== selectedSetId);
        if (lastSelectedFilterSetId === selectedSetId) {
          lastSelectedFilterSetId = '';
        }
        selectedSetId = '';
        setFilterSets(next);
        refresh();
      });

      const refresh = () => {
        const sets = getSets();
        if (selectedSetId && !sets.some((s) => s.id === selectedSetId)) {
          if (lastSelectedFilterSetId === selectedSetId) {
            lastSelectedFilterSetId = '';
          }
          selectedSetId = '';
        }

        if (!selectedSetId) {
          if (lastSelectedFilterSetId && sets.some((s) => s.id === lastSelectedFilterSetId)) {
            selectedSetId = lastSelectedFilterSetId;
          } else {
            const match = sets.find((s) => filtersEqual(State.filters, s.filters));
            if (match) {
              selectedSetId = match.id;
              lastSelectedFilterSetId = match.id;
            }
          }
        }

        select.innerHTML = '';
        if (!sets.length) {
          lastSelectedFilterSetId = '';
          selectedSetId = '';
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'No saved sets yet';
          opt.selected = true;
          select.appendChild(opt);
          select.disabled = true;
        } else {
          select.disabled = false;
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Select a saved set…';
          placeholder.selected = !selectedSetId;
          select.appendChild(placeholder);
          sets.forEach((set) => {
            const opt = document.createElement('option');
            opt.value = set.id;
            opt.textContent = set.name;
            opt.selected = set.id === selectedSetId;
            select.appendChild(opt);
          });
          select.value = selectedSetId || '';
        }

        load.disabled = !selectedSetId;
        update.disabled = !selectedSetId;
        del.disabled = !selectedSetId;

        const setsNow = getSets();
        const selected = setsNow.find((s) => s.id === selectedSetId);
        const matching = setsNow.find((s) => filtersEqual(State.filters, s.filters));
        let message = '';
        if (!setsNow.length) {
          message = 'Save the current filters to reuse them later.';
        } else if (selected) {
          message = filtersEqual(State.filters, selected.filters)
            ? `Current filters match “${selected.name}”.`
            : 'Current filters differ from the selected set.';
        } else if (matching) {
          message = `Current filters match “${matching.name}”.`;
        }
        status.textContent = message;
        status.style.display = message ? 'block' : 'none';
      };

      return { wrap, refresh };
    }

    function sectionChecks(title: FacetTitle, values: string[], selected: string[], onChange: (next: string[]) => void): FacetSection {
      const wrap = document.createElement('div');
      const heading = document.createElement('div');
      heading.textContent = title;
      heading.style.fontWeight = '700';
      heading.style.marginBottom = '6px';
      wrap.appendChild(heading);

      const box = document.createElement('div');
      Object.assign(box.style, { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '40vh', overflow: 'auto' });

      const controls: Array<{ checkbox: HTMLInputElement; valueLower: string }> = [];
      const selLower = new Set((selected || []).map((val) => val.toLowerCase()));
      const filterKey = facetKeyMap[title];

      values.forEach((value) => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        const valueLower = value.toLowerCase();
        checkbox.checked = selLower.has(valueLower);
        checkbox.addEventListener('change', () => {
          const set = new Set((State.filters[filterKey] || []).map((v) => v.toLowerCase()));
          if (checkbox.checked) {
            set.add(valueLower);
          } else {
            set.delete(valueLower);
          }
          onChange([...set]);
        });
        const span = document.createElement('span');
        span.textContent = value;
        label.append(checkbox, span);
        box.appendChild(label);
        controls.push({ checkbox, valueLower });
      });
      wrap.appendChild(box);

      const refresh = () => {
        const active = new Set((State.filters[filterKey] || []).map((val) => val.toLowerCase()));
        controls.forEach(({ checkbox, valueLower }) => {
          const shouldCheck = active.has(valueLower);
          if (checkbox.checked !== shouldCheck) checkbox.checked = shouldCheck;
        });
      };

      return { wrap, refresh };
    }

    function newFilterSetId(): string {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return `fs_${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function collectFacetValues(words: VocabEntry[] = []): { posValues: string[]; cefrValues: string[]; tagValues: string[] } {
    const pos = new Set<string>();
    const cefr = new Set<string>();
    const tags = new Map<string, number>();
    const addTag = (tag: string) => {
      const key = tag.toLowerCase();
      tags.set(key, (tags.get(key) || 0) + 1);
    };
    for (const w of words) {
      if (w.pos) pos.add(w.pos);
      if (w.cefr) cefr.add(w.cefr);
      if (w.tags) {
        String(w.tags)
          .split(/[|,;]+|\s+/g)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach(addTag);
      }
    }
    const tagValues = [...tags.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 150)
      .map(([k]) => k);
    return { posValues: [...pos].sort(), cefrValues: [...cefr].sort(), tagValues };
  }

  function activeFilterCount(): number {
    const f: Filters = State.filters;
    return (
      (f.starred ? 1 : 0) +
      (f.weight.length < ALL_WEIGHTS.length ? 1 : 0) +
      f.pos.length +
      f.cefr.length +
      f.tags.length
    );
  }

  function hasActiveFilters(): boolean {
    return activeFilterCount() > 0;
  }

  function syncSearchInput() {
    if (document.activeElement !== search) {
      search.value = State.filters.search || '';
    }
  }

  function refreshFilterChip() {
    const count = activeFilterCount();
    filtersChip.textContent = count ? `Filters (${count})` : 'Filters';
    filtersChip.setAttribute('aria-pressed', String(!!count));
  }

  function refreshResultCount() {
    const n = applyFilters(State.words).length;
    resultCount.textContent = `${n} result${n === 1 ? '' : 's'}`;
  }

  syncSearchInput();
  refreshFilterChip();
  refreshResultCount();

  const eventUnsubs = [
    onStateEvent('filtersChanged', () => {
      syncSearchInput();
      refreshFilterChip();
      refreshResultCount();
    }),
    onStateEvent('wordsChanged', () => refreshResultCount()),
    onStateEvent('progressChanged', () => refreshResultCount())
  ];

  return {
    destroy() {
      eventUnsubs.forEach((unsub) => unsub());
      closePop();
    }
  };
}
