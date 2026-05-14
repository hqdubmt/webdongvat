import { resetHashCache } from '@/lib/hash-cache';

export async function POST() {
  resetHashCache();
  return Response.json({ ok: true });
}
