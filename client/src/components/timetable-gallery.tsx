import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth-modal";
import { Loader2, Calendar, Clock, BookOpen, User, GraduationCap } from "lucide-react";

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
  created_at: string;
}

export function TimetableGallery({ category }: { category: string }) {
  const { member, openLoginModal } = useAuth();

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

  return (
    <div data-testid="timetable-list">
      <div className="space-y-4">
        {timetables.map((tt) => (
          <div
            key={tt.id}
            className="bg-white border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            data-testid={`card-timetable-${tt.id}`}
          >
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
              <button
                onClick={() => handleReserve(tt)}
                disabled={reserveMutation.isPending}
                className="flex-shrink-0 px-5 py-2.5 bg-[#7B2332] text-white text-sm font-bold hover:bg-[#6B1D2A] disabled:opacity-50 transition-colors"
                data-testid={`button-reserve-${tt.id}`}
              >
                {reserveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "수강예약"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
