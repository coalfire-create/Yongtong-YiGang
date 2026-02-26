import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Link, useLocation } from "wouter";

interface BriefingEvent {
  id: number;
  title: string;
  event_date: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "초등": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  "중등": { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  "고등": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  "국제학교": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
};

const CATEGORY_LIST = ["초등", "중등", "고등", "국제학교"];
const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function BriefingCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: events = [], isLoading } = useQuery<BriefingEvent[]>({
    queryKey: ["/api/briefing-events", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/briefing-events?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const days = getCalendarDays(year, month);

  const eventsByDay: Record<number, BriefingEvent[]> = {};
  for (const ev of events) {
    const dateParts = (ev.event_date || "").split("T")[0].split("-");
    const d = parseInt(dateParts[2], 10);
    if (!isNaN(d)) {
      if (!eventsByDay[d]) eventsByDay[d] = [];
      eventsByDay[d].push(ev);
    }
  }

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <div className="bg-white border border-gray-200 p-4 sm:p-8" data-testid="briefing-calendar">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {CATEGORY_LIST.map((cat) => {
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS["고등"];
          return (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm ${colors.dot}`} />
              <span className="text-xs text-gray-600 font-medium">{cat}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={goPrev}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            data-testid="button-cal-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 tracking-wide" data-testid="text-cal-month">
            {year}.{String(month).padStart(2, "0")}
          </h2>
          <button
            onClick={goNext}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            data-testid="button-cal-next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="border-t border-gray-300">
            <div className="grid grid-cols-7">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className={`py-2.5 text-center text-xs font-bold tracking-wider border-b border-gray-300 ${
                    i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const dayOfWeek = idx % 7;
                const isSunday = dayOfWeek === 0;
                const dayEvents = day ? eventsByDay[day] || [] : [];
                return (
                  <div
                    key={idx}
                    className={`min-h-[90px] sm:min-h-[110px] border-b border-r border-gray-200 p-1.5 sm:p-2 ${
                      idx % 7 === 0 ? "border-l border-gray-200" : ""
                    } ${day ? "bg-white" : "bg-gray-50"}`}
                    data-testid={day ? `cal-day-${day}` : undefined}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-xs sm:text-sm font-semibold ${
                            isSunday ? "text-red-500" : "text-gray-700"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.map((ev) => {
                            const colors = CATEGORY_COLORS[ev.category] || { bg: "bg-gray-100", text: "text-gray-600" };
                            return (
                              <div
                                key={ev.id}
                                className={`${colors.bg} ${colors.text} text-[10px] sm:text-[11px] leading-tight px-1 py-0.5 rounded-sm truncate`}
                                title={ev.title}
                                data-testid={`cal-event-${ev.id}`}
                              >
                                {ev.title}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { label: "설명회 예약", path: "/briefing" },
  { label: "설명회 일정", path: "/briefing/schedule" },
];

function BriefingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <PageLayout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight" data-testid="text-page-title">설명회</h1>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-0 border-b border-gray-200">
            {TABS.map((tab) => {
              const isActive = location === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`px-6 sm:px-8 py-3.5 text-sm sm:text-base font-bold transition-all duration-200 border-b-[3px] ${
                    isActive
                      ? "text-[#7B2332] border-[#7B2332]"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                  data-testid={`tab-${tab.label}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </div>
    </PageLayout>
  );
}

interface BriefingAnnouncement {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
  form_url: string | null;
  is_active: boolean;
}

export function Briefing() {
  const { data: briefings = [], isLoading } = useQuery<BriefingAnnouncement[]>({
    queryKey: ["/api/briefings/active"],
  });

  return (
    <BriefingLayout>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : briefings.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">현재 예정된 설명회가 없습니다.</p>
          <p className="text-gray-400 text-sm mt-1">새로운 설명회 일정이 등록되면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="briefing-list">
          {briefings.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-gray-200 p-6 sm:p-8"
              data-testid={`card-briefing-${b.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-14 h-14 bg-red-50 flex items-center justify-center">
                  <CalendarDays className="w-7 h-7 text-[#7B2332]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug" data-testid={`text-briefing-title-${b.id}`}>
                    {b.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                    <span className="font-medium">{b.date}</span>
                    {b.time && <span>{b.time}</span>}
                  </div>
                  {b.description && (
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">{b.description}</p>
                  )}
                  {b.form_url && (
                    <a
                      href={b.form_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#7B2332] text-white text-sm font-semibold hover:bg-[#6B1D2A] transition-colors"
                      data-testid={`link-briefing-form-${b.id}`}
                    >
                      설명회 신청하기
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BriefingLayout>
  );
}

export function BriefingReservation() {
  return <Briefing />;
}

export function BriefingSchedule() {
  return (
    <BriefingLayout>
      <BriefingCalendar />
    </BriefingLayout>
  );
}
