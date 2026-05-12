import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3001';

function buildPrompt(name: string, scientificName: string, conservationStatus?: string): string {
  const statusLine = conservationStatus ? `Tình trạng bảo tồn: ${conservationStatus}.` : '';
  return `Viết một đoạn mô tả ngắn gọn (200-300 từ) bằng tiếng Việt về loài động vật sau, phù hợp để đăng lên hệ thống tra cứu khoa học:

Tên tiếng Việt: ${name}
Tên khoa học: ${scientificName}
${statusLine}

Mô tả nên bao gồm: đặc điểm nhận dạng, môi trường sống, tập tính, và tình trạng bảo tồn. Viết súc tích, khoa học nhưng dễ hiểu. Không dùng heading hay bullet points, chỉ văn xuôi.`;
}

function buildFallbackDescription(name: string, scientificName: string, conservationStatus?: string): string {
  const statusText = conservationStatus
    ? `Loài này được IUCN xếp vào tình trạng ${conservationStatus}. `
    : '';
  return `${name} (${scientificName}) là một loài động vật hoang dã. ${statusText}Chưa có mô tả chi tiết trong hệ thống. Vui lòng cập nhật thông tin sau khi có nguồn tham khảo phù hợp.`;
}

// Circuit breaker: skip API for 5 min after capacity/quota error
const apiBreaker: Record<string, number> = {};
const BREAKER_TTL = 5 * 60 * 1000;
const isApiOpen = (name: string) => !apiBreaker[name] || Date.now() > apiBreaker[name];
const tripBreaker = (name: string) => { apiBreaker[name] = Date.now() + BREAKER_TTL; };
const isCapacityError = (e: unknown) =>
  /429|402|quota|credit|exceeded|RESOURCE_EXHAUSTED|insufficient|balance|billing/i.test(String(e));

export async function POST(req: Request) {
  const { name, scientificName, conservationStatus, slug } = await req.json();
  if (!name || !scientificName) {
    return NextResponse.json({ error: 'Thiếu tên loài' }, { status: 400 });
  }

  const prompt = buildPrompt(name, scientificName, conservationStatus);

  // 1. Try Anthropic
  if (process.env.ANTHROPIC_API_KEY && isApiOpen('anthropic')) {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      if (text) return NextResponse.json({ description: text });
    } catch (e) {
      if (isCapacityError(e)) tripBreaker('anthropic');
      // fall through to Gemini
    }
  }

  // 2. Try Gemini
  if (process.env.GEMINI_API_KEY && isApiOpen('gemini')) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text) return NextResponse.json({ description: text });
    } catch (e) {
      if (isCapacityError(e)) tripBreaker('gemini');
      // fall through to DB
    }
  }

  // 3. Use existing DB description
  if (slug) {
    try {
      const res = await fetch(`${API_BASE}/api/species/${slug}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const existing = json.data?.description as string | null | undefined;
        if (existing && existing.trim().length > 30) {
          return NextResponse.json({ description: existing });
        }
      }
    } catch {
      // fall through
    }
  }

  // 4. Minimal template
  return NextResponse.json({
    description: buildFallbackDescription(name, scientificName, conservationStatus),
  });
}
