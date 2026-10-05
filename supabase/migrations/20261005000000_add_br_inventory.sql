-- Baraba Ride inventory: one row per physical item the user owns.
-- Both tables hang off user_profiles(id) and scope RLS with auth.uid()::text,
-- mirroring the user_profiles policies. Item ids (`cowl:…`, `charger:…`) refer
-- to the static catalog JSON in the app and are not foreign keys.

CREATE TABLE br_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  acquired_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX br_purchases_profile_id_idx ON br_purchases (profile_id);

CREATE TABLE br_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  variant_product_code TEXT,
  purchase_id UUID REFERENCES br_purchases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  condition TEXT CHECK (condition IN ('mint', 'used', 'worn')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX br_instances_profile_id_idx ON br_instances (profile_id);
CREATE INDEX br_instances_purchase_id_idx ON br_instances (purchase_id);

ALTER TABLE br_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON br_purchases FOR SELECT
  USING (profile_id = auth.uid()::text);

CREATE POLICY "Users can insert own purchases"
  ON br_purchases FOR INSERT
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "Users can update own purchases"
  ON br_purchases FOR UPDATE
  USING (profile_id = auth.uid()::text)
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "Users can delete own purchases"
  ON br_purchases FOR DELETE
  USING (profile_id = auth.uid()::text);

CREATE POLICY "Users can view own instances"
  ON br_instances FOR SELECT
  USING (profile_id = auth.uid()::text);

CREATE POLICY "Users can insert own instances"
  ON br_instances FOR INSERT
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "Users can update own instances"
  ON br_instances FOR UPDATE
  USING (profile_id = auth.uid()::text)
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "Users can delete own instances"
  ON br_instances FOR DELETE
  USING (profile_id = auth.uid()::text);
