import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { X, Loader2 } from "lucide-react";

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  timetableId?: number;
  className?: string;
  subject?: string;
  teacherName?: string;
}

export function ReservationModal({ open, onClose, timetableId, className, subject, teacherName }: ReservationModalProps) {
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [school, setSchool] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (data: { timetable_id?: number; student_name: string; student_phone: string; parent_phone: string; school: string; subject?: string; teacher_name?: string }) => {
      const res = await apiRequest("POST", "/api/reservations", data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "예약 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      alert("수강예약이 완료되었습니다.");
      setStudentName("");
      setStudentPhone("");
      setParentPhone("");
      setSchool("");
      setErrors({});
      onClose();
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const formatPhone = (value: string) => {
    const nums = value.replace(/[^0-9]/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!studentName.trim()) newErrors.studentName = "학생 이름을 입력해 주세요.";
    if (!parentPhone.trim()) {
      newErrors.parentPhone = "부모님 전화번호를 입력해 주세요.";
    } else if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(parentPhone.replace(/\s/g, ""))) {
      newErrors.parentPhone = "올바른 전화번호 형식으로 입력해 주세요.";
    }
    if (studentPhone.trim() && !/^01[0-9]-?\d{3,4}-?\d{4}$/.test(studentPhone.replace(/\s/g, ""))) {
      newErrors.studentPhone = "올바른 전화번호 형식으로 입력해 주세요.";
    }
    if (!school.trim()) newErrors.school = "재학중인 학교를 입력해 주세요.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      timetable_id: timetableId,
      student_name: studentName.trim(),
      student_phone: studentPhone.trim(),
      parent_phone: parentPhone.trim(),
      school: school.trim(),
      subject: subject || "",
      teacher_name: teacherName || "",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl" data-testid="modal-reservation">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">수강예약</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" data-testid="button-close-reservation">
            <X className="w-5 h-5" />
          </button>
        </div>

        {className && (
          <div className="px-6 pt-4">
            <div className="bg-gray-50 border border-gray-200 rounded px-4 py-2.5">
              <p className="text-sm text-gray-500">수업</p>
              <p className="text-sm font-bold text-gray-900" data-testid="text-reservation-class">{className}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              학생 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="학생 이름을 입력하세요"
              className={`w-full px-3 py-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2332]/30 focus:border-[#7B2332] ${errors.studentName ? "border-red-400" : "border-gray-300"}`}
              data-testid="input-student-name"
            />
            {errors.studentName && <p className="text-xs text-red-500 mt-1">{errors.studentName}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              학생 전화번호 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <input
              type="tel"
              value={studentPhone}
              onChange={(e) => setStudentPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className={`w-full px-3 py-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2332]/30 focus:border-[#7B2332] ${errors.studentPhone ? "border-red-400" : "border-gray-300"}`}
              data-testid="input-student-phone"
            />
            {errors.studentPhone && <p className="text-xs text-red-500 mt-1">{errors.studentPhone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              부모님 전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className={`w-full px-3 py-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2332]/30 focus:border-[#7B2332] ${errors.parentPhone ? "border-red-400" : "border-gray-300"}`}
              data-testid="input-parent-phone"
            />
            {errors.parentPhone && <p className="text-xs text-red-500 mt-1">{errors.parentPhone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              재학중인 학교 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="학교 이름을 입력하세요"
              className={`w-full px-3 py-2.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2332]/30 focus:border-[#7B2332] ${errors.school ? "border-red-400" : "border-gray-300"}`}
              data-testid="input-school"
            />
            {errors.school && <p className="text-xs text-red-500 mt-1">{errors.school}</p>}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-[#7B2332] text-white font-bold text-sm rounded hover:bg-[#6B1D2A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            data-testid="button-submit-reservation"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                예약 중...
              </>
            ) : (
              "예약하기"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
