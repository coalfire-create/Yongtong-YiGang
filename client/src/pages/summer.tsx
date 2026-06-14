import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SectionPage } from "@/components/layout";
import { Loader2, User, Target, BookOpen, Clock, Users, GraduationCap, Phone, MessageSquare, CheckCircle2, Calendar, Bell, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

interface SummerImage {
  id: number;
  image_url: string;
  teacher_id: number | null;
  teacher_name: string | null;
  division?: string;
  category?: string;
}

interface TimetableSlot {
  id: number;
  division: string;
  timetable_title: string;
  slot_label: string;
  slot_time: string;
  mon: string;
  tue: string;
  wed: string;
  thu: string;
  fri: string;
  sat: string;
  sun: string;
  is_merged: boolean;
  merged_content: string;
  display_order: number;
}

function TimetableGrid({ title, slots }: { title: string; slots: TimetableSlot[] }) {
  if (slots.length === 0) return null;
  const hasSat = slots.some(s => s.sat);
  const hasSun = slots.some(s => s.sun);
  const days = [
    { key: "mon", label: "월" },
    { key: "tue", label: "화" },
    { key: "wed", label: "수" },
    { key: "thu", label: "목" },
    { key: "fri", label: "금" },
    ...(hasSat ? [{ key: "sat", label: "토" }] : []),
    ...(hasSun ? [{ key: "sun", label: "일" }] : []),
  ] as { key: keyof TimetableSlot; label: string }[];

  return (
    <div className="mb-8">
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full text-xs border-collapse" style={{ minWidth: hasSun ? 700 : hasSat ? 620 : 520 }}>
          <thead>
            <tr>
              <th className="bg-[#7B2332] text-white p-2.5 text-center font-bold whitespace-nowrap px-4 border-r border-red-800/30" colSpan={2}>
                {title}
              </th>
              {days.map(d => (
                <th key={d.key} className="bg-[#7B2332] text-white p-2.5 text-center font-bold border-l border-red-800/30">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => (
              <tr key={slot.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                <td className="bg-slate-100/80 border-r border-gray-200 p-2.5 align-middle text-center font-extrabold text-gray-700 whitespace-nowrap">
                  {slot.slot_label}
                </td>
                <td className="bg-slate-50/80 border-r border-gray-200 p-2 align-middle text-center text-[10px] text-gray-400 whitespace-nowrap">
                  {slot.slot_time}
                </td>
                {slot.is_merged ? (
                  <td colSpan={days.length} className="p-3 text-center text-gray-600 font-semibold border-t border-gray-100 break-keep break-words">
                    {slot.merged_content}
                  </td>
                ) : (
                  days.map(d => {
                    const val = slot[d.key] as string;
                    return (
                      <td key={d.key} className="p-2 text-center align-middle border-l border-gray-100 border-t border-gray-100 whitespace-pre-line leading-relaxed text-gray-700 break-keep break-words">
                        {val || ""}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, any> = {
  Target,
  BookOpen,
  CheckCircle2,
  Users,
  GraduationCap,
  Clock,
};

interface ParsedClass {
  className: string;
  teachers: string;
  subjects: string;
  time: string;
  questions: string;
}

interface ParsedSchedule {
  round: string;
  period: string;
}

interface ParsedNotice {
  classes: ParsedClass[];
  schedules: ParsedSchedule[];
  otherText: string;
  isParsed: boolean;
}

function parseSummerNotice(content: string): ParsedNotice {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const classes: ParsedClass[] = [];
  const schedules: ParsedSchedule[] = [];
  let currentClass: Partial<ParsedClass> | null = null;
  let inSchedule = false;
  let otherTextLines: string[] = [];
  let hasParsedSomething = false;

  for (const line of lines) {
    const classMatch = line.match(/^(?:\d+\.\s*)?([A-Za-z0-9가-힣]+반)(?:\(([^)]+)\))?/);
    if (classMatch) {
      if (currentClass && currentClass.className) {
        classes.push(currentClass as ParsedClass);
      }
      currentClass = {
        className: classMatch[1],
        teachers: classMatch[2] || '',
        subjects: '',
        time: '',
        questions: ''
      };
      inSchedule = false;
      hasParsedSomething = true;
      continue;
    }

    if (line.includes('시험일정') || line.includes('시험 일정') || line === '일정') {
      if (currentClass && currentClass.className) {
        classes.push(currentClass as ParsedClass);
        currentClass = null;
      }
      inSchedule = true;
      hasParsedSomething = true;
      continue;
    }

    if (currentClass) {
      if (line.includes('시험과목') || line.includes('과목')) {
        currentClass.subjects = line.split(/[:：]/)[1]?.trim() || '';
      } else if (line.includes('시험시간') || line.includes('시간')) {
        currentClass.time = line.split(/[:：]/)[1]?.trim() || '';
      } else if (line.includes('문항')) {
        currentClass.questions = line.split(/[:：]/)[1]?.trim() || '';
      } else {
        if (currentClass.subjects) {
          currentClass.subjects += ' ' + line;
        } else {
          currentClass.subjects = line;
        }
      }
      continue;
    }

    if (inSchedule) {
      const scheduleMatch = line.match(/^([^\s:：]+)\s*[:：]\s*(.+)$/);
      if (scheduleMatch) {
        schedules.push({
          round: scheduleMatch[1].trim(),
          period: scheduleMatch[2].trim()
        });
      } else {
        schedules.push({
          round: '일정',
          period: line
        });
      }
      continue;
    }

    otherTextLines.push(line);
  }

  if (currentClass && currentClass.className) {
    classes.push(currentClass as ParsedClass);
  }

  return {
    classes,
    schedules,
    otherText: otherTextLines.join('\n'),
    isParsed: hasParsedSomething && (classes.length > 0 || schedules.length > 0)
  };
}

function ParsedNoticeCard({ title, content, date }: { title: string; content: string; date: string }) {
  const parsed = parseSummerNotice(content);
  
  if (!parsed.isParsed) {
    return (
      <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <span className="px-2.5 py-1 rounded-md bg-[#7B2332]/10 text-[#7B2332] text-xs font-bold">공지</span>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <span className="text-xs text-gray-400 ml-auto">{date}</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#7B2332]/10 text-[#7B2332] text-xs font-bold">입반TEST 안내</span>
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
        </div>
        <span className="text-xs font-semibold text-gray-400 sm:ml-auto">{date}</span>
      </div>

      {parsed.classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parsed.classes.map((cls, idx) => {
            const isSClass = cls.className.includes("S") || cls.className.toLowerCase().includes("s");
            const colorClass = isSClass 
              ? { bg: "bg-red-50/75", border: "border-red-100/80", title: "text-[#7B2332]", badge: "bg-[#7B2332]" }
              : { bg: "bg-blue-50/75", border: "border-blue-100/80", title: "text-blue-700", badge: "bg-blue-600" };
            
            return (
              <div 
                key={idx} 
                className={`p-6 rounded-2xl border ${colorClass.border} ${colorClass.bg} space-y-4`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-white text-[11px] font-bold rounded break-keep break-words ${colorClass.badge}`}>
                      {cls.className}
                    </span>
                    {cls.teachers && (
                      <span className="text-xs text-gray-500 font-bold">({cls.teachers})</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {cls.subjects && (
                    <div className="flex items-start gap-2.5">
                      <BookOpen className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-gray-400">시험과목</p>
                        <p className="text-sm font-bold text-gray-800">{cls.subjects}</p>
                      </div>
                    </div>
                  )}

                  {cls.time && (
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-gray-400">시험시간</p>
                        <p className="text-sm font-bold text-gray-800">{cls.time}</p>
                      </div>
                    </div>
                  )}

                  {cls.questions && (
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-gray-400">시험 문항 수</p>
                        <p className="text-sm font-bold text-gray-800">{cls.questions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {parsed.schedules.length > 0 && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7B2332]" />
            시험 일정 안내
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parsed.schedules.map((sched, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
                <span className="px-2.5 py-1 rounded-lg bg-[#7B2332]/5 text-[#7B2332] text-xs font-extrabold whitespace-nowrap">
                  {sched.round}
                </span>
                <span className="text-sm font-bold text-gray-700">{sched.period}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsed.otherText && (
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 whitespace-pre-wrap">
          {parsed.otherText}
        </p>
      )}
    </div>
  );
}

function cleanParentheses(title: string): string {
  // 1. Strip the standard date/session pattern like (7/17(금) 개강, 5회) or (7/13 개강, 6회)
  title = title.replace(/\(\d{1,2}[\/\.]\d{1,2}(?:\([가-힣]\))?\s*개강(?:일)?(?:,\s*\d+회(?:차)?)?\)/gi, "");
  
  // 2. Strip single sessions pattern like (1회)
  title = title.replace(/\(\d+회(?:차)?\)/gi, "");

  return title.trim();
}

function formatSummerCurriculumTitle(rawTitle: string, content: string, division: string): string {
  let title = (rawTitle || "").normalize('NFC').replace(/\r/g, "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  content = content || "";

  // 1. Initial Cleaning: strip .xlsx
  if (title.toLowerCase().includes(".xlsx")) {
    title = title.split(/\.xlsx/i)[0].trim();
  }

  // 2. Strip parenthesized dates and sessions
  title = cleanParentheses(title);

  // 3. Determine Grade
  let grade = "고1";
  if (division === "고3") grade = "고3";
  else if (division === "고2") grade = "고2";
  else if (division === "고1") grade = "고1";
  else if (division === "중3" || division === "중등") grade = "중3";
  else {
    const tLower = title.toLowerCase();
    if (tLower.includes("고3")) grade = "고3";
    else if (tLower.includes("고2")) grade = "고2";
    else if (tLower.includes("고1")) grade = "고1";
    else if (tLower.includes("중3") || tLower.includes("중등") || tLower.includes("초중등")) grade = "중3";
  }

  // 4. Extract Teacher
  const teachersList = [
    "최주용", "정찬영", "황준우", "변현수", "박소현", "박지원",
    "권소영", "박병조", "임서원", "황해룡", "김현종", "김종인",
    "심규원", "유승진", "곽윤협", "장해든누리", "임희민", "김연우",
    "김유정", "대니얼", "문브라더스", "양준민", "정규영", "김홍석",
    "선화희"
  ];
  let teacher = "";
  for (const t of teachersList) {
    if (title.includes(t)) {
      teacher = t + "T";
      break;
    }
  }
  if (!teacher) {
    const m = title.match(/([가-힣]{2,4})T/);
    if (m) {
      teacher = m[0];
    } else {
      teacher = "강사T";
    }
  }

  // 5. Extract Subject
  const subjectsList = ["수학", "영어", "국어", "통과", "화학", "물리", "생명", "통합과학", "과학", "과탐", "탐구"];
  let subject = "";
  for (const s of subjectsList) {
    if (title.includes(s)) {
      subject = s;
      break;
    }
  }
  if (!subject) {
    if (title.includes("공수") || title.includes("미적") || title.includes("대수") || title.includes("기하") || title.includes("확통")) {
      subject = "수학";
    } else {
      subject = "기타";
    }
  }
  if (subject === "통합과학" || subject === "과학" || subject === "과탐" || subject === "탐구") {
    if (title.includes("물리")) subject = "물리";
    else if (title.includes("화학")) subject = "화학";
    else if (title.includes("생명")) subject = "생명";
    else if (title.includes("지학") || title.includes("지구과학")) subject = "지학";
    else subject = "과학";
  }
  if (subject === "통합과학") subject = "통과";

  // Override subject for Yoo Seung-jin
  if (teacher === "유승진T") {
    subject = "물리";
  }

  // 6. Extract Course
  let course = title;

  // Strip grade brackets/markers
  course = course.replace(/\[(?:고[1-3]|중3|중등|고등|초중등|초·중등|고1,2|고1,고2|고1,2\s*연합|고1,2\s*중심\s*연합|화성고1,2\s*중심\s*연합|중3\/고1|중3,고1)\]/g, "");
  // Strip grade words without brackets
  course = course.replace(/(?:\s|^)(?:고[1-3]|중3|중등|고등)(?:\s|$)/g, " ");

  // Strip standalone subject name right before the hyphen/teacher
  course = course.replace(/\s*(수학|영어|국어|통과|물리|화학|생명|지학|과학|과탐|탐구)\s*-\s*/gi, " - ");

  // Strip teacher name
  if (teacher) {
    const tBase = teacher.replace("T", "");
    course = course.replace(new RegExp(tBase + "T?"), "");
  }
  course = course.replace(/강사T?/g, "");

  // Strip other common extra subject/course words if they are standalone
  course = course.replace(/커리큘럼/g, "");
  course = course.replace(/강의계획서/g, "");

  // Clean brackets and hyphens
  course = course.replace(/[\[\]]/g, " ").replace(/-\s*/g, " ").replace(/\s+/g, " ").trim();

  // If the course starts or ends with "연합", clean it if it is redundant
  if (course.startsWith("연합") && course.endsWith("연합") && course !== "연합") {
    course = course.substring(2).trim();
  }

  // Clean redundant subject prefix from course name
  if (course && subject) {
    const cleanSubjectPrefixRegex = new RegExp(`^\\s*${subject}`, "i");
    course = course.replace(cleanSubjectPrefixRegex, "").trim();
  }

  // Fallback if course ends up empty or matches subject name
  if (!course || course.length <= 1 || course.toLowerCase() === subject.toLowerCase()) {
    course = "";
  }

  // 7. Sessions count
  let sessions = "";
  let sessionsSection = "";
  const sMatch = content.match(/\[회차별\s*내용\]([\s\S]*?)(?=\n\s*\[|$)/);
  if (sMatch) {
    sessionsSection = sMatch[1];
  }
  const sessionCount = (sessionsSection.match(/\d+회차/g) || []).length;
  if (sessionCount > 0) {
    sessions = sessionCount + "회";
  } else {
    let sm = rawTitle.match(/(\d+)\s*회/);
    if (sm) {
      sessions = sm[1] + "회";
    }
  }

  // 8. Start Date
  let startDate = "";
  let dayOfWeek = "";

  let dateTitleMatch = rawTitle.match(/(\d{1,2}\/\d{1,2}(?:\([가-힣]\))?)\s*개강/) || 
                       rawTitle.match(/(\d{1,2}\.\d{1,2}(?:\([가-힣]\))?)\s*개강/) ||
                       rawTitle.match(/(\d{1,2}월\s*\d{1,2}일(?:\([가-힣]\))?)\s*개강/);
  if (dateTitleMatch) {
    startDate = dateTitleMatch[1];
  }

  if (!startDate) {
    const schedMatch = content.match(/\[수업\s*일정\]([\s\S]*?)(?=\n\s*\[|$)/);
    if (schedMatch) {
      const scheduleText = schedMatch[1];
      let m = scheduleText.match(/(\d{1,2}\/\d{1,2}(?:\([가-힣]\))?)/) || 
              scheduleText.match(/(\d{1,2}\.\d{1,2}(?:\([가-힣]\))?)/) || 
              scheduleText.match(/(\d{1,2}월\s*\d{1,2}일(?:\([가-힣]\))?)/);
      if (m) {
        startDate = m[1];
      }
    }
  }

  if (!startDate) {
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      let m = line.match(/(?:개강일|개강)\s*(?:\/\s*회차|\([^)]*\))?\s*[:\-–—]\s*([^\n]+)/);
      if (m) {
        let dm = m[1].match(/(\d{1,2}\/\d{1,2}(?:\([가-힣]\))?)/) || 
                 m[1].match(/(\d{1,2}\.\d{1,2}(?:\([가-힣]\))?)/) || 
                 m[1].match(/(\d{1,2}월\s*\d{1,2}일(?:\([가-힣]\))?)/);
        if (dm) {
          startDate = dm[1];
        }
        break;
      }
    }
  }

  if (!startDate && sessionsSection) {
    let m = sessionsSection.match(/1회차[^\n•]*?(\d{1,2}\/\d{1,2}(?:\([가-힣]\))?|\d{1,2}\.\d{1,2}(?:\([가-힣]\))?|\d{1,2}월\s*\d{1,2}일(?:\([가-힣]\))?)/);
    if (m) {
      startDate = m[1];
    }
  }

  if (!startDate) {
    let dm = rawTitle.match(/(\d{1,2}\/\d{1,2}(?:\([가-힣]\))?)/) || 
             rawTitle.match(/(\d{1,2}\.\d{1,2}(?:\([가-힣]\))?)/) || 
             rawTitle.match(/(\d{1,2}월\s*\d{1,2}일(?:\([가-힣]\))?)/);
    if (dm) startDate = dm[0];
  }

  if (startDate) {
    const dayMatch = startDate.match(/\(([가-힣])\)/);
    if (dayMatch) {
      dayOfWeek = dayMatch[1];
      startDate = startDate.replace(/\([가-힣]\)/, "");
    }
  }

  if (startDate) {
    const dotDateMatch = startDate.match(/(\d{1,2})\s*\.\s*(\d{1,2})/);
    if (dotDateMatch) {
      startDate = `${dotDateMatch[1]}/${dotDateMatch[2]}`;
    }
    const korDateMatch = startDate.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (korDateMatch) {
      startDate = `${korDateMatch[1]}/${korDateMatch[2]}`;
    }
    startDate = startDate.trim();
  }

  if (startDate && !dayOfWeek) {
    const mMatch = startDate.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (mMatch) {
      const month = parseInt(mMatch[1], 10);
      const day = parseInt(mMatch[2], 10);
      const date = new Date(2026, month - 1, day);
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      dayOfWeek = days[date.getDay()];
    }
  }

  let infoParts = [];
  if (startDate) {
    const dateStr = dayOfWeek ? `${startDate}(${dayOfWeek})` : startDate;
    infoParts.push(dateStr + " 개강");
  }
  if (sessions) {
    infoParts.push(sessions);
  }

  let infoString = infoParts.length > 0 ? ` (${infoParts.join(", ")})` : "";
  
  // Construct final title
  const courseStr = course ? ` ${course}` : "";
  return `[${grade}]${courseStr} ${subject} - ${teacher}${infoString}`;
}

export default function Summer() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"중등" | "고1" | "고2">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "중등" || tab === "고1" || tab === "고2") {
        return tab;
      }
    }
    return "중등";
  });
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [activeSubTab, setActiveSubTab] = useState<"info" | "notice">("info");
  const [curriculumSubjectFilter, setCurriculumSubjectFilter] = useState<string>("전체");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "중등" || tab === "고1" || tab === "고2") {
        setActiveTab(tab);
      }
    }
  }, [location]);

  useEffect(() => {
    setActiveSubTab("info");
  }, [activeTab]);

  const { data: images = [], isLoading } = useQuery<SummerImage[]>({
    queryKey: ["/api/summer-images"],
  });

  const { data: guidelines = [] } = useQuery<any[]>({
    queryKey: ["/api/summer-guidelines"],
  });

  const { data: highlights = [] } = useQuery<any[]>({
    queryKey: ["/api/summer-highlights"],
  });

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/summer-schedules"],
  });

  const { data: notices = [] } = useQuery<any[]>({
    queryKey: ["/api/summer-notices"],
  });

  const { data: timetableSlots = [] } = useQuery<TimetableSlot[]>({
    queryKey: ["/api/summer-timetable-slots", activeTab],
    queryFn: () => fetch(`/api/summer-timetable-slots?division=${encodeURIComponent(activeTab)}`).then(r => r.json()),
  });

  // Group slots by timetable_title
  const timetableGroups = timetableSlots.reduce((acc: Record<string, TimetableSlot[]>, slot) => {
    const key = slot.timetable_title || "시간표";
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  // Filter components by active division tab
  const filteredImages = images.filter((img) => {
    const div = img.division === "중3" ? "중등" : (img.division || "중등");
    return div === activeTab;
  });
  
  const filteredGuidelines = guidelines
    .filter((g) => {
      const div = g.division === "중3" ? "중등" : g.division;
      return div === activeTab;
    })
    .reduce((acc, curr) => {
      // Deduplicate by title
      const existing = acc.find((item: any) => item.title === curr.title);
      if (!existing || curr.id < existing.id) {
        if (existing) acc = acc.filter((item: any) => item.title !== curr.title);
        acc.push({...curr});
      }
      return acc;
    }, [])
    .map((curr: any) => {
      // Normalize to NFC to prevent NFD issues
      if (curr.title) curr.title = curr.title.normalize('NFC');
      if (curr.content) curr.content = curr.content.normalize('NFC');
      if (curr.division) curr.division = curr.division.normalize('NFC');

      // Format the content line breaks
      let c = curr.content || "";
      c = c.replace(/수업 후 ~22/g, "");

      let inSessionContent = false;
      let formattedLines = [];
      let sessionLines = [];

      const lines = c.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.match(/^\[.*\]$/)) {
          if (inSessionContent) {
            formattedLines.push(sessionLines.join('\n'));
            sessionLines = [];
            inSessionContent = false;
          }
          if (line === "[회차별 내용]") {
            inSessionContent = true;
            formattedLines.push(line);
            continue;
          }
        }

        if (inSessionContent) {
          // Remove dates
          let m = line.match(/^(\d+회차\s*-\s*)\d{1,2}\/\d{1,2}(?:\([가-힣]\))?\s*(.*)$/);
          if (m) line = m[1] + m[2];
          let m2 = line.match(/^(\d+회차\s*-\s*)\d{1,2}월\s*\d{1,2}일\s*(.*)$/);
          if (m2) line = m2[1] + m2[2];

          if (line.trim() !== "") {
            if (line.match(/^개강일/)) {
              continue;
            }
            if (line.match(/^\d+회차/)) {
              sessionLines.push(line.trim());
            } else {
              if (sessionLines.length > 0) {
                sessionLines[sessionLines.length - 1] += " " + line.trim();
              } else {
                sessionLines.push(line.trim());
              }
            }
          }
        } else {
          formattedLines.push(line);
        }
      }
      if (inSessionContent) {
        formattedLines.push(sessionLines.join('\n'));
      }
      const originalContent = curr.content || "";
      curr.content = formattedLines.join('\n');
      
      if ((curr.category || 'guideline') === 'curriculum') {
        curr.title = formatSummerCurriculumTitle(curr.title, originalContent, curr.division);
      } else {
        // Fix Yoo Seung-jin and title formatting for non-curriculums if needed
        let title = curr.title || "";
        title = title.replace(/TT/g, "T");
        title = title.replace(/유승진T\s*\[/g, "유승진T [");
        title = title.replace(/유승진\s*\[/g, "유승진T [");
        title = title.replace(/유승진(\s*)\(/g, "유승진T$1(");
        title = title.replace(/역학특강-\s*유승진/g, "역학특강 - 유승진T");
        title = title.replace(/김종인\s*\[/g, "김종인T [");
        curr.title = title;
      }
      
      return curr;
    });

  const filteredHighlights = highlights.filter((h) => {
    const div = h.division === "중3" ? "중등" : h.division;
    return div === activeTab;
  });
  const filteredSchedules = schedules.filter((s) => {
    const div = s.division === "중3" ? "중등" : s.division;
    return div === activeTab;
  });
  const filteredNotices = notices.filter((n) => {
    const div = n.division === "중3" ? "중등" : n.division;
    return div === activeTab && n.is_active;
  });

  const getSubject = (s: string) => {
    if (s.includes("수학") || s.includes("공수") || s.includes("미적") || s.includes("확통") || s.includes("대수")) return "수학";
    if (s.includes("국어")) return "국어";
    if (s.includes("물리") || s.includes("화학") || s.includes("생명") || s.includes("지학") || s.includes("통과") || s.includes("과학") || s.includes("탐구")) return "탐구";
    if (s.includes("영어")) return "영어";
    return "기타";
  };

  const getSchoolGroupScore = (title: string) => {
    // 특강은 항상 맨 마지막 (학교명이 포함되어 있어도)
    if (title.includes("특강") || title.includes("올데이")) return 10;
    // 연합 계열은 그룹1 (내부 레벨은 getLevelScore로 세분화)
    if (title.includes("의치서") || title.includes("연합")) return 1;
    // 학교별 그룹 개별화
    if (title.includes("화성")) return 2;
    if (title.includes("가온")) return 3;
    if (title.includes("병점")) return 4;
    if (title.includes("영덕")) return 5;
    if (title.includes("수원")) return 6;
    if (title.includes("청명")) return 7;
    if (title.includes("고색")) return 8;
    if (title.includes("동탄국제")) return 9;
    // 기타 (학교 표기 없는 반)
    return 9.5;
  };

  const getLevelScore = (title: string) => {
    const s = title.toUpperCase();
    // 연합 그룹 내 레벨 순서
    // 1: 의치서
    if (s.includes("의치서")) return 1;
    // 2: S1
    if (s.match(/\bS1\b|S1반|[연합\s]S1/)) return 2;
    // 3: S2
    if (s.match(/\bS2\b|S2반|[연합\s]S2/)) return 3;
    // 4: S반 / S등급 / 연합S (S로 끝나거나 S반)
    if (s.match(/S반|S등급|연합\s*S(?!\d)|\[연합\s*S(?!\d)|\sS(?!\d)\]|\sS(?!\d)\s|\sS(?!\d)$|연합S$/)) return 4;
    // 5: A1 (또는 숫자 없는 연합A = A1 취급)
    if (s.match(/\bA1\b|A1반|\[연합\s*A(?![\d])|연합\s*A(?!\d)(?:\]|\s|$)/)) return 5;
    // 6: A2
    if (s.match(/\bA2\b|A2반/)) return 6;
    // 7: 레벨 표시 없는 연합반
    return 7;
  };

  const sortCurriculum = <T extends any>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const rawTitleA = (a as any).title || (a as any).teacher_name || "";
      const rawTitleB = (b as any).title || (b as any).teacher_name || "";

      // 과목 분류는 제목만 기준으로 (본문에 '수학특강' 등 다른 과목 단어가 섞여 오분류되는 것 방지)
      const subjA = getSubject(rawTitleA);
      const subjB = getSubject(rawTitleB);

      const order = ["수학", "국어", "영어", "탐구", "기타"];
      const orderA = order.indexOf(subjA);
      const orderB = order.indexOf(subjB);

      if (orderA !== orderB) return orderA - orderB;

      // 탐구 과목인 경우 세부 과목(통과 -> 물리 -> 화학 -> 생명) 순서로 1차 정렬
      if (subjA === "탐구" && subjB === "탐구") {
        const getScienceScore = (title: string) => {
          const s = title.toUpperCase();
          if (s.includes("통합과학") || s.includes("통과")) return 1;
          if (s.includes("물리")) return 2;
          if (s.includes("화학")) return 3;
          if (s.includes("생명")) return 4;
          if (s.includes("지학") || s.includes("지구과학")) return 5;
          return 6;
        };
        const sciA = getScienceScore(rawTitleA);
        const sciB = getScienceScore(rawTitleB);
        if (sciA !== sciB) return sciA - sciB;
      }

      const groupA = getSchoolGroupScore(rawTitleA);
      const groupB = getSchoolGroupScore(rawTitleB);
      if (groupA !== groupB) return groupA - groupB;

      // 동일 학교/특강 내에서 수학 과목이면 강사(최주용->황해룡->권소영->정찬영->임서원) 정렬 추가
      if (subjA === "수학" && subjB === "수학") {
        // 만약 둘 다 특강(groupScore === 10)인 경우 특강 세부 분류로 먼저 묶어준다.
        if (groupA === 10 && groupB === 10) {
          const getSpecialLectureSubGroupScore = (title: string) => {
            const t = title.toUpperCase();
            if (t.includes("대수")) return 1;
            if (t.includes("화성")) return 2;
            if (t.includes("가온")) return 3;
            if (t.includes("병점")) return 4;
            if (t.includes("영덕")) return 5;
            if (t.includes("수원")) return 6;
            if (t.includes("청명")) return 7;
            if (t.includes("고색")) return 8;
            if (t.includes("동탄국제")) return 9;
            return 10;
          };
          const specA = getSpecialLectureSubGroupScore(rawTitleA);
          const specB = getSpecialLectureSubGroupScore(rawTitleB);
          if (specA !== specB) return specA - specB;
        }

        const getMathTeacherScore = (title: string) => {
          if (title.includes("최주용")) return 1;
          if (title.includes("황해룡")) return 2;
          if (title.includes("권소영")) return 3;
          if (title.includes("정찬영")) return 4;
          if (title.includes("임서원")) return 5;
          return 6;
        };
        const teacherA = getMathTeacherScore(rawTitleA);
        const teacherB = getMathTeacherScore(rawTitleB);
        if (teacherA !== teacherB) return teacherA - teacherB;
      }

      const levelA = getLevelScore(rawTitleA);
      const levelB = getLevelScore(rawTitleB);
      if (levelA !== levelB) return levelA - levelB;

      return ((a as any).display_order || 0) - ((b as any).display_order || 0);
    });
  };

  // Divide guidelines by category
  const overviewGuidelines = filteredGuidelines.filter((g: any) => (g.category || 'guideline') === 'overview');
  const timetableGuidelines = filteredGuidelines.filter((g: any) => (g.category || 'guideline') === 'timetable');
  const curriculumGuidelines = sortCurriculum(filteredGuidelines.filter((g: any) => {
    if ((g.category || 'guideline') !== 'curriculum') return false;
    if (curriculumSubjectFilter !== "전체") {
      const title = ((g as any).title || (g as any).teacher_name || "");
      if (curriculumSubjectFilter === "수학특강") {
        const isMath = getSubject(title) === "수학";
        if (!(isMath && (title.includes("올데이") || title.includes("특강")))) return false;
      } else {
        const subj = getSubject(title);
        if (subj !== curriculumSubjectFilter) return false;
      }
    }
    return true;
  }));
  const guidelineGuidelines = filteredGuidelines.filter((g: any) => (g.category || 'guideline') === 'guideline');

  // Divide images by category
  const overviewImages = filteredImages.filter(img => (img.category || 'curriculum') === 'overview');
  const timetableImages = filteredImages.filter(img => (img.category || 'curriculum') === 'timetable');
  const curriculumImages = sortCurriculum(filteredImages.filter(img => {
    if ((img.category || 'curriculum') !== 'curriculum') return false;
    if (curriculumSubjectFilter !== "전체") {
      const title = ((img as any).title || img.teacher_name || "");
      if (curriculumSubjectFilter === "수학특강") {
        const isMath = getSubject(title) === "수학";
        if (!(isMath && (title.includes("올데이") || title.includes("특강")))) return false;
      } else {
        const subj = getSubject(title);
        if (subj !== curriculumSubjectFilter) return false;
      }
    }
    return true;
  }));
  const guidelineImages = filteredImages.filter(img => (img.category || 'curriculum') === 'guideline');

  const renderImageGroup = (imgList: SummerImage[]) => {
    if (imgList.length === 0) return null;
    
    const groupedByTeacher = imgList.reduce((acc: Record<string, SummerImage[]>, img) => {
      const key = img.teacher_name || "공통";
      if (!acc[key]) acc[key] = [];
      acc[key].push(img);
      return acc;
    }, {});

    const sortedNames = Object.keys(groupedByTeacher).sort((a, b) => {
      if (a === "공통") return -1;
      if (b === "공통") return 1;
      return 0;
    });

    return (
      <div className="space-y-8">
        {sortedNames.map((name) => (
          <div key={name} className="space-y-2">
            {(sortedNames.length > 1 || name !== "공통") && (
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${name === "공통" ? "bg-gray-100" : "bg-[#7B2332]/10"}`}>
                  <User className={`w-3.5 h-3.5 ${name === "공통" ? "text-gray-400" : "text-[#7B2332]"}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">{name}</h3>
              </div>
            )}
            
            <div className="flex flex-col gap-6">
              {groupedByTeacher[name].map((img) => (
                <motion.div 
                  key={img.id} 
                  whileHover={{ scale: 1.005 }}
                  className="overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-white"
                >
                  <img
                    src={img.image_url}
                    alt={`${name} ${activeTab} 썸머스쿨`}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  interface TableSection {
    category: string;
    items: {
      subCategory: string;
      content: string;
    }[];
  }

  const parseToTable = (content: string): { sections: TableSection[], startDateInfo: string } => {
    const preprocessed = content
      .replace(/\s+•\s*/g, '\n• ')
      .replace(/\[([^\]\n]*?)\r?\n([^\]\n]*?)\]/g, '[$1 $2]');
    const lines = preprocessed.split("\n").map(l => l.replace(/^ +| +$/g, '')).filter(l => l.trim() !== "");
    const sections: TableSection[] = [];
    let currentSection: TableSection | null = null;
    let startDateInfo = "";
    
    const standardCategories = [
      "수업 일정", "수업일정", 
      "강좌 특징", "강좌특징", 
      "교재/제공자료", "교재/제공 자료", "교재/자료", "교재 / 제공자료", "교재",
      "과제/TEST", "과제/테스트", "과제 / TEST", "과제",
      "관리 SYSTEM 및 CLINIC", "관리 SYSTEM", "관리 시스템", "관리시스템", "관리 SYSTEM 및 클리닉", "관리SYSTEM", "관리",
      "클리닉",
      "회차별 내용", "회차별내용", 
      "연계 강좌", "연계강좌"
    ];

    for (const line of lines) {
      let categoryName = "";
      let catMatch = line.trim().match(/^[\[【]([^\]】]+)[\]】]$/);
      let inlineContent = "";
      
      const startMatch = line.match(/^(?:-|•)?\s*개강일\s*\/?\s*회차\s*[:\-–—]\s*(.*)$/);
      if (startMatch) {
        startDateInfo = startMatch[1].trim();
        continue;
      }
      
      if (line.match(/^(?:-|•)?\s*\d+회차\s*[:\-]/) && (!currentSection || currentSection.category !== "회차별 내용")) {
         currentSection = { category: "회차별 내용", items: [] };
         sections.push(currentSection);
      }

      if (catMatch) {
        categoryName = catMatch[1].trim();
      } else {
        const sortedCats = [...standardCategories].sort((a, b) => b.length - a.length);
        for (const cat of sortedCats) {
          const catRegexStr = cat.split('').map(char => char === ' ' ? '\\s*' : char.replace(/[\/]/g, '\\/')).join('');
          const regex = new RegExp(`^(${catRegexStr})(?:\\s*[:\\-]+\\s*|\\t+|\\s+|$)(.*)$`, 'i');
          const match = line.trim().match(regex);
          if (match) {
            categoryName = cat;
            catMatch = [line, cat] as any;
            inlineContent = match[2].trim();
            break;
          }
        }
      }

      if (catMatch) {
        if (categoryName.replace(/\s+/g, '') === "수업일정") categoryName = "수업 일정";
        if (categoryName.replace(/\s+/g, '') === "강좌특징") categoryName = "강좌 특징";
        if (categoryName.replace(/\s+/g, '').includes("교재")) categoryName = "교재/제공자료";
        if (categoryName.replace(/\s+/g, '').includes("과제")) categoryName = "과제/TEST";
        if (categoryName.replace(/\s+/g, '').includes("관리")) categoryName = "관리 SYSTEM 및 CLINIC";
        if (categoryName.replace(/\s+/g, '') === "회차별내용") categoryName = "회차별 내용";
        if (categoryName.replace(/\s+/g, '').includes("연계강좌")) categoryName = "연계 강좌";

        currentSection = { category: categoryName, items: [] };
        sections.push(currentSection);

        if (inlineContent) {
          currentSection.items.push({ subCategory: "", content: inlineContent });
        }
      } else if (currentSection) {
        let cleanLine = line.replace(/^\t+/, '').trim();
        
        if (currentSection.category === "회차별 내용") {
          let m = cleanLine.match(/^(?:-|•)?\s*(\d+회차\s*[:\-]\s*)\d{1,2}\/\d{1,2}(?:\([가-힣]\))?\s*(.*)$/);
          if (m) cleanLine = m[1] + m[2];
          let m2 = cleanLine.match(/^(?:-|•)?\s*(\d+회차\s*[:\-]\s*)\d{1,2}월\s*\d{1,2}일\s*(.*)$/);
          if (m2) cleanLine = m2[1] + m2[2];
        }

        if (currentSection.items.length === 0) {
          currentSection.items.push({ subCategory: "", content: cleanLine });
        } else {
          const lastItem = currentSection.items[currentSection.items.length - 1];
          const isNewBullet = cleanLine.match(/^(?:-|•|\d+\.)/);
          const isNewSession = cleanLine.match(/^(?:-|•)?\s*\d+회차\s*[:\-]/);
          
          if (currentSection.category === "회차별 내용") {
            if (isNewSession) {
              lastItem.content += "\n" + cleanLine;
            } else {
              lastItem.content += " " + cleanLine;
            }
          } else if (currentSection.category.includes("관리 SYSTEM") || currentSection.category.includes("과제")) {
            if (isNewBullet && cleanLine.match(/^(?:-|•)/)) {
              lastItem.content += "\n" + cleanLine;
            } else {
              lastItem.content += " " + cleanLine;
            }
          } else {
            if (isNewBullet) {
              lastItem.content += "\n" + cleanLine;
            } else {
              lastItem.content += " " + cleanLine;
            }
          }
        }
      }
    }
    
    return { sections, startDateInfo };
  };

  const renderCurriculumGuidelines = (guidelineList: any[]) => {
    if (guidelineList.length === 0) return null;

    const order = ["수학", "국어", "영어", "탐구", "기타"];

    const grouped: Record<string, any[]> = {};
    order.forEach(subj => grouped[subj] = []);

    guidelineList.forEach(g => {
      const subj = getSubject(g.title || g.teacher_name || "");
      if (grouped[subj]) {
        grouped[subj].push(g);
      } else {
        if (!grouped["기타"]) grouped["기타"] = [];
        grouped["기타"].push(g);
      }
    });

    return (
      <div className="space-y-20">
        {order.map(subj => {
          const subjectsList = grouped[subj];
          if (!subjectsList || subjectsList.length === 0) return null;

          return (
            <div key={subj} className="space-y-8">
              <div className="flex items-center gap-3 border-b-2 border-gray-900 pb-3">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  {subj} <span className="text-[#7B2332] text-xl">과목 커리큘럼</span>
                </h2>
              </div>
              
              <div className="space-y-12">
                {subjectsList.map((g, gIdx) => {
                  const parsed = parseToTable(g.content || "");
                  const sections = parsed.sections.filter(sec => sec.category !== "수업 일정");
                  if (sections.length === 0) return null;

                  let displayTitle = g.title;

                  return (
                    <div key={g.id} className="mb-14">
                      <h3 className="text-[17px] font-bold text-gray-900 mb-3 whitespace-pre-line leading-snug">{displayTitle}</h3>

                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px] sm:text-sm text-center border-collapse border border-gray-300">
                          <thead className="bg-[#f8f9fa] border-b border-gray-300 text-[#333] font-bold">
                            <tr>
                              <th className="py-3 px-4 border border-gray-300 w-[25%] text-center">구분</th>
                              <th className="py-3 px-4 border border-gray-300 w-[75%] text-center">내용</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sections.map((section, sIdx) => {
                              const rowCount = Math.max(1, section.items.length);
                              return section.items.length > 0 ? (
                                section.items.map((item, iIdx) => {
                                  const isSubcatEmpty = !item.subCategory || item.subCategory === "-" || item.subCategory === " -";
                                  const isContentEmpty = !item.content || item.content === "-" || item.content === " -";

                                  let contentToRender: React.ReactNode = item.content;
                                  
                                  if (typeof contentToRender === 'string' && section.category === "회차별 내용") {
                                    // First replace bullets/stars with newlines
                                    let normalizedText = contentToRender
                                      .replace(/[•*]/g, '\n');
                                    
                                    // Also insert newlines before session numbers if they are on the same line without a newline
                                    // Avoid splitting combined sessions like "1,2회차" or "1/2회차"
                                    normalizedText = normalizedText.replace(/([^\n,/\d])\s*(\d+\s*회차)/g, '$1\n$2');
                                    normalizedText = normalizedText.replace(/([^\n,/\d])\s*(\d+,\d+\s*회차)/g, '$1\n$2');
                                    
                                    // Also insert newlines before headers
                                    normalizedText = normalizedText.replace(/([^\n])\s*(방학 기간 중|썸머 종강 후|연계 강좌)/g, '$1\n$2');

                                    const lines = normalizedText.split('\n');
                                    
                                    contentToRender = lines
                                      .map(line => line.trim())
                                      .filter(Boolean)
                                      .filter(line => !line.match(/개강일/))
                                      .map(line => {
                                        // Clean bullets
                                        let cleaned = line.replace(/^(?:-|•|\*)\s*/, '').trim();
                                        cleaned = cleaned.replace(/^[.\-:]\s*/, '').trim();
                                        
                                        // Normalize to "1회차: 내용"
                                        const sessionMatch = cleaned.match(/^(\d+,\d+\s*회차|\d+\s*회차)\s*[\-–—:：]?\s*(.*)$/);
                                        if (sessionMatch) {
                                          let desc = sessionMatch[2].trim();
                                          
                                          // Strip starting dates from desc, e.g. "7/10(금):", "(7월 8일):", "7월 8일"
                                          // Pattern 1: (7월 8일) or (7/10) with optional day of week and colon
                                          desc = desc.replace(/^\s*\(\s*\d{1,2}\s*[월\/]\s*\d{1,2}\s*일?\s*(?:\([가-힣]\))?\s*\)\s*[:\-：]?\s*/, "");
                                          
                                          // Pattern 2: 7/10(금) or 7월 8일 with optional day of week and colon
                                          desc = desc.replace(/^\s*\d{1,2}\s*[월\/]\s*\d{1,2}\s*일?\s*(?:\([가-힣]\))?\s*[:\-：]?\s*/, "");
                                          
                                          cleaned = `${sessionMatch[1]}: ${desc.trim()}`;
                                        }
                                        return cleaned;
                                      })
                                      .filter(Boolean)
                                      .join('\n');
                                  }

                                  if (typeof contentToRender === 'string' && section.category === "관리 SYSTEM 및 CLINIC") {
                                    const lines = contentToRender.split('\n').map(l => l.trim()).filter(Boolean);
                                    contentToRender = (
                                      <div className="bg-slate-50/80 border border-slate-200/50 rounded-xl p-4 space-y-2.5 text-left text-xs sm:text-sm shadow-sm">
                                        {lines.map((line, lIdx) => {
                                          let cleaned = line.replace(/^(?:-|•|\*)\s*/, '').trim();
                                          cleaned = cleaned.replace(/^[.\-:]\s*/, '').trim();
                                          
                                          const labelMatch = cleaned.match(/^([가-힣a-zA-Z\s]{2,10})\s*[:\-]\s*(.*)$/);
                                          if (labelMatch) {
                                            return (
                                              <div key={lIdx} className="flex flex-col sm:flex-row sm:items-start gap-1.5 border-b border-dashed border-slate-100 last:border-b-0 pb-2 last:pb-0">
                                                <span className="font-extrabold text-[#7B2332] whitespace-nowrap min-w-[70px] flex items-center gap-1.5">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] inline-block" />
                                                  {labelMatch[1]}
                                                </span>
                                                <span className="text-gray-600 font-medium leading-relaxed break-keep">{labelMatch[2]}</span>
                                              </div>
                                            );
                                          }
                                          
                                          return (
                                            <div key={lIdx} className="text-gray-600 font-medium leading-relaxed flex items-start gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] mt-2 flex-shrink-0" />
                                              <span className="break-keep">{cleaned}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  let alignmentClass = "text-left px-6";
                                  
                                  if (section.category === "수업 일정") {
                                    alignmentClass = "text-center";
                                  }

                                  return (
                                    <tr key={`${sIdx}-${iIdx}`} className="bg-white">
                                      {iIdx === 0 && (
                                        <td 
                                          rowSpan={rowCount} 
                                          className="py-3 px-4 border border-gray-300 font-bold text-gray-800 text-center align-middle whitespace-pre-line"
                                        >
                                          {section.category.replace(/\\n/g, '\n')}
                                        </td>
                                      )}
                                      
                                      <td className={`py-3 px-4 border border-gray-300 whitespace-pre-line text-gray-700 leading-relaxed ${alignmentClass} align-middle break-keep break-words`}>
                                        {contentToRender}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : null;
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGuidelines = (guidelineList: any[]) => {
    if (guidelineList.length === 0) return null;
    return (
      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-2xl mb-6">
        {guidelineList.map((g) => (
          <div key={g.id} className="flex flex-col md:flex-row border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-40 bg-slate-50/50 p-5 flex items-center justify-start md:justify-center border-b md:border-b-0 md:border-r border-gray-100">
              <span className="font-extrabold text-gray-800 text-sm tracking-tight text-left md:text-center">
                {g.title}
              </span>
            </div>
            <div className="flex-1 p-5 bg-white whitespace-pre-line text-sm text-gray-600 leading-relaxed font-medium">
              {g.content}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <SectionPage title={activeTab === "중등" ? "중3 썸머스쿨" : `${activeTab} 썸머스쿨`}>
      <div className="max-w-5xl mx-auto space-y-20 pb-32">
        
        {/* Tab Switcher */}
        <div className="flex justify-center pt-6">
          <div className="inline-flex p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
            {(["중등", "고1", "고2"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", tab);
                      window.history.pushState({}, "", url.toString());
                    }
                  }}
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                    active ? "text-white" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeSummerTab"
                      className="absolute inset-0 bg-[#7B2332] rounded-xl shadow-lg shadow-red-900/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab === "중등" ? "중등 썸머" : `${tab} 썸머`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero Section */}
        <motion.section 
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative text-center space-y-6 pt-4"
        >
          <div className="inline-block px-4 py-1.5 bg-[#7B2332] text-white text-xs font-bold rounded-full mb-2">
            PREMIUM SUMMER PROGRAM
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 leading-tight tracking-tight">
            2026 <span className="text-[#7B2332]">{activeTab === "중등" ? "중3 썸머스쿨" : `${activeTab} 썸머스쿨`}</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
            대치·시대인재 출신 강사진과 함께하는<br />
            {activeTab === "중등" ? (
              <span className="text-gray-900 font-bold">관리형 스파르타 9 to 10 프로그램</span>
            ) : (
              <span className="text-gray-900 font-bold">대입 성공을 위한 수능·내신 극대화 프로그램</span>
            )}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <div className="px-6 py-3 bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-xs text-[#7B2332] font-bold mb-1 uppercase tracking-wider">Capacity</p>
              <p className="text-lg font-black text-gray-900">
                {activeTab === "중등" ? "단 20명 소수정예" : "선착순 모집 마감 임박"}
              </p>
            </div>
            <div className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
              <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-wider">Care</p>
              <p className="text-lg font-black text-gray-900">
                {activeTab === "중등" ? "집중 밀착 케어" : "1:1 오답 관리 및 피드백"}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Sub-Tab Switcher */}
        {activeTab === "중등" && (
          <div className="flex justify-center border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveSubTab("info")}
                className={`pb-4 text-base font-bold transition-all relative ${
                  activeSubTab === "info"
                    ? "text-[#7B2332]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                상세 프로그램
                {activeSubTab === "info" && (
                  <motion.div
                    layoutId="activeSummerSubTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B2332]"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveSubTab("notice")}
                className={`pb-4 text-base font-bold transition-all relative flex items-center gap-1.5 ${
                  activeSubTab === "notice"
                    ? "text-[#7B2332]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                입반TEST 안내
                {filteredNotices.length > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-red-500" />
                )}
                {activeSubTab === "notice" && (
                  <motion.div
                    layoutId="activeSummerSubTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B2332]"
                  />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {activeTab === "중등" && activeSubTab === "notice" ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-5">
              <div className="w-1.5 h-6 bg-[#7B2332]" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">입반TEST 안내</h2>
              <span className="ml-3 text-xs bg-red-50 text-[#7B2332] font-bold px-2.5 py-1 rounded-full">
                총 {filteredNotices.length}건
              </span>
            </div>

            {filteredNotices.length === 0 ? (
              <div className="text-center py-24 bg-white border border-gray-100 rounded-[2rem] shadow-sm space-y-4">
                <Bell className="w-10 h-10 mx-auto text-gray-300 opacity-80" />
                <p className="text-base font-semibold text-gray-500">등록된 입반TEST 안내가 없습니다.</p>
                <p className="text-xs text-gray-400">새로운 안내 사항이 등록되면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredNotices.map((notice) => {
                  const dateFormatted = new Date(notice.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                  return (
                    <ParsedNoticeCard
                      key={notice.id}
                      title={notice.title}
                      content={notice.content}
                      date={dateFormatted}
                    />
                  );
                })}
              </div>
            )}

            {/* 수학 레벨테스트 바로가기 버튼 */}
            <div className="pt-8 border-t border-gray-150 flex flex-col items-center text-center space-y-4">
              <div className="space-y-1">
                <p className="text-base font-extrabold text-gray-900">우리 아이에게 맞는 정확한 수학 실력 진단</p>
                <p className="text-xs text-gray-500 font-semibold">체계적인 수학 실력 레벨테스트를 통해 완벽한 학습 설계를 제안합니다.</p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-math-level-test"))}
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#7B2332] hover:bg-[#8B3040] text-white text-base font-black rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <ClipboardList className="w-5 h-5" />
                수학 레벨테스트 신청하기
              </button>
            </div>
          </motion.div>
        ) : activeTab !== "중등" &&
        filteredImages.length === 0 &&
        filteredGuidelines.length === 0 &&
        filteredHighlights.length === 0 &&
        filteredSchedules.length === 0 ? (
          /* Coming Soon State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-white border border-gray-100 rounded-[2rem] shadow-sm space-y-6 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-red-50/10 via-transparent to-blue-50/10 opacity-50 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
                <Clock className="w-10 h-10 text-[#7B2332]" />
              </div>
            </div>
            <h3 className="relative z-10 text-5xl sm:text-7xl font-black text-gray-200 tracking-wider uppercase select-none font-mono">
              Coming Soon
            </h3>
            <p className="relative z-10 text-base sm:text-lg text-gray-500 font-semibold max-w-md mx-auto leading-relaxed">
              {activeTab} 썸머스쿨 프로그램 안내 및 시간표가<br />
              곧 공개될 예정입니다. 잠시만 기다려주세요!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-20">
            {/* 1. 모집 요강 (guideline) */}
            <section className="space-y-8">
              <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#7B2332]" />
                  <h2 className="text-2xl font-black text-gray-900">모집 요강</h2>
                </div>
                <div className="text-xs font-semibold text-gray-400">
                  2026 {activeTab === "중등" ? "중3" : activeTab} Summer School
                </div>
              </div>

              {renderGuidelines(guidelineGuidelines)}
              {renderImageGroup(guidelineImages)}

              {guidelineGuidelines.length === 0 && guidelineImages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">등록된 모집 요강 정보가 없습니다.</p>
              )}
            </section>

            {/* 2. 프로그램 개요 (overview) */}
            <section className="space-y-8 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-4">
                <div className="w-1.5 h-6 bg-[#7B2332]" />
                <h2 className="text-2xl font-black text-gray-900">프로그램 개요</h2>
              </div>

              {filteredHighlights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredHighlights.map((h, idx) => {
                    const Icon = ICON_MAP[h.icon] || Target;
                    const num = String(idx + 1).padStart(2, "0");
                    return (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-red-900/5 hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <Icon className="w-5 h-5 text-[#7B2332]" />
                          </div>
                          <span className="text-xl font-black text-gray-100">{num}</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">{h.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{h.content}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {renderGuidelines(overviewGuidelines)}
              {renderImageGroup(overviewImages)}

              {overviewGuidelines.length === 0 && overviewImages.length === 0 && filteredHighlights.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">등록된 개요 정보가 없습니다.</p>
              )}
            </section>

            {/* 3. 시간표 (timetable) */}
            <section className="space-y-8 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-4">
                <div className="w-1.5 h-6 bg-[#7B2332]" />
                <h2 className="text-2xl font-black text-gray-900">
                  {activeTab === "중등" ? "학습 시간표" : `${activeTab} 학습 시간표`}
                </h2>
              </div>

              {filteredSchedules.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-8">
                  <div className="grid grid-cols-1">
                    {filteredSchedules.map((s, idx) => (
                      <div
                        key={s.id}
                        className={`flex flex-col sm:flex-row items-center p-5 gap-4 sm:gap-10 border-b border-gray-100 last:border-0 ${s.type === "red" ? "bg-red-50/50" : s.type === "blue" ? "bg-blue-50/50" : ""}`}
                      >
                        <div className="w-full sm:w-44 text-center sm:text-left">
                          <span className={`text-sm font-black tracking-wider ${s.type === "red" ? "text-[#7B2332]" : s.type === "blue" ? "text-blue-600" : "text-gray-400"}`}>
                            {s.time}
                          </span>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <p className={`text-sm font-bold ${s.type === "red" ? "text-[#7B2332]" : s.type === "blue" ? "text-blue-600" : "text-gray-900"}`}>
                            {s.content}
                          </p>
                        </div>
                        {s.label && (
                          <div className={`px-2.5 py-0.5 ${s.type === "red" ? "bg-[#7B2332]" : "bg-blue-600"} text-white text-[9px] font-bold rounded-full`}>
                            {s.label}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 타임라인 그리드 */}
              {Object.entries(timetableGroups).map(([title, slots]) => (
                <TimetableGrid key={title} title={title} slots={slots} />
              ))}

              {Object.keys(timetableGroups).length === 0 && filteredSchedules.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">등록된 시간표 정보가 없습니다.</p>
              )}
            </section>

            {/* 4. 강사별 커리큘럼 (curriculum) */}
            <section className="space-y-8 pt-8 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-900 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#7B2332]" />
                  <h2 className="text-2xl font-black text-gray-900">강사별 커리큘럼</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["전체", "수학", "수학특강", "국어", "영어", "탐구"].map(subj => (
                    <button
                      key={subj}
                      onClick={() => setCurriculumSubjectFilter(subj)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                        curriculumSubjectFilter === subj 
                          ? "bg-[#7B2332] text-white" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              {renderCurriculumGuidelines(curriculumGuidelines)}
              {renderImageGroup(curriculumImages)}

              {curriculumGuidelines.length === 0 && curriculumImages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">등록된 커리큘럼 정보가 없습니다.</p>
              )}
            </section>
          </div>
        )}

        {/* Contact CTA */}
        <section className="bg-gray-900 rounded-[2rem] p-10 sm:p-16 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 rounded-full bg-[#7B2332] blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 rounded-full bg-blue-600 blur-3xl"></div>
          </div>
          
          <div className="relative space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white">지금 바로 썸머스쿨을 예약하세요</h2>
            <p className="text-gray-400 font-medium">선착순 20명 마감 임박! 우리 아이의 대입 성공 전략이 시작됩니다.</p>
          </div>
          
          <div className="relative flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <Phone className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">전화 문의</p>
              <a href="tel:0312041353" className="text-xl sm:text-2xl font-black text-white hover:text-[#7B2332] transition-colors">031-204-1353</a>
            </div>
            <div className="w-px h-16 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">문자 전용</p>
              <a href="sms:01097641353" className="text-xl sm:text-2xl font-black text-white hover:text-blue-400 transition-colors">010-9764-1353</a>
            </div>
          </div>
        </section>
      </div>
    </SectionPage>
  );
}
