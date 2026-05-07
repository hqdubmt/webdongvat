'use client';

import dynamic from 'next/dynamic';
import type { SpeciesLocation } from '@/lib/api';

const SpeciesMap = dynamic(() => import('./SpeciesMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-white border-b border-gray-100 text-sm text-gray-500">
        Đang tải bản đồ...
      </div>
      <div className="h-[360px] bg-gray-100 animate-pulse" />
    </div>
  ),
});

export default function SpeciesMapWrapper({
  locations,
  speciesName,
}: {
  locations: SpeciesLocation[];
  speciesName: string;
}) {
  if (locations.length === 0) return null;
  return <SpeciesMap locations={locations} speciesName={speciesName} />;
}
