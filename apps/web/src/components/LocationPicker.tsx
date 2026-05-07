'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import type { Map as LeafletMap, Marker } from 'leaflet';

interface Props {
  onConfirm: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER: [number, number] = [16.0, 106.0];
const DEFAULT_ZOOM = 6;

export default function LocationPicker({ onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');

  function applyLocation(map: LeafletMap, lat: number, lng: number) {
    const rounded = { lat: Math.round(lat * 100000) / 100000, lng: Math.round(lng * 100000) / 100000 };
    if (markerRef.current) {
      markerRef.current.setLatLng([rounded.lat, rounded.lng]);
    } else {
      markerRef.current = L.marker([rounded.lat, rounded.lng]).addTo(map);
    }
    map.setView([rounded.lat, rounded.lng], 15);
    setPicked(rounded);
    setGpsError('');
  }

  function handleGpsError(err: GeolocationPositionError) {
    setLocating(false);
    if (err.code === err.PERMISSION_DENIED) {
      setGpsError('Bị từ chối quyền vị trí. Vào Cài đặt trình duyệt → cho phép vị trí cho trang này.');
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setGpsError('Không lấy được tín hiệu GPS. Thử lại hoặc bật GPS trên điện thoại.');
    } else {
      setGpsError('Hết thời gian định vị. Thử lại.');
    }
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
      applyLocation(map, e.latlng.lat, e.latlng.lng);
    });

    // Auto-locate on mount
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          applyLocation(map, coords.latitude, coords.longitude);
          setLocating(false);
        },
        handleGpsError,
        { timeout: 10000, enableHighAccuracy: true },
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
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    setLocating(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (mapRef.current) applyLocation(mapRef.current, coords.latitude, coords.longitude);
        setLocating(false);
      },
      handleGpsError,
      { timeout: 10000, enableHighAccuracy: true },
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
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 active:opacity-70"
        >
          {locating ? (
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          {locating ? 'Đang định vị...' : 'Dùng vị trí của tôi'}
        </button>
      </div>

      {/* GPS error */}
      {gpsError && (
        <div className="flex items-start gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
          <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs text-orange-700">{gpsError}</p>
        </div>
      )}

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
