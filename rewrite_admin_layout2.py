import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

sidebar_btn_comp = """
function SidebarButton({ id, icon: Icon, label, tab, setTab, setMobileMenuOpen }: any) {
  const active = tab === id;
  return (
    <button
      onClick={() => {
        setTab(id);
        if (setMobileMenuOpen) setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-[#7B2332] text-white shadow-md shadow-[#7B2332]/20"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      }`}
      data-testid={`tab-${id}`}
    >
      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-500"}`} />
      {label}
    </button>
  );
}

export default function AdminPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
"""

# Replace ONLY the export default line
content = content.replace('export default function AdminPage() {', sidebar_btn_comp)

# Find the start of the return block for AdminPage
# There should be only one AdminPage function, we can find its return block by looking for the specific layout string
old_layout_start = """  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors" data-testid="link-admin-home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-extrabold text-gray-900" data-testid="text-admin-title">관리자</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-1 mb-6" data-testid="admin-tabs">"""

idx_start = content.find('  return (\n    <div className="min-h-screen bg-gray-50">\n      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">')

# Let's find the closing div of the tabs
idx_end = content.find('          </button>\n        </div>', idx_start)
if idx_end == -1:
    print("Could not find end of tabs")
    exit(1)

# we need to replace from idx_start to idx_end + len('          </button>\n        </div>')
replace_end = idx_end + len('          </button>\n        </div>')

new_layout = """  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-admin-home">
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
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-admin-home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">관리자 대시보드</h1>
        </div>
        <div className="p-4 space-y-8">
           
           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">인물 및 수업</div>
             <div className="space-y-1">
               <SidebarButton id="teachers" icon={Users} label="선생님 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="timetables" icon={Calendar} label="정규 시간표" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="summary-timetables" icon={Image} label="기말/내신 시간표" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">특강 및 설명회</div>
             <div className="space-y-1">
               <SidebarButton id="summer" icon={Image} label="썸머 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="briefings" icon={CalendarDays} label="설명회 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="briefing-events" icon={CalendarDays} label="설명회 캘린더" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="level-test" icon={BookOpen} label="수학레벨테스트" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="reservations" icon={CalendarDays} label="수강예약 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">콘텐츠 및 운영</div>
             <div className="space-y-1">
               <SidebarButton id="banners" icon={Image} label="배너 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="popups" icon={Megaphone} label="팝업 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="notices" icon={Megaphone} label="공지사항" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="reviews" icon={Star} label="합격후기" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="middle-school" icon={Image} label="중3 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">시스템 설정</div>
             <div className="space-y-1">
               <SidebarButton id="sms" icon={MessageSquare} label="문자 수신" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="filter-tabs" icon={ListOrdered} label="목차 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="navigation" icon={ListOrdered} label="메뉴 설정" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="schools" icon={Calendar} label="학교 로고" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 md:max-w-[calc(100vw-16rem)] overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[calc(100vh-4rem)] md:min-h-0">"""

content = content[:idx_start] + new_layout + content[replace_end:]

# Replace the closing tags at the very end of the file.
old_closing = """      </div>
    </div>
  );
}"""

new_closing = """          </div>
        </div>
      </main>
    </div>
  );
}"""

content = content.replace(old_closing, new_closing)

with open('client/src/pages/admin.tsx', 'w') as f:
    f.write(content)

print("Done")
