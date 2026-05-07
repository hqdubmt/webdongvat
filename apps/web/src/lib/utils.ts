export function getConservationStatusColor(status: string | null): string {
  if (!status) return 'bg-gray-100 text-gray-700';

  const s = status.toLowerCase();
  if (s.includes('cực kỳ nguy cấp') || s.includes('cr')) {
    return 'bg-red-100 text-red-800 border border-red-200';
  }
  if (s.includes('nguy cấp') || s.includes('en')) {
    return 'bg-orange-100 text-orange-800 border border-orange-200';
  }
  if (s.includes('sẽ nguy cấp') || s.includes('vu')) {
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  }
  if (s.includes('ít lo ngại') || s.includes('lc')) {
    return 'bg-green-100 text-green-800 border border-green-200';
  }
  return 'bg-gray-100 text-gray-700 border border-gray-200';
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}
