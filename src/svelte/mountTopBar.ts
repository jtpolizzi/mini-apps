import { mount, unmount } from 'svelte';
import TopBar from './TopBar.svelte';

export function mountSvelteTopBar(container: HTMLElement) {
  container.innerHTML = '';
  const instance = mount(TopBar, {
    target: container
  });
  return () => {
    void unmount(instance);
  };
}
