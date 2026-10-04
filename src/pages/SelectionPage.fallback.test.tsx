import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { SelectionPage } from './SelectionPage';

vi.mock('@/lib/games', () => ({
  GAMES: [
    {
      id: 'br',
      name: 'Baraba Ride',
      path: '/baraba-ride',
      publisher: 'Bandai',
      description: 'Test description.',
      accent: '#ff5a1f',
      coverImage: '/assets/baraba-ride/missing-cover.webp',
      bgClass: 'bg-br-sel',
      Page: () => null,
    },
  ],
}));

const mockSession = {
  user: { id: 'test-user-123', email: 'test@example.com' },
} as unknown as Session;

afterEach(cleanup);

describe('SelectionPage image fallback', () => {
  it('hides a failed cover image and keeps the card functional', () => {
    render(
      <MemoryRouter>
        <SelectionPage session={mockSession} isAuthLoading={false} signInWithGoogle={vi.fn()} />
      </MemoryRouter>,
    );

    const img = document.querySelector('img.game-cover-image');
    expect(img).not.toBeNull();
    fireEvent.error(img!);

    expect(document.querySelector('img.game-cover-image')).toBeNull();
    const card = screen.getByRole('button', { name: /Baraba Ride/ });
    expect(card).toBeEnabled();
    expect(screen.getByText('Bandai')).toBeInTheDocument();
    expect(screen.getByText(/©BANDAI/)).toBeInTheDocument();
  });
});
