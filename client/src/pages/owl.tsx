import { useState } from "react";
import { PageLayout } from "@/components/layout";
import { Moon, Clock, BookOpen, CheckCircle, ChevronLeft, ChevronRight, X, MessageSquare, UserCheck, CalendarCheck, Wifi, Thermometer, Camera, Smartphone, Droplets } from "lucide-react";
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

interface LightboxPhoto {
  src: string;
  label: string;
}

const FACILITY_PHOTOS: LightboxPhoto[] = [
  { src: "/owl-entrance.jpeg",    label: "올빼미 스파르타 입구" },
  { src: "/owl-reception.jpeg",   label: "프런트 & 접수" },
  { src: "/owl-boys-seats.jpeg",  label: "남학생 좌석" },
  { src: "/owl-girls-seats.jpeg", label: "여학생 좌석" },
  { src: "/owl-cctv.jpeg",        label: "CCTV 실시간 모니터" },
  { src: "/owl-checkin.jpeg",     label: "출석 체크 시스템" },
  { src: "/owl-phoneboxes.jpeg",  label: "핸드폰 보관함" },
];

const STATIC_POSTERS: LightboxPhoto[] = [
  { src: "/owl-poster-scholarship.jpeg", label: "영통이강 올빼미 장학생 1기 모집" },
];

