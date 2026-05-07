import type { Metadata } from 'next';
import './globals.css';
import ChatWidget from '@/components/ChatWidget';

export const metadata: Metadata = {
  title: {
    default: 'Hệ thống quản lý loài động vật hoang dã Việt Nam',
    template: '%s | Quản lý loài hoang dã',
  },
  description:
    'Hệ thống quản lý và tra cứu thông tin các loài động vật hoang dã Việt Nam. Cung cấp dữ liệu về phân loại, phân bố và tình trạng bảo tồn.',
  keywords: ['động vật hoang dã', 'Việt Nam', 'bảo tồn', 'loài nguy cấp', 'sinh học'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900">Động Vật Hoang Dã</span>
                  <span className="hidden sm:block text-xs text-gray-500 leading-none">Việt Nam</span>
                </div>
              </a>

              <nav className="flex items-center gap-4 sm:gap-6">
                <a href="/" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                  Danh sách loài
                </a>
                <a
                  href="https://www.iucnredlist.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors hidden sm:block"
                >
                  IUCN Red List
                </a>
                <a
                  href="/admin"
                  className="text-sm font-medium bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  title="Trang quản trị (yêu cầu đăng nhập)"
                >
                  Quản trị
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <ChatWidget />

        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary-600 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900">Động Vật Hoang Dã VN</span>
              </div>
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Hệ thống quản lý loài động vật hoang dã Việt Nam
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
