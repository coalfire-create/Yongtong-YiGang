import { SectionPage, PageLayout } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Users, type LucideIcon } from "lucide-react";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { BannerCarousel } from "@/components/banner-carousel";
import { SummaryTimetableSection } from "@/components/summary-timetable";

const JUNIOR_SUBJECTS = ["국어", "영어", "수학", "과학", "사회/역사"];

const QUICK_MENU_ITEMS: { label: string; sub: string; icon: LucideIcon; path: string }[] = [
  { label: "강사 소개", sub: "자세히 보기 +", icon: Users, path: "/junior-school/teachers" },
  { label: "초/중등부 과정", sub: "자세히 보기 +", icon: Calendar, path: "/junior-school/schedule" },
];

function QuickMenuCard({ label, sub, icon: Icon, path }: { label: string; sub: string; icon: LucideIcon; path: string }) {
  return (
    <Link
      href={path}
      className="group relative flex flex-col justify-between p-5 cursor-pointer transition-colors duration-300 overflow-hidden bg-white text-gray-900 border border-gray-200 hover:bg-red-600 hover:border-red-600 hover:text-white"
      data-testid={`card-junior-menu-${label}`}
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

export function JuniorSchool() {
  return (
    <PageLayout>
      <section className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6" data-testid="hero-section-junior">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[5px] lg:h-[calc(100vh-100px)] lg:min-h-[480px] lg:max-h-[680px]">
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
            <div className="grid grid-cols-1 gap-[6px] h-full" data-testid="quick-menu-grid-junior">
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
