import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import * as supabaseModule from '@/lib/supabase';
import App from './App';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const mockGetSession = vi.mocked(supabaseModule.supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabaseModule.supabase.auth.onAuthStateChange);
const mockSignInWithOAuth = vi.mocked(supabaseModule.supabase.auth.signInWithOAuth);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { id: 'test-sub', callback: vi.fn(), unsubscribe: vi.fn() } },
  } as ReturnType<typeof supabaseModule.supabase.auth.onAuthStateChange>);
});

describe('App', () => {
  it('renders the landing page at / once auth resolves', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'The JonZone Toy Zone' })).toBeInTheDocument();
    });
  });

  it('shows the navbar sign-in button when signed out', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In with Google' })).toBeInTheDocument();
    });
  });

  it.each(['/baraba-ride/builds/abc', '/baraba-ride?product=BR-01'])(
    'starts sign-in from the gate at %s returning to that address',
    async (address) => {
      render(
        <MemoryRouter initialEntries={[address]}>
          <App />
        </MemoryRouter>,
      );
      const gate = await screen.findByRole('heading', { name: 'Welcome to the Toy Zone' });
      await userEvent.click(
        within(gate.parentElement!).getByRole('button', { name: 'Sign In with Google' }),
      );
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${address}` },
      });
    },
  );
});
