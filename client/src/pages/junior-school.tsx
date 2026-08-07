import { SectionPage, PageLayout } from "@/components/layout";
import { Link } from "wouter";
import { Calendar, Sparkles, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TimetableGallery } from "@/components/timetable-gallery";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { BannerCarousel } from "@/components/banner-carousel";
import { buildFilterFn, buildFilterTabs, type FilterTab } from "@/pages/high-school";

const JUNIOR_SUBJECTS = ["수학", "국어", "영어", "탐구"];

const JUNIOR_CATEGORY = "초/중등관";

const JUNIOR_FILTERS_DEFAULT: FilterTab[] = [
  { label: "2학기 중간 내신시간표", filterFn: buildFilterFn("2학기 중간 내신시간표"), isSummary: true },
  { label: "전체시간표", filterFn: buildFilterFn("전체시간표") },
  { label: "초&중등 수학", filterFn: buildFilterFn("초&중등 수학") },
  { label: "고등과정 수학", filterFn: buildFilterFn("고등과정 수학") },
  { label: "탐구", filterFn: buildFilterFn("탐구") },
];

const QUICK_MENU_ITEMS: { label: string; sub: string; icon: LucideIcon; path: string }[] = [
  { label: "초/중등부 시간표", sub: "자세히 보기 +", icon: Calendar, path: "/junior-school/schedule" },
  { label: "프리미엄 학습 시스템", sub: "자세히 보기 +", icon: Sparkles, path: "/junior-school/premium-system" },
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
      <section className="lg:px-6 lg:py-5" data-testid="hero-section-junior">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] lg:gap-3 lg:h-[calc(100vh-100px)] lg:min-h-[520px] lg:max-h-[720px]">
          <div className="w-full lg:h-full">
            <BannerCarousel
              division="junior"
              className="h-full"
            />
          </div>
          <div className="px-3 py-3 sm:px-5 lg:px-0 lg:py-0 lg:h-full">
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
  const { data: apiTabs } = useQuery<{ id: number; label: string; category: string; display_order: number; is_visible: boolean }[]>({
    queryKey: ["/api/filter-tabs", JUNIOR_CATEGORY],
    queryFn: async () => {
      const res = await fetch(`/api/filter-tabs?category=${encodeURIComponent(JUNIOR_CATEGORY)}`);
      if (!res.ok) throw new Error("Failed to fetch filter tabs");
      return res.json();
    },
  });

  const filteredApiTabs = apiTabs?.filter((tab) => tab.is_visible !== false);
  const filterTabs = filteredApiTabs && filteredApiTabs.length > 0 ? buildFilterTabs(filteredApiTabs, JUNIOR_CATEGORY) : JUNIOR_FILTERS_DEFAULT;

  return (
    <SectionPage title="초/중등관 강의시간표">
      <TimetableGallery
        category={JUNIOR_CATEGORY}
        filterTabs={filterTabs}
        summaryDivision="junior"
        summaryTitle="초/중등관 기말/내신 시간표"
      />
    </SectionPage>
  );
}

export function JuniorSchoolTeachers() {
  return <TeacherIntroPage division="초/중등관" subjects={JUNIOR_SUBJECTS} />;
}
