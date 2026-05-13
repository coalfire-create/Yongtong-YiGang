import { useQuery } from "@tanstack/react-query";
import { SectionPage } from "@/components/layout";
import { Loader2 } from "lucide-react";

interface SummerImage {
  id: number;
  image_url: string;
}

export default function Summer() {
  const { data: images = [], isLoading } = useQuery<SummerImage[]>({
    queryKey: ["/api/summer-images"],
  });

  return (
    <SectionPage title="썸머스쿨">
      <div className="max-w-4xl mx-auto space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
            <p className="text-gray-500">등록된 썸머스쿨 정보가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-xl shadow-md border border-gray-200">
                <img
                  src={img.image_url}
                  alt="썸머스쿨"
                  className="w-full h-auto block"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionPage>
  );
}
