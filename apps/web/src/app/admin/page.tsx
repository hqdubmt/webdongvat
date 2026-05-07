'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { adminFetchSpeciesList, deleteSpecies, revalidateCache, type Species } from '@/lib/api';
import { getConservationStatusColor } from '@/lib/utils';
import StatsMapWrapper from '@/components/StatsMapWrapper';

const STATUS_GROUPS = [
  { key: 'CR', label: 'Cực kỳ nguy cấp', match: 'cr' },
  { key: 'EN', label: 'Nguy cấp', match: 'en' },
  { key: 'VU', label: 'Sẽ nguy cấp', match: 'vu' },
  { key: 'LC', label: 'Ít lo ngại', match: 'lc' },
];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [list, setList] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [userRole, setUserRole] = useState<string>('ADMIN');
  const canDelete = userRole !== 'EDITOR';

  function load() {
    setLoading(true);
    adminFetchSpeciesList()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetch('/api/auth/me').then((r) => r.json()).then((d) => { if (d.role) setUserRole(d.role); }).catch(() => {});
  }, []);

  async function handleDelete(slug: string, name: string) {
    if (!confirm(`Xóa "${name}"?\n\nTất cả ảnh và tọa độ của loài này cũng sẽ bị xóa. Hành động này không thể hoàn tác.`)) return;
    setDeleting(slug);
    try {
      await deleteSpecies(slug);
      await revalidateCache(slug);
      setList((prev) => prev.filter((s) => s.slug !== slug));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại');
    } finally {
      setDeleting(null);
    }
  }

  const stats = useMemo(() => {
    const total = list.length;
    const byStatus: Record<string, number> = {};
    STATUS_GROUPS.forEach(({ key, match }) => {
      byStatus[key] = list.filter((s) =>
        s.conservationStatus?.toLowerCase().includes(match)
      ).length;
    });
    const noImage = list.filter((s) => s.images.length === 0).length;
    return { total, byStatus, noImage };
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.slug.includes(q);
      const matchStatus =
        !filterStatus ||
        s.conservationStatus?.toLowerCase().includes(filterStatus.toLowerCase());
      return matchSearch && matchStatus;
    });
  }, [list, search, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-500">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <p className="font-medium">Không thể tải dữ liệu</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={load} className="mt-3 text-sm underline">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quản lý loài</h1>
          <p className="text-sm text-gray-500 mt-0.5">Toàn bộ dữ liệu loài động vật trong hệ thống</p>
        </div>
        {canDelete && (
          <Link
            href="/admin/species/new"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm loài mới
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Tổng loài" value={stats.total} color="bg-white border-gray-200 text-gray-800" />
        <StatCard label="Cực kỳ nguy cấp (CR)" value={stats.byStatus['CR']} color="bg-red-50 border-red-200 text-red-800" />
        <StatCard label="Nguy cấp (EN)" value={stats.byStatus['EN']} color="bg-orange-50 border-orange-200 text-orange-800" />
        <StatCard label="Sẽ nguy cấp (VU)" value={stats.byStatus['VU']} color="bg-yellow-50 border-yellow-200 text-yellow-800" />
        <StatCard label="Ít lo ngại (LC)" value={stats.byStatus['LC']} color="bg-green-50 border-green-200 text-green-800" />
        <StatCard label="Chưa có ảnh" value={stats.noImage} color="bg-gray-50 border-gray-200 text-gray-600" />
      </div>

      {/* Stats Map */}
      {list.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm h-64 sm:h-96 lg:h-[480px]">
          <StatsMapWrapper species={list} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tên loài, tên khoa học, slug..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">Tất cả tình trạng</option>
          {STATUS_GROUPS.map((g) => (
            <option key={g.key} value={g.match}>{g.key} - {g.label}</option>
          ))}
          <option value="dd">DD - Thiếu dữ liệu</option>
        </select>
        {(search || filterStatus) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 px-2"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Loài</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tình trạng</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Ảnh</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Tọa độ</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s, idx) => {
                  const primaryImg = s.images.find((i) => i.isPrimary) ?? s.images[0];
                  return (
                    <tr key={s.slug} className="hover:bg-gray-50 transition-colors">
                      {/* # */}
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>

                      {/* Ảnh + tên */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                            {primaryImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={primaryImg.url}
                                alt={s.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400 italic truncate">{s.scientificName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tình trạng */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {s.conservationStatus ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getConservationStatusColor(s.conservationStatus)}`}>
                            {s.conservationStatus}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Chưa đánh giá</span>
                        )}
                      </td>

                      {/* Ảnh */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-medium ${s.images.length === 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                          {s.images.length === 0 ? 'Chưa có ảnh' : `${s.images.length} ảnh`}
                        </span>
                      </td>

                      {/* Tọa độ */}
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                        {s.locations.length > 0 ? `${s.locations.length} địa điểm` : <span className="text-gray-300">—</span>}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/species/${s.slug}`}
                            target="_blank"
                            title="Xem trang công khai"
                            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/admin/species/${s.slug}/edit`}
                            title="Chỉnh sửa"
                            className="p-1.5 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(s.slug, s.name)}
                              disabled={deleting === s.slug}
                              title="Xóa loài"
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              {deleting === s.slug ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            {search || filterStatus ? (
              <>
                <p className="text-base">Không tìm thấy kết quả.</p>
                <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="mt-2 text-sm text-green-600 hover:underline">
                  Xóa bộ lọc
                </button>
              </>
            ) : (
              <>
                <p className="text-base">Chưa có loài nào.</p>
                <Link href="/admin/species/new" className="mt-2 inline-block text-sm text-green-600 hover:underline">
                  Thêm loài đầu tiên
                </Link>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
            <span>
              Hiển thị {filtered.length} / {list.length} loài
              {(search || filterStatus) && ' (đang lọc)'}
            </span>
            <button onClick={load} className="hover:text-gray-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
