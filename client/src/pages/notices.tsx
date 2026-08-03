import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout";
import { Bell } from "lucide-react";

interface NoticeImage {
  id: number;
  image_url: string;
  display_order: number;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  images: NoticeImage[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const CONTENT_LIMIT = 120;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function NoticeCard({ notice }: { notice: Notice }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = notice.content.length > CONTENT_LIMIT;
  const displayContent = isLong && !expanded
    ? notice.content.slice(0, CONTENT_LIMIT).trimEnd() + "…"
    : notice.content;
  const hasImages = notice.images && notice.images.length > 0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm"
      data-testid={`notice-item-${notice.id}`}
    >
      {/* 상단: 뱃지 + 제목 + 날짜 */}
      <div className="flex items-start gap-3 mb-2">
        <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded bg-[#7B2332]/10 text-[#7B2332] tracking-wide">
          공지
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold text-gray-900 text-sm sm:text-[15px] leading-snug"
            data-testid={`text-notice-title-${notice.id}`}
          >
            {notice.title}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5" data-testid={`text-notice-date-${notice.id}`}>
            {formatDate(notice.created_at)}
          </p>
        </div>
      </div>

      {/* 내용 + 이미지 */}
      {(notice.content || hasImages) && (
        <div className="pl-[52px]">
          {notice.content && (
            <>
              <p
                className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap"
                data-testid={`text-notice-content-${notice.id}`}
              >
                {displayContent}
              </p>
              {isLong && (
                <button
                  className="mt-1.5 text-xs font-semibold text-[#7B2332] hover:underline"
                  onClick={() => setExpanded((v) => !v)}
                  data-testid={`button-notice-expand-${notice.id}`}
                >
                  {expanded ? "접기" : "더보기"}
                </button>
              )}
            </>
          )}
          {hasImages && (
            <div className={`mt-3 ${notice.images.length > 1 ? "grid grid-cols-2 gap-2" : ""}`}>
              {notice.images.map((img) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  alt="공지 이미지"
                  className="w-full rounded-lg object-contain max-h-[480px] bg-gray-50 border border-gray-100"
                  data-testid={`img-notice-${notice.id}-${img.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Notices() {
  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

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
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-24 text-gray-400" data-testid="text-notices-empty">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="text-base font-medium">등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
