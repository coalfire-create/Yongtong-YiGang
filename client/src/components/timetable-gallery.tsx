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
      <div className="space-y-6">
        {timetables.map((tt) => (
          <div
            key={tt.id}
            className="bg-white border border-gray-200 overflow-hidden"
            data-testid={`card-timetable-${tt.id}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">{tt.title}</h3>
              {tt.image_url && (
                <button
                  onClick={() => setSelectedImage(tt)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
                  data-testid={`button-zoom-${tt.id}`}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  크게 보기
                </button>
              )}
            </div>
            {tt.image_url ? (
              <button
                onClick={() => setSelectedImage(tt)}
                className="w-full cursor-pointer"
              >
                <img
                  src={tt.image_url}
                  alt={tt.title}
                  className="w-full object-contain"
                />
              </button>
            ) : (
              <div className="h-48 bg-orange-50 flex items-center justify-center">
                <Calendar className="w-10 h-10 text-orange-300" />
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
