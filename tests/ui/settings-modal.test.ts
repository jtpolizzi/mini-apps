import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { openSettingsModal, mountSettings } from '../../assets/components/SettingsModal.ts';
import { State } from '../../assets/state.ts';

const originalColumns = { ...State.columns };
const originalUI = { ...State.ui };

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  State.set('columns', originalColumns);
  State.set('ui', originalUI);
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('Settings modal', () => {
  it('toggles Word List column visibility', () => {
    State.set('columns', { ...State.columns, star: true });
    openSettingsModal();
    const overlay = document.querySelector('.modal-overlay');
    expect(overlay).toBeTruthy();

    const starLabel = Array.from(document.querySelectorAll('.modal label')).find((label) =>
      label.textContent?.includes('Star')
    );
    const checkbox = starLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(State.columns.star).toBe(false);

    overlay?.remove();
  });

  it('only mounts when visiting #settings', () => {
    const container = document.createElement('div');
    window.location.hash = '#settings';
    mountSettings(container);
    expect(document.querySelector('.modal-overlay')).toBeTruthy();
    document.querySelector('.modal-overlay')?.remove();

    window.location.hash = '#flashcards';
    mountSettings(container);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });
});
