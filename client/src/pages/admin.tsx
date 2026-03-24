import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Trash2, Upload, Loader2, Users, User, Calendar, CalendarDays, ArrowLeft, Lock, Megaphone, Eye, EyeOff, Image, Pencil, Check, X, MessageSquare, Star, ListOrdered, Plus, ArrowUp, ArrowDown } from "lucide-react";
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
  effective_teacher_id?: number;
  teacher_name: string;
  category: string;
  target_school: string;
  class_name: string;
  class_time: string;
  start_date: string;
  teacher_image_url: string;
  detail_image_url: string | null;
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
  "고등관": ["수학", "국어", "영어", "탐구", "논술"],
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

  const moveTeacher = (idx: number, dir: "up" | "down") => {
    const newList = [...filteredTeachers];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    reorderMutation.mutate(newList.map((t) => t.id));
  };

  const moveTeacherInAll = (idx: number, dir: "up" | "down") => {
    const newList = [...teachers];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    reorderMutation.mutate(newList.map((t) => t.id));
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<number | null>(null);
  const photoFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/teachers/${id}/photo`, { method: "PATCH", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "업로드 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidateTeachers();
      setUploadingPhotoFor(null);
    },
    onError: () => setUploadingPhotoFor(null),
  });

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

      {/* Photo & Order Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="modal-teacher-photo">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg shadow-xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">사진 · 순서 관리</h3>
                <p className="text-xs text-gray-400 mt-0.5">사진을 클릭하면 변경, ↑↓ 버튼으로 순서 변경</p>
              </div>
              <button onClick={() => setShowPhotoModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" data-testid="button-close-photo-modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">등록된 선생님이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {teachers.map((t, idx) => {
                    const isUploading = uploadingPhotoFor === t.id && updatePhotoMutation.isPending;
                    return (
                      <div key={t.id} className="flex items-center gap-4 border border-gray-100 rounded-lg px-4 py-3 bg-gray-50" data-testid={`row-photo-teacher-${t.id}`}>
                        {/* Photo (click to change) */}
                        <label className="relative flex-shrink-0 cursor-pointer group" title="클릭하여 사진 변경" data-testid={`label-photo-${t.id}`}>
                          {t.image_url ? (
                            <img src={t.image_url} alt={t.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#7B2332] group-hover:opacity-70 transition-opacity" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                              <Users className="w-7 h-7 text-gray-400" />
                            </div>
                          )}
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                              <Loader2 className="w-5 h-5 animate-spin text-[#7B2332]" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#7B2332] rounded-full flex items-center justify-center group-hover:opacity-100 opacity-80 transition-opacity">
                            <Upload className="w-3 h-3 text-white" />
                          </div>
                          <input
                            ref={(el) => { photoFileRefs.current[t.id] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingPhotoFor(t.id);
                              updatePhotoMutation.mutate({ id: t.id, file });
                              if (photoFileRefs.current[t.id]) photoFileRefs.current[t.id]!.value = "";
                            }}
                          />
                        </label>
                        {/* Name & Subject */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{t.name}</p>
                          <p className="text-xs text-gray-400 truncate">{t.division ? `${t.division} · ` : ""}{t.subject}</p>
                          <p className="text-xs text-[#7B2332] mt-1">클릭하여 사진 변경</p>
                        </div>
                        {/* Up/Down Buttons */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => moveTeacherInAll(idx, "up")}
                            disabled={idx === 0 || reorderMutation.isPending}
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-500 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            data-testid={`button-up-modal-${t.id}`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveTeacherInAll(idx, "down")}
                            disabled={idx === teachers.length - 1 || reorderMutation.isPending}
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-500 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            data-testid={`button-down-modal-${t.id}`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">등록된 선생님 ({filteredTeachers.length}명)</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPhotoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[#7B2332] text-[#7B2332] hover:bg-red-50 rounded transition-colors"
            data-testid="button-open-photo-modal"
          >
            <Image className="w-4 h-4" />
            사진 · 순서 관리
          </button>
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
            <div
              key={t.id}
              className="bg-white border border-gray-200 p-4 transition-colors"
              data-testid={`card-admin-teacher-${t.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveTeacher(idx, "up")}
                    disabled={idx === 0 || reorderMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-400 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    data-testid={`button-up-teacher-${t.id}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveTeacher(idx, "down")}
                    disabled={idx === filteredTeachers.length - 1 || reorderMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-400 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    data-testid={`button-down-teacher-${t.id}`}
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
              <TeacherImagesManager teacherId={t.id} teacherName={t.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TeacherImageItem {
  id: number;
  teacher_id: number;
  image_url: string;
  display_order: number;
}

function TeacherImagesManager({ teacherId, teacherName }: { teacherId: number; teacherName: string }) {
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: images = [], isLoading } = useQuery<TeacherImageItem[]>({
    queryKey: ["/api/teachers", teacherId, "images"],
    queryFn: async () => {
      const res = await fetch(`/api/teachers/${teacherId}/images`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: expanded,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/teachers/${teacherId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("업로드 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId, "images"] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      await apiRequest("DELETE", `/api/teacher-images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers", teacherId, "images"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      uploadMutation.mutate(files[i]);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#7B2332] transition-colors"
        data-testid={`button-toggle-images-${teacherId}`}
      >
        <Image className="w-3.5 h-3.5" />
        브로셔 관리 ({expanded ? "접기" : "펼치기"})
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
              data-testid={`input-teacher-images-${teacherId}`}
            />
            {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : images.length === 0 ? (
            <p className="text-xs text-gray-400">등록된 브로셔가 없습니다. 브로셔를 올리면 선생님 클릭 시 브로셔가 화면에 꽉 차게 보입니다.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.image_url}
                    alt={teacherName}
                    className="w-full aspect-square object-cover rounded border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      if (confirm("이 사진을 삭제하시겠습니까?")) {
                        deleteMutation.mutate(img.id);
                      }
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-delete-image-${img.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORY_FILTER_OPTIONS: Record<string, string[]> = {
  "고등관-고1": ["화성고", "가온고", "병점고", "영덕고", "수원고", "청명고"],
  "고등관-고2": ["화성고", "가온고", "청명고", "영덕고", "고색고"],
  "고등관-고3": ["국어", "영어", "수학", "생명과학", "사회문화", "생윤", "논술"],
};

function TimetablesTab() {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<{
    category: string;
    subject: string;
    target_school: string;
    class_name: string;
    class_time: string;
    start_date: string;
    teacher_id: string;
    description: string;
  }>();
  const selectedCategory = watch("category");
  const [teacherImageFile, setTeacherImageFile] = useState<File | null>(null);
  const [teacherImagePreview, setTeacherImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [detailImagePreview, setDetailImagePreview] = useState<string>("");
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<number | null>(null);
  const photoFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editDetailImageFile, setEditDetailImageFile] = useState<File | null>(null);
  const [editDetailImagePreview, setEditDetailImagePreview] = useState<string>("");
  const editDetailFileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    watch: editWatch,
    setValue: editSetValue,
    formState: { errors: editErrors },
  } = useForm<{
    category: string;
    subject: string;
    target_school: string;
    class_name: string;
    class_time: string;
    start_date: string;
    teacher_id: string;
    description: string;
  }>();
  const editCategory = editWatch("category");

  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables"],
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: timetablePhotos = [] } = useQuery<{ teacher_id: number; teacher_name: string; image_url: string }[]>({
    queryKey: ["/api/teacher-timetable-photos"],
  });

  const uploadTimetablePhotoMutation = useMutation({
    mutationFn: async ({ teacherId, teacherName, file }: { teacherId: number; teacherName: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("teacher_name", teacherName);
      const res = await fetch(`/api/teacher-timetable-photos/${teacherId}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "업로드 실패"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-timetable-photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setUploadingPhotoFor(null);
    },
  });

  const deleteTimetablePhotoMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const res = await fetch(`/api/teacher-timetable-photos/${teacherId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "삭제 실패"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-timetable-photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const uploadIndividualPhotoMutation = useMutation({
    mutationFn: async ({ timetableId, file }: { timetableId: number; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/timetables/${timetableId}/photo`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "업로드 실패"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const deleteIndividualPhotoMutation = useMutation({
    mutationFn: async (timetableId: number) => {
      const res = await fetch(`/api/timetables/${timetableId}/photo`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "삭제 실패"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const cardPhotoRefs = useRef<Record<number, HTMLInputElement | null>>({});

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
      setShowAddForm(false);
      setTeacherImageFile(null);
      setTeacherImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDetailImageFile(null);
      setDetailImagePreview("");
      if (detailFileInputRef.current) detailFileInputRef.current.value = "";
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const res = await fetch(`/api/timetables/${id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "수정 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setEditingId(null);
      setEditImageFile(null);
      setEditImagePreview("");
      if (editFileInputRef.current) editFileInputRef.current.value = "";
      setEditDetailImageFile(null);
      setEditDetailImagePreview("");
      if (editDetailFileInputRef.current) editDetailFileInputRef.current.value = "";
    },
  });

  const handleEditStart = (tt: Timetable) => {
    setEditingId(tt.id);
    setEditImageFile(null);
    setEditImagePreview("");
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    setEditDetailImageFile(null);
    setEditDetailImagePreview("");
    if (editDetailFileInputRef.current) editDetailFileInputRef.current.value = "";
    editReset({
      category: tt.category,
      subject: tt.subject,
      target_school: tt.target_school || "",
      class_name: tt.class_name,
      class_time: tt.class_time || "",
      start_date: tt.start_date || "",
      teacher_id: tt.teacher_id ? String(tt.teacher_id) : "",
      description: tt.description || "",
    });
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    const teacher = teachers.find((t) => String(t.id) === data.teacher_id);
    const formData = new FormData();
    if (data.teacher_id) formData.append("teacher_id", data.teacher_id);
    formData.append("teacher_name", teacher?.name || data.teacher_id || "");
    formData.append("category", data.category);
    formData.append("subject", data.subject || "");
    formData.append("target_school", data.target_school || "");
    formData.append("class_name", data.class_name);
    formData.append("class_time", data.class_time || "");
    formData.append("start_date", data.start_date || "");
    formData.append("description", data.description || "");
    if (editImageFile) formData.append("teacher_image", editImageFile);
    if (editDetailImageFile) formData.append("detail_image", editDetailImageFile);
    updateMutation.mutate({ id: editingId, formData });
  };

  const moveTT = (idx: number, dir: "up" | "down") => {
    const newList = [...filteredTimetables];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
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
    if (detailImageFile) formData.append("detail_image", detailImageFile);
    addMutation.mutate(formData);
  };

  // Photo manager: unique teachers with timetables (including name-matched ones)
  const uniqueTeacherMap = new Map<number, { id: number; name: string; profileUrl: string }>();
  for (const tt of timetables) {
    const effectiveId = tt.teacher_id || tt.effective_teacher_id || null;
    if (effectiveId && tt.teacher_name && !uniqueTeacherMap.has(effectiveId)) {
      const teacher = teachers.find((t) => t.id === effectiveId);
      uniqueTeacherMap.set(effectiveId, { id: effectiveId, name: tt.teacher_name, profileUrl: teacher?.image_url || "" });
    }
  }
  const uniqueTeachersForPhoto = [...uniqueTeacherMap.values()];
  const timetablePhotoMap = new Map(timetablePhotos.map((p) => [p.teacher_id, p.image_url]));

  const CATEGORY_TABS = [
    { value: "all", label: "전체" },
    { value: "고등관-고1", label: "고1" },
    { value: "고등관-고2", label: "고2" },
    { value: "고등관-고3", label: "고3" },
    { value: "초/중등관", label: "초/중등관" },
    { value: "고등관", label: "고등관(전체)" },
  ];

  const SUBJECT_COLORS: Record<string, string> = {
    수학: "bg-blue-50 text-blue-700 border-blue-200",
    국어: "bg-green-50 text-green-700 border-green-200",
    영어: "bg-orange-50 text-orange-700 border-orange-200",
    탐구: "bg-purple-50 text-purple-700 border-purple-200",
    논술: "bg-pink-50 text-pink-700 border-pink-200",
  };

  // Group by teacher name (preserving display_order within each group)
  const teacherGroupMap = new Map<string, { teacherName: string; photoUrl: string; items: { tt: Timetable; idx: number }[] }>();
  filteredTimetables.forEach((tt, idx) => {
    const key = tt.teacher_name?.trim() || "담당 없음";
    if (!teacherGroupMap.has(key)) {
      teacherGroupMap.set(key, { teacherName: key, photoUrl: tt.teacher_image_url || "", items: [] });
    }
    teacherGroupMap.get(key)!.items.push({ tt, idx });
  });
  const groupedByTeacher = [...teacherGroupMap.values()];

  const inputCls = "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#7B2332] bg-white rounded";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  const TimetableCard = ({ tt, idx }: { tt: Timetable; idx: number }) => (
    <div
      key={tt.id}
      className="border border-gray-200 bg-white rounded-lg overflow-hidden"
      data-testid={`card-admin-timetable-${tt.id}`}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => moveTT(idx, "up")}
            disabled={idx === 0 || reorderMutation.isPending}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-400 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            data-testid={`button-up-tt-${tt.id}`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => moveTT(idx, "down")}
            disabled={idx === filteredTimetables.length - 1 || reorderMutation.isPending}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-400 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            data-testid={`button-down-tt-${tt.id}`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <label
          className="relative flex-shrink-0 cursor-pointer group"
          title="클릭하여 사진 변경"
          data-testid={`label-card-photo-${tt.id}`}
        >
          {tt.teacher_image_url ? (
            <img src={tt.teacher_image_url} alt={tt.teacher_name} className="w-10 h-10 rounded-full object-cover border border-gray-200 group-hover:opacity-70 transition-opacity" />
          ) : (
            <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded-full group-hover:bg-gray-200 transition-colors">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadIndividualPhotoMutation.isPending && uploadIndividualPhotoMutation.variables?.timetableId === tt.id
              ? <Loader2 className="w-4 h-4 text-white animate-spin drop-shadow" />
              : <Upload className="w-3.5 h-3.5 text-white drop-shadow" />
            }
          </div>
          <input
            ref={(el) => { cardPhotoRefs.current[tt.id] = el; }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadIndividualPhotoMutation.mutate({ timetableId: tt.id, file });
              if (cardPhotoRefs.current[tt.id]) cardPhotoRefs.current[tt.id]!.value = "";
            }}
          />
        </label>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{tt.class_name}</p>
            {tt.subject && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SUBJECT_COLORS[tt.subject] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {tt.subject}
              </span>
            )}
            {!tt.teacher_id && tt.effective_teacher_id && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-medium">자동</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {tt.target_school && <span className="text-xs text-gray-400">{tt.target_school}</span>}
            {tt.class_time && <span className="text-xs text-gray-400">{tt.class_time}</span>}
            {tt.start_date && <span className="text-xs text-gray-400">개강 {tt.start_date}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => editingId === tt.id ? setEditingId(null) : handleEditStart(tt)}
            className={`p-1.5 rounded transition-colors ${editingId === tt.id ? "text-[#7B2332] bg-red-50" : "text-gray-400 hover:text-[#7B2332] hover:bg-red-50"}`}
            data-testid={`button-edit-timetable-${tt.id}`}
            title="수정"
          ><Pencil className="w-3.5 h-3.5" /></button>
          <button
            onClick={() => { if (confirm("이 시간표를 삭제하시겠습니까?")) deleteMutation.mutate(tt.id); }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            data-testid={`button-delete-timetable-${tt.id}`}
          ><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {editingId === tt.id && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <form onSubmit={editHandleSubmit(onEditSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>카테고리 *</label>
                <select {...editRegister("category", { required: true })} className={inputCls}>
                  <option value="고등관">고등관 (전체)</option>
                  <option value="고등관-고1">고등관 - 고1</option>
                  <option value="고등관-고2">고등관 - 고2</option>
                  <option value="고등관-고3">고등관 - 고3</option>
                  <option value="초/중등관">초/중등관</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>과목 *</label>
                <select {...editRegister("subject", { required: true })} className={inputCls}>
                  {TIMETABLE_SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>담당 선생님</label>
                <select {...editRegister("teacher_id")} className={inputCls}>
                  <option value="">선택 안함</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>목차 (필터)</label>
                {CATEGORY_FILTER_OPTIONS[editCategory] ? (
                  <select {...editRegister("target_school")} className={inputCls}>
                    <option value="">선택 안함</option>
                    {CATEGORY_FILTER_OPTIONS[editCategory].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input {...editRegister("target_school")} className={inputCls} placeholder="예: 화성고, 가온고" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>수업명 *</label>
                <input {...editRegister("class_name", { required: true })} className={inputCls} placeholder="예: 수학 정규반" />
              </div>
              <div>
                <label className={labelCls}>수업 시간</label>
                <input {...editRegister("class_time")} className={inputCls} placeholder="예: 월/수 18:00~20:00" />
              </div>
              <div>
                <label className={labelCls}>개강일</label>
                <input {...editRegister("start_date")} className={inputCls} placeholder="예: 3/3" />
              </div>
            </div>
            <div>
              <label className={labelCls}>수업 설명</label>
              <textarea {...editRegister("description")} className={inputCls + " resize-none"} rows={2} placeholder="수업 내용, 커리큘럼 등" />
            </div>
            <div>
              <label className={labelCls}>상세보기 사진 변경</label>
              <div className="flex items-center gap-3">
                {(editDetailImagePreview || tt.detail_image_url) && (
                  <img src={editDetailImagePreview || tt.detail_image_url!} alt="미리보기" className="w-12 h-12 object-cover border border-gray-200 rounded flex-shrink-0" />
                )}
                <input
                  ref={editDetailFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { setEditDetailImageFile(file); const r = new FileReader(); r.onloadend = () => setEditDetailImagePreview(r.result as string); r.readAsDataURL(file); }
                  }}
                  className="text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 file:rounded"
                  data-testid={`input-edit-timetable-detail-image-${tt.id}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 bg-[#7B2332] text-white px-4 py-2 text-sm font-semibold hover:bg-[#6a1d2b] disabled:opacity-50 transition-colors rounded"
                data-testid={`button-save-timetable-${tt.id}`}
              >
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                저장
              </button>
              <button type="button"
                onClick={() => { setEditingId(null); setEditDetailImageFile(null); setEditDetailImagePreview(""); }}
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50 transition-colors rounded"
              >
                <X className="w-3.5 h-3.5" />취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-gray-900">시간표 관리 <span className="text-sm font-normal text-gray-400">({filteredTimetables.length}개)</span></h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowPhotoManager(!showPhotoManager); if (showAddForm) setShowAddForm(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded border transition-colors ${showPhotoManager ? "bg-gray-100 text-gray-700 border-gray-300" : "bg-white text-gray-700 border-gray-300 hover:border-[#7B2332] hover:text-[#7B2332]"}`}
            data-testid="button-toggle-photo-manager"
          >
            <Image className="w-4 h-4" />사진 관리
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); if (showPhotoManager) setShowPhotoManager(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded transition-colors ${showAddForm ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-[#7B2332] text-white hover:bg-[#6a1d2b]"}`}
            data-testid="button-toggle-add-timetable"
          >
            {showAddForm ? <><X className="w-4 h-4" />닫기</> : <><Plus className="w-4 h-4" />시간표 추가</>}
          </button>
        </div>
      </div>

      {/* Photo Manager Panel */}
      {showPhotoManager && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5" data-testid="panel-photo-manager">
          <div className="flex items-center gap-2 mb-1">
            <Image className="w-4 h-4 text-[#7B2332]" />
            <h4 className="text-sm font-bold text-gray-800">시간표 사진 관리</h4>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            선생님별로 시간표에 표시되는 사진을 설정합니다. (선생님 소개 페이지 사진과 별도로 관리됩니다)
          </p>
          {uniqueTeachersForPhoto.length === 0 ? (
            <p className="text-sm text-gray-400">담당 선생님이 연결된 시간표가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uniqueTeachersForPhoto.map((teacher) => {
                const timetablePhotoUrl = timetablePhotoMap.get(teacher.id);
                const isUploading = uploadingPhotoFor === teacher.id && uploadTimetablePhotoMutation.isPending;
                return (
                  <div key={teacher.id} className="border border-gray-100 rounded-lg p-3 flex items-center gap-3 bg-gray-50" data-testid={`card-teacher-photo-${teacher.id}`}>
                    <div className="relative flex-shrink-0">
                      {timetablePhotoUrl ? (
                        <img src={timetablePhotoUrl} alt={teacher.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#7B2332]" />
                      ) : teacher.profileUrl ? (
                        <img src={teacher.profileUrl} alt={teacher.name} className="w-14 h-14 rounded-full object-cover border-2 border-dashed border-gray-300" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      {timetablePhotoUrl && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#7B2332] rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{teacher.name}</p>
                      <p className="text-xs text-gray-400 mb-2">
                        {timetablePhotoUrl ? "전용 사진 설정됨" : "프로필 사진 사용 중"}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <label
                          className={`cursor-pointer flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${isUploading ? "opacity-50 cursor-not-allowed" : "bg-[#7B2332] text-white border-[#7B2332] hover:bg-[#6a1d2b]"}`}
                          data-testid={`label-upload-photo-${teacher.id}`}
                        >
                          {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {timetablePhotoUrl ? "변경" : "설정"}
                          <input
                            ref={(el) => { photoFileRefs.current[teacher.id] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingPhotoFor(teacher.id);
                              uploadTimetablePhotoMutation.mutate({ teacherId: teacher.id, teacherName: teacher.name, file });
                              if (photoFileRefs.current[teacher.id]) photoFileRefs.current[teacher.id]!.value = "";
                            }}
                          />
                        </label>
                        {timetablePhotoUrl && (
                          <button
                            onClick={() => { if (confirm(`${teacher.name} 선생님의 시간표 전용 사진을 삭제하시겠습니까?`)) deleteTimetablePhotoMutation.mutate(teacher.id); }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-300 rounded hover:text-red-500 hover:border-red-300 transition-colors"
                            data-testid={`button-delete-photo-${teacher.id}`}
                          >
                            <Trash2 className="w-3 h-3" />삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Add Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5" data-testid="form-add-timetable">
          <h4 className="text-sm font-bold text-gray-800 mb-4">새 시간표 등록</h4>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>카테고리 *</label>
                <select {...register("category", { required: "카테고리를 선택하세요" })} className={inputCls} defaultValue="" data-testid="select-timetable-category">
                  <option value="" disabled>선택</option>
                  <option value="고등관">고등관 (전체)</option>
                  <option value="고등관-고1">고등관 - 고1</option>
                  <option value="고등관-고2">고등관 - 고2</option>
                  <option value="고등관-고3">고등관 - 고3</option>
                  <option value="초/중등관">초/중등관</option>
                </select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <label className={labelCls}>과목 *</label>
                <select {...register("subject", { required: "과목을 선택하세요" })} className={inputCls} defaultValue="" data-testid="select-timetable-subject">
                  <option value="" disabled>선택</option>
                  {TIMETABLE_SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <label className={labelCls}>담당 선생님</label>
                <select {...register("teacher_id")} className={inputCls} defaultValue="" data-testid="select-timetable-teacher">
                  <option value="">선택 안함</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>목차 (필터) {CATEGORY_FILTER_OPTIONS[selectedCategory] ? "*" : ""}</label>
                {CATEGORY_FILTER_OPTIONS[selectedCategory] ? (
                  <>
                    <select {...register("target_school", { required: "목차를 선택하세요" })} className={inputCls} defaultValue="" data-testid="select-timetable-school">
                      <option value="" disabled>선택</option>
                      {CATEGORY_FILTER_OPTIONS[selectedCategory].map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {errors.target_school && <p className="text-xs text-red-500 mt-1">{errors.target_school.message}</p>}
                  </>
                ) : (
                  <input {...register("target_school")} className={inputCls} placeholder="예: 화성고, 가온고" data-testid="input-timetable-school" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>수업명 *</label>
                <input {...register("class_name", { required: "수업명을 입력하세요" })} className={inputCls} placeholder="예: 수학 정규반" data-testid="input-timetable-classname" />
                {errors.class_name && <p className="text-xs text-red-500 mt-1">{errors.class_name.message}</p>}
              </div>
              <div>
                <label className={labelCls}>수업 시간</label>
                <input {...register("class_time")} className={inputCls} placeholder="예: 월/수 18:00~20:00" data-testid="input-timetable-time" />
              </div>
              <div>
                <label className={labelCls}>개강일</label>
                <input {...register("start_date")} className={inputCls} placeholder="예: 3월 3일" data-testid="input-timetable-date" />
              </div>
            </div>
            <div>
              <label className={labelCls}>수업 설명 (상세보기에 표시)</label>
              <textarea {...register("description")} className={inputCls + " resize-none"} rows={3}
                placeholder={"수업 내용, 커리큘럼, 교재 등 상세 설명\n예: 기출분석 중심의 내신 대비 수학 수업"}
                data-testid="textarea-timetable-description"
              />
            </div>
            <div>
              <label className={labelCls}>상세보기 사진</label>
              <div className="flex items-center gap-3">
                <input ref={detailFileInputRef} type="file" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setDetailImageFile(f); const r = new FileReader(); r.onloadend = () => setDetailImagePreview(r.result as string); r.readAsDataURL(f); } }}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 file:rounded"
                  data-testid="input-timetable-detail-image"
                />
                {detailImagePreview && <img src={detailImagePreview} alt="미리보기" className="w-12 h-12 object-cover border border-gray-200 rounded flex-shrink-0" />}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={addMutation.isPending}
                className="flex items-center gap-2 bg-[#7B2332] text-white px-5 py-2 text-sm font-semibold hover:bg-[#6a1d2b] disabled:opacity-50 transition-colors rounded"
                data-testid="button-add-timetable"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                등록하기
              </button>
              {addMutation.isError && <p className="text-xs text-red-500">{(addMutation.error as Error).message}</p>}
            </div>
          </form>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap" data-testid="timetable-category-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterCategory(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
              filterCategory === tab.value
                ? "bg-[#7B2332] text-white border-[#7B2332]"
                : "bg-white text-gray-600 border-gray-300 hover:border-[#7B2332] hover:text-[#7B2332]"
            }`}
            data-testid={`tab-category-${tab.value}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timetable List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filteredTimetables.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">등록된 시간표가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByTeacher.map(({ teacherName, photoUrl, items }) => (
            <div key={teacherName}>
              <div className="flex items-center gap-2 mb-2">
                {photoUrl ? (
                  <img src={photoUrl} alt={teacherName} className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                )}
                <span className="text-sm font-bold text-gray-800">{teacherName}</span>
                <span className="text-xs text-gray-400">{items.length}개</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2">
                {items.map(({ tt, idx }) => <TimetableCard key={tt.id} tt={tt} idx={idx} />)}
              </div>
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
  const editFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState("main");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title: string; subtitle: string; description: string; link_url: string; display_order: string;
  }>();
  const { register: eReg, handleSubmit: eSubmit, reset: eReset, formState: { errors: eErrors } } = useForm<{
    title: string; subtitle: string; description: string; link_url: string; display_order: string;
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const res = await fetch(`/api/banners/${id}`, { method: "PUT", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "수정 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidateBannerCaches();
      setEditingId(null);
      setEditImagePreview("");
      if (editFileRef.current) editFileRef.current.value = "";
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

  const handleEditStart = (b: Banner) => {
    setEditingId(b.id);
    setEditImagePreview("");
    if (editFileRef.current) editFileRef.current.value = "";
    eReset({ title: b.title, subtitle: b.subtitle || "", description: b.description || "", link_url: b.link_url || "", display_order: String(b.display_order) });
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    const fd = new FormData();
    fd.append("title", data.title);
    fd.append("subtitle", data.subtitle || "");
    fd.append("description", data.description || "");
    fd.append("link_url", data.link_url || "");
    fd.append("display_order", data.display_order || "0");
    const file = editFileRef.current?.files?.[0];
    if (file) fd.append("image", file);
    updateMutation.mutate({ id: editingId, formData: fd });
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 (큰 글씨)</label>
              <input
                {...register("title")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                placeholder="예: 2026년 NEW"
                data-testid="input-banner-title"
              />
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
            <div key={b.id} className="border border-gray-200 bg-white" data-testid={`card-admin-banner-${b.id}`}>
              <div className="flex items-center gap-4 p-4">
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
                <button onClick={() => toggleMutation.mutate(b.id)}
                  className={`flex-shrink-0 p-2 transition-colors ${b.is_active ? "text-green-500 hover:text-green-700 hover:bg-green-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"}`}
                  title={b.is_active ? "활성 (클릭하면 비활성)" : "비활성 (클릭하면 활성)"} data-testid={`button-toggle-banner-${b.id}`}>
                  {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => editingId === b.id ? setEditingId(null) : handleEditStart(b)}
                  className="flex-shrink-0 p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="수정" data-testid={`button-edit-banner-${b.id}`}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm(`"${b.title}" 배너를 삭제하시겠습니까?`)) deleteMutation.mutate(b.id); }}
                  className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" data-testid={`button-delete-banner-${b.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {editingId === b.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">배너 수정</p>
                  <form onSubmit={eSubmit(onEditSubmit)} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">제목</label>
                        <input {...eReg("title")} className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">부제목</label>
                        <input {...eReg("subtitle")} className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
                      <input {...eReg("description")} className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">링크 URL</label>
                        <input {...eReg("link_url")} className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" placeholder="/high-school" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">순서</label>
                        <input {...eReg("display_order")} type="number" className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">배경 이미지 변경</label>
                      <div className="flex items-center gap-3">
                        {(editImagePreview || b.image_url) && (
                          <img src={editImagePreview || b.image_url!} alt="미리보기" className="w-20 h-12 object-cover flex-shrink-0 border border-gray-200" />
                        )}
                        <input ref={editFileRef} type="file" accept="image/*"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setEditImagePreview(r.result as string); r.readAsDataURL(f); } }}
                          className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                          data-testid={`input-edit-banner-image-${b.id}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="submit" disabled={updateMutation.isPending}
                        className="flex items-center gap-1.5 bg-[#7B2332] text-white px-4 py-1.5 text-sm font-semibold hover:bg-[#6a1d2b] disabled:opacity-50 transition-colors"
                        data-testid={`button-save-banner-${b.id}`}>
                        {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        저장
                      </button>
                      <button type="button" onClick={() => { setEditingId(null); setEditImagePreview(""); if (editFileRef.current) editFileRef.current.value = ""; }}
                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors">
                        <X className="w-3.5 h-3.5" />취소
                      </button>
                    </div>
                  </form>
                </div>
              )}
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
  const editFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title: string; link_url: string; display_order: string;
  }>();
  const { register: eReg, handleSubmit: eSubmit, reset: eReset, formState: { errors: eErrors } } = useForm<{
    title: string; link_url: string; display_order: string;
  }>();

  const { data: popups = [], isLoading } = useQuery<Popup[]>({
    queryKey: ["/api/popups/all"],
  });

  const invalidatePopupCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/popups/all"] });
    queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
  };

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/popups", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidatePopupCaches();
      reset();
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const res = await fetch(`/api/popups/${id}`, { method: "PUT", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "수정 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidatePopupCaches();
      setEditingId(null);
      setEditImagePreview("");
      if (editFileRef.current) editFileRef.current.value = "";
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("PATCH", `/api/popups/${id}/toggle`); },
    onSuccess: invalidatePopupCaches,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/popups/${id}`); },
    onSuccess: invalidatePopupCaches,
  });

  const handleEditStart = (p: Popup) => {
    setEditingId(p.id);
    setEditImagePreview("");
    if (editFileRef.current) editFileRef.current.value = "";
    eReset({ title: p.title, link_url: p.link_url || "", display_order: String(p.display_order) });
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    const fd = new FormData();
    fd.append("title", data.title);
    fd.append("link_url", data.link_url || "");
    fd.append("display_order", data.display_order || "0");
    const file = editFileRef.current?.files?.[0];
    if (file) fd.append("image", file);
    updateMutation.mutate({ id: editingId, formData: fd });
  };

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
            <div key={p.id} className="border border-gray-200 bg-white" data-testid={`card-admin-popup-${p.id}`}>
              <div className="flex items-center gap-4 p-4">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-20 h-14 object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-14 bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-7 h-7 text-red-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 truncate">{p.link_url || "링크 없음"}{" · 순서: " + p.display_order}</p>
                </div>
                <button onClick={() => toggleMutation.mutate(p.id)}
                  className={`flex-shrink-0 p-2 transition-colors ${p.is_active ? "text-green-500 hover:text-green-700 hover:bg-green-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"}`}
                  title={p.is_active ? "활성 (클릭하면 비활성)" : "비활성 (클릭하면 활성)"} data-testid={`button-toggle-popup-${p.id}`}>
                  {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => editingId === p.id ? setEditingId(null) : handleEditStart(p)}
                  className="flex-shrink-0 p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="수정" data-testid={`button-edit-popup-${p.id}`}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm(`"${p.title}" 팝업을 삭제하시겠습니까?`)) deleteMutation.mutate(p.id); }}
                  className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" data-testid={`button-delete-popup-${p.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {editingId === p.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">팝업 수정</p>
                  <form onSubmit={eSubmit(onEditSubmit)} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">제목 *</label>
                        <input {...eReg("title", { required: true })} className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" />
                        {eErrors.title && <p className="text-xs text-red-500 mt-0.5">제목을 입력하세요</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">링크 URL</label>
                        <input {...eReg("link_url")} className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">순서</label>
                        <input {...eReg("display_order")} type="number" className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">이미지 변경</label>
                      <div className="flex items-center gap-3">
                        {(editImagePreview || p.image_url) && (
                          <img src={editImagePreview || p.image_url!} alt="미리보기" className="w-16 h-12 object-cover flex-shrink-0 border border-gray-200" />
                        )}
                        <input ref={editFileRef} type="file" accept="image/*"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setEditImagePreview(r.result as string); r.readAsDataURL(f); } }}
                          className="text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                          data-testid={`input-edit-popup-image-${p.id}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button type="submit" disabled={updateMutation.isPending}
                        className="flex items-center gap-1.5 bg-[#7B2332] text-white px-4 py-1.5 text-sm font-semibold hover:bg-[#6a1d2b] disabled:opacity-50 transition-colors"
                        data-testid={`button-save-popup-${p.id}`}>
                        {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        저장
                      </button>
                      <button type="button" onClick={() => { setEditingId(null); setEditImagePreview(""); if (editFileRef.current) editFileRef.current.value = ""; }}
                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors">
                        <X className="w-3.5 h-3.5" />취소
                      </button>
                    </div>
                  </form>
                </div>
              )}
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

interface BriefingEventItem {
  id: number;
  title: string;
  event_date: string;
  category: string;
}

const BRIEFING_CATEGORIES = ["초/중등", "고등"];

function BriefingEventsTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<BriefingEventItem>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("초/중등");

  const { data: events = [], isLoading } = useQuery<BriefingEventItem[]>({
    queryKey: ["/api/briefing-events"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/briefing-events", {
        title: newTitle,
        event_date: newDate,
        category: newCategory,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefing-events"] });
      setNewTitle("");
      setNewDate("");
      setNewCategory("초/중등");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BriefingEventItem> }) => {
      await apiRequest("PUT", `/api/briefing-events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefing-events"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/briefing-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefing-events"] });
    },
  });

  const startEdit = (ev: BriefingEventItem) => {
    setEditingId(ev.id);
    setEditForm({ title: ev.title, event_date: ev.event_date?.split("T")[0], category: ev.category });
  };

  const saveEdit = () => {
    if (editingId === null) return;
    updateMutation.mutate({ id: editingId, data: editForm });
  };

  const catColor = (cat: string) => {
    switch (cat) {
      case "초/중등": return "bg-green-100 text-green-700";
      case "고등": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-briefing-event">
        <h3 className="text-lg font-bold text-gray-900 mb-4">설명회 캘린더 이벤트 추가</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
              placeholder="예: 영통고 예비고1 중간 내신 전략 설명회"
              data-testid="input-event-title"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                data-testid="input-event-date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                data-testid="select-event-category"
              >
                {BRIEFING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !newTitle || !newDate}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            data-testid="button-add-event"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            추가
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">등록된 캘린더 이벤트 ({events.length}개)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center" data-testid="text-events-empty">등록된 이벤트가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white border border-gray-200 p-5" data-testid={`card-admin-event-${ev.id}`}>
              {editingId === ev.id ? (
                <div className="space-y-3">
                  <input
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    placeholder="제목"
                    data-testid="input-edit-event-title"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={editForm.event_date || ""}
                      onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                      data-testid="input-edit-event-date"
                    />
                    <select
                      value={editForm.category || "고등"}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-white"
                      data-testid="select-edit-event-category"
                    >
                      {BRIEFING_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                      data-testid="button-save-event"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
                      data-testid="button-cancel-edit-event"
                    >
                      <X className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 ${catColor(ev.category)}`}>
                      {ev.category}
                    </span>
                    <span className="text-sm text-gray-500 flex-shrink-0">
                      {ev.event_date?.split("T")[0]}
                    </span>
                    <span className="font-medium text-gray-900 text-sm truncate">{ev.title}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(ev)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-edit-event-${ev.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("이 이벤트를 삭제하시겠습니까?")) {
                          deleteMutation.mutate(ev.id);
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-delete-event-${ev.id}`}
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

  const moveSum = (idx: number, dir: "up" | "down") => {
    const newList = [...items];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
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
              <div
                key={item.id}
                className="flex items-start gap-3 border border-gray-200 p-3"
                data-testid={`card-summary-${item.id}`}
              >
                <div className="flex flex-col gap-0.5 flex-shrink-0 pt-2">
                  <button
                    onClick={() => moveSum(idx, "up")}
                    disabled={idx === 0 || reorderMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-400 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    data-testid={`button-up-summary-${item.id}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSum(idx, "down")}
                    disabled={idx === items.length - 1 || reorderMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded bg-white text-gray-400 hover:text-[#7B2332] hover:border-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    data-testid={`button-down-summary-${item.id}`}
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

interface FilterTabItem {
  id: number;
  category: string;
  label: string;
  display_order: number;
}

const FILTER_TAB_CATEGORIES = [
  { value: "고등관-고1", label: "고1" },
  { value: "고등관-고2", label: "고2" },
  { value: "고등관-고3", label: "고3" },
];

function FilterTabsTab() {
  const [selectedCategory, setSelectedCategory] = useState("고등관-고1");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const { data: tabs = [], isLoading } = useQuery<FilterTabItem[]>({
    queryKey: ["/api/filter-tabs", selectedCategory],
    queryFn: async () => {
      const res = await fetch(`/api/filter-tabs?category=${encodeURIComponent(selectedCategory)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/filter-tabs", { category: selectedCategory, label: newLabel.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-tabs", selectedCategory] });
      setNewLabel("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/filter-tabs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-tabs", selectedCategory] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, label }: { id: number; label: string }) => {
      await apiRequest("PUT", `/api/filter-tabs/${id}`, { label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-tabs", selectedCategory] });
      setEditingId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("PATCH", "/api/filter-tabs/reorder", { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-tabs", selectedCategory] });
    },
  });

  const moveTab = (idx: number, dir: "up" | "down") => {
    const newTabs = [...tabs];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newTabs.length) return;
    [newTabs[idx], newTabs[swapIdx]] = [newTabs[swapIdx], newTabs[idx]];
    reorderMutation.mutate(newTabs.map((t) => t.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_TAB_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
              selectedCategory === cat.value
                ? "bg-[#7B2332] text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
            data-testid={`filter-category-${cat.value}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="새 목차 이름 입력"
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2332] focus:border-transparent"
          data-testid="input-new-filter-tab"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) addMutation.mutate();
          }}
        />
        <button
          onClick={() => newLabel.trim() && addMutation.mutate()}
          disabled={!newLabel.trim() || addMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7B2332] text-white text-sm font-medium rounded hover:bg-[#5a1a25] disabled:opacity-50 transition-colors"
          data-testid="button-add-filter-tab"
        >
          {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          추가
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : tabs.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 목차가 없습니다.</p>
      ) : (
        <div className="space-y-1.5">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded group hover:border-gray-300 transition-colors"
              data-testid={`filter-tab-item-${tab.id}`}
            >
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveTab(index, "up")}
                  disabled={index === 0 || reorderMutation.isPending}
                  className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  data-testid={`button-up-tab-${tab.id}`}
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => moveTab(index, "down")}
                  disabled={index === tabs.length - 1 || reorderMutation.isPending}
                  className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-[#7B2332] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  data-testid={`button-down-tab-${tab.id}`}
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-gray-400 w-6 text-center font-mono">{index + 1}</span>

              {editingId === tab.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#7B2332]"
                    data-testid={`input-edit-filter-tab-${tab.id}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingLabel.trim()) updateMutation.mutate({ id: tab.id, label: editingLabel.trim() });
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => editingLabel.trim() && updateMutation.mutate({ id: tab.id, label: editingLabel.trim() })}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-800">{tab.label}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(tab.id); setEditingLabel(tab.label); }}
                      className="p-1 text-gray-400 hover:text-[#7B2332]"
                      data-testid={`button-edit-filter-tab-${tab.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`"${tab.label}" 목차를 삭제하시겠습니까?`)) deleteMutation.mutate(tab.id); }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      data-testid={`button-delete-filter-tab-${tab.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<"teachers" | "timetables" | "summary-timetables" | "banners" | "popups" | "briefings" | "sms" | "reviews" | "reservations" | "filter-tabs">("teachers");

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
            onClick={() => setTab("filter-tabs")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "filter-tabs"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-filter-tabs"
          >
            <ListOrdered className="w-4 h-4" />
            목차 관리
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
            onClick={() => setTab("briefing-events")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              tab === "briefing-events"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
            data-testid="tab-briefing-events"
          >
            <CalendarDays className="w-4 h-4" />
            설명회 캘린더
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

        {tab === "teachers" ? <TeachersTab /> : tab === "timetables" ? <TimetablesTab /> : tab === "filter-tabs" ? <FilterTabsTab /> : tab === "summary-timetables" ? <SummaryTimetablesTab /> : tab === "banners" ? <BannersTab /> : tab === "popups" ? <PopupsTab /> : tab === "briefings" ? <BriefingsTab /> : tab === "briefing-events" ? <BriefingEventsTab /> : tab === "reviews" ? <ReviewsTab /> : tab === "reservations" ? <ReservationsTab /> : <SmsSubscriptionsTab />}
      </div>
    </div>
  );
}
