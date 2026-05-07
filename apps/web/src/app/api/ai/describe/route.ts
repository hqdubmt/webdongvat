import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY chưa được cấu hình' }, { status: 503 });
  }

  const { name, scientificName, conservationStatus } = await req.json();
  if (!name || !scientificName) {
    return NextResponse.json({ error: 'Thiếu tên loài' }, { status: 400 });
  }

  const statusLine = conservationStatus ? `Tình trạng bảo tồn: ${conservationStatus}.` : '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Viết một đoạn mô tả ngắn gọn (200-300 từ) bằng tiếng Việt về loài động vật sau, phù hợp để đăng lên hệ thống tra cứu khoa học:

Tên tiếng Việt: ${name}
Tên khoa học: ${scientificName}
${statusLine}

Mô tả nên bao gồm: đặc điểm nhận dạng, môi trường sống, tập tính, và tình trạng bảo tồn. Viết súc tích, khoa học nhưng dễ hiểu. Không dùng heading hay bullet points, chỉ văn xuôi.`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return NextResponse.json({ description: text });
}
