import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

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
  const [closedIds, setClosedIds] = useState<Set<number>>(new Set());

  const { data: popups = [] } = useQuery<Popup[]>({
    queryKey: ["/api/popups"],
  });

  useEffect(() => {
    if (popups.length > 0 && !isDismissedToday()) {
      setVisible(true);
    }
  }, [popups]);

  const activePopups = popups.filter((p) => !closedIds.has(p.id));

  const closeOne = useCallback((id: number) => {
    setClosedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setVisible(false);
  }, []);

  const dismissToday = useCallback(() => {
    dismissForToday();
    setVisible(false);
  }, []);

  useEffect(() => {
    if (visible && activePopups.length === 0) {
      setVisible(false);
    }
  }, [activePopups.length, visible]);

  if (!visible || popups.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      data-testid="popup-modal-overlay"
    >
      {/* 배경 오버레이 - 항상 고정 */}
      <div className="absolute inset-0 bg-black/60" onClick={closeAll} />

      {/* 스크롤 가능한 컨테이너 */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-start sm:justify-center min-h-full py-6 px-4">
          {/* 팝업 카드 영역 */}
          <div
            className="flex flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-4 w-full sm:max-w-[90vw]"
            data-testid="popup-modal-content"
          >
            {activePopups.map((popup) => (
              <div
                key={popup.id}
                className="relative w-full max-w-[340px] sm:w-[360px] sm:flex-shrink-0 shadow-2xl"
                data-testid={`popup-card-${popup.id}`}
              >
                <button
                  onClick={() => closeOne(popup.id)}
                  className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-black/70 transition-colors rounded-full"
                  data-testid={`button-popup-close-${popup.id}`}
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>

                {popup.link_url ? (
                  <a
                    href={popup.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {popup.image_url ? (
                      <img
                        src={popup.image_url}
                        alt={popup.title}
                        className="w-full object-contain"
                      />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-gradient-to-br from-[#7B2332] to-red-700 flex items-center justify-center p-8">
                        <h3 className="text-2xl font-extrabold text-white text-center leading-tight">
                          {popup.title}
                        </h3>
                      </div>
                    )}
                  </a>
                ) : (
                  <>
                    {popup.image_url ? (
                      <img
                        src={popup.image_url}
                        alt={popup.title}
                        className="w-full object-contain"
                      />
                    ) : (
                      <div className="w-full aspect-[4/5] bg-gradient-to-br from-[#7B2332] to-red-700 flex items-center justify-center p-8">
                        <h3 className="text-2xl font-extrabold text-white text-center leading-tight">
                          {popup.title}
                        </h3>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 하단 버튼 */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={dismissToday}
              className="px-6 py-2.5 text-sm font-medium text-white border border-white/60 hover:bg-white/10 transition-colors rounded bg-black/40"
              data-testid="button-popup-dismiss-today"
            >
              오늘하루 보지않기
            </button>
            <button
              onClick={closeAll}
              className="px-6 py-2.5 text-sm font-bold text-white bg-[#7B2332] hover:bg-[#6a1e2b] transition-colors rounded"
              data-testid="button-popup-close"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
