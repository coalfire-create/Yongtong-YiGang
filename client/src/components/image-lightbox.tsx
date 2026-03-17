import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const lastTap = useRef(0);
  const lastPinchDist = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);

  const clampedZoom = (next: number) => Math.min(Math.max(next, 0.5), 6);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.88 : 1.14;
    setScale(prev => clampedZoom(prev * delta));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    setPos({
      x: dragStart.current.posX + (e.clientX - dragStart.current.x),
      y: dragStart.current.posY + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        scale > 1 ? resetZoom() : setScale(2.5);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      if (scale > 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          posX: pos.x,
          posY: pos.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist.current > 0) {
        const ratio = dist / lastPinchDist.current;
        setScale(prev => clampedZoom(prev * ratio));
      }
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
      setPos({
        x: dragStart.current.posX + (e.touches[0].clientX - dragStart.current.x),
        y: dragStart.current.posY + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  };

  const handleTouchEnd = () => {
    dragStart.current = null;
    lastPinchDist.current = 0;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && scale <= 1) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/92 flex items-center justify-center"
      onClick={handleBackdropClick}
      data-testid="lightbox-overlay"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
        data-testid="button-lightbox-close"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <button
          onClick={() => setScale(prev => clampedZoom(prev / 1.35))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          data-testid="button-lightbox-zoomout"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetZoom}
          className="px-3 h-8 text-xs font-bold text-white bg-white/10 rounded-full hover:bg-white/25 transition-colors min-w-[52px] text-center"
          data-testid="button-lightbox-reset"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale(prev => clampedZoom(prev * 1.35))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors"
          data-testid="button-lightbox-zoomin"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={alt ?? ""}
          style={{
            transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.12s ease-out",
            maxWidth: "100vw",
            maxHeight: "100vh",
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
            display: "block",
          }}
          draggable={false}
          data-testid="img-lightbox"
        />
      </div>
    </div>
  );
}
