import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, BookOpen, User, GraduationCap, ChevronDown, ChevronUp, Users, School } from "lucide-react";
import { ReservationModal } from "./reservation-modal";
import { SummaryTimetableSection } from "./summary-timetable";
import { BrochureModal } from "./brochure-modal";

interface Timetable {
  id: number;
  teacher_id: number | null;
  teacher_name: string;
  category: string;
  target_school: string;
  class_name: string;
  class_time: string;
  start_date: string;
  teacher_image_url: string;
  detail_image_url: string | null;
  description: string;
  subject: string;
  is_union: boolean;
  teacher_ids: number[] | null;
  school_logo_url: string | null;
  created_at: string;
}

const SUBJECT_ORDER = ["수학", "국어", "영어", "탐구", "통합사회/한국사", "사회문화", "생윤", "논술"];

// 통합과학·물리·화학·생명과학 등 과학 과목을 하나의 "탐구" 섹션으로 묶음
const SCIENCE_SUBJECTS = ["통합과학", "물리", "화학", "생명과학", "지구과학", "물리학", "생명", "지구", "과학탐구", "탐구"];

// 탐구 섹션 내 과목별 소그룹 순서: 통합과학 -> 물리 -> 화학 -> 생명
const SCI_SUB_ORDER = ["통합과학", "물리", "화학", "생명"];
// 강좌(+매칭된 강사커리큘럼)로부터 과탐 세부과목 판별
function sciSubjectOf(className: string, guidelineTitle?: string): string {
  const s = ((guidelineTitle || "") + " " + (className || "")).replace(/\s+/g, "");
  if (/생명|세포/.test(s)) return "생명";
  if (/화학|물질과에너지|물질과|개정화학/.test(s)) return "화학";
  if (/물리|역학/.test(s)) return "물리";
  return "통합과학";
}

// 학교/표시 순서: 연합반 -> 특강반 -> 화성/가온/병점 -> 영덕/수원/청명 -> 고색/동탄국제고 -> 학교별 특강
const SCHOOL_ORDER = [
  "연합반",
  "화성고",
  "가온고",
  "병점고",
  "영덕고",
  "수원고",
  "청명고",
  "고색고",
  "동탄국제고",
];

const getSchoolRank = (name: string): number => {
  const si = SCI_SUB_ORDER.indexOf(name);
  if (si !== -1) return si; // 탐구 과목별 소그룹: 통합과학0 물리1 화학2 생명3
  if (name === "특강반") return 0.5;
  
  if (name.includes("특강")) {
    const schoolIdx = SCHOOL_ORDER.findIndex(s => s !== "연합반" && name.includes(s));
    if (schoolIdx !== -1) return 100 + schoolIdx;
    return 0.5;
  }

  const idx = SCHOOL_ORDER.findIndex((s) => name.includes(s));
  return idx === -1 ? 50 : idx;
};

const getMathTeacherScore = (teacherName: string): number => {
  const name = teacherName || "";
  // 예외 처리: 정승준과 권소영이 같이 있는 경우
  if (name.includes("정승준") && name.includes("권소영")) {
    return 6;
  }
  let score = 6;
  if (name.includes("최주용")) score = Math.min(score, 1);
  if (name.includes("황해룡")) score = Math.min(score, 2);
  if (name.includes("권소영")) score = Math.min(score, 3);
  if (name.includes("정찬영")) score = Math.min(score, 4);
  if (name.includes("임서원")) score = Math.min(score, 5);
  return score;
};

const getMathSpecialLectureScore = (className: string): number => {
  const t = className.toUpperCase();
  // 1. 대수특강: 대수 포함하되 미적/미적분 미포함
  if (t.includes("대수") && !t.includes("미적")) return 1;
  // 2. 대수미적분 특강: 대수와 미적이 같이 있거나, 또는 미적만 있는 경우
  if (t.includes("대수") && t.includes("미적")) return 2;
  if (t.includes("미적")) return 2;
  // 3. 화성 올데이
  if (t.includes("화성") && t.includes("올데이")) return 3;
  // 4. 가온 올데이
  if (t.includes("가온") && t.includes("올데이")) return 4;
  // 5. 기타 올데이
  if (t.includes("올데이")) return 5;
  return 6;
};