function FadeImage({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

function PhotoLightbox({ photos, initialIndex, onClose }: {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);
  const showNav = photos.length > 1;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 transition-colors"
        onClick={onClose}
        data-testid="button-lightbox-close"
      >
        <X className="w-7 h-7" />
      </button>
      {showNav && (
        <button
          className="absolute left-3 sm:left-6 text-white/70 hover:text-white p-2 transition-colors"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          data-testid="button-lightbox-prev"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      <div className="px-4 sm:px-16 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[idx].src}
          alt={photos[idx].label}
          className="w-full max-h-[80vh] object-contain"
        />
        <p className="text-white/80 text-center text-sm mt-3">{photos[idx].label}</p>
        {showNav && (
          <p className="text-white/40 text-center text-xs mt-1">{idx + 1} / {photos.length}</p>
        )}
      </div>
      {showNav && (
        <button
          className="absolute right-3 sm:right-6 text-white/70 hover:text-white p-2 transition-colors"
          onClick={(e) => { e.stopPropagation(); next(); }}
          data-testid="button-lightbox-next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
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

  const [facilityLightbox, setFacilityLightbox] = useState<number | null>(null);
  const [posterLightbox, setPosterLightbox] = useState<number | null>(null);

  const apiBannerPosters: LightboxPhoto[] = banners
    .filter((b) => b.is_active && b.image_url)
    .map((b) => ({ src: b.image_url!, label: b.title || "올빼미 포스터" }));

  const posterLightboxPhotos: LightboxPhoto[] = [...STATIC_POSTERS, ...apiBannerPosters];
  const allPosters = posterLightboxPhotos;

  return (
    <>
      {facilityLightbox !== null && (
        <PhotoLightbox
          photos={FACILITY_PHOTOS}
          initialIndex={facilityLightbox}
          onClose={() => setFacilityLightbox(null)}
        />
      )}
      {posterLightbox !== null && (
        <PhotoLightbox
          photos={posterLightboxPhotos}
          initialIndex={posterLightbox}
          onClose={() => setPosterLightbox(null)}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">

        {allPosters.length > 0 && (
          <section className="mb-10" data-testid="section-owl-posters">
            <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[#7B2332] inline-block" />
              홍보 포스터
            </h2>
            <div className={`grid gap-4 ${allPosters.length === 1 ? "grid-cols-1 max-w-xs" : allPosters.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {allPosters.map((p, i) => (
                <button
                  key={p.src}
                  onClick={() => setPosterLightbox(i)}
                  className="group relative overflow-hidden rounded-sm shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7B2332] text-left min-h-[120px]"
                  data-testid={`button-owl-poster-${i}`}
                >
                  <FadeImage
                    src={p.src}
                    alt={p.label}
                    eager={i === 0}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-800 shadow">
                      크게 보기
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section data-testid="section-owl-gallery">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-6 h-0.5 bg-[#7B2332] inline-block" />
            시설 사진
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FACILITY_PHOTOS.map((photo, i) => (
              <button
                key={photo.src}
                onClick={() => setFacilityLightbox(i)}
                className={`group relative overflow-hidden rounded-sm bg-gray-200 aspect-[4/3] focus:outline-none focus:ring-2 focus:ring-[#7B2332] ${
                  i === 0 ? "col-span-2 aspect-square sm:aspect-[4/3]" : ""
                }`}
                data-testid={`button-owl-photo-${i}`}
              >
                <FadeImage
                  src={photo.src}
                  alt={photo.label}
                  eager={i < 2}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs font-semibold leading-snug">{photo.label}</p>
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

      {/* 안내 배너 */}
      <div className="bg-[#1a1a2e] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest text-[#c0a878] uppercase mb-3">올빼미 스파르타 학습관</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" data-testid="text-owl-info-title">
            365일 · 24시간 운영하는 프리미엄 자습 공간
          </h2>
          <p className="text-sm text-white/60 max-w-xl mx-auto leading-relaxed">
            전담 관리 선생님이 상주하는 쾌적한 독서실 환경에서<br className="hidden sm:block" /> 오직 공부에만 집중하세요.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* 이용 방법 */}
        <section className="mb-16" data-testid="text-owl-usage-title">
          <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase mb-6">이용 방법</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-0 relative">
            {/* 연결선 (데스크톱) */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gray-200 z-0" />
            {[
              {
                step: "01",
                icon: MessageSquare,
                title: "상담 신청",
                desc: "전화 또는 방문으로 올빼미 장학생 혜택을 상담받으세요.",
              },
              {
                step: "02",
                icon: UserCheck,
                title: "자격 확인 & 등록",
                desc: "장학생 지원 자격 확인 후 담당자와 등록 절차를 진행합니다.",
              },
              {
                step: "03",
                icon: CalendarCheck,
                title: "바로 이용 시작",
                desc: "등록 즉시 좌석을 배정받고 학습관을 이용할 수 있습니다.",
              },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="relative z-10 flex flex-col items-center text-center px-6 py-6 sm:py-0 sm:pb-0">
                {/* 모바일: 왼쪽 선 */}
                {i < 2 && (
                  <div className="sm:hidden absolute left-8 top-[4.5rem] bottom-0 w-px bg-gray-200" />
                )}
                <div className="w-16 h-16 rounded-full bg-white border-2 border-[#7B2332] flex items-center justify-center mb-4 shadow-sm">
                  <Icon className="w-6 h-6 text-[#7B2332]" />
                </div>
                <p className="text-[10px] font-bold tracking-widest text-[#7B2332] mb-1">STEP {step}</p>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-[200px]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 운영 시간 */}
        <section className="mb-16" data-testid="text-owl-hours-title">
          <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase mb-6">운영 시간</p>
          <div className="overflow-hidden border border-gray-200">
            {[
              { day: "평일 (월 ~ 금)", time: "14:00 ~ 24:00", note: "하교 후 이용", highlight: false },
              { day: "토 · 일 · 공휴일", time: "08:00 ~ 24:00", note: "", highlight: false },
              { day: "내신 시험 기간", time: "13:00 ~ 24:00", note: "학기중 특별 운영", highlight: false },
              { day: "방학 (썸머 · 윈터)", time: "08:00 ~ 24:00", note: "연중무휴 365일", highlight: true },
            ].map((item, i) => (
              <div
                key={item.day}
                className={`flex items-center justify-between px-6 py-4 ${
                  i < 3 ? "border-b border-gray-100" : ""
                } ${item.highlight ? "bg-[#7B2332]" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                data-testid={`card-time-${item.day}`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`w-4 h-4 flex-shrink-0 ${item.highlight ? "text-white/70" : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${item.highlight ? "text-white/90" : "text-gray-700"}`}>{item.day}</span>
                  {item.note && (
                    <span className={`hidden sm:inline-block text-xs px-2 py-0.5 rounded-full ${item.highlight ? "bg-white/20 text-white/80" : "bg-gray-100 text-gray-500"}`}>
                      {item.note}
                    </span>
                  )}
                </div>
                <span className={`text-base font-bold tabular-nums ${item.highlight ? "text-white" : "text-[#7B2332]"}`}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 시설 안내 */}
        <section data-testid="text-owl-facilities-title">
          <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase mb-6">시설 안내</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Moon,         label: "독서실 좌석 75석" },
              { icon: Thermometer,  label: "냉·난방 완비" },
              { icon: Wifi,         label: "인강용 무료 Wi-Fi" },
              { icon: Droplets,     label: "냉·온수 정수기" },
              { icon: Camera,       label: "CCTV 실시간 모니터링" },
              { icon: UserCheck,    label: "전담 관리 선생님" },
              { icon: Smartphone,   label: "핸드폰 보관함" },
              { icon: CalendarCheck,label: "출석 체크 시스템" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 py-5 px-3 bg-white border border-gray-100 hover:border-[#7B2332]/30 hover:shadow-sm transition-all text-center"
              >
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#7B2332]" />
                </div>
                <span className="text-xs font-medium text-gray-700 leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </section>

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
