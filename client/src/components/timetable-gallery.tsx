import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Calendar, Clock, BookOpen, User, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { ReservationModal } from "./reservation-modal";
import { SummaryTimetableSection } from "./summary-timetable";

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
  school_logo_url: string | null;
  created_at: string;
}

const SUBJECT_ORDER = ["수학", "국어", "영어", "통합과학", "통합사회/한국사", "생명과학", "사회문화", "생윤", "논술", "탐구"];

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

  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables", category],
    queryFn: async () => {
      const res = await fetch(`/api/timetables?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const activeTab = filterTabs?.[selectedFilter];
  const isSummaryView = activeTab?.isSummary === true;

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
    const subj = tt.subject || "기타";

    if (SUBJECT_ORDER.includes(subj)) {
      if (!subjectGroups[subj]) {
        subjectGroups[subj] = { union: {}, school: {} };
      }

      if (isUnion) {
        // Union classes are still grouped by teacher for clarity, or just as one "Union" group
        const groupKey = tt.teacher_name || "연합반";
        if (!subjectGroups[subj].union[groupKey]) subjectGroups[subj].union[groupKey] = [];
        subjectGroups[subj].union[groupKey].push(tt);
      } else {
        const groupKey = tt.target_school || "연합반";
        if (!subjectGroups[subj].school[groupKey]) subjectGroups[subj].school[groupKey] = [];
        subjectGroups[subj].school[groupKey].push(tt);
      }
    } else {
      const groupKey = tt.target_school || "연합반";
      if (!ungrouped[groupKey]) ungrouped[groupKey] = [];
      ungrouped[groupKey].push(tt);
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
        <SummaryTimetableSection division={summaryDivision} title={summaryTitle || "요약시간표"} />
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
                            {Object.entries(union).map(([key, tts]) => (
                              <GroupCard
                                key={key}
                                title={key}
                                timetables={tts}
                                expandedId={expandedId}
                                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                                onReserve={openReserve}
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
                            {Object.entries(school).map(([key, tts]) => (
                              <GroupCard
                                key={key}
                                title={key}
                                timetables={tts}
                                expandedId={expandedId}
                                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                                onReserve={openReserve}
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
                    {Object.entries(ungrouped).map(([key, tts]) => (
                      <GroupCard
                        key={key}
                        title={key}
                        timetables={tts}
                        expandedId={expandedId}
                        onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                        onReserve={openReserve}
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
    </>
  );
}

function GroupCard({
  title,
  timetables,
  expandedId,
  onToggle,
  onReserve,
  type,
}: {
  title: string;
  timetables: Timetable[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  onReserve: (tt: Timetable) => void;
  type: "teacher" | "school";
}) {
  const firstTt = timetables[0];

  return (
    <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
        {type === "teacher" ? (
          <>
            {firstTt.teacher_image_url ? (
              <img
                src={firstTt.teacher_image_url}
                alt={title}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h4 className="text-base font-bold text-gray-900">{title} 선생님</h4>
              <p className="text-xs text-[#7B2332] font-medium">{firstTt.subject}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded bg-[#7B2332]/5 flex items-center justify-center border border-[#7B2332]/10 overflow-hidden">
              {firstTt.school_logo_url ? (
                <img src={firstTt.school_logo_url} alt={title} className="w-full h-full object-contain" />
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
        {timetables.map((tt) => (
          <div key={tt.id} className="p-4 sm:p-5 hover:bg-gray-50/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#7B2332] flex-shrink-0" />
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

