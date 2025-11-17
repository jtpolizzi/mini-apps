import { mountSvelteFlashcards } from '../../src/svelte/mountFlashcards.ts';

type Destroyable = { destroy: () => void };

export function mountFlashcards(container: HTMLElement): Destroyable {
  const teardown = mountSvelteFlashcards(container);
  return {
    destroy() {
      teardown();
    }
  };
}
