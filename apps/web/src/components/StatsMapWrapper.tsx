'use client';

import dynamic from 'next/dynamic';
import type { Species } from '@/lib/api';

const StatsMap = dynamic(() => import('./StatsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center rounded-xl">
      <span className="text-sm text-gray-400">Đang tải bản đồ...</span>
    </div>
  ),
});

export default function StatsMapWrapper({ species }: { species: Species[] }) {
  return <StatsMap species={species} />;
}
