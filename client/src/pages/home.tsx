import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Calendar, Trophy, BookOpen, GraduationCap, Moon, Loader2, Star, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { PageLayout } from "@/components/layout";
import { PopupModal } from "@/components/popup-modal";

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

const DEFAULT_SLIDES = [
  {
    title: "영통이강학원",
    subtitle: "수학 전문",
    description: "수능·내신 완벽 대비, 실력 있는 강사진과 함께",
    image_url: null as string | null,
    link_url: null as string | null,
  },
];

const QUICK_MENU_ITEMS = [
  { label: "고등관", sub: "자세히 보기 +", icon: GraduationCap, path: "/high-school" },
  { label: "초/중등관", sub: "자세히 보기 +", icon: BookOpen, path: "/junior-school" },
  { label: "올빼미 독학관", sub: "자세히 보기 +", icon: Moon, path: "/owl" },
  { label: "입시실적", sub: "자세히 보기 +", icon: Trophy, path: "/admissions/results" },
  { label: "설명회", sub: "자세히 보기 +", icon: Calendar, path: "/briefing" },
  { label: "합격후기", sub: "자세히 보기 +", icon: Star, path: "/admissions/reviews" },
];

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners", "main"],
    queryFn: async () => {
      const res = await fetch("/api/banners?division=main");
      if (!res.ok) throw new Error("Failed to fetch banners");
      return res.json();
    },
  });

  const slides = banners.length > 0
    ? banners.map((b) => ({
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        image_url: b.image_url,
        link_url: b.link_url,
      }))
    : DEFAULT_SLIDES;

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
    goTo(current === 0 ? slides.length - 1 : current - 1);
  }, [current, goTo, slides.length]);

  const next = useCallback(() => {
    goTo(current === slides.length - 1 ? 0 : current + 1);
  }, [current, goTo, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      next();
    }, 5000);
    return () => clearInterval(interval);
  }, [next, slides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  if (isLoading) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900" data-testid="carousel">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {slide.image_url ? (
            <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 text-white">
            {slide.link_url ? (
              <Link href={slide.link_url}>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" data-testid={`text-banner-title-${index}`}>{slide.title}</h2>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-1">{slide.subtitle}</p>
                <p className="text-sm sm:text-base mt-3 text-white/80 max-w-md">{slide.description}</p>
              </Link>
            ) : (
              <>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight" data-testid={`text-banner-title-${index}`}>{slide.title}</h2>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-1">{slide.subtitle}</p>
                <p className="text-sm sm:text-base mt-3 text-white/80 max-w-md">{slide.description}</p>
              </>
            )}
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
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
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`transition-all duration-300 ${
                  index === current ? "w-7 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                }`}
                data-testid={`button-carousel-dot-${index}`}
                aria-label={`슬라이드 ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function QuickMenuCard({
  label,
  sub,
  icon: Icon,
  path,
  isBottomRow,
}: {
  label: string;
  sub: string;
  icon: LucideIcon;
  path: string;
  isBottomRow?: boolean;
}) {
  return (
    <Link
      href={path}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 cursor-pointer transition-all duration-300 overflow-hidden border border-gray-200 hover:border-[#7B2332] ${
        isBottomRow
          ? "bg-gray-100 hover:bg-[#7B2332]"
          : "bg-white hover:bg-[#7B2332]"
      }`}
      data-testid={`card-quick-menu-${label}`}
    >
      <div className="relative z-10">
        <p className="text-[11px] font-bold tracking-[0.15em] uppercase mb-2 transition-colors duration-300 text-gray-400 group-hover:text-white/70">
          CLASS
        </p>
        <h3 className="text-xl sm:text-2xl font-extrabold leading-tight transition-colors duration-300 text-gray-900 group-hover:text-white">
          {label}
        </h3>
        <p className="text-xs sm:text-sm mt-2 font-medium transition-colors duration-300 text-gray-400 group-hover:text-white/70">
          {sub}
        </p>
      </div>
      <div className="absolute bottom-4 right-4 z-0">
        <Icon
          className="w-14 h-14 sm:w-16 sm:h-16 transition-colors duration-300 text-gray-200 group-hover:text-white/20"
          strokeWidth={1.2}
        />
      </div>
    </Link>
  );
}

function QuickMenuGrid() {
  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-2.5 sm:gap-3 h-full" data-testid="quick-menu-grid">
      {QUICK_MENU_ITEMS.map((item, idx) => (
        <QuickMenuCard
          key={item.label}
          label={item.label}
          sub={item.sub}
          icon={item.icon}
          path={item.path}
          isBottomRow={idx >= 4}
        />
      ))}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="px-3 sm:px-5 lg:px-6 py-3 lg:py-5" data-testid="hero-section">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-2.5 sm:gap-3 lg:h-[calc(100vh-100px)] lg:min-h-[520px] lg:max-h-[720px]">
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
    <PageLayout>
      <HeroSection />
      <PopupModal />
    </PageLayout>
  );
}
