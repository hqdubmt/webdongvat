import { NextRequest, NextResponse } from 'next/server';
import { getClient, BUCKET } from '@/lib/minio';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const objectKey = Buffer.from(key, 'base64').toString('utf8');
    if (!objectKey.startsWith('samples/')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }
    await getClient().removeObject(BUCKET, objectKey);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
