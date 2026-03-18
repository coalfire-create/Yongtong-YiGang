import { PageLayout } from "@/components/layout";
import { Moon, Clock, BookOpen, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

function OwlImageSection() {
  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners", "owl"],
    queryFn: async () => {
      const res = await fetch("/api/banners?division=owl");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const images = banners.filter((b) => b.is_active && b.image_url);
  if (images.length === 0) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`} data-testid="owl-image-grid">
        {images.map((b) => {
          const inner = (
            <img
              src={b.image_url!}
              alt={b.title || "올빼미 독학관"}
              className="w-full h-auto block rounded"
              data-testid={`owl-image-${b.id}`}
            />
          );
          return (
            <div key={b.id} className="overflow-hidden rounded">
              {b.link_url ? (
                <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
                  {inner}
                </a>
              ) : inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Owl() {
  return (
    <PageLayout>
      <OwlImageSection />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        <div className="flex items-start gap-3 mb-4">
          <Moon className="w-5 h-5 text-[#7B2332] mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1" data-testid="text-owl-info-title">독학관 안내</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              조용하고 쾌적한 환경에서 집중 학습이 가능한 자습 공간입니다. 전문 관리 선생님이 상주하여 학습 분위기를 유지합니다.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-8">
          <BookOpen className="w-5 h-5 text-[#7B2332] mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1" data-testid="text-owl-usage-title">이용 방법</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              "올빼미 장학생 지원 혜택"에 의거 담당자와 상담후 이용 가능합니다. 월~일 1년 365일 무휴로 운영합니다. 단 학기중에는 평일(월~금) 하교후 ~24시 운영이며 내신 시험기간에는 13시~24시 운영합니다.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" data-testid="text-owl-hours-title">
            <Clock className="w-5 h-5 text-[#7B2332]" />
            운영 시간
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { day: "평일 (월~금)", time: "14:00 ~ 24:00", highlight: false },
              { day: "토요일/일요일/공휴일", time: "8:00 ~ 24:00", highlight: false },
              { day: "썸머·윈터 방학중", time: "8:00 ~ 24:00", sub: "월~일 365일 무휴", highlight: true },
            ].map((item) => (
              <div
                key={item.day}
                className={`text-center py-4 px-3 rounded ${item.highlight ? "bg-[#7B2332] text-white" : "bg-gray-50"}`}
                data-testid={`card-time-${item.day}`}
              >
                <p className={`text-sm font-semibold mb-1 ${item.highlight ? "text-white/90" : "text-gray-900"}`}>{item.day}</p>
                <p className={`text-sm font-bold ${item.highlight ? "text-white" : "text-[#7B2332]"}`}>{item.time}</p>
                {item.sub && <p className={`text-xs mt-0.5 ${item.highlight ? "text-white/75" : "text-gray-400"}`}>{item.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" data-testid="text-owl-facilities-title">
            <CheckCircle className="w-5 h-5 text-[#7B2332]" />
            시설 안내
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
            {["개인 독서실 좌석 75석", "냉·난방/가습기/공기청정기 완비", "무료 Wi-Fi(사이트 차단 인강용 wifi)", "냉/온수 정수기", "CCTV 관리", "전문 관리 선생님 상주"].map((feat) => (
              <div key={feat} className="flex items-center gap-2 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2332] flex-shrink-0" />
                <span className="text-sm text-gray-700">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export function OwlInfo() {
  return <Owl />;
}

export function OwlUsage() {
  return <Owl />;
}
