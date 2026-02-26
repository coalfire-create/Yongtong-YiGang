import { SectionPage, PageLayout } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, type LucideIcon } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { BannerCarousel } from "@/components/banner-carousel";
import { SummaryTimetableSection } from "@/components/summary-timetable";

const JUNIOR_SUBJECTS = ["수학", "국어", "영어", "탐구"];

const QUICK_MENU_ITEMS: { label: string; sub: string; icon: LucideIcon; path: string }[] = [
  { label: "강사 소개", sub: "자세히 보기 +", icon: Users, path: "/junior-school/teachers" },
  { label: "초/중등부 과정", sub: "자세히 보기 +", icon: Calendar, path: "/junior-school/schedule" },
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
      data-testid={`card-junior-menu-${label}`}
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

export function JuniorSchool() {
  return (
    <PageLayout>
      <section className="px-3 sm:px-5 lg:px-6 py-3 lg:py-5" data-testid="hero-section-junior">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-2.5 sm:gap-3 lg:h-[calc(100vh-100px)] lg:min-h-[520px] lg:max-h-[720px]">
          <div className="aspect-[16/9] lg:aspect-auto lg:h-full">
            <BannerCarousel
              division="junior"
              defaultTitle="초/중등관"
              defaultSubtitle="수학 전문 과정"
              defaultDescription="기초부터 심화까지, 체계적인 수학 학습을 시작하세요"
              className="h-full"
            />
          </div>
          <div className="lg:h-full">
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 h-full" data-testid="quick-menu-grid-junior">
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

export function JuniorSchoolSchedule() {
  return (
    <SectionPage title="초/중등관 강의시간표">
      <TimetableGallery category="초/중등관" />
      <div className="mt-10">
        <SummaryTimetableSection division="junior" title="초/중등관 요약시간표" />
      </div>
    </SectionPage>
  );
}

export function JuniorSchoolTeachers() {
  return <TeacherIntroPage division="초/중등관" subjects={JUNIOR_SUBJECTS} />;
}
