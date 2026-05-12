import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3001';

type SpeciesItem = {
  name: string;
  scientificName: string;
  conservationStatus: string | null;
  description: string | null;
  locations: Array<{ latitude: number; longitude: number; placeName: string | null }>;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

async function fetchSpeciesList(): Promise<SpeciesItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/species`, { cache: 'no-store' });
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

function buildContext(list: SpeciesItem[]): string {
  return list
    .map((s) =>
      `- ${s.name} (${s.scientificName}): ${s.conservationStatus ?? 'Chưa đánh giá'}, ${s.locations.length} địa điểm${s.description ? '. ' + s.description.slice(0, 120) + '...' : ''}`
    )
    .join('\n');
}

const SYSTEM_PROMPT = (context: string) =>
  `Bạn là trợ lý thông minh của hệ thống quản lý loài động vật hoang dã Việt Nam. Trả lời bằng tiếng Việt, ngắn gọn và chính xác.

Dữ liệu loài hiện có trong hệ thống:
${context}

Hướng dẫn:
- Dựa vào dữ liệu trên để trả lời câu hỏi về các loài cụ thể
- Nếu được hỏi về loài không có trong danh sách, hãy thành thật nói không có trong hệ thống
- Có thể tổng hợp thống kê (bao nhiêu loài CR, EN, VU...) dựa vào dữ liệu
- Trả lời súc tích, tối đa 3-4 câu trừ khi cần giải thích chi tiết`;

// ── Helpers ────────────────────────────────────────────────────────────────

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function textStream(text: string): Response {
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

// ── Local DB search (no API key fallback) ──────────────────────────────────

const STATUS_PATTERNS: Array<[RegExp, string]> = [
  [/\b(cr|cực kỳ nguy cấp|critically endangered)\b/i, 'CR'],
  [/\b(en|nguy cấp|endangered)\b/i, 'EN'],
  [/\b(vu|dễ bị tổn thương|vulnerable)\b/i, 'VU'],
  [/\b(nt|gần bị đe dọa|near threatened)\b/i, 'NT'],
  [/\b(lc|ít quan tâm|least concern)\b/i, 'LC'],
];

function localSearch(messages: ChatMessage[], species: SpeciesItem[]): { text: string; confident: boolean } {
  const lastMsg = messages[messages.length - 1]?.content ?? '';
  const q = removeAccents(lastMsg.toLowerCase());
  // Split into whole words for accurate matching (avoids "hong" matching "thong")
  const qWords = new Set(q.split(/[\s,\.!?;:]+/).filter(Boolean));

  // Match specific species by full name or whole-word parts (>= 5 chars to reduce false positives)
  const matched = species.filter((s) => {
    const nameNorm = removeAccents(s.name.toLowerCase());
    const nameParts = nameNorm.split(' ');
    const sci = s.scientificName.toLowerCase();
    return (
      q.includes(nameNorm) ||
      nameParts.some((w) => w.length >= 5 && qWords.has(w)) ||
      lastMsg.toLowerCase().includes(sci)
    );
  });

  if (matched.length === 1) {
    const s = matched[0];
    const lines: string[] = [`${s.name} (${s.scientificName})`];
    if (s.conservationStatus) lines.push(`Tình trạng bảo tồn: ${s.conservationStatus}`);
    if (s.description) lines.push(s.description.slice(0, 400));
    if (s.locations.length > 0) {
      const locs = s.locations.map((l) => l.placeName || `${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)}`).join('; ');
      lines.push(`Địa điểm ghi nhận (${s.locations.length}): ${locs}`);
    } else {
      lines.push('Chưa có dữ liệu địa điểm ghi nhận.');
    }
    return { text: lines.join('\n\n'), confident: true };
  }

  if (matched.length > 1) {
    const text = `Tìm thấy ${matched.length} loài liên quan:\n` +
      matched.map((s) => `• ${s.name} (${s.scientificName}) — ${s.conservationStatus ?? 'Chưa đánh giá'}`).join('\n');
    return { text, confident: true };
  }

  // Conservation status filter — DB stores e.g. "Cực kỳ nguy cấp (CR)"
  for (const [pattern, code] of STATUS_PATTERNS) {
    if (pattern.test(lastMsg) || pattern.test(q)) {
      const filtered = species.filter((s) => s.conservationStatus?.includes(`(${code})`));
      if (filtered.length > 0) {
        const text = `Các loài tình trạng ${code} trong hệ thống (${filtered.length} loài):\n` +
          filtered.map((s) => `• ${s.name} (${s.scientificName})`).join('\n');
        return { text, confident: true };
      }
      return { text: `Hiện chưa có loài nào có tình trạng ${code} trong hệ thống.`, confident: true };
    }
  }

  // Statistics — match both accented and accent-free versions
  const combined = lastMsg + ' ' + q;
  if (/bao nhiêu|bao nhieu|số lượng|so luong|thống kê|thong ke|tổng số|tong so|tất cả|tat ca|danh sách|danh sach/.test(combined)) {
    const counts: Record<string, number> = {};
    for (const s of species) {
      const code = s.conservationStatus?.match(/\(([A-Z]+)\)/)?.[1]
        ?? s.conservationStatus?.split(' ')[0]
        ?? 'Chưa đánh giá';
      counts[code] = (counts[code] ?? 0) + 1;
    }
    const detail = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `  ${k}: ${v} loài`)
      .join('\n');
    const text = `Hệ thống hiện có ${species.length} loài động vật hoang dã.\n\nPhân theo tình trạng:\n${detail}`;
    return { text, confident: true };
  }

  // Not confident — question is outside DB scope, let AI handle it
  return {
    text: `Hệ thống có ${species.length} loài động vật hoang dã. Bạn có thể hỏi tôi:\n` +
      `• Thông tin về loài cụ thể (ví dụ: "Sao La", "Gấu Ngựa")\n` +
      `• Loài nào nguy cấp CR, EN, VU...\n` +
      `• Thống kê số lượng loài`,
    confident: false,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();
  const speciesList = await fetchSpeciesList();
  const context = buildContext(speciesList);

  // 1. Try Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: SYSTEM_PROMPT(context),
        messages,
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      if (text) return textStream(text);
    } catch {
      // fall through to Gemini
    }
  }

  // 2. Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM_PROMPT(context),
      });
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const lastMsg = messages[messages.length - 1]?.content ?? '';
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMsg);
      const text = result.response.text().trim();
      if (text) return textStream(text);
    } catch {
      // fall through to DB
    }
  }

  // 3. DB local search fallback
  const dbResult = localSearch(messages, speciesList);
  return textStream(dbResult.text);
}
