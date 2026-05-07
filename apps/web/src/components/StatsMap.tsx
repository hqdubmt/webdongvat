'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';
import type { Species } from '@/lib/api';

interface Props {
  species: Species[];
}

const STATUS_CONFIG = [
  { key: 'cr', fill: '#ef4444', label: 'Cực kỳ nguy cấp', short: 'CR' },
  { key: 'en', fill: '#f97316', label: 'Nguy cấp', short: 'EN' },
  { key: 'vu', fill: '#eab308', label: 'Sẽ nguy cấp', short: 'VU' },
  { key: 'lc', fill: '#22c55e', label: 'Ít lo ngại', short: 'LC' },
  { key: 'dd', fill: '#a78bfa', label: 'Thiếu dữ liệu', short: 'DD' },
  { key: 'unknown', fill: '#9ca3af', label: 'Chưa đánh giá', short: '?' },
] as const;

type StatusKey = typeof STATUS_CONFIG[number]['key'];

function getStatusKey(status: string | null): StatusKey {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  for (const { key } of STATUS_CONFIG) {
    if (key !== 'unknown' && s.includes(key)) return key;
  }
  return 'unknown';
}

function getConfig(key: StatusKey) {
  return STATUS_CONFIG.find((c) => c.key === key) ?? STATUS_CONFIG[STATUS_CONFIG.length - 1];
}

export default function StatsMap({ species }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  // markers grouped by status key
  const markersRef = useRef<Map<StatusKey, CircleMarker[]>>(new Map());

  const allKeys = STATUS_CONFIG.map((c) => c.key) as StatusKey[];
  const [activeKeys, setActiveKeys] = useState<Set<StatusKey>>(new Set(allKeys));
  const [search, setSearch] = useState('');

  // Build markers once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container).setView([16.0, 106.0], 6);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const grouped = new Map<StatusKey, CircleMarker[]>();

    species.forEach((s) => {
      const key = getStatusKey(s.conservationStatus);
      const { fill } = getConfig(key);
      const primaryImg = s.images.find((i) => i.isPrimary) ?? s.images[0];

      s.locations.forEach((loc) => {
        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 8,
          fillColor: fill,
          color: '#fff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.88,
        });

        // store species slug for search filtering
        (marker as unknown as { _speciesSlug: string; _speciesName: string })._speciesSlug = s.slug;
        (marker as unknown as { _speciesSlug: string; _speciesName: string })._speciesName = s.name.toLowerCase();

        const imgHtml = primaryImg
          ? `<img src="${primaryImg.url}" style="width:100%;height:72px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />`
          : '';

        marker.bindPopup(`
          <div style="min-width:180px;font-family:sans-serif;font-size:13px">
            ${imgHtml}
            <p style="font-weight:700;margin:0 0 2px;color:#111">${s.name}</p>
            <p style="font-style:italic;color:#666;margin:0 0 4px;font-size:11px">${s.scientificName}</p>
            ${s.conservationStatus ? `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;background:${fill}22;color:${fill};border:1px solid ${fill}55">${s.conservationStatus}</span>` : ''}
            ${loc.placeName ? `<p style="margin:6px 0 0;font-size:11px;color:#555">${loc.placeName}</p>` : ''}
            <div style="margin-top:8px;display:flex;gap:6px">
              <a href="/species/${s.slug}" target="_blank" style="font-size:11px;color:#2563eb;text-decoration:none">Xem chi tiết ↗</a>
              <a href="/admin/species/${s.slug}/edit" target="_blank" style="font-size:11px;color:#16a34a;text-decoration:none">Chỉnh sửa ↗</a>
            </div>
          </div>
        `, { maxWidth: 220 });

        marker.addTo(map);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(marker);
      });
    });

    markersRef.current = grouped;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = new Map();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker visibility when activeKeys or search changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const q = search.toLowerCase().trim();

    markersRef.current.forEach((markers, key) => {
      markers.forEach((marker) => {
        const name = (marker as unknown as { _speciesName: string })._speciesName ?? '';
        const visible = activeKeys.has(key) && (!q || name.includes(q));
        if (visible) {
          if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
          if (map.hasLayer(marker)) marker.removeFrom(map);
        }
      });
    });
  }, [activeKeys, search]);

  const toggleKey = useCallback((key: StatusKey) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setActiveKeys((prev) =>
      prev.size === allKeys.length ? new Set() : new Set(allKeys)
    );
  }, [allKeys]);

  // Count species per group
  const counts = new Map<StatusKey, number>();
  species.forEach((s) => {
    const key = getStatusKey(s.conservationStatus);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const totalLocations = species.reduce((sum, s) => sum + s.locations.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Control bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0 overflow-x-auto scrollbar-hide">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm loài trên bản đồ..."
            className="pl-7 pr-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 w-32 sm:w-44"
          />
        </div>

        <div className="w-px h-5 bg-gray-200" />

        {/* Toggle all */}
        <button
          onClick={toggleAll}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {activeKeys.size === allKeys.length ? 'Ẩn tất cả' : 'Hiện tất cả'}
        </button>

        {/* Per-status toggles */}
        {STATUS_CONFIG.map(({ key, fill, short, label }) => {
          const count = counts.get(key as StatusKey) ?? 0;
          if (!count) return null;
          const active = activeKeys.has(key as StatusKey);
          return (
            <button
              key={key}
              onClick={() => toggleKey(key as StatusKey)}
              title={label}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-400 border-gray-200'
              }`}
              style={active ? { backgroundColor: fill, borderColor: fill } : {}}
            >
              <span
                className="w-2 h-2 rounded-full border border-white/50"
                style={{ backgroundColor: active ? 'rgba(255,255,255,0.6)' : fill }}
              />
              {short} <span className={active ? 'opacity-80' : 'text-gray-400'}>{count}</span>
            </button>
          );
        })}

        {/* Summary */}
        <span className="text-xs text-gray-400 shrink-0 ml-2">
          {species.length} loài · {totalLocations} địa điểm
        </span>
      </div>

      {/* Map */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}
