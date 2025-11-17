import { mount, unmount } from 'svelte';
import Flashcards from './Flashcards.svelte';

export function mountSvelteFlashcards(container: HTMLElement) {
  container.innerHTML = '';
  const instance = mount(Flashcards, {
    target: container
  });
  return () => {
    void unmount(instance);
  };
}
