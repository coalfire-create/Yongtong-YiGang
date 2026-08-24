import { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Users, Calendar, Image, CalendarDays, Megaphone, Star, Trophy, MessageSquare, ListOrdered, BookOpen, X } from "lucide-react";

export type AdminTab = 
  | "teachers" 
  | "timetables" 
  | "summary-timetables" 
  | "admissions-posters" 
  | "banners" 
  | "popups" 
  | "briefings" 
  | "sms" 
  | "level-test" 
  | "reviews" 
  | "reservations" 
  | "filter-tabs" 
  | "notices" 
  | "summer" 
  | "schools" 
  | "briefing-events" 
  | "navigation" 
  | "middle-school";

interface LayoutProps {
  children: ReactNode;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

function SidebarButton({
  id,
  icon: Icon,
  label,
  tab,
  setTab,
  setMobileMenuOpen,
}: {
  id: AdminTab;
  icon: React.ElementType;
  label: string;
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        setTab(id);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        tab === id
          ? "bg-red-600/10 text-red-500"
          : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

export function AdminLayout({ children, activeTab, onTabChange, mobileMenuOpen, setMobileMenuOpen }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">이강학원 관리자</h1>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full md:w-64 bg-gray-900 text-gray-300 md:min-h-screen flex-shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto ${mobileMenuOpen ? 'block' : 'hidden md:block'} transition-all z-40 shadow-xl`}>
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-gray-800">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">관리자 대시보드</h1>
        </div>
        <div className="p-4 space-y-8">
           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">인물 및 수업</div>
             <div className="space-y-1">
               <SidebarButton id="teachers" icon={Users} label="선생님 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="timetables" icon={Calendar} label="정규 시간표" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="summary-timetables" icon={Image} label="중간/기말 시간표" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">특강 및 설명회</div>
             <div className="space-y-1">
               <SidebarButton id="summer" icon={Image} label="썸머 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="briefings" icon={CalendarDays} label="설명회 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="briefing-events" icon={CalendarDays} label="설명회 캘린더" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="level-test" icon={BookOpen} label="수학레벨테스트" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="reservations" icon={CalendarDays} label="수강예약 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">콘텐츠 및 운영</div>
             <div className="space-y-1">
               <SidebarButton id="banners" icon={Image} label="배너 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="popups" icon={Megaphone} label="팝업 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="notices" icon={Megaphone} label="공지사항" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="reviews" icon={Star} label="합격후기" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="admissions-posters" icon={Trophy} label="입시실적 포스터" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="middle-school" icon={Image} label="중3 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">시스템 설정</div>
             <div className="space-y-1">
               <SidebarButton id="sms" icon={MessageSquare} label="문자 수신" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="filter-tabs" icon={ListOrdered} label="필터 탭(목차) 관리" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="navigation" icon={ListOrdered} label="메뉴 설정" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="schools" icon={Calendar} label="학교 로고" tab={activeTab} setTab={onTabChange} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 md:max-w-[calc(100vw-16rem)] overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
