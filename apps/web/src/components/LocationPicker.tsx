'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import type { Map as LeafletMap, Marker } from 'leaflet';

interface Props {
  onConfirm: (lat: number, lng: number) => void;
}

// Vietnam center
const DEFAULT_CENTER: [number, number] = [16.0, 106.0];
const DEFAULT_ZOOM = 6;

export default function LocationPicker({ onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function applyLocation(map: LeafletMap, lat: number, lng: number) {
    const rounded = { lat: Math.round(lat * 100000) / 100000, lng: Math.round(lng * 100000) / 100000 };
    if (markerRef.current) {
      markerRef.current.setLatLng([rounded.lat, rounded.lng]);
    } else {
      markerRef.current = L.marker([rounded.lat, rounded.lng]).addTo(map);
    }
    map.setView([rounded.lat, rounded.lng], 13);
    setPicked(rounded);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      applyLocation(map, lat, lng);
    });

    // Auto-locate on mount
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          applyLocation(map, coords.latitude, coords.longitude);
          setLocating(false);
        },
        () => setLocating(false),
        { timeout: 8000 },
      );
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useGPS() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (mapRef.current) applyLocation(mapRef.current, coords.latitude, coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Bấm vào bản đồ để chọn vị trí</p>
        <button
          type="button"
          onClick={useGPS}
          disabled={locating}
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locating ? 'Đang định vị...' : 'Dùng vị trí của tôi'}
        </button>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ height: 300 }} className="w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100" />

      {/* Picked coords + confirm */}
      {picked ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-xs font-mono text-green-800">
            {picked.lat.toFixed(5)}°N, {picked.lng.toFixed(5)}°E
          </span>
          <button
            type="button"
            onClick={() => onConfirm(picked.lat, picked.lng)}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1 rounded-md"
          >
            Xác nhận vị trí này
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-1">Chưa chọn vị trí</p>
      )}
    </div>
  );
}
