import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getClient, BUCKET, readSampleIndex } from '@/lib/minio';
import sharp from 'sharp';

type LibraryImage = {
  name: string;
  scientificName?: string;
  conservationStatus?: string;
  description?: string;
  link?: string;
  slug?: string;
  b64: string;
  mediaType: string;
};

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
    if (!res.ok) return [];
    const json = await res.json();
    const speciesList = (json.data ?? []) as Array<{
      slug: string;
      name: string;
      scientificName: string;
      description?: string | null;
      conservationStatus?: string | null;
      images?: Array<{ objectKey: string; isPrimary: boolean }>;
    }>;

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

// Pre-computed cosine table for 32x32 → 8x8 DCT (pHash)
const COS_TABLE_8_32: number[][] = (() => {
  const table: number[][] = [];
  for (let k = 0; k < 8; k++) {
    table[k] = [];
    for (let n = 0; n < 32; n++) {
      table[k][n] = Math.cos(Math.PI * k * (2 * n + 1) / 64);
    }
  }
  return table;
})();

// Perceptual Hash (pHash) via 2D DCT — robust to brightness/contrast changes
async function computePHash(b64: string): Promise<boolean[] | null> {
  try {
    const { data } = await sharp(Buffer.from(b64, 'base64'))
      .resize(32, 32, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = Array.from(data as Uint8Array);
    // Separable 2D DCT: row-wise first, then column-wise
    const rowDCT: number[][] = Array.from({ length: 32 }, () => new Array(8).fill(0));
    for (let row = 0; row < 32; row++) {
      for (let k = 0; k < 8; k++) {
        let sum = 0;
        for (let n = 0; n < 32; n++) sum += pixels[row * 32 + n] * COS_TABLE_8_32[k][n];
        rowDCT[row][k] = sum;
      }
    }
    const dctCoeffs: number[] = [];
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        let sum = 0;
        for (let row = 0; row < 32; row++) sum += rowDCT[row][u] * COS_TABLE_8_32[v][row];
        dctCoeffs.push(sum);
      }
    }
    // Skip DC component (index 0) — sensitive to overall brightness
    const ac = dctCoeffs.slice(1);
    const sorted = [...ac].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return ac.map(v => v >= median);
  } catch {
    return null;
  }
}

// Difference Hash (dHash) — captures edges and gradients
async function computeDHash(b64: string): Promise<boolean[] | null> {
  try {
    const { data } = await sharp(Buffer.from(b64, 'base64'))
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = Array.from(data as Uint8Array);
    const hash: boolean[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        hash.push(pixels[row * 9 + col] < pixels[row * 9 + col + 1]);
      }
    }
    return hash;
  } catch {
    return null;
  }
}

// RGB color histogram — distinguishes species by color distribution
async function computeColorHistogram(b64: string): Promise<number[] | null> {
  const BINS = 8;
  try {
    const { data, info } = await sharp(Buffer.from(b64, 'base64'))
      .resize(64, 64, { fit: 'fill' })
      .toColorspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    const hist = new Array(BINS * ch).fill(0);
    const pixels = data as Uint8Array;
    for (let i = 0; i < pixels.length; i += ch) {
      for (let c = 0; c < ch; c++) {
        const bin = Math.min(Math.floor(pixels[i + c] / 256 * BINS), BINS - 1);
        hist[c * BINS + bin]++;
      }
    }
    const total = hist.reduce((a, b) => a + b, 0);
    return total > 0 ? hist.map(v => v / total) : null;
  } catch {
    return null;
  }
}

type ImageFeatures = { pHash: boolean[] | null; dHash: boolean[] | null; colorHist: number[] | null };

async function computeFeatures(b64: string): Promise<ImageFeatures> {
  const [pHash, dHash, colorHist] = await Promise.all([
    computePHash(b64),
    computeDHash(b64),
    computeColorHistogram(b64),
  ]);
  return { pHash, dHash, colorHist };
}

function hammingDistance(a: boolean[], b: boolean[]): number {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) dist++;
  return dist;
}

function histogramIntersection(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += Math.min(a[i], b[i]);
  return sum;
}

// Weighted similarity: pHash 40% + dHash 35% + colorHist 25%
function featureSimilarity(f1: ImageFeatures, f2: ImageFeatures): number {
  let score = 0, weight = 0;
  if (f1.pHash && f2.pHash) {
    score += (1 - hammingDistance(f1.pHash, f2.pHash) / Math.min(f1.pHash.length, f2.pHash.length)) * 0.4;
    weight += 0.4;
  }
  if (f1.dHash && f2.dHash) {
    score += (1 - hammingDistance(f1.dHash, f2.dHash) / Math.min(f1.dHash.length, f2.dHash.length)) * 0.35;
    weight += 0.35;
  }
  if (f1.colorHist && f2.colorHist) {
    score += histogramIntersection(f1.colorHist, f2.colorHist) * 0.25;
    weight += 0.25;
  }
  return weight > 0 ? score / weight : 0;
}

async function hashMatch(base64: string, images: LibraryImage[], threshold = 0.75): Promise<LibraryImage | null> {
  if (!images.length) return null;
  const inputFeatures = await computeFeatures(base64);
  const scored = await Promise.all(
    images.map(async (img) => {
      try {
        const features = await computeFeatures(img.b64);
        return { img, score: featureSimilarity(inputFeatures, features) };
      } catch {
        return { img, score: 0 };
      }
    })
  );
  const best = scored.reduce((a, b) => a.score > b.score ? a : b);
  return best.score >= threshold ? best.img : null;
}

