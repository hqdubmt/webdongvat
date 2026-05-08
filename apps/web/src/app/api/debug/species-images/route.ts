import { NextResponse } from 'next/server';
import { getClient, BUCKET } from '@/lib/minio';

export async function GET() {
  const result: Record<string, unknown> = {};

  // Step 1: fetch species list
  const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001';
  result.apiBase = apiBase;

  let speciesList: Array<{ slug: string; name: string; images?: Array<{ objectKey: string; isPrimary: boolean }> }> = [];
  try {
    const res = await fetch(`${apiBase}/api/species`, { cache: 'no-store' });
    result.apiStatus = res.status;
    if (res.ok) {
      const json = await res.json();
      speciesList = json.data ?? [];
      result.totalSpecies = speciesList.length;
      result.withImages = speciesList.filter(s => (s.images ?? []).length > 0).length;
      result.firstSlug = speciesList[0]?.slug;
      result.firstImages = speciesList[0]?.images;
    }
  } catch (e) {
    result.apiFetchError = (e as Error).message;
  }

  // Step 2: try to fetch first image from MinIO
  const first = speciesList.find(s => (s.images ?? []).length > 0);
  if (first) {
    const img = (first.images ?? []).find(i => i.isPrimary) ?? first.images?.[0];
    result.testObjectKey = img?.objectKey;
    if (img?.objectKey) {
      try {
        const stream = await getClient().getObject(BUCKET, img.objectKey);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        result.minioBytes = Buffer.concat(chunks).length;
        result.minioOk = true;
      } catch (e) {
        result.minioError = (e as Error).message;
      }
    }
  }

  return NextResponse.json(result);
}
