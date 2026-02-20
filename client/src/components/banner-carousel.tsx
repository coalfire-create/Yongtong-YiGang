import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
}

export function BannerCarousel({ division, defaultTitle, defaultSubtitle, defaultDescription, height = "h-[340px] sm:h-[400px]" }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    ? banners.map((b) => ({
        title: b.title,
        subtitle: b.subtitle,
        description: b.description,
        image_url: b.image_url,
        link_url: b.link_url,
      }))
    : defaultSlides;

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
    const interval = setInterval(() => { next(); }, 5000);
    return () => clearInterval(interval);
  }, [next, slides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  if (isLoading) {
    return (
      <div className={`relative w-full ${height} overflow-hidden bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A] flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className={`relative w-full ${height} overflow-hidden bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A]`}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-center h-full text-white/40 text-sm">
          배너가 등록되지 않았습니다
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${height} overflow-hidden bg-gray-900`} data-testid={`carousel-${division}`}>
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
            <div className="w-full h-full bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A]">
              <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 text-white">
            {slide.link_url ? (
              <Link href={slide.link_url}>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight" data-testid={`text-banner-title-${division}-${index}`}>{slide.title}</h2>
                {slide.subtitle && <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-1">{slide.subtitle}</p>}
                {slide.description && <p className="text-sm sm:text-base mt-3 text-white/80 max-w-md">{slide.description}</p>}
              </Link>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight" data-testid={`text-banner-title-${division}-${index}`}>{slide.title}</h2>
                {slide.subtitle && <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold mt-1">{slide.subtitle}</p>}
                {slide.description && <p className="text-sm sm:text-base mt-3 text-white/80 max-w-md">{slide.description}</p>}
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
            data-testid={`button-carousel-prev-${division}`}
            aria-label="이전 슬라이드"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/30 text-white hover:bg-black/50 transition-colors duration-200"
            data-testid={`button-carousel-next-${division}`}
            aria-label="다음 슬라이드"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" data-testid={`carousel-dots-${division}`}>
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`transition-all duration-300 ${
                  index === current ? "w-7 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                }`}
                data-testid={`button-carousel-dot-${division}-${index}`}
                aria-label={`슬라이드 ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
