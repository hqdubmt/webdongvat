'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SampleImage {
  key: string;
  url: string;
  name: string;
  lastModified: string;
}

interface ScanResult {
  found: boolean;
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
  preview: string;
}

function matchesLibrary(result: ScanResult, images: SampleImage[]): SampleImage[] {
  if (!result.found) return [];
  const haystack = images.filter((img) => img.name.trim());
  return haystack.filter((img) => {
    const n = img.name.toLowerCase();
    return (
      (result.name && n.includes(result.name.toLowerCase())) ||
      (result.scientificName && n.includes(result.scientificName.toLowerCase())) ||
      (result.name && result.name.toLowerCase().includes(n))
    );
  });
}

export default function LibraryPage() {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<SampleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState('');

  // Pending upload (before confirm)
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Scan state
  const [scanningKey, setScanningKey] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPending: PendingFile[] = files.map((f) => ({
      file: f,
      name: f.name.replace(/\.[^.]+$/, ''),
      preview: URL.createObjectURL(f),
    }));
    setPending((p) => [...p, ...newPending]);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }

  function removePending(idx: number) {
    setPending((p) => {
      URL.revokeObjectURL(p[idx].preview);
      return p.filter((_, i) => i !== idx);
    });
  }

  async function handleConfirmUpload() {
    if (!pending.length) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      pending.forEach((p) => fd.append('images', p.file));
      fd.append('names', JSON.stringify(pending.map((p) => p.name)));
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

  async function handleScan(img: SampleImage) {
    setScanningKey(img.key);
    setScanResults((p) => { const n = { ...p }; delete n[img.key]; return n; });
    try {
      const blob = await fetch(img.url).then((r) => r.blob());
      const fd = new FormData();
      fd.append('image', blob, 'sample.jpg');
      const res = await fetch('/api/ai/identify', { method: 'POST', body: fd });
      const data: ScanResult = await res.json();
      setScanResults((p) => ({ ...p, [img.key]: data }));
    } catch {
      setScanResults((p) => ({ ...p, [img.key]: { found: false, note: 'Lỗi kết nối.' } }));
    } finally {
      setScanningKey(null);
    }
  }

  async function handleDelete(img: SampleImage) {
    if (!confirm('Xóa ảnh này khỏi thư viện?')) return;
    setDeletingKey(img.key);
    try {
      await fetch(`/api/samples/${btoa(img.key)}`, { method: 'DELETE' });
      setImages((p) => p.filter((i) => i.key !== img.key));
      setScanResults((p) => { const n = { ...p }; delete n[img.key]; return n; });
    } finally {
      setDeletingKey(null);
    }
  }

  function handleCreateFromScan(img: SampleImage, result: ScanResult) {
    sessionStorage.setItem('ai_prefill', JSON.stringify({ ...result, imageUrl: img.url }));
    router.push('/admin/species/new');
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thư viện ảnh mẫu</h1>
          <p className="text-sm text-gray-500 mt-1">Upload ảnh, đặt tên, rồi quét AI để nhận dạng và tạo loài mới</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer bg-green-600 hover:bg-green-700 text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Chọn ảnh
          <input ref={uploadInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
        </label>
      </div>

      {/* Pending upload panel */}
      {pending.length > 0 && (
        <div className="mb-6 bg-white border border-green-200 rounded-xl shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Đặt tên cho ảnh trước khi tải lên ({pending.length} ảnh):</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {pending.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 shrink-0" />
                <input
                  value={p.name}
                  onChange={(e) => setPending((prev) => prev.map((item, idx) => idx === i ? { ...item, name: e.target.value } : item))}
                  placeholder="Tên loài (VD: Hổ Bengal, Gấu Trúc...)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button onClick={() => removePending(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {uploading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Đang tải lên...</> : 'Xác nhận tải lên'}
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

      {/* Image grid */}
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
          <p className="text-sm">Chưa có ảnh nào. Chọn ảnh để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => {
            const result = scanResults[img.key];
            const isScanning = scanningKey === img.key;
            const matches = result ? matchesLibrary(result, images) : [];
            const isSelf = matches.some((m) => m.key === img.key);

            return (
              <div key={img.key} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isSelf ? 'border-purple-400 ring-2 ring-purple-300' : 'border-gray-200'}`}>
                <div className="relative group aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => handleScan(img)} disabled={isScanning}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50">
                      {isScanning ? 'Đang quét...' : 'Quét AI'}
                    </button>
                    <button onClick={() => handleDelete(img)} disabled={deletingKey === img.key}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50">
                      Xóa
                    </button>
                  </div>
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    </div>
                  )}
                  {isSelf && (
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      ✓ Khớp
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="px-2.5 py-1.5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-700 truncate">{img.name || <span className="text-gray-400 italic">Chưa đặt tên</span>}</p>
                </div>

                {/* Scan result */}
                {result && (
                  <div className={`p-2.5 text-xs ${result.found ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    {result.found ? (
                      <>
                        {result.name && <p className="font-semibold text-gray-800 truncate">{result.name}</p>}
                        {result.scientificName && <p className="text-gray-500 italic truncate">{result.scientificName}</p>}
                        {result.confidence && (
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-medium ${result.confidence === 'high' ? 'bg-green-100 text-green-700' : result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {result.confidence === 'high' ? 'Cao' : result.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                          </span>
                        )}
                        {matches.length > 0 && (
                          <p className="mt-1 text-purple-700 font-medium">✓ Tìm thấy {matches.length} ảnh khớp trong thư viện</p>
                        )}
                        {result.sources && result.sources.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {result.sources.map((s) => (
                              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{s.label} ↗</a>
                            ))}
                          </div>
                        )}
                        <button onClick={() => handleCreateFromScan(img, result)}
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
