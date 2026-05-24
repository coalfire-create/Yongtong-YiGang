import { useState } from "react";
import { PageLayout } from "@/components/layout";
import { 
  Moon, Clock, BookOpen, CheckCircle, ChevronLeft, ChevronRight, X, 
  MessageSquare, UserCheck, CalendarCheck, Wifi, Thermometer, Camera, 
  Smartphone, Droplets, ShieldAlert, Award, Calendar, GraduationCap, 
  Users, MapPin, Send, HelpCircle, Utensils, AlertTriangle, ArrowRight, ChevronDown
} from "lucide-react";
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
  { 
    src: "/owl-girls-seats.jpeg", 
    label: "남학생 자습 구역 (성별 완전 분리)",
    description: "개별 와이드 칸막이와 척추 피로를 최소화하는 프리미엄 시디즈 의자가 구비된 성별 분리형 독서실입니다. 인강 전용 초고속 방화벽 WIFI 운영으로 공부 이외의 유해 사이트 접속을 철저하게 차단합니다."
  },
  { 
    src: "/owl-boys-seats.jpeg",  
    label: "여학생 자습 구역 (성별 완전 분리)",
    description: "개별 와이드 칸막이와 척추 피로를 최소화하는 프리미엄 시디즈 의자가 구비된 성별 분리형 독서실입니다. 인강 전용 초고속 방화벽 WIFI 운영으로 공부 이외의 유해 사이트 접속을 철저하게 차단합니다."
  },
  { 
    src: "/owl-cctv.jpeg",        
    label: "CCTV 75석 전 좌석 실시간 모니터링",
    description: "사각지대 없는 CCTV 설치로 학생들의 학습 상태를 실시간으로 교사 데스크에서 모니터링합니다. 태블릿 딴짓 방지 및 실시간 졸음 관리를 통해 한치의 흐트러짐도 허용하지 않습니다."
  },
  { 
    src: "/owl-checkin.jpeg",     
    label: "등·하원 안심 출석 체크 시스템",
    description: "전용 출결 태깅 패드를 통해 입퇴실 시 학부모님께 실시간 안심 문자가 즉시 전송되며, 사전 제출된 학생의 개인 스케줄에 맞춰 완벽한 이탈 및 부재 통제가 진행됩니다."
  },
  { 
    src: "/owl-phoneboxes.jpeg",  
    label: "핸드폰 좌석 번호별 지정 보관함",
    description: "학습관 입장 시 본인 좌석 지정 번호 보관함에 의무적으로 휴대폰을 반납합니다. 공부를 저해하는 1순위 유혹을 물리적으로 완벽 격리하여 초집중 순공 환경을 유지합니다."
  },
  { 
    src: "/owl-entrance.jpeg",    
    label: "올빼미 관리형 학습관 입구 전경",
    description: "영통이강학원 3관 및 4관 모던타운 505호에 위치해 있으며, 차분하고 엄숙한 면학 모드로 집중 전환되는 프리미엄 디자인이 적용된 입구 인터페이스입니다."
  },
  { 
    src: "/owl-reception.jpeg",   
    label: "상주형 관리 데스크 & 접수처",
    description: "풍부한 입시/생활 지도 경험의 교직원이 상주하여 실시간 순찰, 학습 질서 유지, 1:1 대면 질문 등록 및 생활 민원을 즉시 원스톱으로 해결해 줍니다."
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
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 transition-colors z-[210]"
        onClick={onClose}
        data-testid="button-lightbox-close"
      >
        <X className="w-7 h-7" />
      </button>
      {showNav && (
        <button
          className="absolute left-3 sm:left-6 text-white/70 hover:text-white p-2 transition-colors z-[210]"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          data-testid="button-lightbox-prev"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      <div className="px-4 sm:px-16 max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[idx].src}
          alt={photos[idx].label}
          className="w-full max-h-[75vh] object-contain mx-auto rounded"
        />
        <div className="mt-4 text-center bg-black/40 p-4 rounded backdrop-blur-sm max-w-2xl mx-auto">
          <p className="text-white text-lg font-bold">{photos[idx].label}</p>
          {photos[idx].description && (
            <p className="text-white/80 text-sm mt-2 leading-relaxed">{photos[idx].description}</p>
          )}
        </div>
        {showNav && (
          <p className="text-white/40 text-center text-xs mt-4">{idx + 1} / {photos.length}</p>
        )}
      </div>
      {showNav && (
        <button
          className="absolute right-3 sm:right-6 text-white/70 hover:text-white p-2 transition-colors z-[210]"
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
  const [facilityLightbox, setFacilityLightbox] = useState<number | null>(null);

  return (
    <>
      {facilityLightbox !== null && (
        <PhotoLightbox
          photos={FACILITY_PHOTOS}
          initialIndex={facilityLightbox}
          onClose={() => setFacilityLightbox(null)}
        />
      )}

      {/* Brand Hero Cover */}
      <div className="relative bg-[#1A1A2E] text-white py-20 overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#2D1520,transparent)] opacity-60" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7B2332]/10 rounded-full filter blur-3xl" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest text-[#E6C687] bg-[#7B2332]/40 border border-[#7B2332]/80 uppercase">
            <Moon className="w-3.5 h-3.5 text-[#E6C687] animate-pulse" /> Limited to 75 Seats Only
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
            올빼미 관리형 <span className="text-[#E6C687] font-extrabold">스파르타 학습관</span>
          </h1>
          <p className="text-lg sm:text-2xl font-light text-gray-300 max-w-3xl mx-auto leading-relaxed">
            &ldquo;대치동의 압도적인 학습 시스템을 수원 영통으로 고스란히 옮겨오다!&rdquo;
          </p>
          <div className="h-0.5 w-20 bg-[#E6C687] mx-auto my-4" />
          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            단순한 자리 제공을 넘어 24시간 실시간 입시 컨설팅, 시대인재 서바이벌 모의고사, 성별 완벽 분리 자습실, 초밀착 졸음 및 인강 관리가 결합된 영통 최고의 프리미엄 입시 센터입니다.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a 
              href="#care-dashboard"
              className="px-6 py-3 bg-[#7B2332] hover:bg-[#922A3B] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all rounded duration-300 flex items-center gap-2"
            >
              4대 밀착 CARE 시스템 확인 <ArrowRight className="w-4 h-4" />
            </a>
            <a 
              href="#timeline-storyboard"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 hover:border-white/40 transition-all rounded duration-300"
            >
              하루 일과 스토리보기
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        {/* Widescreen Interactive Photo Gallery */}
        <section id="facility-gallery" data-testid="section-owl-gallery" className="space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-black tracking-widest text-[#7B2332] uppercase">PREMIUM STUDY GALLERY</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              올빼미 완전몰입을 위한 완벽한 공간
            </h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
              공부에만 집중할 수 있도록 설계된 남녀 분리형 학습 자습실과 철저한 순공 환경을 직접 확인해보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Girls Seat & Boys Seat Widescreen Card */}
            <div className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 rounded flex flex-col justify-between">
              <button
                onClick={() => setFacilityLightbox(0)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="남학생 자습 구역 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[0].src}
                  alt={FACILITY_PHOTOS[0].label}
                  eager={true}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-[#7B2332] text-white text-xs font-bold px-4 py-2 rounded shadow transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    남학생 자습 구역 크게 보기
                  </span>
                </div>
              </button>
              <div className="p-6">
                <span className="text-[10px] font-black tracking-widest text-[#7B2332] bg-red-50 px-2.5 py-1 inline-block mb-3 rounded">
                  SPACE 01: MALE 자습실
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">남학생 전용 몰입형 학습 자습관</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  장시간 면학 시 누적되는 요추 피로도를 최소화하는 **최고급 시디즈 의자** 및 와이드 개별 칸막이를 도입했습니다. 남/여 동선 및 공간의 완벽한 분리를 통해 이성 간 불필요한 시선 차단과 최적의 집중 환경을 확보했습니다.
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 rounded flex flex-col justify-between">
              <button
                onClick={() => setFacilityLightbox(1)}
                className="group relative overflow-hidden bg-gray-100 aspect-[16/10] w-full"
                aria-label="여학생 자습 구역 크게 보기"
              >
                <FadeImage
                  src={FACILITY_PHOTOS[1].src}
                  alt={FACILITY_PHOTOS[1].label}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-[#7B2332] text-white text-xs font-bold px-4 py-2 rounded shadow transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    여학생 자습 구역 크게 보기
                  </span>
                </div>
              </button>
              <div className="p-6">
                <span className="text-[10px] font-black tracking-widest text-[#7B2332] bg-red-50 px-2.5 py-1 inline-block mb-3 rounded">
                  SPACE 02: FEMALE 자습실
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2">여학생 전용 몰입형 학습 자습관</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  독립적인 자습 전용석과 인강 전용 초고속 방화벽 WIFI를 제공하여 SNS, 웹툰, 유튜브 등 불필요한 학습 저해 요인을 원천 차단합니다. 주위 최상위권 학생들의 치열한 학구열 속에서 강력한 학습 흐름 시너지를 제공합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Three column system & control pictures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { idx: 2, tag: "03. MONITORING", title: "CCTV 실시간 모니터", desc: "좌석별 면학 흐름을 실시간 확인하며, 태블릿 딴짓 감지 및 상시 졸음 관리 순찰을 동시에 수행하여 팽팽한 텐션을 유지합니다." },
              { idx: 3, tag: "04. ACCESS CONTROL", title: "출석 안심 체크 시스템", desc: "패드 태깅과 동시에 부모님께 안심 등하원 문자가 즉시 전송되며, 사전에 제출된 일정표 기반 무단 부재를 실시간 원천 차단합니다." },
              { idx: 4, tag: "05. DIGITAL DETOX", title: "핸드폰 전용 보관함", desc: "개별 좌석 번호와 매칭된 함에 스마트폰을 의무 제출합니다. 눈앞의 유효한 스마트폰 미디어 자극을 차단하는 정교한 디톡스 룰입니다." }
            ].map(({ idx, tag, title, desc }) => (
              <div key={idx} className="bg-white border border-gray-150 rounded overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <button 
                  onClick={() => setFacilityLightbox(idx)}
                  className="group relative aspect-[16/11] bg-gray-50 w-full overflow-hidden block"
                >
                  <FadeImage 
                    src={FACILITY_PHOTOS[idx].src}
                    alt={FACILITY_PHOTOS[idx].label}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-white/95 text-gray-800 text-[10px] font-extrabold px-3 py-1.5 shadow rounded-full">
                      자세히 보기
                    </span>
                  </div>
                </button>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-[#7B2332] block mb-1">{tag}</span>
                    <h4 className="font-bold text-gray-900 text-sm mb-2">{title}</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Entrance & Reception card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-all">
              <button 
                onClick={() => setFacilityLightbox(5)}
                className="group relative sm:w-1/2 aspect-[16/10] sm:aspect-auto overflow-hidden bg-gray-100"
              >
                <FadeImage 
                  src={FACILITY_PHOTOS[5].src}
                  alt={FACILITY_PHOTOS[5].label}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              </button>
              <div className="p-6 sm:w-1/2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-[#7B2332] bg-red-50 px-2.5 py-1 inline-block mb-3 rounded">
                    SPACE 06: ENTRANCE
                  </span>
                  <h4 className="text-base font-bold text-gray-900 mb-2">프리미엄 입구 및 안내 복도</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    올빼미 관리형 학습관만의 독립적인 공간 분위기를 완성하는 품격 있는 출입문 설계입니다. 들어서는 순간 엄격하고 진지한 자습 모드로 전환될 수 있는 인테리어 설계를 거쳤습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-all">
              <button 
                onClick={() => setFacilityLightbox(6)}
                className="group relative sm:w-1/2 aspect-[16/10] sm:aspect-auto overflow-hidden bg-gray-100"
              >
                <FadeImage 
                  src={FACILITY_PHOTOS[6].src}
                  alt={FACILITY_PHOTOS[6].label}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              </button>
              <div className="p-6 sm:w-1/2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-[#7B2332] bg-red-50 px-2.5 py-1 inline-block mb-3 rounded">
                    SPACE 07: DESK
                  </span>
                  <h4 className="text-base font-bold text-gray-900 mb-2">원스톱 교사 상주 프런트 데스크</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    입시 관리 능력이 뛰어난 상주형 교직원이 자습관 전면에서 학생들과 밀착 호흡합니다. 무단 외출 통제, 학습 질서 유지, 현장 대면 질문 예약 접수 및 각종 불편 해결의 지휘 타워입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400">💡 갤러리 속 모든 사진을 클릭하시면 고해상도 대형 이미지와 상세 설명을 확인할 수 있습니다.</p>
        </section>
      </div>
    </>
  );
}

// 2. Scroll-Linked Timeline 스토리보드 (등원부터 하원까지)
function OwlDayTimeline() {
  const TIMELINE_PHASES = [
    {
      phase: "PHASE 01",
      title: "등원 및 디지털 디톡스",
      time: "08:00 AM",
      image: "/owl-entrance.jpeg",
      icon: Smartphone,
      subtitle: "철저한 시작, 오늘 하루 방해 요소의 완전 격리",
      details: [
        "등·하원 안심 알림 패드 체크: 출결 패드에 번호를 입력하면 즉시 학부모님께 입실 완료 안심 문자가 실시간 자동 전송됩니다.",
        "스마트폰 100% 의무 수거: 입실 시 개인의 지정된 좌석 번호 보관함에 휴대폰을 의무 반납하여 공부 유혹을 물리적으로 완벽 격리합니다.",
        "개인 일정 기반 스케줄 등록: 사전 승인받은 학원 단과 수업 외의 불필요한 외출 및 이탈을 방지하기 위해 당일 부재 관리를 시작합니다."
      ],
      highlight: "휴대폰은 지정된 번호 보관함에 의무 수거되며, 미제출 시 벌점 5점이 부과됩니다."
    },
    {
      phase: "PHASE 02",
      title: "집중을 깨우는 영단어 테스트",
      time: "08:40 AM ~ 09:00 AM",
      image: "/owl-checkin.jpeg",
      icon: BookOpen,
      subtitle: "단 1분도 허투루 쓰지 않는 빈틈없는 루틴",
      details: [
        "영단어 Daily 의무 테스트: 매일 아침 20분 동안 진행되는 18회차 집중 영단어 시험을 통해 실전 어휘력을 폭발적으로 다집니다.",
        "엄격한 정숙 및 시험 모드: 타종 및 생활 교사의 통제 아래 전원 동일한 시간대에 엄밀한 시험 분위기를 유지합니다.",
        "오답 복기 및 체크: 시험 직후 신속한 자가 채점 및 피드백으로 취약한 어휘를 즉각 보완하고 본 자습을 준비합니다."
      ],
      highlight: "방학 집중 프로그램의 필수 영단어 테스트이며, 매 등원생의 순수 자습 두뇌를 깨우는 핵심 교시입니다."
    },
    {
      phase: "PHASE 03",
      title: "교시제 타종 몰입 자습",
      time: "09:00 AM ~ 05:00 PM",
      image: "/owl-girls-seats.jpeg",
      icon: Clock,
      subtitle: "타종에 맞춰 운영되는 극대화된 면학 분위기",
      details: [
        "생활 관리교사 상시 내부 순찰: 자습관 내부를 상시 순찰하며 자습 시간 수면(벌점 2점), 전자기기 딴짓(벌점 5점) 등을 정밀 케어합니다.",
        "인강 전용 WIFI 차단 방화벽: 학습용 기가 와이파이망이 제공되며, 학습 목적 이외의 모든 게임, SNS, 웹서핑 접속은 차단됩니다.",
        "이성 간 접촉 차단 및 남녀 분리: 공부 외적인 모든 시각적, 감성적 방해 자극을 배제하여 남녀 학습관 구역을 완전 격리 운영합니다."
      ],
      highlight: "타종 시스템에 의한 교시제 운영으로 자습 시간 내에는 자리 이동이 절대 금지되어 극대화된 정숙함을 유지합니다."
    },
    {
      phase: "PHASE 04",
      title: "1:1 대면 질의응답 & 맞춤 피드백",
      time: "05:00 PM ~ 10:00 PM",
      image: "/owl-reception.jpeg",
      icon: Users,
      subtitle: "최강의 질답 조교 상시 대기와 입시 컨설팅",
      details: [
        "명문대 출신 TA 질문 피드백: 명문대 출신 조교가 상시 대기하여 현장에서 1:1 대면 질문을 직접 받아 해결합니다.",
        "입학사정관 출신 소장의 Full-Care: 1:1 생기부 관리, 탐구 주제 추천, 모의고사 오답 및 학종 컨설팅까지 학원 내 상시 무료/유료 컨설팅이 진행됩니다.",
        "온라인 올빼미Q (owlq.co.kr) 지원: 24시간 언제 어디서나 질문을 등록하고 정확한 피드백을 받을 수 있는 독자적 질문 플랫폼을 활용합니다."
      ],
      highlight: "어려운 기출이나 개념에 막히는 즉시 1:1 조교 피드백 및 입시 전문가의 세심한 생활 및 성적 멘탈 케어가 들어갑니다."
    },
    {
      phase: "PHASE 05",
      title: "자기점검 및 안심 귀가 하원",
      time: "10:00 PM ~ 24:00 PM",
      image: "/owl-cctv.jpeg",
      icon: CheckCircle,
      subtitle: "완벽한 하루의 마침표와 학부모 안심 연계",
      details: [
        "순공 학습량 점검 & 책상 최종 정리: 자습 종료 후 오늘 학습한 양을 최종적으로 마스터하고, 다음 날의 쾌적한 시작을 위해 책상을 비웁니다.",
        "하원 알림 문자 발송: 하원 전용 태깅을 입력하는 즉시 학부모님께 안심 귀가 알림 문자가 전송되어 늦은 밤에도 안심할 수 있습니다.",
        "심야 자율 연장 자습 지원: 월요일부터 일요일까지 24시(자정)까지 매 시간 교사의 통제하에 철저하게 안전 및 면학 질서가 보장됩니다."
      ],
      highlight: "등원부터 하원까지, 오늘 하루의 학습 흐름과 생활 태도 데이터는 밀착 케어 시스템으로 철저히 마무리됩니다."
    }
  ];

  return (
    <div id="timeline-storyboard" className="bg-[#FAF9F5] py-20 border-y border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-black tracking-widest text-[#7B2332] uppercase bg-[#7B2332]/5 px-3 py-1 rounded">
            STORYBOARD TIMELINE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            등원하는 순간부터 하원까지
          </h2>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed">
            올빼미 장학생들의 하루는 치밀하게 연출된 고밀도 집중 타임라인에 따라 물 흐르듯 전개됩니다.<br />
            아래로 스크롤하여 초밀착으로 밀려오는 올빼미 스파르타의 하루 일과를 직관적으로 느껴보세요.
          </p>
          <div className="flex justify-center text-gray-400 text-xs animate-bounce mt-4 gap-1.5 items-center">
            <span>아래로 스크롤하여 계속보기</span> <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Scroll Storyboard Tree */}
        <div className="relative border-l-2 border-gray-200 ml-4 sm:ml-32 space-y-16 py-4">
          {TIMELINE_PHASES.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="relative pl-8 sm:pl-12 group transition-all duration-300">
                {/* Visual Timeline Node */}
                <div className="absolute -left-[17px] top-2 w-8 h-8 rounded-full bg-white border-2 border-[#7B2332] group-hover:bg-[#7B2332] flex items-center justify-center shadow transition-colors duration-300 z-10">
                  <IconComponent className="w-4 h-4 text-[#7B2332] group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Left Floating Time Label (Desktop) */}
                <div className="hidden sm:block absolute -left-36 top-3 w-28 text-right font-black text-[#7B2332] text-sm tabular-nums tracking-wide">
                  {item.time}
                </div>

                {/* Phase Storyboard Card */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300 grid grid-cols-1 lg:grid-cols-12">
                  {/* Left Side Image Panel */}
                  <div className="lg:col-span-5 relative aspect-[16/10] lg:aspect-auto bg-gray-100 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 lg:hidden">
                      <span className="text-[#E6C687] text-[10px] font-black tracking-widest">{item.phase}</span>
                      <h4 className="text-white font-bold text-lg">{item.title}</h4>
                      <p className="text-white/80 text-xs font-semibold">{item.time}</p>
                    </div>
                  </div>

                  {/* Right Side Text Content Panel */}
                  <div className="lg:col-span-7 p-6 sm:p-8 space-y-4">
                    <div className="hidden lg:block space-y-1">
                      <span className="text-[#7B2332] text-xs font-black tracking-wider block">{item.phase}</span>
                      <h4 className="text-gray-900 font-extrabold text-xl">{item.title}</h4>
                    </div>
                    <p className="text-xs font-bold text-gray-700 italic border-l-2 border-[#E6C687] pl-3 leading-relaxed">
                      &ldquo;{item.subtitle}&rdquo;
                    </p>

                    <ul className="space-y-3 pt-2">
                      {item.details.map((detail, dIdx) => {
                        const [boldPart, restPart] = detail.split(": ");
                        return (
                          <li key={dIdx} className="flex gap-2 items-start text-xs text-gray-500 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] flex-shrink-0 mt-1.5" />
                            <div>
                              <strong className="text-gray-900 font-bold">{boldPart}: </strong>
                              {restPart}
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Strict Alert Warning Tag */}
                    <div className="bg-red-50/60 border border-red-100 rounded-lg p-3 flex gap-2 items-center text-xs text-[#7B2332] font-semibold">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{item.highlight}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 3. 4대 밀착 CARE 시스템 Dashboard Section
function CareSystemSection() {
  const [activePenaltyCategory, setActivePenaltyCategory] = useState("all");
  const [penaltyExpanded, setPenaltyExpanded] = useState(false);

  const PENALTY_RULES = [
    // 1. 기본 생활 수칙
    { id: 1, category: "basic", item: "쓰레기 무단 방치 및 투기", points: 1 },
    { id: 2, category: "basic", item: "공용 물품 부주의 사용", points: 1 },
    { id: 3, category: "basic", item: "지각 (평일 18시, 토요일 8:30까지 미통보 미등원시)", points: 2 },
    { id: 4, category: "basic", item: "학습실 청결에 위반되는 행위", points: 1 },
    { id: 5, category: "basic", item: "무단 결석 / 조퇴 / 외출", points: 5 },
    // 2. 전자기기 부정 사용
    { id: 6, category: "electronics", item: "휴대폰 미제출", points: 5 },
    { id: 7, category: "electronics", item: "학습 목적 외 전자기기 사용 (MP3 포함)", points: 5 },
    { id: 8, category: "electronics", item: "허가 된 시간 외 휴대폰 무단 사용", points: 5 },
    // 3. 학습 분위기 훼손
    { id: 9, category: "atmosphere", item: "부적절한 학습 자세 (기대는 자세 등)", points: 2 },
    { id: 10, category: "atmosphere", item: "타인 무단 출입 허용", points: 10 },
    { id: 11, category: "atmosphere", item: "지정된 시간 외 이동 / 자리 이탈", points: 2 },
    { id: 12, category: "atmosphere", item: "소란 / 잡담", points: 3 },
    { id: 13, category: "atmosphere", item: "이성간 교제 및 접촉", points: 10 },
    { id: 14, category: "atmosphere", item: "학습과 무관한 수면 유도 행동", points: 2 },
    { id: 15, category: "atmosphere", item: "자습 시간 중 수면", points: 2 },
    { id: 16, category: "atmosphere", item: "지정 시간 외 자습실 내 음식 취식 (음료 제외)", points: 2 },
    // 4. 태도 불량 및 파손
    { id: 17, category: "behavior", item: "직원 지도 불이행", points: 5 },
    { id: 18, category: "behavior", item: "반복적인 경고 무시", points: 5 },
    { id: 19, category: "behavior", item: "타 학생에게 방해되는 고의적 행동", points: 10 },
    { id: 20, category: "behavior", item: "고의적 규칙 위반", points: 5 },
    { id: 21, category: "behavior", item: "학습관 내외에서 폭언 / 욕설 / 흡연 행위", points: 20 },
    { id: 22, category: "behavior", item: "기물 파손", points: 5 },
  ];

  const filteredPenalties = activePenaltyCategory === "all" 
    ? PENALTY_RULES 
    : PENALTY_RULES.filter(p => p.category === activePenaltyCategory);

  const displayedPenalties = penaltyExpanded ? filteredPenalties : filteredPenalties.slice(0, 8);

  const MOCK_EXAMS = [
    { month: "3월", date: "3/16 (월) 08:40", open: "3/9 (월) 23:00" },
    { month: "4월", date: "4/26 (일) 08:40", open: "4/13 (월) 23:00" },
    { month: "5월", date: "5/25 (월) 08:40", open: "5/18 (월) 23:00" },
    { month: "6월", date: "6/28 (일) 08:40", open: "6/15 (월) 23:00" },
    { month: "7월", date: "7/24 (금) 08:40", open: "7/13 (월) 23:00" },
    { month: "8월", date: "8/17 (월) 08:40", open: "8/10 (월) 23:00" },
    { month: "9월", date: "9/24 (목) 08:40", open: "9/14 (월) 23:00" },
    { month: "10월", date: "10/9 (금) 08:40", open: "9/28 (월) 23:00" },
    { month: "11월", date: "11/2 (월) 08:40", open: "10/26 (월) 23:00" },
  ];

  const BELL_SCHEDULE = [
    { period: "0교시 자습", time: "08:00 ~ 08:40", duration: "40분", type: "선택자습 (월~토 운영, 일요일 미운영)" },
    { period: "1교시 자습", time: "08:40 ~ 10:00", duration: "80분", type: "의무자습 (월~토 의무, 일요일 선택자습)" },
    { period: "2교시 자습", time: "10:20 ~ 12:00", duration: "100분", type: "의무자습 (월~토 의무, 일요일 선택자습)" },
    { period: "점심시간", time: "12:00 ~ 13:00", duration: "60분", type: "식사 배식 및 휴식 (학습관 미운영)" },
    { period: "3교시 자습", time: "13:00 ~ 14:10", duration: "70분", type: "의무자습 (월~토 의무, 일요일 선택자습)" },
    { period: "4교시 자습", time: "14:30 ~ 15:40", duration: "70분", type: "의무자습 (월~토 의무, 일요일 선택자습)" },
    { period: "5교시 자습", time: "16:00 ~ 17:00", duration: "60분", type: "의무자습 (월~토 의무, 일요일 선택자습)" },
    { period: "저녁선택자습", time: "17:00 ~ 18:00", duration: "60분", type: "선택자습 (월~금만 운영, 토/일 단과)" },
    { period: "저녁시간", time: "18:00 ~ 19:50", duration: "110분", type: "식사 배식 및 단과 연계 (학습관 미운영)" },
    { period: "6교시 자습", time: "20:10 ~ 22:00", duration: "110분", type: "의무자습 (월~토 의무, 일요일 선택자습)" },
    { period: "7교시 자습", time: "22:10 ~ 23:00", duration: "50분", type: "선택자습 (월~토 자율연장, 일요일 선택)" },
    { period: "8교시 자습", time: "23:10 ~ 24:00", duration: "50분", type: "선택자습 (월~토 자율연장, 일요일 선택)" },
  ];

  return (
    <div id="care-dashboard" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">
      {/* Care Dashboard Header */}
      <div className="text-center space-y-4">
        <span className="text-xs font-black tracking-widest text-[#7B2332] uppercase">4-CORE CLOSE CARE SYSTEM</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          올빼미 4대 초밀착 관리 시스템
        </h2>
        <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
          수준 높은 자습 공간의 제공을 넘어 출결, 생활 수칙, 과목별 TA 대면 피드백, 그리고 대학 진학 입시 상담까지 원스톱으로 관리합니다.
        </p>
      </div>

      {/* 4대 핵심 테마 요약 대시보드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            num: "01",
            title: "출결 관리",
            eng: "ATTENDANCE",
            desc: "등·하원 실시간 안심 문자 & 부재 실시간 원천 차단",
            icon: Smartphone,
            bg: "bg-[#7B2332]/5",
            border: "border-[#7B2332]/20 text-[#7B2332]"
          },
          {
            num: "02",
            title: "생활 & 환경",
            eng: "ENVIRONMENT",
            desc: "디지털 디톡스 휴대폰 의무 반납 & 학습 저해 요소 통제",
            icon: ShieldAlert,
            bg: "bg-amber-50/50",
            border: "border-amber-200 text-amber-700"
          },
          {
            num: "03",
            title: "학습 관리",
            eng: "Q&A FEEDBACK",
            desc: "명문대 TA 1:1 대면 질문 & 올빼미Q 온라인 24H 지원 (윈터/썸머 상시 운행)",
            icon: GraduationCap,
            bg: "bg-blue-50/50",
            border: "border-blue-200 text-blue-700"
          },
          {
            num: "04",
            title: "입시 관리",
            eng: "CONSULTING",
            desc: "전문 입시 소장 1:1 대입 컨설팅 & 시대인재 모의고사",
            icon: Award,
            bg: "bg-emerald-50/50",
            border: "border-emerald-200 text-emerald-700"
          }
        ].map((theme, idx) => {
          const Icon = theme.icon;
          return (
            <div 
              key={idx} 
              className={`p-6 rounded-2xl border ${theme.border} ${theme.bg} flex flex-col justify-between space-y-4 hover:scale-[1.03] transition-all duration-300 shadow-sm`}
            >
              <div className="flex justify-between items-start">
                <span className="text-2xl font-black opacity-30">{theme.num}</span>
                <div className="p-2.5 rounded-xl bg-white shadow-sm">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <p className="text-[10px] font-black tracking-widest opacity-60 uppercase">{theme.eng}</p>
                <h3 className="text-base font-extrabold text-gray-900">{theme.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{theme.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 01. 출결 관리 CARE Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 hover:shadow-md transition-shadow">
        <div className="md:col-span-4 bg-[#7B2332]/5 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-150">
          <div>
            <span className="text-[#7B2332] font-black text-xs block mb-1">CARE SYSTEM 01</span>
            <h3 className="text-2xl font-black text-gray-900 mb-4">출결 (입퇴실) 관리</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              등원 즉시 학부모님께 문자 알림을 발송하며, 개인 스케줄에 맞춰 입퇴실 및 미수업 부재를 철저하게 감시합니다.
            </p>
          </div>
          <div className="mt-8 border border-[#7B2332]/20 rounded-lg p-4 bg-white flex flex-col items-center shadow-inner">
            <Smartphone className="w-8 h-8 text-[#7B2332] mb-2 animate-bounce" />
            <span className="text-[10px] font-bold text-gray-400">입퇴실 안심 키패드 탑재</span>
            <span className="text-xs text-gray-800 font-extrabold mt-1">학부모 문자 실시간 자동 전송</span>
          </div>
        </div>

        <div className="md:col-span-8 p-8 space-y-6">
          <h4 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#7B2332]" />
            실시간 부재 추적 및 등하원 안심 알림 시스템
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h5 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                등·하원 즉시 안림 알림 문자
              </h5>
              <p className="text-xs text-gray-500 leading-relaxed">
                출결 패드에 전용 등원 코드를 입력하는 즉시 등록된 학부모님의 휴대폰 번호로 실시간 등원 및 안전 하원 문자를 즉시 전송합니다.
              </p>
            </div>
            <div className="space-y-2">
              <h5 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332]" />
                개인 일정 기반 스케줄 체크
              </h5>
              <p className="text-xs text-gray-500 leading-relaxed">
                개인별 단과 수업 수강증 및 일정표를 사전에 제출받아 자습 시간 중 인가되지 않은 무단 이탈, 지각, 외출을 자동으로 파악하고 사전에 통제합니다.
              </p>
            </div>
          </div>

          <div className="bg-[#FAF9F5] border border-gray-150 p-4 rounded-xl">
            <span className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Core Workflows</span>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-center text-xs">
              <div className="bg-white border border-gray-200 p-2.5 rounded shadow-sm w-full font-semibold text-gray-700">1. 안심 키패드 출결 번호 태깅</div>
              <span className="text-gray-400 hidden sm:inline">➔</span>
              <div className="bg-white border border-gray-200 p-2.5 rounded shadow-sm w-full font-semibold text-gray-700">2. 학부모 실시간 SMS 즉시 전송</div>
              <span className="text-gray-400 hidden sm:inline">➔</span>
              <div className="bg-white border border-gray-200 p-2.5 rounded shadow-sm w-full font-semibold text-gray-700">3. 개인 스케줄 일치 자동 부재 관리</div>
            </div>
          </div>
        </div>
      </div>

      {/* 02. 생활 & 환경 CARE Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 hover:shadow-md transition-shadow">
        <div className="md:col-span-4 bg-[#7B2332]/5 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-150">
          <div>
            <span className="text-[#7B2332] font-black text-xs block mb-1">CARE SYSTEM 02</span>
            <h3 className="text-2xl font-black text-gray-900 mb-4">생활 & 환경 관리</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              압도적인 학습 분위기를 위해 강력한 디지털 디톡스(휴대폰 수거), WIFI 방화벽, 식사 연계 서비스, 교시제 타종 및 벌점제를 집행합니다.
            </p>
          </div>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 bg-white p-2.5 rounded border border-gray-150">
              <Wifi className="w-5 h-5 text-[#7B2332]" />
              <div className="text-[10px]">
                <span className="font-extrabold text-gray-800 block">WIFI 방화벽 시스템</span>
                <span className="text-gray-400">인강 사이트 외 전체 웹 차단</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white p-2.5 rounded border border-gray-150">
              <Utensils className="w-5 h-5 text-[#7B2332]" />
              <div className="text-[10px]">
                <span className="font-extrabold text-gray-800 block">도시락 X 배식형 급식 서비스</span>
                <span className="text-gray-400">중식 / 석식 학습 흐름 방지</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 p-8 space-y-8">
          {/* Main Pillars */}
          <div className="space-y-4">
            <h4 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#7B2332]" />
              학습 저해 요소를 뿌리 뽑는 환경 통제 매뉴얼
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-gray-800 block">📱 휴대폰 보관 및 사용 통제</span>
                <p className="text-gray-500 leading-relaxed">
                  자습실 입실 시 휴대폰을 본인 좌석 지정함에 즉시 반납합니다. 미제출 또는 임의 미반납 적발 시 벌점이 엄격히 부과됩니다.
                </p>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-gray-800 block">🚨 CCTV 실시간 졸음·딴짓 차단</span>
                <p className="text-gray-500 leading-relaxed">
                  자습실 내부 CCTV 상시 녹화 및 관리 교사의 정기적인 순찰을 통해 졸음, 전자기기를 활용한 딴짓(유튜브, 웹툰)을 사전에 차단합니다.
                </p>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-gray-800 block">🍔 급식 배식형 식사 서비스</span>
                <p className="text-gray-500 leading-relaxed">
                  외출로 인한 집중 이탈을 방지하고자 배식형 식사를 제공합니다. 방학 중에는 평일 중/석식 및 토요일 중식을 지원합니다 (외부 도시락 반입 불가).
                </p>
              </div>
              <div className="space-y-2">
                <span className="font-bold text-gray-800 block">🥤 음료 반입 및 출입 제한 룰</span>
                <p className="text-gray-500 leading-relaxed">
                  음료는 텀블러 또는 플라스틱 페트병만 반입이 허용됩니다 (캔, 1회용 컵 절대 불가). 지각 또는 교시 중 무단 출입 시 해당 교시 종료 시까지 자습실 입실이 제한됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Penalty Rules Accordions */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                올빼미 학습관 생활 벌점 규정표
              </span>
              <button 
                onClick={() => setPenaltyExpanded(!penaltyExpanded)}
                className="text-xs text-[#7B2332] font-black hover:underline"
              >
                {penaltyExpanded ? "접기 ▲" : "벌점 전체보기 (총 22개 항목) ▼"}
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-gray-150 pb-2">
              {[
                { key: "all", label: "전체" },
                { key: "basic", label: "기본 생활수칙" },
                { key: "electronics", label: "전자기기 부정사용" },
                { key: "atmosphere", label: "학습 분위기 훼손" },
                { key: "behavior", label: "태도 불량 / 기물 파손" }
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setActivePenaltyCategory(cat.key); setPenaltyExpanded(true); }}
                  className={`px-3 py-1 rounded text-[11px] font-bold border transition-colors ${
                    activePenaltyCategory === cat.key 
                      ? "bg-[#7B2332] border-[#7B2332] text-white" 
                      : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Penalty Point Table */}
            <div className="border border-gray-150 rounded-lg overflow-hidden bg-gray-50/50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-500 font-bold">
                    <th className="p-3 pl-4">위반 규정 및 구체적 항목</th>
                    <th className="p-3 pr-4 text-right w-24">부과 벌점</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 bg-white text-gray-700">
                  {displayedPenalties.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-gray-800">{rule.item}</td>
                      <td className="p-3 pr-4 text-right font-black text-red-600">
                        {rule.points}점
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expulsion warning alert */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
              <p className="text-xs text-[#7B2332] font-black flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> 누적 벌점 조치 및 복귀 규정
              </p>
              <ul className="list-disc pl-4 text-[10px] text-gray-500 space-y-1">
                <li>**벌점 20점 이상 누적 시 강제 퇴소 조치**가 즉시 집행될 수 있습니다 (폭언, 흡연 등은 즉시 퇴소 조치 가능).</li>
                <li>공평한 기회 부여를 위해 **매월 1일 전원 누적 벌점의 절반이 자동 삭감**됩니다.</li>
                <li>본 벌점제는 철저하게 계산되고 약속된 쾌적한 면학 분위기 조성을 위한 유일한 생명선입니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 03. 학습 관리 CARE Section (TA & Q&A) */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 hover:shadow-md transition-shadow">
        <div className="md:col-span-4 bg-[#7B2332]/5 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-150">
          <div>
            <span className="text-[#7B2332] font-black text-xs block mb-1">CARE SYSTEM 03</span>
            <h3 className="text-2xl font-black text-gray-900 mb-4">학습 (질문/피드백) 관리</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              수원 최고의 질답 및 피드백 시스템입니다. 명문대 출신 대면 TA 조교가 상시 대기하여 학생들의 질문에 즉각 대응합니다. (윈터/썸머 상시 운행)
            </p>
          </div>
          <div className="mt-8 border border-dashed border-[#7B2332]/40 rounded-xl p-4 bg-white text-center">
            <span className="text-[10px] font-black text-[#7B2332] uppercase tracking-wider block">온라인 질문 플랫폼</span>
            <span className="text-base font-black text-gray-800 block mt-1">올빼미Q (owlq.co.kr)</span>
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">회원가입 후 온라인 질문 등록 시 24시간 피드백을 제공합니다.</p>
          </div>
        </div>

        <div className="md:col-span-8 p-8 space-y-6">
          <h4 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#7B2332]" />
            명문대 출신 조교진의 1:1 밀착 학습 피드백
          </h4>
          
          <div className="bg-[#FAF9F5] p-6 rounded-xl border border-gray-150 space-y-3">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#7B2332]" /> 1:1 대면 질문 및 학습 멘토링
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              올빼미 학습관에서는 명문대 출신 조교진이 현장에 상주하여 학생들과 1:1 대면 질의응답을 진행합니다.
              학습 중 막히는 개념이나 어려운 문항에 대해 피드백을 제공하며, 개인 맞춤형 학습법 및 공부 방향성 멘토링까지 함께 지원합니다.
            </p>
          </div>

          {/* Academic features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-gray-150 p-4 rounded-xl bg-white shadow-sm space-y-1">
              <span className="text-[10px] font-black text-[#7B2332] uppercase">ACADEMIC CONNECTION</span>
              <h5 className="font-extrabold text-sm text-gray-900">영통이강학원 단과 및 연계 수업</h5>
              <p className="text-xs text-gray-500 leading-relaxed">
                이강학원 연계 수준별 / 학교별 고품격 내신 및 모의고사 대비 단과 수업이 유기적으로 연계되어 바로 이동 학습할 수 있습니다.
              </p>
            </div>
            <div className="border border-gray-150 p-4 rounded-xl bg-white shadow-sm space-y-1">
              <span className="text-[10px] font-black text-[#7B2332] uppercase">VACATION SPECIAL</span>
              <h5 className="font-extrabold text-sm text-gray-900">자체 수학연구소 보유 & 수학 몰입</h5>
              <p className="text-xs text-gray-500 leading-relaxed">
                자체 수학연구소를 전폭 지원하는 이강학원 노하우를 바탕으로, 방학 특화 '수학 몰입 학습 프로그램'을 연중 가동합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 04. 입시 관리 CARE Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 hover:shadow-md transition-shadow">
        <div className="md:col-span-4 bg-[#7B2332]/5 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-150">
          <div>
            <span className="text-[#7B2332] font-black text-xs block mb-1">CARE SYSTEM 04</span>
            <h3 className="text-2xl font-black text-gray-900 mb-4">입시 (컨설팅) 관리</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              입학사정관 출신 전문 대입 소장이 상주하며 수시부터 수능 성적표 배부 후 정시 유료/무료 컨설팅까지 Full-Care 매니지먼트를 펼칩니다.
            </p>
          </div>
          <div className="mt-8 border border-gray-150 rounded-xl p-4 bg-white shadow-sm flex items-center gap-3">
            <Award className="w-6 h-6 text-[#7B2332] flex-shrink-0" />
            <div className="text-[10px]">
              <span className="font-bold text-gray-800 block">대치동 1위 서바이벌 응시관</span>
              <span className="text-gray-400">시대인재 모의고사 3~11월 연계</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 p-8 space-y-6">
          <h4 className="text-gray-900 font-extrabold text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-[#7B2332]" />
            대학의 수준을 결정하는 Full-Care 입시 관리 및 실전 감각 극대화
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-gray-800 block">👤 입학사정관 출신 입시 소장 상주</span>
              <p className="text-gray-500 leading-relaxed">
                풍부한 대입 합격 데이터를 보유한 9년 경력 입시 전문 소장님이 학습관에 항상 대기하여 1:1 학생 맞춤형 수시 및 정시 상담을 진행합니다.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-gray-800 block">📊 수시부터 정시 수능 분석까지 연계</span>
              <p className="text-gray-500 leading-relaxed">
                학생 개별 학생부 종합전형 (생기부 기재 점검), 대학별 고사 분석은 물론 수능 가채점 직후 및 성적표 발부 이후 명품 정시 상담을 책임집니다.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-gray-800 block">📱 올빼미 전용 밴드 입시 정보 전송</span>
              <p className="text-gray-500 leading-relaxed">
                올빼미 장학생 학부모 전용 네이버 밴드를 통해 생활기록부 관리 팁, 탐구 주제 추천, 2027 입시 주요 변경 핵심 요점(사탐런 유불리, 지역의사제 영향 등)을 즉각 전달합니다.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-gray-800 block">📝 시대인재 서바이벌 실전 모의고사</span>
              <p className="text-gray-500 leading-relaxed">
                대치동 압도적 1위 콘텐츠인 **시대인재 서바이벌 모의고사(3~11월)** 현장 시험을 그대로 자습관에서 응시하며 실전 감각을 최대치로 끌어올립니다.
              </p>
            </div>
          </div>

          {/* Sidaeinjae Survival Table */}
          <div className="border border-gray-150 rounded-xl overflow-hidden mt-4">
            <div className="bg-[#1A1A2E] text-white p-3 font-bold text-xs flex justify-between items-center">
              <span>📅 2027학년도 대입 수능 서바이벌 모의고사 일정표</span>
              <span className="text-[10px] text-[#E6C687]">대치동 시대인재 연동</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-150">
                    <th className="p-3 pl-4">시행월</th>
                    <th className="p-3">현장 실전 응시 일정</th>
                    <th className="p-3 pr-4 text-right">신청 오픈 시각 (올빼미Q)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {MOCK_EXAMS.map((exam, exIdx) => (
                    <tr key={exIdx} className="hover:bg-gray-50/50">
                      <td className="p-3 pl-4 font-bold text-gray-900">{exam.month} 서바이벌</td>
                      <td className="p-3 text-[#7B2332] font-semibold">{exam.date}</td>
                      <td className="p-3 pr-4 text-right text-gray-500">{exam.open}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 05. 독자적인 타종 운영 시간표 Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-8 sm:p-10 hover:shadow-md transition-shadow space-y-6">
        <div className="text-center md:text-left space-y-2">
          <span className="text-[#7B2332] font-black text-xs uppercase tracking-widest">BELL SCHEDULE SYSTEM</span>
          <h3 className="text-2xl font-black text-gray-900">올빼미 교시제 타종 운영 시간표</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            자습 시간과 휴식 시간을 타종으로 완벽 통제하여 1초의 흐름 유실도 없는 초고밀도 면학 분위기를 완성합니다.
          </p>
        </div>

        <div className="border border-gray-150 rounded-xl overflow-hidden shadow-inner">
          <div className="bg-[#7B2332] text-white p-4 font-bold text-xs sm:text-sm flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="flex items-center gap-2">⏰ 교시제 타종 운영 시간표 (월~금 기준)</span>
            <span className="text-[10px] sm:text-xs text-white/80 bg-black/25 px-2.5 py-1 rounded-full">토요일 의무 자습 / 일요일 선택 자습</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold">
                  <th className="p-3.5 pl-5">교시구분</th>
                  <th className="p-3.5">운영시간</th>
                  <th className="p-3.5 text-center">자습시간</th>
                  <th className="p-3.5 pr-5">세부 룰</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {BELL_SCHEDULE.map((bell, bIdx) => (
                  <tr key={bIdx} className={bIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                    <td className="p-3.5 pl-5 font-bold text-gray-900">{bell.period}</td>
                    <td className="p-3.5 text-[#7B2332] font-semibold">{bell.time}</td>
                    <td className="p-3.5 text-center text-gray-500 font-semibold">{bell.duration}</td>
                    <td className="p-3.5 pr-5 text-gray-400 font-normal">{bell.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Owl() {
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners", "owl"],
    queryFn: async () => {
      const res = await fetch("/api/banners?division=owl");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [posterLightbox, setPosterLightbox] = useState<number | null>(null);

  const apiBannerPosters: LightboxPhoto[] = banners
    .filter((b) => b.is_active && b.image_url)
    .map((b) => ({ src: b.image_url!, label: b.title || "올빼미 포스터" }));

  const posterLightboxPhotos: LightboxPhoto[] = [...STATIC_POSTERS, ...apiBannerPosters];
  const allPosters = posterLightboxPhotos;
  
  return (
    <PageLayout>
      {posterLightbox !== null && (
        <PhotoLightbox
          photos={posterLightboxPhotos}
          initialIndex={posterLightbox}
          onClose={() => setPosterLightbox(null)}
        />
      )}
      <div className="bg-[#FAF9F5] min-h-screen pb-16">
        {/* Main Hero Header and Posters */}
        <OwlHeroSection />

        {/* Core CARE Dashboard Section (생활, 학습, 입시, 출결) */}
        <CareSystemSection />

        {/* Scroll Storyboard Daily Progress (등원부터 하원까지) */}
        <OwlDayTimeline />

        {/* Poster Showcase (Moved from top to bottom) */}
        {allPosters.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
            <section className="mb-14" data-testid="section-owl-posters">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                <span className="w-6 h-0.5 bg-[#7B2332] inline-block" />
                올빼미 소식지
              </h2>
              <div className={`grid gap-4 ${allPosters.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : allPosters.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                {allPosters.map((p, i) => (
                  <button
                    key={p.src}
                    onClick={() => setPosterLightbox(i)}
                    className="group relative overflow-hidden rounded shadow-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2332] text-left"
                    data-testid={`button-owl-poster-${i}`}
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden bg-gray-100">
                      <FadeImage
                        src={p.src}
                        alt={p.label}
                        eager={i === 0}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <span className="bg-white/90 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-800 shadow self-center mb-auto mt-auto">
                        포스터 크게보기
                      </span>
                      <p className="text-white text-xs font-bold truncate leading-none">{p.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Interactive Quick Information Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="bg-[#1A1A2E] rounded-2xl text-white p-8 sm:p-12 relative overflow-hidden shadow-lg border border-gray-800">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#7B2332/20,transparent)]" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8 space-y-4">
                <span className="text-[#E6C687] text-xs font-black tracking-widest uppercase">REGISTRATION AND CONTACT</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold">올빼미 관리형 자습관 상담 문의</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
                  올빼미 스파르타 학습관은 소수정예 **오직 75석 한정**으로 성비 규정을 맞춰 엄격하게 심사 등록을 진행합니다. 학년별 정원 마감 전 지금 즉시 대치동의 뜨거운 학구열을 수원 영통에서 신청하십시오.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#7B2332] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-400 block">학기중 운영 시간</span>
                      <span className="font-bold text-white block">
                        평일 15:00~24:00 (정기고사 13시~24시)<br />
                        토·일 08:00~24:00
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#7B2332] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-400 block">방학중 운영 시간</span>
                      <span className="font-bold text-white">365일 연중무휴 매일 08:00 ~ 24:00</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 bg-white/5 border border-white/10 rounded-xl p-6 text-center space-y-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">상담전용 콜센터</span>
                <div>
                  <a href="tel:031-548-0982" className="text-2xl font-black text-white hover:text-[#E6C687] block transition-colors">
                    031-548-0982
                  </a>
                  <span className="text-[10px] text-gray-400 font-medium mt-1 block">문자 상담 전용: 010-9764-1353</span>
                </div>
                <div className="border-t border-white/10 pt-4 text-[10px] text-gray-300 space-y-1">
                  <p className="font-semibold text-white">영통이강학원 4관 올빼미 학습관</p>
                  <p className="text-gray-400">경기도 수원시 영통구 봉영로 1605 모던타운 505호</p>
                </div>
              </div>
            </div>
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
