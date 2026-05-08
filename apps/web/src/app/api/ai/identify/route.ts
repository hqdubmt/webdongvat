import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getClient, BUCKET, readSampleIndex } from '@/lib/minio';
import sharp from 'sharp';

type LibraryImage = { name: string; scientificName?: string; conservationStatus?: string; description?: string; link?: string; slug?: string; b64: string; mediaType: string };

async function fetchLibraryImages(limit = 30): Promise<LibraryImage[]> {
  try {
    const index = await readSampleIndex();
    const namedEntries = Object.entries(index).filter(([, v]) => v.name);
    if (!namedEntries.length) return [];

    const results = await Promise.all(
      namedEntries.slice(0, limit).map(async ([key, entry]) => {
        try {
          const stream = await getClient().getObject(BUCKET, key);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const b64 = Buffer.concat(chunks).toString('base64');
          const ext = key.split('.').pop()?.toLowerCase() || 'jpg';
          const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          return { name: entry.name, scientificName: entry.scientificName, conservationStatus: entry.conservationStatus, description: entry.description, link: entry.link, b64, mediaType };
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean) as LibraryImage[];
  } catch {
    return [];
  }
}

async function fetchSpeciesDbImages(limit = 60): Promise<LibraryImage[]> {
  try {
    const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/species`, { cache: 'no-store' });
    if (!res.ok) {
      console.error('[identify] fetchSpeciesDbImages: API status', res.status);
      return [];
    }
    const json = await res.json();
    const speciesList = (json.data ?? []) as Array<{
      slug: string; name: string; scientificName: string;
      description?: string | null; conservationStatus?: string | null;
      images?: Array<{ objectKey: string; isPrimary: boolean }>;
    }>;
    console.log('[identify] fetchSpeciesDbImages: got', speciesList.length, 'species');

    const results = await Promise.all(
      speciesList.slice(0, limit).map(async (sp) => {
        const imgs = sp.images ?? [];
        const primaryImg = imgs.find((i) => i.isPrimary) ?? imgs[0];
        if (!primaryImg?.objectKey) return null;
        try {
          const stream = await getClient().getObject(BUCKET, primaryImg.objectKey);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const b64 = Buffer.concat(chunks).toString('base64');
          const ext = primaryImg.objectKey.split('.').pop()?.toLowerCase() || 'jpg';
          const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          return { name: sp.name, scientificName: sp.scientificName, conservationStatus: sp.conservationStatus || undefined, description: sp.description || undefined, slug: sp.slug, b64, mediaType };
        } catch (e) {
          console.error('[identify] fetchSpeciesDbImages: failed image for', sp.slug, (e as Error)?.message);
          return null;
        }
      })
    );
    const loaded = results.filter(Boolean) as LibraryImage[];
    console.log('[identify] fetchSpeciesDbImages: loaded', loaded.length, 'images');
    return loaded;
  } catch (e) {
    console.error('[identify] fetchSpeciesDbImages: fatal', (e as Error)?.message);
    return [];
  }
}

// Average hash (8x8 = 64 bits) — returns null if image is invalid
async function computeAHash(b64: string): Promise<boolean[] | null> {
  try {
    const { data } = await sharp(Buffer.from(b64, 'base64'))
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = Array.from(data as Uint8Array);
    const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    return pixels.map(p => p >= avg);
  } catch {
    return null;
  }
}

function hammingDistance(a: boolean[], b: boolean[]): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dist++;
  return dist;
}

async function hashMatch(base64: string, libraryImages: LibraryImage[], threshold = 12): Promise<LibraryImage | null> {
  const inputHash = await computeAHash(base64);
  if (!inputHash) return null;

  const entries: { img: LibraryImage; dist: number }[] = [];
  await Promise.all(libraryImages.map(async (img) => {
    const h = await computeAHash(img.b64);
    if (h) entries.push({ img, dist: hammingDistance(inputHash, h) });
  }));

  if (!entries.length) return null;
  const best = entries.reduce((a, b) => a.dist < b.dist ? a : b);
  return best.dist <= threshold ? best.img : null;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  const [libraryImages, speciesDbImages] = await Promise.all([
    fetchLibraryImages(30),
    fetchSpeciesDbImages(60),
  ]);

  // No API key — offline hash-based matching against species DB + sample library
  if (!process.env.ANTHROPIC_API_KEY) {
    const allImages = [...speciesDbImages, ...libraryImages];
    if (allImages.length === 0) {
      return NextResponse.json({ found: false, note: 'Chưa có ảnh mẫu trong hệ thống.' });
    }
    const match = await hashMatch(base64, allImages);
    if (match) {
      return NextResponse.json({ found: true, fromLibrary: !match.slug, name: match.name, scientificName: match.scientificName || '', conservationStatus: match.conservationStatus || '', description: match.description || '', confidence: 'high', ...(match.slug ? { matchedSlug: match.slug } : {}), ...(match.link ? { libraryLink: match.link } : {}) });
    }
    return NextResponse.json({ found: false, note: 'Không tìm thấy ảnh khớp trong hệ thống.' });
  }

  let messageContent: Anthropic.ContentBlockParam[];

  if (libraryImages.length > 0) {
    // Group library images by species name
    const speciesMap: Record<string, LibraryImage[]> = {};
    for (const img of libraryImages) {
      if (!speciesMap[img.name]) speciesMap[img.name] = [];
      speciesMap[img.name].push(img);
    }
    const speciesEntries = Object.entries(speciesMap).slice(0, 12);

    messageContent = [
      { type: 'text', text: `Tôi có ${speciesEntries.length} loài trong thư viện mẫu:` },
      ...speciesEntries.flatMap<Anthropic.ContentBlockParam>(([name, imgs], i) => [
        { type: 'text', text: `\nLoài ${i + 1}: "${name}" (${imgs.length} góc chụp)` },
        ...imgs.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: img.b64 } } as Anthropic.ContentBlockParam)),
      ]),
      { type: 'text', text: '\nĐây là ảnh cần nhận dạng:' },
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      {
        type: 'text',
        text: `Bước 1: So sánh ảnh cần nhận dạng với từng loài trong thư viện. Mỗi loài có thể có nhiều góc chụp khác nhau để giúp nhận dạng chính xác hơn. Nếu ảnh cần nhận dạng là CÙNG LOÀI với một loài trong thư viện, đặt "fromLibrary": true và dùng đúng tên của loài đó.
Bước 2: Nếu không khớp với loài nào, nhận dạng bình thường từ kiến thức của bạn và đặt "fromLibrary": false.

Trả về JSON thuần (không markdown):
{
  "found": true/false,
  "fromLibrary": true/false,
  "name": "tên tiếng Việt",
  "scientificName": "tên khoa học Latin",
  "conservationStatus": "tình trạng IUCN hoặc để trống",
  "description": "mô tả 2-3 câu tiếng Việt",
  "confidence": "high/medium/low",
  "sources": [
    { "label": "IUCN Red List", "url": "https://www.iucnredlist.org/search?query=<tên khoa học>" },
    { "label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/<tên khoa học dấu cách thay bằng _>" },
    { "label": "Wikipedia tiếng Việt", "url": "https://vi.wikipedia.org/wiki/<tên tiếng Việt dấu cách thay bằng _>" }
  ],
  "note": "ghi chú nếu không nhận ra hoặc không phải động vật"
}`,
      },
    ];
  } else {
    messageContent = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      {
        type: 'text',
        text: `Nhìn vào ảnh động vật này và trả về thông tin theo đúng định dạng JSON sau (không có markdown, chỉ JSON thuần):
{
  "found": true/false,
  "fromLibrary": false,
  "name": "tên tiếng Việt nếu biết, nếu không để trống",
  "scientificName": "tên khoa học Latin",
  "conservationStatus": "tình trạng theo IUCN (ví dụ: Nguy cấp (EN)) hoặc để trống nếu không biết",
  "description": "mô tả ngắn 2-3 câu bằng tiếng Việt về loài này",
  "confidence": "high/medium/low",
  "sources": [
    { "label": "IUCN Red List", "url": "https://www.iucnredlist.org/search?query=<tên khoa học>" },
    { "label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/<tên khoa học dấu cách thay bằng _>" },
    { "label": "Wikipedia tiếng Việt", "url": "https://vi.wikipedia.org/wiki/<tên tiếng Việt dấu cách thay bằng _>" }
  ],
  "note": "ghi chú nếu không nhận ra hoặc không phải động vật"
}`,
      },
    ];
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: messageContent }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    const json = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
    if (json.fromLibrary && json.name) {
      const matched = libraryImages.find((l) => l.name === json.name);
      if (matched) {
        if (matched.link) json.libraryLink = matched.link;
        if (matched.scientificName) json.scientificName = matched.scientificName;
        if (matched.conservationStatus) json.conservationStatus = matched.conservationStatus;
        if (matched.description) json.description = matched.description;
      }
    }
    return NextResponse.json(json);
  } catch {
    // API failed (credits, network, etc.) — fall back to hash matching against species DB + library
    const allImages = [...speciesDbImages, ...libraryImages];
    const match = await hashMatch(base64, allImages);
    if (match) {
      return NextResponse.json({ found: true, fromLibrary: !match.slug, name: match.name, scientificName: match.scientificName || '', conservationStatus: match.conservationStatus || '', description: match.description || '', confidence: 'high', ...(match.slug ? { matchedSlug: match.slug } : {}), ...(match.link ? { libraryLink: match.link } : {}) });
    }
    return NextResponse.json({ found: false, note: allImages.length === 0 ? 'API không khả dụng và chưa có ảnh mẫu trong hệ thống.' : 'Không tìm thấy ảnh khớp trong hệ thống.' });
  }
}
