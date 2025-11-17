import { mountSvelteMultipleChoice } from '../../src/svelte/mountMultipleChoice.ts';

type Destroyable = { destroy: () => void };

export function mountMultipleChoice(container: HTMLElement): Destroyable {
  const teardown = mountSvelteMultipleChoice(container);
  return {
    destroy() {
      teardown();
    }
  };
}
