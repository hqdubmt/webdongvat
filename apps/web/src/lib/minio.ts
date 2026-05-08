import * as Minio from 'minio';

let client: Minio.Client | null = null;

export const BUCKET = process.env.MINIO_BUCKET || 'species-media';

export function getClient(): Minio.Client {
  if (!client) {
    client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      secretKey: process.env.MINIO_SECRET_KEY || 'Minio@123456789',
    });
  }
  return client;
}

export function publicUrl(objectKey: string): string {
  const base = process.env.MINIO_PUBLIC_URL
    ? process.env.MINIO_PUBLIC_URL.replace(/\/$/, '')
    : `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}`;
  return `${base}/${BUCKET}/${objectKey}`;
}

const INDEX_KEY = 'samples/_index.json';

export async function readSampleIndex(): Promise<Record<string, string>> {
  try {
    const stream = await getClient().getObject(BUCKET, INDEX_KEY);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export async function writeSampleIndex(index: Record<string, string>): Promise<void> {
  const buf = Buffer.from(JSON.stringify(index, null, 2));
  await getClient().putObject(BUCKET, INDEX_KEY, buf, buf.length, { 'Content-Type': 'application/json' });
}

export async function ensureBucket(): Promise<void> {
  const c = getClient();
  try {
    const exists = await c.bucketExists(BUCKET);
    if (!exists) {
      await c.makeBucket(BUCKET, 'us-east-1');
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${BUCKET}/*`] }],
      });
      await c.setBucketPolicy(BUCKET, policy);
    }
  } catch { /* ignore */ }
}
