'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser, type UserRole } from '@/lib/api';

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'SUPERADMIN', label: 'Superadmin', desc: 'Quản lý user + toàn bộ hệ thống' },
  { value: 'ADMIN', label: 'Admin', desc: 'Toàn quyền với dữ liệu loài' },
  { value: 'EDITOR', label: 'Editor', desc: 'Chỉnh sửa, tải ảnh/video, không xóa loài' },
];

export default function NewUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'EDITOR' as UserRole });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password || !form.displayName) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createUser(form);
      router.push('/admin/users');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Thêm người dùng</h1>
        <p className="text-gray-500 text-sm mt-1">Tạo tài khoản mới và phân vai trò.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên hiển thị <span className="text-red-500">*</span>
          </label>
          <input name="displayName" value={form.displayName} onChange={handleChange}
            placeholder="VD: Nguyễn Văn A"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên đăng nhập <span className="text-red-500">*</span>
          </label>
          <input name="username" value={form.username} onChange={handleChange}
            placeholder="VD: nguyenvana"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu <span className="text-red-500">*</span>
          </label>
          <input name="password" type="password" value={form.password} onChange={handleChange}
            placeholder="Tối thiểu 6 ký tự"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vai trò <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.role === r.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                  onChange={handleChange} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-500">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
            {saving ? 'Đang tạo...' : 'Tạo người dùng'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium">
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
