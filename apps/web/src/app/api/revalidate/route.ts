import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'masterlms-super-secret-key-change-in-production-2024'
);

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await jwtVerify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await req.json().catch(() => ({}));

  revalidatePath('/');
  if (slug) {
    revalidatePath(`/species/${slug}`);
  }

  return NextResponse.json({ revalidated: true });
}
