import { PageLayout } from "@/components/layout";
import { Link, useLocation } from "wouter";
import { Calendar, Users, ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";

const HIGH_SCHOOL_SUBJECTS = ["국어", "영어", "수학", "과학", "사회/한국사", "제2외국어"];

const NAV_ITEMS = [
  {
    label: "강사 소개",
    desc: "고등부 전문 강사진을 만나보세요",
    icon: Users,
    path: "/high-school/teachers",
    accent: "from-red-600 to-amber-500",
    iconBg: "bg-red-600/20",
  },
  {
    label: "고1 시간표",
    desc: "고1 정규 · 특강 수업 시간표",
    icon: Calendar,
    path: "/high-school/schedule/g1",
    accent: "from-rose-500 to-pink-500",
    iconBg: "bg-rose-500/20",
  },
  {
    label: "고2 시간표",
    desc: "고2 정규 · 특강 수업 시간표",
    icon: Calendar,
    path: "/high-school/schedule/g2",
    accent: "from-rose-600 to-red-500",
    iconBg: "bg-rose-600/20",
  },
  {
    label: "고3 시간표",
    desc: "고3 정규 · 특강 · 파이널 시간표",
    icon: Calendar,
    path: "/high-school/schedule/g3",
    accent: "from-rose-700 to-rose-500",
    iconBg: "bg-rose-700/20",
  },
];

const GRADE_TABS = [
  { label: "고1", path: "/high-school/schedule/g1", color: "rose" },
  { label: "고2", path: "/high-school/schedule/g2", color: "crimson" },
  { label: "고3", path: "/high-school/schedule/g3", color: "maroon" },
];

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
      <div className="relative bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="text-rose-300/80 text-xs font-bold tracking-[0.2em] uppercase mb-2" data-testid="text-high-label">
            High School
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="text-page-title">
            고등관
          </h1>
          <div className="mt-3 w-12 h-1 bg-white/40 rounded-full" />
        </div>
      </div>

      <div className="bg-gray-50 min-h-[50vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.path}
                className="group relative bg-white border border-gray-200 p-6 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden"
                data-testid={`card-high-${item.path.split("/").pop()}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className={`w-12 h-12 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                  <item.icon className="w-6 h-6 text-gray-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-red-600 transition-colors">
                  자세히 보기
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
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
