import type { Metadata } from 'next';
import AdminNav from '@/components/AdminNav';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Quản trị' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav role={user?.role} displayName={user?.displayName} />
      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
