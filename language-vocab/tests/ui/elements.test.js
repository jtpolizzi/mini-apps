import { describe, it, expect } from 'vitest';
import { createChip, createIconChip } from '../../assets/components/ui/elements.js';

describe('ui/elements helpers', () => {
  it('creates a chip with label and pressed state', () => {
    const onClick = vi.fn();
    const chip = createChip('Test', { pressed: true, onClick });
    expect(chip.className).toContain('chip');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    chip.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('creates an icon chip with accessible label', () => {
    const chip = createIconChip('⚙︎', 'Settings');
    expect(chip.className).toContain('chip--icon');
    expect(chip.getAttribute('aria-label')).toBe('Settings');
    expect(chip.textContent?.includes('⚙︎')).toBe(true);
  });
});
