import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { SelectionPage } from './SelectionPage';
import { GAMES } from '@/lib/games';

const mockSession = {
  user: { id: 'test-user-123', email: 'test@example.com' },
} as unknown as Session;

function renderPage({
  session = mockSession,
  isAuthLoading = false,
  signInWithGoogle = vi.fn(),
}: {
  session?: Session | null;
  isAuthLoading?: boolean;
  signInWithGoogle?: (path: string) => void;
} = {}) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <SelectionPage
              session={session}
              isAuthLoading={isAuthLoading}
              signInWithGoogle={signInWithGoogle}
            />
          }
        />
        {GAMES.map((game) => (
          <Route key={game.id} path={game.path} element={<h1>{game.name} page</h1>} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('SelectionPage', () => {
  it('renders hero and one card per registry entry', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'The JonZone Toy Zone' })).toBeInTheDocument();
    for (const game of GAMES) {
      expect(screen.getByRole('heading', { name: game.name })).toBeInTheDocument();
      expect(screen.getByText(game.publisher)).toBeInTheDocument();
      expect(screen.getByText(game.description)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(GAMES.length);
  });

  it('navigates to a game page when its card is clicked while signed in', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: new RegExp(GAMES[0].name) }));
    expect(screen.getByRole('heading', { name: `${GAMES[0].name} page` })).toBeInTheDocument();
  });

  it('cards are keyboard activatable', async () => {
    const user = userEvent.setup();
    renderPage();
    const card = screen.getByRole('button', { name: new RegExp(GAMES[0].name) });
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: `${GAMES[0].name} page` })).toBeInTheDocument();
  });

  it('renders each cover image from the registry', () => {
    renderPage();
    const imgs = [...document.querySelectorAll('img.game-cover-image')];
    expect(imgs.map((img) => img.getAttribute('src'))).toEqual(
      GAMES.filter((g) => g.coverImage).map((g) => g.coverImage),
    );
  });

  it('shows the licensing attribution footer', () => {
    renderPage();
    expect(screen.getByText(/©BANDAI/)).toBeInTheDocument();
  });

  it('shows a checking-authentication message while auth is loading', () => {
    renderPage({ isAuthLoading: true });
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows a Requires Login badge on every card when signed out', () => {
    renderPage({ session: null });
    expect(screen.getAllByText('Requires Login')).toHaveLength(GAMES.length);
  });

  it('hides the Requires Login badge when signed in', () => {
    renderPage();
    expect(screen.queryByText('Requires Login')).toBeNull();
  });

  it('starts Google sign-in with the game path when a card is clicked while signed out', async () => {
    const user = userEvent.setup();
    const signInWithGoogle = vi.fn();
    renderPage({ session: null, signInWithGoogle });

    await user.click(screen.getByRole('button', { name: new RegExp(GAMES[0].name) }));

    expect(signInWithGoogle).toHaveBeenCalledWith(GAMES[0].path);
    expect(screen.queryByRole('heading', { name: `${GAMES[0].name} page` })).toBeNull();
  });
});
