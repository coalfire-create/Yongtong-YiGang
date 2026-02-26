import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth-modal";
import { Loader2, Calendar, Clock, BookOpen, User, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";

interface Timetable {
  id: number;
  teacher_id: number | null;
  teacher_name: string;
  category: string;
  target_school: string;
  class_name: string;
  class_time: string;
  start_date: string;
  teacher_image_url: string;
  description: string;
  subject: string;
  created_at: string;
}

const SUBJECT_ORDER = ["수학", "국어", "영어", "탐구"];

export function TimetableGallery({ category }: { category: string }) {
  const { member, openLoginModal } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables", category],
    queryFn: async () => {
      const res = await fetch(`/api/timetables?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async (timetable_id: number) => {
      const res = await apiRequest("POST", "/api/reservations", { timetable_id });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "예약 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      alert("예약이 완료되었습니다.");
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const handleReserve = (tt: Timetable) => {
    if (!member) {
      alert("로그인이 필요합니다.");
      openLoginModal();
      return;
    }
    if (confirm(`"${tt.class_name}" 수업을 예약하시겠습니까?`)) {
      reserveMutation.mutate(tt.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (timetables.length === 0) {
    return (
      <div className="text-center py-16" data-testid="timetable-empty">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">등록된 시간표가 없습니다.</p>
      </div>
    );
  }

  const grouped: Record<string, Timetable[]> = {};
  const ungrouped: Timetable[] = [];

  for (const tt of timetables) {
    if (tt.subject && SUBJECT_ORDER.includes(tt.subject)) {
      if (!grouped[tt.subject]) grouped[tt.subject] = [];
      grouped[tt.subject].push(tt);
    } else {
      ungrouped.push(tt);
    }
  }

  const orderedSubjects = SUBJECT_ORDER.filter((s) => grouped[s]?.length > 0);
  const hasGroups = orderedSubjects.length > 0;

  return (
    <div data-testid="timetable-list">
      {hasGroups ? (
        <div className="space-y-8">
          {orderedSubjects.map((subj) => (
            <div key={subj}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#7B2332]" />
                <h3 className="text-lg font-bold text-gray-900" data-testid={`text-subject-group-${subj}`}>{subj}</h3>
                <span className="text-xs text-gray-400 ml-1">({grouped[subj].length})</span>
              </div>
              <div className="space-y-3">
                {grouped[subj].map((tt) => (
                  <TimetableCard
                    key={tt.id}
                    tt={tt}
                    expanded={expandedId === tt.id}
                    onToggle={() => setExpandedId(expandedId === tt.id ? null : tt.id)}
                    onReserve={() => handleReserve(tt)}
                    reservePending={reserveMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-gray-400" />
                <h3 className="text-lg font-bold text-gray-900">기타</h3>
              </div>
              <div className="space-y-3">
                {ungrouped.map((tt) => (
                  <TimetableCard
                    key={tt.id}
                    tt={tt}
                    expanded={expandedId === tt.id}
                    onToggle={() => setExpandedId(expandedId === tt.id ? null : tt.id)}
                    onReserve={() => handleReserve(tt)}
                    reservePending={reserveMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {timetables.map((tt) => (
            <TimetableCard
              key={tt.id}
              tt={tt}
              expanded={expandedId === tt.id}
              onToggle={() => setExpandedId(expandedId === tt.id ? null : tt.id)}
              onReserve={() => handleReserve(tt)}
              reservePending={reserveMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TimetableCard({
  tt,
  expanded,
  onToggle,
  onReserve,
  reservePending,
}: {
  tt: Timetable;
  expanded: boolean;
  onToggle: () => void;
  onReserve: () => void;
  reservePending: boolean;
}) {
  return (
    <div
      className="bg-white border border-gray-200 hover:shadow-sm transition-shadow"
      data-testid={`card-timetable-${tt.id}`}
    >
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {tt.teacher_image_url ? (
            <div className="flex-shrink-0">
              <img
                src={tt.teacher_image_url}
                alt={tt.teacher_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                data-testid={`img-teacher-${tt.id}`}
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
              <User className="w-7 h-7 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#7B2332] flex-shrink-0" />
              <h3 className="text-base font-bold text-gray-900" data-testid={`text-classname-${tt.id}`}>{tt.class_name}</h3>
              {tt.subject && <span className="text-xs bg-red-50 text-[#7B2332] px-1.5 py-0.5 font-medium">{tt.subject}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {tt.teacher_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {tt.teacher_name}
                </span>
              )}
              {tt.target_school && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {tt.target_school}
                </span>
              )}
              {tt.class_time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {tt.class_time}
                </span>
              )}
              {tt.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  개강: {tt.start_date}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tt.description && (
              <button
                onClick={onToggle}
                className="flex items-center gap-1 px-4 py-2.5 border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                data-testid={`button-detail-${tt.id}`}
              >
                상세보기
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={onReserve}
              disabled={reservePending}
              className="px-5 py-2.5 bg-[#7B2332] text-white text-sm font-bold hover:bg-[#6B1D2A] disabled:opacity-50 transition-colors"
              data-testid={`button-reserve-${tt.id}`}
            >
              {reservePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "수강예약"
              )}
            </button>
          </div>
        </div>
      </div>
      {expanded && tt.description && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4" data-testid={`detail-${tt.id}`}>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {tt.description}
          </div>
        </div>
      )}
    </div>
  );
}
