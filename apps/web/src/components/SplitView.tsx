'use client';

import { useState, useMemo, useRef } from 'react';
import type { Species } from '@/lib/api';
import { getConservationStatusColor } from '@/lib/utils';
import SpeciesDetailPanel from './SpeciesDetailPanel';

interface ScanResult {
  found: boolean;
  fromLibrary?: boolean;
  libraryLink?: string;
  name?: string;
  scientificName?: string;
  conservationStatus?: string;
  description?: string;
  confidence?: string;
  sources?: { label: string; url: string }[];
  note?: string;
  matchedSlug?: string;
}

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { label: 'Tất cả', value: '' },
  { label: 'CR', value: 'cr' },
  { label: 'EN', value: 'en' },
  { label: 'VU', value: 'vu' },
  { label: 'LC', value: 'lc' },
  { label: 'DD', value: 'dd' },
];

function getShortStatus(status: string): string {
  const match = status.match(/\(([A-Z]+)\)/);
  return match ? match[1] : status.substring(0, 2).toUpperCase();
}

export default function SplitView({ species }: { species: Species[] }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(species[0]?.slug ?? null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = species;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.scientificName.toLowerCase().includes(q)
      );
    }
    if (filterStatus) {
      result = result.filter((s) =>
        s.conservationStatus?.toLowerCase().includes(filterStatus)
      );
    }
    return result;
  }, [species, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSelect(slug: string) {
    setSelectedSlug(slug);
    setShowDetail(true);
  }

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  function handleFilter(val: string) {
    setFilterStatus(val);
    setPage(1);
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanResult(null);
    const fd = new FormData();
    fd.append('image', file);
    if (scanInputRef.current) scanInputRef.current.value = '';
    try {
      const res = await fetch('/api/ai/identify', { method: 'POST', body: fd });
      const data = await res.json();
      // Use slug from API (species DB match) or fall back to name matching
      let matchedSlug: string | undefined = data.matchedSlug;
      if (!matchedSlug && data.found && (data.scientificName || data.name)) {
        const sciLower = data.scientificName?.toLowerCase() ?? '';
        const nameLower = data.name?.toLowerCase() ?? '';
        const match = species.find(
          (s) =>
            (sciLower && s.scientificName.toLowerCase().includes(sciLower)) ||
            (sciLower && sciLower.includes(s.scientificName.toLowerCase())) ||
            (nameLower && s.name.toLowerCase().includes(nameLower))
        );
        matchedSlug = match?.slug;
      }
      setScanResult({ ...data, matchedSlug });
    } catch {
      setScanResult({ found: false, note: 'Lỗi kết nối. Thử lại.' });
    } finally {
      setScanning(false);
    }
  }

  function openMatchedSpecies(slug: string) {
    setSelectedSlug(slug);
    setShowDetail(true);
    setScanResult(null);
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ── Left panel ── */}
      <div
        className={`flex-col border-r border-gray-200 bg-white shrink-0 w-full lg:w-72 xl:w-80 ${
          showDetail ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search + filter */}
        <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
          <div className="relative flex gap-1.5">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Tìm kiếm loài..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            {/* Camera scan button */}
            <label className={`flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer transition-colors shrink-0 ${scanning ? 'bg-purple-50 border-purple-200' : 'border-gray-200 hover:bg-purple-50 hover:border-purple-300'}`} title="Nhận dạng loài từ ảnh">
              {scanning ? (
                <svg className="animate-spin w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              )}
              <input ref={scanInputRef} type="file" accept="image/*" className="hidden" onChange={handleScan} disabled={scanning} />
            </label>
          </div>

          {/* Scan result */}
          {scanResult && (
            <div className={`rounded-lg border p-2.5 text-xs ${scanResult.found ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
              {scanResult.found ? (
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {scanResult.name && <p className="font-semibold text-gray-900">{scanResult.name}</p>}
                      {scanResult.scientificName && <p className="italic text-gray-500">{scanResult.scientificName}</p>}
                      {scanResult.conservationStatus && <p className="text-gray-600 mt-0.5">{scanResult.conservationStatus}</p>}
                      {scanResult.description && <p className="text-gray-500 mt-1 leading-relaxed">{scanResult.description}</p>}
                      {scanResult.confidence && (
                        <p className="text-gray-400 mt-0.5">
                          Độ tin cậy: <span className={scanResult.confidence === 'high' ? 'text-green-600 font-medium' : scanResult.confidence === 'medium' ? 'text-yellow-600 font-medium' : 'text-red-500 font-medium'}>
                            {scanResult.confidence === 'high' ? 'Cao' : scanResult.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                          </span>
                        </p>
                      )}
                    </div>
                    <button onClick={() => setScanResult(null)} className="text-gray-300 hover:text-gray-500 shrink-0">✕</button>
                  </div>
                  {scanResult.matchedSlug ? (
                    <button
                      onClick={() => openMatchedSpecies(scanResult.matchedSlug!)}
                      className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                      Xem loài này trong hệ thống
                    </button>
                  ) : scanResult.fromLibrary ? (
                    <p className="text-blue-600 font-medium text-xs">Đã có trong thư viện của bạn.</p>
                  ) : (
                    <p className="text-gray-400 italic">Chưa có trong hệ thống.</p>
                  )}
                  {scanResult.fromLibrary && scanResult.libraryLink ? (
                    <div className="pt-1.5 border-t border-purple-100">
                      <p className="text-gray-400 mb-1">Nguồn tham khảo:</p>
                      <a href={scanResult.libraryLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        Bài viết tham khảo ↗
                      </a>
                    </div>
                  ) : (!scanResult.fromLibrary && scanResult.sources && scanResult.sources.length > 0) && (
                    <div className="pt-1.5 border-t border-purple-100">
                      <p className="text-gray-400 mb-1">Nguồn tham khảo:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {scanResult.sources.map((s) => (
                          <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                            {s.label} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-gray-500">{scanResult.note || 'Không nhận ra loài trong ảnh.'}</p>
                  <button onClick={() => setScanResult(null)} className="text-gray-300 hover:text-gray-500 shrink-0">✕</button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilter(f.value)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === f.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{filtered.length} loài</p>
        </div>

        {/* Species list */}
        <div className="flex-1 overflow-y-auto">
          {pageItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Không tìm thấy kết quả</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {pageItems.map((s, idx) => {
                const primaryImg = s.images.find((i) => i.isPrimary) ?? s.images[0];
                const active = s.slug === selectedSlug;
                return (
                  <li key={s.slug}>
                    <button
                      onClick={() => handleSelect(s.slug)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
                        active
                          ? 'bg-green-50 border-l-green-500'
                          : 'border-l-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xs text-gray-300 w-5 text-right shrink-0">
                        {(safePage - 1) * PAGE_SIZE + idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {primaryImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={primaryImg.url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate leading-snug ${active ? 'text-green-700' : 'text-gray-900'}`}>
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-400 italic truncate">{s.scientificName}</p>
                      </div>
                      {s.conservationStatus && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-bold shrink-0 ${getConservationStatusColor(s.conservationStatus)}`}>
                          {getShortStatus(s.conservationStatus)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100 bg-gray-50 shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Trước
          </button>
          <span className="text-xs text-gray-500 font-medium">
            Trang {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Sau
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div
        className={`flex-1 bg-gray-50 overflow-y-auto ${
          showDetail ? 'block' : 'hidden lg:block'
        }`}
      >
        {selectedSlug ? (
          <SpeciesDetailPanel
            key={selectedSlug}
            slug={selectedSlug}
            onBack={() => setShowDetail(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">Chọn một loài để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
}
