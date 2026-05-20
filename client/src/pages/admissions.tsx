import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionPage } from "@/components/layout";
import { Trophy, Star, TrendingUp, Loader2 } from "lucide-react";

const DIVISIONS = [
  { key: "high", label: "고등관" },
  { key: "junior", label: "초/중등관" },
] as const;

const STATS: Record<string, { label: string; count: string; year: string }[]> = {
  high: [],
  junior: [],
};

const RESULTS: Record<string, { univ: string; dept: string; year: string }[]> = {
  high: [],
  junior: [],
};

interface Review {
  id: number;
  name: string;
  school: string;
  division: string;
  content: string;
  image_urls: string[];
  display_order: number;
}

function DivisionTabs({ selected, onChange }: { selected: string; onChange: (key: string) => void }) {
  return (
    <div className="flex items-center gap-1 mb-8" data-testid="admissions-division-tabs">
      {DIVISIONS.map((d) => (
        <button
          key={d.key}
          onClick={() => onChange(d.key)}
          className={`px-6 py-2.5 text-sm font-bold transition-all duration-200 ${
            selected === d.key
              ? "bg-[#7B2332] text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
          }`}
          data-testid={`tab-admissions-${d.key}`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

export function Admissions() {
  const [division, setDivision] = useState("high");
  const stats = STATS[division] || [];
  const results = RESULTS[division] || [];

  const hasData = stats.length > 0 || results.length > 0;

  return (
    <SectionPage title="입시" subtitle="영통이강학원 입시 실적 및 합격 후기">
      <DivisionTabs selected={division} onChange={setDivision} />

      {!hasData ? (
        <div className="text-center py-20 bg-gray-50 border border-gray-150 rounded-2xl" data-testid="admissions-empty-state">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">등록된 입시 실적이 없습니다.</p>
          <p className="text-gray-400 text-sm mt-1">곧 새로운 소식으로 찾아뵙겠습니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 p-6 text-center" data-testid={`card-stat-${stat.label}`}>
                <TrendingUp className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <p className="text-3xl font-extrabold text-gray-900">{stat.count}</p>
                <p className="text-sm font-bold text-red-600 mt-1">{stat.label}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.year}</p>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {division === "high" ? "주요 합격 실적" : "주요 진학 실적"}
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-4 bg-white border border-gray-200 p-4" data-testid={`card-result-${i}`}>
                <Trophy className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="font-bold text-gray-900 min-w-[130px]">{r.univ}</span>
                <span className="text-gray-600 flex-1">{r.dept}</span>
                <span className="text-xs text-gray-400">{r.year}학년도</span>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionPage>
  );
}

export function AdmissionsResults() {
  return <Admissions />;
}

export function AdmissionsReviews() {
  const [division, setDivision] = useState("high");

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews", division],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?division=${division}`);
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  return (
    <SectionPage title="합격 후기" subtitle="영통이강학원 졸업생들의 생생한 후기">
      <DivisionTabs selected={division} onChange={setDivision} />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">등록된 합격후기가 없습니다.</p>
      ) : (
        <div className="space-y-8">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 p-6" data-testid={`card-review-${r.id}`}>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-red-600" />
                <span className="font-bold text-gray-900">{r.name}</span>
                {r.school && <span className="text-sm text-red-600 font-medium">| {r.school}</span>}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{r.content}</p>
              {r.image_urls && r.image_urls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {r.image_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${r.name} 후기 이미지 ${i + 1}`}
                      className="w-full aspect-square object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      data-testid={`img-review-${r.id}-${i}`}
                      onClick={() => window.open(url, "_blank")}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
