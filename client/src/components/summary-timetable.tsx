import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ImageLightbox } from "@/components/image-lightbox";

interface SummaryTimetable {
  id: number;
  division: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export function SummaryTimetableSection({ division, title }: { division: string; title: string }) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<SummaryTimetable[]>({
    queryKey: ["/api/summary-timetables", division],
    queryFn: async () => {
      const res = await fetch(`/api/summary-timetables?division=${encodeURIComponent(division)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-gray-50" data-testid={`section-summary-${division}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-6 bg-[#7B2332]" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900" data-testid={`text-summary-title-${division}`}>
              {title}
            </h2>
          </div>
          <div className="space-y-4 flex flex-col items-center">
            {items.map((item) => (
              <div
                key={item.id}
                className="w-full max-w-2xl cursor-zoom-in"
                data-testid={`img-summary-${item.id}`}
                onClick={() => setLightboxSrc(item.image_url)}
              >
                <img
                  src={item.image_url}
                  alt={title}
                  className="w-full border border-gray-200 rounded hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">터치하면 크게 볼 수 있어요</p>
        </div>
      </section>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt={title}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
}