// ── 브로셔(강사커리큘럼) 매칭 ──────────────────────────────
const _SCHOOL_ROOTS = ["화성", "가온", "병점", "영덕", "수원", "청명", "고색", "동탄"];
function _gkeys(s: string): Set<string> {
  s = (s || "").toUpperCase();
  const k = new Set<string>();
  for (const r of _SCHOOL_ROOTS) if (s.includes(r)) k.add(r);
  if (/의치서|의치/.test(s)) k.add("의치");
  if (/대수.*미적|미적.*대수|대수미적/.test(s)) k.add("대수미적");
  else if (/대수\s*특강|대수특강/.test(s)) k.add("대수특강");
  if (/올데이|ALL\s?-?DAY/.test(s)) k.add("올데이");
  if (/기하/.test(s)) k.add("기하");
  if (/확통/.test(s)) k.add("확통");
  if (/역학/.test(s)) k.add("역학");
  if (/전범위|전과정/.test(s)) k.add("전범위");
  if (/집중/.test(s)) k.add("집중");
  if (/M반|의치서M/.test(s)) k.add("M");
  if (/S-?1/.test(s)) k.add("S1"); else if (/S-?2/.test(s)) k.add("S2");
  else if (/S반|연합\s*S/.test(s)) k.add("S");
  if (/A-?1|A1반/.test(s)) k.add("A1"); else if (/A-?2|A2반/.test(s)) k.add("A2");
  else if (/A반|연합\s*A/.test(s)) k.add("A");
  if (/연합/.test(s)) k.add("연합");
  if (/국어/.test(s)) k.add("국어"); if (/영어/.test(s)) k.add("영어");
  if (/물리/.test(s)) k.add("물리"); if (/화학/.test(s)) k.add("화학");
  if (/생명|세포/.test(s)) k.add("생명"); if (/통과|통합과학/.test(s)) k.add("통과");
  return k;
}
function matchGuideline(tt: Timetable, guidelines: any[]): any | null {
  const tn = (tt.teacher_name || "").match(/([가-힣]{2,4})T?/)?.[1] || "";
  if (!tn) return null;
  const cand = guidelines.filter((g) => (g.title || "").includes(tn));
  if (!cand.length) return null;
  if (cand.length === 1) return cand[0];
  const tk = _gkeys(tt.class_name || "");
  let best: any = null, bs = -1;
  for (const g of cand) {
    const gk = _gkeys((g.title || "").replace(/^\[[^\]]*\]/, ""));
    let sc = 0; for (const x of tk) if (gk.has(x)) sc++;
    if (sc > bs) { bs = sc; best = g; }
  }
  return bs >= 1 ? best : null;
}

const sortByGroupKey = <T,>(entries: [string, T][], subject?: string): [string, T][] =>
  [...entries].sort(([a], [b]) => {
    if (subject === "수학") {
      const scoreA = getMathTeacherScore(a);
      const scoreB = getMathTeacherScore(b);
      if (scoreA !== 6 || scoreB !== 6) {
        return scoreA - scoreB;
      }
    }
    const ra = getSchoolRank(a);
    const rb = getSchoolRank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });

interface FilterTab {
  label: string;
  filterFn: (tt: Timetable) => boolean;
  isSummary?: boolean;
}

interface TimetableGalleryProps {
  category: string;
  filterTabs?: FilterTab[];
  summaryDivision?: string;
  summaryTitle?: string;
}

