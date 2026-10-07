import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureProfile } from '@/services/profile';
import {
  buildFromRow,
  type Assignment,
  type Build,
  type BuildRow,
  type PlanPart,
  type Position,
} from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';

const BUILD_COLUMNS = 'id, profile_id, name, status, note, created_at, updated_at';
const PART_COLUMNS = 'position, item_id, variant_product_code, instance_id';

function fail(action: string, message: string): never {
  throw new Error(`Could not ${action}: ${message}`);
}

/** Every build of the user with its filled positions, oldest first. */
export async function listBuilds(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Build[]> {
  const { data, error } = await client
    .from('br_builds')
    .select(`${BUILD_COLUMNS}, br_build_parts(${PART_COLUMNS})`)
    .eq('profile_id', userId)
    .order('created_at', { ascending: true });
  if (error) fail('load builds', error.message);
  return (data as BuildRow[]).map(buildFromRow);
}

/** Creates an empty plan. */
export async function createBuild(
  userId: string,
  name: string,
  client: SupabaseClient = supabase,
): Promise<Build> {
  await ensureProfile(userId, client);
  const { data, error } = await client
    .from('br_builds')
    .insert({ profile_id: userId, name: name.trim() })
    .select(BUILD_COLUMNS)
    .single();
  if (error) fail('create build', error.message);
  return buildFromRow(data as BuildRow);
}

export interface BuildPatch {
  name?: string;
  note?: string;
}

export async function updateBuild(
  buildId: string,
  patch: BuildPatch,
  client: SupabaseClient = supabase,
): Promise<void> {
  const row: Partial<BuildRow> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.note !== undefined) row.note = patch.note;
  const { error } = await client.from('br_builds').update(row).eq('id', buildId);
  if (error) fail('update build', error.message);
}

/** Deletes a build; the database cascades to its positions, freeing any claimed instances. */
export async function deleteBuild(
  buildId: string,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client.from('br_builds').delete().eq('id', buildId);
  if (error) fail('delete build', error.message);
}

/**
 * Sets one or more positions of a plan in a single request. Plan writes never
 * send `instance_id`, so a plan claims nothing.
 */
export async function setPlanPositions(
  buildId: string,
  parts: PlanPart[],
  client: SupabaseClient = supabase,
): Promise<void> {
  const rows = parts.map((part) => ({
    build_id: buildId,
    position: part.position,
    item_id: part.itemId,
    variant_product_code: part.variantProductCode,
  }));
  const { error } = await client
    .from('br_build_parts')
    .upsert(rows, { onConflict: 'build_id,position' });
  if (error) fail('set position', error.message);
}

export async function clearPlanPosition(
  buildId: string,
  position: Position,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('br_build_parts')
    .delete()
    .eq('build_id', buildId)
    .eq('position', position);
  if (error) fail('clear position', error.message);
}

/**
 * Replaces the instance in one position of a built build. The position takes
 * the new instance's part and source product in the same write.
 */
export async function swapBuiltPosition(
  buildId: string,
  position: Position,
  instance: Pick<Instance, 'id' | 'itemId' | 'variantProductCode'>,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('br_build_parts')
    .update({
      instance_id: instance.id,
      item_id: instance.itemId,
      variant_product_code: instance.variantProductCode,
    })
    .eq('build_id', buildId)
    .eq('position', position);
  if (error) fail('swap part', error.message);
}

/** Marks a plan built, claiming one instance per position. Atomic in the database. */
export async function markBuilt(
  buildId: string,
  claims: Assignment,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client.rpc('br_mark_built', { p_build_id: buildId, p_claims: claims });
  if (error) fail('mark built', error.message);
}

/** Returns a built build to a plan and frees its instances. Atomic in the database. */
export async function takeApart(buildId: string, client: SupabaseClient = supabase): Promise<void> {
  const { error } = await client.rpc('br_take_apart', { p_build_id: buildId });
  if (error) fail('take apart', error.message);
}
