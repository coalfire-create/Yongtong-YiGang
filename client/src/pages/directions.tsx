import { SectionPage } from "@/components/layout";
import { MapPin, Clock, Bus, Car } from "lucide-react";
import mapImage from "@assets/map.png";

const locations = [
  { label: "고등관 1층", address: "경기도 수원시 영통구 봉영로 1605, 모던타운 102호" },
  { label: "고등관 5층", address: "경기도 수원시 영통구 봉영로 1605, 모던타운 504호" },
  { label: "초/중등관", address: "경기도 수원시 영통구 봉영로 1605, 모던타운 505호" },
  { label: "올빼미 스파르타", address: "경기도 수원시 영통구 봉영로 1605, 모던타운 505호" },
];

const hours = [
  { label: "고등관 · 초/중등관", time: "평일 14:00~22:00" },
  { label: "올빼미 스파르타", time: "평일 14:00~24:00 / 토·일·공휴일 8:00~24:00" },
];

export function Directions() {
  return (
    <SectionPage title="오시는길" subtitle="영통이강학원 위치 및 교통 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-gray-200 p-6 space-y-6" data-testid="card-contact-info">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#7B2332] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm mb-3">주소</p>
              <div className="space-y-3">
                {locations.map((loc) => (
                  <div key={loc.label} className="flex items-start gap-3">
                    <span className="inline-block text-xs font-semibold text-[#7B2332] bg-red-50 px-2 py-0.5 rounded mt-0.5 whitespace-nowrap flex-shrink-0">{loc.label}</span>
                    <p className="text-sm text-gray-600 leading-snug">{loc.address}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#7B2332] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm mb-3">운영 시간</p>
              <div className="space-y-3">
                {hours.map((h) => (
                  <div key={h.label} className="flex items-start gap-3">
                    <span className="inline-block text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-0.5 whitespace-nowrap flex-shrink-0">{h.label}</span>
                    <p className="text-sm text-gray-600 leading-snug">{h.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 overflow-hidden min-h-[280px]" data-testid="map-image">
          <img src={mapImage} alt="영통이강학원 위치 지도" className="w-full h-full object-cover" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">교통 안내</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid="card-transport-subway">
          <Bus className="w-6 h-6 text-[#7B2332] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">대중교통</h3>
            <p className="text-sm text-gray-600 mt-1">수인분당선 영통역 8번 출구에서 도보 약 5분</p>
            <p className="text-sm text-gray-600 mt-1">버스: 2-1 , 3 , 5 , 13-1 , 34 , 34-1 , 203 , 720-3 영통역 하차</p>
          </div>
        </div>
        <div className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid="card-transport-car">
          <Car className="w-6 h-6 text-[#7B2332] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">자가용</h3>
            <p className="text-sm text-gray-600 mt-1">영통IC에서 약 10분 소요. 모던타운 지하 주차장 이용 가능 (수강생 90분 무료).</p>
          </div>
        </div>
      </div>
    </SectionPage>
  );
}
