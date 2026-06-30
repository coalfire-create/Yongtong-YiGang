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

interface StructuredContent {
  title?: string;
  items: string[];
}

interface ParsedField {
  key: string;
  value: string;
  speakers?: ParsedSpeaker[];
  bullets?: string[];
  structured?: StructuredContent[];
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

  // New parser logic that handles [도입부], [일시], [대상], [연사], [주제], [혜택], [장소]
  // And still falls back gracefully for old format (▣ / ▶)
  
  if (!descText.includes('[') && !descText.includes('▣') && !descText.includes('▶')) {
    result.intro = descText;
    return result;
  }

  let currentCategory = "intro";
  let parsedFields: Record<string, string> = { intro: "", target: "", speaker: "", content: "", benefit: "", location: "" };
  let lines = descText.split('\n');
  
  // If it uses the new bracket format
  if (descText.includes('[도입부]') || descText.includes('[일시]')) {
    for (const line of lines) {
      const match = line.match(/^\[(.*?)\](.*)$/);
      if (match) {
        const cat = match[1].trim();
        const inlineVal = match[2].trim();
        if (cat.includes("도입부")) currentCategory = "intro";
        else if (cat.includes("대상")) currentCategory = "target";
        else if (cat.includes("연사")) currentCategory = "speaker";
        else if (cat.includes("주제") || cat.includes("내용")) currentCategory = "content";
        else if (cat.includes("혜택")) currentCategory = "benefit";
        else if (cat.includes("장소") || cat.includes("위치")) currentCategory = "location";
        else currentCategory = "intro";
        
        if (inlineVal) {
          parsedFields[currentCategory] += (parsedFields[currentCategory] ? "\n" : "") + inlineVal;
        }
      } else if (currentCategory && currentCategory in parsedFields) {
        parsedFields[currentCategory] += (parsedFields[currentCategory] ? "\n" : "") + line;
      }
    }

    result.intro = parsedFields.intro.trim();
    const sessionFields: ParsedField[] = [];
    
    if (parsedFields.target) sessionFields.push({ key: "대상", value: parsedFields.target.trim() });
    if (parsedFields.location) sessionFields.push({ key: "장소", value: parsedFields.location.trim() });
    
    if (parsedFields.speaker) {
      const speakerList: ParsedSpeaker[] = [];
      const sLines = parsedFields.speaker.trim().split('\n');
      let currentSpeaker: ParsedSpeaker | null = null;
      for (const line of sLines) {
        if (!line.trim()) continue;
        if (!line.trim().startsWith('-') && !line.trim().startsWith('•') && !line.trim().startsWith('○')) {
          if (currentSpeaker) speakerList.push(currentSpeaker);
          let sName = line.replace(/^[\_\♧\♣\■\▣\▶\s]+/, '').trim();
          let sSubject = "";
          const parenMatch = sName.match(/\((.*?)\)/);
          if (parenMatch) {
            sSubject = parenMatch[1].trim();
            sName = sName.replace(parenMatch[0], "").trim();
          }
          currentSpeaker = { name: sName, subject: sSubject, desc: "" };
        } else if (currentSpeaker) {
          currentSpeaker.desc += (currentSpeaker.desc ? "\n" : "") + line.trim();
        }
      }
      if (currentSpeaker) speakerList.push(currentSpeaker);
      sessionFields.push({ key: "연사", value: parsedFields.speaker.trim(), speakers: speakerList });
    }

    if (parsedFields.content) {
      const bulletLines = parsedFields.content.trim().split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      sessionFields.push({ key: "주제 및 내용", value: parsedFields.content.trim(), bullets: bulletLines });
    }

    if (parsedFields.benefit) sessionFields.push({ key: "참석자 혜택", value: parsedFields.benefit.trim() });

    if (sessionFields.length > 0) {
      result.sessions.push({ title: "", fields: sessionFields });
    }
    return result;
  }

