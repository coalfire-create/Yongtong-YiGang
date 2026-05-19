import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Users, Calendar, MapPin, User, CheckCircle2, Clock } from "lucide-react";
import { PageLayout } from "@/components/layout";
import { Link, useLocation } from "wouter";

interface BriefingEvent {
  id: number;
  title: string;
  event_date: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "초/중등": { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  "고등": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
};

const CATEGORY_LIST = ["초/중등", "고등"];
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

interface ParsedSpeaker {
  subject?: string;
  name: string;
  desc?: string;
}

interface ParsedField {
  key: string;
  value: string;
  speakers?: ParsedSpeaker[];
  bullets?: string[];
}

interface ParsedSession {
  title?: string;
  fields: ParsedField[];
}

interface ParsedDescription {
  intro: string;
  sessions: ParsedSession[];
}

function parseDescription(descText: string): ParsedDescription {
  const result: ParsedDescription = { intro: "", sessions: [] };
  if (!descText) return result;

  let introPart = "";
  let sessionParts: string[] = [];

  if (descText.includes("▣")) {
    const splitByBox = descText.split("▣");
    introPart = splitByBox[0].trim();
    sessionParts = splitByBox.slice(1);
  } else {
    const firstArrow = descText.indexOf("▶");
    if (firstArrow !== -1) {
      introPart = descText.substring(0, firstArrow).trim();
      sessionParts = [descText.substring(firstArrow)];
    } else {
      introPart = descText.trim();
    }
  }

  result.intro = introPart;

  for (const sessionRaw of sessionParts) {
    let title = "";
    let content = sessionRaw;

    const arrowIdx = sessionRaw.indexOf("▶");
    if (arrowIdx !== -1) {
      title = sessionRaw.substring(0, arrowIdx).trim();
      content = sessionRaw.substring(arrowIdx);
    }

    const fields: ParsedField[] = [];
    const rawFields = content.split("▶").map(f => f.trim()).filter(Boolean);

    for (const rawField of rawFields) {
      let key = "";
      let val = "";

      const colonIdx = rawField.indexOf(":");
      const spaceIdx = rawField.search(/\s/);
      const circleIdx = rawField.indexOf("○");
      const dashIdx = rawField.indexOf("-");

      let splitIdx = -1;
      if (colonIdx !== -1) {
        splitIdx = colonIdx;
      } else {
        const indices = [spaceIdx, circleIdx, dashIdx].filter(idx => idx !== -1);
        if (indices.length > 0) {
          splitIdx = Math.min(...indices);
        }
      }

      if (splitIdx !== -1) {
        key = rawField.substring(0, splitIdx).replace(/:/g, "").trim();
        val = rawField.substring(splitIdx).trim();
        if (val.startsWith(":")) {
          val = val.substring(1).trim();
        }
      } else {
        key = rawField;
      }

      const fieldObj: ParsedField = { key, value: val };

      if (key === "연사" || val.includes("○")) {
        const speakerSegments = val.split("○").map(s => s.trim()).filter(Boolean);
        const parsedSpeakers: ParsedSpeaker[] = speakerSegments.map(seg => {
          const words = seg.split(/\s+/);
          let subject = "";
          let name = "";
          let desc = "";

          if (words.length > 0) {
            const firstWord = words[0];
            if (["국어", "영어", "수학", "과학", "입시", "논술", "사회", "사탐", "과탐", "생명과학", "화학", "물리"].includes(firstWord)) {
              subject = firstWord;
              name = words[1] || "";
              desc = words.slice(2).join(" ");
            } else {
              name = words[0] || "";
              desc = words.slice(1).join(" ");
            }
          }
          return { subject, name, desc };
        });
        fieldObj.speakers = parsedSpeakers;
      } else if (key === "내용" || val.includes("-")) {
        const bulletSegments = val.split("-").map(b => b.trim()).filter(Boolean);
        fieldObj.bullets = bulletSegments;
      }

      fields.push(fieldObj);
    }

    result.sessions.push({ title, fields });
  }

  return result;
}

function FormattedDescription({ description }: { description: string }) {
  const parsed = parseDescription(description);

  if (parsed.sessions.length === 0) {
    return (
      <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
        {description}
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Intro */}
      {parsed.intro && (
        <div className="text-gray-700 text-sm leading-relaxed p-4 sm:p-5 rounded-2xl bg-gray-50/70 border-l-4 border-[#7B2332] font-medium shadow-sm">
          {parsed.intro}
        </div>
      )}

      {/* Sessions */}
      {parsed.sessions.map((session, idx) => (
        <div key={idx} className="space-y-4">
          {session.title && (
            <h4 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 mt-6 mb-2 pb-2 border-b border-gray-100">
              <span className="w-2.5 h-4 bg-[#7B2332] rounded-sm"></span>
              {session.title}
            </h4>
          )}

          {/* Fields */}
          <div className="space-y-4">
            {/* Group metadata fields like "일정"/"일시", "대상", "장소" */}
            {session.fields.some(f => !f.speakers && !f.bullets) && (
              <div className="bg-white border border-gray-150/70 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                {session.fields
                  .filter(f => !f.speakers && !f.bullets)
                  .map((field, fIdx) => {
                    const isTime = field.key.includes("일시") || field.key.includes("일정") || field.key.includes("시간");
                    const isTarget = field.key.includes("대상");
                    const isLocation = field.key.includes("장소") || field.key.includes("위치");
                    
                    return (
                      <div key={fIdx} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 text-sm border-b border-gray-50 last:border-0 pb-3 last:pb-0 font-medium">
                        <span className="w-20 font-black text-gray-400 flex items-center gap-1.5 flex-shrink-0">
                          {isTime && <Clock className="w-4 h-4 text-[#7B2332]/70" />}
                          {isTarget && <Users className="w-4 h-4 text-[#7B2332]/70" />}
                          {isLocation && <MapPin className="w-4 h-4 text-[#7B2332]/70" />}
                          {!isTime && !isTarget && !isLocation && <Calendar className="w-4 h-4 text-[#7B2332]/70" />}
                          {field.key}
                        </span>
                        <span className="text-gray-800 font-extrabold">{field.value}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Render Speakers (연사) */}
            {session.fields
              .filter(f => f.speakers)
              .map((field, fIdx) => (
                <div key={fIdx} className="space-y-3">
                  <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <User className="w-4 h-4 text-[#7B2332]" />
                    설명회 연사 라인업
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {field.speakers?.map((speaker, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-gradient-to-br from-white to-gray-50/30 rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-gray-300 transition-all duration-300"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {speaker.subject && (
                              <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#7B2332]/10 text-[#7B2332] rounded-full uppercase tracking-wider">
                                {speaker.subject}
                              </span>
                            )}
                            <span className="font-extrabold text-gray-900 text-base">{speaker.name}</span>
                          </div>
                          {speaker.desc && (
                            <p className="text-xs text-gray-500 leading-relaxed font-semibold whitespace-pre-line">
                              {speaker.desc}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {/* Render Contents (내용) */}
            {session.fields
              .filter(f => f.bullets)
              .map((field, fIdx) => (
                <div key={fIdx} className="space-y-3 bg-white border border-gray-150/70 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    설명회 주요 핵심 내용
                  </h5>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pl-1 pt-1">
                    {field.bullets?.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700 leading-relaxed font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] mt-2 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
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
        <div className="space-y-8" data-testid="briefing-list">
          {briefings.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
              data-testid={`card-briefing-${b.id}`}
            >
              {/* Header Container */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-150/70">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#7B2332]/5 text-[#7B2332] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-[#7B2332]/10">
                    <CalendarDays className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug" data-testid={`text-briefing-title-${b.id}`}>
                      {b.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 font-semibold">
                      <span className="flex items-center gap-1">📅 {b.date}</span>
                      {b.time && <span className="flex items-center gap-1">⏰ {b.time}</span>}
                    </div>
                  </div>
                </div>
                
                {b.form_url && (
                  <a
                    href={b.form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#7B2332] text-white text-sm font-extrabold hover:bg-[#6B1D2A] rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
                    data-testid={`link-briefing-form-${b.id}`}
                  >
                    설명회 신청하기
                  </a>
                )}
              </div>

              {/* Description Body */}
              <div className="pt-6">
                <FormattedDescription description={b.description} />
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
