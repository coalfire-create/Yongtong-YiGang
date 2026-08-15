import { useState } from "react";
import { SectionPage } from "@/components/layout";
import { Loader2, CheckCircle2 } from "lucide-react";
import { TeacherIntroPage } from "@/components/teacher-intro";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TimetableGallery } from "@/components/timetable-gallery";
import { buildFilterFn, buildFilterTabs, type FilterTab } from "@/pages/high-school";

const MIDDLE_SCHOOL_SUBJECTS = ["수학", "국어", "영어", "탐구"];
const MIDDLE3_CATEGORY = "중등관-중3";

const MIDDLE3_FILTERS_DEFAULT: FilterTab[] = [
  { label: "전체시간표", filterFn: buildFilterFn("전체시간표") },
  { label: "수학", filterFn: buildFilterFn("수학") },
  { label: "국어", filterFn: buildFilterFn("국어") },
  { label: "영어", filterFn: buildFilterFn("영어") },
  { label: "탐구", filterFn: buildFilterFn("탐구") },
];

function MiddleSchoolReservationForm() {
  const [studentName, setStudentName] = useState("");
  const [school, setSchool] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [subject, setSubject] = useState("전체과목");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reservations", data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "예약 신청 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const formatPhone = (val: string) => {
    const nums = val.replace(/[^0-9]/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!studentName.trim()) newErrors.studentName = "학생 이름을 입력해 주세요.";
    if (!school.trim()) newErrors.school = "학교를 입력해 주세요.";
    if (!parentPhone.trim()) {
      newErrors.parentPhone = "학부모 전화번호를 입력해 주세요.";
    } else if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(parentPhone.replace(/\s/g, ""))) {
      newErrors.parentPhone = "올바른 전화번호 형식으로 입력해 주세요.";
    }
    if (studentPhone.trim() && !/^01[0-9]-?\d{3,4}-?\d{4}$/.test(studentPhone.replace(/\s/g, ""))) {
      newErrors.studentPhone = "올바른 전화번호 형식으로 입력해 주세요.";
    }
    if (!agreed) newErrors.agreed = "개인정보 수집에 동의해 주세요.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    mutation.mutate({
      student_name: studentName.trim(),
      school: school.trim(),
      parent_phone: parentPhone.trim(),
      student_phone: studentPhone.trim(),
      subject: `중3/예비고1 - ${subject}`,
      teacher_name: "중3/예비고1 전담강사",
    });
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-gray-200 p-8 text-center shadow-sm rounded-lg my-6" data-testid="reservation-success-box">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">수강예약 신청이 완료되었습니다</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          신청하신 내역이 정상적으로 접수되었습니다. <br />
          담당 선생님께서 확인 후 빠른 시일 내에 연락드리겠습니다.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setStudentName("");
            setSchool("");
            setParentPhone("");
            setStudentPhone("");
            setAgreed(false);
          }}
          className="px-6 py-2.5 bg-[#7B2332] text-white text-sm font-bold rounded hover:bg-[#6B1D2A] transition-colors"
          data-testid="button-reset-reservation"
        >
          추가 예약하기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 p-6 sm:p-10 shadow-sm rounded-xl my-4" data-testid="middle-reservation-form">
      <div className="text-center mb-8">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">중3 / 예비고1 수강예약</h3>
        <p className="text-sm text-gray-500 mt-1">영통이강학원 중3 및 예비고1 수강예약을 신청하시면 개별 상담 및 상세 안내를 제공해 드립니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">학생 이름 *</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="학생 이름을 입력하세요"
            className={`w-full px-4 py-3 border text-sm rounded bg-white focus:outline-none focus:border-[#7B2332] ${errors.studentName ? "border-red-400" : "border-gray-300"}`}
            data-testid="input-middle-student-name"
          />
          {errors.studentName && <p className="text-xs text-red-500 mt-1">{errors.studentName}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">학교 *</label>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="예: 영통중, 영덕중, 신나무실중 등"
            className={`w-full px-4 py-3 border text-sm rounded bg-white focus:outline-none focus:border-[#7B2332] ${errors.school ? "border-red-400" : "border-gray-300"}`}
            data-testid="input-middle-school"
          />
          {errors.school && <p className="text-xs text-red-500 mt-1">{errors.school}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">학부모 휴대전화 번호 *</label>
          <input
            type="tel"
            value={parentPhone}
            onChange={(e) => setParentPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            className={`w-full px-4 py-3 border text-sm rounded bg-white focus:outline-none focus:border-[#7B2332] ${errors.parentPhone ? "border-red-400" : "border-gray-300"}`}
            data-testid="input-middle-parent-phone"
          />
          {errors.parentPhone && <p className="text-xs text-red-500 mt-1">{errors.parentPhone}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">학생 휴대전화 번호 (선택)</label>
          <input
            type="tel"
            value={studentPhone}
            onChange={(e) => setStudentPhone(formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            className="w-full px-4 py-3 border border-gray-300 text-sm rounded bg-white focus:outline-none focus:border-[#7B2332]"
            data-testid="input-middle-student-phone"
          />
          {errors.studentPhone && <p className="text-xs text-red-500 mt-1">{errors.studentPhone}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">신청 과목 / 관심 과정</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 text-sm rounded bg-white focus:outline-none focus:border-[#7B2332]"
            data-testid="select-middle-subject"
          >
            <option value="전체과목">중3 / 예비고1 전체과목</option>
            <option value="수학">수학</option>
            <option value="국어">국어</option>
            <option value="영어">영어</option>
            <option value="탐구/과학">탐구 / 과학</option>
          </select>
        </div>

        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332] accent-[#7B2332]"
              data-testid="checkbox-middle-privacy"
            />
            <div className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">개인정보 수집 및 활용 동의 (필수)</span>
              <br />
              목적: 학원 강좌 상담 및 수강 안내 서비스
              <br />
              수집항목: 학생이름, 학교, 휴대전화 번호
              <br />
              보유기간: 제출 시점부터 2년간 보유
            </div>
          </label>
          {errors.agreed && <p className="text-xs text-red-500 mt-1">{errors.agreed}</p>}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full mt-4 py-3.5 bg-[#7B2332] text-white font-bold text-base rounded hover:bg-[#6B1D2A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          data-testid="button-submit-middle-reservation"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              제출 중...
            </>
          ) : (
            "수강예약 신청하기"
          )}
        </button>
      </form>
    </div>
  );
}

export function MiddleSchool() {
  const [activeTab, setActiveTab] = useState<"schedule" | "reservation">("schedule");

  const { data: apiTabs } = useQuery<{ id: number; label: string; category: string; display_order: number; is_visible: boolean }[]>({
    queryKey: ["/api/filter-tabs", MIDDLE3_CATEGORY],
    queryFn: async () => {
      const res = await fetch(`/api/filter-tabs?category=${encodeURIComponent(MIDDLE3_CATEGORY)}`);
      if (!res.ok) throw new Error("Failed to fetch filter tabs");
      return res.json();
    },
  });

  const { data: images = [] } = useQuery<any[]>({
    queryKey: ["/api/middle-school-images"],
    queryFn: async () => {
      const res = await fetch("/api/middle-school-images");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filteredApiTabs = apiTabs?.filter((tab) => tab.is_visible !== false);
  const filterTabs = filteredApiTabs && filteredApiTabs.length > 0 ? buildFilterTabs(filteredApiTabs, MIDDLE3_CATEGORY) : MIDDLE3_FILTERS_DEFAULT;

  return (
    <SectionPage title="중등관" subtitle="중3 및 예비고1 전문 과정">
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
            activeTab === "schedule"
              ? "bg-[#7B2332] text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          data-testid="tab-middle-schedule"
        >
          예비고1 시간표
        </button>
        <button
          onClick={() => setActiveTab("reservation")}
          className={`px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
            activeTab === "reservation"
              ? "bg-[#7B2332] text-white shadow-md"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          data-testid="tab-middle-reservation"
        >
          수강예약
        </button>
      </div>

      {activeTab === "schedule" ? (
        <div className="space-y-6">
          <TimetableGallery category={MIDDLE3_CATEGORY} filterTabs={filterTabs} />

          {images.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-col gap-6 items-center">
                {images.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt="중3 시간표 포스터"
                    className="w-full max-w-3xl border border-gray-200 rounded-lg shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <MiddleSchoolReservationForm />
      )}
    </SectionPage>
  );
}

export function MiddleSchoolTeachers() {
  return <TeacherIntroPage division="중등관" subjects={MIDDLE_SCHOOL_SUBJECTS} />;
}

export function MiddleSchoolSchedule() {
  return <MiddleSchool />;
}

