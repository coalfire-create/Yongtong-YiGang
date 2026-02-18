import { useState, useEffect, useCallback } from "react";
import { Menu, X, ChevronLeft, ChevronRight, Users, Calendar, Trophy, Star, BookOpen, GraduationCap } from "lucide-react";

const NAV_ITEMS = [
  { label: "고등관", sub: ["강의시간표", "선생님 소개"] },
  { label: "중등관", sub: ["강의시간표", "선생님 소개"] },
  { label: "초등관", sub: ["강의시간표", "선생님 소개"] },
  { label: "올빼미", sub: ["독학관 안내", "이용 방법"] },
  { label: "설명회", sub: ["설명회 예약", "설명회 일정"] },
  { label: "입시", sub: ["입시 실적", "합격 후기"] },
  { label: "오시는길", sub: [] },
];

const QUICK_MENU_ITEMS = [
  { label: "강사소개", sub: "자세히 보기 +", icon: Users, highlight: false },
  { label: "중등 시간표", sub: "자세히 보기 +", icon: BookOpen, highlight: false },
  { label: "고1 시간표", sub: "자세히 보기 +", icon: Calendar, highlight: false },
  { label: "고2 시간표", sub: "자세히 보기 +", icon: Calendar, highlight: false },
  { label: "고3 시간표", sub: "자세히 보기 +", icon: GraduationCap, highlight: false },
  { label: "입시 실적", sub: "자세히 보기 +", icon: Trophy, highlight: false },
];

