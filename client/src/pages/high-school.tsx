import { PageLayout } from "@/components/layout";
import { SectionPage } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, ChevronRight } from "lucide-react";
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

          <div className="mt-12 bg-white border border-gray-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6" data-testid="text-course-title">과정 안내</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { grade: "고1", desc: "내신 대비 + 수능 기초 완성", color: "border-blue-400 bg-blue-50", textColor: "text-blue-600" },
                { grade: "고2", desc: "수능 실전 + 모의고사 집중 분석", color: "border-emerald-400 bg-emerald-50", textColor: "text-emerald-600" },
                { grade: "고3", desc: "수능 파이널 + 실전 모의 훈련", color: "border-violet-400 bg-violet-50", textColor: "text-violet-600" },
              ].map((c) => (
                <div key={c.grade} className={`border-l-4 ${c.color} p-5`} data-testid={`card-course-${c.grade}`}>
                  <span className={`text-2xl font-extrabold ${c.textColor}`}>{c.grade}</span>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export function HighSchoolSchedule() {
  return (
    <SectionPage title="고등관 강의시간표" subtitle="고등부 전 학년 강의 시간표">
      <TimetableGallery category="고등관" />
    </SectionPage>
  );
}

export function HighSchoolScheduleG1() {
  return (
    <SectionPage title="고1 시간표" subtitle="고등관 고1 강의 시간표">
      <TimetableGallery category="고등관-고1" />
    </SectionPage>
  );
}

export function HighSchoolScheduleG2() {
  return (
    <SectionPage title="고2 시간표" subtitle="고등관 고2 강의 시간표">
      <TimetableGallery category="고등관-고2" />
    </SectionPage>
  );
}

export function HighSchoolScheduleG3() {
  return (
    <SectionPage title="고3 시간표" subtitle="고등관 고3 강의 시간표">
      <TimetableGallery category="고등관-고3" />
    </SectionPage>
  );
}

export function HighSchoolTeachers() {
  return <TeacherIntroPage division="고등관" subjects={HIGH_SCHOOL_SUBJECTS} />;
}
