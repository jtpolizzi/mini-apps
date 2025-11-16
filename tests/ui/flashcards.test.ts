import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountFlashcards } from '../../assets/components/Flashcards.ts';
import { State, setFilters, setOrder, setSort } from '../../assets/state.ts';
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../../assets/state/persistence.ts';
import type { VocabEntry } from '../../assets/state/data.ts';

const SAMPLE_WORDS: VocabEntry[] = [
  { id: 'w1', termKey: 'uno|n', word: 'uno', definition: 'one', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w2', termKey: 'dos|n', word: 'dos', definition: 'two', pos: 'n', cefr: 'A1', tags: '' },
  { id: 'w3', termKey: 'tres|n', word: 'tres', definition: 'three', pos: 'n', cefr: 'A1', tags: '' }
];

function resetState() {
  setFilters(DEFAULT_FILTERS);
  setOrder([]);
  setSort(DEFAULT_SORT);
  State.set('words', []);
}

describe('Flashcards component', () => {
  beforeEach(() => {
    resetState();
    State.set('words', SAMPLE_WORDS);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetState();
    vi.restoreAllMocks();
  });

  it('advances via keyboard shortcuts', () => {
    const container = document.createElement('div');
    const { destroy } = mountFlashcards(container);

    const progressLabel = container.querySelector('.choice-progress-label')!;
    expect(progressLabel.textContent).toContain('Card 1');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(progressLabel.textContent).toContain('Card 2');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); // flip
    const card = container.querySelector('.card')!;
    expect(card.textContent?.trim().length).toBeGreaterThan(0);

    destroy();
  });

  it('adjusts progress slider and weight', () => {
    const container = document.createElement('div');
    const { destroy } = mountFlashcards(container);
    const slider = container.querySelector<HTMLInputElement>('.flash-progress-slider')!;
    slider.value = '2';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    const progressLabel = container.querySelector('.choice-progress-label')!;
    expect(progressLabel.textContent).toContain('Card 2');

    const firstButton = container.querySelector<HTMLButtonElement>('.topright button.iconbtn');
    expect(firstButton).toBeTruthy();
    firstButton!.click();

    const weightControl = container.querySelector('.topright .weight-spark')!;
    const plus = weightControl.querySelectorAll<HTMLButtonElement>('button')[1];
    plus.click();
    plus.click();
    expect(weightControl.dataset.value).toBe('5');

    destroy();
  });
});