const SLIDES = [
  {
    image: "/images/banner-1.png",
    title: "SNT 초스피드",
    subtitle: "달리는 독학관",
    description: "체계적인 학습관리 시스템으로 성적 향상을 이끕니다",
  },
  {
    image: "/images/banner-2.png",
    title: "메이저 의대",
    subtitle: "& SKY행",
    description: "2024학년도 의약학 계열 합격자 다수 배출",
  },
  {
    image: "/images/banner-3.png",
    title: "영통이강학원",
    subtitle: "수학 전문",
    description: "수능·내신 완벽 대비, 실력 있는 강사진과 함께",
  },
];

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200" data-testid="header">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-[68px] gap-4">
          <a
            href="/"
            className="flex-shrink-0 text-2xl font-extrabold tracking-tight mr-auto lg:mr-0"
            style={{ color: "#1B2A4A" }}
            data-testid="link-logo"
          >
            영통이강학원
          </a>

          <nav className="hidden lg:flex items-center flex-1 justify-center gap-0" data-testid="nav-desktop">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative group" data-testid={`nav-item-${item.label}`}>
                <a
                  href={`#${item.label}`}
                  className="block px-6 py-5 text-[15px] font-semibold text-gray-700 hover:text-orange-500 transition-colors duration-200 border-b-2 border-transparent hover:border-orange-500"
                  data-testid={`link-nav-${item.label}`}
                >
                  {item.label}
                </a>
                {item.sub.length > 0 && (
                  <div className="invisible group-hover:visible absolute top-full left-0 bg-white border border-gray-200 shadow-lg min-w-[160px] z-50" data-testid={`dropdown-${item.label}`}>
                    {item.sub.map((subItem) => (
                      <a
                        key={subItem}
                        href={`#${item.label}-${subItem}`}
                        className="block px-5 py-3 text-sm text-gray-600 hover:text-orange-500 hover:bg-gray-50 transition-colors duration-150"
                        data-testid={`link-sub-${subItem}`}
                      >
                        {subItem}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <button
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div
        className={`lg:hidden fixed inset-0 top-[68px] bg-white z-40 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        data-testid="nav-mobile"
      >
        <nav className="flex flex-col p-6 gap-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.label}>
              <a
                href={`#${item.label}`}
                className="block px-4 py-3 text-base font-semibold text-gray-700 hover:text-orange-500 hover:bg-orange-50 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`link-mobile-nav-${item.label}`}
              >
                {item.label}
              </a>
              {item.sub.length > 0 && (
                <div className="pl-8 flex flex-col">
                  {item.sub.map((subItem) => (
                    <a
                      key={subItem}
                      href={`#${item.label}-${subItem}`}
                      className="block px-4 py-2 text-sm text-gray-500 hover:text-orange-500 transition-colors duration-200"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`link-mobile-sub-${subItem}`}
                    >
                      {subItem}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [isTransitioning]
  );

  const prev = useCallback(() => {
    goTo(current === 0 ? SLIDES.length - 1 : current - 1);
  }, [current, goTo]);

  const next = useCallback(() => {
    goTo(current === SLIDES.length - 1 ? 0 : current + 1);
  }, [current, goTo]);

  useEffect(() => {
    const interval = setInterval(() => {
      next();
    }, 5000);
    return () => clearInterval(interval);
  }, [next]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900" data-testid="carousel">
      {SLIDES.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 text-white">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              {slide.title}
            </h2>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-1">
              {slide.subtitle}
            </p>
            <p className="text-sm sm:text-base mt-3 text-white/80 max-w-md">
              {slide.description}
            </p>
          </div>
        </div>
      ))}

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/30 text-white hover:bg-black/50 transition-colors duration-200"
        data-testid="button-carousel-prev"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/30 text-white hover:bg-black/50 transition-colors duration-200"
        data-testid="button-carousel-next"
        aria-label="다음 슬라이드"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" data-testid="carousel-dots">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`transition-all duration-300 ${
              index === current
                ? "w-7 h-2.5 bg-white"
                : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
            }`}
            data-testid={`button-carousel-dot-${index}`}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function QuickMenuCard({
  label,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  sub: string;
  icon: typeof Users;
  highlight: boolean;
}) {
  return (
    <a
      href={`#${label}`}
      className={`group relative flex flex-col justify-between p-5 cursor-pointer transition-colors duration-300 overflow-hidden ${
        highlight
          ? "bg-orange-500 text-white border border-orange-500"
          : "bg-white text-gray-900 border border-gray-200 hover:bg-orange-500 hover:border-orange-500 hover:text-white"
      }`}
      data-testid={`card-quick-menu-${label}`}
    >
      <div className="relative z-10">
        <p className={`text-[11px] font-bold tracking-widest uppercase mb-1 transition-colors duration-300 ${
          highlight ? "text-white/80" : "text-gray-400 group-hover:text-white/80"
        }`}>
          CLASS
        </p>
        <h3 className={`text-lg font-extrabold leading-tight transition-colors duration-300 ${
          highlight ? "text-white" : "text-gray-900 group-hover:text-white"
        }`}>
          {label}
        </h3>
        <p className={`text-xs mt-1.5 font-medium transition-colors duration-300 ${
          highlight ? "text-white/80" : "text-gray-400 group-hover:text-white/80"
        }`}>
          {sub}
        </p>
      </div>
      <div className="absolute bottom-3 right-3 z-0">
        <Icon
          className={`w-12 h-12 transition-colors duration-300 ${
            highlight
              ? "text-white/30"
              : "text-gray-200 group-hover:text-white/30"
          }`}
          strokeWidth={1.5}
        />
      </div>
    </a>
  );
}

function QuickMenuGrid() {
  return (
    <div className="grid grid-cols-2 gap-[6px] h-full" data-testid="quick-menu-grid">
      {QUICK_MENU_ITEMS.map((item) => (
        <QuickMenuCard
          key={item.label}
          label={item.label}
          sub={item.sub}
          icon={item.icon}
          highlight={item.highlight}
        />
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6" data-testid="hero-section">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[5px] lg:h-[calc(100vh-100px)] lg:min-h-[480px] lg:max-h-[680px]">
        <div className="aspect-[16/9] lg:aspect-auto lg:h-full">
          <HeroCarousel />
        </div>
        <div className="lg:h-full">
          <QuickMenuGrid />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <HeroSection />
    </div>
  );
}
