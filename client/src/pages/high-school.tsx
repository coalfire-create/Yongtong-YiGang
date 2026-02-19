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
    accent: "from-orange-500 to-amber-500",
    iconBg: "bg-orange-500/20",
  },
  {
    label: "고1 시간표",
    desc: "고1 정규 · 특강 수업 시간표",
    icon: Calendar,
    path: "/high-school/schedule/g1",
    accent: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-500/20",
  },
  {
    label: "고2 시간표",
    desc: "고2 정규 · 특강 수업 시간표",
    icon: Calendar,
    path: "/high-school/schedule/g2",
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-500/20",
  },
  {
    label: "고3 시간표",
    desc: "고3 정규 · 특강 · 파이널 시간표",
    icon: Calendar,
    path: "/high-school/schedule/g3",
    accent: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-500/20",
  },
];

const GRADE_TABS = [
  { label: "고1", path: "/high-school/schedule/g1", color: "blue" },
  { label: "고2", path: "/high-school/schedule/g2", color: "emerald" },
  { label: "고3", path: "/high-school/schedule/g3", color: "violet" },
];

function SchedulePageLayout({ grade, category, color }: { grade: string; category: string; color: string }) {
  const [location] = useLocation();

  const colorMap: Record<string, { gradient: string; accent: string; badge: string }> = {
    blue: { gradient: "from-blue-600 via-blue-700 to-[#1B2A4A]", accent: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
    emerald: { gradient: "from-emerald-600 via-emerald-700 to-[#1B2A4A]", accent: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
    violet: { gradient: "from-violet-600 via-violet-700 to-[#1B2A4A]", accent: "text-violet-400", badge: "bg-violet-500/20 text-violet-300" },
  };

  const c = colorMap[color] || colorMap.blue;

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
          <p className="mt-2 text-white/50 text-sm sm:text-base" data-testid="text-page-subtitle">
            고등관 {grade} 강의 시간표를 확인하세요
          </p>
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
      <div className="bg-gradient-to-br from-[#1B2A4A] via-[#243558] to-[#1a2844] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <p className="text-orange-400 text-sm font-bold tracking-widest uppercase mb-2" data-testid="text-high-label">
            High School
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight" data-testid="text-page-title">
            고등관
          </h1>
          <p className="mt-3 text-white/60 text-base sm:text-lg max-w-lg" data-testid="text-page-subtitle">
            체계적인 커리큘럼과 실력 있는 강사진으로 수능과 내신을 완벽하게 대비합니다.
          </p>
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
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-500 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-orange-500 transition-colors">
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
  return <SchedulePageLayout grade="전체" category="고등관" color="blue" />;
}

export function HighSchoolScheduleG1() {
  return <SchedulePageLayout grade="고1" category="고등관-고1" color="blue" />;
}

export function HighSchoolScheduleG2() {
  return <SchedulePageLayout grade="고2" category="고등관-고2" color="emerald" />;
}

export function HighSchoolScheduleG3() {
  return <SchedulePageLayout grade="고3" category="고등관-고3" color="violet" />;
}

export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
