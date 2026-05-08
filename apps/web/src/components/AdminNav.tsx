'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminNavProps {
  role?: string;
  displayName?: string;
}

export default function AdminNav({ role, displayName }: AdminNavProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isSuperadmin = role === 'SUPERADMIN';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="bg-green-700 text-white">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold shrink-0">
            {displayName || 'Quản trị viên'}
            {role && (
              <span className="ml-2 text-xs font-normal opacity-75 bg-green-800 px-1.5 py-0.5 rounded">
                {role === 'SUPERADMIN' ? 'Superadmin' : role === 'ADMIN' ? 'Admin' : 'Editor'}
              </span>
            )}
          </span>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-4 flex-1">
            <Link href="/admin" className="hover:underline">Danh sách loài</Link>
            {role !== 'EDITOR' && (
              <Link href="/admin/species/new" className="hover:underline">+ Thêm loài mới</Link>
            )}
            <Link href="/admin/library" className="hover:underline">Thư viện ảnh</Link>
            {isSuperadmin && (
              <Link href="/admin/users" className="hover:underline">Người dùng</Link>
            )}
            <div className="ml-auto flex items-center gap-4">
              <Link href="/" className="hover:underline opacity-80">← Trang chủ</Link>
              <button onClick={handleLogout} className="bg-green-800 hover:bg-green-900 px-3 py-1 rounded text-xs font-medium">
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center gap-3 ml-auto">
            <Link href="/" className="opacity-80 text-xs">← Trang chủ</Link>
            <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded hover:bg-green-600 transition-colors" aria-label="Mở menu">
              {open ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="sm:hidden mt-2 pt-2 border-t border-green-600 flex flex-col text-sm">
            <Link href="/admin" onClick={() => setOpen(false)} className="py-2.5 hover:text-green-200 transition-colors">Danh sách loài</Link>
            {role !== 'EDITOR' && (
              <Link href="/admin/species/new" onClick={() => setOpen(false)} className="py-2.5 hover:text-green-200 transition-colors">+ Thêm loài mới</Link>
            )}
            <Link href="/admin/library" onClick={() => setOpen(false)} className="py-2.5 hover:text-green-200 transition-colors">Thư viện ảnh</Link>
            {isSuperadmin && (
              <Link href="/admin/users" onClick={() => setOpen(false)} className="py-2.5 hover:text-green-200 transition-colors">Người dùng</Link>
            )}
            <button onClick={handleLogout} className="py-2.5 text-left text-red-300 hover:text-red-200 font-medium transition-colors">Đăng xuất</button>
          </div>
        )}
      </div>
    </div>
  );
}
