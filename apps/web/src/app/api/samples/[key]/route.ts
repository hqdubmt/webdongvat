import { NextRequest, NextResponse } from 'next/server';
import { getClient, BUCKET, readSampleIndex, writeSampleIndex } from '@/lib/minio';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const objectKey = Buffer.from(key, 'base64').toString('utf8');
    if (!objectKey.startsWith('samples/')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }
    const body = await req.json();
    const index = await readSampleIndex();
    const current = index[objectKey] ?? { name: '' };
    index[objectKey] = {
      name: body.name !== undefined ? (body.name ?? '') : current.name,
      scientificName: body.scientificName !== undefined ? (body.scientificName ?? '') : current.scientificName,
      conservationStatus: body.conservationStatus !== undefined ? (body.conservationStatus ?? '') : current.conservationStatus,
      description: body.description !== undefined ? (body.description ?? '') : current.description,
      link: body.link !== undefined ? (body.link ?? '') : current.link,
    };
    await writeSampleIndex(index);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const objectKey = Buffer.from(key, 'base64').toString('utf8');
    if (!objectKey.startsWith('samples/')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }
    await getClient().removeObject(BUCKET, objectKey);

    const index = await readSampleIndex();
    delete index[objectKey];
    await writeSampleIndex(index);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
