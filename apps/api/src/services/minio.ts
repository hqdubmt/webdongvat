import * as Minio from 'minio';

let minioClient: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9001', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      secretKey: process.env.MINIO_SECRET_KEY || '123456789',
    });
  }
  return minioClient;
}

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'species-images';

export async function ensureBucketExists(): Promise<void> {
  const client = getMinioClient();
  try {
    const exists = await client.bucketExists(BUCKET_NAME);
    if (!exists) {
      await client.makeBucket(BUCKET_NAME, 'us-east-1');
      // Set bucket policy to public read
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      });
      await client.setBucketPolicy(BUCKET_NAME, policy);
      console.log(`MinIO bucket '${BUCKET_NAME}' created`);
    }
  } catch (err) {
    console.error('MinIO bucket error:', err);
  }
}

export async function uploadFile(
  objectKey: string,
  buffer: Buffer,
  mimeType: string,
  size: number
): Promise<string> {
  const client = getMinioClient();
  await ensureBucketExists();

  await client.putObject(BUCKET_NAME, objectKey, buffer, size, {
    'Content-Type': mimeType,
  });

  // MINIO_PUBLIC_URL overrides the generated URL for browser access
  // (needed when MinIO endpoint is an internal hostname/localhost not reachable by browsers)
  const publicBase = process.env.MINIO_PUBLIC_URL
    ? process.env.MINIO_PUBLIC_URL.replace(/\/$/, '')
    : (() => {
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT || '9001';
        const ssl = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        return `${ssl}://${endpoint}:${port}`;
      })();
  return `${publicBase}/${BUCKET_NAME}/${objectKey}`;
}

export async function deleteFile(objectKey: string): Promise<void> {
  const client = getMinioClient();
  await client.removeObject(BUCKET_NAME, objectKey);
}
