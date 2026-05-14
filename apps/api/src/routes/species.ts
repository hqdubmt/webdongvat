import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../services/prisma';
import { getCache, setCache, deleteCache, deleteCachePattern } from '../services/redis';
import { uploadFile, deleteFile } from '../services/minio';
import { createError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Multer config - store in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// GET /api/species - list all species
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'species:list';
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ data: cached, cached: true });
    }

    const species = await prisma.species.findMany({
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 1,
        },
        locations: true,
        videos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });

    await setCache(cacheKey, species, 300);
    return res.json({ data: species, cached: false });
  } catch (err) {
    return next(err);
  }
});

// GET /api/species/check?name=...&scientificName=... - check for duplicates
router.get('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, scientificName } = req.query as { name?: string; scientificName?: string };
    const conditions: object[] = [];
    if (name) conditions.push({ name: { equals: name, mode: 'insensitive' } });
    if (scientificName) conditions.push({ scientificName: { equals: scientificName, mode: 'insensitive' } });
    if (conditions.length === 0) return res.json({ duplicate: false });

    const existing = await prisma.species.findFirst({ where: { OR: conditions }, select: { slug: true, name: true, scientificName: true } });
    if (existing) return res.json({ duplicate: true, existing });
    return res.json({ duplicate: false });
  } catch (err) {
    return next(err);
  }
});

