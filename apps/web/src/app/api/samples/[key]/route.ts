import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:3001';

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get('admin_token')?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/samples/${key}`, {
    method: 'DELETE',
    headers: authHeader,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
