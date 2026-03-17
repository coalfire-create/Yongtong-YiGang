import { SectionPage } from "@/components/layout";
import { MapPin, Clock, Bus, Car, ExternalLink } from "lucide-react";

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

const MAPS_EMBED =
  "https://maps.google.com/maps?q=%EA%B2%BD%EA%B8%B0%EB%8F%84+%EC%88%98%EC%9B%90%EC%8B%9C+%EC%98%81%ED%86%B5%EA%B5%AC+%EB%B4%89%EC%98%81%EB%A1%9C+1605+%EB%AA%A8%EB%8D%98%ED%83%80%EC%9A%B4&hl=ko&z=17&output=embed";
const MAPS_LINK =
  "https://maps.google.com/maps?q=%EA%B2%BD%EA%B8%B0%EB%8F%84+%EC%88%98%EC%9B%90%EC%8B%9C+%EC%98%81%ED%86%B5%EA%B5%AC+%EB%B4%89%EC%98%81%EB%A1%9C+1605+%EB%AA%A8%EB%8D%98%ED%83%80%EC%9A%B4";

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

        <div className="border border-gray-200 overflow-hidden min-h-[280px]" data-testid="map-embed-top">
          <iframe
            src={MAPS_EMBED}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: "280px" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="영통이강학원 지도"
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">교통 안내</h2>
      <div className="space-y-4 mb-10">
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

      <div className="border border-gray-200 overflow-hidden" data-testid="map-embed-full">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#7B2332]" />
            <span className="text-sm font-semibold text-gray-700">경기도 수원시 영통구 봉영로 1605, 모던타운</span>
          </div>
          <a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#7B2332] hover:underline font-medium"
            data-testid="link-maps-open"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            크게 보기
          </a>
        </div>
        <iframe
          src={MAPS_EMBED}
          width="100%"
          height="450"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="영통이강학원 상세 지도"
        />
      </div>
    </SectionPage>
  );
}
