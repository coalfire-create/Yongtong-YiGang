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
  description?: string;
}

const FACILITY_PHOTOS: LightboxPhoto[] = [
  { src: "/owl-entrance.jpeg",    label: "올빼미 스파르타 입구" },
  { 
    src: "/owl-girls-seats.jpeg", 
    label: "남학생 좌석",
    description: "개별 칸막이와 편안한 시디즈 의자가 구비된 몰입형 학습 공간입니다. 인강 전용 WIFI 운영 및 외부 사이트 접속 차단 시스템으로 학습에만 집중할 수 있는 최고의 환경을 제공합니다."
  },
  { 
    src: "/owl-boys-seats.jpeg",  
    label: "여학생 좌석",
    description: "개별 칸막이와 편안한 시디즈 의자가 구비된 몰입형 학습 공간입니다. 인강 전용 WIFI 운영 및 외부 사이트 접속 차단 시스템으로 학습에만 집중할 수 있는 최고의 환경을 제공합니다."
  },
  { src: "/owl-reception.jpeg",   label: "프런트 & 접수" },
  { 
    src: "/owl-cctv.jpeg",        
    label: "CCTV 실시간 모니터",
    description: "좌석별 학습 상태를 수시로 확인하며, 상시 녹화를 통해 인강 및 졸음 관리 등 압도적인 몰입 환경을 유지합니다."
  },
  { 
    src: "/owl-checkin.jpeg",     
    label: "출석 체크 시스템",
    description: "등하원 즉시 학부모님께 실시간 문자를 전송하며, 사전 제출된 개인 일정 기반으로 입퇴실 및 부재 관리를 자동 체크합니다."
  },
  { 
    src: "/owl-phoneboxes.jpeg",  
    label: "핸드폰 보관함",
    description: "입실 시 휴대폰을 개인 좌석 번호에 맞춰 지정 보관함에 보관하여 학습 외 요소를 원천 차단합니다."
  },
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
        <div className="mt-4 text-center">
          <p className="text-white text-lg font-bold">{photos[idx].label}</p>
          {photos[idx].description && (
            <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-xl mx-auto">{photos[idx].description}</p>
          )}
        </div>
        {showNav && (
          <p className="text-white/40 text-center text-xs mt-4">{idx + 1} / {photos.length}</p>
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

        <section data-testid="section-owl-gallery" className="space-y-16">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-8">
            <span className="w-6 h-0.5 bg-[#7B2332] inline-block" />
            프리미엄 학습 공간 & 관리 시스템
          </h2>

          {/* Section 1: 학습 공간 */}
          <div className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
              <button
                onClick={() => setFacilityLightbox(1)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="남학생 좌석 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[1].src}
                  alt={FACILITY_PHOTOS[1].label}
                  eager={true}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    남학생 좌석 크게 보기
                  </span>
                </div>
              </button>
              <button
                onClick={() => setFacilityLightbox(2)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="여학생 좌석 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[2].src}
                  alt={FACILITY_PHOTOS[2].label}
                  eager={true}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    여학생 좌석 크게 보기
                  </span>
                </div>
              </button>
            </div>
            <div className="p-6 sm:p-8 border-t border-gray-100">
              <span className="text-[10px] font-extrabold tracking-widest text-[#7B2332] uppercase bg-red-50 px-2.5 py-1 inline-block mb-4">
                SPACE IN NATURE
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                압도적 몰입을 위한 성별 분리 학습 공간
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    공부하지 않을 수 없는 완벽한 면학 분위기
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>내 주위를 둘러싼 최상위 학생들과의 조용하고 치열한 시너지 효과</li>
                    <li>개별 칸막이와 프리미엄 시디즈 의자 탑재로 장시간 공부에도 피로도 최소화</li>
                    <li>남학생 및 여학생 전용 구역 완전 분리로 불필요한 시선 차단 및 자습 몰입감 형성</li>
                  </ul>
                </div>
                <div className="space-y-3 md:border-l md:border-gray-100 md:pl-8">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    수업 공간과 자습 공간의 완벽한 분리
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>수업을 마친 후 공부 흐름이 끊기지 않는 프리미엄 자습 전용관 바로 연계</li>
                    <li>인강 전용 기가 WIFI망 제공 및 유해 외부 사이트, SNS, 게임 원천 차단 방화벽 시스템</li>
                    <li>태블릿 및 노트북의 완벽한 학습 목적 활용 강제화로 최고 수준의 집중 상태 보장</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: 출결 및 모니터링 관리 */}
          <div className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
              <button
                onClick={() => setFacilityLightbox(5)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="출석 체크 시스템 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[5].src}
                  alt={FACILITY_PHOTOS[5].label}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    출석 패드 크게 보기
                  </span>
                </div>
              </button>
              <button
                onClick={() => setFacilityLightbox(4)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="CCTV 실시간 모니터 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[4].src}
                  alt={FACILITY_PHOTOS[4].label}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    실시간 모니터 크게 보기
                  </span>
                </div>
              </button>
            </div>
            <div className="p-6 sm:p-8 border-t border-gray-100">
              <span className="text-[10px] font-extrabold tracking-widest text-[#7B2332] uppercase bg-red-50 px-2.5 py-1 inline-block mb-4">
                MANAGEMENT SYSTEM
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                빈틈없는 실시간 출결 체크 & 졸음·인강 밀착 케어
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    등하원 즉시 실시간 문자 안심 시스템
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>학습관 전용 출결 패드 입력 즉시 학부모님께 실시간 문자 발송</li>
                    <li>등하원 체크 시간의 정밀하고 정확한 추적으로 안심하고 맡길 수 있는 환경 제공</li>
                    <li>사전 제출된 학생 개인 일정을 기반으로 무단 외출, 지각, 결석 즉각 파악 및 철저한 부재 관리</li>
                  </ul>
                </div>
                <div className="space-y-3 md:border-l md:border-gray-100 md:pl-8">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    CCTV 상시 녹화 모니터링 & 생활 순찰
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>사각지대 없는 CCTV 카메라를 통해 75석 전 좌석의 면학 상태를 실시간 확인</li>
                    <li>태블릿 및 인강 모니터링으로 학습 외 딴짓(유튜브, 웹서핑 등)을 상시 감시 및 차단</li>
                    <li>관리 교사의 상시 순찰로 미세한 생활 태도 흔들림 및 졸음 즉각적인 케어로 몰입 극대화</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: 완벽한 디지털 디톡스 */}
          <div className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="p-2">
              <button
                onClick={() => setFacilityLightbox(6)}
                className="group relative overflow-hidden bg-gray-100 aspect-[21/9] sm:aspect-[21/8] w-full block"
                aria-label="핸드폰 보관함 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[6].src}
                  alt={FACILITY_PHOTOS[6].label}
                  className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    보관함 크게 보기
                  </span>
                </div>
              </button>
            </div>
            <div className="p-6 sm:p-8 border-t border-gray-100">
              <span className="text-[10px] font-extrabold tracking-widest text-[#7B2332] uppercase bg-red-50 px-2.5 py-1 inline-block mb-4">
                DIGITAL DETOX
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                학습 저해 요소를 뿌리 뽑는 강력한 핸드폰 의무 수거
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    좌석 지정 번호 보관 시스템
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>학습관 입실 시 본인 좌석 번호와 매치되는 휴대폰 보관함에 의무적으로 보관</li>
                    <li>입실 시점부터 퇴실까지 스마트폰 사용을 완벽 차단하여 불필요한 미디어 자극 격리</li>
                    <li>미제출 시 벌점 부과 및 공정한 규칙 시행으로 원칙에 입각한 엄격한 사용 통제</li>
                  </ul>
                </div>
                <div className="space-y-3 md:border-l md:border-gray-100 md:pl-8">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    스스로 통제하는 집중력 훈련
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>공부를 방해하는 최대 요소를 물리적으로 완전 분리하여 학습 중 낭비되는 자투리 시간 완전 제거</li>
                    <li>자연스럽게 디지털 도구와 멀어지는 디톡스를 경험하며 순공 자습 시간의 폭발적 극대화</li>
                    <li>눈앞에 유혹이 없어 흔들리지 않고 장기적으로 자기 주도 학습 및 집중 습관의 힘 육성</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: 입구 & 인프라 */}
          <div className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
              <button
                onClick={() => setFacilityLightbox(0)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="입구 시설 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[0].src}
                  alt={FACILITY_PHOTOS[0].label}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    입구 크게 보기
                  </span>
                </div>
              </button>
              <button
                onClick={() => setFacilityLightbox(3)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="접수처 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[3].src}
                  alt={FACILITY_PHOTOS[3].label}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-opacity duration-300">
                    접수처 크게 보기
                  </span>
                </div>
              </button>
            </div>
            <div className="p-6 sm:p-8 border-t border-gray-100">
              <span className="text-[10px] font-extrabold tracking-widest text-[#7B2332] uppercase bg-red-50 px-2.5 py-1 inline-block mb-4">
                ENVIRONMENT
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                학생의 시작과 끝을 함께하는 쾌적한 출입구 & 데스크 인프라
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    차분하고 정돈된 프리미엄 디자인 입구
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>올빼미 관리형 학습관만의 품격과 프라이버시가 존중되는 아늑하고 쾌적한 전용 도어 설계</li>
                    <li>입장하는 순간부터 학업 모드로 자동 전환될 수 있는 특유의 차분하고 정돈된 인테리어 분위기</li>
                  </ul>
                </div>
                <div className="space-y-3 md:border-l md:border-gray-100 md:pl-8">
                  <h4 className="font-bold text-[#7B2332] text-base flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                    상주형 교직원의 즉각적인 대응 데스크
                  </h4>
                  <ul className="space-y-2 text-gray-600 pl-3 list-disc">
                    <li>실시간 학습 관리 교직원이 항상 상주하며 불편 사항 해결 및 철저한 질서 상시 유지</li>
                    <li>철저한 면학 태도 관리의 콘트롤 타워 역할을 담당하는 전문 접수 프런트 완비</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">사진을 클릭하시면 전체 화면으로 크게 확대하여 감상하실 수 있습니다.</p>
        </section>
      </div>
    </>
  );
}

function OwlDayTimeline() {
  const [activeTab, setActiveTab] = useState(0);

  const TIMELINE_DATA = [
    {
      title: "등원 & 디지털 디톡스",
      time: "08:00 AM",
      phase: "01",
      subtitle: "성장으로 가득 찬 완벽한 하루의 시작",
      image: "/owl-entrance.jpeg",
      bullets: [
        "스마트 안심 출결 태킹: 등하원 패드에 출결 번호를 태깅하면 학부모님께 입실 완료 알림 문자가 즉각 발송됩니다.",
        "의무 휴대폰 제출 및 수거: 입실 시 개인의 지정된 번호 보관함에 스마트폰을 무조건 제출하여 공부방해 1순위 요소를 차단합니다.",
        "학업 몰입 모드 준비: 모든 소지품을 사물함과 책상에 정리하고, 졸음과 웹서핑을 사전에 방지할 준비를 마칩니다."
      ],
      quote: {
        author: "올빼미 1기 장학생 김O호",
        text: "등원하자마자 스마트폰을 수거함에 반납하니까 매번 오던 알림 문자나 SNS에 피로감을 느낄 필요가 없어졌어요. 순공 시간이 하루에 최소 3시간 이상 수직 상승하는 기적을 겪었습니다!"
      }
    },
    {
      title: "올빼미 독서실 몰입 자습",
      time: "08:40 AM ~",
      phase: "02",
      subtitle: "치열하고 정숙한 초집중 몰입 공간",
      image: "/owl-girls-seats.jpeg",
      bullets: [
        "시디즈 의자 & 개별 칸막이: 오래 앉아 있어도 피로감이 적은 시디즈 의자와 프라이버시가 확보되는 개별 와이드 책상이 완비되어 있습니다.",
        "인강 전용 초고속 방화벽 WIFI: 자습에 필수적인 인강 수강용 초고속 무선 인터넷을 제공하되, SNS/유튜브/게임/웹툰 등 유해 사이트는 원천 차단됩니다.",
        "남/여 전용 자습 구역 완전 분리: 이성 간의 불필요한 주의 분산을 차단하기 위해 학습 공간을 독립적으로 배치하여 면학 극대화."
      ],
      quote: {
        author: "올빼미 1기 장학생 이O민",
        text: "자습실 책상이 정말 넓어서 무거운 모의고사 시험지나 개념서 여러 권을 펼쳐놓아도 넉넉했어요. 기가 와이파이에 방화벽이 쳐져 있어서 공부 딴짓할 생각조차 못하고 온전히 학습에만 몰입했습니다."
      }
    },
    {
      title: "빈틈없는 밀착 케어",
      time: "상시 운영",
      phase: "03",
      subtitle: "사각지대 없는 모니터링 및 실시간 순찰",
      image: "/owl-cctv.jpeg",
      bullets: [
        "CCTV 실시간 학습 상태 점검: 사각지대 없는 실시간 모니터를 통해 75석 전체 학생들의 자습 집중도와 학습 상태를 정밀 체크합니다.",
        "관리 교사의 상시 생활 순찰: 전문 생활 관리 선생님이 학습관 내부를 정기적으로 돌며 졸음 방지, 태도 경고, 태블릿 화면 검사를 실시합니다.",
        "체계적인 벌점제 및 환경 관리: 학습관 내부 소음 통제는 물론, 쾌적한 학습 환경 유지를 위해 실내 온도와 습도를 상시 최적화합니다."
      ],
      quote: {
        author: "올빼미 2기 장학생 최O준",
        text: "순간 졸음이 밀려오거나 나태해질 때쯤 관리 선생님이 살며시 깨워주셔서 금방 정신을 다잡을 수 있었습니다. 누군가 나를 지켜봐 주고 함께 호흡한다는 생각 덕분에 하루 종일 팽팽한 긴장감을 유지하며 자습했습니다."
      }
    },
    {
      title: "1:1 대면 질의응답 & 피드백",
      time: "상시 Q&A",
      phase: "04",
      subtitle: "막힘 없는 질문과 체계적인 입시 설계",
      image: "/owl-reception.jpeg",
      bullets: [
        "1:1 과목별 강사 대면 Q&A: 자습 중 어려운 기출문제나 오답 등 막히는 개념은 데스크에 상주하는 과목별 선생님께 직접 대면 질의응답을 신청할 수 있습니다.",
        "입학사정관 출신 입시 매니지먼트: 9년 차 대입 사정관 경력의 한노아 입시 소장이 자습생 전용 1:1 진로진학/학종 컨설팅을 즉각 지원합니다.",
        "개인 스케줄 밀착 부재 관리: 사전에 제출된 개별 단과 수업 또는 피치 못할 사유의 외출 외에는 자습실 무단 이탈을 엄격히 규제합니다."
      ],
      quote: {
        author: "올빼미 2기 장학생 박O우",
        text: "혼자 공부하다 보면 어려운 수학 문제에 막혀서 아까운 시간을 통째로 버리는 경우가 많은데, 영통이강에서는 상주하시는 조교와 선생님들께 즉시 대면 피드백을 받아 해결할 수 있어서 모르는 것 없이 시원하게 공부를 마쳤습니다."
      }
    },
    {
      title: "안전한 퇴실 및 재점검",
      time: "~ 24:00",
      phase: "05",
      subtitle: "철저한 마무리로 오늘 하루의 보람찬 퇴근",
      image: "/owl-checkin.jpeg",
      bullets: [
        "일일 자습 과제 및 최종 책상 정리: 밤 10시(또는 자율연장 12시) 자습 종료 후, 오늘 달성한 분량을 스스로 확인하고 책상을 말끔하게 비웁니다.",
        "스마트 안심 하원 완료 문자: 하원 패드를 태킹함과 동시에 등록된 학부모님의 휴대폰으로 안전 하원 문자가 실시간 자동 발송됩니다.",
        "관리 교사의 최종 시설 점검: 안전 귀가를 돕고 다음 날의 쾌적한 자습을 위해 학습관 전체의 보안 및 시설 상태를 최종 점검하고 마무리합니다."
      ],
      quote: {
        author: "올빼미 1기 장학생 학부모님 수기",
        text: "밤늦게 아이가 집에 올 때 항상 걱정이었는데, 하원 태그와 동시에 실시간 안심 귀가 문자가 와서 마음을 완전히 놓을 수 있었습니다. 등원부터 하원까지 아이를 완벽하게 보살펴주는 스파르타 시스템에 대만족합니다."
      }
    }
  ];

  return (
    <div className="bg-gray-50/50 py-16 border-y border-gray-200/60 my-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <p className="text-xs font-black tracking-widest text-[#7B2332] uppercase">DAILY SYSTEM FLOW</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            등원하는 순간부터 하원까지
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            올빼미 장학생들의 하루는 철저하게 계산된 타임라인에 따라 완벽하게 통제 및 지원됩니다.<br />
            의무 자습 교시에는 몰입을, 피드백 시간에는 성장을 이뤄냅니다.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap justify-center gap-2 border-b border-gray-200 pb-4 mb-10 overflow-x-auto scrollbar-none">
          {TIMELINE_DATA.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 min-w-[140px] text-center py-3.5 px-4 border-b-2 font-bold text-xs sm:text-sm transition-all duration-300 ${
                activeTab === idx
                  ? "border-[#7B2332] text-[#7B2332] bg-[#7B2332]/5 scale-102"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <div className="text-[10px] tracking-wider text-gray-400 mb-1">PHASE {tab.phase}</div>
              <div className="whitespace-nowrap">{tab.title}</div>
            </button>
          ))}
        </div>

        {/* Active Content Block */}
        <div className="bg-white border border-gray-200/80 shadow-md rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Image Area */}
            <div className="lg:col-span-6 relative aspect-video lg:aspect-auto min-h-[300px] lg:h-auto bg-gray-100 overflow-hidden group">
              <img
                src={TIMELINE_DATA[activeTab].image}
                alt={TIMELINE_DATA[activeTab].title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-[10px] font-black tracking-widest text-[#c0a878] uppercase mb-1">TIMELINE PHASE {TIMELINE_DATA[activeTab].phase}</span>
                <h3 className="text-xl sm:text-2xl font-black mb-1 flex items-center gap-2">
                  {TIMELINE_DATA[activeTab].title}
                  <span className="text-xs font-normal text-white/80 bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">{TIMELINE_DATA[activeTab].time}</span>
                </h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-medium">{TIMELINE_DATA[activeTab].subtitle}</p>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              
              {/* Bullet details */}
              <div className="space-y-6">
                <span className="text-[10px] font-extrabold tracking-widest text-[#7B2332] uppercase bg-red-50 px-2.5 py-1 inline-block">
                  SPARTA DAILY PROTOCOL
                </span>
                <h4 className="text-lg font-bold text-gray-900 leading-snug">
                  {TIMELINE_DATA[activeTab].title} 핵심 운영 원칙
                </h4>
                <ul className="space-y-4 text-sm text-gray-600">
                  {TIMELINE_DATA[activeTab].bullets.map((bullet, i) => {
                    const [title, desc] = bullet.split(": ");
                    return (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#7B2332] mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <strong className="text-gray-900 block font-bold mb-0.5">{title}</strong>
                          <span className="text-xs text-gray-500 leading-relaxed">{desc}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Student Testimonial */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#7B2332]" />
                  <span className="text-[10px] font-black text-gray-500 tracking-wider uppercase">STUDENT TESTIMONIAL</span>
                </div>
                <p className="text-xs text-gray-600 italic leading-relaxed">
                  &ldquo;{TIMELINE_DATA[activeTab].quote.text}&rdquo;
                </p>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400">— {TIMELINE_DATA[activeTab].quote.author}</span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
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
            365일 운영하는 프리미엄 자습 공간
          </h2>
          <p className="text-sm text-white/60 max-w-xl mx-auto leading-relaxed">
            전담 관리 선생님이 상주하는 쾌적한 독서실 환경에서<br className="hidden sm:block" /> 오직 공부에만 집중하세요.
          </p>
        </div>
      </div>

      {/* 등원하는 순간부터 하원까지 인터랙티브 타임라인 */}
      <OwlDayTimeline />


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
              { day: "내신 시험 기간", time: "13:00 ~ 24:00", note: "학기중 특별 운영", highlight: true },
              { day: "방학 (썸머 · 윈터)", time: "08:00 ~ 24:00", note: "연중무휴 365일", highlight: false },
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
