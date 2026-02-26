import { PageLayout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { Calendar, Users, type LucideIcon } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { BannerCarousel } from "@/components/banner-carousel";
import { SummaryTimetableSection } from "@/components/summary-timetable";

const HIGH_SCHOOL_SUBJECTS = ["국어", "영어", "수학", "과학", "사회/한국사", "제2외국어"];

const QUICK_MENU_ITEMS: { label: string; sub: string; icon: LucideIcon; path: string }[] = [
  { label: "강사 소개", sub: "자세히 보기 +", icon: Users, path: "/high-school/teachers" },
  { label: "고1 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/high-school/schedule/g1" },
  { label: "고2 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/high-school/schedule/g2" },
  { label: "고3 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/high-school/schedule/g3" },
];

const GRADE_TABS = [
  { label: "고1", path: "/high-school/schedule/g1", color: "rose" },
  { label: "고2", path: "/high-school/schedule/g2", color: "crimson" },
  { label: "고3", path: "/high-school/schedule/g3", color: "maroon" },
];

function QuickMenuCard({ label, sub, icon: Icon, path }: { label: string; sub: string; icon: LucideIcon; path: string }) {
  return (
    <Link
      href={path}
      className="group relative flex flex-col justify-between p-5 cursor-pointer transition-colors duration-300 overflow-hidden bg-white text-gray-900 border border-gray-200 hover:bg-red-600 hover:border-red-600 hover:text-white"
      data-testid={`card-high-menu-${label}`}
    >
      <div className="relative z-10">
        <p className="text-[11px] font-bold tracking-widest uppercase mb-1 transition-colors duration-300 text-gray-400 group-hover:text-white/80">
          CLASS
        </p>
        <h3 className="text-lg font-extrabold leading-tight transition-colors duration-300 text-gray-900 group-hover:text-white">
          {label}
        </h3>
        <p className="text-xs mt-1.5 font-medium transition-colors duration-300 text-gray-400 group-hover:text-white/80">
          {sub}
        </p>
      </div>
      <div className="absolute bottom-3 right-3 z-0">
        <Icon className="w-12 h-12 transition-colors duration-300 text-gray-200 group-hover:text-white/30" strokeWidth={1.5} />
      </div>
    </Link>
  );
}

function SchedulePageLayout({ grade, category, summaryDivision }: { grade: string; category: string; color?: string; summaryDivision?: string }) {
  const [location] = useLocation();

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
          <TimetableGallery category={category} />
          {summaryDivision && (
            <div className="mt-10">
              <SummaryTimetableSection division={summaryDivision} title={`${grade} 요약시간표`} />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export function HighSchool() {
  return (
    <PageLayout>
      <section className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6" data-testid="hero-section-high">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[5px] lg:h-[calc(100vh-100px)] lg:min-h-[480px] lg:max-h-[680px]">
          <div className="aspect-[16/9] lg:aspect-auto lg:h-full">
            <BannerCarousel
              division="high"
              defaultTitle="고등관"
              defaultSubtitle="수능·내신 완벽 대비"
              defaultDescription="체계적인 커리큘럼과 실력 있는 강사진이 함께합니다"
              className="h-full"
            />
          </div>
          <div className="lg:h-full">
            <div className="grid grid-cols-2 gap-[6px] h-full" data-testid="quick-menu-grid-high">
              {QUICK_MENU_ITEMS.map((item) => (
                <QuickMenuCard key={item.label} label={item.label} sub={item.sub} icon={item.icon} path={item.path} />
              ))}
            </div>
          </div>
        </div>
      </section>
      <SummaryTimetableSection division="high-g1" title="고1 요약시간표" />
      <SummaryTimetableSection division="high-g2" title="고2 요약시간표" />
      <SummaryTimetableSection division="high-g3" title="고3 요약시간표" />
    </PageLayout>
  );
}

export function HighSchoolSchedule() {
  return <SchedulePageLayout grade="전체" category="고등관" color="rose" />;
}

export function HighSchoolScheduleG1() {
  return <SchedulePageLayout grade="고1" category="고등관-고1" color="rose" summaryDivision="high-g1" />;
}

export function HighSchoolScheduleG2() {
  return <SchedulePageLayout grade="고2" category="고등관-고2" color="crimson" summaryDivision="high-g2" />;
}

export function HighSchoolScheduleG3() {
  return <SchedulePageLayout grade="고3" category="고등관-고3" color="maroon" summaryDivision="high-g3" />;
}

export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
