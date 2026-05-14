export type ImageFeatures = {
  pHash: boolean[] | null;
  dHash: boolean[] | null;
  colorHist: number[] | null;
};

export type CachedImage = {
  name: string;
  scientificName?: string;
  conservationStatus?: string;
  description?: string;
  link?: string;
  slug?: string;
  b64: string;
  mediaType: string;
};

export type CachedEntry = { img: CachedImage; features: ImageFeatures };

export const hashCache: { entries: CachedEntry[] | null; expiry: number } = {
  entries: null,
  expiry: 0,
};

export function resetHashCache(): void {
  hashCache.entries = null;
  hashCache.expiry = 0;
}
