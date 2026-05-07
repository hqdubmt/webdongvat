'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchUsers, updateUser, type AdminUser, type UserRole } from '@/lib/api';

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'SUPERADMIN', label: 'Superadmin', desc: 'Quản lý user + toàn bộ hệ thống' },
  { value: 'ADMIN', label: 'Admin', desc: 'Toàn quyền với dữ liệu loài' },
  { value: 'EDITOR', label: 'Editor', desc: 'Chỉnh sửa, tải ảnh/video, không xóa loài' },
];

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({ displayName: '', role: 'EDITOR' as UserRole, password: '' });

  useEffect(() => {
    fetchUsers().then((users) => {
      const found = users.find((u) => u.id === parseInt(id, 10));
      if (found) {
        setUser(found);
        setForm({ displayName: found.displayName, role: found.role, password: '' });
      }
    });
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveMsg('');
    try {
      const data: { displayName?: string; role?: UserRole; password?: string } = {
        displayName: form.displayName,
        role: form.role,
      };
      if (form.password) data.password = form.password;
      await updateUser(parseInt(id, 10), data);
      setSaveMsg('Đã lưu!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div className="text-gray-500 text-sm">Đang tải...</div>;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa người dùng</h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">@{user.username}</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {saveMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{saveMsg}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
          <input name="displayName" value={form.displayName} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới <span className="text-gray-400 font-normal">(để trống nếu không đổi)</span>
          </label>
          <input name="password" type="password" value={form.password} onChange={handleChange}
            placeholder="Nhập mật khẩu mới..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.role === r.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className="mt-0.5" />
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
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <button type="button" onClick={() => router.push('/admin/users')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium">
            Quay lại
          </button>
        </div>
      </form>
    </div>
  );
}