  // Fallback for old format (▣ / ▶)
  let introPart = "";
  let sessionParts = descText.split(/▣|■/).filter(s => s.trim() !== "");
  if (sessionParts.length > 0 && !/^\s*(?:▣|■)/.test(descText) && !descText.startsWith('▶')) {
    introPart = sessionParts[0].trim();
    sessionParts = sessionParts.slice(1);
  }
  if (sessionParts.length === 0 && descText.includes('▶')) {
    sessionParts = [descText];
    introPart = "";
  }
  result.intro = introPart;

  for (const sessionRaw of sessionParts) {
    let title = "";
    let content = sessionRaw;
    const arrowIdx = content.indexOf("▶");
    if (arrowIdx !== -1) {
      title = content.substring(0, arrowIdx).trim();
      content = content.substring(arrowIdx);
    } else {
      title = content.trim();
      content = "";
    }

    const fields: ParsedField[] = [];
    const rawFields = content.split("▶").map(f => f.trim()).filter(Boolean);
    for (const rawField of rawFields) {
      const colonIdx = rawField.indexOf(":");
      let key = "내용";
      let val = rawField;
      if (colonIdx !== -1 && colonIdx < 20) {
        key = rawField.substring(0, colonIdx).trim();
        val = rawField.substring(colonIdx + 1).trim();
      }
      if (key.includes("연사")) {
        const speakerList: ParsedSpeaker[] = [];
        const lines = val.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          let sName = line.trim();
          let sSubject = "";
          let sDesc = "";
          const sDashIdx = sName.indexOf("-");
          if (sDashIdx !== -1) {
            sDesc = sName.substring(sDashIdx + 1).trim();
            sName = sName.substring(0, sDashIdx).trim();
          }
          const parenMatch = sName.match(/\((.*?)\)/);
          if (parenMatch) {
            sSubject = parenMatch[1].trim();
            sName = sName.replace(parenMatch[0], "").trim();
          }
          speakerList.push({ name: sName, subject: sSubject, desc: sDesc });
        }
        fields.push({ key, value: val, speakers: speakerList });
      } else if (key.includes("내용") || key.includes("주제")) {
        const structured: StructuredContent[] = [];
        let currentGroup: StructuredContent = { title: "", items: [] };
        
        const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          // If line starts with a number like "1.", "2)", "1 ", it's a main point
          const isMainPoint = /^\d+[\.\)\]]?\s/.test(line) || /^▶/.test(line) || /^▣/.test(line);
          if (isMainPoint) {
            if (currentGroup.title || currentGroup.items.length > 0) {
              structured.push({ ...currentGroup });
            }
            currentGroup = { title: line.replace(/^\d+[\.\)\]]?\s*/, '').replace(/^[▶▣]\s*/, '').trim(), items: [] };
          } else {
            // It's a sub point
            currentGroup.items.push(line.replace(/^[○\-\•\*\s]+/, '').trim());
          }
        }
        if (currentGroup.title || currentGroup.items.length > 0) {
          structured.push(currentGroup);
        }
        fields.push({ key, value: val, structured });
      } else {
        fields.push({ key, value: val });
      }
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
            {session.fields.some(f => !f.speakers && !f.bullets && !f.key.includes("혜택")) && (
              <div className="bg-white border border-gray-150/70 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                {session.fields
                  .filter(f => !f.speakers && !f.bullets && !f.key.includes("혜택"))
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
                    {field.speakers?.map((speaker, sIdx) => {
                      let roleBadge = null;
                      const cleanName = speaker.name.trim();
                      if (cleanName.includes("한노아")) {
                        roleBadge = "소장님";
                      } else if (
                        cleanName.includes("텐타클") ||
                        cleanName.includes("펜타클") ||
                        cleanName.includes("펜타켈") ||
                        cleanName.includes("최승해")
                      ) {
                        roleBadge = "소장님";
                      } else if (cleanName.includes("정승준")) {
                        roleBadge = "영통이강원장/수학";
                      }

                      return (
                        <div
                          key={sIdx}
                          className="bg-gradient-to-br from-white to-gray-50/30 rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-gray-300 transition-all duration-300"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {speaker.subject && (
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#7B2332]/10 text-[#7B2332] rounded-full uppercase tracking-wider">
                                  {speaker.subject}
                                </span>
                              )}
                              <span className="font-extrabold text-gray-900 text-base">{speaker.name}</span>
                              {roleBadge && (
                                <span className="px-2.5 py-0.5 text-[10px] font-black bg-[#7B2332]/10 text-[#7B2332] rounded-full uppercase tracking-wider">
                                  {roleBadge}
                                </span>
                              )}
                            </div>
                            {speaker.desc && (
                              <p className="text-xs text-gray-500 leading-relaxed font-semibold whitespace-pre-line">
                                {speaker.desc}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* Render Contents (주제 및 내용) */}
            {session.fields
              .filter(f => f.bullets)
              .map((field, fIdx) => (
                <div key={fIdx} className="space-y-3 bg-white border border-gray-150/70 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    설명회 주제 및 주요 내용
                  </h5>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pl-1 pt-1">
                    {field.bullets?.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700 leading-relaxed font-semibold whitespace-pre-line">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] mt-2 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {/* Render Benefits (참석자 혜택) */}
            {session.fields
              .filter(f => f.key.includes("혜택"))
              .map((field, fIdx) => (
                <div key={`benefit-${fIdx}`} className="bg-red-50/50 border border-red-100 rounded-2xl p-5 sm:p-6 shadow-sm mt-4">
                  <h5 className="text-sm font-black text-[#7B2332] flex items-center gap-2 mb-2">
                    🎁 참석자 특별 혜택
                  </h5>
                  <p className="text-sm text-gray-800 font-extrabold">{field.value}</p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function parseBriefingDate(dateStr: string, timeStr?: string): Date {
  try {
    const cleanDate = dateStr.trim();
    // YYYY년 MM월 DD일
    const matchFull = cleanDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (matchFull) {
      const year = parseInt(matchFull[1], 10);
      const month = parseInt(matchFull[2], 10) - 1;
      const day = parseInt(matchFull[3], 10);
      
      let hour = 0;
      let minute = 0;
      if (timeStr) {
        const timeMatch = timeStr.trim().match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          minute = parseInt(timeMatch[2], 10);
        }
      }
      return new Date(year, month, day, hour, minute);
    }
    
    // MM월 DD일 (assume current year)
    const matchPartial = cleanDate.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (matchPartial) {
      const year = new Date().getFullYear();
      const month = parseInt(matchPartial[1], 10) - 1;
      const day = parseInt(matchPartial[2], 10);
      
      let hour = 0;
      let minute = 0;
      if (timeStr) {
        const timeMatch = timeStr.trim().match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          minute = parseInt(timeMatch[2], 10);
        }
      }
      return new Date(year, month, day, hour, minute);
    }

    const parsed = Date.parse(cleanDate);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
  } catch (e) {
    console.error("Failed to parse briefing date:", dateStr, e);
  }
  return new Date(0);
}

export function Briefing() {
  const { data: briefings = [], isLoading } = useQuery<BriefingAnnouncement[]>({
    queryKey: ["/api/briefings/active"],
  });

  const now = new Date();
  const sortedBriefings = [...briefings].sort((a, b) => {
    const dateA = parseBriefingDate(a.date, a.time);
    const dateB = parseBriefingDate(b.date, b.time);
    const isFutureA = dateA.getTime() >= now.getTime();
    const isFutureB = dateB.getTime() >= now.getTime();

    if (isFutureA && !isFutureB) return -1;
    if (!isFutureA && isFutureB) return 1;

    if (isFutureA && isFutureB) {
      return dateA.getTime() - dateB.getTime(); // Soonest first
    } else {
      return dateB.getTime() - dateA.getTime(); // Most recent past first
    }
  });

  return (
    <BriefingLayout>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : sortedBriefings.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">현재 예정된 설명회가 없습니다.</p>
          <p className="text-gray-400 text-sm mt-1">새로운 설명회 일정이 등록되면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-8" data-testid="briefing-list">
          {sortedBriefings.map((b) => (
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
