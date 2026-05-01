import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout";
import { ChevronDown, ChevronUp, Bell } from "lucide-react";

interface Notice {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function Notices() {
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  const toggle = (id: number) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <PageLayout>
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <h1
            className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight"
            data-testid="text-page-title"
          >
            공지사항
          </h1>
          <p className="mt-2 text-sm text-gray-400">학원의 새로운 소식과 안내사항을 확인하세요.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[72px] bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-24 text-gray-400" data-testid="text-notices-empty">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="text-base font-medium">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notices.map((notice) => {
              const isOpen = openId === notice.id;
              return (
                <div
                  key={notice.id}
                  className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "border-[#7B2332]/30 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid={`notice-item-${notice.id}`}
                >
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
                    onClick={() => toggle(notice.id)}
                    data-testid={`button-notice-toggle-${notice.id}`}
                  >
                    {/* 공지 태그 */}
                    <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded bg-[#7B2332]/10 text-[#7B2332] tracking-wide">
                      공지
                    </span>

                    {/* 제목 */}
                    <span
                      className="flex-1 font-semibold text-gray-800 text-sm sm:text-[15px] leading-snug"
                      data-testid={`text-notice-title-${notice.id}`}
                    >
                      {notice.title}
                    </span>

                    {/* 날짜 + 아이콘 */}
                    <span
                      className="flex-shrink-0 text-xs text-gray-400 mr-1 hidden sm:block"
                      data-testid={`text-notice-date-${notice.id}`}
                    >
                      {formatDate(notice.created_at)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* 내용 영역 */}
                  {isOpen && (
                    <div
                      className="px-5 pt-3 pb-5 bg-gray-50 border-t border-gray-100"
                      data-testid={`text-notice-content-${notice.id}`}
                    >
                      <p className="text-xs text-gray-400 mb-3 sm:hidden">{formatDate(notice.created_at)}</p>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {notice.content || "내용이 없습니다."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
