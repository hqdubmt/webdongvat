'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  adminFetchSpeciesDetail,
  updateSpecies,
  uploadImage,
  deleteImage,
  setPrimaryImage,
  addLocation,
  deleteLocation,
  addVideo,
  uploadVideoFile,
  deleteVideo,
  setPrimaryVideo,
  revalidateCache,
  type Species,
  type SpeciesImage,
  type SpeciesLocation,
  type SpeciesVideo,
} from '@/lib/api';
import LocationPickerWrapper from '@/components/LocationPickerWrapper';

const CONSERVATION_OPTIONS = [
  { value: '', label: 'Chưa đánh giá' },
  { value: 'Cực kỳ nguy cấp (CR)', label: 'CR - Cực kỳ nguy cấp' },
  { value: 'Nguy cấp (EN)', label: 'EN - Nguy cấp' },
  { value: 'Sẽ nguy cấp (VU)', label: 'VU - Sẽ nguy cấp' },
  { value: 'Ít lo ngại (LC)', label: 'LC - Ít lo ngại' },
  { value: 'Thiếu dữ liệu (DD)', label: 'DD - Thiếu dữ liệu' },
];

export default function EditSpeciesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [userRole, setUserRole] = useState<string>('ADMIN');
  const canDelete = userRole !== 'EDITOR';

  // Info form
  const [form, setForm] = useState({ name: '', scientificName: '', description: '', conservationStatus: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  // Images
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState('');

  // Locations
  const [locForm, setLocForm] = useState({ latitude: '', longitude: '', placeName: '' });
  const [addingLoc, setAddingLoc] = useState(false);
  const [locError, setLocError] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // AI description
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Videos
  const [videoTab, setVideoTab] = useState<'url' | 'file'>('url');
  const [videoForm, setVideoForm] = useState({ url: '', title: '' });
  const [addingVideo, setAddingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : null).then((u) => { if (u?.role) setUserRole(u.role); }).catch(() => {});
    adminFetchSpeciesDetail(slug)
      .then((s) => {
        setSpecies({ ...s, images: s.images ?? [], locations: s.locations ?? [], videos: s.videos ?? [] });
        setForm({
          name: s.name,
          scientificName: s.scientificName,
          description: s.description ?? '',
          conservationStatus: s.conservationStatus ?? '',
        });
      })
      .catch((e) => setPageError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // ── Info form ──────────────────────────────────────────────────────────────

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      const updated = await updateSpecies(slug, {
        name: form.name,
        scientificName: form.scientificName,
        description: form.description || undefined,
        conservationStatus: form.conservationStatus || undefined,
      });
      setSpecies({ ...updated, images: updated.images ?? [], locations: updated.locations ?? [], videos: updated.videos ?? [] });
      await revalidateCache(slug);
      setSaveMsg('Đã lưu!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  }

  // ── Image upload ───────────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setImgError('');
    try {
      const img = await uploadImage(slug, file, caption || undefined);
      setSpecies((prev) => prev ? { ...prev, images: [...prev.images, img] } : prev);
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      await revalidateCache(slug);
    } catch (e: unknown) {
      setImgError(e instanceof Error ? e.message : 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(img: SpeciesImage) {
    if (!confirm('Xóa ảnh này?')) return;
    try {
      await deleteImage(slug, img.id);
      setSpecies((prev) => prev ? { ...prev, images: prev.images.filter((i) => i.id !== img.id) } : prev);
      await revalidateCache(slug);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại');
    }
  }

  async function handleSetPrimary(img: SpeciesImage) {
    if (img.isPrimary) return;
    try {
      await setPrimaryImage(slug, img.id);
      setSpecies((prev) => prev ? {
        ...prev,
        images: prev.images.map((i) => ({ ...i, isPrimary: i.id === img.id })),
      } : prev);
      await revalidateCache(slug);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Đặt ảnh chính thất bại');
    }
  }

  // ── Locations ──────────────────────────────────────────────────────────────

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!locForm.latitude || !locForm.longitude) {
      setLocError('Vui lòng nhập vĩ độ và kinh độ.');
      return;
    }
    setAddingLoc(true);
    setLocError('');
    try {
      const loc = await addLocation(slug, {
        latitude: parseFloat(locForm.latitude),
        longitude: parseFloat(locForm.longitude),
        placeName: locForm.placeName || undefined,
      });
      setSpecies((prev) => prev ? { ...prev, locations: [...prev.locations, loc] } : prev);
      setLocForm({ latitude: '', longitude: '', placeName: '' });
      await revalidateCache(slug);
    } catch (e: unknown) {
      setLocError(e instanceof Error ? e.message : 'Thêm tọa độ thất bại');
    } finally {
      setAddingLoc(false);
    }
  }

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoForm.url.trim()) { setVideoError('Vui lòng nhập URL video.'); return; }
    setAddingVideo(true);
    setVideoError('');
    try {
      const video = await addVideo(slug, videoForm.url.trim(), videoForm.title.trim() || undefined);
      setSpecies((prev) => prev ? { ...prev, videos: [...prev.videos, video] } : prev);
      setVideoForm({ url: '', title: '' });
      await revalidateCache(slug);
    } catch (e: unknown) {
      setVideoError(e instanceof Error ? e.message : 'Thêm video thất bại');
    } finally {
      setAddingVideo(false);
    }
  }

  async function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAddingVideo(true);
    setVideoError('');
    setUploadProgress(0);
    try {
      const video = await uploadVideoFile(slug, file, videoForm.title.trim() || undefined, setUploadProgress);
      setSpecies((prev) => prev ? { ...prev, videos: [...prev.videos, video] } : prev);
      setVideoForm((p) => ({ ...p, title: '' }));
      if (videoFileRef.current) videoFileRef.current.value = '';
      await revalidateCache(slug);
    } catch (e: unknown) {
      setVideoError(e instanceof Error ? e.message : 'Upload video thất bại');
    } finally {
      setAddingVideo(false);
      setUploadProgress(0);
    }
  }

  async function handleDeleteVideo(video: SpeciesVideo) {
    if (!confirm('Xóa video này?')) return;
    try {
      await deleteVideo(slug, video.id);
      setSpecies((prev) => prev ? { ...prev, videos: prev.videos.filter((v) => v.id !== video.id) } : prev);
      await revalidateCache(slug);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại');
    }
  }

  async function handleSetPrimaryVideo(video: SpeciesVideo) {
    if (video.isPrimary) return;
    try {
      await setPrimaryVideo(slug, video.id);
      setSpecies((prev) => prev ? {
        ...prev,
        videos: prev.videos.map((v) => ({ ...v, isPrimary: v.id === video.id })),
      } : prev);
      await revalidateCache(slug);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Thất bại');
    }
  }

  async function handleDeleteLocation(loc: SpeciesLocation) {
    if (!confirm('Xóa tọa độ này?')) return;
    try {
      await deleteLocation(slug, loc.id);
      setSpecies((prev) => prev ? { ...prev, locations: prev.locations.filter((l) => l.id !== loc.id) } : prev);
      await revalidateCache(slug);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại');
    }
  }

  if (loading) return <p className="text-gray-500">Đang tải...</p>;
  if (pageError) return <p className="text-red-600">{pageError}</p>;
  if (!species) return null;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Chỉnh sửa: {species.name}</h1>
          <p className="text-gray-400 text-sm italic mt-0.5 truncate">{species.scientificName}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <a href={`/species/${slug}`} target="_blank" className="text-sm text-blue-600 hover:underline">Xem trang</a>
          <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:underline">← Quay lại</button>
        </div>
      </div>

      {/* ── Thông tin cơ bản ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Thông tin cơ bản</h2>

        {saveError && <p className="mb-3 text-sm text-red-600">{saveError}</p>}
        {saveMsg && <p className="mb-3 text-sm text-green-600 font-medium">{saveMsg}</p>}

        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên loài *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên khoa học *</label>
              <input
                value={form.scientificName}
                onChange={(e) => setForm((p) => ({ ...p, scientificName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm italic focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng bảo tồn</label>
            <select
              value={form.conservationStatus}
              onChange={(e) => setForm((p) => ({ ...p, conservationStatus: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {CONSERVATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Mô tả</label>
              <button
                type="button"
                disabled={generatingDesc}
                onClick={async () => {
                  setGeneratingDesc(true);
                  try {
                    const res = await fetch('/api/ai/describe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: form.name,
                        scientificName: form.scientificName,
                        conservationStatus: form.conservationStatus,
                      }),
                    });
                    const data = await res.json();
                    if (data.description) {
                      setForm((p) => ({ ...p, description: data.description }));
                    } else {
                      alert(data.error || 'Tạo mô tả thất bại');
                    }
                  } catch {
                    alert('Lỗi kết nối');
                  } finally {
                    setGeneratingDesc(false);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingDesc ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Tạo bằng AI
                  </>
                )}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            {saving ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
      </section>

      {/* ── Hình ảnh ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Hình ảnh ({species.images.length})
        </h2>

        {imgError && <p className="mb-3 text-sm text-red-600">{imgError}</p>}

        {/* Upload */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-sm font-medium text-gray-700 mb-2">Tải ảnh lên</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Chú thích ảnh (tùy chọn)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <label className={`cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium text-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Đang tải...' : 'Chọn ảnh'}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Gallery */}
        {species.images.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có ảnh nào.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {species.images.map((img) => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption ?? ''} className="w-full h-full object-cover" />
                {img.isPrimary && (
                  <div className="absolute top-1.5 left-1.5">
                    <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-semibold shadow">Ảnh chính</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2">
                  {img.caption && <p className="text-white text-xs text-center line-clamp-2">{img.caption}</p>}
                  {!img.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(img)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs px-3 py-1 rounded-full font-medium"
                    >
                      Đặt làm ảnh chính
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteImage(img)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Video ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Video ({species.videos.length})</h2>

        {videoError && <p className="mb-3 text-sm text-red-600">{videoError}</p>}

        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-200 rounded-lg p-0.5 w-fit">
            <button type="button" onClick={() => setVideoTab('url')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${videoTab === 'url' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              YouTube / Vimeo
            </button>
            <button type="button" onClick={() => setVideoTab('file')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${videoTab === 'file' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Upload từ thiết bị
            </button>
          </div>

          {/* Shared title input */}
          <input
            type="text"
            value={videoForm.title}
            onChange={(e) => setVideoForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Tiêu đề video (tùy chọn)"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          {videoTab === 'url' ? (
            <form onSubmit={handleAddVideo} className="flex gap-2">
              <input
                type="url"
                value={videoForm.url}
                onChange={(e) => setVideoForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button type="submit" disabled={addingVideo}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap">
                {addingVideo ? '...' : 'Thêm'}
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              {addingVideo ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Đang upload...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                  <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-500">Nhấn để chọn video</span>
                  <span className="text-xs text-gray-400 mt-0.5">MP4, WebM, MOV tối đa 500MB</span>
                  <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} disabled={addingVideo} />
                </label>
              )}
            </div>
          )}
        </div>

        {species.videos.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có video nào.</p>
        ) : (
          <div className="space-y-3">
            {species.videos.map((video) => (
              <div key={video.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <svg className="w-7 h-7 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{video.title || 'Video'}</p>
                    <p className="text-xs text-gray-400 truncate">{video.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-10 sm:pl-0">
                  {video.isPrimary && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">Chính</span>
                  )}
                  {!video.isPrimary && (
                    <button onClick={() => handleSetPrimaryVideo(video)} className="text-xs text-yellow-600 hover:text-yellow-700 font-medium">Đặt chính</button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDeleteVideo(video)} className="text-xs text-red-500 hover:text-red-700 font-medium">Xóa</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Tọa độ ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Tọa độ ({species.locations.length})
        </h2>

        {locError && <p className="mb-3 text-sm text-red-600">{locError}</p>}

        {/* Add location form */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Thêm tọa độ mới</p>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {showPicker ? 'Ẩn bản đồ' : 'Chọn trên bản đồ'}
            </button>
          </div>

          {showPicker && (
            <LocationPickerWrapper
              onConfirm={(lat, lng) => {
                setLocForm((p) => ({ ...p, latitude: String(lat), longitude: String(lng) }));
                setShowPicker(false);
              }}
            />
          )}

          <form onSubmit={handleAddLocation}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                type="number"
                step="any"
                value={locForm.latitude}
                onChange={(e) => setLocForm((p) => ({ ...p, latitude: e.target.value }))}
                placeholder="Vĩ độ *"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                step="any"
                value={locForm.longitude}
                onChange={(e) => setLocForm((p) => ({ ...p, longitude: e.target.value }))}
                placeholder="Kinh độ *"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                value={locForm.placeName}
                onChange={(e) => setLocForm((p) => ({ ...p, placeName: e.target.value }))}
                placeholder="Tên địa điểm"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 col-span-2 sm:col-span-1"
              />
              <button
                type="submit"
                disabled={addingLoc}
                className="col-span-2 sm:col-span-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
              >
                {addingLoc ? '...' : 'Thêm'}
              </button>
            </div>
          </form>
        </div>

        {/* Location list */}
        {species.locations.length === 0 ? (
          <p className="text-gray-400 text-sm">Chưa có tọa độ nào.</p>
        ) : (
          <div className="space-y-2">
            {species.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                <div>
                  {loc.placeName && <span className="font-medium text-gray-800 mr-2">{loc.placeName}</span>}
                  <span className="text-gray-500 font-mono">{loc.latitude}, {loc.longitude}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <a
                    href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Maps
                  </a>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteLocation(loc)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
