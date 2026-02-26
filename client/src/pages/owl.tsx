import { PageLayout } from "@/components/layout";
import { Moon, Clock, BookOpen, CheckCircle } from "lucide-react";
import { BannerCarousel } from "@/components/banner-carousel";

export function Owl() {
  return (
    <PageLayout>
      <BannerCarousel
        division="owl"
        defaultTitle="올빼미 독학관"
        defaultSubtitle="자기주도 학습"
        defaultDescription="조용하고 쾌적한 환경에서 집중 학습이 가능한 공간"
        className="w-full aspect-[21/7] sm:aspect-[21/6]"
      />

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
              학원 수강생은 무료 이용 가능합니다. 월~토 운영되며, 사전 예약 후 이용해 주세요.
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
              { day: "평일 (월~금)", time: "15:00 ~ 22:00" },
              { day: "토요일", time: "10:00 ~ 18:00" },
              { day: "일요일·공휴일", time: "휴관" },
            ].map((item) => (
              <div
                key={item.day}
                className="text-center py-4 px-3 bg-gray-50 rounded"
                data-testid={`card-time-${item.day}`}
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">{item.day}</p>
                <p className="text-sm text-[#7B2332] font-bold">{item.time}</p>
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
            {["개인 독서실 좌석 80석", "냉·난방 완비", "무료 Wi-Fi", "정수기·간식 코너", "CCTV 안전 관리", "전문 관리 선생님 상주"].map((feat) => (
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
