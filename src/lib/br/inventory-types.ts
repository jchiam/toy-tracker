/** Rows of the Baraba Ride inventory tables, as the app reads them. */

export type InstanceStatus = 'active' | 'retired';

/** Reserved for condition tracking; no flow sets it yet. */
export type Condition = 'mint' | 'used' | 'worn';

/** One recorded purchase of a catalogued product. */
export interface Purchase {
  id: string;
  profileId: string;
  productCode: string;
  /** ISO date, `YYYY-MM-DD`. */
  acquiredAt: string;
  note: string;
  createdAt: string;
}

/** One physical item the user owns. */
export interface Instance {
  id: string;
  profileId: string;
  /** Part id (`cowl:…`) or accessory id (`charger:…`). */
  itemId: string;
  /** Product the item came from, when known. */
  variantProductCode: string | null;
  /** Purchase it was expanded from, when any. */
  purchaseId: string | null;
  status: InstanceStatus;
  condition: Condition | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/** What the user supplies when adding instances outside a purchase. */
export interface NewInstance {
  itemId: string;
  variantProductCode: string | null;
}

/** Database column shapes, snake_case as PostgREST returns them. */
export interface PurchaseRow {
  id: string;
  profile_id: string;
  product_code: string;
  acquired_at: string;
  note: string;
  created_at: string;
}

export interface InstanceRow {
  id: string;
  profile_id: string;
  item_id: string;
  variant_product_code: string | null;
  purchase_id: string | null;
  status: InstanceStatus;
  condition: Condition | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export function purchaseFromRow(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    profileId: row.profile_id,
    productCode: row.product_code,
    acquiredAt: row.acquired_at,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function instanceFromRow(row: InstanceRow): Instance {
  return {
    id: row.id,
    profileId: row.profile_id,
    itemId: row.item_id,
    variantProductCode: row.variant_product_code,
    purchaseId: row.purchase_id,
    status: row.status,
    condition: row.condition,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
