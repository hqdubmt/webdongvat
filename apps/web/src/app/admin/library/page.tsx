'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface SampleImage {
  key: string;
  url: string;
  name: string;
  scientificName: string;
  conservationStatus: string;
  description: string;
  link: string;
  lastModified: string;
}

interface ScanResult {
  found: boolean;
  fromLibrary?: boolean;
  libraryLink?: string;
  name?: string;
  scientificName?: string;
  conservationStatus?: string;
  description?: string;
  confidence?: string;
  note?: string;
  sources?: { label: string; url: string }[];
}

interface PendingFile {
  file: File;
  name: string;
  scientificName: string;
  conservationStatus: string;
  link: string;
  preview: string;
  lockedName?: boolean;
}

export default function LibraryPage() {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const groupAddInputRef = useRef<HTMLInputElement>(null);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

  const [images, setImages] = useState<SampleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState('');

  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [scanningGroup, setScanningGroup] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingSciName, setEditingSciName] = useState('');
  const [editingStatus, setEditingStatus] = useState('');
  const [editingLink, setEditingLink] = useState('');
  const editNameRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/samples', { cache: 'no-store' });
      const data = await res.json();
      setImages(data.data || []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const groupedImages = useMemo(() => {
    const map: Record<string, SampleImage[]> = {};
    for (const img of images) {
      const key = img.name || `__key_${img.key}`;
      if (!map[key]) map[key] = [];
      map[key].push(img);
    }
    return Object.entries(map).sort((a, b) => {
      const at = Math.max(...a[1].map(i => new Date(i.lastModified).getTime()));
      const bt = Math.max(...b[1].map(i => new Date(i.lastModified).getTime()));
      return bt - at;
    });
  }, [images]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, groupName?: string) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const groupImgs = groupName ? groupedImages.find(([k]) => k === groupName)?.[1] : undefined;
    const first = groupImgs?.[0];
    const newPending: PendingFile[] = files.map((f) => ({
      file: f,
      name: groupName || f.name.replace(/\.[^.]+$/, ''),
      scientificName: first?.scientificName || '',
      conservationStatus: first?.conservationStatus || '',
      link: first?.link || '',
      preview: URL.createObjectURL(f),
      lockedName: !!groupName,
    }));
    setPending((p) => [...p, ...newPending]);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (groupAddInputRef.current) groupAddInputRef.current.value = '';
    setAddingToGroup(null);
  }

  function removePending(idx: number) {
    setPending((p) => { URL.revokeObjectURL(p[idx].preview); return p.filter((_, i) => i !== idx); });
  }

  function updatePending(idx: number, field: keyof PendingFile, value: string) {
    setPending((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleConfirmUpload() {
    if (!pending.length) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      pending.forEach((p) => fd.append('images', p.file));
      fd.append('names', JSON.stringify(pending.map((p) => p.name)));
      fd.append('scientificNames', JSON.stringify(pending.map((p) => p.scientificName)));
      fd.append('conservationStatuses', JSON.stringify(pending.map((p) => p.conservationStatus)));
      fd.append('links', JSON.stringify(pending.map((p) => p.link)));
      const res = await fetch('/api/samples', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setUploadError(err.error || `Lỗi ${res.status}`);
        return;
      }
      pending.forEach((p) => URL.revokeObjectURL(p.preview));
      setPending([]);
      await fetchImages();
    } catch {
      setUploadError('Lỗi kết nối, thử lại.');
    } finally {
      setUploading(false);
    }
  }

  async function handleScanGroup(groupKey: string, imgs: SampleImage[]) {
    setScanningGroup(groupKey);
    setScanResults((p) => { const n = { ...p }; delete n[groupKey]; return n; });
    try {
      const blob = await fetch(imgs[0].url).then((r) => r.blob());
      const fd = new FormData();
      fd.append('image', blob, 'sample.jpg');
      const res = await fetch('/api/ai/identify', { method: 'POST', body: fd });
      const data: ScanResult = await res.json();
      setScanResults((p) => ({ ...p, [groupKey]: data }));
    } catch {
      setScanResults((p) => ({ ...p, [groupKey]: { found: false, note: 'Lỗi kết nối.' } }));
    } finally {
      setScanningGroup(null);
    }
  }

  async function handleDeleteImage(img: SampleImage) {
    if (!confirm('Xóa ảnh này khỏi thư viện?')) return;
    setDeletingKey(img.key);
    try {
      await fetch(`/api/samples/${btoa(img.key)}`, { method: 'DELETE' });
      await fetch('/api/ai/identify/reset', { method: 'POST' });
      setImages((p) => p.filter((i) => i.key !== img.key));
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleDeleteGroup(groupKey: string, imgs: SampleImage[]) {
    const label = groupKey.startsWith('__key_') ? 'nhóm ảnh này' : `"${groupKey}"`;
    if (!confirm(`Xóa tất cả ${imgs.length} ảnh của ${label}?`)) return;
    setDeletingKey(groupKey);
    try {
      await Promise.all(imgs.map(img => fetch(`/api/samples/${btoa(img.key)}`, { method: 'DELETE' })));
      await fetch('/api/ai/identify/reset', { method: 'POST' });
      setImages((p) => p.filter((i) => !imgs.some(g => g.key === i.key)));
      setScanResults((p) => { const n = { ...p }; delete n[groupKey]; return n; });
    } finally {
      setDeletingKey(null);
    }
  }

  function startEditGroup(groupKey: string, imgs: SampleImage[]) {
    const first = imgs[0];
    setEditingGroup(groupKey);
    setEditingName(first.name || '');
    setEditingSciName(first.scientificName || '');
    setEditingStatus(first.conservationStatus || '');
    setEditingLink(first.link || '');
    setTimeout(() => editNameRef.current?.focus(), 50);
  }

  async function commitEditGroup(groupKey: string, imgs: SampleImage[]) {
    if (editingGroup !== groupKey) return;
    setEditingGroup(null);
    const newName = editingName.trim();
    const newSci = editingSciName.trim();
    const newStatus = editingStatus;
    const newLink = editingLink.trim();
    const first = imgs[0];
    if (newName === first.name && newSci === (first.scientificName || '') && newStatus === (first.conservationStatus || '') && newLink === (first.link || '')) return;
    setImages((p) => p.map((i) => imgs.some(g => g.key === i.key) ? { ...i, name: newName, scientificName: newSci, conservationStatus: newStatus, link: newLink } : i));
    await Promise.all(imgs.map(img => fetch(`/api/samples/${btoa(img.key)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, scientificName: newSci, conservationStatus: newStatus, link: newLink }),
    })));
  }

  function handleCreateFromScan(imgs: SampleImage[], result: ScanResult) {
    sessionStorage.setItem('ai_prefill', JSON.stringify({ ...result, imageUrl: imgs[0].url }));
    router.push('/admin/species/new');
  }

  const STATUS_OPTIONS = ['Cực kỳ nguy cấp (CR)', 'Nguy cấp (EN)', 'Dễ bị tổn thương (VU)', 'Gần bị đe dọa (NT)', 'Ít lo ngại (LC)', 'Thiếu dữ liệu (DD)'];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thư viện ảnh mẫu</h1>
          <p className="text-sm text-gray-500 mt-1">Mỗi loài có thể có nhiều ảnh — AI so sánh tất cả khi nhận dạng</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer bg-green-600 hover:bg-green-700 text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Thêm loài mới
          <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileSelect(e)} />
        </label>
      </div>

      {/* Hidden input for adding images to existing group */}
      <input
        ref={groupAddInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e, addingToGroup || undefined)}
      />

      {pending.length > 0 && (
        <div className="mb-6 bg-white border border-green-200 rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Điền thông tin trước khi tải lên ({pending.length} ảnh):</p>
          <div className="space-y-5 max-h-[32rem] overflow-y-auto pr-1">
            {pending.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0 mt-0.5" />
                <div className="flex-1 grid grid-cols-2 gap-1.5">
                  <input value={p.name} onChange={(e) => updatePending(i, 'name', e.target.value)} disabled={p.lockedName}
                    placeholder="Tên loài *" className="col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500" />
                  <input value={p.scientificName} onChange={(e) => updatePending(i, 'scientificName', e.target.value)}
                    placeholder="Tên khoa học" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 italic" />
                  <select value={p.conservationStatus} onChange={(e) => updatePending(i, 'conservationStatus', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Tình trạng bảo tồn</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input value={p.link} onChange={(e) => updatePending(i, 'link', e.target.value)}
                    placeholder="Link bài viết (tùy chọn)" className="col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-blue-600" />
                </div>
                <button onClick={() => removePending(i)} className="text-gray-400 hover:text-red-500 shrink-0 mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleConfirmUpload} disabled={uploading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {uploading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang tải lên...</> : 'Xác nhận tải lên'}
            </button>
            <button onClick={() => { pending.forEach((p) => URL.revokeObjectURL(p.preview)); setPending([]); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600">Hủy</button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Đang tải...
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p className="text-sm">Chưa có ảnh nào. Nhấn &quot;Thêm loài mới&quot; để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groupedImages.map(([groupKey, imgs]) => {
            const result = scanResults[groupKey];
            const isScanning = scanningGroup === groupKey;
            const isLibraryMatch = result?.fromLibrary === true;
            const isUnnamed = groupKey.startsWith('__key_');
            const first = imgs[0];

            return (
              <div key={groupKey} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isLibraryMatch ? 'border-purple-400 ring-2 ring-purple-300' : 'border-gray-200'}`}>
                {/* Image strip */}
                <div className="flex gap-1.5 p-2 bg-gray-50 overflow-x-auto">
                  {imgs.map((img) => (
                    <div key={img.key} className="relative shrink-0 group/thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                      <button
                        onClick={() => handleDeleteImage(img)}
                        disabled={deletingKey === img.key}
                        title="Xóa ảnh này"
                        className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity text-xs leading-none disabled:opacity-40"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => { setAddingToGroup(groupKey); setTimeout(() => groupAddInputRef.current?.click(), 0); }}
                    title="Thêm ảnh cho loài này"
                    className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center text-gray-400 hover:text-green-600 transition-colors gap-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    <span className="text-xs">Thêm</span>
                  </button>
                </div>

                {/* Metadata */}
                <div className="px-3 py-2 border-b border-gray-100">
                  {editingGroup === groupKey ? (
                    <div className="space-y-1.5">
                      <input ref={editNameRef} value={editingName} onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditingGroup(null); }}
                        placeholder="Tên loài *" className="w-full text-sm border border-purple-400 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      <input value={editingSciName} onChange={(e) => setEditingSciName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setEditingGroup(null); }}
                        placeholder="Tên khoa học" className="w-full text-sm border border-purple-300 rounded px-2 py-1.5 focus:outline-none italic" />
                      <select value={editingStatus} onChange={(e) => setEditingStatus(e.target.value)}
                        className="w-full text-sm border border-purple-300 rounded px-2 py-1.5 focus:outline-none bg-white">
                        <option value="">Tình trạng bảo tồn</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input value={editingLink} onChange={(e) => setEditingLink(e.target.value)}
                        onBlur={() => commitEditGroup(groupKey, imgs)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEditGroup(groupKey, imgs); if (e.key === 'Escape') setEditingGroup(null); }}
                        placeholder="Link bài viết" className="w-full text-sm border border-purple-300 rounded px-2 py-1.5 focus:outline-none text-blue-600" />
                      <button onClick={() => commitEditGroup(groupKey, imgs)} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded font-medium">Lưu</button>
                    </div>
                  ) : (
                    <button onClick={() => startEditGroup(groupKey, imgs)} title="Nhấn để chỉnh sửa" className="w-full text-left group/edit">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-800 truncate flex-1 group-hover/edit:text-purple-600">
                          {isUnnamed ? <span className="text-gray-400 italic font-normal text-xs">Nhấn để đặt tên...</span> : groupKey}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-full">{imgs.length} ảnh</span>
                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-300 group-hover/edit:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </div>
                      {first.scientificName && <p className="text-xs text-gray-400 italic truncate mt-0.5">{first.scientificName}</p>}
                      {first.conservationStatus && <p className="text-xs text-orange-600 font-medium">{first.conservationStatus}</p>}
                      {first.link && <p className="text-xs text-blue-500 truncate">{first.link}</p>}
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="px-3 py-2 flex gap-2">
                  <button onClick={() => handleScanGroup(groupKey, imgs)} disabled={isScanning}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs px-2 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5">
                    {isScanning
                      ? <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang quét...</>
                      : 'Quét AI'}
                  </button>
                  <button onClick={() => handleDeleteGroup(groupKey, imgs)} disabled={!!deletingKey}
                    className="bg-red-50 hover:bg-red-100 text-red-600 text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50">
                    Xóa tất cả
                  </button>
                </div>

                {/* Scan result */}
                {result && (
                  <div className={`px-3 py-2.5 text-xs border-t ${result.found ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                    {result.found ? (
                      <>
                        {result.name && <p className="font-semibold text-gray-800 truncate">{result.name}</p>}
                        {result.scientificName && <p className="text-gray-500 italic truncate">{result.scientificName}</p>}
                        {result.conservationStatus && <p className="text-orange-600 font-medium">{result.conservationStatus}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.fromLibrary && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Từ thư viện</span>}
                          {!result.fromLibrary && result.confidence && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${result.confidence === 'high' ? 'bg-green-100 text-green-700' : result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                              {result.confidence === 'high' ? 'Cao' : result.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                            </span>
                          )}
                        </div>
                        {result.fromLibrary && result.libraryLink ? (
                          <a href={result.libraryLink} target="_blank" rel="noopener noreferrer" className="mt-1 block text-blue-600 hover:underline truncate">Bài viết tham khảo ↗</a>
                        ) : (!result.fromLibrary && result.sources?.length) ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {result.sources.map((s) => (
                              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{s.label} ↗</a>
                            ))}
                          </div>
                        ) : null}
                        <button onClick={() => handleCreateFromScan(imgs, result)}
                          className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded-md text-xs font-medium">
                          Tạo loài từ ảnh này →
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-500">{result.note || 'Không nhận ra loài.'}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
