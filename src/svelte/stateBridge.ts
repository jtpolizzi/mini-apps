import { readable, type Readable } from 'svelte/store';
import {
  State,
  subscribe as subscribeToState,
  applyFilters,
  sortWords,
  setSort,
  clearOrder,
  setCurrentWordId,
  setRowSelectionMode,
  isRowSelectionModeEnabled,
  type VocabEntry,
  type SortState,
  type ColumnsState
} from '../../assets/state.ts';

export interface WordListSnapshot {
  rows: VocabEntry[];
  sort: SortState;
  columns: ColumnsState;
  selectionEnabled: boolean;
  currentWordId: string;
  totalFiltered: number;
}

function reorderByShuffle(rows: VocabEntry[]): VocabEntry[] {
  const order = Array.isArray(State.order) ? State.order : [];
  if (!order.length) return rows;
  const byId = new Map(rows.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const ordered: VocabEntry[] = [];
  order.forEach((id) => {
    if (seen.has(id)) return;
    const entry = byId.get(id);
    if (entry) {
      ordered.push(entry);
      seen.add(id);
    }
  });
  if (ordered.length) {
    rows.forEach((w) => {
      if (seen.has(w.id)) return;
      ordered.push(w);
    });
    return ordered;
  }
  return rows;
}

function getSnapshot(): WordListSnapshot {
  const filtered = applyFilters(State.words);
  const sorted = sortWords(filtered);
  const ordered = reorderByShuffle(sorted);
  return {
    rows: ordered,
    sort: State.sort,
    columns: State.columns,
    selectionEnabled: isRowSelectionModeEnabled(),
    currentWordId: State.ui?.currentWordId || '',
    totalFiltered: filtered.length
  };
}

export const wordListStore: Readable<WordListSnapshot> = readable(getSnapshot(), (set) => {
  const sync = () => set(getSnapshot());
  sync();
  const unsubscribe = subscribeToState(sync);
  return () => unsubscribe();
});

export const wordListActions = {
  setSort,
  clearOrder,
  setCurrentWordId,
  setRowSelectionMode
};
