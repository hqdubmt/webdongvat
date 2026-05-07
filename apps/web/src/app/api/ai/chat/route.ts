import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3001';

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY chưa được cấu hình', { status: 503 });
  }

  const { messages } = await req.json();

  // Fetch species list for context
  let speciesContext = '';
  try {
    const res = await fetch(`${API_BASE}/api/species`, { cache: 'no-store' });
    const json = await res.json();
    const list = json.data ?? [];
    speciesContext = list
      .map((s: { name: string; scientificName: string; conservationStatus: string | null; locations: unknown[]; description: string | null }) =>
        `- ${s.name} (${s.scientificName}): ${s.conservationStatus ?? 'Chưa đánh giá'}, ${s.locations.length} địa điểm${s.description ? '. ' + s.description.slice(0, 120) + '...' : ''}`
      )
      .join('\n');
  } catch {
    speciesContext = '(Không tải được dữ liệu loài)';
  }

  const systemPrompt = `Bạn là trợ lý thông minh của hệ thống quản lý loài động vật hoang dã Việt Nam. Trả lời bằng tiếng Việt, ngắn gọn và chính xác.

Dữ liệu loài hiện có trong hệ thống:
${speciesContext}

Hướng dẫn:
- Dựa vào dữ liệu trên để trả lời câu hỏi về các loài cụ thể
- Nếu được hỏi về loài không có trong danh sách, hãy thành thật nói không có trong hệ thống
- Có thể tổng hợp thống kê (bao nhiêu loài CR, EN, VU...) dựa vào dữ liệu
- Trả lời súc tích, tối đa 3-4 câu trừ khi cần giải thích chi tiết`;

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
