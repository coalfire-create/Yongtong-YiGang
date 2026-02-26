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
      <SummaryTimetableSection division="junior" title="초/중등관 요약시간표" />
    </PageLayout>
  );
}

export function JuniorSchoolSchedule() {
  return (
    <SectionPage title="초/중등관 강의시간표">
      <TimetableGallery category="초/중등관" />
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">중등부 시간표</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="table-schedule-middle">
            <thead>
              <tr className="bg-[#7B2332] text-white">
                <th className="py-3 px-4 text-sm font-semibold text-left border border-[#7B2332]">시간</th>
                {["월", "화", "수", "목", "금", "토"].map((d) => (
                  <th key={d} className="py-3 px-4 text-sm font-semibold text-center border border-[#7B2332]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { time: "16:00~17:30", mon: "중1 수학", tue: "중2 수학", wed: "중1 수학", thu: "중2 수학", fri: "중1 수학", sat: "중3 심화" },
                { time: "18:00~19:30", mon: "중3 수학", tue: "중1 심화", wed: "중3 수학", thu: "중1 심화", fri: "중3 수학", sat: "중3 심화" },
                { time: "20:00~21:30", mon: "중3 선행", tue: "중2 심화", wed: "중3 선행", thu: "중2 심화", fri: "중3 선행", sat: "" },
              ].map((row) => (
                <tr key={row.time} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 whitespace-nowrap">{row.time}</td>
                  {[row.mon, row.tue, row.wed, row.thu, row.fri, row.sat].map((cell, i) => (
                    <td key={i} className={`py-3 px-4 text-sm text-center border border-gray-200 ${cell ? "text-gray-800 font-medium" : "text-gray-300"}`}>{cell || "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">초등부 시간표</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="table-schedule-elementary">
            <thead>
              <tr className="bg-[#7B2332] text-white">
                <th className="py-3 px-4 text-sm font-semibold text-left border border-[#7B2332]">시간</th>
                {["월", "화", "수", "목", "금", "토"].map((d) => (
                  <th key={d} className="py-3 px-4 text-sm font-semibold text-center border border-[#7B2332]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { time: "15:00~16:00", mon: "초4 수학", tue: "초5 수학", wed: "초4 수학", thu: "초5 수학", fri: "초4 수학", sat: "초6 심화" },
                { time: "16:30~17:30", mon: "초6 수학", tue: "초4 심화", wed: "초6 수학", thu: "초4 심화", fri: "초6 수학", sat: "초6 심화" },
              ].map((row) => (
                <tr key={row.time} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 whitespace-nowrap">{row.time}</td>
                  {[row.mon, row.tue, row.wed, row.thu, row.fri, row.sat].map((cell, i) => (
                    <td key={i} className={`py-3 px-4 text-sm text-center border border-gray-200 ${cell ? "text-gray-800 font-medium" : "text-gray-300"}`}>{cell || "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-400">* 시간표는 학원 사정에 따라 변경될 수 있습니다.</p>
      </div>
    </SectionPage>
  );
}

export function JuniorSchoolTeachers() {
  return <TeacherIntroPage division="초/중등관" subjects={JUNIOR_SUBJECTS} />;
}
