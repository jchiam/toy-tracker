import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refresh tokens before expiry
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session changes across browser tabs
    detectSessionInUrl: true,
  },
  global: {
    // Abort requests after 10 seconds to prevent hanging requests
    fetch: (...args) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const [url, init] = args;
      return fetch(url, { ...init, signal: controller.signal }).finally(() =>
        clearTimeout(timeout),
      );
    },
  },
});
