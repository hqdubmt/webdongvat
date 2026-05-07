'use client';

import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-lg border border-gray-300 bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-sm text-gray-400">Đang tải bản đồ...</span>
    </div>
  ),
});

export default LocationPicker;
