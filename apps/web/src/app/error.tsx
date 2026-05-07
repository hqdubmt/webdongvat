'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Đã xảy ra lỗi</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        {error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.'}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary">
          Thử lại
        </button>
        <Link href="/" className="btn-secondary">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
