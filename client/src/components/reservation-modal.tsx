import { useState, useEffect } from "react";
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
  classTime?: string;
  startDate?: string;
}

export function ReservationModal({ open, onClose, timetableId, className, subject, teacherName, classTime, startDate }: ReservationModalProps) {
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [school, setSchool] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

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
      setAgreed(false);
      setErrors({});
      handleClose();
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
    if (!agreed) newErrors.agreed = "개인정보 수집에 동의해 주세요.";
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

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-[#7B2332] transition-colors ${errors[field] ? "border-red-400" : "border-gray-300"}`;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-[400px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${visible ? "translate-x-0" : "translate-x-full"}`}
        data-testid="modal-reservation"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">수강 예약</h2>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600" data-testid="button-close-reservation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {className && (
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              {(classTime || startDate) && (
                <p className="text-sm mb-1">
                  {classTime && <><span className="font-bold text-[#7B2332]">강의시간</span> <span className="text-gray-700">{classTime}</span></>}
                  {classTime && startDate && <span className="text-gray-300 mx-1.5">|</span>}
                  {startDate && <><span className="font-bold text-[#7B2332]">개강일</span> <span className="text-gray-700">{startDate}</span></>}
                </p>
              )}
              <p className="text-base font-bold text-gray-900" data-testid="text-reservation-class">
                {className}
              </p>
              {(subject || teacherName) && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {[subject, teacherName].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3" id="reservation-form">
            <div>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="학생 이름"
                className={inputClass("studentName")}
                data-testid="input-student-name"
              />
              {errors.studentName && <p className="text-xs text-red-500 mt-1">{errors.studentName}</p>}
            </div>

            <div>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="학교"
                className={inputClass("school")}
                data-testid="input-school"
              />
              {errors.school && <p className="text-xs text-red-500 mt-1">{errors.school}</p>}
            </div>

            <div>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(formatPhone(e.target.value))}
                placeholder="학부모 휴대전화 번호"
                className={inputClass("parentPhone")}
                data-testid="input-parent-phone"
              />
              {errors.parentPhone && <p className="text-xs text-red-500 mt-1">{errors.parentPhone}</p>}
            </div>

            <div>
              <input
                type="tel"
                value={studentPhone}
                onChange={(e) => setStudentPhone(formatPhone(e.target.value))}
                placeholder="학생 휴대전화 번호 (선택)"
                className={inputClass("studentPhone")}
                data-testid="input-student-phone"
              />
              {errors.studentPhone && <p className="text-xs text-red-500 mt-1">{errors.studentPhone}</p>}
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer" data-testid="label-privacy-consent">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332] accent-[#7B2332]"
                  data-testid="checkbox-privacy"
                />
                <div className="text-xs text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-700">개인정보 수집 및 활용 동의</span>
                  <br />
                  목적 : 학원 강좌 및 설명회 외 정보 제공 등 서비스
                  <br />
                  수집항목 : 이름, 휴대폰 번호, 학교
                  <br />
                  보유기간 : 제출 시점부터 2년간 보유
                </div>
              </label>
              {errors.agreed && <p className="text-xs text-red-500 mt-1">{errors.agreed}</p>}
            </div>
          </form>
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex items-center gap-3">
          <button
            type="submit"
            form="reservation-form"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-[#7B2332] text-white font-bold text-sm hover:bg-[#6B1D2A] disabled:opacity-50 transition-colors flex items-center gap-2"
            data-testid="button-submit-reservation"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                제출 중...
              </>
            ) : (
              "제출"
            )}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 text-[#7B2332] font-bold text-sm hover:bg-gray-50 transition-colors"
            data-testid="button-cancel-reservation"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
