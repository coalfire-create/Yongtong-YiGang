import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Popup {
  id: number;
  title: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
}

const STORAGE_KEY = "popup_dismissed_date";

function isDismissedToday(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (!dismissed) return false;
  const today = new Date().toISOString().split("T")[0];
  return dismissed === today;
}

function dismissForToday() {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(STORAGE_KEY, today);
}

export function PopupModal() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);

  const { data: popups = [] } = useQuery<Popup[]>({
    queryKey: ["/api/popups"],
  });

  useEffect(() => {
    if (popups.length > 0 && !isDismissedToday()) {
      setVisible(true);
    }
  }, [popups]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const dismissToday = useCallback(() => {
    dismissForToday();
    setVisible(false);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? popups.length - 1 : c - 1));
  }, [popups.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c === popups.length - 1 ? 0 : c + 1));
  }, [popups.length]);

  if (!visible || popups.length === 0) return null;

  const popup = popups[current];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      data-testid="popup-modal-overlay"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={close}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg mx-4" data-testid="popup-modal-content">
        <div className="relative w-full">
          {popups.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-20 w-10 h-10 flex items-center justify-center bg-white/20 text-white hover:bg-white/40 transition-colors rounded-full"
              data-testid="button-popup-prev"
              aria-label="이전"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {popup.link_url ? (
            <a
              href={popup.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-testid={`popup-slide-${current}`}
            >
              {popup.image_url ? (
                <img
                  src={popup.image_url}
                  alt={popup.title}
                  className="w-full object-contain max-h-[70vh]"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center p-8">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white text-center leading-tight">
                    {popup.title}
                  </h3>
                </div>
              )}
            </a>
          ) : (
            <div data-testid={`popup-slide-${current}`}>
              {popup.image_url ? (
                <img
                  src={popup.image_url}
                  alt={popup.title}
                  className="w-full object-contain max-h-[70vh]"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center p-8">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white text-center leading-tight">
                    {popup.title}
                  </h3>
                </div>
              )}
            </div>
          )}

          {popups.length > 1 && (
            <button
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-20 w-10 h-10 flex items-center justify-center bg-white/20 text-white hover:bg-white/40 transition-colors rounded-full"
              data-testid="button-popup-next"
              aria-label="다음"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <button
            onClick={close}
            className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors rounded-full"
            data-testid="button-popup-close-x"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>

          {popups.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {popups.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? "bg-white w-5" : "bg-white/50"
                  }`}
                  data-testid={`popup-dot-${i}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-4 w-full justify-center">
          <button
            onClick={dismissToday}
            className="px-6 py-2.5 text-sm font-medium text-white border border-white/40 hover:bg-white/10 transition-colors rounded"
            data-testid="button-popup-dismiss-today"
          >
            오늘하루 보지않기
          </button>
          <button
            onClick={close}
            className="px-6 py-2.5 text-sm font-bold text-gray-900 bg-red-500 hover:bg-red-600 transition-colors rounded"
            data-testid="button-popup-close"
          >
            닫기
          </button>
        </div>

        {popups.length > 1 && (
          <p className="text-white/60 text-xs mt-2" data-testid="popup-counter">
            {current + 1} / {popups.length}
          </p>
        )}
      </div>
    </div>
  );
}
