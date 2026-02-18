import { useState, useEffect, useCallback } from "react";
import { Menu, X, ChevronLeft, ChevronRight, User, Calendar, Trophy, ArrowRight } from "lucide-react";

const NAV_ITEMS = ["고등관", "중등관", "초등관", "올빼미", "설명회", "입시", "오시는길"];

const QUICK_MENU_ITEMS = [
  { label: "강사소개", icon: User },
  { label: "중등 시간표", icon: Calendar },
  { label: "고1 시간표", icon: Calendar },
  { label: "고2 시간표", icon: Calendar },
  { label: "고3 시간표", icon: Calendar },
  { label: "입시 실적", icon: Trophy },
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <a
            href="/"
            className="flex-shrink-0 text-xl font-extrabold tracking-tight"
            style={{ color: "#1B2A4A" }}
            data-testid="link-logo"
          >
            영통이강학원
          </a>

          <nav className="hidden lg:flex items-center gap-1" data-testid="nav-desktop">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item}`}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors duration-200 rounded-md"
                data-testid={`link-nav-${item}`}
              >
                {item}
              </a>
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
        className={`lg:hidden fixed inset-0 top-16 bg-white z-40 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        data-testid="nav-mobile"
      >
        <nav className="flex flex-col p-6 gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors duration-200"
              onClick={() => setMobileMenuOpen(false)}
              data-testid={`link-mobile-nav-${item}`}
            >
              {item}
            </a>
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
    <div className="relative w-full h-full overflow-hidden rounded-md bg-gray-100" data-testid="carousel">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
              {slide.title}
            </h2>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1">
              {slide.subtitle}
            </p>
            <p className="text-sm sm:text-base mt-2 text-white/80 max-w-md">
              {slide.description}
            </p>
          </div>
        </div>
      ))}

      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors duration-200"
        data-testid="button-carousel-prev"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-colors duration-200"
        data-testid="button-carousel-next"
        aria-label="다음 슬라이드"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" data-testid="carousel-dots">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`rounded-full transition-all duration-300 ${
              index === current
                ? "w-6 h-2 bg-white"
                : "w-2 h-2 bg-white/50 hover:bg-white/80"
            }`}
            data-testid={`button-carousel-dot-${index}`}
            aria-label={`슬라이드 ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function QuickMenuCard({ label, icon: Icon }: { label: string; icon: typeof User }) {
  return (
    <a
      href={`#${label}`}
      className="group flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-100 cursor-pointer transition-colors duration-300 hover:bg-orange-500 hover:border-orange-500"
      data-testid={`card-quick-menu-${label}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center transition-colors duration-300 group-hover:bg-white/20">
        <Icon className="w-5 h-5 text-orange-500 transition-colors duration-300 group-hover:text-white" />
      </div>
      <span className="flex-1 text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-white">
        {label}
      </span>
      <ArrowRight className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-white flex-shrink-0" />
    </a>
  );
}

function QuickMenuGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 h-full content-stretch" data-testid="quick-menu-grid">
      {QUICK_MENU_ITEMS.map((item) => (
        <QuickMenuCard key={item.label} label={item.label} icon={item.icon} />
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="hero-section">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 lg:gap-5 lg:h-[440px]">
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
