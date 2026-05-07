'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchSpeciesDetail, type Species } from '@/lib/api';
import { getConservationStatusColor, getGoogleMapsUrl, getVideoEmbedUrl } from '@/lib/utils';
import SpeciesMapWrapper from './SpeciesMapWrapper';

interface Props {
  slug: string;
  onBack: () => void;
}

export default function SpeciesDetailPanel({ slug, onBack }: Props) {
  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchSpeciesDetail(slug)
      .then(setSpecies)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không thể tải'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Đang tải...
      </div>
    );
  }

  if (error || !species) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="lg:hidden mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại
        </button>
        <p className="text-red-500 text-sm">{error || 'Không tìm thấy loài'}</p>
      </div>
    );
  }

  const primaryImage = species.images.find((img) => img.isPrimary) ?? species.images[0];
  const galleryImages = species.images.filter((img) => img !== primaryImage);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
      {/* Mobile back button */}
      <button
        onClick={onBack}
        className="lg:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{species.name}</h1>
            <p className="text-sm text-gray-500 italic mt-0.5">{species.scientificName}</p>
          </div>
          <a
            href={`/species/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap"
          >
            Xem đầy đủ ↗
          </a>
        </div>

        {species.conservationStatus && (
          <div className="mt-3">
            <span className={`badge text-sm px-3 py-1 ${getConservationStatusColor(species.conservationStatus)}`}>
              {species.conservationStatus}
            </span>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>{species.images.length} ảnh</span>
          <span>{species.locations.length} địa điểm</span>
          <span>{species.videos.length} video</span>
          <span className="ml-auto">Cập nhật {new Date(species.updatedAt).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>

      {/* Primary image */}
      {primaryImage && (
        <div className="relative w-full rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
          <Image
            src={primaryImage.url}
            alt={species.name}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {primaryImage.caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
              <p className="text-white text-xs">{primaryImage.caption}</p>
            </div>
          )}
        </div>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {galleryImages.slice(0, 12).map((img) => (
            <div key={img.id} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
              <Image
                src={img.url}
                alt={img.caption || species.name}
                fill
                unoptimized
                className="object-cover hover:scale-105 transition-transform duration-200"
                sizes="10vw"
              />
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {species.description && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Mô tả</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{species.description}</p>
        </div>
      )}

      {/* Videos */}
      {species.videos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Video</h2>
          {species.videos.slice(0, 2).map((video) => {
            const isFile = !!video.objectKey;
            const embedUrl = isFile ? null : getVideoEmbedUrl(video.url);
            if (!isFile && !embedUrl) return null;
            return (
              <div key={video.id} className="rounded-xl overflow-hidden border border-gray-200 bg-black shadow-sm">
                {video.title && (
                  <div className="px-3 py-2 bg-white border-b text-xs font-medium text-gray-600">{video.title}</div>
                )}
                <div style={{ aspectRatio: '16/9' }}>
                  {isFile ? (
                    <video src={video.url} controls className="w-full h-full" preload="metadata" />
                  ) : (
                    <iframe
                      src={embedUrl!}
                      title={video.title ?? 'Video'}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Map */}
      {species.locations.length > 0 && (
        <SpeciesMapWrapper locations={species.locations} speciesName={species.name} />
      )}

      {/* Locations list */}
      {species.locations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Phân bố địa lý ({species.locations.length})
          </h2>
          <div className="space-y-0 divide-y divide-gray-50">
            {species.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  {loc.placeName && (
                    <p className="text-sm font-medium text-gray-800 truncate">{loc.placeName}</p>
                  )}
                  <p className="text-xs text-gray-400 font-mono">
                    {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
                  </p>
                </div>
                <a
                  href={getGoogleMapsUrl(loc.latitude, loc.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline shrink-0 ml-3"
                >
                  Maps ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