// GET /api/species/:slug - species detail
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const cacheKey = `species:detail:${slug}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ data: cached, cached: true });
    }

    const species = await prisma.species.findUnique({
      where: { slug },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        locations: true,
        videos: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      },
    });

    if (!species) {
      return next(createError('Species not found', 404));
    }

    await setCache(cacheKey, species, 300);
    return res.json({ data: species, cached: false });
  } catch (err) {
    return next(err);
  }
});

// POST /api/species - create species
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, name, scientificName, description, conservationStatus, locations } = req.body;

    if (!slug || !name || !scientificName) {
      return next(createError('slug, name, and scientificName are required', 400));
    }

    const existing = await prisma.species.findUnique({ where: { slug } });
    if (existing) {
      return next(createError('Slug này đã tồn tại', 409));
    }

    const dupName = await prisma.species.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { slug: true } });
    if (dupName) {
      return next(createError(`Tên loài "${name}" đã tồn tại trong hệ thống`, 409));
    }

    const dupSci = await prisma.species.findFirst({ where: { scientificName: { equals: scientificName, mode: 'insensitive' } }, select: { slug: true } });
    if (dupSci) {
      return next(createError(`Tên khoa học "${scientificName}" đã tồn tại trong hệ thống`, 409));
    }

    const species = await prisma.species.create({
      data: {
        slug,
        name,
        scientificName,
        description,
        conservationStatus,
        locations: locations
          ? {
              create: locations.map((loc: { latitude: number; longitude: number; placeName?: string }) => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                placeName: loc.placeName,
              })),
            }
          : undefined,
      },
      include: { images: true, locations: true },
    });

    // Invalidate list cache
    await deleteCache('species:list');

    return res.status(201).json({ data: species });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/species/:slug - update species
router.put('/:slug', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { name, scientificName, description, conservationStatus } = req.body;

    const existing = await prisma.species.findUnique({ where: { slug } });
    if (!existing) {
      return next(createError('Species not found', 404));
    }

    const updated = await prisma.species.update({
      where: { slug },
      data: {
        ...(name !== undefined && { name }),
        ...(scientificName !== undefined && { scientificName }),
        ...(description !== undefined && { description }),
        ...(conservationStatus !== undefined && { conservationStatus }),
      },
      include: { images: true, locations: true },
    });

    // Invalidate caches
    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);

    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/species/:slug - delete species
router.delete('/:slug', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const existing = await prisma.species.findUnique({
      where: { slug },
      include: { images: true },
    });

    if (!existing) {
      return next(createError('Species not found', 404));
    }

    // Delete images from MinIO
    for (const image of existing.images) {
      try {
        await deleteFile(image.objectKey);
      } catch (err) {
        console.error(`Failed to delete image from MinIO: ${image.objectKey}`, err);
      }
    }

    await prisma.species.delete({ where: { slug } });

    // Invalidate caches
    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);
    await deleteCachePattern(`species:detail:${slug}*`);

    return res.json({ message: 'Species deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/species/:slug/images - upload image
router.post(
  '/:slug/images',
  requireAuth,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { caption, isPrimary } = req.body;

      const species = await prisma.species.findUnique({ where: { slug } });
      if (!species) {
        return next(createError('Species not found', 404));
      }

      if (!req.file) {
        return next(createError('Image file is required', 400));
      }

      const timestamp = Date.now();
      const originalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `species/${slug}/${timestamp}-${originalName}`;

      const url = await uploadFile(
        objectKey,
        req.file.buffer,
        req.file.mimetype,
        req.file.size
      );

      const existingCount = await prisma.speciesImage.count({ where: { speciesId: species.id } });
      const setAsPrimary = isPrimary === 'true' || isPrimary === true || existingCount === 0;

      // If setting as primary, unset other primaries first
      if (setAsPrimary) {
        await prisma.speciesImage.updateMany({
          where: { speciesId: species.id },
          data: { isPrimary: false },
        });
      }

      const image = await prisma.speciesImage.create({
        data: {
          speciesId: species.id,
          objectKey,
          url,
          caption,
          isPrimary: setAsPrimary,
        },
      });

      // Invalidate caches
      await deleteCache('species:list');
      await deleteCache(`species:detail:${slug}`);

      return res.status(201).json({ data: image });
    } catch (err) {
      return next(err);
    }
  }
);

// PATCH /api/species/:slug/images/:imageId/primary - set as primary image
router.patch('/:slug/images/:imageId/primary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, imageId } = req.params;

    const species = await prisma.species.findUnique({ where: { slug } });
    if (!species) {
      return next(createError('Species not found', 404));
    }

    const image = await prisma.speciesImage.findFirst({
      where: { id: parseInt(imageId, 10), speciesId: species.id },
    });

    if (!image) {
      return next(createError('Image not found', 404));
    }

    await prisma.speciesImage.updateMany({
      where: { speciesId: species.id },
      data: { isPrimary: false },
    });

    const updated = await prisma.speciesImage.update({
      where: { id: image.id },
      data: { isPrimary: true },
    });

    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);

    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/species/:slug/images/:imageId - delete image
router.delete('/:slug/images/:imageId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, imageId } = req.params;

    const species = await prisma.species.findUnique({ where: { slug } });
    if (!species) {
      return next(createError('Species not found', 404));
    }

    const image = await prisma.speciesImage.findFirst({
      where: { id: parseInt(imageId, 10), speciesId: species.id },
    });

    if (!image) {
      return next(createError('Image not found', 404));
    }

    // Delete from MinIO
    try {
      await deleteFile(image.objectKey);
    } catch (err) {
      console.error(`Failed to delete image from MinIO: ${image.objectKey}`, err);
    }

    await prisma.speciesImage.delete({ where: { id: image.id } });

    // Invalidate caches
    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);

    return res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// POST /api/species/:slug/locations - add location
router.post('/:slug/locations', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { latitude, longitude, placeName } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return next(createError('latitude and longitude are required', 400));
    }

    const species = await prisma.species.findUnique({ where: { slug } });
    if (!species) {
      return next(createError('Species not found', 404));
    }

    const location = await prisma.speciesLocation.create({
      data: {
        speciesId: species.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        placeName,
      },
    });

    await deleteCache(`species:detail:${slug}`);
    return res.status(201).json({ data: location });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/species/:slug/locations/:locationId - delete location
router.delete('/:slug/locations/:locationId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, locationId } = req.params;

    const species = await prisma.species.findUnique({ where: { slug } });
    if (!species) {
      return next(createError('Species not found', 404));
    }

    const location = await prisma.speciesLocation.findFirst({
      where: { id: parseInt(locationId, 10), speciesId: species.id },
    });

    if (!location) {
      return next(createError('Location not found', 404));
    }

    await prisma.speciesLocation.delete({ where: { id: location.id } });
    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);

    return res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// POST /api/species/:slug/videos - add video (URL or file upload)
router.post(
  '/:slug/videos',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    // Only run multer if it's a multipart request (file upload)
    if (req.is('multipart/form-data')) {
      return videoUpload.single('video')(req, res, next);
    }
    return next();
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const species = await prisma.species.findUnique({ where: { slug } });
      if (!species) return next(createError('Species not found', 404));

      const { title, isPrimary } = req.body;
      let url: string;
      let objectKey: string | undefined;

      if (req.file) {
        // File upload → store in MinIO
        const timestamp = Date.now();
        const originalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        objectKey = `species/${slug}/videos/${timestamp}-${originalName}`;
        url = await uploadFile(objectKey, req.file.buffer, req.file.mimetype, req.file.size);
      } else {
        // URL embed (YouTube/Vimeo)
        const { url: bodyUrl } = req.body;
        if (!bodyUrl) return next(createError('url is required', 400));
        url = bodyUrl;
      }

      if (isPrimary === 'true' || isPrimary === true) {
        await prisma.speciesVideo.updateMany({ where: { speciesId: species.id }, data: { isPrimary: false } });
      }

      const video = await prisma.speciesVideo.create({
        data: { speciesId: species.id, url, objectKey, title: title || null, isPrimary: isPrimary === 'true' || isPrimary === true },
      });

      await deleteCache('species:list');
      await deleteCache(`species:detail:${slug}`);
      return res.status(201).json({ data: video });
    } catch (err) {
      return next(err);
    }
  }
);

// PATCH /api/species/:slug/videos/:videoId/primary - set primary video
router.patch('/:slug/videos/:videoId/primary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, videoId } = req.params;
    const species = await prisma.species.findUnique({ where: { slug } });
    if (!species) return next(createError('Species not found', 404));

    await prisma.speciesVideo.updateMany({ where: { speciesId: species.id }, data: { isPrimary: false } });
    const updated = await prisma.speciesVideo.update({ where: { id: parseInt(videoId, 10) }, data: { isPrimary: true } });

    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);
    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/species/:slug/videos/:videoId - delete video
router.delete('/:slug/videos/:videoId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, videoId } = req.params;
    const species = await prisma.species.findUnique({ where: { slug } });
    if (!species) return next(createError('Species not found', 404));

    const video = await prisma.speciesVideo.findFirst({
      where: { id: parseInt(videoId, 10), speciesId: species.id },
    });
    if (!video) return next(createError('Video not found', 404));

    if (video.objectKey) {
      try { await deleteFile(video.objectKey); } catch {}
    }

    await prisma.speciesVideo.delete({ where: { id: video.id } });
    await deleteCache('species:list');
    await deleteCache(`species:detail:${slug}`);
    return res.json({ message: 'Video deleted' });
  } catch (err) {
    return next(err);
  }
});

export default router;
