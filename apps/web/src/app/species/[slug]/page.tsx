import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { fetchSpeciesDetail, fetchSpeciesList } from '@/lib/api';
import { getConservationStatusColor, getGoogleMapsUrl, getVideoEmbedUrl } from '@/lib/utils';
import SpeciesMapWrapper from '@/components/SpeciesMapWrapper';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  try {
    const species = await fetchSpeciesList();
    return species.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const species = await fetchSpeciesDetail(params.slug);
    return {
      title: `${species.name} (${species.scientificName})`,
      description:
        species.description?.slice(0, 160) ||
        `Thông tin chi tiết về ${species.name} - ${species.scientificName}`,
    };
  } catch {
    return {
      title: 'Không tìm thấy loài',
    };
  }
}

export default async function SpeciesDetailPage({ params }: PageProps) {
  let species;
  try {
    species = await fetchSpeciesDetail(params.slug);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Species not found') {
      notFound();
    }
    throw err;
  }

  const primaryImage = species.images.find((img) => img.isPrimary) || species.images[0];
  const galleryImages = species.images.filter((img) => img !== primaryImage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary-600 transition-colors">
          Trang chủ
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium truncate">{species.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Images */}
        <div className="lg:col-span-2 space-y-4">
          {/* Primary image */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 shadow-sm" style={{ aspectRatio: '16/9' }}>
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={species.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <svg className="w-20 h-20 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-green-400 text-sm">Chưa có hình ảnh</p>
              </div>
            )}
          </div>

          {/* Image gallery */}
          {galleryImages.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Thư viện ảnh</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative rounded-xl overflow-hidden bg-gray-100 shadow-sm"
                    style={{ aspectRatio: '4/3' }}
                  >
                    <Image
                      src={img.url}
                      alt={img.caption || species.name}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
                    />
                    {img.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs line-clamp-1">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {species.videos.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Video</h3>
              {species.videos.map((video) => {
                const isDirectFile = !!video.objectKey;
                const embedUrl = isDirectFile ? null : getVideoEmbedUrl(video.url);
                if (!isDirectFile && !embedUrl) return null;
                return (
                  <div key={video.id} className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                    {video.title && (
                      <div className="px-4 py-2 bg-white border-b border-gray-100 text-sm font-medium text-gray-700">
                        {video.title}
                      </div>
                    )}
                    <div style={{ aspectRatio: '16/9' }} className="w-full">
                      {isDirectFile ? (
                        <video
                          src={video.url}
                          controls
                          className="w-full h-full"
                          preload="metadata"
                        />
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

          {/* Description */}
          {species.description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mô tả
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{species.description}</p>
            </div>
          )}
        </div>

        {/* Right column - Info & Locations */}
        <div className="space-y-5">
          {/* Species info card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900">{species.name}</h1>
            <p className="text-base text-gray-500 italic mt-1">{species.scientificName}</p>

            {species.conservationStatus && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Tình trạng bảo tồn
                </p>
                <span
                  className={`badge text-sm px-3 py-1 ${getConservationStatusColor(
                    species.conservationStatus
                  )}`}
                >
                  {species.conservationStatus}
                </span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Số địa điểm</span>
                <span className="font-medium text-gray-900">{species.locations.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Số hình ảnh</span>
                <span className="font-medium text-gray-900">{species.images.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Cập nhật</span>
                <span className="font-medium text-gray-900">
                  {new Date(species.updatedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          {/* Map */}
          {species.locations.length > 0 && (
            <SpeciesMapWrapper
              locations={species.locations}
              speciesName={species.name}
            />
          )}

          {/* Locations */}
          {species.locations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Phân bố địa lý ({species.locations.length})
              </h2>

              <div className="space-y-3">
                {species.locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="border border-gray-100 rounded-xl p-3 hover:border-primary-200 hover:bg-primary-50/50 transition-all group"
                  >
                    {loc.placeName && (
                      <p className="text-sm font-medium text-gray-900 mb-1 leading-snug">
                        {loc.placeName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 font-mono mb-2 break-all">
                      {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
                    </p>
                    <a
                      href={getGoogleMapsUrl(loc.latitude, loc.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Mở trong Google Maps
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back button */}
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại danh sách
          </Link>
        </div>
      </div>
    </div>
  );
}
