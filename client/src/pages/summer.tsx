import { useQuery } from "@tanstack/react-query";
import { SectionPage } from "@/components/layout";
import { Loader2, User } from "lucide-react";

interface SummerImage {
  id: number;
  image_url: string;
  teacher_id: number | null;
  teacher_name: string | null;
}

export default function Summer() {
  const { data: images = [], isLoading } = useQuery<SummerImage[]>({
    queryKey: ["/api/summer-images"],
  });

  // Group images by teacher
  const grouped = images.reduce((acc: Record<string, SummerImage[]>, img) => {
    const key = img.teacher_name || "공통";
    if (!acc[key]) acc[key] = [];
    acc[key].push(img);
    return acc;
  }, {});

  const teacherNames = Object.keys(grouped).sort((a, b) => {
    if (a === "공통") return -1;
    if (b === "공통") return 1;
    return 0;
  });

  return (
    <SectionPage title="썸머스쿨">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-[#7B2332]" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-medium">등록된 썸머스쿨 정보가 없습니다.</p>
          </div>
        ) : (
          teacherNames.map((name) => (
            <div key={name} className="space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-[#7B2332]/10 pb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${name === "공통" ? "bg-gray-100" : "bg-[#7B2332]/10"}`}>
                  <User className={`w-5 h-5 ${name === "공통" ? "text-gray-400" : "text-[#7B2332]"}`} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              </div>
              
              <div className="flex flex-col gap-10">
                {grouped[name].map((img) => (
                  <div key={img.id} className="overflow-hidden rounded-2xl shadow-xl shadow-black/5 border border-gray-100 bg-white">
                    <img
                      src={img.image_url}
                      alt={`${name} 썸머스쿨`}
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </SectionPage>
  );
}
