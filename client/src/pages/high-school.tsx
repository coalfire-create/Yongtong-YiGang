import { PageLayout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { Calendar, Users, TrendingUp, type LucideIcon } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { BannerCarousel } from "@/components/banner-carousel";
import { SummaryTimetableSection } from "@/components/summary-timetable";
import { useQuery } from "@tanstack/react-query";

const HIGH_SCHOOL_SUBJECTS = ["수학", "국어", "영어", "탐구"];

const QUICK_MENU_ITEMS: { label: string; sub: string; icon: LucideIcon; path: string }[] = [
  { label: "수학스쿨", sub: "성적을 만드는 시스템 +", icon: TrendingUp, path: "/math-school" },
  { label: "고1 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/high-school/schedule/g1" },
  { label: "고2 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/high-school/schedule/g2" },
  { label: "고3 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/high-school/schedule/g3" },
];

const GRADE_TABS = [
  { label: "고1", path: "/high-school/schedule/g1", color: "rose" },
  { label: "고2", path: "/high-school/schedule/g2", color: "crimson" },
  { label: "고3", path: "/high-school/schedule/g3", color: "maroon" },
];

function QuickMenuCard({
  label,
  sub,
  icon: Icon,
  path,
}: {
  label: string;
  sub: string;
  icon: LucideIcon;
  path: string;
}) {
  return (
    <Link
      href={path}
      className="group relative flex flex-col justify-between p-5 sm:p-6 cursor-pointer transition-all duration-300 overflow-hidden border border-gray-200 hover:border-[#7B2332] bg-white hover:bg-[#7B2332]"
      data-testid={`card-high-menu-${label}`}
    >
      <div className="relative z-10">
        <p className="text-[11px] font-bold tracking-[0.15em] uppercase mb-2 transition-colors duration-300 text-gray-400 group-hover:text-white/70">
          CLASS
        </p>
        <h3 className="text-xl sm:text-2xl font-extrabold leading-tight transition-colors duration-300 text-gray-900 group-hover:text-white">
          {label}
        </h3>
        <p className="text-xs sm:text-sm mt-2 font-medium transition-colors duration-300 text-gray-400 group-hover:text-white/70">
          {sub}
        </p>
      </div>
      <div className="absolute bottom-4 right-4 z-0">
        <Icon
          className="w-14 h-14 sm:w-16 sm:h-16 transition-colors duration-300 text-gray-200 group-hover:text-white/20"
          strokeWidth={1.2}
        />
      </div>
    </Link>
  );
}

interface FilterTab {
  label: string;
  filterFn: (tt: any) => boolean;
  isSummary?: boolean;
}

const isNonsul = (tt: any) =>
  (tt.class_name || "").includes("논술") ||
  (tt.subject || "").includes("논술") ||
  (tt.target_school || "") === "논술";

const SCIENCE_SUBJECTS = ["통합과학", "통과", "물리", "화학", "생명", "지구", "탐구", "생명과학", "지구과학", "물리학", "과학탐구"];

const isScienceSubject = (tt: any) => {
  const subj = (tt.subject || "").trim();
  const cn = (tt.class_name || "").trim();
  return SCIENCE_SUBJECTS.some(s => subj.includes(s) || cn.includes(s));
};

function buildFilterFn(label: string): (tt: any) => boolean {
  if (label === "전체시간표" || label === "전체") return () => true;
  if (label === "썸머시간표" || label === "요약시간표") return () => false;
  if (label === "논술") return (tt) => isNonsul(tt);
  if (label === "수학/탐구") return (tt) => ["수학", "탐구", "통합과학", "통합사회/한국사", "물리", "화학", "생명", "생명과학", "지구과학", "지구", "물리학", "과학탐구"].includes(tt.subject) && !isNonsul(tt);
  
  const SUBJECTS = ["국어", "영어", "수학", "탐구", "통합과학", "통합사회/한국사", "생명과학", "사회문화", "생윤"];
  if (SUBJECTS.includes(label)) {
    return (tt) =>
      !isNonsul(tt) && (
        tt.subject === label ||
        (tt.target_school || "") === label ||
        (tt.subject || "").includes(label) ||
        (tt.class_name || "").includes(label)
      );
  }

  return (tt) => {
    if (isNonsul(tt)) return false;

    // 만약 고2 과탐 과목이라면 모든 학교 필터에 노출되도록 true 반환
    if (tt.category === "고등관-고2" && isScienceSubject(tt)) {
      return true;
    }

    // G2 조기수능반 학교별 노출 예외 필터링 규칙
    const isG2EarlyCsat = tt.category === "고등관-고2" && (tt.class_name || "").includes("조기수능");
    if (isG2EarlyCsat) {
      const teacher = tt.teacher_name || "";
      if (label === "가온고") {
        // 양준민(영어), 손자은(국어) -> 가온고 필터에만 노출
        return teacher.includes("양준민") || teacher.includes("손자은");
      } else {
        // 문브라더스(영어), 김현종(국어) -> 가온고 제외 다른 학교 필터에 노출
        const isSchoolFilter = ["화성고", "영덕고", "청명고", "수원고", "고색고", "동탄국제고", "병점고"].includes(label);
        if (isSchoolFilter) {
          return teacher.includes("문브라더스") || teacher.includes("김현종");
        }
      }
      return false;
    }

    return (tt.target_school || "").includes(label) || (tt.class_name || "").includes(label);
  };
}

function buildFilterTabs(apiTabs: { id: number; label: string }[], category?: string): FilterTab[] {
  return apiTabs.map((tab) => {
    let displayLabel = tab.label;
    if (tab.label === "기말/내신시간표" && (category === "고등관-고1" || category === "고등관-고2")) {
      displayLabel = "중간/내신시간표";
    }
    return {
      label: displayLabel,
      filterFn: buildFilterFn(tab.label),
      isSummary: displayLabel === "썸머시간표" || displayLabel === "요약시간표" || displayLabel === "기말/내신시간표" || displayLabel === "중간/내신시간표",
    };
  });
}

const G1_FILTERS_DEFAULT: FilterTab[] = [
  { label: "썸머시간표", filterFn: buildFilterFn("썸머시간표"), isSummary: true },
  { label: "전체시간표", filterFn: buildFilterFn("전체시간표") },
  { label: "화성고", filterFn: buildFilterFn("화성고") },
  { label: "가온고", filterFn: buildFilterFn("가온고") },
  { label: "병점고", filterFn: buildFilterFn("병점고") },
  { label: "영덕고", filterFn: buildFilterFn("영덕고") },
  { label: "수원고", filterFn: buildFilterFn("수원고") },
  { label: "청명고", filterFn: buildFilterFn("청명고") },
  { label: "통합과학", filterFn: buildFilterFn("통합과학") },
  { label: "통합사회/한국사", filterFn: buildFilterFn("통합사회/한국사") },
  { label: "수학/탐구", filterFn: buildFilterFn("수학/탐구") },
];

const G2_FILTERS_DEFAULT: FilterTab[] = [
  { label: "썸머시간표", filterFn: buildFilterFn("썸머시간표"), isSummary: true },
  { label: "전체시간표", filterFn: buildFilterFn("전체시간표") },
  { label: "화성고", filterFn: buildFilterFn("화성고") },
  { label: "가온고", filterFn: buildFilterFn("가온고") },
  { label: "병점고", filterFn: buildFilterFn("병점고") },
  { label: "영덕고", filterFn: buildFilterFn("영덕고") },
  { label: "수원고", filterFn: buildFilterFn("수원고") },
  { label: "청명고", filterFn: buildFilterFn("청명고") },
  { label: "통합과학", filterFn: buildFilterFn("통합과학") },
  { label: "통합사회/한국사", filterFn: buildFilterFn("통합사회/한국사") },
  { label: "수학/탐구", filterFn: buildFilterFn("수학/탐구") },
];

const G3_FILTERS_DEFAULT: FilterTab[] = [
  { label: "썸머시간표", filterFn: () => false, isSummary: true },
  { label: "전체", filterFn: () => true },
  { label: "국어", filterFn: (tt) => !isNonsul(tt) && (tt.subject === "국어" || (tt.target_school || "") === "국어") },
  { label: "영어", filterFn: (tt) => !isNonsul(tt) && (tt.subject === "영어" || (tt.target_school || "") === "영어") },
  { label: "수학", filterFn: (tt) => !isNonsul(tt) && (tt.subject === "수학" || (tt.target_school || "") === "수학") },
  { label: "생명과학", filterFn: (tt) => !isNonsul(tt) && ((tt.target_school || "") === "생명과학" || (tt.subject || "").includes("생명") || (tt.class_name || "").includes("생명")) },
  { label: "사회문화", filterFn: (tt) => !isNonsul(tt) && ((tt.target_school || "") === "사회문화" || (tt.subject || "").includes("사회") || (tt.class_name || "").includes("사회문화")) },
  { label: "생윤", filterFn: (tt) => !isNonsul(tt) && ((tt.target_school || "") === "생윤" || (tt.subject || "").includes("생윤") || (tt.class_name || "").includes("생윤") || (tt.class_name || "").includes("생활과윤리")) },
  { label: "논술", filterFn: (tt) => isNonsul(tt) },
];

// (DONGTAN_FILTERS_DEFAULT removed)

function SchedulePageLayout({ grade, category, summaryDivision, filterTabs: defaultFilterTabs }: { grade: string; category: string; color?: string; summaryDivision?: string; filterTabs?: FilterTab[] }) {
  const [location] = useLocation();

  const { data: apiTabs } = useQuery<{ id: number; label: string; category: string; display_order: number }[]>({
    queryKey: ["/api/filter-tabs", category],
    queryFn: async () => {
      const res = await fetch(`/api/filter-tabs?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("Failed to fetch filter tabs");
      return res.json();
    },
    enabled: !!category,
  });

  const filteredApiTabs = apiTabs && category === "고등관-고1"
    ? apiTabs.filter((tab) => tab.label !== "동탄국제고")
    : apiTabs;

  const filterTabs = filteredApiTabs && filteredApiTabs.length > 0 ? buildFilterTabs(filteredApiTabs, category) : defaultFilterTabs;

  return (
    <PageLayout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight" data-testid="text-page-title">
            {grade} 강의시간표
          </h1>
        </div>
      </div>

      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center border-b border-gray-200">
            {GRADE_TABS.map((tab) => {
              const isActive = location === tab.path;
              return (
                <Link
                  key={tab.label}
                  href={tab.path}
                  className={`px-8 py-3.5 text-sm font-bold transition-all duration-200 border-b-2 ${
                    isActive
                      ? "text-gray-900 border-gray-900"
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

      <div className="bg-gray-50 min-h-[50vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <TimetableGallery
            category={category}
            filterTabs={filterTabs}
            summaryDivision={summaryDivision}
            summaryTitle={summaryDivision ? `${grade} 썸머시간표` : undefined}
          />
        </div>
      </div>
    </PageLayout>
  );
}

export function HighSchool() {
  return (
    <PageLayout>
      <section className="lg:px-6 lg:py-5" data-testid="hero-section-high">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] lg:gap-3 lg:h-[calc(100vh-100px)] lg:min-h-[520px] lg:max-h-[720px]">
          <div className="w-full lg:h-full">
            <BannerCarousel
              division="high"
              defaultTitle="고등관"
              defaultSubtitle="수능·내신 완벽 대비"
              defaultDescription="체계적인 커리큘럼과 실력 있는 강사진이 함께합니다"
              className="h-full"
            />
          </div>
          <div className="px-3 py-3 sm:px-5 lg:px-0 lg:py-0 lg:h-full">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 h-full" data-testid="quick-menu-grid-high">
              {QUICK_MENU_ITEMS.map((item) => (
                <QuickMenuCard key={item.label} label={item.label} sub={item.sub} icon={item.icon} path={item.path} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

export function HighSchoolSchedule() {
  return <SchedulePageLayout grade="전체" category="고등관" color="rose" />;
}

export function HighSchoolScheduleG1() {
  return <SchedulePageLayout grade="고1" category="고등관-고1" color="rose" summaryDivision="high-g1" filterTabs={G1_FILTERS_DEFAULT} />;
}

export function HighSchoolScheduleG2() {
  return <SchedulePageLayout grade="고2" category="고등관-고2" color="crimson" summaryDivision="high-g2" filterTabs={G2_FILTERS_DEFAULT} />;
}

export function HighSchoolScheduleG3() {
  return <SchedulePageLayout grade="고3" category="고등관-고3" color="maroon" summaryDivision="high-g3" filterTabs={G3_FILTERS_DEFAULT} />;
}



export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
