'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Cực kỳ nguy cấp (CR)',
  'Nguy cấp (EN)',
  'Sẽ nguy cấp (VU)',
  'Ít lo ngại (LC)',
  'Thiếu dữ liệu (DD)',
  'Tuyệt chủng trong tự nhiên (EW)',
  'Tuyệt chủng (EX)',
  'Gần bị đe dọa (NT)',
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ConservationInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : SUGGESTIONS;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Chọn hoặc nhập tình trạng bảo tồn..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 transition-colors ${value === s ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
