'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import type { SpeciesLocation } from '@/lib/api';

interface Props {
  locations: SpeciesLocation[];
  speciesName: string;
}

export default function SpeciesMap({ locations, speciesName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || locations.length === 0) return;
    if (mapRef.current) return;

    // Fix default marker icons broken by webpack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(container);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const markers = locations.map((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude]).addTo(map);

      const popupContent = `
        <div style="min-width:180px;font-family:sans-serif">
          <p style="font-weight:600;margin:0 0 4px">${loc.placeName ?? speciesName}</p>
          <p style="font-size:12px;color:#666;margin:0 0 8px;font-family:monospace">
            ${loc.latitude.toFixed(5)}°N, ${loc.longitude.toFixed(5)}°E
          </p>
          <a
            href="https://www.google.com/maps?q=${loc.latitude},${loc.longitude}"
            target="_blank"
            rel="noopener noreferrer"
            style="font-size:12px;color:#2563eb;text-decoration:none"
          >↗ Mở trong Google Maps</a>
        </div>
      `;
      marker.bindPopup(popupContent);
      return marker;
    });

    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 10);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (locations.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {locations.length} địa điểm phân bố
        </div>
        <span className="text-xs text-gray-400">Nhấn vào marker để xem chi tiết</span>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ height: 360 }} className="w-full bg-gray-100" />
    </div>
  );
}
