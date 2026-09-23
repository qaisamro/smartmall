export type KnownStoreType = 'supermarket' | 'mall' | 'grocery' | 'butcher';
export type StoreType = KnownStoreType | (string & {});

export type KnownProductUnit =
  | 'piece'
  | 'kg'
  | 'gram'
  | 'liter'
  | 'pack'
  | 'box'
  | 'bundle'
  | 'bunch';
export type ProductUnit = KnownProductUnit | (string & {});

export type KnownPricingType = 'fixed' | 'per_unit' | 'per_weight';
export type PricingType = KnownPricingType | (string & {});

export interface ProductOptions {
  weight?: number | string | null;
  unit?: ProductUnit | null;
  cut?: string | null;
  preparation?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export function normalizeStoreType(value: unknown): KnownStoreType | null {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'mall' || normalized === 'shopping_mall' || normalized === 'shopping_center') {
    return 'mall';
  }
  if (normalized === 'supermarket' || normalized === 'super_market') {
    return 'supermarket';
  }
  if (normalized === 'grocery' || normalized === 'grocery_store' || normalized === 'fruit_vegetable') {
    return 'grocery';
  }
  if (normalized === 'butcher' || normalized === 'butcher_shop' || normalized === 'meat_store') {
    return 'butcher';
  }

  return null;
}

/**
 * The legacy API stores grocery/butcher as supermarket and keeps the specific
 * type in the encoded description field. Prefer the explicit API type when it
 * is already decoded, then fall back to that legacy metadata.
 */
export function resolveStoreType(value: unknown, encodedDescription?: unknown): KnownStoreType | null {
  const directType = normalizeStoreType(value);
  if (directType && directType !== 'supermarket') return directType;

  if (typeof encodedDescription === 'string' && encodedDescription.startsWith('__SMARTMALL_STORE_TYPE__:')) {
    try {
      const decoded = JSON.parse(encodedDescription.slice('__SMARTMALL_STORE_TYPE__:'.length)) as { type?: unknown };
      const metadataType = normalizeStoreType(decoded?.type);
      if (metadataType) return metadataType;
    } catch {
      // Keep the compatible supermarket value when legacy metadata is invalid.
    }
  }

  return directType;
}