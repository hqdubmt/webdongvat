import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getClient, BUCKET, publicUrl, ensureBucket, readSampleIndex, writeSampleIndex } from '@/lib/minio';

export async function GET() {
  try {
    await ensureBucket();
    const client = getClient();

    const objects: { key: string; url: string; lastModified: Date }[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = client.listObjects(BUCKET, 'samples/', true);
      stream.on('data', (obj) => {
        if (obj.name && !obj.name.endsWith('_index.json')) {
          objects.push({ key: obj.name, url: publicUrl(obj.name), lastModified: obj.lastModified ?? new Date(0) });
        }
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    objects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    const index = await readSampleIndex();
    const data = objects.map((o) => {
      const entry = index[o.key];
      return { ...o, name: entry?.name || '', link: entry?.link || '' };
    });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureBucket();
    const client = getClient();
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];
    const namesRaw = formData.get('names') as string | null;
    const linksRaw = formData.get('links') as string | null;
    const names: string[] = namesRaw ? JSON.parse(namesRaw) : [];
    const links: string[] = linksRaw ? JSON.parse(linksRaw) : [];

    if (files.length === 0) return NextResponse.json({ error: 'No images provided' }, { status: 400 });

    const index = await readSampleIndex();

    const results = await Promise.all(
      files.map(async (file, i) => {
        const ext = path.extname(file.name) || '.jpg';
        const objectKey = `samples/${crypto.randomUUID()}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await client.putObject(BUCKET, objectKey, buffer, buffer.length, { 'Content-Type': file.type || 'image/jpeg' });
        const name = names[i] || path.basename(file.name, ext);
        const link = links[i] || '';
        index[objectKey] = { name, link };
        return { key: objectKey, url: publicUrl(objectKey), name, link };
      })
    );

    await writeSampleIndex(index);
    return NextResponse.json({ data: results }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
