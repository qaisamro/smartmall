import { environment } from '@/src/config/environment';

const apiOrigin = new URL(environment.apiBaseUrl).origin;
export const imageRequestHeaders = { Referer: `${apiOrigin}/` };

export function normalizeImageUrl(value?: string | null): string | null {
  const source = value?.trim();
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;
  if (source.startsWith('//')) return `https:${source}`;
  if (/^storage\//i.test(source)) return `${apiOrigin}/${source}`;
  const path = source.startsWith('/') ? source : `/storage/${source}`;
  return `${apiOrigin}${path}`;
}

export function getMallImageUrls(coverImage?: string | null, logo?: string | null): string[] {
  return Array.from(
    new Set(
      [coverImage, logo]
        .map((value) => normalizeImageUrl(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function getProductImageUrl(product: {
  image?: string | null;
  link_photo?: string | null;
}): string | null {
  return normalizeImageUrl(product.image || product.link_photo);
}