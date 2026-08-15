import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CalendarDays } from "lucide-react";
import { ImageLightbox } from "@/components/image-lightbox";
import { ReservationModal } from "@/components/reservation-modal";

interface SummaryTimetable {
  id: number;
  division: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export function SummaryTimetableSection({ division, title }: { division: string; title: string }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [reserveModalOpen, setReserveModalOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<SummaryTimetable[]>({
    queryKey: ["/api/summary-timetables", division],
    queryFn: async () => {
      const res = await fetch(`/api/summary-timetables?division=${encodeURIComponent(division)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16" data-testid={`summary-empty-${division}`}>
        <p className="text-sm text-gray-400 mb-4">등록된 요약 시간표가 없습니다.</p>
        <button
          onClick={() => setReserveModalOpen(true)}
          className="px-6 py-2.5 bg-[#7B2332] text-white text-xs font-bold rounded hover:bg-[#6B1D2A] transition-colors shadow-sm inline-flex items-center gap-1.5"
          data-testid="button-summary-empty-reservation"
        >
          <CalendarDays className="w-4 h-4" />
          수강예약 신청하기
        </button>
        <ReservationModal
          open={reserveModalOpen}
          onClose={() => setReserveModalOpen(false)}
          className={division === "high-g3" ? "고3 수강예약" : `${title} 수강예약`}
          subject={division === "high-g3" ? "고3 수강예약" : undefined}
          teacherName="고등관 전담강사"
        />
      </div>
    );
  }

  return (
    <>
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-gray-50" data-testid={`section-summary-${division}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-[#7B2332]" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900" data-testid={`text-summary-title-${division}`}>
                {title}
              </h2>
            </div>
            <button
              onClick={() => setReserveModalOpen(true)}
              className="px-5 py-2.5 bg-[#7B2332] text-white text-sm font-bold rounded-lg hover:bg-[#6B1D2A] transition-colors flex items-center justify-center gap-2 shadow-sm self-start sm:self-auto"
              data-testid="button-summary-reservation-header"
            >
              <CalendarDays className="w-4 h-4" />
              {division === "high-g3" ? "고3 수강예약 신청" : "수강예약 신청"}
            </button>
          </div>
          <div className="space-y-4 flex flex-col items-center">
            {items.map((item) => (
              <div
                key={item.id}
                className="w-full max-w-2xl cursor-zoom-in"
                data-testid={`img-summary-${item.id}`}
                onClick={() => setLightboxSrc(item.image_url)}
              >
                <img
                  src={item.image_url}
                  alt={title}
                  className="w-full border border-gray-200 rounded hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">터치하면 크게 볼 수 있어요</p>

          {/* Bottom CTA Banner for Reservation */}
          <div className="mt-12 max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm text-center">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-2">
              {division === "high-g3" ? "고3 수능파이널 / 정규반 수강예약" : `${title} 수강예약`}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed">
              원하시는 강좌의 수강예약을 신청해주시면 개별 상담 및 상세 안내를 도와드립니다.
            </p>
            <button
              onClick={() => setReserveModalOpen(true)}
              className="px-8 py-3 bg-[#7B2332] text-white font-bold text-sm rounded-lg hover:bg-[#6B1D2A] transition-all shadow-md inline-flex items-center gap-2"
              data-testid="button-summary-reservation-bottom"
            >
              <CalendarDays className="w-4 h-4" />
              수강예약 신청하기
            </button>
          </div>
        </div>
      </section>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={title}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <ReservationModal
        open={reserveModalOpen}
        onClose={() => setReserveModalOpen(false)}
        className={division === "high-g3" ? "고3 수강예약" : `${title} 수강예약`}
        subject={division === "high-g3" ? "고3 수강예약" : undefined}
        teacherName="고등관 전담강사"
      />
    </>
  );
}

