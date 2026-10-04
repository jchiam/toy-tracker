import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { BrPage } from './BrPage';

const mockSession = {
  user: { id: 'test-user-123', email: 'test@example.com' },
} as unknown as Session;

function renderAt(
  path: string,
  {
    session = mockSession,
    isAuthLoading = false,
  }: { session?: Session | null; isAuthLoading?: boolean } = {},
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BrPage session={session} isAuthLoading={isAuthLoading} onSignIn={vi.fn()} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('BrPage', () => {
  it('shows the auth gate when signed out', () => {
    renderAt('/baraba-ride', { session: null });
    expect(screen.getByRole('heading', { name: 'Welcome to the Toy Zone' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Products' })).toBeNull();
  });

  it('shows a loading message while auth is resolving', () => {
    renderAt('/baraba-ride', { session: null, isAuthLoading: true });
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
  });

  it('shows the product catalog by default', () => {
    renderAt('/baraba-ride');
    expect(screen.getByRole('heading', { level: 1, name: 'Baraba Ride' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens a product from the list and returns to it', async () => {
    const user = userEvent.setup();
    renderAt('/baraba-ride');
    await user.click(screen.getByRole('link', { name: /BR-03/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Fury Lizard' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Named parts' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /All products/ }));
    expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
  });

  it('shows the parts view and links from a part to its product', async () => {
    const user = userEvent.setup();
    renderAt('/baraba-ride');
    await user.click(screen.getByRole('link', { name: 'Parts' }));
    expect(screen.getByRole('region', { name: 'Parts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parts' })).toHaveAttribute('aria-current', 'page');

    const sources = screen.getByRole('list', { name: 'Dual Blade found in' });
    await user.click(within(sources).getByRole('link', { name: 'BR-08 Stallion Kit' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Stallion Kit' })).toBeInTheDocument();
  });

  it('falls back to the list for an unknown product code', () => {
    renderAt('/baraba-ride?product=BR-99');
    expect(screen.getByText('No product with code BR-99.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument();
  });
});
