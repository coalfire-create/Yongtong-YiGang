import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { SmsSubscribeButton } from "./sms-subscribe-modal";
import { AuthHeaderButton } from "./auth-modal";
import logoImg from "@assets/logo.png";

const NAV_ITEMS = [
  { label: "고등관", path: "/high-school", sub: [{ label: "강사 소개", path: "/high-school/teachers" }, { label: "고1 시간표", path: "/high-school/schedule/g1" }, { label: "고2 시간표", path: "/high-school/schedule/g2" }, { label: "고3 시간표", path: "/high-school/schedule/g3" }] },
  { label: "초/중등관", path: "/junior-school", sub: [{ label: "강의시간표", path: "/junior-school/schedule" }, { label: "선생님 소개", path: "/junior-school/teachers" }] },
  { label: "올빼미", path: "/owl", sub: [{ label: "독학관 안내", path: "/owl/info" }, { label: "이용 방법", path: "/owl/usage" }] },
  { label: "설명회", path: "/briefing", sub: [] },
  { label: "입시", path: "/admissions", sub: [{ label: "입시 실적", path: "/admissions/results" }, { label: "합격 후기", path: "/admissions/reviews" }] },
  { label: "오시는길", path: "/directions", sub: [] },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200" data-testid="header">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-[68px] gap-4">
          <Link
            href="/"
            className="flex-shrink-0 flex items-center gap-2.5 mr-auto lg:mr-0"
            data-testid="link-logo"
          >
            <img src={logoImg} alt="이강학원 로고" className="h-10 w-10 rounded-md object-cover" data-testid="img-header-logo" />
            <span className="text-xl font-extrabold tracking-tight" style={{ color: "#7B2332" }}>영통이강학원</span>
          </Link>

          <nav className="hidden lg:flex items-center flex-1 justify-center gap-0" data-testid="nav-desktop">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative group" data-testid={`nav-item-${item.label}`}>
                <Link
                  href={item.path}
                  className={`block px-6 py-5 text-[15px] font-semibold transition-colors duration-200 border-b-2 ${
                    location.startsWith(item.path)
                      ? "text-red-600 border-red-600"
                      : "text-gray-700 border-transparent hover:text-red-600 hover:border-red-600"
                  }`}
                  data-testid={`link-nav-${item.label}`}
                >
                  {item.label}
                </Link>
                {item.sub.length > 0 && (
                  <div className="invisible group-hover:visible absolute top-full left-0 bg-white border border-gray-200 shadow-lg min-w-[160px] z-50" data-testid={`dropdown-${item.label}`}>
                    {item.sub.map((subItem) => (
                      <Link
                        key={subItem.label}
                        href={subItem.path}
                        className="block px-5 py-3 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-colors duration-150"
                        data-testid={`link-sub-${subItem.label}`}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden lg:block flex-shrink-0">
            <AuthHeaderButton />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <AuthHeaderButton />
            <button
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`lg:hidden fixed inset-0 top-[68px] bg-white z-40 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        data-testid="nav-mobile"
      >
        <nav className="flex flex-col p-6 gap-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.label}>
              <Link
                href={item.path}
                className="block px-4 py-3 text-base font-semibold text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                data-testid={`link-mobile-nav-${item.label}`}
              >
                {item.label}
              </Link>
              {item.sub.length > 0 && (
                <div className="pl-8 flex flex-col">
                  {item.sub.map((subItem) => (
                    <Link
                      key={subItem.label}
                      href={subItem.path}
                      className="block px-4 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
                      data-testid={`link-mobile-sub-${subItem.label}`}
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="bg-[#7B2332] text-white py-12 px-4 sm:px-6 lg:px-8" data-testid="footer">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start gap-8 sm:gap-14">
          <div className="flex-shrink-0 flex flex-col items-start gap-3">
            <img src={logoImg} alt="이강학원 로고" className="h-14 w-14 rounded-lg object-cover" data-testid="img-footer-logo" />
            <span className="text-lg font-bold tracking-tight">영통이강학원</span>
          </div>
          <div className="flex-1 space-y-4 text-sm text-white/70 leading-relaxed">
            <p className="text-red-500 font-semibold text-[13px] uppercase tracking-wider">수강문의</p>
            <div className="space-y-1.5">
              <p><span className="text-white/90 font-medium">영통이강 고등 (내신/수능 전문)</span>&ensp;031-204-1352</p>
              <p><span className="text-white/90 font-medium">영통이강 초/중등관</span>&ensp;031-548-0985</p>
              <p><span className="text-white/90 font-medium">올빼미 관리형 스터디 카페</span>&ensp;031-548-098</p>
            </div>
            <div className="text-white/50 text-xs space-y-0.5 pt-1">
              <p>제5795-3호 &middot; 이강학원입시센터학원</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-5 text-xs text-white/40">
          &copy; {new Date().getFullYear()} 영통이강학원. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
      <SmsSubscribeButton />
    </div>
  );
}

export function SectionPage({
  title,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <PageLayout>
      <div className="relative bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="text-page-title">{title}</h1>
          <div className="mt-3 w-12 h-1 bg-white/40 rounded-full" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </div>
    </PageLayout>
  );
}
