// Server-side: call backend directly. Browser: use relative path through Next.js proxy.
const API_BASE =
  typeof window === 'undefined'
    ? (process.env.API_INTERNAL_URL || 'http://localhost:3001')
    : '';

export interface SpeciesImage {
  id: number;
  speciesId: number;
  objectKey: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface SpeciesLocation {
  id: number;
  speciesId: number;
  latitude: number;
  longitude: number;
  placeName: string | null;
}

export interface SpeciesVideo {
  id: number;
  speciesId: number;
  url: string;
  objectKey: string | null;
  title: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Species {
  id: number;
  slug: string;
  name: string;
  scientificName: string;
  description: string | null;
  conservationStatus: string | null;
  createdAt: string;
  updatedAt: string;
  images: SpeciesImage[];
  locations: SpeciesLocation[];
  videos: SpeciesVideo[];
}

export interface ApiResponse<T> {
  data: T;
  cached: boolean;
}

export async function fetchSpeciesList(): Promise<Species[]> {
  const res = await fetch(`${API_BASE}/api/species`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch species list: ${res.status}`);
  }
  const json: ApiResponse<Species[]> = await res.json();
  return json.data;
}

export async function fetchSpeciesDetail(slug: string): Promise<Species> {
  const res = await fetch(`${API_BASE}/api/species/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Species not found');
    }
    throw new Error(`Failed to fetch species: ${res.status}`);
  }
  const json: ApiResponse<Species> = await res.json();
  return json.data;
}

// Admin versions — always fetch fresh, no cache
export async function adminFetchSpeciesList(): Promise<Species[]> {
  const res = await fetch(`${API_BASE}/api/species`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch species list: ${res.status}`);
  const json: ApiResponse<Species[]> = await res.json();
  return json.data;
}

export async function adminFetchSpeciesDetail(slug: string): Promise<Species> {
  const res = await fetch(`${API_BASE}/api/species/${slug}`, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Species not found');
    throw new Error(`Failed to fetch species: ${res.status}`);
  }
  const json: ApiResponse<Species> = await res.json();
  return json.data;
}

// ── Admin mutations ──────────────────────────────────────────────────────────

export interface SpeciesInput {
  name: string;
  scientificName: string;
  slug: string;
  description?: string;
  conservationStatus?: string;
}

export async function revalidateCache(slug?: string): Promise<void> {
  await fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  }).catch(() => {});
}

export async function createSpecies(data: SpeciesInput): Promise<Species> {
  const res = await fetch(`${API_BASE}/api/species`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Tạo loài thất bại: ${res.status}`);
  }
  const json: ApiResponse<Species> = await res.json();
  return json.data;
}

export async function updateSpecies(slug: string, data: Partial<SpeciesInput>): Promise<Species> {
  const res = await fetch(`${API_BASE}/api/species/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Cập nhật thất bại: ${res.status}`);
  }
  const json: ApiResponse<Species> = await res.json();
  return json.data;
}

export async function deleteSpecies(slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/species/${slug}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Xóa thất bại: ${res.status}`);
  }
}

export async function uploadImage(slug: string, file: File, caption?: string): Promise<SpeciesImage> {
  const form = new FormData();
  form.append('image', file);
  if (caption) form.append('caption', caption);
  const res = await fetch(`${API_BASE}/api/species/${slug}/images`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload ảnh thất bại: ${res.status}`);
  }
  const json: ApiResponse<SpeciesImage> = await res.json();
  return json.data;
}

export async function deleteImage(slug: string, imageId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/images/${imageId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Xóa ảnh thất bại: ${res.status}`);
  }
}

export async function setPrimaryImage(slug: string, imageId: number): Promise<SpeciesImage> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/images/${imageId}/primary`, { method: 'PATCH' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Đặt ảnh chính thất bại: ${res.status}`);
  }
  const json: ApiResponse<SpeciesImage> = await res.json();
  return json.data;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
  placeName?: string;
}

export async function addLocation(slug: string, data: LocationInput): Promise<SpeciesLocation> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Thêm tọa độ thất bại: ${res.status}`);
  }
  const json: ApiResponse<SpeciesLocation> = await res.json();
  return json.data;
}

export async function deleteLocation(slug: string, locationId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/locations/${locationId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Xóa tọa độ thất bại: ${res.status}`);
  }
}

export async function addVideo(slug: string, url: string, title?: string, isPrimary?: boolean): Promise<SpeciesVideo> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, isPrimary }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Thêm video thất bại: ${res.status}`);
  }
  const json: ApiResponse<SpeciesVideo> = await res.json();
  return json.data;
}

export function uploadVideoFile(
  slug: string,
  file: File,
  title: string | undefined,
  onProgress: (pct: number) => void,
): Promise<SpeciesVideo> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('video', file);
    if (title) form.append('title', title);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/species/${slug}/videos`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const json: ApiResponse<SpeciesVideo> = JSON.parse(xhr.responseText);
        resolve(json.data);
      } else {
        const err = JSON.parse(xhr.responseText || '{}');
        reject(new Error(err.error || `Upload video thất bại: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Lỗi kết nối khi upload video'));
    xhr.send(form);
  });
}

export async function deleteVideo(slug: string, videoId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/videos/${videoId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Xóa video thất bại: ${res.status}`);
  }
}

export async function setPrimaryVideo(slug: string, videoId: number): Promise<SpeciesVideo> {
  const res = await fetch(`${API_BASE}/api/species/${slug}/videos/${videoId}/primary`, { method: 'PATCH' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Đặt video chính thất bại: ${res.status}`);
  }
  const json: ApiResponse<SpeciesVideo> = await res.json();
  return json.data;
}

// ── User management ───────────────────────────────────────────────────────────

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'EDITOR';

export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/users', { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải danh sách user');
  const json: ApiResponse<AdminUser[]> = await res.json();
  return json.data;
}

export async function createUser(data: {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
}): Promise<AdminUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Tạo user thất bại');
  }
  const json: ApiResponse<AdminUser> = await res.json();
  return json.data;
}

export async function updateUser(
  id: number,
  data: { displayName?: string; role?: UserRole; password?: string }
): Promise<AdminUser> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Cập nhật user thất bại');
  }
  const json: ApiResponse<AdminUser> = await res.json();
  return json.data;
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Xóa user thất bại');
  }
}
