-- Baraba Ride builds: a named machine of seven positions that is either a
-- plan (names parts, claims nothing) or built (each position holds one
-- br_instances row). Ownership hangs off user_profiles(id) through br_builds.
--
-- Manual checklist, run against the dev project after pushing. "A" owns the
-- rows; "B" is a second signed-in user. Expected outcome follows each arrow.
--   1. As B, select A's br_builds and br_build_parts          -> no rows
--   2. As B, insert a br_build_parts row for A's build        -> RLS violation
--   3. As B, claim one of A's instances in B's own build      -> "is not available"
--   4. Claim a retired instance                               -> "is not active"
--   5. Claim an instance whose item_id differs from the row   -> "is not the part"
--   6. Claim an instance another build already holds          -> unique violation
--   7. Retire a claimed instance                              -> "is in a build"
--   8. Delete a claimed instance                              -> foreign key violation
--   9. Delete a purchase one of whose instances is claimed    -> foreign key violation,
--      purchase and all its instances still present
--  10. br_mark_built with one already-claimed instance        -> raises; build still
--      'plan', every instance_id of that build still null
--  11. br_mark_built on a plan with an empty position         -> raises
--  12. br_take_apart on a built build                         -> status 'plan', seven
--      rows kept with instance_id null
--  13. Delete a profile that has a built build                -> succeeds; builds,
--      parts and instances all gone

CREATE TABLE br_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  status TEXT NOT NULL DEFAULT 'plan' CHECK (status IN ('plan', 'built')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX br_builds_profile_id_idx ON br_builds (profile_id);

-- An absent row is an empty position. A row with instance_id null is a plan
-- wish; a row with instance_id set is a claim, and then item_id and
-- variant_product_code are the instance's own. The instance foreign key has no
-- delete action, so deleting a claimed instance fails. It is deferred to commit
-- because a profile delete cascades to the instances before it reaches the
-- build parts that reference them; checked any earlier, that delete would fail.
CREATE TABLE br_build_parts (
  build_id UUID NOT NULL REFERENCES br_builds(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (
    position IN ('bumper', 'cowl', 'chassis', 'tire_fl', 'tire_fr', 'tire_rl', 'tire_rr')
  ),
  item_id TEXT NOT NULL,
  variant_product_code TEXT,
  instance_id UUID REFERENCES br_instances(id) DEFERRABLE INITIALLY DEFERRED,
  PRIMARY KEY (build_id, position),
  CONSTRAINT br_build_parts_slot_check CHECK (
    split_part(item_id, ':', 1) = CASE WHEN position LIKE 'tire\_%' THEN 'tire' ELSE position END
  )
);

-- One physical item is in at most one build.
CREATE UNIQUE INDEX br_build_parts_instance_id_key
  ON br_build_parts (instance_id)
  WHERE instance_id IS NOT NULL;

ALTER TABLE br_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_build_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own builds"
  ON br_builds FOR SELECT
  USING (profile_id = auth.uid()::text);

CREATE POLICY "Users can insert own builds"
  ON br_builds FOR INSERT
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "Users can update own builds"
  ON br_builds FOR UPDATE
  USING (profile_id = auth.uid()::text)
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "Users can delete own builds"
  ON br_builds FOR DELETE
  USING (profile_id = auth.uid()::text);

-- br_build_parts has no profile_id of its own; it is owned through its build.
CREATE POLICY "Users can view own build parts"
  ON br_build_parts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM br_builds b WHERE b.id = build_id AND b.profile_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own build parts"
  ON br_build_parts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM br_builds b WHERE b.id = build_id AND b.profile_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own build parts"
  ON br_build_parts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM br_builds b WHERE b.id = build_id AND b.profile_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM br_builds b WHERE b.id = build_id AND b.profile_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own build parts"
  ON br_build_parts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM br_builds b WHERE b.id = build_id AND b.profile_id = auth.uid()::text
    )
  );

-- A claim must name an active instance of the row's own part. The lookup runs
-- as the caller, so RLS hides other users' instances and they read as missing.
CREATE FUNCTION br_build_parts_check_claim() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  claimed br_instances%ROWTYPE;
BEGIN
  IF NEW.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO claimed FROM br_instances WHERE id = NEW.instance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item % is not available', NEW.instance_id;
  END IF;
  IF claimed.status <> 'active' THEN
    RAISE EXCEPTION 'item % is not active', NEW.instance_id;
  END IF;
  IF claimed.item_id <> NEW.item_id THEN
    RAISE EXCEPTION 'item % is not the part in position %', NEW.instance_id, NEW.position;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER br_build_parts_check_claim
  BEFORE INSERT OR UPDATE ON br_build_parts
  FOR EACH ROW EXECUTE FUNCTION br_build_parts_check_claim();

-- A claimed instance cannot be retired; it has to leave its build first.
CREATE FUNCTION br_instances_block_retire_in_build() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'retired'
    AND EXISTS (SELECT 1 FROM br_build_parts WHERE instance_id = NEW.id)
  THEN
    RAISE EXCEPTION 'item % is in a build', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER br_instances_block_retire_in_build
  BEFORE UPDATE OF status ON br_instances
  FOR EACH ROW EXECUTE FUNCTION br_instances_block_retire_in_build();

-- Marks a plan built in one transaction. p_claims maps each of the seven
-- positions to the instance that fills it. Each instance must be the part its
-- position names, and its source product when the position names one; the
-- position then takes the instance's own source product.
CREATE FUNCTION br_mark_built(p_build_id UUID, p_claims JSONB) RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  positions CONSTANT TEXT[] :=
    ARRAY['bumper', 'cowl', 'chassis', 'tire_fl', 'tire_fr', 'tire_rl', 'tire_rr'];
  pos TEXT;
BEGIN
  PERFORM 1 FROM br_builds WHERE id = p_build_id AND status = 'plan' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'build % is not a plan', p_build_id;
  END IF;

  IF jsonb_typeof(p_claims) IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(p_claims)) <> 7
    OR NOT p_claims ?& positions
  THEN
    RAISE EXCEPTION 'claims must name all seven positions';
  END IF;

  FOREACH pos IN ARRAY positions LOOP
    UPDATE br_build_parts bp
      SET instance_id = i.id,
          variant_product_code = i.variant_product_code
      FROM br_instances i
      WHERE bp.build_id = p_build_id
        AND bp.position = pos
        AND i.id = (p_claims ->> pos)::uuid
        AND i.item_id = bp.item_id
        AND (bp.variant_product_code IS NULL
          OR bp.variant_product_code = i.variant_product_code);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'position % cannot be filled by the chosen item', pos;
    END IF;
  END LOOP;

  UPDATE br_builds
    SET status = 'built', updated_at = timezone('utc'::text, now())
    WHERE id = p_build_id;
END;
$$;

-- Returns a built build to a plan and frees its instances. Each position keeps
-- the part and source product of the instance it held.
CREATE FUNCTION br_take_apart(p_build_id UUID) RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM br_builds WHERE id = p_build_id AND status = 'built' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'build % is not built', p_build_id;
  END IF;

  UPDATE br_build_parts SET instance_id = NULL WHERE build_id = p_build_id;
  UPDATE br_builds
    SET status = 'plan', updated_at = timezone('utc'::text, now())
    WHERE id = p_build_id;
END;
$$;

-- Signed-in users only. Supabase grants new public functions to anon by
-- default, so that grant is revoked by name as well.
REVOKE ALL ON FUNCTION br_mark_built(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION br_take_apart(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION br_mark_built(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION br_take_apart(UUID) TO authenticated;
