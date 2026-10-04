import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as supabaseModule from '@/lib/supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

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
const mockSignOut = vi.mocked(supabaseModule.supabase.auth.signOut);

const mockSession: Session = {
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    phone: '',
    confirmation_sent_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

function mockSubscription() {
  const unsubscribe = vi.fn();
  return {
    data: { subscription: { id: 'test-sub', callback: vi.fn(), unsubscribe } },
  } as ReturnType<typeof supabaseModule.supabase.auth.onAuthStateChange>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue(mockSubscription());
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://oauth.example.com' },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  describe('initialization', () => {
    it('starts with loading state and no session', () => {
      mockGetSession.mockImplementation(
        () => new Promise(() => {}), // Never resolves to simulate loading
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthLoading).toBe(true);
      expect(result.current.session).toBeNull();
    });

    it('loads session on mount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthLoading).toBe(false);
      });

      expect(result.current.session).toBe(mockSession);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it('handles null session on mount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthLoading).toBe(false);
      });

      expect(result.current.session).toBeNull();
    });

    it('subscribes to auth state changes on mount', async () => {
      renderHook(() => useAuth());

      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes on unmount', async () => {
      const unsubscribe = vi.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { id: 'test-sub', callback: vi.fn(), unsubscribe } },
      } as ReturnType<typeof supabaseModule.supabase.auth.onAuthStateChange>);

      const { unmount } = renderHook(() => useAuth());
      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('auth state changes', () => {
    it('updates session when auth state changes', async () => {
      let authListener: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authListener = callback;
        return mockSubscription();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthLoading).toBe(false);
      });

      authListener!('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(result.current.session).toBe(mockSession);
        expect(result.current.isAuthLoading).toBe(false);
      });
    });

    it('clears session on sign out event', async () => {
      let authListener: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authListener = callback;
        return mockSubscription();
      });
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.session).toBe(mockSession);
      });

      authListener!('SIGNED_OUT', null);

      await waitFor(() => {
        expect(result.current.session).toBeNull();
      });
    });
  });

  describe('signInWithGoogle', () => {
    it('calls Supabase OAuth with default redirect', async () => {
      const { result } = renderHook(() => useAuth());

      await result.current.signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
    });

    it('calls Supabase OAuth with custom redirect path', async () => {
      const { result } = renderHook(() => useAuth());

      await result.current.signInWithGoogle('/baraba-ride');

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/baraba-ride`,
        },
      });
    });
  });

  describe('signOut', () => {
    it('calls Supabase signOut', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const { result } = renderHook(() => useAuth());

      await result.current.signOut();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
