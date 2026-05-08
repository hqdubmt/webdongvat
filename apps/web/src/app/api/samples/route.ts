import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3001';

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get('admin_token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function GET() {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/samples`, {
    headers: authHeader,
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const authHeader = await getAuthHeader();
  const contentType = req.headers.get('content-type') || '';
  const body = await req.arrayBuffer();

  const res = await fetch(`${API_BASE}/api/samples`, {
    method: 'POST',
    headers: { ...authHeader, 'content-type': contentType },
    body: Buffer.from(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
