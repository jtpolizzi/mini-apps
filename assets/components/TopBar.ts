import { mountSvelteTopBar } from '../../src/svelte/mountTopBar.ts';

type Destroyable = { destroy: () => void };

export function mountTopBar(container: HTMLElement): Destroyable {
  const teardown = mountSvelteTopBar(container);
  return {
    destroy() {
      teardown();
    }
  };
}