export function TimetableGallery({ category, filterTabs, summaryDivision, summaryTitle }: TimetableGalleryProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [reserveTarget, setReserveTarget] = useState<{ id: number; name: string; subject: string; teacherName: string; classTime: string; startDate: string } | null>(null);
  const [brochure, setBrochure] = useState<any | null>(null);

  const { data: rawTimetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables", category],
    queryFn: async () => {
      const res = await fetch(`/api/timetables?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const EXCLUDED_TEACHERS: string[] = [];
  const timetables = rawTimetables.filter(tt => !EXCLUDED_TEACHERS.includes(tt.teacher_name));
 
  const { data: teachers = [] } = useQuery<{ id: number; name: string; image_url: string }[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return res.json();
    }
  });

  // 강사커리큘럼(브로셔) 데이터 + 강좌별 매칭
  const { data: guidelines = [] } = useQuery<any[]>({
    queryKey: ["/api/summer-guidelines"],
    queryFn: async () => {
      const res = await fetch("/api/summer-guidelines");
      if (!res.ok) throw new Error("Failed to fetch guidelines");
      return res.json();
    },
  });
  const _divMap: Record<string, string> = { "고등관-고1": "고1", "고등관-고2": "고2", "고등관-고3": "고3" };
  const _curDiv = _divMap[category];
  const myGuidelines = (guidelines || []).filter((g: any) => g.category === "curriculum" && g.division === _curDiv);
  const brochureMap = new Map<number, any>();
  for (const tt of timetables) {
    const g = matchGuideline(tt, myGuidelines);
    if (g) brochureMap.set(tt.id, g);
  }

  const activeTab = filterTabs?.[selectedFilter];
  const isSummaryView = activeTab?.isSummary === true;
  // 특정 학교 필터(화성고 등)가 켜져 있으면, 학교별 올데이/특강을 특강반에 중복 노출하지 않음
  const schoolFilterActive = !!activeTab && SCHOOL_ORDER.some((s) => s !== "연합반" && activeTab.label.includes(s));

  const filtered = filterTabs && filterTabs.length > 0 && !isSummaryView
    ? timetables.filter(filterTabs[selectedFilter].filterFn)
    : isSummaryView ? [] : timetables;


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (timetables.length === 0 && (!filterTabs || filterTabs.length === 0)) {
    return (
      <div className="text-center py-16" data-testid="timetable-empty">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">등록된 시간표가 없습니다.</p>
      </div>
    );
  }

  // Grouping logic
  const subjectGroups: Record<string, {
    union: Record<string, Timetable[]>;
    school: Record<string, Timetable[]>;
  }> = {};

  const ungrouped: Record<string, Timetable[]> = {};

  for (const tt of filtered) {
    const isUnion = tt.is_union;
    let subj = SCIENCE_SUBJECTS.includes(tt.subject) ? "탐구" : (tt.subject || "기타");

    const instances: { isUnion: boolean; targetSchool: string }[] = [];

    const isNonsulClass = (tt.class_name || "").includes("논술") || (tt.subject || "").includes("논술") || (tt.target_school || "") === "논술";

    if (isNonsulClass) {
      instances.push({
        isUnion,
        targetSchool: isUnion ? (tt.target_school || "연합반") : "논술",
      });
    } else if (subj === "탐구") {
      // 과탐 강좌는 모두 특강 취급 -> 학교별이 아니라 강사커리큘럼 기준 과목별(통합과학/물리/화학/생명) 소그룹으로
      const ss = sciSubjectOf(tt.class_name || "", brochureMap.get(tt.id)?.title);
      instances.push({ isUnion: false, targetSchool: ss });
    } else {
      const isSpecialLecture =
        (tt.class_name || "").includes("특강") || 
        (tt.target_school || "").includes("특강") || 
        (tt.class_name || "").includes("썸머") || 
        (tt.target_school || "").includes("썸머") ||
        (tt.class_name || "").includes("올데이") ||
        (tt.class_name || "").toUpperCase().includes("ALLDAY") ||
        (tt.class_name || "").toUpperCase().includes("ALL-DAY") ||
        (tt.target_school || "").includes("올데이");
      
      if (isSpecialLecture) {
        const schoolMatch = SCHOOL_ORDER.find(s => s !== "연합반" && ((tt.target_school || "").includes(s) || (tt.class_name || "").includes(s)));
        
        if (schoolMatch) {
          // 학교별 올데이/특강 -> 해당 학교 섹션(예: 화성고)에 노출
          instances.push({
            isUnion: false,
            targetSchool: schoolMatch,
          });
          // 전체시간표 등에서는 위 특강반에도 중복 노출 (단, 특정 학교 필터에서는 제외)
          if (!schoolFilterActive) {
            instances.push({
              isUnion: false,
              targetSchool: "특강반",
            });
          }
        } else {
          // 학교별 아닌 특강 (특강반) -> 특강반에만 노출 (연합반 중복 제거)
          instances.push({
            isUnion: false,
            targetSchool: "특강반",
          });
        }
      } else {
        instances.push({
          isUnion,
          targetSchool: tt.target_school || "연합반",
        });
      }
    }

    for (const inst of instances) {
      const targetSchool = inst.targetSchool;
      const isUnionInst = inst.isUnion;

      if (SUBJECT_ORDER.includes(subj)) {
        if (!subjectGroups[subj]) {
          subjectGroups[subj] = { union: {}, school: {} };
        }

        if (isUnionInst && targetSchool !== "특강반" && !targetSchool.includes("특강")) {
          // Union classes are still grouped by teacher for clarity
          const groupKey = tt.teacher_name || "연합반";
          if (!subjectGroups[subj].union[groupKey]) subjectGroups[subj].union[groupKey] = [];
          
          const ttCopy = { ...tt, target_school: targetSchool };
          subjectGroups[subj].union[groupKey].push(ttCopy);
        } else {
          // Special lectures go to the school section, even if they are marked as union in DB
          const groupKey = targetSchool;
          if (!subjectGroups[subj].school[groupKey]) subjectGroups[subj].school[groupKey] = [];
          
          const ttCopy = { ...tt, target_school: targetSchool };
          subjectGroups[subj].school[groupKey].push(ttCopy);
        }
      } else {
        const groupKey = targetSchool;
        if (!ungrouped[groupKey]) ungrouped[groupKey] = [];
        
        const ttCopy = { ...tt, target_school: targetSchool };
        ungrouped[groupKey].push(ttCopy);
      }
    }
  }

  const orderedSubjects = SUBJECT_ORDER.filter((s) => subjectGroups[s]);

  const openReserve = (tt: Timetable) =>
    setReserveTarget({ id: tt.id, name: tt.class_name, subject: tt.subject, teacherName: tt.teacher_name, classTime: tt.class_time, startDate: tt.start_date });

  return (
    <>
      {filterTabs && filterTabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8" data-testid="filter-tabs">
          {filterTabs.map((tab, idx) => (
            <button
              key={tab.label}
              onClick={() => { setSelectedFilter(idx); setExpandedId(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                selectedFilter === idx
                  ? "bg-[#7B2332] text-white border-[#7B2332]"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
              data-testid={`filter-tab-${tab.label}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isSummaryView && summaryDivision ? (
        (() => {
          const isFinal = (activeTab?.label || "").includes("기말") || (activeTab?.label || "").includes("내신");
          return (
            <SummaryTimetableSection
              division={isFinal ? `${summaryDivision}-final` : summaryDivision}
              title={isFinal ? "기말/내신시간표" : (summaryTitle || "썸머시간표")}
            />
          );
        })()
      ) : (
        <div data-testid="timetable-list">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">해당 조건의 시간표가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {orderedSubjects.map((subj) => {
                const { union, school } = subjectGroups[subj];
                const totalClasses = Object.values(union).flat().length + Object.values(school).flat().length;

                return (
                  <div key={subj} className="flex flex-col md:flex-row gap-4 md:gap-8 border-b border-gray-100 pb-10 last:border-0 last:pb-0">
                    <div className="w-full md:w-32 flex-shrink-0 flex md:flex-col items-center md:items-start gap-2 pt-1">
                      <div className="w-1 h-6 bg-[#7B2332] hidden md:block" />
                      <h3 className="text-xl font-extrabold text-gray-900 leading-tight" data-testid={`text-subject-group-${subj}`}>
                        {subj}
                      </h3>
                      <span className="text-xs text-gray-400 font-medium">({totalClasses}개 반)</span>
                    </div>
                    <div className="flex-1 space-y-10">
                      {/* Union Section for this subject */}
                      {Object.keys(union).length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-[#7B2332] text-[10px] font-bold text-white rounded-sm">연합반</div>
                            <div className="h-px flex-1 bg-gray-100" />
                          </div>
                          <div className="space-y-6">
                            {sortByGroupKey(Object.entries(union), subj).map(([key, tts]) => (
                              <GroupCard
                                key={key}
                                title={key}
                                timetables={tts}
                                teachers={teachers}
                                expandedId={expandedId}
                                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                                onReserve={openReserve}
                                brochureMap={brochureMap}
                                onBrochure={setBrochure}
                                type="teacher"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* School Section for this subject */}
                      {Object.keys(school).length > 0 && (
                        <div className="space-y-4">
                          {Object.keys(union).length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="px-2 py-0.5 bg-gray-600 text-[10px] font-bold text-white rounded-sm">학교별</div>
                              <div className="h-px flex-1 bg-gray-100" />
                            </div>
                          )}
                          <div className="space-y-6">
                            {sortByGroupKey(Object.entries(school), subj).map(([key, tts]) => (
                              <GroupCard
                                key={key}
                                title={key}
                                timetables={tts}
                                teachers={teachers}
                                expandedId={expandedId}
                                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                                onReserve={openReserve}
                                brochureMap={brochureMap}
                                onBrochure={setBrochure}
                                type="school"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Ungrouped (Others) Section */}
              {Object.keys(ungrouped).length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 border-b border-gray-100 pb-10 last:border-0 last:pb-0">
                  <div className="w-full md:w-32 flex-shrink-0 flex md:flex-col items-center md:items-start gap-2 pt-1">
                    <div className="w-1 h-6 bg-gray-400 hidden md:block" />
                    <h3 className="text-xl font-extrabold text-gray-900 leading-tight">기타</h3>
                    <span className="text-xs text-gray-400 font-medium">({Object.values(ungrouped).flat().length}개 반)</span>
                  </div>
                  <div className="flex-1 space-y-6">
                    {sortByGroupKey(Object.entries(ungrouped)).map(([key, tts]) => (
                      <GroupCard
                        key={key}
                        title={key}
                        timetables={tts}
                        teachers={teachers}
                        expandedId={expandedId}
                        onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                        onReserve={openReserve}
                        brochureMap={brochureMap}
                        onBrochure={setBrochure}
                        type="school"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ReservationModal
        open={!!reserveTarget}
        onClose={() => setReserveTarget(null)}
        timetableId={reserveTarget?.id}
        className={reserveTarget?.name}
        subject={reserveTarget?.subject}
        teacherName={reserveTarget?.teacherName}
        classTime={reserveTarget?.classTime}
        startDate={reserveTarget?.startDate}
      />
      {brochure && <BrochureModal guideline={brochure} onClose={() => setBrochure(null)} />}
    </>
  );
}

function GroupCard({
  title,
  timetables,
  teachers,
  expandedId,
  onToggle,
  onReserve,
  brochureMap,
  onBrochure,
  type,
}: {
  title: string;
  timetables: Timetable[];
  teachers: { id: number; name: string; image_url: string }[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  onReserve: (tt: Timetable) => void;
  brochureMap: Map<number, any>;
  onBrochure: (g: any) => void;
  type: "teacher" | "school";
}) {
  const firstTt = timetables[0];

  // Merge timetables with the same base name (ignoring parenthetical suffixes like (일요반))
  const mergedTimetables: Timetable[] = [];
  const classMap = new Map<string, Timetable>();

  timetables.forEach(tt => {
    // Extract base name, e.g. "가온고2 수학 내신반" from "가온고2 수학 내신반 (일요반)"
    const hasParenthesis = (tt.class_name || "").includes(" (");
    const baseName = hasParenthesis 
      ? (tt.class_name || "").split(" (")[0].trim() 
      : (tt.class_name || "").trim();
    
    // Group key: only merge if they had a parenthesis and the teacher is Jung Seung-jun
    const isJungSeungJun = (tt.teacher_name || "").includes("정승준");
    const shouldMerge = hasParenthesis && isJungSeungJun;
    const mapKey = shouldMerge ? baseName : `${tt.id}-${(tt.class_name || "").trim()}`;
    
    if (classMap.has(mapKey)) {
      const existing = classMap.get(mapKey)!;
      // Combine class times
      if (tt.class_time && !existing.class_time.includes(tt.class_time)) {
        existing.class_time = `${existing.class_time} / ${tt.class_time}`;
      }
      
      // Combine teachers
      const existingTeacherNames = (existing.teacher_name || "").split(", ").map(n => n.trim());
      if (tt.teacher_name && !existingTeacherNames.includes(tt.teacher_name)) {
        existing.teacher_name = existing.teacher_name 
          ? `${existing.teacher_name}, ${tt.teacher_name}`
          : tt.teacher_name;
      }

      // Combine teacher IDs
      const tIds = new Set(existing.teacher_ids || []);
      if (tt.teacher_id) tIds.add(tt.teacher_id);
      if (tt.teacher_ids) tt.teacher_ids.forEach(id => tIds.add(id));
      existing.teacher_ids = Array.from(tIds);

      // Prefer the entry with detail image or description
      if (!existing.detail_image_url && tt.detail_image_url) existing.detail_image_url = tt.detail_image_url;
      if (!existing.description && tt.description) existing.description = tt.description;
      
    } else {
      const copy = { ...tt, class_name: shouldMerge ? baseName : (tt.class_name || "").trim() };
      // Ensure teacher_ids is an array even if it was just teacher_id
      const tIds = new Set(copy.teacher_ids || []);
      if (copy.teacher_id) tIds.add(copy.teacher_id);
      copy.teacher_ids = Array.from(tIds);
      
      classMap.set(mapKey, copy);
      mergedTimetables.push(copy);
    }
  });

  // Stable sort mergedTimetables by class level priority
  // Priority 1: 의치서 M반 / M반 / 의치반 / 의치 / 의치한
  // Priority 2: S-1 / S1
  // Priority 3: S-2 / S2
  // Priority 4: S반 / S
  // Priority 5: A1반 / A1 / A반 / A
  // Priority 6: A2반 / A2 / B반 / B
  // Priority 7: Others
  const getPriority = (name: string) => {
    const cleanName = name.replace(/\s+/g, '').toUpperCase();
    
    // 고3 수학 정렬 순서: 1등급 프리미엄 -> 공통 정규 -> 미적 -> 확통
    const isG3Math = firstTt.category === "고등관-고3" && firstTt.subject === "수학";
    if (isG3Math) {
      if (cleanName.includes("1등급") || cleanName.includes("프리미엄")) return 1;
      if (cleanName.includes("공통")) return 2;
      if (cleanName.includes("미적")) return 3;
      if (cleanName.includes("확통") || cleanName.includes("확률")) return 4;
      return 5;
    }
    
    // Priority 1: 의치서 M반 / M반 / 의치반 / 의치 / 의치한
    if (
      cleanName.includes("의치서M반") || cleanName.includes("의치서M") ||
      cleanName.includes("의치서") || cleanName.includes("의치반") ||
      cleanName.includes("의치한") ||
      /(?:^|[^가-힣A-Z0-9])M반(?:[^가-힣A-Z0-9]|$)/i.test(cleanName) ||
      /(?:^|[^가-힣A-Z0-9])의치(?:[^가-힣A-Z0-9]|$)/.test(cleanName)
    ) return 1;
    
    // Priority 2: S-1 / S1
    if (/S-?1(?:[^0-9]|$)/i.test(cleanName)) return 2;
    
    // Priority 3: S-2 / S2
    if (/S-?2(?:[^0-9]|$)/i.test(cleanName)) return 3;
    
    // Priority 4: S반 / S (standalone S, not S1/S2)
    if (/(?:^|[^가-힣A-Z0-9])S반(?:[^가-힣A-Z0-9]|$)/i.test(cleanName)) return 4;
    if (/(?:^|[^가-힣A-Z0-9])S(?:[^가-힣A-Z0-9]|$)/i.test(cleanName) && !/S-?[12]/i.test(cleanName)) return 4;
    
    // Priority 5: A1반 / A1 / A반 / A
    if (
      cleanName.includes("A1반") || /(?:^|[^가-힣A-Z0-9])A1(?:[^0-9]|$)/i.test(cleanName) ||
      cleanName.includes("A반") ||
      /(?:^|[^가-힣A-Z0-9])A(?:[^가-힣A-Z0-9]|$)/i.test(cleanName)
    ) return 5;
    
    // Priority 6: A2반 / A2 / B반 / B
    if (
      cleanName.includes("A2반") || /(?:^|[^가-힣A-Z0-9])A2(?:[^0-9]|$)/i.test(cleanName) ||
      cleanName.includes("B반") ||
      /(?:^|[^가-힣A-Z0-9])B(?:[^가-힣A-Z0-9]|$)/i.test(cleanName)
    ) return 6;

    return 7;
  };

  const isMath = firstTt?.subject === "수학";

  // 그룹 맨 아래로 내릴 항목 판별:
  //  - 특강반: 학교명이 들어간(=학교별 올데이/특강) 항목을 맨 밑으로
  //  - 학교 섹션: 특강·올데이 항목을 맨 밑으로
  const SCHOOLS_NO_UNION = SCHOOL_ORDER.filter((s) => s !== "연합반");
  const isBottomItem = (name: string) => {
    if (title === "특강반") {
      return SCHOOLS_NO_UNION.some((s) => name.includes(s)) ? 1 : 0;
    }
    return /특강|올데이|All\s?Day/i.test(name) ? 1 : 0;
  };

  const indexedTimetables = mergedTimetables.map((tt, idx) => ({ tt, idx }));
  indexedTimetables.sort((a, b) => {
    const bottomA = isBottomItem(a.tt.class_name || "");
    const bottomB = isBottomItem(b.tt.class_name || "");
    if (bottomA !== bottomB) return bottomA - bottomB;
    if (isMath) {
      const specA = getMathSpecialLectureScore(a.tt.class_name || "");
      const specB = getMathSpecialLectureScore(b.tt.class_name || "");
      if (specA !== specB) {
        return specA - specB;
      }
      const scoreA = getMathTeacherScore(a.tt.teacher_name || "");
      const scoreB = getMathTeacherScore(b.tt.teacher_name || "");
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
    }
    const prioA = getPriority(a.tt.class_name || "");
    const prioB = getPriority(b.tt.class_name || "");
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    return a.idx - b.idx;
  });
  
  for (let i = 0; i < mergedTimetables.length; i++) {
    mergedTimetables[i] = indexedTimetables[i].tt;
  }

  return (
    <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
        {type === "teacher" ? (
          <>
            {firstTt.teacher_ids && firstTt.teacher_ids.length > 0 ? (
              <div className="flex -space-x-4">
                {firstTt.teacher_ids.map((tId, idx) => {
                  const t = teachers.find((teacher) => teacher.id === tId);
                  return (
                    <div key={tId} className="relative" style={{ zIndex: 10 - idx }}>
                      <img
                        src={t?.image_url || firstTt.teacher_image_url || "/images/default-teacher.png"}
                        alt={t?.name || firstTt.teacher_name}
                        className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            ) : firstTt.teacher_image_url ? (
              <img
                src={firstTt.teacher_image_url}
                alt={title}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm">
                <User className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h4 className="text-base font-extrabold text-gray-900">{title} 선생님</h4>
              <p className="text-xs text-[#7B2332] font-black uppercase tracking-wider">{firstTt.subject}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded bg-[#7B2332]/5 flex items-center justify-center border border-[#7B2332]/10 overflow-hidden">
              {firstTt.school_logo_url && !SCI_SUB_ORDER.includes(title) ? (
                <img src={firstTt.school_logo_url} alt={title} className="w-full h-full object-contain" />
              ) : title === "연합반" ? (
                <Users className="w-6 h-6 text-blue-600" />
              ) : (
                <GraduationCap className="w-6 h-6 text-[#7B2332]" />
              )}
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">{title}</h4>
            </div>
          </>
        )}
      </div>

      {/* Class List */}
      <div className="divide-y divide-gray-100">
        {mergedTimetables.map((tt) => (
          <div key={tt.id} className="p-4 sm:p-5 hover:bg-gray-50/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  {tt.teacher_ids && tt.teacher_ids.length > 0 ? (
                    <div className="flex -space-x-3">
                      {tt.teacher_ids.map((tId, idx) => {
                        const t = teachers.find((teacher) => teacher.id === tId);
                        return (
                          <div key={tId} className="relative" style={{ zIndex: 10 - idx }}>
                            <img
                              src={t?.image_url || tt.teacher_image_url || "/images/default-teacher.png"}
                              alt={t?.name || tt.teacher_name}
                              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : tt.teacher_image_url ? (
                    <img src={tt.teacher_image_url} alt={tt.teacher_name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">{tt.class_name}</h3>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                  <span className="flex items-center gap-1 font-bold text-[#7B2332]">
                    <User className="w-3.5 h-3.5" />
                    {tt.teacher_name} 선생님
                  </span>
                  {tt.target_school && type === "teacher" && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {tt.target_school}
                    </span>
                  )}
                  {tt.class_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tt.class_time}
                    </span>
                  )}
                  {tt.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      개강: {tt.start_date}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(tt.description || tt.detail_image_url) && (
                  <button
                    onClick={() => onToggle(tt.id)}
                    className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                  >
                    상세보기
                    {expandedId === tt.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
                {brochureMap.get(tt.id) && (
                  <button
                    onClick={() => onBrochure(brochureMap.get(tt.id))}
                    className="px-4 py-2 border border-[#7B2332] text-[#7B2332] text-xs font-bold hover:bg-[#7B2332]/5 transition-colors"
                  >
                    브로셔
                  </button>
                )}
                <button
                  onClick={() => onReserve(tt)}
                  className="px-4 py-2 bg-[#7B2332] text-white text-xs font-bold hover:bg-[#6B1D2A] transition-colors"
                >
                  수강예약
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedId === tt.id && (tt.description || tt.detail_image_url) && (
              <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/50 rounded p-4 animate-in fade-in slide-in-from-top-1">
                {tt.detail_image_url && (
                  <img
                    src={tt.detail_image_url}
                    alt={`${tt.class_name} 상세`}
                    className="w-full max-w-2xl mx-auto rounded mb-4 object-contain"
                  />
                )}
                {tt.description && (
                  <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {tt.description}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

