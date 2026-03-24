import { useState } from "react";
import { PageLayout } from "@/components/layout";
import { Moon, Clock, BookOpen, CheckCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
}

const FACILITY_PHOTOS = [
  { src: "/owl-entrance.jpeg",    label: "올빼미 스파르타 입구",  span: "col-span-1 row-span-1" },
  { src: "/owl-reception.jpeg",   label: "프런트 &amp; 접수",       span: "col-span-1 row-span-1" },
  { src: "/owl-boys-seats.jpeg",  label: "남학생 좌석",            span: "col-span-1 row-span-1" },
  { src: "/owl-girls-seats.jpeg", label: "여학생 좌석",            span: "col-span-1 row-span-1" },
  { src: "/owl-cctv.jpeg",        label: "CCTV 실시간 모니터",     span: "col-span-1 row-span-1" },
  { src: "/owl-checkin.jpeg",     label: "출석 체크 시스템",       span: "col-span-1 row-span-1" },
  { src: "/owl-phoneboxes.jpeg",  label: "핸드폰 보관함",          span: "col-span-1 row-span-1" },
];

function PhotoLightbox({ photos, initialIndex, onClose }: {
  photos: typeof FACILITY_PHOTOS;
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
        onClick={onClose}
        data-testid="button-lightbox-close"
      >
        <X className="w-7 h-7" />
      </button>
      <button
        className="absolute left-3 sm:left-6 text-white/70 hover:text-white p-2"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        data-testid="button-lightbox-prev"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <div className="px-16 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[idx].src}
          alt={photos[idx].label}
          className="w-full max-h-[80vh] object-contain"
        />
        <p className="text-white/80 text-center text-sm mt-3" dangerouslySetInnerHTML={{ __html: photos[idx].label }} />
        <p className="text-white/40 text-center text-xs mt-1">{idx + 1} / {photos.length}</p>
      </div>
      <button
        className="absolute right-3 sm:right-6 text-white/70 hover:text-white p-2"
        onClick={(e) => { e.stopPropagation(); next(); }}
        data-testid="button-lightbox-next"
      >
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  );
}

function OwlHeroSection() {
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners", "owl"],
    queryFn: async () => {
      const res = await fetch("/api/banners?division=owl");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const posters = banners.filter((b) => b.is_active && b.image_url);
  const allPhotos = [
    ...FACILITY_PHOTOS,
    ...posters.map((b) => ({ src: b.image_url!, label: b.title || "올빼미", span: "col-span-1 row-span-1", link: b.link_url })),
  ];

  const facilityPhotos = FACILITY_PHOTOS;
  const posterPhotos = posters;

  return (
    <>
      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={facilityPhotos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">

        {posterPhotos.length > 0 && (
          <section className="mb-10" data-testid="section-owl-posters">
            <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[#7B2332] inline-block" />
              홍보 포스터
            </h2>
            <div className={`grid gap-4 ${posterPhotos.length === 1 ? "grid-cols-1 max-w-sm" : posterPhotos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {posterPhotos.map((b) => {
                const img = (
                  <img
                    src={b.image_url!}
                    alt={b.title || "올빼미 포스터"}
                    className="w-full h-auto object-cover rounded-sm"
                    data-testid={`owl-poster-${b.id}`}
                  />
                );
                return (
                  <div key={b.id} className="overflow-hidden rounded-sm shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    {b.link_url
                      ? <a href={b.link_url} target="_blank" rel="noopener noreferrer">{img}</a>
                      : img}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section data-testid="section-owl-gallery">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-6 h-0.5 bg-[#7B2332] inline-block" />
            시설 사진
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {facilityPhotos.map((photo, i) => (
              <button
                key={photo.src}
                onClick={() => setLightboxIdx(i)}
                className={`group relative overflow-hidden rounded-sm bg-gray-100 aspect-[4/3] focus:outline-none focus:ring-2 focus:ring-[#7B2332] ${
                  i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : ""
                }`}
                data-testid={`button-owl-photo-${i}`}
              >
                <img
                  src={photo.src}
                  alt={photo.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p
                    className="text-white text-xs font-semibold leading-snug"
                    dangerouslySetInnerHTML={{ __html: photo.label }}
                  />
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">사진을 클릭하면 크게 볼 수 있습니다</p>
        </section>
      </div>
    </>
  );
}

export function Owl() {
  return (
    <PageLayout>
      <OwlHeroSection />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div className="flex items-start gap-4 bg-white border border-gray-200 p-6 rounded-sm">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-50 rounded-full">
              <Moon className="w-5 h-5 text-[#7B2332]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-2" data-testid="text-owl-info-title">독학관 안내</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                조용하고 쾌적한 환경에서 집중 학습이 가능한 자습 공간입니다. 전문 관리 선생님이 상주하여 학습 분위기를 유지합니다.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white border border-gray-200 p-6 rounded-sm">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-50 rounded-full">
              <BookOpen className="w-5 h-5 text-[#7B2332]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-2" data-testid="text-owl-usage-title">이용 방법</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                "올빼미 장학생 지원 혜택"에 의거 담당자와 상담후 이용 가능합니다. 월~일 1년 365일 무휴로 운영합니다. 단 학기중에는 평일(월~금) 하교후 ~24시 운영이며 내신 시험기간에는 13시~24시 운영합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" data-testid="text-owl-hours-title">
            <Clock className="w-5 h-5 text-[#7B2332]" />
            운영 시간
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { day: "평일 (월~금)", time: "14:00 ~ 24:00", highlight: false },
              { day: "토요일/일요일/공휴일", time: "8:00 ~ 24:00", highlight: false },
              { day: "썸머·윈터 방학중", time: "8:00 ~ 24:00", sub: "월~일 365일 무휴", highlight: true },
            ].map((item) => (
              <div
                key={item.day}
                className={`text-center py-5 px-3 rounded-sm ${item.highlight ? "bg-[#7B2332] text-white" : "bg-white border border-gray-200"}`}
                data-testid={`card-time-${item.day}`}
              >
                <p className={`text-sm font-semibold mb-1.5 ${item.highlight ? "text-white/90" : "text-gray-600"}`}>{item.day}</p>
                <p className={`text-lg font-bold ${item.highlight ? "text-white" : "text-[#7B2332]"}`}>{item.time}</p>
                {item.sub && <p className={`text-xs mt-1 ${item.highlight ? "text-white/75" : "text-gray-400"}`}>{item.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" data-testid="text-owl-facilities-title">
            <CheckCircle className="w-5 h-5 text-[#7B2332]" />
            시설 안내
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {["개인 독서실 좌석 75석", "냉·난방/가습기/공기청정기 완비", "무료 Wi-Fi (사이트 차단 인강용 wifi)", "냉/온수 정수기", "CCTV 실시간 모니터링", "전문 관리 선생님 상주", "핸드폰 보관함 운영", "출석 체크 시스템"].map((feat) => (
              <div key={feat} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2332] flex-shrink-0" />
                <span className="text-sm text-gray-700">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export function OwlInfo() {
  return <Owl />;
}

export function OwlUsage() {
  return <Owl />;
}
