import { describe, it, expect } from 'vitest';
import { GAMES } from '@/lib/games';
import { BR_BASE, brRoutes } from './routes';

describe('brRoutes', () => {
  it('shares its base with the game registry', () => {
    expect(BR_BASE).toBe(GAMES.find((g) => g.id === 'br')?.path);
  });

  it('builds the catalog paths', () => {
    expect(brRoutes.catalog).toBe('/baraba-ride/catalog');
    expect(brRoutes.product('BR-01')).toBe('/baraba-ride/catalog/products/BR-01');
    expect(brRoutes.parts).toBe('/baraba-ride/catalog/parts');
  });

  it('escapes a product code that is not path-safe', () => {
    expect(brRoutes.product('a/b')).toBe('/baraba-ride/catalog/products/a%2Fb');
  });

  it('builds the inventory and builds paths', () => {
    expect(brRoutes.inventory).toBe('/baraba-ride/inventory');
    expect(brRoutes.purchases).toBe('/baraba-ride/inventory/purchases');
    expect(brRoutes.builds).toBe('/baraba-ride/builds');
  });
});
