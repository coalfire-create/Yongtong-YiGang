import { PageLayout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { Calendar, Users, ArrowLeft, type LucideIcon } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { BannerCarousel } from "@/components/banner-carousel";

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

function SchedulePageLayout({ grade, category, color }: { grade: string; category: string; color: string }) {
  const [location] = useLocation();

  const colorMap: Record<string, { gradient: string; accent: string; badge: string }> = {
    rose: { gradient: "from-rose-600 via-rose-700 to-[#7B2332]", accent: "text-rose-400", badge: "bg-rose-500/20 text-rose-300" },
    crimson: { gradient: "from-red-600 via-red-700 to-[#7B2332]", accent: "text-red-400", badge: "bg-red-500/20 text-red-300" },
    maroon: { gradient: "from-[#7B2332] via-[#8B3040] to-[#6B1D2A]", accent: "text-rose-300", badge: "bg-rose-500/20 text-rose-200" },
  };

  const c = colorMap[color] || colorMap.rose;

  return (
    <PageLayout>
      <div className={`bg-gradient-to-r ${c.gradient} text-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <Link
            href="/high-school"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-4"
            data-testid="link-back-high"
          >
            <ArrowLeft className="w-4 h-4" />
            고등관
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-sm ${c.badge}`}>
              {grade}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold" data-testid="text-page-title">
            {grade} 시간표
          </h1>
          <div className="mt-3 w-12 h-1 bg-white/40 rounded-full" />
        </div>
      </div>

      <div className="bg-gray-50 min-h-[50vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 -mt-5 mb-8">
            {GRADE_TABS.map((tab) => {
              const isActive = location === tab.path;
              return (
                <Link
                  key={tab.label}
                  href={tab.path}
                  className={`px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200 border-b-0"
                      : "bg-white/60 text-gray-500 hover:bg-white hover:text-gray-700 border border-transparent"
                  }`}
                  data-testid={`tab-${tab.label}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="pb-16">
            <TimetableGallery category={category} />
          </div>
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
    </PageLayout>
  );
}

export function HighSchoolSchedule() {
  return <SchedulePageLayout grade="전체" category="고등관" color="rose" />;
}

export function HighSchoolScheduleG1() {
  return <SchedulePageLayout grade="고1" category="고등관-고1" color="rose" />;
}

export function HighSchoolScheduleG2() {
  return <SchedulePageLayout grade="고2" category="고등관-고2" color="crimson" />;
}

export function HighSchoolScheduleG3() {
  return <SchedulePageLayout grade="고3" category="고등관-고3" color="maroon" />;
}

export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
