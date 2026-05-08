import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getClient, BUCKET, publicUrl, ensureBucket } from '@/lib/minio';

export async function GET() {
  try {
    const client = getClient();
    await ensureBucket();

    const objects: { key: string; url: string; lastModified: Date }[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = client.listObjects(BUCKET, 'samples/', true);
      stream.on('data', (obj) => {
        if (obj.name) objects.push({ key: obj.name, url: publicUrl(obj.name), lastModified: obj.lastModified ?? new Date(0) });
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    objects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return NextResponse.json({ data: objects });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureBucket();
    const client = getClient();
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) return NextResponse.json({ error: 'No images provided' }, { status: 400 });

    const results = await Promise.all(
      files.map(async (file) => {
        const ext = path.extname(file.name) || '.jpg';
        const objectKey = `samples/${crypto.randomUUID()}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await client.putObject(BUCKET, objectKey, buffer, buffer.length, { 'Content-Type': file.type || 'image/jpeg' });
        return { key: objectKey, url: publicUrl(objectKey) };
      })
    );

    return NextResponse.json({ data: results }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