function buildJsonPrompt(hasLibrary: boolean): string {
  return `Trả về JSON thuần (không markdown):
{
  "found": true/false,
  "fromLibrary": ${hasLibrary ? 'true/false' : 'false'},
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
}`;
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function identifyWithGemini(
  base64: string,
  mediaType: string,
  libraryImages: LibraryImage[]
): Promise<Record<string, unknown>> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const parts: GeminiPart[] = [];

  if (libraryImages.length > 0) {
    const speciesMap: Record<string, LibraryImage[]> = {};
    for (const img of libraryImages) {
      if (!speciesMap[img.name]) speciesMap[img.name] = [];
      speciesMap[img.name].push(img);
    }
    const speciesEntries = Object.entries(speciesMap).slice(0, 12);

    parts.push({ text: `Tôi có ${speciesEntries.length} loài trong thư viện mẫu:` });
    for (let i = 0; i < speciesEntries.length; i++) {
      const [name, imgs] = speciesEntries[i];
      parts.push({ text: `\nLoài ${i + 1}: "${name}" (${imgs.length} góc chụp)` });
      for (const img of imgs) {
        parts.push({ inlineData: { mimeType: img.mediaType, data: img.b64 } });
      }
    }
    parts.push({ text: '\nĐây là ảnh cần nhận dạng:' });
    parts.push({ inlineData: { mimeType: mediaType, data: base64 } });
    parts.push({
      text: `Bước 1: So sánh ảnh cần nhận dạng với từng loài trong thư viện. Nếu CÙNG LOÀI, đặt "fromLibrary": true và dùng đúng tên đó.\nBước 2: Nếu không khớp, nhận dạng từ kiến thức của bạn, đặt "fromLibrary": false.\n\n${buildJsonPrompt(true)}`,
    });
  } else {
    parts.push({ inlineData: { mimeType: mediaType, data: base64 } });
    parts.push({ text: `Nhìn vào ảnh động vật này và trả về thông tin.\n\n${buildJsonPrompt(false)}` });
  }

  const result = await model.generateContent(parts as Parameters<typeof model.generateContent>[0]);
  const raw = result.response.text().trim();
  return JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as string;

  const [libraryImages, speciesDbImages] = await Promise.all([
    fetchLibraryImages(30),
    fetchSpeciesDbImages(60),
  ]);

  const allImages = [...speciesDbImages, ...libraryImages];

  function matchResponse(match: LibraryImage) {
    return NextResponse.json({
      found: true,
      fromLibrary: !match.slug,
      name: match.name,
      scientificName: match.scientificName || '',
      conservationStatus: match.conservationStatus || '',
      description: match.description || '',
      confidence: 'high',
      ...(match.slug ? { matchedSlug: match.slug } : {}),
      ...(match.link ? { libraryLink: match.link } : {}),
    });
  }

  function enrichFromAI(json: Record<string, unknown>) {
    if (json.fromLibrary && json.name) {
      const matched = allImages.find((l) => l.name === json.name);
      if (matched) {
        if (matched.slug) json.matchedSlug = matched.slug;
        if (matched.link) json.libraryLink = matched.link;
        if (matched.scientificName) json.scientificName = matched.scientificName;
        if (matched.conservationStatus) json.conservationStatus = matched.conservationStatus;
        if (matched.description) json.description = matched.description;
      }
    }
    return json;
  }

  // 1. Try Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    const speciesMap: Record<string, LibraryImage[]> = {};
    for (const img of libraryImages) {
      if (!speciesMap[img.name]) speciesMap[img.name] = [];
      speciesMap[img.name].push(img);
    }
    const speciesEntries = Object.entries(speciesMap).slice(0, 12);
    const messageContent: Anthropic.ContentBlockParam[] = speciesEntries.length > 0
      ? [
          { type: 'text', text: `Tôi có ${speciesEntries.length} loài trong thư viện mẫu:` },
          ...speciesEntries.flatMap<Anthropic.ContentBlockParam>(([name, imgs], i) => [
            { type: 'text', text: `\nLoài ${i + 1}: "${name}" (${imgs.length} góc chụp)` },
            ...imgs.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: img.b64 } } as Anthropic.ContentBlockParam)),
          ]),
          { type: 'text', text: '\nĐây là ảnh cần nhận dạng:' },
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 } },
          { type: 'text', text: `Bước 1: So sánh ảnh cần nhận dạng với từng loài trong thư viện. Nếu CÙNG LOÀI, đặt "fromLibrary": true và dùng đúng tên đó.\nBước 2: Nếu không khớp, nhận dạng từ kiến thức của bạn, đặt "fromLibrary": false.\n\n${buildJsonPrompt(true)}` },
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 } },
          { type: 'text', text: `Nhìn vào ảnh động vật này.\n\n${buildJsonPrompt(false)}` },
        ];
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: messageContent }],
      });
      const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
      const json = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
      return NextResponse.json(enrichFromAI(json));
    } catch {
      // fall through to Gemini
    }
  }

  // 2. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const json = await identifyWithGemini(base64, mediaType, libraryImages);
      return NextResponse.json(enrichFromAI(json));
    } catch {
      // fall through to DB
    }
  }

  // 3. Hash match against DB
  if (allImages.length > 0) {
    const match = await hashMatch(base64, allImages);
    if (match) return matchResponse(match);
  }

  return NextResponse.json({ found: false, note: 'Không tìm thấy loài khớp trong hệ thống.' });
}
