import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X, Calendar } from "lucide-react";

interface Timetable {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
  created_at: string;
}

export function TimetableGallery({ category }: { category: string }) {
  const [selectedImage, setSelectedImage] = useState<Timetable | null>(null);

  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables", category],
    queryFn: async () => {
      const res = await fetch(`/api/timetables?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (timetables.length === 0) return null;

  return (
    <div className="mb-8" data-testid="timetable-gallery">
      <h2 className="text-xl font-bold text-gray-900 mb-4">시간표 이미지</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {timetables.map((tt) => (
          <button
            key={tt.id}
            onClick={() => setSelectedImage(tt)}
            className="bg-white border border-gray-200 overflow-hidden text-left hover:border-orange-300 transition-colors cursor-pointer"
            data-testid={`card-timetable-${tt.id}`}
          >
            {tt.image_url ? (
              <img src={tt.image_url} alt={tt.title} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-orange-50 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-orange-300" />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-bold text-gray-900 truncate">{tt.title}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          data-testid="modal-timetable"
        >
          <div
            className="bg-white max-w-3xl w-full max-h-[90vh] overflow-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-200 z-10">
              <h3 className="font-bold text-gray-900">{selectedImage.title}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedImage.image_url ? (
              <img src={selectedImage.image_url} alt={selectedImage.title} className="w-full" />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">이미지가 없습니다</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
