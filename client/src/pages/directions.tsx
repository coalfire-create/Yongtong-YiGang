import { SectionPage } from "@/components/layout";
import { MapPin, Phone, Clock, Bus, Car } from "lucide-react";

export function Directions() {
  return (
    <SectionPage title="오시는길" subtitle="영통이강학원 위치 및 교통 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-gray-200 p-6 space-y-5" data-testid="card-contact-info">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 text-sm">주소</p>
              <p className="text-sm text-gray-600 mt-0.5">경기도 수원시 영통구 영통동 123-45</p>
              <p className="text-xs text-gray-400 mt-0.5">영통역 2번 출구에서 도보 5분</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 text-sm">전화</p>
              <p className="text-sm text-gray-600 mt-0.5">031-123-4567</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900 text-sm">운영 시간</p>
              <p className="text-sm text-gray-600 mt-0.5">평일 14:00~22:00 / 토 10:00~18:00</p>
              <p className="text-xs text-gray-400 mt-0.5">일요일 및 공휴일 휴원</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-200 flex items-center justify-center min-h-[250px] border border-gray-200" data-testid="map-placeholder">
          <div className="text-center p-6">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-500">지도 영역</p>
            <p className="text-xs text-gray-400 mt-1">경기도 수원시 영통구 영통동 123-45</p>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">교통 안내</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid="card-transport-subway">
          <Bus className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">대중교통</h3>
            <p className="text-sm text-gray-600 mt-1">분당선 영통역 2번 출구에서 직진 후 첫 번째 사거리에서 좌회전 (도보 약 5분)</p>
            <p className="text-sm text-gray-600 mt-1">버스: 13, 13-4, 720-2 영통역 하차</p>
          </div>
        </div>
        <div className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid="card-transport-car">
          <Car className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">자가용</h3>
            <p className="text-sm text-gray-600 mt-1">영통IC에서 약 10분 소요. 건물 지하 주차장 이용 가능 (수강생 2시간 무료).</p>
          </div>
        </div>
      </div>
    </SectionPage>
  );
}
