'use client';

import { useState, useRef } from 'react';

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

export default function SpeciesScanWidget() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setResult(null);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch('/api/ai/identify', { method: 'POST', body: fd });
      const data: ScanResult = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, note: 'Lỗi kết nối, thử lại.' });
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <h2 className="text-base font-semibold text-gray-900">Nhận dạng loài từ ảnh</h2>
      </div>

      <p className="text-xs text-gray-400 mb-3">Chụp hoặc chọn ảnh động vật để nhận dạng</p>

      <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${scanning ? 'bg-purple-50 text-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
        {scanning ? (
          <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang nhận dạng...</>
        ) : (
          <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Chọn ảnh để quét</>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleScan} disabled={scanning} />
      </label>

      {result && (
        <div className={`mt-3 rounded-xl border p-3 text-sm ${result.found ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
          {result.found ? (
            <>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-0.5 flex-1 min-w-0">
                  {result.name && <p className="font-bold text-gray-900 truncate">{result.name}</p>}
                  {result.scientificName && <p className="italic text-gray-500 text-xs truncate">{result.scientificName}</p>}
                  {result.conservationStatus && <p className="text-orange-600 font-medium text-xs">{result.conservationStatus}</p>}
                  {result.description && <p className="text-gray-600 text-xs mt-1 leading-relaxed">{result.description}</p>}
                  {result.fromLibrary && <p className="text-xs font-semibold text-blue-700 mt-1">Đã có trong thư viện của bạn</p>}
                  {result.confidence && !result.fromLibrary && (
                    <p className="text-xs text-gray-400">Độ tin cậy: <span className={result.confidence === 'high' ? 'text-green-600 font-medium' : result.confidence === 'medium' ? 'text-yellow-600 font-medium' : 'text-red-500 font-medium'}>{result.confidence === 'high' ? 'Cao' : result.confidence === 'medium' ? 'Trung bình' : 'Thấp'}</span></p>
                  )}
                </div>
                <button onClick={() => setResult(null)} className="text-gray-300 hover:text-gray-500 shrink-0 text-base leading-none">✕</button>
              </div>

              {result.fromLibrary && result.libraryLink ? (
                <a href={result.libraryLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                  Bài viết tham khảo ↗
                </a>
              ) : !result.fromLibrary && result.sources?.length ? (
                <div className="pt-2 border-t border-purple-100">
                  <p className="text-xs text-gray-400 mb-1">Nguồn tham khảo:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((s) => (
                      <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-medium">{s.label} ↗</a>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-gray-500 text-xs">{result.note || 'Không nhận ra loài trong ảnh.'}</p>
              <button onClick={() => setResult(null)} className="text-gray-300 hover:text-gray-500 shrink-0">✕</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
