import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/layout";

interface Briefing {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
  form_url: string | null;
  is_active: boolean;
  display_order: number;
}

function BriefingCard({ briefing }: { briefing: Briefing }) {
  return (
    <div
      className="bg-white border border-gray-200 p-6 sm:p-8 transition-colors duration-200"
      data-testid={`card-briefing-${briefing.id}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        <div className="flex-shrink-0 w-14 h-14 bg-red-50 flex items-center justify-center">
          <CalendarDays className="w-7 h-7 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 leading-snug" data-testid={`text-briefing-title-${briefing.id}`}>
            {briefing.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            <span className="font-medium">{briefing.date}</span>
            {briefing.time && (
              <span>{briefing.time}</span>
            )}
          </div>
          {briefing.description && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{briefing.description}</p>
          )}
          {briefing.form_url && (
            <a
              href={briefing.form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors duration-200"
              data-testid={`link-briefing-form-${briefing.id}`}
            >
              <ExternalLink className="w-4 h-4" />
              설명회 신청하기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function Briefing() {
  const { data: briefings = [], isLoading } = useQuery<Briefing[]>({
    queryKey: ["/api/briefings/active"],
  });

  return (
    <PageLayout>
      <div className="relative bg-gradient-to-br from-[#7B2332] via-[#8B3040] to-[#6B1D2A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" data-testid="text-page-title">설명회</h1>
          <div className="mt-3 w-12 h-1 bg-white/40 rounded-full" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : briefings.length === 0 ? (
          <div className="text-center py-20">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">현재 예정된 설명회가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">새로운 설명회 일정이 등록되면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="briefing-list">
            {briefings.map((b) => (
              <BriefingCard key={b.id} briefing={b} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export function BriefingReservation() {
  return <Briefing />;
}

export function BriefingSchedule() {
  return <Briefing />;
}
