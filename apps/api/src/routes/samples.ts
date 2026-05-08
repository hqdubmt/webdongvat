import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getMinioClient, BUCKET_NAME, ensureBucketExists, uploadFile, deleteFile } from '../services/minio';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/samples - list sample images from MinIO
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const client = getMinioClient();
    await ensureBucketExists();

    const objects: { key: string; url: string; lastModified: Date }[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = client.listObjects(BUCKET_NAME, 'samples/', true);
      stream.on('data', (obj) => {
        if (!obj.name) return;
        const publicBase = process.env.MINIO_PUBLIC_URL
          ? process.env.MINIO_PUBLIC_URL.replace(/\/$/, '')
          : `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9001'}`;
        objects.push({
          key: obj.name,
          url: `${publicBase}/${BUCKET_NAME}/${obj.name}`,
          lastModified: obj.lastModified,
        });
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    objects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    return res.json({ data: objects });
  } catch (err) {
    return next(err);
  }
});

// POST /api/samples - upload one or more images
router.post('/', upload.array('images', 20), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No images provided' });

    const results = await Promise.all(
      files.map(async (file) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const objectKey = `samples/${uuidv4()}${ext}`;
        const url = await uploadFile(objectKey, file.buffer, file.mimetype, file.size);
        return { key: objectKey, url };
      })
    );

    return res.status(201).json({ data: results });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/samples/:key - key is base64url encoded object key
router.delete('/:key', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const objectKey = Buffer.from(req.params.key, 'base64').toString('utf8');
    if (!objectKey.startsWith('samples/')) {
      return res.status(400).json({ error: 'Invalid key' });
    }
    await deleteFile(objectKey);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
