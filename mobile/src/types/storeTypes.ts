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