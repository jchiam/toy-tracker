-- User profiles keyed by the Supabase auth user id (stored as TEXT).
-- Rows are created lazily by the app (upsert on first write), not by a
-- signup trigger. Future per-game tables reference profile_id -> user_profiles(id)
-- and must scope their RLS policies with auth.uid()::text the same way.

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid()::text);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (id = auth.uid()::text);
