import type { Product } from '@/src/types/api';
import type { KnownProductUnit } from '@/src/types/storeTypes';
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

function getProductUnit(product: Product) {
  const explicitUnit = product.unit_type?.trim();
  if (explicitUnit) return explicitUnit;

  const pricingType = product.pricing_type?.trim().toLowerCase();
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
  const pricingType = product.pricing_type?.trim().toLowerCase();
  const hasUnitMetadata = Boolean(product.unit_type) || pricingType === 'per_unit' || pricingType === 'per_weight';
  const unitLabel = hasUnitMetadata ? getProductUnitLabel(product, isAr) : null;

  return unitLabel ? `${formattedAmount} / ${unitLabel}` : formattedAmount;
}

export function formatProductPrice(product: Product, isAr: boolean) {
  return formatProductAmount(product, product.current_price, isAr);
}