import Link from 'next/link';
import Image from 'next/image';
import { Species } from '@/lib/api';
import { getConservationStatusColor } from '@/lib/utils';

interface SpeciesCardProps {
  species: Species;
}

export default function SpeciesCard({ species }: SpeciesCardProps) {
  const primaryImage = species.images?.find((img) => img.isPrimary) || species.images?.[0];

  return (
    <Link href={`/species/${species.slug}`} className="card group block">
      {/* Image */}
      <div className="relative w-full h-48 bg-gradient-to-br from-green-50 to-emerald-100 overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={species.name}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-green-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Conservation status badge on image */}
        {species.conservationStatus && (
          <div className="absolute top-2 left-2">
            <span
              className={`badge ${getConservationStatusColor(species.conservationStatus)} shadow-sm`}
            >
              {species.conservationStatus}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
          {species.name}
        </h3>
        <p className="text-sm text-gray-500 italic mt-0.5 line-clamp-1">{species.scientificName}</p>

        {species.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">
            {species.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{species.locations?.length || 0} địa điểm</span>
          </div>

          <span className="text-xs font-medium text-primary-600 group-hover:underline">
            Xem chi tiết &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
