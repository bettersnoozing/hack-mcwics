import { Outlet } from 'react-router-dom';
import { StickyHeader } from './StickyHeader';

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-brand-50/50 via-white to-calm-50/50">
      <StickyHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-warmGray-100 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-center text-xs text-warmGray-400">
            McGill Tech Club Portal &middot; Built with care for the McGill community
          </p>
        </div>
      </footer>
    </div>
  );
}
