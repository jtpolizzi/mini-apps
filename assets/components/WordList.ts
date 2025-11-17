import { mountSvelteWordList } from '../../src/svelte/mountWordListPrototype.ts';

type Destroyable = { destroy: () => void };

export function mountWordList(container: HTMLElement): Destroyable {
  const teardown = mountSvelteWordList(container);
  return {
    destroy() {
      teardown();
    }
  };
}
