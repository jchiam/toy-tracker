/** Baraba Ride base path. Must equal the `br` entry's `path` in the game registry. */
export const BR_BASE = '/baraba-ride';

/** Absolute paths of the Baraba Ride views. Link with these, never with string literals. */
export const brRoutes = {
  catalog: `${BR_BASE}/catalog`,
  product: (code: string) => `${BR_BASE}/catalog/products/${encodeURIComponent(code)}`,
  parts: `${BR_BASE}/catalog/parts`,
  inventory: `${BR_BASE}/inventory`,
  purchases: `${BR_BASE}/inventory/purchases`,
  builds: `${BR_BASE}/builds`,
};
