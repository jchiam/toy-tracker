import { describe, it, expect } from 'vitest';
import { GAMES } from '@/lib/games';

describe('GAMES registry', () => {
  it('contains the tracked toy lines', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['br']);
  });

  it('exposes expected routes', () => {
    expect(GAMES.find((g) => g.id === 'br')?.path).toBe('/baraba-ride');
  });

  it('provides required display fields on every entry', () => {
    for (const game of GAMES) {
      expect(game.name).toBeTruthy();
      expect(game.publisher).toBeTruthy();
      expect(game.description).toBeTruthy();
      expect(game.bgClass).toBe(`bg-${game.id}-sel`);
      expect(game.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(game.icon).toBe(`/assets/icons/${game.id}-icon.webp`);
    }
  });
});
