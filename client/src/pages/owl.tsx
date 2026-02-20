import { SectionPage } from "@/components/layout";
import { Moon, Clock, BookOpen, CheckCircle } from "lucide-react";

export function Owl() {
  return (
    <SectionPage title="올빼미 독학관" subtitle="자기주도 학습을 위한 최적의 공간">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-gray-200 p-8" data-testid="card-owl-info">
          <Moon className="w-10 h-10 text-red-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">독학관 안내</h3>
          <p className="text-gray-500 text-sm">조용하고 쾌적한 환경에서 집중 학습이 가능한 자습 공간입니다. 전문 관리 선생님이 상주하여 학습 분위기를 유지합니다.</p>
        </div>
        <div className="bg-white border border-gray-200 p-8" data-testid="card-owl-usage">
          <BookOpen className="w-10 h-10 text-red-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">이용 방법</h3>
          <p className="text-gray-500 text-sm">학원 수강생은 무료 이용 가능합니다. 월~토 운영되며, 사전 예약 후 이용해 주세요.</p>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">운영 시간</h2>
      <div className="space-y-3">
        {[
          { day: "평일 (월~금)", time: "15:00 ~ 22:00" },
          { day: "토요일", time: "10:00 ~ 18:00" },
          { day: "일요일·공휴일", time: "휴관" },
        ].map((item) => (
          <div key={item.day} className="flex items-center gap-3 bg-white border border-gray-200 p-5" data-testid={`card-time-${item.day}`}>
            <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900 min-w-[140px]">{item.day}</span>
            <span className="text-gray-600">{item.time}</span>
          </div>
        ))}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-6">시설 안내</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {["개인 독서실 좌석 80석", "냉·난방 완비", "무료 Wi-Fi", "정수기·간식 코너", "CCTV 안전 관리", "전문 관리 선생님 상주"].map((feat) => (
          <div key={feat} className="flex items-center gap-3 bg-white border border-gray-200 p-4">
            <CheckCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{feat}</span>
          </div>
        ))}
      </div>
    </SectionPage>
  );
}

export function OwlInfo() {
  return <Owl />;
}

export function OwlUsage() {
  return <Owl />;
}
