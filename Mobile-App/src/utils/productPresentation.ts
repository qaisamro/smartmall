import type { Product } from '@/src/types/api';
import type { KnownProductUnit, PricingType, ProductOptions, ProductUnit } from '@/src/types/storeTypes';
import { formatCurrency } from './currency';

const unitAliases: Record<string, KnownProductUnit> = {
  piece: 'piece',
  pieces: 'piece',
  unit: 'piece',
  kg: 'kg',
  kilo: 'kg',
  kilogram: 'kg',
  gram: 'gram',
  grams: 'gram',
  g: 'gram',
  liter: 'liter',
  litre: 'liter',
  l: 'liter',
  pack: 'pack',
  box: 'box',
  bundle: 'bundle',
  bunch: 'bunch',
};

const unitLabels: Record<KnownProductUnit, { ar: string; en: string }> = {
  piece: { ar: 'قطعة', en: 'piece' },
  kg: { ar: 'كغم', en: 'kg' },
  gram: { ar: 'غ', en: 'g' },
  liter: { ar: 'لتر', en: 'L' },
  pack: { ar: 'عبوة', en: 'pack' },
  box: { ar: 'صندوق', en: 'box' },
  bundle: { ar: 'حزمة', en: 'bundle' },
  bunch: { ar: 'ربطة', en: 'bunch' },
};

function normalizeUnit(value: string) {
  const normalized = value.trim().toLowerCase();
  return unitAliases[normalized] ?? null;
}

export interface PresentedProductMetadata {
  description_en: string | null;
  unit_type: ProductUnit | null;
  pricing_type: PricingType | null;
  weight: number | string | null;
  options: ProductOptions | null;
}

const PRODUCT_METADATA_PREFIX = '__SMARTMALL_PRODUCT_METADATA__:';

export function getProductMetadata(product: Product): PresentedProductMetadata {
  let encodedDescription: { description_en?: unknown; metadata?: Record<string, unknown> } | null = null;
  if (typeof product.description_en === 'string' && product.description_en.startsWith(PRODUCT_METADATA_PREFIX)) {
    try {
      const decoded = JSON.parse(product.description_en.slice(PRODUCT_METADATA_PREFIX.length));
      if (decoded && typeof decoded === 'object') {
        encodedDescription = decoded as { description_en?: unknown; metadata?: Record<string, unknown> };
      }
    } catch {
      // Preserve the raw response if a legacy row contains malformed metadata.
    }
  }

  const metadata = encodedDescription?.metadata ?? {};
  const encodedOptions = metadata.options;
  const parsedOptions =
    encodedOptions && typeof encodedOptions === 'object' ? (encodedOptions as ProductOptions) : null;

  return {
    description_en:
      typeof encodedDescription?.description_en === 'string'
        ? encodedDescription.description_en
        : product.description_en,
    unit_type: product.unit_type ?? (typeof metadata.unit_type === 'string' ? metadata.unit_type : null),
    pricing_type:
      product.pricing_type ?? (typeof metadata.pricing_type === 'string' ? metadata.pricing_type : null),
    weight: product.weight ?? (typeof metadata.weight === 'number' || typeof metadata.weight === 'string' ? metadata.weight : null),
    options: product.options ?? parsedOptions,
  };
}

function getProductUnit(product: Product) {
  const metadata = getProductMetadata(product);
  const explicitUnit = metadata.unit_type?.trim();
  if (explicitUnit) return explicitUnit;

  const pricingType = metadata.pricing_type?.trim().toLowerCase();
  if (pricingType === 'per_weight') return product.unit?.trim() || 'kg';
  if (pricingType === 'per_unit') return product.unit?.trim() || 'piece';
  return null;
}

export function getProductUnitLabel(product: Product, isAr: boolean) {
  const rawUnit = getProductUnit(product);
  if (!rawUnit) return null;

  const knownUnit = normalizeUnit(rawUnit);
  return knownUnit ? unitLabels[knownUnit][isAr ? 'ar' : 'en'] : rawUnit;
}

export function formatProductAmount(product: Product, amount: string | number, isAr: boolean) {
  const formattedAmount = formatCurrency(amount);
  const metadata = getProductMetadata(product);
  const pricingType = metadata.pricing_type?.trim().toLowerCase();
  const hasUnitMetadata = Boolean(metadata.unit_type) || pricingType === 'per_unit' || pricingType === 'per_weight';
  const unitLabel = hasUnitMetadata ? getProductUnitLabel(product, isAr) : null;

  return unitLabel ? `${formattedAmount} / ${unitLabel}` : formattedAmount;
}

export function formatProductPrice(product: Product, isAr: boolean) {
  return formatProductAmount(product, product.current_price, isAr);
}