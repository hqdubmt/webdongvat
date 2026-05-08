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
