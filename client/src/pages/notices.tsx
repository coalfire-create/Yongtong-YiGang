import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout";
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react";

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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight" data-testid="text-page-title">
            공지사항
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 text-gray-400" data-testid="text-notices-empty">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-base">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
            {notices.map((notice, idx) => (
              <div key={notice.id} data-testid={`notice-item-${notice.id}`}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => toggle(notice.id)}
                  data-testid={`button-notice-toggle-${notice.id}`}
                >
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-[#7B2332] text-white text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-semibold text-gray-800 text-sm sm:text-base truncate" data-testid={`text-notice-title-${notice.id}`}>
                    {notice.title}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400 mr-2 hidden sm:block" data-testid={`text-notice-date-${notice.id}`}>
                    {formatDate(notice.created_at)}
                  </span>
                  {openId === notice.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openId === notice.id && (
                  <div
                    className="px-4 pb-5 pt-1 bg-gray-50 border-t border-gray-100"
                    data-testid={`text-notice-content-${notice.id}`}
                  >
                    <p className="text-xs text-gray-400 mb-3 sm:hidden">{formatDate(notice.created_at)}</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
