import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxPhoto {
  src: string;
  label: string;
  description?: string;
}

export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);
  const showNav = photos.length > 1;

  if (photos.length === 0 || idx >= photos.length) return null;

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
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          data-testid="button-lightbox-prev"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      <div className="px-4 sm:px-16 max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[idx].src}
          alt={photos[idx].label}
          className="w-full max-h-[75vh] object-contain mx-auto rounded shadow-2xl"
        />
        {(photos[idx].label || photos[idx].description) && (
          <div className="mt-4 text-center bg-black/60 p-4 rounded-xl backdrop-blur-sm max-w-2xl mx-auto border border-white/10">
            {photos[idx].label && (
              <p className="text-white text-lg font-bold">{photos[idx].label}</p>
            )}
            {photos[idx].description && (
              <p className="text-white/80 text-sm mt-1 leading-relaxed">{photos[idx].description}</p>
            )}
          </div>
        )}
      </div>
      {showNav && (
        <button
          className="absolute right-3 sm:right-6 text-white/70 hover:text-white p-2 transition-colors z-[210]"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          data-testid="button-lightbox-next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}
