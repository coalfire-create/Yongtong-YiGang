import { PageLayout } from "@/components/layout";
import { Link } from "wouter";
import { Moon, Clock, BookOpen, CheckCircle, type LucideIcon } from "lucide-react";
import { BannerCarousel } from "@/components/banner-carousel";

const QUICK_MENU_ITEMS: { label: string; sub: string; icon: LucideIcon; path: string }[] = [
  { label: "독학관 안내", sub: "자세히 보기 +", icon: Moon, path: "/owl#info" },
  { label: "이용 방법", sub: "자세히 보기 +", icon: BookOpen, path: "/owl#usage" },
  { label: "운영 시간", sub: "자세히 보기 +", icon: Clock, path: "/owl#hours" },
  { label: "시설 안내", sub: "자세히 보기 +", icon: CheckCircle, path: "/owl#facilities" },
];

function QuickMenuCard({ label, sub, icon: Icon, path }: { label: string; sub: string; icon: LucideIcon; path: string }) {
  return (
    <Link
      href={path}
      className="group relative flex flex-col justify-between p-5 cursor-pointer transition-colors duration-300 overflow-hidden bg-white text-gray-900 border border-gray-200 hover:bg-red-600 hover:border-red-600 hover:text-white"
      data-testid={`card-owl-menu-${label}`}
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

export function Owl() {
  return (
    <PageLayout>
      <section className="px-4 sm:px-6 lg:px-8 py-4 lg:py-6" data-testid="hero-section-owl">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[5px] lg:h-[calc(100vh-100px)] lg:min-h-[480px] lg:max-h-[680px]">
          <div className="aspect-[16/9] lg:aspect-auto lg:h-full">
            <BannerCarousel
              division="owl"
              defaultTitle="올빼미 독학관"
              defaultSubtitle="자기주도 학습"
              defaultDescription="조용하고 쾌적한 환경에서 집중 학습이 가능한 공간"
              className="h-full"
            />
          </div>
          <div className="lg:h-full">
            <div className="grid grid-cols-2 gap-[6px] h-full" data-testid="quick-menu-grid-owl">
              {QUICK_MENU_ITEMS.map((item) => (
                <QuickMenuCard key={item.label} label={item.label} sub={item.sub} icon={item.icon} path={item.path} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div id="info" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white border border-gray-200 p-8" data-testid="card-owl-info">
            <Moon className="w-10 h-10 text-red-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">독학관 안내</h3>
            <p className="text-gray-500 text-sm">조용하고 쾌적한 환경에서 집중 학습이 가능한 자습 공간입니다. 전문 관리 선생님이 상주하여 학습 분위기를 유지합니다.</p>
          </div>
          <div id="usage" className="bg-white border border-gray-200 p-8" data-testid="card-owl-usage">
            <BookOpen className="w-10 h-10 text-red-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">이용 방법</h3>
            <p className="text-gray-500 text-sm">학원 수강생은 무료 이용 가능합니다. 월~토 운영되며, 사전 예약 후 이용해 주세요.</p>
          </div>
        </div>
        <h2 id="hours" className="text-2xl font-bold text-gray-900 mb-6">운영 시간</h2>
        <div className="space-y-3">
          {[
            { day: "평일 (월~금)", time: "15:00 ~ 22:00" },
            { day: "토요일", time: "10:00 ~ 18:00" },
            { day: "일요일·공휴일", time: "휴관" },
          ].map((item) => (
            <div key={item.day} className="flex items-center gap-3 bg-white border border-gray-200 p-5" data-testid={`card-time-${item.day}`}>
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900 min-w-[140px]">{item.day}</span>
              <span className="text-gray-600">{item.time}</span>
            </div>
          ))}
        </div>
        <h2 id="facilities" className="text-2xl font-bold text-gray-900 mt-10 mb-6">시설 안내</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {["개인 독서실 좌석 80석", "냉·난방 완비", "무료 Wi-Fi", "정수기·간식 코너", "CCTV 안전 관리", "전문 관리 선생님 상주"].map((feat) => (
            <div key={feat} className="flex items-center gap-3 bg-white border border-gray-200 p-4">
              <CheckCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

export function OwlInfo() {
  return <Owl />;
}

export function OwlUsage() {
  return <Owl />;
}
