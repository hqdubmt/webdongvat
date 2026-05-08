import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY chưa được cấu hình' }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'Thiếu ảnh' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Nhìn vào ảnh động vật này và trả về thông tin theo đúng định dạng JSON sau (không có markdown, chỉ JSON thuần):
{
  "found": true/false,
  "name": "tên tiếng Việt nếu biết, nếu không để trống",
  "scientificName": "tên khoa học Latin",
  "conservationStatus": "tình trạng theo IUCN (ví dụ: Nguy cấp (EN)) hoặc để trống nếu không biết",
  "description": "mô tả ngắn 2-3 câu bằng tiếng Việt về loài này",
  "confidence": "high/medium/low",
  "note": "ghi chú nếu không nhận ra hoặc không phải động vật"
}`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';

  try {
    const json = JSON.parse(raw.replace(/^```json\n?|```$/g, '').trim());
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ found: false, note: 'Không thể phân tích kết quả', raw });
  }
}
