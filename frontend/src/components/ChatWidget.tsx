import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Chatbot } from './Chatbot';

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        ref={widgetRef}
        className={`fixed z-[9999] transition-all duration-300 ease-in-out
          ${open
            ? 'bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[580px] h-[100dvh] sm:h-[600px] sm:rounded-2xl sm:shadow-2xl opacity-100 scale-100'
            : 'bottom-6 right-6 w-0 h-0 opacity-0 scale-90 pointer-events-none'
          }`}
      >
        {open && (
          <div className="h-full flex flex-col bg-white sm:rounded-2xl overflow-hidden shadow-2xl border border-warmGray-200/60">
            {/* Close bar – visible on mobile as a slim top bar, on desktop as a close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-warmGray-100 hover:bg-warmGray-200 text-warmGray-500 hover:text-warmGray-700 transition-colors cursor-pointer"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
            <Chatbot className="h-full rounded-none border-0 shadow-none" />
          </div>
        )}
      </div>

      {/* Floating action button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 cursor-pointer
          ${open
            ? 'bg-warmGray-200 text-warmGray-600 scale-0 pointer-events-none'
            : 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>
    </>
  );
}
