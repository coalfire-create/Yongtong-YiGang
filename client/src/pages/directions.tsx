import { SectionPage } from "@/components/layout";
import { MapPin, Clock, Bus, Car } from "lucide-react";
import mapImage from "@assets/스크린샷_2026-02-20_오후_5.26.39_1771576002134.png";

export function Directions() {
  return (
    <SectionPage title="오시는길" subtitle="영통이강학원 위치 및 교통 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-gray-200 p-6 space-y-5" data-testid="card-contact-info">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 text-sm">주소</p>
              <p className="text-sm text-gray-600 mt-0.5">경기도 수원시 영통구 봉영로 1605, 모던타운 102호</p>
              <p className="text-xs text-gray-400 mt-0.5">영통역에서 도보 5분</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 text-sm">운영 시간</p>
              <p className="text-sm text-gray-600 mt-0.5">평일 14:00~22:00 / 주말 8:30~22:00</p>
            </div>
          </div>
        </div>
        <div className="border border-gray-200 overflow-hidden min-h-[250px]" data-testid="map-image">
          <img src={mapImage} alt="영통이강학원 위치 지도" className="w-full h-full object-cover" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">교통 안내</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid="card-transport-subway">
          <Bus className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">대중교통</h3>
            <p className="text-sm text-gray-600 mt-1">분당선 영통역에서 도보 약 5분</p>
            <p className="text-sm text-gray-600 mt-1">버스: 13, 13-4, 720-2 영통역 하차</p>
          </div>
        </div>
        <div className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid="card-transport-car">
          <Car className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">자가용</h3>
            <p className="text-sm text-gray-600 mt-1">영통IC에서 약 10분 소요. 건물 지하 주차장 이용 가능 (수강생 2시간 무료).</p>
          </div>
        </div>
      </div>
    </SectionPage>
  );
}
