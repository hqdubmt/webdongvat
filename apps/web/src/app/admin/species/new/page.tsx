'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSpecies, uploadImage, revalidateCache } from '@/lib/api';
import ConservationInput from '@/components/ConservationInput';

interface IdentifyResult {
  found: boolean;
  name?: string;
  scientificName?: string;
  conservationStatus?: string;
  description?: string;
  confidence?: string;
  note?: string;
  sources?: { label: string; url: string }[];
}

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function NewSpeciesPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [created, setCreated] = useState<{ slug: string; name: string } | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'taken' | 'free'>('idle');
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState<IdentifyResult | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    scientificName: '',
    slug: '',
    description: '',
    conservationStatus: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'name' && !slugManual) {
        next.slug = toSlug(value);
      }
      return next;
    });
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManual(true);
    setForm((prev) => ({ ...prev, slug: e.target.value }));
  }

  useEffect(() => {
    const slug = form.slug;
    if (!slug) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/species/${slug}`);
        setSlugStatus(res.ok ? 'taken' : 'free');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.slug]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageCaption('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleScanImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdentifying(true);
    setIdentified(null);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch('/api/ai/identify', { method: 'POST', body: fd });
      const data: IdentifyResult = await res.json();
      setIdentified(data);
    } catch {
      setIdentified({ found: false, note: 'Lỗi kết nối, thử lại.' });
    } finally {
      setIdentifying(false);
      if (scanRef.current) scanRef.current.value = '';
    }
  }

  function applyIdentified() {
    if (!identified) return;
    setForm((p) => ({
      ...p,
      name: identified.name || p.name,
      scientificName: identified.scientificName || p.scientificName,
      conservationStatus: identified.conservationStatus || p.conservationStatus,
      description: identified.description || p.description,
      slug: !slugManual && identified.name ? toSlug(identified.name) : p.slug,
    }));
    setIdentified(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.scientificName || !form.slug) {
      setError('Vui lòng điền đầy đủ tên loài, tên khoa học và slug.');
      return;
    }
    if (slugStatus === 'taken') {
      setError('Slug này đã tồn tại. Vui lòng chọn slug khác.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createSpecies({
        name: form.name,
        scientificName: form.scientificName,
        slug: form.slug,
        description: form.description || undefined,
        conservationStatus: form.conservationStatus || undefined,
      });

      if (imageFile) {
        await uploadImage(created.slug, imageFile, imageCaption || undefined);
      }

      await revalidateCache(created.slug);
      setCreated({ slug: created.slug, name: created.name });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tạo loài thành công!</h2>
            <p className="text-gray-500 text-sm mt-1">
              <span className="font-medium text-gray-700">{created.name}</span> đã được lưu vào hệ thống.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <a
              href={`/species/${created.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Xem trên trang công khai
            </a>
            <button
              onClick={() => router.push(`/admin/species/${created.slug}/edit`)}
              className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Tiếp tục chỉnh sửa (thêm ảnh, tọa độ...)
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center justify-center gap-2 w-full text-gray-400 hover:text-gray-600 text-sm py-1"
            >
              ← Về danh sách loài
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Thêm loài mới</h1>
        <p className="text-gray-500 text-sm mt-1">Điền thông tin và đính kèm ảnh đại diện (tùy chọn).</p>
      </div>

      {/* AI Scan */}
      <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Nhận dạng loài từ ảnh</p>
            <p className="text-xs text-gray-400 mt-0.5">Chụp hoặc chọn ảnh động vật — AI tự điền thông tin</p>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${identifying ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
            {identifying ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Đang nhận dạng...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Quét ảnh</>
            )}
            <input ref={scanRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanImage} disabled={identifying} />
          </label>
        </div>

        {identified && (
          <div className={`mt-3 p-3 rounded-lg border text-sm ${identified.found ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
            {identified.found ? (
              <>
                <div className="space-y-1 mb-3">
                  {identified.name && <p><span className="text-gray-500">Tên:</span> <strong>{identified.name}</strong></p>}
                  {identified.scientificName && <p><span className="text-gray-500">Tên KH:</span> <em>{identified.scientificName}</em></p>}
                  {identified.conservationStatus && <p><span className="text-gray-500">Tình trạng:</span> {identified.conservationStatus}</p>}
                  {identified.description && <p className="text-gray-600 text-xs mt-1">{identified.description}</p>}
                  {identified.confidence && <p className="text-xs text-gray-400 mt-1">Độ tin cậy: <span className={identified.confidence === 'high' ? 'text-green-600' : identified.confidence === 'medium' ? 'text-yellow-600' : 'text-red-500'}>{identified.confidence === 'high' ? 'Cao' : identified.confidence === 'medium' ? 'Trung bình' : 'Thấp'}</span></p>}
                </div>
                {identified.sources && identified.sources.length > 0 && (
                  <div className="mb-3 pt-2 border-t border-purple-200">
                    <p className="text-xs text-gray-400 mb-1.5">Nguồn tham khảo:</p>
                    <div className="flex flex-wrap gap-2">
                      {identified.sources.map((s) => (
                        <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                          {s.label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={applyIdentified} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-medium">Điền vào form</button>
                  <button type="button" onClick={() => setIdentified(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2">Bỏ qua</button>
                </div>
              </>
            ) : (
              <p className="text-gray-500">{identified.note || 'Không nhận ra loài trong ảnh này.'}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên loài <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="VD: Sao La"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên khoa học <span className="text-red-500">*</span>
          </label>
          <input
            name="scientificName"
            value={form.scientificName}
            onChange={handleChange}
            placeholder="VD: Pseudoryx nghetinhensis"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm italic focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {form.scientificName && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-gray-400">Tra cứu:</span>
              <a
                href={`https://www.iucnredlist.org/search?query=${encodeURIComponent(form.scientificName)}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-red-600 hover:underline font-medium"
              >
                IUCN Red List ↗
              </a>
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(form.scientificName.replace(/ /g, '_'))}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Wikipedia ↗
              </a>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(form.scientificName + ' species')}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:underline font-medium"
              >
                Google ↗
              </a>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              name="slug"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="VD: sao-la"
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 pr-8 ${
                slugStatus === 'taken' ? 'border-red-400 focus:ring-red-400' :
                slugStatus === 'free' ? 'border-green-400 focus:ring-green-400' :
                'border-gray-300 focus:ring-green-500'
              }`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm">
              {slugStatus === 'checking' && <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {slugStatus === 'taken' && <span className="text-red-500">✕</span>}
              {slugStatus === 'free' && <span className="text-green-500">✓</span>}
            </span>
          </div>
          {slugStatus === 'taken' ? (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              ⚠ Slug này đã tồn tại —{' '}
              <a href={`/species/${form.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
                xem loài hiện có ↗
              </a>
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Tự động tạo từ tên. Dùng cho URL: /species/<strong>{form.slug || '...'}</strong>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng bảo tồn</label>
          <ConservationInput
            value={form.conservationStatus}
            onChange={(v) => setForm((p) => ({ ...p, conservationStatus: v }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Mô tả về loài động vật này..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh đại diện</label>

          {imagePreview ? (
            <div className="space-y-2">
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Chú thích ảnh (tùy chọn)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500">Nhấn để chọn ảnh</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP tối đa 10MB</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            {saving ? 'Đang lưu...' : 'Tạo loài'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
