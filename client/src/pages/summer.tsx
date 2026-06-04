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
              <th className="bg-[#7B2332] text-white p-2.5 text-center font-bold w-20 border-r border-red-800/30" colSpan={2}>
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
                  <td colSpan={days.length} className="p-3 text-center text-gray-600 font-semibold border-t border-gray-100">
                    {slot.merged_content}
                  </td>
                ) : (
                  days.map(d => {
                    const val = slot[d.key] as string;
                    return (
                      <td key={d.key} className="p-2 text-center align-middle border-l border-gray-100 border-t border-gray-100 whitespace-pre-line leading-relaxed text-gray-700">
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
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-white text-[11px] font-bold rounded ${colorClass.badge}`}>
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
  const [activeSubTab, setActiveSubTab] = useState<"info" | "notice">("info");

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
  const filteredImages = images.filter((img) => (img.division || "중등") === activeTab);
  const filteredGuidelines = guidelines.filter((g) => g.division === activeTab);
  const filteredHighlights = highlights.filter((h) => h.division === activeTab);
  const filteredSchedules = schedules.filter((s) => s.division === activeTab);
  const filteredNotices = notices.filter((n) => n.division === activeTab && n.is_active);

  // Divide guidelines by category
  const overviewGuidelines = filteredGuidelines.filter(g => (g.category || 'guideline') === 'overview');
  const timetableGuidelines = filteredGuidelines.filter(g => (g.category || 'guideline') === 'timetable');
  const curriculumGuidelines = filteredGuidelines.filter(g => (g.category || 'guideline') === 'curriculum');
  const guidelineGuidelines = filteredGuidelines.filter(g => (g.category || 'guideline') === 'guideline');

  // Divide images by category
  const overviewImages = filteredImages.filter(img => (img.category || 'curriculum') === 'overview');
  const timetableImages = filteredImages.filter(img => (img.category || 'curriculum') === 'timetable');
  const curriculumImages = filteredImages.filter(img => (img.category || 'curriculum') === 'curriculum');
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
          <div key={name} className="space-y-4">
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

  const renderGuidelines = (guidelineList: any[]) => {
    if (guidelineList.length === 0) return null;
    return (
      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-2xl mb-6">
        {guidelineList.map((g) => (
          <div key={g.id} className="flex flex-col md:flex-row border-b border-gray-100 last:border-b-0">
            <div className="w-full md:w-52 bg-slate-50/50 p-5 flex items-center justify-start md:justify-center border-b md:border-b-0 md:border-r border-gray-100">
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

              {renderGuidelines(timetableGuidelines)}
              {renderImageGroup(timetableImages)}

              {Object.keys(timetableGroups).length === 0 && timetableGuidelines.length === 0 && timetableImages.length === 0 && filteredSchedules.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">등록된 시간표 정보가 없습니다.</p>
              )}
            </section>

            {/* 4. 강사별 커리큘럼 (curriculum) */}
            <section className="space-y-8 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-2 border-b-2 border-gray-900 pb-4">
                <div className="w-1.5 h-6 bg-[#7B2332]" />
                <h2 className="text-2xl font-black text-gray-900">강사별 커리큘럼</h2>
              </div>

              {renderGuidelines(curriculumGuidelines)}
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
              <a href="tel:01077372843" className="text-xl sm:text-2xl font-black text-white hover:text-blue-400 transition-colors">010-7737-2843</a>
            </div>
          </div>
        </section>
      </div>
    </SectionPage>
  );
}
