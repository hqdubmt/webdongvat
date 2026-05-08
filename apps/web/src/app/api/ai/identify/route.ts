import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getClient, BUCKET, readSampleIndex } from '@/lib/minio';
import sharp from 'sharp';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type LibraryImage = { name: string; scientificName?: string; conservationStatus?: string; description?: string; link?: string; b64: string; mediaType: string };

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

// Average hash (8x8 = 64 bits) — fast pixel-based similarity
async function computeAHash(b64: string): Promise<bigint> {
  const { data } = await sharp(Buffer.from(b64, 'base64'))
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Array.from(data as Uint8Array);
  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if (pixels[i] >= avg) hash |= (1n << BigInt(i));
  }
  return hash;
}

function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let dist = 0;
  while (x > 0n) { if (x & 1n) dist++; x >>= 1n; }
  return dist;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  const libraryImages = await fetchLibraryImages(30);

  // No API key — fallback to hash-based library matching
  if (!process.env.ANTHROPIC_API_KEY) {
    if (libraryImages.length === 0) {
      return NextResponse.json({ found: false, note: 'Không có ảnh trong thư viện và chưa cấu hình ANTHROPIC_API_KEY.' });
    }

    const inputHash = await computeAHash(base64);
    const hashes = await Promise.all(libraryImages.map(lib => computeAHash(lib.b64)));

    let bestIdx = 0;
    let bestDist = hammingDistance(inputHash, hashes[0]);
    for (let i = 1; i < hashes.length; i++) {
      const d = hammingDistance(inputHash, hashes[i]);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    const THRESHOLD = 12;
    if (bestDist <= THRESHOLD) {
      const match = libraryImages[bestIdx];
      return NextResponse.json({
        found: true,
        fromLibrary: true,
        name: match.name,
        scientificName: match.scientificName || '',
        conservationStatus: match.conservationStatus || '',
        description: match.description || '',
        confidence: bestDist <= 5 ? 'high' : 'medium',
        ...(match.link ? { libraryLink: match.link } : {}),
      });
    }

    return NextResponse.json({ found: false, note: 'Không tìm thấy ảnh khớp trong thư viện. Thêm ANTHROPIC_API_KEY để nhận dạng ảnh mới.' });
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

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: messageContent }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';

  try {
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
    return NextResponse.json({ found: false, note: 'Không thể phân tích kết quả', raw });
  }
}
