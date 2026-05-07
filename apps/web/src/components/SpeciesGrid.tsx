'use client';

import { useState, useMemo, useCallback } from 'react';
import { Species } from '@/lib/api';
import SpeciesCard from './SpeciesCard';
import SearchBar from './SearchBar';

interface SpeciesGridProps {
  species: Species[];
}

const STATUS_FILTERS = [
  { label: 'Tất cả', value: '' },
  { label: 'Cực kỳ nguy cấp', value: 'CR' },
  { label: 'Nguy cấp', value: 'EN' },
  { label: 'Sẽ nguy cấp', value: 'VU' },
  { label: 'Ít lo ngại', value: 'LC' },
];

export default function SpeciesGrid({ species }: SpeciesGridProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const filtered = useMemo(() => {
    let result = species;

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.scientificName.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false) ||
          (s.conservationStatus?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilter) {
      result = result.filter((s) =>
        s.conservationStatus?.toUpperCase().includes(statusFilter)
      );
    }

    return result;
  }, [species, query, statusFilter]);

  return (
    <div>
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <SearchBar onSearch={handleSearch} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Hiển thị{' '}
          <span className="font-semibold text-gray-900">{filtered.length}</span> /{' '}
          <span className="font-semibold text-gray-900">{species.length}</span> loài
        </p>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((s) => (
            <SpeciesCard key={s.id} species={s} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy kết quả</h3>
          <p className="text-gray-500 max-w-sm">
            Không tìm thấy loài nào phù hợp với từ khóa{' '}
            {query && <span className="font-medium">&ldquo;{query}&rdquo;</span>}. Hãy thử với từ khóa
            khác.
          </p>
        </div>
      )}
    </div>
  );
}
