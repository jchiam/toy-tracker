import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Makes sure the user's `user_profiles` row exists. Profile rows are created
 * lazily on first write, never by a signup trigger, so every per-game write
 * calls this first. Existing rows are left untouched.
 */
export async function ensureProfile(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('user_profiles')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw new Error(`Could not create profile: ${error.message}`);
}
