import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "고등관", path: "/high-school", sub: [{ label: "강의시간표", path: "/high-school/schedule" }, { label: "선생님 소개", path: "/high-school/teachers" }] },
  { label: "중등관", path: "/middle-school", sub: [{ label: "강의시간표", path: "/middle-school/schedule" }, { label: "선생님 소개", path: "/middle-school/teachers" }] },
  { label: "초등관", path: "/elementary", sub: [{ label: "강의시간표", path: "/elementary/schedule" }, { label: "선생님 소개", path: "/elementary/teachers" }] },
  { label: "올빼미", path: "/owl", sub: [{ label: "독학관 안내", path: "/owl/info" }, { label: "이용 방법", path: "/owl/usage" }] },
  { label: "설명회", path: "/briefing", sub: [{ label: "설명회 예약", path: "/briefing/reservation" }, { label: "설명회 일정", path: "/briefing/schedule" }] },
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
            className="flex-shrink-0 text-2xl font-extrabold tracking-tight mr-auto lg:mr-0"
            style={{ color: "#1B2A4A" }}
            data-testid="link-logo"
          >
            영통이강학원
          </Link>

          <nav className="hidden lg:flex items-center flex-1 justify-center gap-0" data-testid="nav-desktop">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="relative group" data-testid={`nav-item-${item.label}`}>
                <Link
                  href={item.path}
                  className={`block px-6 py-5 text-[15px] font-semibold transition-colors duration-200 border-b-2 ${
                    location.startsWith(item.path)
                      ? "text-orange-500 border-orange-500"
                      : "text-gray-700 border-transparent hover:text-orange-500 hover:border-orange-500"
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
                        className="block px-5 py-3 text-sm text-gray-600 hover:text-orange-500 hover:bg-gray-50 transition-colors duration-150"
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

          <button
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
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
                className="block px-4 py-3 text-base font-semibold text-gray-700 hover:text-orange-500 hover:bg-orange-50 transition-colors duration-200"
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
                      className="block px-4 py-2 text-sm text-gray-500 hover:text-orange-500 transition-colors duration-200"
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

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {children}
    </div>
  );
}

export function SectionPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <PageLayout>
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2d4470] text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold" data-testid="text-page-title">{title}</h1>
          <p className="mt-2 text-white/70 text-base sm:text-lg" data-testid="text-page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </div>
    </PageLayout>
  );
}
