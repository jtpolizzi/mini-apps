import { mount, unmount } from 'svelte';
import MultipleChoice from './MultipleChoice.svelte';

export function mountSvelteMultipleChoice(container: HTMLElement) {
  container.innerHTML = '';
  const instance = mount(MultipleChoice, {
    target: container
  });
  return () => {
    void unmount(instance);
  };
}
