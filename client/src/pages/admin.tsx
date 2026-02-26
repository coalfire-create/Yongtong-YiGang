import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Trash2, Upload, Loader2, Users, Calendar, CalendarDays, ArrowLeft, Lock, Megaphone, Eye, EyeOff, Image, Pencil, Check, X, MessageSquare, Star, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "wouter";

interface Teacher {
  id: number;
  name: string;
  subject: string;
  division: string;
  description: string;
  image_url: string | null;
  display_order: number;
  created_at: string;
}

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
  display_order: number;
  description: string;
  subject: string;
  created_at: string;
}

interface Reservation {
  id: number;
  user_id: number;
  timetable_id: number;
  student_name: string;
  student_phone: string;
  parent_phone: string;
  student_school: string;
  student_grade: string;
  class_name: string;
  teacher_name: string;
  target_school: string;
  class_time: string;
  start_date: string;
  category: string;
  created_at: string;
}

const SUBJECT_OPTIONS: Record<string, string[]> = {
  "고등관": ["수학", "국어", "영어", "탐구"],
  "초/중등관": ["수학", "국어", "영어", "탐구"],
};

const TIMETABLE_SUBJECT_OPTIONS = ["수학", "국어", "영어", "탐구"];

function TeachersTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState("고등관");
  const [filterSubject, setFilterSubject] = useState("all");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string;
    subject: string;
    description: string;
  }>();

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const filteredTeachers = filterSubject === "all"
    ? teachers
    : teachers.filter((t) => t.subject === filterSubject);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/teachers", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidateTeachers();
      reset();
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/teachers/${id}`);
    },
    onSuccess: () => {
      invalidateTeachers();
    },
  });

  const bioMutation = useMutation({
    mutationFn: async ({ id, bio }: { id: number; bio: string }) => {
      await apiRequest("PATCH", `/api/teachers/${id}`, { bio });
    },
    onSuccess: () => {
      invalidateTeachers();
      setEditingBioId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/teachers/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidateTeachers();
    },
  });

  const handleTeacherMove = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= filteredTeachers.length) return;
    const newList = [...filteredTeachers];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    reorderMutation.mutate(newList.map((t) => t.id));
  };

  const [editingBioId, setEditingBioId] = useState<number | null>(null);
  const [editBioText, setEditBioText] = useState("");

  const allSubjects = [...new Set(teachers.map((t) => t.subject))];

  function invalidateTeachers() {
    queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
    queryClient.invalidateQueries({ queryKey: [`/api/teachers?division=${encodeURIComponent("고등관")}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/teachers?division=${encodeURIComponent("초/중등관")}`] });
  }

  const onSubmit = async (data: { name: string; subject: string; description: string }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("subject", data.subject);
    formData.append("description", data.description);
    formData.append("division", selectedDivision);
    const file = fileRef.current?.files?.[0];
    if (file) formData.append("image", file);
    try {
      await addMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  };

  const divisionLabel: Record<string, string> = { "고등관": "고등관", "초/중등관": "초/중등관" };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-teacher">
        <h3 className="text-lg font-bold text-gray-900 mb-4">선생님 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                {...register("name", { required: "이름을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="이름"
                data-testid="input-teacher-name"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">소속 *</label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                data-testid="select-teacher-division"
              >
                <option value="고등관">고등관</option>
                <option value="초/중등관">초/중등관</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과목 *</label>
              <select
                {...register("subject", { required: "과목을 선택하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                data-testid="select-teacher-subject"
                defaultValue=""
              >
                <option value="" disabled>과목 선택</option>
                {(SUBJECT_OPTIONS[selectedDivision] || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">약력 / 소개 *</label>
            <textarea
              {...register("description", { required: "소개를 입력하세요" })}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
              placeholder={"줄바꿈으로 항목 구분\n예: 대성마이맥 출강\n전 SNT 고등관 국어"}
              rows={3}
              data-testid="input-teacher-desc"
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사진</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              data-testid="input-teacher-image"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            data-testid="button-add-teacher"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                선생님 추가
              </>
            )}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">등록된 선생님 ({filteredTeachers.length}명)</h3>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-red-600"
          data-testid="select-teacher-filter"
        >
          <option value="all">전체 과목</option>
          {allSubjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTeachers.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 선생님이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {filteredTeachers.map((t, idx) => (
            <div key={t.id} className="bg-white border border-gray-200 p-4" data-testid={`card-admin-teacher-${t.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => handleTeacherMove(idx, "up")}
                    disabled={idx === 0 || reorderMutation.isPending}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                    data-testid={`button-move-up-teacher-${t.id}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleTeacherMove(idx, "down")}
                    disabled={idx === filteredTeachers.length - 1 || reorderMutation.isPending}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                    data-testid={`button-move-down-teacher-${t.id}`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                {t.image_url ? (
                  <img src={t.image_url} alt={t.name} className="w-14 h-14 object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-7 h-7 text-red-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{t.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    <span className="text-red-600 font-medium">{divisionLabel[t.division] || t.division}</span>
                    {t.division && " · "}
                    {t.subject}
                  </p>
                  {editingBioId !== t.id && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2" data-testid={`text-teacher-bio-${t.id}`}>
                      {t.description || "약력 미등록"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingBioId(editingBioId === t.id ? null : t.id);
                    setEditBioText(t.description || "");
                  }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="약력 편집"
                  data-testid={`button-edit-bio-${t.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${t.name}" 선생님을 삭제하시겠습니까?`)) {
                      deleteMutation.mutate(t.id);
                    }
                  }}
                  className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  data-testid={`button-delete-teacher-${t.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {editingBioId === t.id && (
                <div className="mt-3 pt-3 border-t border-gray-100" data-testid={`form-edit-bio-${t.id}`}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    약력 (줄바꿈으로 항목 구분, 마우스 오버 시 표시됨)
                  </label>
                  <textarea
                    value={editBioText}
                    onChange={(e) => setEditBioText(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
                    placeholder={"대성마이맥 출강\n전 SNT 고등관 국어, 두각\n전 대형"}
                    data-testid={`textarea-bio-${t.id}`}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => bioMutation.mutate({ id: t.id, bio: editBioText })}
                      disabled={bioMutation.isPending}
                      className="flex items-center gap-1 bg-red-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                      data-testid={`button-save-bio-${t.id}`}
                    >
                      {bioMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      저장
                    </button>
                    <button
                      onClick={() => setEditingBioId(null)}
                      className="flex items-center gap-1 text-gray-500 px-4 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                      data-testid={`button-cancel-bio-${t.id}`}
                    >
                      <X className="w-3 h-3" />
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimetablesTab() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    category: string;
    subject: string;
    target_school: string;
    class_name: string;
    class_time: string;
    start_date: string;
    teacher_id: string;
    description: string;
  }>();
  const [teacherImageFile, setTeacherImageFile] = useState<File | null>(null);
  const [teacherImagePreview, setTeacherImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables"],
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const filteredTimetables = filterCategory === "all"
    ? timetables
    : timetables.filter((tt) => tt.category === filterCategory);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/timetables", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "등록 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      reset();
      setTeacherImageFile(null);
      setTeacherImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timetables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/timetables/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const handleMove = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= filteredTimetables.length) return;
    const newList = [...filteredTimetables];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    reorderMutation.mutate(newList.map((t) => t.id));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTeacherImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setTeacherImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: any) => {
    const teacher = teachers.find((t) => String(t.id) === data.teacher_id);
    const formData = new FormData();
    if (data.teacher_id) formData.append("teacher_id", data.teacher_id);
    formData.append("teacher_name", teacher?.name || "");
    formData.append("category", data.category);
    formData.append("subject", data.subject || "");
    formData.append("target_school", data.target_school || "");
    formData.append("class_name", data.class_name);
    formData.append("class_time", data.class_time || "");
    formData.append("start_date", data.start_date || "");
    formData.append("description", data.description || "");
    if (teacherImageFile) formData.append("teacher_image", teacherImageFile);
    addMutation.mutate(formData);
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-timetable">
        <h3 className="text-lg font-bold text-gray-900 mb-4">시간표 등록</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
              <select
                {...register("category", { required: "카테고리를 선택하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                data-testid="select-timetable-category"
                defaultValue=""
              >
                <option value="" disabled>카테고리 선택</option>
                <option value="고등관">고등관 (전체)</option>
                <option value="고등관-고1">고등관 - 고1</option>
                <option value="고등관-고2">고등관 - 고2</option>
                <option value="고등관-고3">고등관 - 고3</option>
                <option value="초/중등관">초/중등관</option>
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과목 *</label>
              <select
                {...register("subject", { required: "과목을 선택하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                data-testid="select-timetable-subject"
                defaultValue=""
              >
                <option value="" disabled>과목 선택</option>
                {TIMETABLE_SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당 선생님</label>
              <select
                {...register("teacher_id")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                data-testid="select-timetable-teacher"
                defaultValue=""
              >
                <option value="">선택 안함</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수업명 *</label>
              <input
                {...register("class_name", { required: "수업명을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 수학 정규반"
                data-testid="input-timetable-classname"
              />
              {errors.class_name && <p className="text-xs text-red-500 mt-1">{errors.class_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대상 학교</label>
              <input
                {...register("target_school")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 경기고, 단대부고"
                data-testid="input-timetable-school"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">수업 시간</label>
              <input
                {...register("class_time")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 월/수 18:00~20:00"
                data-testid="input-timetable-time"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">개강일</label>
              <input
                {...register("start_date")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 2025년 3월 3일"
                data-testid="input-timetable-date"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수업 설명 (상세보기에 표시)</label>
            <textarea
              {...register("description")}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
              rows={3}
              placeholder={"수업 내용, 커리큘럼, 교재 등 상세 설명을 입력하세요\n예: 기출분석 중심의 내신 대비 수학 수업\n교재: 수학의 정석, 자체 프린트"}
              data-testid="textarea-timetable-description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">선생님 사진 (얼굴)</label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
                data-testid="input-timetable-teacher-image"
              />
              {teacherImagePreview && (
                <img src={teacherImagePreview} alt="미리보기" className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" />
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            data-testid="button-add-timetable"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            시간표 등록
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">등록된 시간표 ({filteredTimetables.length}개)</h3>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-red-600"
          data-testid="select-timetable-filter"
        >
          <option value="all">전체 보기</option>
          <option value="고등관-고1">고1</option>
          <option value="고등관-고2">고2</option>
          <option value="고등관-고3">고3</option>
          <option value="초/중등관">초/중등관</option>
          <option value="고등관">고등관 (전체)</option>
        </select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredTimetables.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 시간표가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {filteredTimetables.map((tt, idx) => (
            <div key={tt.id} className="flex items-center gap-3 bg-white border border-gray-200 p-4" data-testid={`card-admin-timetable-${tt.id}`}>
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => handleMove(idx, "up")}
                  disabled={idx === 0 || reorderMutation.isPending}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                  data-testid={`button-move-up-timetable-${tt.id}`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMove(idx, "down")}
                  disabled={idx === filteredTimetables.length - 1 || reorderMutation.isPending}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                  data-testid={`button-move-down-timetable-${tt.id}`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              {tt.teacher_image_url ? (
                <img src={tt.teacher_image_url} alt={tt.teacher_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200" />
              ) : (
                <div className="w-10 h-10 bg-red-50 flex items-center justify-center flex-shrink-0 rounded-full">
                  <Calendar className="w-5 h-5 text-red-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 text-sm">{tt.class_name}</p>
                  {tt.subject && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 font-medium">{tt.subject}</span>}
                </div>
                <p className="text-xs text-gray-500">
                  {tt.category}{tt.teacher_name ? ` · ${tt.teacher_name}` : ""}{tt.target_school ? ` · ${tt.target_school}` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {tt.class_time}{tt.start_date ? ` | 개강: ${tt.start_date}` : ""}
                </p>
                {tt.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tt.description}</p>}
              </div>
              <button
                onClick={() => {
                  if (confirm("이 시간표를 삭제하시겠습니까?")) {
                    deleteMutation.mutate(tt.id);
                  }
                }}
                className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                data-testid={`button-delete-timetable-${tt.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationsTab() {
  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ["/api/admin/reservations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
    },
  });

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">수강예약 목록 ({reservations.length}건)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reservations.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">접수된 수강예약이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-reservations">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-3 py-3 font-bold text-gray-700">학생명</th>
                <th className="px-3 py-3 font-bold text-gray-700">학교/학년</th>
                <th className="px-3 py-3 font-bold text-gray-700">연락처</th>
                <th className="px-3 py-3 font-bold text-gray-700">수업명</th>
                <th className="px-3 py-3 font-bold text-gray-700">선생님</th>
                <th className="px-3 py-3 font-bold text-gray-700">수업시간</th>
                <th className="px-3 py-3 font-bold text-gray-700">예약일</th>
                <th className="px-3 py-3 font-bold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`row-reservation-${r.id}`}>
                  <td className="px-3 py-3 font-medium text-gray-900">{r.student_name || "-"}</td>
                  <td className="px-3 py-3 text-gray-600">{r.student_school || "-"} {r.student_grade || ""}</td>
                  <td className="px-3 py-3 text-gray-600">
                    <div>{r.student_phone || "-"}</div>
                    {r.parent_phone && <div className="text-xs text-gray-400">학부모: {r.parent_phone}</div>}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">{r.class_name || "-"}</td>
                  <td className="px-3 py-3 text-gray-600">{r.teacher_name || "-"}</td>
                  <td className="px-3 py-3 text-gray-600">{r.class_time || "-"}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => {
                        if (confirm("이 예약을 삭제하시겠습니까?")) deleteMutation.mutate(r.id);
                      }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-delete-reservation-${r.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  division: string;
  created_at: string;
}

const BANNER_DIVISIONS = [
  { key: "main", label: "메인" },
  { key: "high", label: "고등관" },
  { key: "junior", label: "초/중등관" },
  { key: "owl", label: "올빼미 독학관" },
];

function BannersTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState("main");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title: string;
    subtitle: string;
    description: string;
    link_url: string;
    display_order: string;
  }>();

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners/all", selectedDivision],
    queryFn: async () => {
      const res = await fetch(`/api/banners/all?division=${selectedDivision}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const invalidateBannerCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/banners/all", selectedDivision] });
    queryClient.invalidateQueries({ queryKey: ["/api/banners", selectedDivision] });
  };

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/banners", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidateBannerCaches();
      reset();
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/banners/${id}/toggle`);
    },
    onSuccess: invalidateBannerCaches,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/banners/${id}`);
    },
    onSuccess: invalidateBannerCaches,
  });

  const onSubmit = async (data: { title: string; subtitle: string; description: string; link_url: string; display_order: string }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("subtitle", data.subtitle || "");
    formData.append("description", data.description || "");
    formData.append("link_url", data.link_url || "");
    formData.append("display_order", data.display_order || "0");
    formData.append("division", selectedDivision);
    const file = fileRef.current?.files?.[0];
    if (file) formData.append("image", file);
    try {
      await addMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  };

  const divisionLabel = BANNER_DIVISIONS.find((d) => d.key === selectedDivision)?.label || selectedDivision;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6" data-testid="banner-division-tabs">
        {BANNER_DIVISIONS.map((div) => (
          <button
            key={div.key}
            onClick={() => setSelectedDivision(div.key)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              selectedDivision === div.key
                ? "bg-[#7B2332] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            data-testid={`tab-banner-division-${div.key}`}
          >
            {div.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-banner">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{divisionLabel} 배너 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 (큰 글씨) *</label>
              <input
                {...register("title", { required: "제목을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 2026년 NEW"
                data-testid="input-banner-title"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">부제목</label>
              <input
                {...register("subtitle")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 고3 정규/특강"
                data-testid="input-banner-subtitle"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <input
              {...register("description")}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
              placeholder="배너 하단 설명 문구"
              data-testid="input-banner-description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL</label>
              <input
                {...register("link_url")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="/high-school/schedule"
                data-testid="input-banner-link"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">순서</label>
              <input
                {...register("display_order")}
                type="number"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="0"
                defaultValue="0"
                data-testid="input-banner-order"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">배경 이미지</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              data-testid="input-banner-image"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            data-testid="button-add-banner"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                배너 추가
              </>
            )}
          </button>
        </form>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">{divisionLabel} 배너 ({banners.length}개)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : banners.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{divisionLabel} 배너가 없습니다. 배너를 추가하면 해당 페이지에 표시됩니다.</p>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-4 bg-white border border-gray-200 p-4" data-testid={`card-admin-banner-${b.id}`}>
              {b.image_url ? (
                <img src={b.image_url} alt={b.title} className="w-24 h-14 object-cover flex-shrink-0" />
              ) : (
                <div className="w-24 h-14 bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Image className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{b.title}</p>
                <p className="text-sm text-gray-500 truncate">
                  {b.subtitle && <span>{b.subtitle} · </span>}
                  {b.description || "설명 없음"}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {b.link_url || "링크 없음"} · 순서: {b.display_order}
                </p>
              </div>
              <button
                onClick={() => toggleMutation.mutate(b.id)}
                className={`flex-shrink-0 p-2 transition-colors ${
                  b.is_active
                    ? "text-green-500 hover:text-green-700 hover:bg-green-50"
                    : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
                }`}
                title={b.is_active ? "활성 (클릭하면 비활성)" : "비활성 (클릭하면 활성)"}
                data-testid={`button-toggle-banner-${b.id}`}
              >
                {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${b.title}" 배너를 삭제하시겠습니까?`)) {
                    deleteMutation.mutate(b.id);
                  }
                }}
                className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                data-testid={`button-delete-banner-${b.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Popup {
  id: number;
  title: string;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

function PopupsTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title: string;
    link_url: string;
    display_order: string;
  }>();

  const { data: popups = [], isLoading } = useQuery<Popup[]>({
    queryKey: ["/api/popups/all"],
  });

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/popups", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/popups/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
      reset();
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/popups/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/popups/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/popups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/popups/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
    },
  });

  const onSubmit = async (data: { title: string; link_url: string; display_order: string }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("link_url", data.link_url || "");
    formData.append("display_order", data.display_order || "0");
    const file = fileRef.current?.files?.[0];
    if (file) formData.append("image", file);
    try {
      await addMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-popup">
        <h3 className="text-lg font-bold text-gray-900 mb-4">팝업 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input
                {...register("title", { required: "제목을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="팝업 제목"
                data-testid="input-popup-title"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">링크 URL</label>
              <input
                {...register("link_url")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="https://..."
                data-testid="input-popup-link"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">순서</label>
              <input
                {...register("display_order")}
                type="number"
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="0"
                defaultValue="0"
                data-testid="input-popup-order"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">팝업 이미지</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              data-testid="input-popup-image"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            data-testid="button-add-popup"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                팝업 추가
              </>
            )}
          </button>
        </form>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">등록된 팝업 ({popups.length}개)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : popups.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 팝업이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {popups.map((p) => (
            <div key={p.id} className="flex items-center gap-4 bg-white border border-gray-200 p-4" data-testid={`card-admin-popup-${p.id}`}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="w-20 h-14 object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-14 bg-red-50 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-7 h-7 text-red-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{p.title}</p>
                <p className="text-xs text-gray-400 truncate">
                  {p.link_url || "링크 없음"}
                  {" · 순서: " + p.display_order}
                </p>
              </div>
              <button
                onClick={() => toggleMutation.mutate(p.id)}
                className={`flex-shrink-0 p-2 transition-colors ${
                  p.is_active
                    ? "text-green-500 hover:text-green-700 hover:bg-green-50"
                    : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
                }`}
                title={p.is_active ? "활성 (클릭하면 비활성)" : "비활성 (클릭하면 활성)"}
                data-testid={`button-toggle-popup-${p.id}`}
              >
                {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${p.title}" 팝업을 삭제하시겠습니까?`)) {
                    deleteMutation.mutate(p.id);
                  }
                }}
                className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                data-testid={`button-delete-popup-${p.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "로그인 실패");
        return;
      }
      onLogin();
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 p-8" data-testid="form-admin-login">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 bg-red-50 flex items-center justify-center">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl font-extrabold text-gray-900 text-center mb-6">관리자 로그인</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
              placeholder="관리자 비밀번호를 입력하세요"
              data-testid="input-admin-password"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-500" data-testid="text-login-error">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-red-600 text-white py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            data-testid="button-admin-login"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <Link href="/" className="block text-center text-xs text-gray-400 mt-4 hover:text-gray-600" data-testid="link-back-home">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

interface SmsSubscription {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

function SmsSubscriptionsTab() {
  const { data: subs = [], isLoading } = useQuery<SmsSubscription[]>({
    queryKey: ["/api/sms-subscriptions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sms-subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-subscriptions"] });
    },
  });

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">문자 수신 신청 목록 ({subs.length}건)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : subs.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center" data-testid="text-sms-empty">신청 내역이 없습니다.</p>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full text-sm" data-testid="table-sms-subscriptions">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">이름</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">전화번호</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">신청일</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map((sub) => (
                <tr key={sub.id} data-testid={`row-sms-${sub.id}`}>
                  <td className="px-4 py-3 text-gray-900">{sub.name || "-"}</td>
                  <td className="px-4 py-3 text-gray-900 font-mono">{sub.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(sub.created_at).toLocaleDateString("ko-KR")}</td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => {
                        if (confirm("이 신청을 삭제하시겠습니까?")) {
                          deleteMutation.mutate(sub.id);
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-delete-sms-${sub.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface BriefingItem {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
  form_url: string | null;
  is_active: boolean;
  display_order: number;
}

function BriefingsTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<BriefingItem>>({});
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title: string;
    date: string;
    time: string;
    description: string;
    form_url: string;
  }>();

  const { data: briefings = [], isLoading } = useQuery<BriefingItem[]>({
    queryKey: ["/api/briefings"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; date: string; time: string; description: string; form_url: string }) => {
      await apiRequest("POST", "/api/briefings", {
        title: data.title,
        date: data.date,
        time: data.time,
        description: data.description,
        form_url: data.form_url || null,
        is_active: true,
        display_order: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BriefingItem> }) => {
      await apiRequest("PUT", `/api/briefings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/briefings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const b = briefings.find((x) => x.id === id);
      if (!b) return;
      await apiRequest("PUT", `/api/briefings/${id}`, { ...b, is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
    },
  });

  const onSubmit = (data: { title: string; date: string; time: string; description: string; form_url: string }) => {
    addMutation.mutate(data);
  };

  const startEdit = (b: BriefingItem) => {
    setEditingId(b.id);
    setEditForm({ title: b.title, date: b.date, time: b.time, description: b.description, form_url: b.form_url || "", display_order: b.display_order });
  };

  const saveEdit = () => {
    if (editingId === null) return;
    const original = briefings.find((b) => b.id === editingId);
    if (!original) return;
    updateMutation.mutate({ id: editingId, data: { ...original, ...editForm } });
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-briefing">
        <h3 className="text-lg font-bold text-gray-900 mb-4">설명회 일정 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              {...register("title", { required: "제목을 입력하세요" })}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
              placeholder="예: 2026학년도 고등부 신입생 설명회"
              data-testid="input-briefing-title"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
              <input
                {...register("date", { required: "날짜를 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 2026년 3월 8일 (토)"
                data-testid="input-briefing-date"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
              <input
                {...register("time")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 14:00~16:00"
                data-testid="input-briefing-time"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
              placeholder="설명회에 대한 간단한 안내"
              data-testid="input-briefing-description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구글폼 링크</label>
            <input
              {...register("form_url")}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
              placeholder="https://forms.gle/..."
              data-testid="input-briefing-form-url"
            />
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            data-testid="button-add-briefing"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            추가
          </button>
        </form>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">등록된 설명회 ({briefings.length}개)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : briefings.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center" data-testid="text-briefing-empty">등록된 설명회가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {briefings.map((b) => (
            <div key={b.id} className="bg-white border border-gray-200 p-5" data-testid={`card-admin-briefing-${b.id}`}>
              {editingId === b.id ? (
                <div className="space-y-3">
                  <input
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    placeholder="제목"
                    data-testid="input-edit-briefing-title"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={editForm.date || ""}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                      placeholder="날짜"
                      data-testid="input-edit-briefing-date"
                    />
                    <input
                      value={editForm.time || ""}
                      onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                      placeholder="시간"
                      data-testid="input-edit-briefing-time"
                    />
                  </div>
                  <textarea
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
                    placeholder="설명"
                    data-testid="input-edit-briefing-description"
                  />
                  <input
                    value={editForm.form_url || ""}
                    onChange={(e) => setEditForm({ ...editForm, form_url: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    placeholder="구글폼 링크"
                    data-testid="input-edit-briefing-form-url"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                      data-testid="button-save-briefing"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
                      data-testid="button-cancel-edit-briefing"
                    >
                      <X className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900">{b.title}</h4>
                      {!b.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500">비활성</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{b.date} {b.time}</p>
                    {b.description && <p className="text-sm text-gray-500 mt-1">{b.description}</p>}
                    {b.form_url && (
                      <a href={b.form_url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:text-red-700 mt-1 inline-block break-all">
                        {b.form_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: b.id, is_active: !b.is_active })}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                      title={b.is_active ? "비활성화" : "활성화"}
                      data-testid={`button-toggle-briefing-${b.id}`}
                    >
                      {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(b)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-edit-briefing-${b.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("이 설명회를 삭제하시겠습니까?")) {
                          deleteMutation.mutate(b.id);
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-delete-briefing-${b.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Review {
  id: number;
  name: string;
  school: string;
  division: string;
  content: string;
  image_urls: string[];
  display_order: number;
  created_at: string;
}

function ReviewsTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState("high");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string;
    school: string;
    content: string;
    display_order: string;
  }>();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/reviews", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      reset();
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });

  const onSubmit = async (data: { name: string; school: string; content: string; display_order: string }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("school", data.school || "");
    formData.append("content", data.content);
    formData.append("display_order", data.display_order || "0");
    formData.append("division", selectedDivision);
    if (fileRef.current?.files) {
      for (let i = 0; i < fileRef.current.files.length; i++) {
        formData.append("images", fileRef.current.files[i]);
      }
    }
    try {
      await addMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  };

  const divisionLabel = selectedDivision === "high" ? "고등관" : "초/중등관";
  const filteredReviews = reviews.filter((r) => r.division === selectedDivision);

  return (
    <div>
      <div className="flex gap-2 mb-6" data-testid="review-division-tabs">
        {[
          { key: "high", label: "고등관" },
          { key: "junior", label: "초/중등관" },
        ].map((div) => (
          <button
            key={div.key}
            onClick={() => setSelectedDivision(div.key)}
            className={`px-4 py-2 text-sm font-bold transition-colors ${
              selectedDivision === div.key
                ? "bg-[#7B2332] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            data-testid={`tab-review-division-${div.key}`}
          >
            {div.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 p-6 mb-8 space-y-4" data-testid="form-add-review">
        <h3 className="font-bold text-gray-900">{divisionLabel} 합격후기 추가</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
            <input
              {...register("name", { required: true })}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              placeholder="예: 김O준"
              data-testid="input-review-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학교/학과</label>
            <input
              {...register("school")}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              placeholder="예: 서울대학교 수학과"
              data-testid="input-review-school"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">후기 내용 *</label>
          <textarea
            {...register("content", { required: true })}
            rows={4}
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none resize-none"
            placeholder="합격 후기를 입력하세요"
            data-testid="input-review-content"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사진 (여러장 가능)</label>
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              multiple
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              data-testid="input-review-images"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">순서</label>
            <input
              {...register("display_order")}
              type="number"
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              defaultValue="0"
              data-testid="input-review-order"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          data-testid="button-add-review"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          등록
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">등록된 합격후기가 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 p-5" data-testid={`card-admin-review-${r.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-red-600" />
                  <span className="font-bold text-gray-900 text-sm">{r.name}</span>
                  {r.school && <span className="text-xs text-red-600 font-medium">| {r.school}</span>}
                </div>
                <button
                  onClick={() => {
                    if (confirm("삭제하시겠습니까?")) {
                      deleteMutation.mutate(r.id);
                    }
                  }}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  data-testid={`button-delete-review-${r.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{r.content}</p>
              {r.image_urls && r.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.image_urls.map((url, i) => (
                    <img key={i} src={url} alt={`후기 이미지 ${i + 1}`} className="w-20 h-20 object-cover border border-gray-200" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SummaryTimetable {
  id: number;
  division: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

const SUMMARY_DIVISIONS = [
  { value: "high-g1", label: "고1" },
  { value: "high-g2", label: "고2" },
  { value: "high-g3", label: "고3" },
  { value: "junior", label: "초/중등관" },
] as const;

function SummaryTimetablesTab() {
  const [selectedDivision, setSelectedDivision] = useState<string>("high-g1");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const divisionLabel = SUMMARY_DIVISIONS.find((d) => d.value === selectedDivision)?.label || selectedDivision;

  const { data: items = [], isLoading } = useQuery<SummaryTimetable[]>({
    queryKey: ["/api/summary-timetables", selectedDivision],
    queryFn: async () => {
      const res = await fetch(`/api/summary-timetables?division=${selectedDivision}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/summary-timetables", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-timetables", selectedDivision] });
      setImageFiles([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/summary-timetables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-timetables", selectedDivision] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/summary-timetables/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-timetables", selectedDivision] });
    },
  });

  const handleMove = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newList = [...items];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    reorderMutation.mutate(newList.map((t) => t.id));
  };

  const handleUpload = () => {
    if (imageFiles.length === 0) return;
    const formData = new FormData();
    formData.append("division", selectedDivision);
    imageFiles.forEach((file) => formData.append("images", file));
    addMutation.mutate(formData);
  };

  return (
    <div className="space-y-6" data-testid="section-summary-timetables">
      <div className="flex flex-wrap gap-2 mb-4">
        {SUMMARY_DIVISIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDivision(d.value)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${selectedDivision === d.value ? "bg-red-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
            data-testid={`tab-summary-${d.value}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">요약시간표 이미지 등록 — {divisionLabel}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이미지 선택 (여러 장 가능)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  setImageFiles(files);
                  setImagePreviews(files.map((f) => URL.createObjectURL(f)));
                }
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
              data-testid="input-summary-image"
            />
          </div>
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative">
                  <img src={preview} alt={`미리보기 ${idx + 1}`} className="w-full border border-gray-200" />
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{idx + 1}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={imageFiles.length === 0 || addMutation.isPending}
            className="px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            data-testid="button-add-summary"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {imageFiles.length > 1 ? `${imageFiles.length}개 등록` : "등록"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          등록된 요약시간표 ({items.length}개) — {divisionLabel}
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">등록된 요약시간표가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3 border border-gray-200 p-3" data-testid={`card-summary-${item.id}`}>
                <div className="flex flex-col gap-0.5 flex-shrink-0 pt-2">
                  <button
                    onClick={() => handleMove(idx, "up")}
                    disabled={idx === 0 || reorderMutation.isPending}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                    data-testid={`button-move-up-summary-${item.id}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, "down")}
                    disabled={idx === items.length - 1 || reorderMutation.isPending}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                    data-testid={`button-move-down-summary-${item.id}`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <img src={item.image_url} alt="요약시간표" className="w-full max-w-sm border border-gray-200" />
                </div>
                <button
                  onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate(item.id); }}
                  className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  data-testid={`button-delete-summary-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<"teachers" | "timetables" | "summary-timetables" | "banners" | "popups" | "briefings" | "sms" | "reviews" | "reservations">("teachers");

  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const [loggedIn, setLoggedIn] = useState(false);
  const isAdmin = loggedIn || authStatus?.isAdmin;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <LoginForm
        onLogin={() => {
          setLoggedIn(true);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
        }}
      />
    );
  }

  return (
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
        <div className="flex gap-1 mb-6" data-testid="admin-tabs">
          <button
            onClick={() => setTab("teachers")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "teachers"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-teachers"
          >
            <Users className="w-4 h-4" />
            선생님 관리
          </button>
          <button
            onClick={() => setTab("timetables")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "timetables"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-timetables"
          >
            <Calendar className="w-4 h-4" />
            시간표 관리
          </button>
          <button
            onClick={() => setTab("summary-timetables")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "summary-timetables"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-summary-timetables"
          >
            <Image className="w-4 h-4" />
            요약시간표
          </button>
          <button
            onClick={() => setTab("banners")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "banners"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-banners"
          >
            <Image className="w-4 h-4" />
            배너 관리
          </button>
          <button
            onClick={() => setTab("popups")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "popups"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-popups"
          >
            <Megaphone className="w-4 h-4" />
            팝업 관리
          </button>
          <button
            onClick={() => setTab("briefings")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "briefings"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-briefings"
          >
            <CalendarDays className="w-4 h-4" />
            설명회 관리
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "reviews"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-reviews"
          >
            <Star className="w-4 h-4" />
            합격후기
          </button>
          <button
            onClick={() => setTab("reservations")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "reservations"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-reservations"
          >
            <CalendarDays className="w-4 h-4" />
            수강예약 관리
          </button>
          <button
            onClick={() => setTab("sms")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "sms"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-sms"
          >
            <MessageSquare className="w-4 h-4" />
            문자 수신
          </button>
        </div>

        {tab === "teachers" ? <TeachersTab /> : tab === "timetables" ? <TimetablesTab /> : tab === "summary-timetables" ? <SummaryTimetablesTab /> : tab === "banners" ? <BannersTab /> : tab === "popups" ? <PopupsTab /> : tab === "briefings" ? <BriefingsTab /> : tab === "reviews" ? <ReviewsTab /> : tab === "reservations" ? <ReservationsTab /> : <SmsSubscriptionsTab />}
      </div>
    </div>
  );
}
