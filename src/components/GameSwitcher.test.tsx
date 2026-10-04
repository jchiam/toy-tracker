import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { GameSwitcher } from './GameSwitcher';
import { GAMES } from '@/lib/games';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GameSwitcher />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('GameSwitcher', () => {
  it('is hidden on the landing page', () => {
    renderAt('/');
    expect(screen.queryByRole('button', { name: 'Switch Game' })).toBeNull();
  });

  it('lists every game with an icon when opened', async () => {
    const user = userEvent.setup();
    renderAt('/baraba-ride');
    await user.click(screen.getByRole('button', { name: 'Switch Game' }));
    for (const game of GAMES) {
      const item = screen.getByRole('link', { name: new RegExp(game.name) });
      expect(item).toHaveAttribute('href', game.path);
      expect(item.querySelector('img')).toHaveAttribute('src', game.icon);
    }
  });

  it('navigates and closes when a game is selected', async () => {
    const user = userEvent.setup();
    renderAt('/somewhere-else');
    await user.click(screen.getByRole('button', { name: 'Switch Game' }));
    await user.click(screen.getByRole('link', { name: new RegExp(GAMES[0].name) }));
    expect(screen.getByTestId('location')).toHaveTextContent(GAMES[0].path);
    expect(screen.queryByText('Switch Game')).toBeNull();
  });

  it('offers Back to Selection', async () => {
    const user = userEvent.setup();
    renderAt('/baraba-ride');
    await user.click(screen.getByRole('button', { name: 'Switch Game' }));
    await user.click(screen.getByRole('link', { name: 'Back to Selection' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('closes on outside click without navigating', async () => {
    const user = userEvent.setup();
    renderAt('/baraba-ride');
    await user.click(screen.getByRole('button', { name: 'Switch Game' }));
    expect(screen.getByText('Switch Game')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Switch Game')).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/baraba-ride');
  });
});
