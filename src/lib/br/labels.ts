import type { ContentsKey, Price, ProductType, Slot, Style } from './types';

export const TYPE_LABELS: Record<ProductType, string> = {
  'starter-set': 'Starter Set',
  'booster-set': 'Booster Set',
  tool: 'Tool',
};

export const STYLE_LABELS: Record<Style, string> = {
  upper: 'Upper',
  spin: 'Spin',
  dash: 'Dash',
};

export const SLOT_LABELS: Record<Slot, string> = {
  cowl: 'Cowl',
  bumper: 'Bumper',
  tire: 'Tire',
  chassis: 'Chassis',
};

export const SLOT_HEADINGS: Record<Slot, string> = {
  cowl: 'Cowls',
  bumper: 'Bumpers',
  tire: 'Tires',
  chassis: 'Chassis',
};

export const CONTENTS_LABELS: Record<ContentsKey, string> = {
  ...SLOT_LABELS,
  charger: 'Ride Charger',
  sticker: 'Sticker sheet',
  body: 'Main unit',
};

export function formatPrice(price: Price): string {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
  }).format(price.amount);
  return price.taxIncluded ? `${amount} incl. tax` : amount;
}

/** `2026-09-19` → `Sep 19, 2026`, without shifting across time zones. */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
