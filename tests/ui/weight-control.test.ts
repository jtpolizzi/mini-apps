import { describe, it, expect, vi } from 'vitest';
import {
  clampWeight,
  createWeightControl,
  WEIGHT_DESCRIPTIONS
} from '../../assets/components/WeightControl.ts';

describe('WeightControl', () => {
  it('clamps values into the allowed range', () => {
    expect(clampWeight(10)).toBe(5);
    expect(clampWeight(-3)).toBe(1);
    expect(clampWeight('2')).toBe(2);
  });

  it('invokes onChange when buttons adjust the current value', () => {
    const handleChange = vi.fn();
    const control = createWeightControl({ value: 3, onChange: handleChange });
    const buttons = control.querySelectorAll('button');
    const minus = buttons[0];
    const plus = buttons[1];

    plus.click();
    minus.click();
    minus.click();

    expect(handleChange).toHaveBeenCalledWith(4);
    expect(handleChange).toHaveBeenCalledWith(3);
    expect(handleChange).toHaveBeenCalledWith(2);
    expect((control.dataset.value || '')).toBe('2');
    const core = control.querySelector('.weight-spark__core') as HTMLElement;
    expect(core.title).toBe(WEIGHT_DESCRIPTIONS[2]);
  });
});
