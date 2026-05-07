import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'masterlms-super-secret-key-change-in-production-2024'
);

export interface CurrentUser {
  userId: number;
  username: string;
  displayName: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'EDITOR';
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const token = (await cookies()).get('admin_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as CurrentUser;
  } catch {
    return null;
  }
}
