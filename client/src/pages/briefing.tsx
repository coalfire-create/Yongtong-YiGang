import { SectionPage } from "@/components/layout";
import { CalendarDays, Phone, MapPin } from "lucide-react";

export function Briefing() {
  return (
    <SectionPage title="설명회" subtitle="학부모 설명회 일정 및 예약 안내">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-gray-200 p-8" data-testid="card-briefing-reservation">
          <Phone className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">설명회 예약</h3>
          <p className="text-gray-500 text-sm mb-4">전화 또는 방문 예약을 통해 설명회에 참석하실 수 있습니다.</p>
          <div className="bg-orange-50 p-4">
            <p className="text-sm font-bold text-gray-900">예약 전화</p>
            <p className="text-lg font-extrabold text-orange-500 mt-1">031-123-4567</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-8" data-testid="card-briefing-location">
          <MapPin className="w-10 h-10 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">설명회 장소</h3>
          <p className="text-gray-500 text-sm mb-4">영통이강학원 본관 3층 대강의실에서 진행됩니다.</p>
          <div className="bg-orange-50 p-4">
            <p className="text-sm font-bold text-gray-900">주소</p>
            <p className="text-sm text-gray-600 mt-1">경기도 수원시 영통구 영통동 123-45</p>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">설명회 일정</h2>
      <div className="space-y-4">
        {[
          { date: "2026년 3월 8일 (토)", time: "14:00~16:00", topic: "2026학년도 고등부 신입생 설명회", status: "예약중" },
          { date: "2026년 3월 15일 (토)", time: "14:00~16:00", topic: "중등부 봄학기 커리큘럼 설명회", status: "예약중" },
          { date: "2026년 3월 22일 (토)", time: "10:00~12:00", topic: "초등부 사고력 수학 과정 설명회", status: "준비중" },
        ].map((event) => (
          <div key={event.date} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-gray-200 p-6" data-testid={`card-event-${event.topic}`}>
            <div className="flex items-center gap-3 flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-orange-500" />
              <div>
                <p className="text-sm font-bold text-gray-900">{event.date}</p>
                <p className="text-xs text-gray-500">{event.time}</p>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{event.topic}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 self-start sm:self-center ${event.status === "예약중" ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
              {event.status}
            </span>
          </div>
        ))}
      </div>
    </SectionPage>
  );
}

export function BriefingReservation() {
  return <Briefing />;
}

export function BriefingSchedule() {
  return <Briefing />;
}
