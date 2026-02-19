import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X, Calendar, ZoomIn } from "lucide-react";

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

  if (timetables.length === 0) {
    return (
      <div className="text-center py-16" data-testid="timetable-empty">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">등록된 시간표가 없습니다.</p>
        <p className="text-xs text-gray-300 mt-1">관리자 페이지에서 시간표 이미지를 업로드하세요.</p>
      </div>
    );
  }

  return (
    <div data-testid="timetable-gallery">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {timetables.map((tt) => (
          <div
            key={tt.id}
            className="group bg-white border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedImage(tt)}
            data-testid={`card-timetable-${tt.id}`}
          >
            {tt.image_url ? (
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                <img
                  src={tt.image_url}
                  alt={tt.title}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 px-3 py-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <ZoomIn className="w-4 h-4" />
                    크게 보기
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-[3/4] bg-orange-50 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-orange-300" />
              </div>
            )}
            {tt.title && (
              <div className="px-4 py-3 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 truncate">{tt.title}</h3>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          data-testid="modal-timetable"
        >
          <div
            className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto relative"
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
