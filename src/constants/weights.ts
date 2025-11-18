export type WeightValue = 1 | 2 | 3 | 4 | 5;

export const WEIGHT_DESCRIPTIONS: Record<WeightValue, string> = {
  1: 'Hide almost completely',
  2: 'Show rarely',
  3: 'Default cadence',
  4: 'Show more often',
  5: 'Show constantly'
};

export const WEIGHT_SHORT_LABELS: Record<WeightValue, string> = {
  1: 'Hide',
  2: 'Rare',
  3: 'Default',
  4: 'More',
  5: 'Max'
};
