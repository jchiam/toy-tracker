import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ensureProfile } from '@/services/profile';
import { resolveProductContents } from '@/lib/br/catalog';
import {
  instanceFromRow,
  purchaseFromRow,
  type Instance,
  type InstanceRow,
  type InstanceStatus,
  type NewInstance,
  type Purchase,
  type PurchaseRow,
} from '@/lib/br/inventory-types';

const PURCHASE_COLUMNS = 'id, profile_id, product_code, acquired_at, note, created_at';
const INSTANCE_COLUMNS =
  'id, profile_id, item_id, variant_product_code, purchase_id, status, condition, note, created_at, updated_at';

function fail(action: string, message: string): never {
  throw new Error(`Could not ${action}: ${message}`);
}

export async function listPurchases(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Purchase[]> {
  const { data, error } = await client
    .from('br_purchases')
    .select(PURCHASE_COLUMNS)
    .eq('profile_id', userId)
    .order('acquired_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) fail('load purchases', error.message);
  return (data as PurchaseRow[]).map(purchaseFromRow);
}

export async function listInstances(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Instance[]> {
  const { data, error } = await client
    .from('br_instances')
    .select(INSTANCE_COLUMNS)
    .eq('profile_id', userId)
    .order('created_at', { ascending: true });
  if (error) fail('load inventory', error.message);
  return (data as InstanceRow[]).map(instanceFromRow);
}

export interface RecordPurchaseInput {
  productCode: string;
  /** ISO date, `YYYY-MM-DD`. */
  acquiredAt: string;
  note?: string;
}

/**
 * Records a purchase and expands the product's mapped contents into one
 * instance per unit. Not atomic: if the instances cannot be written the
 * purchase is deleted again and the error surfaces.
 */
export async function recordPurchase(
  userId: string,
  input: RecordPurchaseInput,
  client: SupabaseClient = supabase,
): Promise<Purchase> {
  const contents = resolveProductContents(input.productCode);
  if (!contents) fail('record purchase', `${input.productCode} has no contents mapping`);

  await ensureProfile(userId, client);

  const { data, error } = await client
    .from('br_purchases')
    .insert({
      profile_id: userId,
      product_code: input.productCode,
      acquired_at: input.acquiredAt,
      note: input.note ?? '',
    })
    .select(PURCHASE_COLUMNS)
    .single();
  if (error) fail('record purchase', error.message);
  const purchase = purchaseFromRow(data as PurchaseRow);

  const rows = contents.flatMap(({ item, quantity }) =>
    Array.from({ length: quantity }, () => ({
      profile_id: userId,
      item_id: item.kind === 'part' ? item.part.id : item.accessory.id,
      variant_product_code: input.productCode,
      purchase_id: purchase.id,
    })),
  );
  if (rows.length > 0) {
    const { error: instanceError } = await client.from('br_instances').insert(rows);
    if (instanceError) {
      await client.from('br_purchases').delete().eq('id', purchase.id);
      fail('record purchase', instanceError.message);
    }
  }
  return purchase;
}

/** Adds `quantity` standalone instances of one item. */
export async function addInstances(
  userId: string,
  item: NewInstance,
  quantity: number,
  client: SupabaseClient = supabase,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1) fail('add items', 'quantity must be at least 1');
  await ensureProfile(userId, client);
  const rows = Array.from({ length: quantity }, () => ({
    profile_id: userId,
    item_id: item.itemId,
    variant_product_code: item.variantProductCode,
  }));
  const { error } = await client.from('br_instances').insert(rows);
  if (error) fail('add items', error.message);
}

export async function setInstanceStatus(
  instanceId: string,
  status: InstanceStatus,
  note: string | undefined,
  client: SupabaseClient = supabase,
): Promise<void> {
  const patch: Partial<InstanceRow> = { status, updated_at: new Date().toISOString() };
  if (note !== undefined) patch.note = note;
  const { error } = await client.from('br_instances').update(patch).eq('id', instanceId);
  if (error) fail(status === 'retired' ? 'retire item' : 'reactivate item', error.message);
}

export async function updateInstanceNote(
  instanceId: string,
  note: string,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client
    .from('br_instances')
    .update({ note, updated_at: new Date().toISOString() })
    .eq('id', instanceId);
  if (error) fail('update note', error.message);
}

export async function deleteInstance(
  instanceId: string,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client.from('br_instances').delete().eq('id', instanceId);
  if (error) fail('delete item', error.message);
}

/** Deletes a purchase; the database cascades to its instances. */
export async function deletePurchase(
  purchaseId: string,
  client: SupabaseClient = supabase,
): Promise<void> {
  const { error } = await client.from('br_purchases').delete().eq('id', purchaseId);
  if (error) fail('delete purchase', error.message);
}
