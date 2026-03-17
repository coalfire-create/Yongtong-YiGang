import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

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

interface BannerCarouselProps {
  division: string;
  defaultTitle?: string;
  defaultSubtitle?: string;
  defaultDescription?: string;
  height?: string;
  className?: string;
}

const PATTERN = "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

function SlideText({ slide, division, index }: {
  slide: { title: string; subtitle: string; description: string; link_url: string | null };
  division: string;
  index: number;
}) {
  const hasText = (slide.title?.trim() || slide.subtitle || slide.description);
  if (!hasText) return null;
  const content = (
    <>
      {slide.title?.trim() && (
        <h2 className="text-lg sm:text-2xl lg:text-4xl font-extrabold leading-tight drop-shadow" data-testid={`text-banner-title-${division}-${index}`}>
          {slide.title}
        </h2>
      )}
      {slide.subtitle && <p className="text-base sm:text-xl lg:text-3xl font-extrabold mt-0.5 sm:mt-1 drop-shadow">{slide.subtitle}</p>}
      {slide.description && <p className="text-xs sm:text-sm lg:text-base mt-2 sm:mt-3 text-white/80 max-w-md">{slide.description}</p>}
    </>
  );
  return (
    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10 text-white z-10">
      {slide.link_url ? <Link href={slide.link_url}>{content}</Link> : content}
    </div>
  );
}

export function BannerCarousel({
  division,
  defaultTitle,
  defaultSubtitle,
  defaultDescription,
  height = "h-[340px] sm:h-[440px]",
  className,
}: BannerCarouselProps) {
  const desktopHeightClass = className || height;
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners", division],
    queryFn: async () => {
      const res = await fetch(`/api/banners?division=${division}`);
      if (!res.ok) throw new Error("Failed to fetch banners");
      return res.json();
    },
  });

  const defaultSlides = defaultTitle
    ? [{ title: defaultTitle, subtitle: defaultSubtitle || "", description: defaultDescription || "", image_url: null as string | null, link_url: null as string | null }]
    : [];

  const slides = banners.length > 0
    ? banners.map((b) => ({ title: b.title, subtitle: b.subtitle, description: b.description, image_url: b.image_url, link_url: b.link_url }))
    : defaultSlides;

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const prev = useCallback(() => goTo(current === 0 ? slides.length - 1 : current - 1), [current, goTo, slides.length]);
  const next = useCallback(() => goTo(current === slides.length - 1 ? 0 : current + 1), [current, goTo, slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
    touchStartX.current = null;
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, slides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  if (isLoading) {
    return (
      <div className="relative w-full bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A] flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full min-h-[200px] bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A] flex items-center justify-center">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: PATTERN }} />
        <span className="text-white/40 text-sm">배너가 등록되지 않았습니다</span>
      </div>
    );
  }

  const dots = slides.length > 1 && (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" data-testid={`carousel-dots-${division}`}>
      {slides.map((_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          className={`transition-all duration-300 rounded-full ${i === current ? "w-7 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"}`}
          data-testid={`button-carousel-dot-${division}-${i}`}
          aria-label={`슬라이드 ${i + 1}`}
        />
      ))}
    </div>
  );

  return (
    <div
      className="relative w-full bg-gray-900 lg:h-full"
      data-testid={`carousel-${division}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── 모바일: 이미지 원본 비율 (높이 고정 없음), 스와이프 ── */}
      <div className="lg:hidden relative w-full overflow-hidden select-none">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`transition-opacity duration-500 ease-in-out ${
              index === current ? "relative opacity-100 z-10" : "absolute inset-0 opacity-0 z-0"
            }`}
          >
            {slide.image_url ? (
              <img
                src={slide.image_url}
                alt={slide.title}
                className="w-full h-auto block pointer-events-none"
                draggable={false}
                data-testid={`img-banner-mobile-${division}-${index}`}
              />
            ) : (
              <div className="w-full aspect-[16/9] bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A]">
                <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: PATTERN }} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
            <SlideText slide={slide} division={division} index={index} />
          </div>
        ))}
        {dots}
      </div>

      {/* ── 데스크탑: 고정 높이 absolute 레이아웃 ── */}
      <div className={`hidden lg:block relative w-full overflow-hidden ${desktopHeightClass}`}>
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
              index === current ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {slide.image_url ? (
              <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover pointer-events-none" draggable={false} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A]">
                <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: PATTERN }} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <SlideText slide={slide} division={division} index={index} />
          </div>
        ))}
        {dots}
      </div>
    </div>
  );
}
