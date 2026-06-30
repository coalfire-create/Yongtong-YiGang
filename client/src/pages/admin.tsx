import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm, useFieldArray } from "react-hook-form";
import { Trash2, Upload, Download, Loader2, Users, User, Calendar, CalendarDays, ArrowLeft, Lock, Megaphone, Eye, EyeOff, Image, Pencil, Check, X, MessageSquare, Star, ListOrdered, Plus, ArrowUp, ArrowDown, GripVertical, BookOpen } from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  is_visible: boolean;
  is_union: boolean;
  teacher_ids: number[] | null;
  created_at: string;
}

interface School {
  id: number;
  name: string;
  logo_url: string | null;
  created_at: string;
}

interface NavigationMenu {
  id: number;
  label: string;
  path: string;
  parent_id: number | null;
  display_order: number;
  is_visible: boolean;
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
  subject: string;
  teacher_name: string;
  target_school: string;
  class_time: string;
  start_date: string;
  category: string;
  created_at: string;
}

// Stable empty arrays - avoids React infinite loop from useEffect([data])
const EMPTY_TEACHERS: Teacher[] = [];
const EMPTY_TIMETABLES: Timetable[] = [];
const EMPTY_SCHOOLS: School[] = [];
const EMPTY_SUMMARY_TT: { id: number; division: string; image_url: string; display_order: number }[] = [];
const EMPTY_FILTER_TABS: { id: number; category: string; label: string; display_order: number }[] = [];

const SUBJECT_OPTIONS: Record<string, string[]> = {
  "고등관": ["수학", "국어", "영어", "통합과학", "통합사회/한국사", "탐구", "논술"],
  "초/중등관": ["수학", "국어", "영어", "탐구"],
};

const TIMETABLE_SUBJECT_OPTIONS = ["수학", "국어", "영어", "통합과학", "통합사회/한국사", "탐구", "논술"];

interface SortableModalRowProps {
  teacher: Teacher;
  isUploading: boolean;
  photoFileRefs: { current: Record<number, HTMLInputElement | null> };
  onPhotoChange: (id: number, file: File) => void;
}

function SortableModalRow({ teacher: t, isUploading, photoFileRefs, onPhotoChange }: SortableModalRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50" data-testid={`row-photo-teacher-${t.id}`}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0">
        <GripVertical className="w-5 h-5" />
      </div>
      <label className="relative flex-shrink-0 cursor-pointer group" title="클릭하여 사진 변경">
        {t.image_url ? (
          <img src={t.image_url} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#7B2332] group-hover:opacity-70 transition-opacity" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
            <Loader2 className="w-4 h-4 animate-spin text-[#7B2332]" />
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#7B2332] rounded-full flex items-center justify-center">
          <Upload className="w-2.5 h-2.5 text-white" />
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
            onPhotoChange(t.id, file);
            if (photoFileRefs.current[t.id]) photoFileRefs.current[t.id]!.value = "";
          }}
        />
      </label>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate">{t.name}</p>
        <p className="text-xs text-gray-400 truncate">{t.division ? `${t.division} · ` : ""}{t.subject}</p>
      </div>
    </div>
  );
}

interface SortableTeacherCardProps {
  teacher: Teacher;
  onDelete: (id: number, name: string) => void;
  onEditBio: (id: number, bio: string) => void;
  editingBioId: number | null;
  editBioText: string;
  onBioTextChange: (text: string) => void;
  onBioSave: (id: number) => void;
  onBioCancelEdit: () => void;
  bioMutationPending: boolean;
  divisionLabel: Record<string, string>;
}

function SortableTeacherCard({ teacher: t, onDelete, onEditBio, editingBioId, editBioText, onBioTextChange, onBioSave, onBioCancelEdit, bioMutationPending, divisionLabel }: SortableTeacherCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 p-4" data-testid={`card-admin-teacher-${t.id}`}>
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none flex-shrink-0" data-testid={`drag-handle-teacher-${t.id}`}>
          <GripVertical className="w-5 h-5" />
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
          onClick={() => onEditBio(t.id, t.description || "")}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="약력 편집"
          data-testid={`button-edit-bio-${t.id}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(t.id, t.name)}
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
            onChange={(e) => onBioTextChange(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
            placeholder={"대성마이맥 출강\n전 SNT 고등관 국어, 두각\n전 대형"}
            data-testid={`textarea-bio-${t.id}`}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onBioSave(t.id)}
              disabled={bioMutationPending}
              className="flex items-center gap-1 bg-red-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              data-testid={`button-save-bio-${t.id}`}
            >
              {bioMutationPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              저장
            </button>
            <button
              onClick={onBioCancelEdit}
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
  );
}

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

  const { data: teachers = EMPTY_TEACHERS, isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const [localTeachers, setLocalTeachers] = useState<Teacher[]>(EMPTY_TEACHERS);
  useEffect(() => {
    setLocalTeachers(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(teachers);
      return prevKey === newKey ? prev : teachers;
    });
  }, [teachers]);

  const localFilteredTeachers = filterSubject === "all"
    ? localTeachers
    : localTeachers.filter((t) => t.subject === filterSubject);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/teachers/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      invalidateTeachers();
    },
    onError: () => {
      setLocalTeachers(teachers);
    },
  });

  function handleDragEndModal(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localTeachers.findIndex((t) => t.id === active.id);
    const newIdx = localTeachers.findIndex((t) => t.id === over.id);
    const newList = arrayMove(localTeachers, oldIdx, newIdx);
    setLocalTeachers(newList);
    reorderMutation.mutate(newList.map((t) => t.id));
  }

  function handleDragEndList(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const filtered = filterSubject === "all" ? localTeachers : localTeachers.filter((t) => t.subject === filterSubject);
    const oldIdx = filtered.findIndex((t) => t.id === active.id);
    const newIdx = filtered.findIndex((t) => t.id === over.id);
    const newFiltered = arrayMove(filtered, oldIdx, newIdx);
    const newAll = [...localTeachers];
    let fi = 0;
    for (let i = 0; i < newAll.length; i++) {
      if (filterSubject === "all" || newAll[i].subject === filterSubject) {
        newAll[i] = newFiltered[fi++];
      }
    }
    setLocalTeachers(newAll);
    reorderMutation.mutate(newAll.map((t) => t.id));
  }

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
          <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg shadow-xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">사진 · 순서 관리</h3>
                <p className="text-xs text-gray-400 mt-0.5">≡ 잡고 드래그하여 순서 변경 · 사진 클릭으로 변경</p>
              </div>
              <button onClick={() => setShowPhotoModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" data-testid="button-close-photo-modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : localTeachers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">등록된 선생님이 없습니다.</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndModal}>
                  <SortableContext items={localTeachers.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {localTeachers.map((t) => (
                        <SortableModalRow
                          key={t.id}
                          teacher={t}
                          isUploading={uploadingPhotoFor === t.id && updatePhotoMutation.isPending}
                          photoFileRefs={photoFileRefs}
                          onPhotoChange={(id, file) => {
                            setUploadingPhotoFor(id);
                            updatePhotoMutation.mutate({ id, file });
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">등록된 선생님 ({localFilteredTeachers.length}명)</h3>
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
      ) : localFilteredTeachers.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 선생님이 없습니다.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndList}>
          <SortableContext items={localFilteredTeachers.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {localFilteredTeachers.map((t) => (
                <SortableTeacherCard
                  key={t.id}
                  teacher={t}
                  onDelete={(id, name) => {
                    if (confirm(`"${name}" 선생님을 삭제하시겠습니까?`)) {
                      deleteMutation.mutate(id);
                    }
                  }}
                  onEditBio={(id, bio) => {
                    setEditingBioId(editingBioId === id ? null : id);
                    setEditBioText(bio);
                  }}
                  editingBioId={editingBioId}
                  editBioText={editBioText}
                  onBioTextChange={setEditBioText}
                  onBioSave={(id) => bioMutation.mutate({ id, bio: editBioText })}
                  onBioCancelEdit={() => setEditingBioId(null)}
                  bioMutationPending={bioMutation.isPending}
                  divisionLabel={divisionLabel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
  "고등관-고2": ["화성고", "가온고", "영덕고", "수원고", "청명고", "고색고", "동탄국제고"],
  "고등관-고3": ["국어", "영어", "수학", "생명과학", "사회문화", "생윤", "논술"],
};

function TimetablesTab() {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<{
    category: string;
    subject: string;
    target_school: string;
    class_name: string;
    class_time: string;
    start_date: string;
    teacher_id: string;
    teacher_ids: string[];
    description: string;
    is_union: boolean;
  }>({
    defaultValues: {
      teacher_ids: []
    }
  });
  const selectedCategory = watch("category");
  const [teacherImageFile, setTeacherImageFile] = useState<File | null>(null);
  const [teacherImagePreview, setTeacherImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [detailImagePreview, setDetailImagePreview] = useState<string>("");
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<string>("all");
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
  const [editDetailImageDeleted, setEditDetailImageDeleted] = useState(false);
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
    teacher_ids: string[];
    description: string;
    is_visible: boolean;
    is_union: boolean;
  }>({
    defaultValues: {
      teacher_ids: []
    }
  });
  const editCategory = editWatch("category");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const bulkVisibilityMutation = useMutation({
    mutationFn: async ({ ids, is_visible }: { ids: number[]; is_visible: boolean }) => {
      await apiRequest("PATCH", "/api/timetables/bulk-visibility", { ids, is_visible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setSelectedIds(new Set());
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, is_visible }: { id: number; is_visible: boolean }) => {
      await apiRequest("PATCH", "/api/timetables/bulk-visibility", { ids: [id], is_visible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const { data: timetables = EMPTY_TIMETABLES, isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables"],
  });

  const [localTimetables, setLocalTimetables] = useState<Timetable[]>(EMPTY_TIMETABLES);
  useEffect(() => {
    setLocalTimetables(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(timetables);
      return prevKey === newKey ? prev : timetables;
    });
  }, [timetables]);

  const ttSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: schools = EMPTY_SCHOOLS } = useQuery<School[]>({
    queryKey: ["/api/schools"],
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

  const categoryFiltered = filterCategory === "all"
    ? localTimetables
    : localTimetables.filter((tt) => {
        if (tt.category === filterCategory) return true;
        // 상위 카테고리 포함: 고등관-고1을 선택하면 고등관도 포함
        const dashIdx = filterCategory.indexOf("-");
        if (dashIdx !== -1) {
          const parent = filterCategory.substring(0, dashIdx);
          return tt.category === parent;
        }
        return false;
      });

  const filteredTimetables = filterSchool === "all"
    ? categoryFiltered
    : categoryFiltered.filter((tt) => (tt.target_school || "").includes(filterSchool));

  // 실제 시간표 데이터에서 학교 목록을 동적으로 생성
  // 순서: 기존 정의된 순서 우선, 새 학교는 뒤에 추가, 시간표 없는 학교는 제외
  const ORDERED_SCHOOLS = CATEGORY_FILTER_OPTIONS[filterCategory] ?? [];
  const actualSchools = new Set(
    categoryFiltered.map((tt) => tt.target_school).filter(Boolean)
  );
  const schoolFilterOptions = filterCategory === "all"
    ? []
    : [
        ...ORDERED_SCHOOLS.filter((s) => actualSchools.has(s)),
        ...[...actualSchools].filter((s) => !ORDERED_SCHOOLS.includes(s)).sort(),
      ];

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
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/timetables/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  function handleDragEndTimetables(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = Number(String(active.id).split("-")[0]);
    const overId = Number(String(over.id).split("-")[0]);
    const oldIdx = filteredTimetables.findIndex(t => t.id === activeId);
    const newIdx = filteredTimetables.findIndex(t => t.id === overId);
    if (oldIdx < 0 || newIdx < 0) return;
    const newFiltered = arrayMove(filteredTimetables, oldIdx, newIdx);
    const filteredIdSet = new Set(filteredTimetables.map(t => t.id));
    setLocalTimetables(prev => {
      const result = [...prev];
      let fi = 0;
      for (let i = 0; i < result.length; i++) {
        if (filteredIdSet.has(result[i].id)) result[i] = newFiltered[fi++];
      }
      return result;
    });
    reorderMutation.mutate(newFiltered.map(t => t.id));
  }

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
      setEditDetailImageDeleted(false);
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
    setEditDetailImageDeleted(false);
    if (editDetailFileInputRef.current) editDetailFileInputRef.current.value = "";
    editReset({
      category: tt.category,
      subject: tt.subject,
      target_school: tt.target_school || "",
      class_name: tt.class_name,
      class_time: tt.class_time || "",
      start_date: tt.start_date || "",
      teacher_id: tt.teacher_id ? String(tt.teacher_id) : "",
      teacher_ids: tt.teacher_ids ? tt.teacher_ids.map(String) : (tt.teacher_id ? [String(tt.teacher_id)] : []),
      description: tt.description || "",
      is_visible: tt.is_visible ?? true,
      is_union: tt.is_union ?? false,
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
    const selectedTeacherIds = Array.isArray(data.teacher_ids) ? data.teacher_ids : [];
    const primaryTeacherId = selectedTeacherIds[0] || null;
    const selectedTeachers = teachers.filter((t) => selectedTeacherIds.includes(String(t.id)));
    const combinedNames = selectedTeachers.map(t => t.name).join(", ");
    
    const formData = new FormData();
    formData.append("teacher_id", primaryTeacherId || "");
    formData.append("teacher_ids", selectedTeacherIds.join(","));
    formData.append("teacher_name", combinedNames || "");
    formData.append("category", data.category);
    formData.append("subject", data.subject || "");
    formData.append("target_school", data.target_school || "");
    formData.append("class_name", data.class_name);
    formData.append("class_time", data.class_time || "");
    formData.append("start_date", data.start_date || "");
    formData.append("description", data.description || "");
    formData.append("is_visible", String(data.is_visible ?? true));
    formData.append("is_union", String(data.is_union ?? false));
    if (editImageFile) formData.append("teacher_image", editImageFile);
    if (editDetailImageFile) formData.append("detail_image", editDetailImageFile);
    if (editDetailImageDeleted && !editDetailImageFile) formData.append("delete_detail_image", "true");
    updateMutation.mutate({ id: editingId, formData });
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
    const selectedTeacherIds = Array.isArray(data.teacher_ids) ? data.teacher_ids : [];
    const primaryTeacherId = selectedTeacherIds[0] || null;
    const selectedTeachers = teachers.filter((t) => selectedTeacherIds.includes(String(t.id)));
    const combinedNames = selectedTeachers.map(t => t.name).join(", ");

    const formData = new FormData();
    formData.append("teacher_id", primaryTeacherId || "");
    formData.append("teacher_ids", selectedTeacherIds.join(","));
    formData.append("teacher_name", combinedNames || "");
    formData.append("category", data.category);
    formData.append("subject", data.subject || "");
    formData.append("target_school", data.target_school || "");
    formData.append("class_name", data.class_name);
    formData.append("class_time", data.class_time || "");
    formData.append("start_date", data.start_date || "");
    formData.append("description", data.description || "");
    formData.append("is_visible", "true");
    formData.append("is_union", String(data.is_union ?? false));
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

  const SCIENCE_SUBJECTS = ["통합과학", "물리", "화학", "생명과학", "지구과학", "물리학", "생명", "지구", "과학탐구", "탐구"];
  const SUBJECT_ORDER = ["수학", "국어", "영어", "탐구", "통합사회/한국사", "사회문화", "생윤", "논술"];

  // Sort filteredTimetables to make sure subjects are contiguous
  const sortedFilteredTimetables = [...filteredTimetables].sort((a, b) => {
    let subjA = a.subject || "기타";
    if (SCIENCE_SUBJECTS.includes(subjA)) subjA = "탐구";
    let subjB = b.subject || "기타";
    if (SCIENCE_SUBJECTS.includes(subjB)) subjB = "탐구";

    const orderA = SUBJECT_ORDER.indexOf(subjA);
    const orderB = SUBJECT_ORDER.indexOf(subjB);
    const idxA = orderA === -1 ? 999 : orderA;
    const idxB = orderB === -1 ? 999 : orderB;
    if (idxA !== idxB) return idxA - idxB;

    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  // Group by subject (preserving display_order within each group)
  const subjectGroupMap = new Map<string, { subjectName: string; items: { tt: Timetable; idx: number }[] }>();
  sortedFilteredTimetables.forEach((tt, idx) => {
    let subj = tt.subject || "기타";
    if (SCIENCE_SUBJECTS.includes(subj)) {
      subj = "탐구";
    }
    if (!subjectGroupMap.has(subj)) {
      subjectGroupMap.set(subj, { subjectName: subj, items: [] });
    }
    subjectGroupMap.get(subj)!.items.push({ tt, idx });
  });

  const groupedBySubject = [...subjectGroupMap.values()].sort((a, b) => {
    const orderA = SUBJECT_ORDER.indexOf(a.subjectName);
    const orderB = SUBJECT_ORDER.indexOf(b.subjectName);
    const idxA = orderA === -1 ? 999 : orderA;
    const idxB = orderB === -1 ? 999 : orderB;
    return idxA - idxB;
  });

  const sortableItems = groupedBySubject.flatMap(group => 
    group.items.map(item => `${item.tt.id}-${group.subjectName}`)
  );

  const inputCls = "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#7B2332] bg-white rounded";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

  const TimetableCard = ({ tt, groupKey }: { tt: Timetable, groupKey: string }) => {
    const sortableId = `${tt.id}-${groupKey}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
    const cardStyle: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 999 : undefined,
    };
    return (
    <div
      ref={setNodeRef}
      style={cardStyle}
    >
      <div className={`flex items-center gap-3 p-3 ${!tt.is_visible ? "bg-gray-50 opacity-60" : ""}`}>
        <input
          type="checkbox"
          checked={selectedIds.has(tt.id)}
          onChange={(e) => {
            const next = new Set(selectedIds);
            if (e.target.checked) next.add(tt.id);
            else next.delete(tt.id);
            setSelectedIds(next);
          }}
          className="w-4 h-4 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332] cursor-pointer"
          data-testid={`checkbox-select-tt-${tt.id}`}
        />
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 transition-colors touch-none"
          data-testid={`button-drag-tt-${tt.id}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>

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
          {tt.teacher_ids && tt.teacher_ids.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tt.teacher_ids.map(tId => {
                const t = teachers.find(teacher => teacher.id === tId);
                return <span key={tId} className="text-[10px] bg-gray-50 text-gray-500 px-1 py-0.5 rounded border border-gray-200 leading-none">{t?.name}</span>;
              })}
            </div>
          )}
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
          <button
            onClick={() => toggleVisibilityMutation.mutate({ id: tt.id, is_visible: !tt.is_visible })}
            disabled={toggleVisibilityMutation.isPending}
            className={`p-1.5 rounded transition-colors disabled:opacity-50 ${!tt.is_visible ? "text-gray-400 hover:text-gray-600" : "text-[#7B2332] hover:bg-red-50"}`}
            title={tt.is_visible ? "숨기기" : "보이기"}
            data-testid={`button-toggle-visibility-${tt.id}`}
          >
            {tt.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {editingId === tt.id && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <form onSubmit={editHandleSubmit(onEditSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>카테고리</label>
                <select {...editRegister("category")} className={inputCls}>
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
              <div className="col-span-2 sm:col-span-2">
                <label className={labelCls}>담당 선생님 (다중 선택 가능)</label>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2 border border-gray-300 rounded bg-white min-h-[40px] max-h-[120px] overflow-y-auto">
                  {teachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                      <input
                        type="checkbox"
                        value={String(t.id)}
                        {...editRegister("teacher_ids")}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332]"
                      />
                      <span className="text-xs text-gray-700 truncate">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>목차 (필터)</label>
                <select
                  className={inputCls}
                  value={editWatch("target_school")}
                  onChange={(e) => editSetValue("target_school", e.target.value)}
                >
                  <option value="">직접 입력 / 선택 안함</option>
                  {/* Category predefined options */}
                  {CATEGORY_FILTER_OPTIONS[editCategory]?.map((opt) => (
                    <option key={`pre-${opt}`} value={opt}>{opt} (기본)</option>
                  ))}
                  {/* Registered schools */}
                  {schools.length > 0 && (
                    <optgroup label="등록된 학교 로고">
                      {schools.map((s) => (
                        <option key={`school-${s.id}`} value={s.name}>{s.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="mt-1">
                  <input
                    {...editRegister("target_school")}
                    className={inputCls + " text-xs py-1 mt-1"}
                    placeholder="직접 입력 시 위 선택 무시"
                  />
                </div>
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
              <div className="flex items-center gap-3 flex-wrap">
                {(editDetailImagePreview || (tt.detail_image_url && !editDetailImageDeleted)) && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={editDetailImagePreview || tt.detail_image_url!}
                      alt="미리보기"
                      className="w-14 h-14 object-cover border border-gray-200 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditDetailImageFile(null);
                        setEditDetailImagePreview("");
                        setEditDetailImageDeleted(true);
                        if (editDetailFileInputRef.current) editDetailFileInputRef.current.value = "";
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      data-testid={`button-delete-detail-image-${tt.id}`}
                      title="사진 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-6 py-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      {...editRegister("is_visible")}
                      className="w-4 h-4 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332]"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-[#7B2332] transition-colors">홈페이지에 노출</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      {...editRegister("is_union")}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">연합반으로 설정</span>
                    <span className="text-[10px] text-gray-400 font-normal">(수학 필터에서 '연합반' 섹션으로 분류됩니다)</span>
                  </label>
                </div>
                <input
                  ref={editDetailFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditDetailImageFile(file);
                      setEditDetailImageDeleted(false);
                      const r = new FileReader();
                      r.onloadend = () => setEditDetailImagePreview(r.result as string);
                      r.readAsDataURL(file);
                    }
                  }}
                  className="text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 file:rounded"
                  data-testid={`input-edit-timetable-detail-image-${tt.id}`}
                />
              </div>
              {editDetailImageDeleted && !editDetailImageFile && (
                <p className="text-xs text-red-500 mt-1">저장 시 사진이 삭제됩니다.</p>
              )}
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
  };

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

      {/* Bulk Actions */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5 mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filteredTimetables.length > 0 && selectedIds.size === filteredTimetables.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(new Set(filteredTimetables.map(t => t.id)));
                } else {
                  setSelectedIds(new Set());
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332]"
            />
            <span className="text-sm font-medium text-gray-600">전체 선택</span>
          </label>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs font-medium text-gray-500">{selectedIds.size}개 선택됨</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedIds.size === 0) return;
              bulkVisibilityMutation.mutate({ ids: [...selectedIds], is_visible: true });
            }}
            disabled={selectedIds.size === 0 || bulkVisibilityMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-30 transition-colors"
            data-testid="button-bulk-show"
          >
            <Eye className="w-3 h-3" />보이기
          </button>
          <button
            onClick={() => {
              if (selectedIds.size === 0) return;
              if (confirm(`${selectedIds.size}개의 시간표를 숨기시겠습니까?`)) {
                bulkVisibilityMutation.mutate({ ids: [...selectedIds], is_visible: false });
              }
            }}
            disabled={selectedIds.size === 0 || bulkVisibilityMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-30 transition-colors"
            data-testid="button-bulk-hide"
          >
            <EyeOff className="w-3 h-3" />숨기기
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
                <label className={labelCls}>카테고리</label>
                <select {...register("category")} className={inputCls} defaultValue="" data-testid="select-timetable-category">
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
              <div className="col-span-2 sm:col-span-2">
                <label className={labelCls}>담당 선생님 (다중 선택 가능)</label>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2 border border-gray-300 rounded bg-white min-h-[40px] max-h-[120px] overflow-y-auto">
                  {teachers.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                      <input
                        type="checkbox"
                        value={String(t.id)}
                        {...register("teacher_ids")}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[#7B2332] focus:ring-[#7B2332]"
                      />
                      <span className="text-xs text-gray-700 truncate">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>목차 (필터)</label>
                <select
                  className={inputCls}
                  data-testid="select-timetable-school"
                  value={watch("target_school")}
                  onChange={(e) => setValue("target_school", e.target.value)}
                >
                  <option value="">직접 입력 / 선택 안함</option>
                  {/* Category predefined options */}
                  {CATEGORY_FILTER_OPTIONS[selectedCategory]?.map((opt) => (
                    <option key={`pre-add-${opt}`} value={opt}>{opt} (기본)</option>
                  ))}
                  {/* Registered schools */}
                  {schools.length > 0 && (
                    <optgroup label="등록된 학교 로고">
                      {schools.map((s) => (
                        <option key={`school-add-${s.id}`} value={s.name}>{s.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="mt-1">
                  <input
                    {...register("target_school")}
                    className={inputCls + " text-xs py-1 mt-1"}
                    placeholder="직접 입력 시 위 선택 무시"
                  />
                </div>
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
            <div className="bg-gray-50/50 p-3 rounded-lg flex flex-wrap items-center gap-6 border border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  {...register("is_union")}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">연합반으로 설정</span>
                  <span className="text-[10px] text-gray-400 font-normal">수학 필터에서 '연합반' 섹션에 표시됩니다.</span>
                </div>
              </label>
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
      <div className="flex gap-2 mb-3 flex-wrap" data-testid="timetable-category-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilterCategory(tab.value); setFilterSchool("all"); }}
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

      {/* School Filter Tabs (학교별 필터) */}
      {schoolFilterOptions.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap" data-testid="timetable-school-tabs">
          <button
            onClick={() => setFilterSchool("all")}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              filterSchool === "all"
                ? "bg-gray-700 text-white border-gray-700"
                : "bg-white text-gray-500 border-gray-300 hover:border-gray-500 hover:text-gray-700"
            }`}
            data-testid="tab-school-all"
          >
            전체
          </button>
          {schoolFilterOptions.map((school) => (
            <button
              key={school}
              onClick={() => setFilterSchool(school)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                filterSchool === school
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-500 border-gray-300 hover:border-gray-500 hover:text-gray-700"
              }`}
              data-testid={`tab-school-${school}`}
            >
              {school}
            </button>
          ))}
        </div>
      )}

      {/* Timetable List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filteredTimetables.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">등록된 시간표가 없습니다.</p>
        </div>
      ) : (
        <DndContext sensors={ttSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTimetables}>
          <div className="space-y-6">
            {groupedBySubject.map(({ subjectName, items }) => (
              <div key={subjectName}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded bg-[#7B2332]/5 flex items-center justify-center border border-[#7B2332]/10 overflow-hidden">
                    <BookOpen className="w-4 h-4 text-[#7B2332]" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">{subjectName}</span>
                  <span className="text-xs text-gray-400">{items.length}개</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <SortableContext items={items.map(({ tt }) => `${tt.id}-${subjectName}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {items.map(({ tt }) => (
                      <TimetableCard key={`${tt.id}-${subjectName}`} tt={tt} groupKey={subjectName} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}

// 관리자 목록을 엑셀(.xlsx)로 즉시 내려받기 — 구글시트 웹훅과 무관하게 완전한 정보 제공
function downloadExcel(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "목록");
  XLSX.writeFile(wb, filename);
}

const todayStr = () => new Date().toISOString().slice(0, 10);

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

  const exportExcel = () =>
    downloadExcel(`수강예약_${todayStr()}.xlsx`, reservations.map((r) => ({
      "신청일": r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "",
      "학생명": r.student_name || "",
      "학교": r.student_school || "",
      "과목": r.subject || "",
      "수업명": r.class_name || "",
      "선생님": r.teacher_name || "",
      "수업시간": r.class_time || "",
      "학생 전화": r.student_phone || "",
      "학부모 전화": r.parent_phone || "",
    })));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">수강예약 목록 ({reservations.length}건)</h3>
        <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 transition-colors">
          <Download className="w-3.5 h-3.5" /> 엑셀 다운로드
        </button>
      </div>
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
                <th className="px-3 py-3 font-bold text-gray-700">과목</th>
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
                  <td className="px-3 py-3 text-gray-600">{r.subject || "-"}</td>
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
      const data = await res.json();
      if (data.adminToken) {
        localStorage.setItem("adminToken", data.adminToken);
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
  school: string;
  grade: string;
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

  const exportExcel = () =>
    downloadExcel(`문자수신_${todayStr()}.xlsx`, subs.map((s) => ({
      "신청일": s.created_at ? new Date(s.created_at).toLocaleString("ko-KR") : "",
      "이름": s.name || "",
      "학교": s.school || "",
      "학년": s.grade || "",
      "전화번호": s.phone || "",
    })));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">문자 수신 신청 목록 ({subs.length}건)</h3>
        <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 transition-colors">
          <Download className="w-3.5 h-3.5" /> 엑셀 다운로드
        </button>
      </div>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700">학교</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">학년</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">전화번호</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">신청일</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map((sub) => (
                <tr key={sub.id} data-testid={`row-sms-${sub.id}`}>
                  <td className="px-4 py-3 text-gray-900">{sub.name || "-"}</td>
                  <td className="px-4 py-3 text-gray-900">{sub.school || "-"}</td>
                  <td className="px-4 py-3 text-gray-900">{sub.grade || "-"}</td>
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

interface LevelTestRegistration {
  id: number;
  name: string;
  phone: string;
  school: string;
  grade: string;
  created_at: string;
}

function LevelTestTab() {
  const { data: registrations = [], isLoading } = useQuery<LevelTestRegistration[]>({
    queryKey: ["/api/level-test-registrations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/level-test-registrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/level-test-registrations"] });
    },
  });

  const exportExcel = () =>
    downloadExcel(`수학레벨테스트_${todayStr()}.xlsx`, registrations.map((r) => ({
      "신청일": r.created_at ? new Date(r.created_at).toLocaleString("ko-KR") : "",
      "이름": r.name || "",
      "학교": r.school || "",
      "학년": r.grade || "",
      "전화번호": r.phone || "",
    })));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">수학레벨테스트 신청 목록 ({registrations.length}건)</h3>
        <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 transition-colors">
          <Download className="w-3.5 h-3.5" /> 엑셀 다운로드
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : registrations.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center" data-testid="text-level-test-empty">신청 내역이 없습니다.</p>
      ) : (
        <div className="bg-white border border-gray-200 overflow-hidden">
          <table className="w-full text-sm" data-testid="table-level-test-registrations">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">이름</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">학교</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">학년</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">전화번호</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">신청일</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map((reg) => (
                <tr key={reg.id} data-testid={`row-level-test-${reg.id}`}>
                  <td className="px-4 py-3 text-gray-900">{reg.name || "-"}</td>
                  <td className="px-4 py-3 text-gray-900">{reg.school || "-"}</td>
                  <td className="px-4 py-3 text-gray-900">{reg.grade || "-"}</td>
                  <td className="px-4 py-3 text-gray-900 font-mono">{reg.phone}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(reg.created_at).toLocaleDateString("ko-KR")}</td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => {
                        if (confirm("이 신청을 삭제하시겠습니까?")) {
                          deleteMutation.mutate(reg.id);
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      data-testid={`button-delete-level-test-${reg.id}`}
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
  const [editForm, setEditForm] = useState<any>({});
  
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      date: "",
      time: "",
      form_url: "",
      intro: "",
      target: "",
      speaker: "",
      content: "",
      benefit: "",
      location: ""
    }
  });

  const { data: briefings = [], isLoading } = useQuery<BriefingItem[]>({
    queryKey: ["/api/briefings"],
  });

  const stringifyDescription = (data: any) => {
    let res = "";
    if (data.intro?.trim()) res += `[도입부]\n${data.intro.trim()}\n\n`;
    if (data.target?.trim()) res += `[대상]\n${data.target.trim()}\n\n`;
    if (data.speaker?.trim()) res += `[연사]\n${data.speaker.trim()}\n\n`;
    if (data.content?.trim()) res += `[주제]\n${data.content.trim()}\n\n`;
    if (data.benefit?.trim()) res += `[혜택]\n${data.benefit.trim()}\n\n`;
    if (data.location?.trim()) res += `[장소]\n${data.location.trim()}\n`;
    return res.trim();
  };

  const parseDescription = (desc: string) => {
    if (!desc) return { intro: "", target: "", speaker: "", content: "", benefit: "", location: "" };

    const markers = ['[도입부]', '[대상]', '[연사]', '[주제]', '[혜택]', '[장소]', '[일시]'];
    const hasBrackets = markers.some(m => desc.includes(m));

    if (hasBrackets) {
      const getSection = (marker: string, nextMarkers: string[]) => {
        if (!desc.includes(marker)) return "";
        let startIdx = desc.indexOf(marker) + marker.length;
        let endIdx = desc.length;
        for (const next of nextMarkers) {
          const idx = desc.indexOf(next, startIdx);
          if (idx !== -1 && idx < endIdx) endIdx = idx;
        }
        return desc.substring(startIdx, endIdx).trim();
      };

      return {
        intro: getSection('[도입부]', markers),
        target: getSection('[대상]', markers),
        speaker: getSection('[연사]', markers),
        content: getSection('[주제]', markers),
        benefit: getSection('[혜택]', markers),
        location: getSection('[장소]', markers)
      };
    } else {
      let currentCategory = "intro";
      const parsedFields: Record<string, string> = { intro: "", target: "", speaker: "", content: "", benefit: "", location: "" };
      
      const lines = desc.split('\\n');
      for (const line of lines) {
        if (/^[■▶♥▣]/.test(line.trim())) {
          if (line.includes("대상")) currentCategory = "target";
          else if (line.includes("연사")) currentCategory = "speaker";
          else if (line.includes("주제") || line.includes("내용") || line.includes("프로그램")) currentCategory = "content";
          else if (line.includes("혜택")) currentCategory = "benefit";
          else if (line.includes("장소") || line.includes("위치")) currentCategory = "location";
          else currentCategory = "intro";

          const inlineMatch = line.match(/[:_]\\s*(.*)/);
          if (inlineMatch && inlineMatch[1].trim()) {
            parsedFields[currentCategory] += (parsedFields[currentCategory] ? "\\n" : "") + inlineMatch[1].trim();
          }
        } else {
          if (line.trim() !== "") {
            parsedFields[currentCategory] += (parsedFields[currentCategory] ? "\\n" : "") + line.trim();
          }
        }
      }
      return parsedFields as any;
    }
  };

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const description = stringifyDescription(data);
      await apiRequest("POST", "/api/briefings", {
        title: data.title,
        date: data.date,
        time: data.time,
        description,
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

  const onSubmit = (data: any) => {
    addMutation.mutate(data);
  };

  const startEdit = (b: BriefingItem) => {
    setEditingId(b.id);
    const parsed = parseDescription(b.description || "");
    setEditForm({ title: b.title, date: b.date, time: b.time, form_url: b.form_url || "", display_order: b.display_order, ...parsed });
  };

  const saveEdit = () => {
    if (editingId === null) return;
    const original = briefings.find((b) => b.id === editingId);
    if (!original) return;
    const description = stringifyDescription(editForm);
    updateMutation.mutate({ id: editingId, data: { ...original, ...editForm, description } });
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-briefing">
        <h3 className="text-lg font-bold text-gray-900 mb-4">설명회 일정 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-800">기본 정보</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input
                {...register("title", { required: "제목을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                placeholder="예: 2026학년도 고등부 신입생 설명회"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
                <input
                  {...register("date", { required: "날짜를 입력하세요" })}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                  placeholder="예: 2026년 3월 8일 (토)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
                <input
                  {...register("time")}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                  placeholder="예: 14:00~16:00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">구글폼 링크</label>
              <input
                {...register("form_url")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
              />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4 shadow-sm">
            <h4 className="font-semibold text-gray-800">설명회 상세 내용</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">도입부</label>
                <textarea
                  {...register("intro")}
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                  placeholder="예: 많은 관심과 성원에 힘입어 2차 설명회를 진행합니다."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대상</label>
                <input {...register("target")} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 초등 4학년 ~ 중학교 2학년" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연사 (줄바꿈으로 약력 추가, 빈 줄로 여러 연사 구분)</label>
                <textarea {...register("speaker")} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 김학수 소장님\n(전) 메가스터디\n\n박지훈 강사\n(현) 시대인재" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                <input {...register("location")} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 모티브아카데미" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">주제 / 내용 (숫자 '1.'은 주요 내용, '-'는 세부 내용으로 구분)</label>
                <textarea {...register("content")} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="1. 주요 내용\n- 세부 사항\n- 세부 사항 2\n\n2. 두번째 내용\n- 세부 사항" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">혜택 (선택)</label>
                <textarea {...register("benefit")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={addMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
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
        <p className="text-sm text-gray-400 py-6 text-center">등록된 설명회가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {briefings.map((b) => (
            <div key={b.id} className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
              {editingId === b.id ? (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800">기본 정보 수정</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">제목</label>
                      <input
                        value={editForm.title || ""}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">날짜</label>
                        <input
                          value={editForm.date || ""}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">시간</label>
                        <input
                          value={editForm.time || ""}
                          onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">구글폼 링크</label>
                      <input
                        value={editForm.form_url || ""}
                        onChange={(e) => setEditForm({ ...editForm, form_url: e.target.value })}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800">설명회 상세 내용 수정</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">도입부</label>
                        <textarea
                          value={editForm.intro || ""}
                          onChange={(e) => setEditForm({ ...editForm, intro: e.target.value })}
                          rows={3}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">대상</label>
                        <input
                          value={editForm.target || ""}
                          onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">연사 (빈 줄로 여러명 구분, 줄바꿈은 약력)</label>
                        <input
                          value={editForm.speaker || ""}
                          onChange={(e) => setEditForm({ ...editForm, speaker: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">장소</label>
                        <input
                          value={editForm.location || ""}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">주제 / 내용 ('1.'은 제목, '-'는 세부내용)</label>
                        <textarea
                          value={editForm.content || ""}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          rows={4}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">혜택 (선택)</label>
                        <textarea
                          value={editForm.benefit || ""}
                          onChange={(e) => setEditForm({ ...editForm, benefit: e.target.value })}
                          rows={2}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors rounded-md"
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
                      <h4 className="font-bold text-gray-900 text-lg">{b.title}</h4>
                      {!b.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded">비활성</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-red-600 mt-1">{b.date} {b.time}</p>
                    {b.description && (
                      <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 font-mono leading-relaxed">
                        {b.description}
                      </div>
                    )}
                    {b.form_url && (
                      <a href={b.form_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 mt-3 inline-block break-all underline">
                        {b.form_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: b.id, is_active: !b.is_active })}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors rounded"
                      title={b.is_active ? "비활성화" : "활성화"}
                    >
                      {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(b)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("이 설명회를 삭제하시겠습니까?")) {
                          deleteMutation.mutate(b.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded"
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

      <div className="bg-white border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{divisionLabel} 합격후기 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">이름 *</label>
              <input
                {...register("name", { required: "이름을 입력하세요" })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50"
                placeholder="학생 이름"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">학교</label>
              <input
                {...register("school")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50"
                placeholder="합격 학교"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">표시 순서</label>
              <input
                type="number"
                {...register("display_order")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">후기 내용 *</label>
            <textarea
              {...register("content", { required: "내용을 입력하세요" })}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 resize-none"
              placeholder="합격 후기 내용을 입력하세요"
            />
            {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">이미지 (선택, 여러 장 가능)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
          </div>
          <button
            type="submit"
            disabled={uploading || addMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
          >
            {(uploading || addMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            추가
          </button>
        </form>
      </div>

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

function SortableSummaryCard({ item, onDelete }: { item: any; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 border border-gray-200 p-3 bg-white"
      data-testid={`card-summary-${item.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 pt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#7B2332] transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <img src={item.image_url} alt="기말/내신 시간표" className="w-full max-w-sm border border-gray-200" />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        data-testid={`button-delete-summary-${item.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function SummaryTimetablesTab() {
  const [selectedDivision, setSelectedDivision] = useState<string>("high-g1");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const divisionLabel = SUMMARY_DIVISIONS.find((d) => d.value === selectedDivision)?.label || selectedDivision;

  const { data: items = EMPTY_SUMMARY_TT as SummaryTimetable[], isLoading } = useQuery<SummaryTimetable[]>({
    queryKey: ["/api/summary-timetables", selectedDivision],
    queryFn: async () => {
      const res = await fetch(`/api/summary-timetables?division=${selectedDivision}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const [localItems, setLocalItems] = useState<SummaryTimetable[]>([]);
  useEffect(() => {
    setLocalItems(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(items);
      return prevKey === newKey ? prev : items;
    });
  }, [items]);

  const sumSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/summary-timetables/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summary-timetables", selectedDivision] });
    },
    onError: () => {
      setLocalItems(items);
    },
  });

  function handleDragEndSummary(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localItems.findIndex(t => t.id === Number(active.id));
    const newIdx = localItems.findIndex(t => t.id === Number(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const newList = arrayMove(localItems, oldIdx, newIdx);
    setLocalItems(newList);
    reorderMutation.mutate(newList.map(t => t.id));
  }

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
        <h3 className="text-sm font-bold text-gray-900 mb-4">기말/내신 시간표 이미지 등록 — {divisionLabel}</h3>
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
          등록된 기말/내신 시간표 ({items.length}개) — {divisionLabel}
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : localItems.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">등록된 기말/내신 시간표가 없습니다.</p>
        ) : (
          <DndContext sensors={sumSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSummary}>
            <SortableContext items={localItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {localItems.map((item) => (
                  <SortableSummaryCard
                    key={item.id}
                    item={item}
                    onDelete={(id) => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate(id); }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

interface SummerGuideline {
  id: number;
  division: string;
  title: string;
  content: string;
  category?: string;
  display_order: number;
}

function SortableGuidelineRow({
  item,
  onDelete,
  onEdit,
}: {
  item: SummerGuideline;
  onDelete: (id: number) => void;
  onEdit: (item: SummerGuideline) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  const categoryLabelMap: Record<string, string> = {
    overview: "프로그램 개요",

    curriculum: "강사별 커리큘럼",
    guideline: "모집 요강",
  };
  const categoryLabel = categoryLabelMap[item.category || "guideline"] || "모집 요강";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border border-gray-100 rounded-lg p-3.5 bg-gray-50/50 hover:bg-gray-50 transition-colors shadow-sm"
      data-testid={`row-guideline-${item.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 min-w-0">
        <div className="font-bold text-gray-900 text-sm md:col-span-2 border-r border-gray-200/50 pr-3 flex flex-col gap-1.5 break-words break-all whitespace-pre-wrap">
          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-[#7B2332] rounded font-semibold w-fit">
            {categoryLabel}
          </span>
          <span>{item.title}</span>
        </div>
        <div className="text-xs text-gray-600 md:col-span-3 whitespace-pre-wrap break-words break-all leading-relaxed">
          {item.content}
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0 border-l border-gray-100 pl-2">
        <button
          onClick={() => onEdit(item)}
          className="p-2 text-gray-400 hover:text-[#7B2332] hover:bg-red-50 rounded transition-colors"
          title="수정"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SummerGuidelinesManager({ activeTab }: { activeTab: "중등" | "고1" | "고2" }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      division: activeTab,
      category: "curriculum",
      display_order: 0,
      schedule: "",
      features: "",
      materials: "",
      tasks: "",
      management: "",
      sessions: "",
      linked: ""
    }
  });

  const { data: guidelines = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/summer-guidelines"],
  });

  useEffect(() => {
    reset({ ...control._defaultValues, division: activeTab });
  }, [activeTab, reset]);

  const parseContent = (contentStr: string) => {
    const res = { schedule: "", features: "", materials: "", tasks: "", management: "", sessions: "", linked: "" };
    if (!contentStr) return res;
    
    let currentCategory = "";
    let lines = contentStr.split('\n');
    for (const line of lines) {
      const match = line.match(/^\[(.*?)\]$/);
      if (match) {
        const cat = match[1].trim();
        if (cat.includes("수업")) currentCategory = "schedule";
        else if (cat.includes("특징")) currentCategory = "features";
        else if (cat.includes("교재")) currentCategory = "materials";
        else if (cat.includes("과제")) currentCategory = "tasks";
        else if (cat.includes("관리") || cat.includes("CLINIC")) currentCategory = "management";
        else if (cat.includes("회차")) currentCategory = "sessions";
        else if (cat.includes("연계")) currentCategory = "linked";
        else currentCategory = "";
      } else if (currentCategory && currentCategory in res) {
        (res as any)[currentCategory] += (res as any)[currentCategory] ? "\n" + line : line;
      }
    }
    return res;
  };

  const stringifyContent = (data: any) => {
    let res = "";
    if (data.schedule?.trim()) res += `[수업 일정]\n${data.schedule.trim()}\n\n`;
    if (data.features?.trim()) res += `[강좌 특징]\n${data.features.trim()}\n\n`;
    if (data.materials?.trim()) res += `[교재/제공자료]\n${data.materials.trim()}\n\n`;
    if (data.tasks?.trim()) res += `[과제/TEST]\n${data.tasks.trim()}\n\n`;
    if (data.management?.trim()) res += `[관리 SYSTEM 및 CLINIC]\n${data.management.trim()}\n\n`;
    if (data.sessions?.trim()) res += `[회차별 내용]\n${data.sessions.trim()}\n\n`;
    if (data.linked?.trim()) res += `[연계 강좌]\n${data.linked.trim()}\n`;
    return res.trim();
  };

  const EXCEL_HEADERS = [
    "대상", "카테고리", "제목", "수업일정", "강좌특징", "교재", "과제", "관리시스템", "회차별내용", "연계강좌",
  ];

  // "대상" 셀 문자열을 division 목록으로 변환. 비어있으면 중3+고1 모두에 등록.
  const parseDivisions = (raw: string): string[] => {
    const text = (raw || "").trim();
    if (!text) return ["중등", "고1"];
    if (/전체|공통|모두|all/i.test(text)) return ["중등", "고1", "고2"];
    const result: string[] = [];
    if (/중3|중등|초중등/.test(text)) result.push("중등");
    if (/고1/.test(text)) result.push("고1");
    if (/고2/.test(text)) result.push("고2");
    return result.length > 0 ? Array.from(new Set(result)) : ["중등", "고1"];
  };

  const handleExcelDownload = () => {
    const wsData = [
      EXCEL_HEADERS,
      [
        "중3/고1",
        "강사별 커리큘럼",
        "예: [고1] 수학 연합반 - 강현T",
        "월/수 18:00~22:00",
        "핵심 유형 마스터",
        "자체교재 및 모의고사",
        "매주 누적 모의고사",
        "과제 체크\n1:1 클리닉",
        "1회차 - 다항식연산\n2회차 - 항등식",
        "고1 심화반",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 16 },
      { wch: 16 }, { wch: 24 }, { wch: 32 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "썸머커리큘럼양식");
    XLSX.writeFile(wb, "썸머커리큘럼_업로드양식.xlsx");
  };

  // 한 줄 가로 양식(템플릿) 시트 → payload 목록
  const parseHorizontalSheet = (data: any[][]) => {
    const payloads: { division: string; title: string; category: string; content: string }[] = [];
    if (data.length <= 1) return payloads;
    const headers = data[0];
    const getVal = (row: any[], name: string, fallbackIdx: number) => {
      const idx = headers.findIndex((h) => h && h.toString().replace(/\s/g, "").includes(name));
      const val = idx !== -1 ? row[idx] : row[fallbackIdx];
      return val !== undefined && val !== null ? val.toString().trim() : "";
    };
    const hasTargetCol = headers.some((h) => h && h.toString().includes("대상"));
    const idxOffset = hasTargetCol ? 1 : 0;
    for (const row of data.slice(1)) {
      const title = getVal(row, "제목", 1 + idxOffset);
      if (!row || row.length === 0 || !title) continue;
      const categoryRaw = getVal(row, "카테고리", 0 + idxOffset);
      const category = categoryRaw.includes("가이드") ? "guideline" : "curriculum";
      const content = stringifyContent({
        schedule: getVal(row, "수업일정", 2 + idxOffset),
        features: getVal(row, "강좌특징", 3 + idxOffset),
        materials: getVal(row, "교재", 4 + idxOffset),
        tasks: getVal(row, "과제", 5 + idxOffset),
        management: getVal(row, "관리시스템", 6 + idxOffset),
        sessions: getVal(row, "회차별내용", 7 + idxOffset),
        linked: getVal(row, "연계강좌", 8 + idxOffset),
      });
      for (const division of parseDivisions(hasTargetCol ? getVal(row, "대상", 0) : "")) {
        payloads.push({ division, title, category, content });
      }
    }
    return payloads;
  };

  // 강사 원본 세로 양식(구분/세부항목/내용, 한 시트 = 한 강좌) → payload 1개
  const parseVerticalSheet = (data: any[][], sheetName: string) => {
    const cell = (r: any[] | undefined, i: number) => (r && r[i] != null ? r[i].toString().replace(/\r/g, "").trim() : "");
    const titleRaw = cell(data[0], 0);
    // 헤더("구분"이 있는 줄) 다음부터 데이터
    let start = data.findIndex((r) => /구분/.test(cell(r, 0)));
    start = start >= 0 ? start + 1 : 1;

    const sectionKey = (label: string): string | null => {
      if (/수업\s*일정/.test(label)) return "schedule";
      if (/특징/.test(label)) return "features";
      if (/교재|자료/.test(label)) return "materials";
      if (/과제|TEST/i.test(label)) return "tasks";
      if (/관리|CLINIC|클리닉|SYSTEM/i.test(label)) return "management";
      if (/회차/.test(label)) return "sessions";
      if (/연계/.test(label)) return "linked";
      return null;
    };

    const f: Record<string, string[]> = { schedule: [], features: [], materials: [], tasks: [], management: [], sessions: [], linked: [] };
    let cur: string | null = null;
    for (const row of data.slice(start)) {
      const a = cell(row, 0), b = cell(row, 1), c = cell(row, 2);
      if (a) cur = sectionKey(a);
      if (!cur) continue;
      if (cur === "management") {
        if (b || c) f.management.push(`• ${b}${c ? `: ${c}` : ""}`);
      } else if (cur === "sessions") {
        if (b || c) f.sessions.push(`${b}${c ? ` - ${c}` : ""}`.trim());
      } else if (cur === "linked") {
        if (c) f.linked.push(`${b}${c ? ` - ${c}` : ""}`.trim());
      } else {
        const v = c || b;
        if (v) f[cur].push(v);
      }
    }

    const content = stringifyContent({
      schedule: f.schedule.join("\n"), features: f.features.join("\n"), materials: f.materials.join("\n"),
      tasks: f.tasks.join("\n"), management: f.management.join("\n"), sessions: f.sessions.join("\n"), linked: f.linked.join("\n"),
    });
    if (!content) return null; // 내용 없으면 건너뜀

    // 제목은 엑셀 원본(시트 맨 위 제목 칸)을 그대로 사용한다. 가공하지 않음.
    const title = titleRaw.replace(/\s+/g, " ").trim() || sheetName.trim();
    // 학년(탭)은 현재 보고 있는 탭에 등록 (제목/시트명은 건드리지 않음)
    const division = activeTab;
    return { division, title, category: "curriculum", content };
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`엑셀 파일 [${file.name}]의 데이터를 추가하시겠습니까?\n(강사 원본 양식은 시트마다 한 강좌씩, 학년은 시트명/제목에서 자동 인식하며 못 찾으면 현재 [${activeTab}] 탭에 등록됩니다)`)) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const payloads: { division: string; title: string; category: string; content: string }[] = [];

        for (const sheetName of wb.SheetNames) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 }) as any[][];
          if (!data || data.length === 0) continue;
          // 세로(강사 원본) 양식 감지: 어느 행이든 첫 칸에 "구분" 또는 섹션 라벨이 있으면
          const isVertical = data.some((r) => /구분|수업\s*일정|강좌\s*특징/.test((r && r[0] != null ? r[0].toString() : "")));
          if (isVertical) {
            const p = parseVerticalSheet(data, sheetName);
            if (p) payloads.push(p);
          } else {
            payloads.push(...parseHorizontalSheet(data));
          }
        }

        if (payloads.length === 0) {
          alert("엑셀에서 등록할 강좌를 찾지 못했습니다. 양식을 확인해주세요.");
          e.target.value = "";
          return;
        }

        let successCount = 0;
        for (const p of payloads) {
          const res = await apiRequest("POST", "/api/summer-guidelines", p);
          if (res.ok) successCount++;
        }

        queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
        const summary = payloads.map((p) => `· ${p.title} → ${p.division}`).join("\n");
        alert(`총 ${successCount}개의 커리큘럼이 등록되었습니다!\n\n${summary}`);
      } catch (err: any) {
        console.error(err);
        if (String(err?.message || "").includes("401")) {
          alert("관리자 인증이 만료되었습니다. 페이지를 새로고침한 뒤 다시 로그인하고 시도해주세요.");
          window.location.reload();
        } else {
          alert(`엑셀 처리 중 오류가 발생했습니다.\n${err?.message || "양식을 확인해주세요."}`);
        }
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const content = stringifyContent(data);
      await apiRequest("POST", "/api/summer-guidelines", {
        title: data.title,
        division: activeTab,
        category: data.category,
        content,
        display_order: parseInt(data.display_order) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/summer-guidelines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/summer-guidelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
    },
  });

  const onSubmit = (data: any) => {
    addMutation.mutate(data);
  };

  const startEdit = (g: any) => {
    setEditingId(g.id);
    const parsed = parseContent(g.content || "");
    setEditForm({ 
      title: g.title, 
      category: g.category || "curriculum", 
      display_order: g.display_order || 0,
      ...parsed
    });
  };

  const saveEdit = () => {
    if (editingId === null) return;
    const content = stringifyContent(editForm);
    updateMutation.mutate({ 
      id: editingId, 
      data: { 
        title: editForm.title,
        category: editForm.category,
        display_order: parseInt(editForm.display_order) || 0,
        content 
      } 
    });
  };

  const filtered = guidelines.filter(g => {
    const d = g.division === "중3" ? "중등" : g.division;
    return d === activeTab;
  }).sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-gray-50 p-4 border border-gray-200 rounded-lg justify-between items-center">
        <h4 className="font-bold text-gray-800">엑셀로 여러 커리큘럼 한 번에 등록하기</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExcelDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded shadow-sm hover:bg-green-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            엑셀 양식 다운
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            엑셀 일괄 등록
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
          </label>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-sm font-bold text-gray-900 mb-4">새 데이터 수동 추가</h4>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">카테고리</label>
              <select {...register("category")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded">
                <option value="curriculum">강사별 커리큘럼</option>
                <option value="guideline">썸머스쿨 가이드라인</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">제목 (또는 강좌명) *</label>
              <input {...register("title", { required: true })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: [고1] 수학 연합반 - 강현T" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">표시 순서 (숫자 작을수록 위)</label>
              <input type="number" {...register("display_order")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h5 className="font-bold text-sm text-gray-800 mb-3 border-b pb-2">커리큘럼 상세 정보 (각 항목을 채우면 자동으로 양식에 맞게 표출됩니다)</h5>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">수업 일정</label>
              <textarea {...register("schedule")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="화/목 18:00-22:00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">강좌 특징</label>
              <textarea {...register("features")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="강좌에 대한 특징 설명" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">교재 / 제공자료</label>
              <textarea {...register("materials")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="자체교재 및 모의고사" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">과제 / TEST</label>
              <textarea {...register("tasks")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="매주 누적 모의고사" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">관리 SYSTEM 및 CLINIC (줄바꿈 시 자동으로 리스트 표출)</label>
              <textarea {...register("management")} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="• 과제 체크 : 과제 입력... 
• 테스트 : ..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
              <textarea {...register("sessions")} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="1회차 - 다항식연산
2회차 - 항등식" />
            </div>
          </div>

          <button type="submit" disabled={addMutation.isPending} className="px-6 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 rounded transition-colors disabled:opacity-50">
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : "추가"}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {filtered.map(g => (
          <div key={g.id} className="bg-white p-4 border border-gray-200 rounded-lg">
            {editingId === g.id ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">카테고리</label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded">
                      <option value="curriculum">강사별 커리큘럼</option>
                      <option value="guideline">썸머스쿨 가이드라인</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
                    <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">표시 순서</label>
                    <input type="number" value={editForm.display_order} onChange={e => setEditForm({...editForm, display_order: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">수업 일정</label>
                    <textarea value={editForm.schedule} onChange={e => setEditForm({...editForm, schedule: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">강좌 특징</label>
                    <textarea value={editForm.features} onChange={e => setEditForm({...editForm, features: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">교재 / 제공자료</label>
                    <textarea value={editForm.materials} onChange={e => setEditForm({...editForm, materials: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">과제 / TEST</label>
                    <textarea value={editForm.tasks} onChange={e => setEditForm({...editForm, tasks: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">관리 SYSTEM 및 CLINIC</label>
                    <textarea value={editForm.management} onChange={e => setEditForm({...editForm, management: e.target.value})} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
                    <textarea value={editForm.sessions} onChange={e => setEditForm({...editForm, sessions: e.target.value})} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">연계 강좌</label>
                    <textarea value={editForm.linked} onChange={e => setEditForm({...editForm, linked: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded">저장</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded font-semibold">
                      {g.category === "curriculum" ? "커리큘럼" : "가이드라인"}
                    </span>
                    <span className="text-xs text-gray-400">순서: {g.display_order}</span>
                  </div>
                  <h5 className="font-bold text-gray-900">{g.title}</h5>
                  <div className="mt-3 space-y-2 text-sm">
                    {(() => {
                      const parsed = parseContent(g.content || "");
                      return (
                        <>
                          {parsed.schedule && <p className="text-gray-600"><span className="font-semibold text-gray-800">수업일정:</span> {parsed.schedule.replace(/\n/g, ' ')}</p>}
                          {parsed.features && <p className="text-gray-600"><span className="font-semibold text-gray-800">특징:</span> {parsed.features.substring(0, 50)}...</p>}
                          {parsed.sessions && <p className="text-gray-600"><span className="font-semibold text-gray-800">회차:</span> 포함됨</p>}
                          {parsed.linked && <p className="text-gray-600"><span className="font-semibold text-gray-800">연계:</span> {parsed.linked}</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(g)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => { if(confirm("삭제하시겠습니까?")) deleteMutation.mutate(g.id); }} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">등록된 데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
interface SummerNotice {
  id: number;
  division: string;
  title: string;
  content: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

function SortableNoticeRow({
  item,
  onDelete,
  onEdit,
  onToggleActive,
}: {
  item: SummerNotice;
  onDelete: (id: number) => void;
  onEdit: (item: SummerNotice) => void;
  onToggleActive: (item: SummerNotice) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border ${item.is_active ? 'border-gray-100 bg-gray-50/50' : 'border-gray-200 bg-gray-150/30 opacity-70'} rounded-lg p-3.5 hover:bg-gray-50 transition-colors shadow-sm`}
      data-testid={`row-notice-${item.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 min-w-0">
        <div className="font-bold text-gray-900 text-sm md:col-span-2 border-r border-gray-200/50 pr-3 break-words break-all whitespace-pre-wrap">
          {item.title}
        </div>
        <div className="text-xs text-gray-600 md:col-span-2 whitespace-pre-wrap break-words break-all leading-relaxed">
          {item.content}
        </div>
        <div className="text-xs font-semibold text-gray-400 flex items-center md:col-span-1 border-l border-gray-150/50 pl-2">
          {new Date(item.created_at).toLocaleDateString("ko-KR")}
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0 border-l border-gray-100 pl-2">
        <button
          onClick={() => onToggleActive(item)}
          className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
            item.is_active
              ? "bg-[#7B2332]/10 text-[#7B2332] hover:bg-[#7B2332]/25"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
          title={item.is_active ? "비활성화" : "활성화"}
        >
          {item.is_active ? "공개 중" : "비공개"}
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-2 text-gray-400 hover:text-[#7B2332] hover:bg-red-50 rounded transition-colors"
          title="수정"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SummerNoticesManager({ activeTab }: { activeTab: "중등" | "고1" | "고2" }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingNotice, setEditingNotice] = useState<SummerNotice | null>(null);
  const [localNotices, setLocalNotices] = useState<SummerNotice[]>([]);

  const { data: notices = [], isLoading } = useQuery<SummerNotice[]>({
    queryKey: ["/api/summer-notices"],
    queryFn: async () => {
      const res = await fetch("/api/summer-notices", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notices");
      return res.json();
    }
  });

  useEffect(() => {
    setLocalNotices(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(notices);
      return prevKey === newKey ? prev : notices;
    });
  }, [notices]);

  const filteredNotices = localNotices.filter((n) => n.division === activeTab);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addMutation = useMutation({
    mutationFn: async (data: { division: string; title: string; content: string }) => {
      const res = await fetch("/api/summer-notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to add notice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-notices"] });
      setTitle("");
      setContent("");
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string; is_active?: boolean }) => {
      const res = await fetch(`/api/summer-notices/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to edit notice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-notices"] });
      setEditingNotice(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/summer-notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-notices"] });
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/summer-notices/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-notices"] });
    },
    onError: () => {
      setLocalNotices(notices);
    }
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIdx = filteredNotices.findIndex(n => n.id === Number(active.id));
    const newIdx = filteredNotices.findIndex(n => n.id === Number(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    
    const reorderedFiltered = arrayMove(filteredNotices, oldIdx, newIdx);
    
    const updatedFullList = localNotices.map(item => {
      const movedItem = reorderedFiltered.find(n => n.id === item.id);
      return movedItem || item;
    });
    
    setLocalNotices(updatedFullList);
    reorderMutation.mutate(reorderedFiltered.map(n => n.id));
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    addMutation.mutate({ division: activeTab, title, content });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editingNotice.title.trim() || !editingNotice.content.trim()) return;
    editMutation.mutate({
      id: editingNotice.id,
      title: editingNotice.title,
      content: editingNotice.content,
      is_active: editingNotice.is_active
    });
  };

  const handleToggleActive = (notice: SummerNotice) => {
    editMutation.mutate({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      is_active: !notice.is_active
    });
  };

  return (
    <div className="space-y-6">
      {/* Editor Box */}
      {editingNotice ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleEditSubmit} 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#7B2332]" />
                입반TEST 안내 수정 ({activeTab})
              </h3>
              <button 
                type="button" 
                onClick={() => setEditingNotice(null)} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">안내 제목</label>
                <input
                  type="text"
                  value={editingNotice.title}
                  onChange={(e) => setEditingNotice({ ...editingNotice, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                  placeholder="제목"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">안내 내용 (반 정보나 시험 일정이 들어갈 경우 정해진 포맷에 따라 적으면 사용자 페이지에 예쁜 카드 형태로 보입니다)</label>
                <textarea
                  value={editingNotice.content}
                  onChange={(e) => setEditingNotice({ ...editingNotice, content: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium resize-y font-mono"
                  rows={12}
                  placeholder="내용을 작성해주세요."
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                수정 저장
              </button>
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      ) : (
        <form onSubmit={handleAddSubmit} className="bg-white border border-gray-200 p-6 space-y-4 shadow-sm rounded-lg">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#7B2332]" />
            입반TEST 안내 추가 ({activeTab})
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">안내 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                placeholder="예: [중3 TEST 일정]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">안내 내용 (줄바꿈이 적용됩니다. S반/A반 포맷 입력 시 자동 카드 렌더링)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium resize-y font-mono text-xs"
                rows={6}
                placeholder={`1. S반(최주용T, 권소영T)\n시험과목 : 공수1 / 공수2 / 대수\n시험시간 : 40분씩 총 120분\n시험 문항 수 : 각 15문항 총 45문항\n\n시험일정\n1차 : 6/8~6/19`}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            안내 추가
          </button>
        </form>
      )}

      {/* Notices List */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h4 className="text-sm font-bold text-gray-800">등록된 입반TEST 안내 ({filteredNotices.length})</h4>
          <p className="text-[10px] text-gray-400 font-semibold">≡ 드래그하여 순서 변경 가능</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
          </div>
        ) : filteredNotices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">등록된 입반TEST 안내가 없습니다.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredNotices.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filteredNotices.map((item) => (
                  <SortableNoticeRow
                    key={item.id}
                    item={item}
                    onDelete={(id) => {
                      if (confirm("이 입반TEST 안내를 정말 삭제하시겠습니까?")) {
                        deleteMutation.mutate(id);
                      }
                    }}
                    onEdit={(n) => setEditingNotice({ ...n })}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SummerTimetableManager({ activeTab }: { activeTab: "중등" | "고1" | "고2" }) {
  const [timetableTitle, setTimetableTitle] = useState("");
  const [slotLabel, setSlotLabel] = useState("오전");
  const [slotTime, setSlotTime] = useState("");
  const [isMerged, setIsMerged] = useState(false);
  const [mergedContent, setMergedContent] = useState("");
  const [mon, setMon] = useState("");
  const [tue, setTue] = useState("");
  const [wed, setWed] = useState("");
  const [thu, setThu] = useState("");
  const [fri, setFri] = useState("");
  const [sat, setSat] = useState("");
  const [sun, setSun] = useState("");
  const [editingSlot, setEditingSlot] = useState<any | null>(null);

  const { data: slots = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/summer-timetable-slots", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/summer-timetable-slots?division=${encodeURIComponent(activeTab)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/summer-timetable-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-timetable-slots", activeTab] });
      setTimetableTitle("");
      setSlotLabel("오전");
      setSlotTime("");
      setIsMerged(false);
      setMergedContent("");
      setMon("");
      setTue("");
      setWed("");
      setThu("");
      setFri("");
      setSat("");
      setSun("");
    }
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/summer-timetable-slots/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to edit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-timetable-slots", activeTab] });
      setEditingSlot(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/summer-timetable-slots/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-timetable-slots", activeTab] });
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/summer-timetable-slots/reset", {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-timetable-slots", activeTab] });
      alert("성공적으로 초기화되었습니다.");
    }
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetableTitle.trim() || !slotLabel.trim()) return;
    addMutation.mutate({
      division: activeTab,
      timetable_title: timetableTitle.trim(),
      slot_label: slotLabel.trim(),
      slot_time: slotTime.trim(),
      is_merged: isMerged,
      merged_content: mergedContent.trim(),
      mon: mon.trim(),
      tue: tue.trim(),
      wed: wed.trim(),
      thu: thu.trim(),
      fri: fri.trim(),
      sat: sat.trim(),
      sun: sun.trim()
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editingSlot.timetable_title.trim() || !editingSlot.slot_label.trim()) return;
    editMutation.mutate(editingSlot);
  };

  return (
    <div className="space-y-6">
      {/* Reseed/Reset Database Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (confirm("경고: 수정하신 모든 시간표 데이터가 지워지고 초기 상태로 복구됩니다. 정말 초기화하시겠습니까?")) {
              resetMutation.mutate();
            }
          }}
          type="button"
          disabled={resetMutation.isPending}
          className="px-4 py-2 border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {resetMutation.isPending ? "초기화 중..." : "시간표 초기 데이터 복구 (리셋)"}
        </button>
      </div>

      {/* Editor Box */}
      {editingSlot ? (
        <form onSubmit={handleEditSubmit} className="bg-white border border-gray-200 p-6 space-y-4 shadow-sm rounded-lg">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#7B2332]" />
            시간표 행(슬롯) 수정 ({activeTab})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">시간표 제목 (예: 화성고 시간표)</label>
              <input
                type="text"
                value={editingSlot.timetable_title}
                onChange={(e) => setEditingSlot({ ...editingSlot, timetable_title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">슬롯 구분 (예: 오전 / 오후 / 저녁)</label>
              <input
                type="text"
                value={editingSlot.slot_label}
                onChange={(e) => setEditingSlot({ ...editingSlot, slot_label: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">시간 상세 (예: 9:00 - 12:30)</label>
              <input
                type="text"
                value={editingSlot.slot_time || ""}
                onChange={(e) => setEditingSlot({ ...editingSlot, slot_time: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editingSlot.is_merged}
                onChange={(e) => setEditingSlot({ ...editingSlot, is_merged: e.target.checked })}
                className="rounded text-red-600 focus:ring-red-500 border-gray-300"
              />
              가로 칸 합치기 (월~일 통합 메시지 표시)
            </label>
          </div>

          {editingSlot.is_merged ? (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">합쳐진 칸 내용 (예: 점심식사)</label>
              <input
                type="text"
                value={editingSlot.merged_content || ""}
                onChange={(e) => setEditingSlot({ ...editingSlot, merged_content: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
              {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                const label = day === "mon" ? "월" : day === "tue" ? "화" : day === "wed" ? "수" : day === "thu" ? "목" : day === "fri" ? "금" : day === "sat" ? "토" : "일";
                return (
                  <div key={day}>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">{label}요일 수업</label>
                    <textarea
                      value={editingSlot[day] || ""}
                      onChange={(e) => setEditingSlot({ ...editingSlot, [day]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-red-600 bg-gray-50 font-medium resize-y font-mono"
                      rows={3}
                      placeholder="수업명\n강사명\n시간"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              수정 저장
            </button>
            <button
              type="button"
              onClick={() => setEditingSlot(null)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleAddSubmit} className="bg-white border border-gray-200 p-6 space-y-4 shadow-sm rounded-lg">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#7B2332]" />
            시간표 새 행(슬롯) 추가 ({activeTab})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">시간표 제목 (예: 화성고 시간표)</label>
              <input
                type="text"
                value={timetableTitle}
                onChange={(e) => setTimetableTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                placeholder="예: 화성고 시간표"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">슬롯 구분 (예: 오전 / 오후 / 저녁)</label>
              <input
                type="text"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                placeholder="예: 오전"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">시간 상세 (예: 9:00 - 12:30)</label>
              <input
                type="text"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                placeholder="예: 9:00 - 12:30 (생략 가능)"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isMerged}
                onChange={(e) => setIsMerged(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 border-gray-300"
              />
              가로 칸 합치기 (월~일 통합 메시지 표시)
            </label>
          </div>

          {isMerged ? (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">합쳐진 칸 내용 (예: 점심식사)</label>
              <input
                type="text"
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50 font-medium"
                placeholder="예: 점심식사"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
              {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                const label = day === "mon" ? "월" : day === "tue" ? "화" : day === "wed" ? "수" : day === "thu" ? "목" : day === "fri" ? "금" : day === "sat" ? "토" : "일";
                const val = day === "mon" ? mon : day === "tue" ? tue : day === "wed" ? wed : day === "thu" ? thu : day === "fri" ? fri : day === "sat" ? sat : sun;
                const setVal = day === "mon" ? setMon : day === "tue" ? setTue : day === "wed" ? setWed : day === "thu" ? setThu : day === "fri" ? setFri : day === "sat" ? setSat : setSun;
                return (
                  <div key={day}>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">{label}요일 수업</label>
                    <textarea
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-red-600 bg-gray-50 font-medium resize-y font-mono"
                      rows={3}
                      placeholder="수업명\n강사명\n시간"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-6 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            행(슬롯) 추가
          </button>
        </form>
      )}

      {/* Slots List */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <h4 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">등록된 시간표 목록 ({slots.length})</h4>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">등록된 시간표 행이 없습니다. 새 행을 추가하거나 초기데이터를 복구해보세요.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-lg">
            <table className="w-full text-xs text-left border-collapse" style={{ minWidth: 800 }}>
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-700 font-bold">
                  <th className="p-3 w-40">시간표 그룹</th>
                  <th className="p-3 w-16">구분</th>
                  <th className="p-3 w-24">시간</th>
                  <th className="p-3">월</th>
                  <th className="p-3">화</th>
                  <th className="p-3">수</th>
                  <th className="p-3">목</th>
                  <th className="p-3">금</th>
                  <th className="p-3">토</th>
                  <th className="p-3">일</th>
                  <th className="p-3 w-20 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slots.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-bold text-gray-800">{item.timetable_title}</td>
                    <td className="p-3 font-semibold text-gray-500">{item.slot_label}</td>
                    <td className="p-3 text-[10px] text-gray-400 whitespace-nowrap">{item.slot_time}</td>
                    {item.is_merged ? (
                      <td colSpan={7} className="p-3 text-center bg-gray-50 text-gray-500 font-bold italic">
                        [합쳐진 칸]: {item.merged_content}
                      </td>
                    ) : (
                      <>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.mon}</td>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.tue}</td>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.wed}</td>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.thu}</td>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.fri}</td>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.sat}</td>
                        <td className="p-3 whitespace-pre-line text-gray-600 font-medium">{item.sun}</td>
                      </>
                    )}
                    <td className="p-3">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => setEditingSlot({ ...item })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("이 시간표 행을 삭제하시겠습니까?")) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const SUMMER_CATEGORIES = [
  { value: "overview", label: "프로그램 개요" },

  { value: "curriculum", label: "강사별 커리큘럼" },
  { value: "guideline", label: "모집 요강" },
] as const;

function SortableSummerImageCard({ item, onDelete }: { item: any; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 border border-gray-200 p-3 bg-white rounded-lg hover:border-gray-300 transition-all shadow-sm"
      data-testid={`card-summer-image-${item.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 pt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#7B2332] transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.teacher_name ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
            {item.teacher_name ? `선생님: ${item.teacher_name}` : "공통 (선생님 미지정)"}
          </span>
        </div>
        <img src={item.image_url} alt="브로셔 이미지" className="w-full max-w-sm border border-gray-100 rounded-md" />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        data-testid={`button-delete-summer-image-${item.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function SummerTab() {
  const [activeTab, setActiveTab] = useState<"중등" | "고1" | "고2">("중등");
  const [subTab, setSubTab] = useState<"brochures" | "guidelines" | "notices" | "timetables">("brochures");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("0");
  const [selectedDivision, setSelectedDivision] = useState<string>("중등");
  const [selectedCategory, setSelectedCategory] = useState<string>("curriculum");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedDivision(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "중등" && subTab === "notices") {
      setSubTab("brochures");
    }
  }, [activeTab, subTab]);

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/summer-images"],
    queryFn: async () => {
      const res = await fetch(`/api/summer-images`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const [localItems, setLocalItems] = useState<any[]>([]);
  useEffect(() => {
    setLocalItems(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(items);
      return prevKey === newKey ? prev : items;
    });
  }, [items]);

  const sumSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/summer-images", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-images"] });
      setImageFiles([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSelectedCategory("curriculum");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/summer-images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-images"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/summer-images/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-images"] });
    },
    onError: () => {
      setLocalItems(items);
    },
  });

  function handleDragEndSummer(event: DragEndEvent, groupItems: any[]) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = groupItems.findIndex(t => t.id === Number(active.id));
    const newIdx = groupItems.findIndex(t => t.id === Number(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const newList = arrayMove(groupItems, oldIdx, newIdx);
    
    // Create a new full list by updating only the relevant group
    const updatedFullList = localItems.map(item => {
      const movedItem = newList.find(n => n.id === item.id);
      return movedItem || item;
    });
    
    setLocalItems(updatedFullList);
    reorderMutation.mutate(newList.map(t => t.id));
  }

  const handleUpload = () => {
    if (imageFiles.length === 0) return;
    imageFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("image", file);
      if (selectedTeacherId !== "0") {
        formData.append("teacher_id", selectedTeacherId);
      }
      formData.append("division", selectedDivision);
      formData.append("category", selectedCategory);
      addMutation.mutate(formData);
    });
  };

  // Filter items by the active tab
  const filteredItems = localItems.filter((img) => (img.division || "중등") === activeTab);

  // Helper to get items by category
  const getCategoryItems = (catValue: string) => {
    return filteredItems.filter((img) => (img.category || "curriculum") === catValue);
  };

  return (
    <div className="space-y-6" data-testid="section-summer-images">
      {/* Division selection tabs at the top */}
      <div className="flex gap-2 border-b border-gray-200 pb-px">
        {(["중등", "고1", "고2"] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 border-b-2 text-sm font-bold transition-colors ${
                active
                  ? "border-[#7B2332] text-[#7B2332]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "중등" ? "중등 썸머" : `${tab} 썸머`}
            </button>
          );
        })}
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit border border-gray-200/50">
        <button
          onClick={() => setSubTab("brochures")}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
            subTab === "brochures"
              ? "bg-[#7B2332] text-white shadow-md shadow-red-900/10"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          브로셔 관리
        </button>
        <button
          onClick={() => setSubTab("guidelines")}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
            subTab === "guidelines"
              ? "bg-[#7B2332] text-white shadow-md shadow-red-900/10"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          모집 요강 관리
        </button>
        {activeTab === "중등" && (
          <button
            onClick={() => setSubTab("notices")}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              subTab === "notices"
                ? "bg-[#7B2332] text-white shadow-md shadow-red-900/10"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            입반TEST 안내 관리
          </button>
        )}
        <button
          onClick={() => setSubTab("timetables")}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
            subTab === "timetables"
              ? "bg-[#7B2332] text-white shadow-md shadow-red-900/10"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          시간표 관리
        </button>
      </div>

      {subTab === "guidelines" ? (
        <SummerGuidelinesManager activeTab={activeTab} />
      ) : subTab === "notices" ? (
        <SummerNoticesManager activeTab={activeTab} />
      ) : subTab === "timetables" ? (
        <SummerTimetableManager activeTab={activeTab} />
      ) : (
        <>
          <div className="bg-white border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">{activeTab} 썸머스쿨 이미지 등록</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">구분</label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50"
                  >
                    <option value="중등">중등</option>
                    <option value="고1">고1</option>
                    <option value="고2">고2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">선생님 선택</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50"
                  >
                    <option value="0">공통 (선생님 미지정)</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">표시할 섹션 위치</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 bg-gray-50"
                  >
                    <option value="overview">프로그램 개요</option>

                    <option value="curriculum">강사별 커리큘럼</option>
                    <option value="guideline">모집 요강</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">이미지 선택 (여러 장 가능)</label>
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
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    data-testid="input-summer-image"
                  />
                </div>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden">
                      <img src={preview} alt={`미리보기 ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={handleUpload}
                disabled={imageFiles.length === 0 || addMutation.isPending}
                className="w-full sm:w-auto px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                data-testid="button-add-summer"
              >
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {imageFiles.length > 1 ? `${imageFiles.length}개 일괄 등록` : "이미지 등록"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-20 bg-white border border-gray-200 rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-200 rounded-xl">
                <p className="text-gray-400 text-sm">{activeTab} 썸머스쿨에 등록된 이미지가 없습니다.</p>
              </div>
            ) : (
              SUMMER_CATEGORIES.map((cat) => {
                const groupItems = getCategoryItems(cat.value);
                return (
                  <div key={cat.value} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#7B2332]" />
                        {cat.label} ({groupItems.length})
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium">드래그하여 순서 변경</p>
                    </div>
                    
                    <div className="p-5">
                      {groupItems.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">등록된 이미지가 없습니다.</p>
                      ) : (
                        <DndContext sensors={sumSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndSummer(e, groupItems)}>
                          <SortableContext items={groupItems.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 gap-3">
                              {groupItems.map((item) => (
                                <SortableSummerImageCard
                                  key={item.id}
                                  item={item}
                                  onDelete={(id) => {
                                    if (confirm("이 이미지를 삭제하시겠습니까?")) deleteMutation.mutate(id);
                                  }}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SortableMiddleSchoolImageCard({ item, onDelete }: { item: any; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 border border-gray-200 p-3 bg-white rounded-lg hover:border-gray-300 transition-all shadow-sm"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 pt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#7B2332] transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <img src={item.image_url} alt="중3 포스터" className="w-full max-w-sm border border-gray-100 rounded-md" />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function MiddleSchoolTab() {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/middle-school-images"],
    queryFn: async () => {
      const res = await fetch(`/api/middle-school-images`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const [localItems, setLocalItems] = useState<any[]>([]);
  useEffect(() => {
    setLocalItems(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(items);
      return prevKey === newKey ? prev : items;
    });
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/middle-school-images", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/middle-school-images"] });
      setImageFiles([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/middle-school-images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/middle-school-images"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/middle-school-images/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/middle-school-images"] });
    },
    onError: () => {
      setLocalItems(items);
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localItems.findIndex(t => t.id === Number(active.id));
    const newIdx = localItems.findIndex(t => t.id === Number(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const newList = arrayMove(localItems, oldIdx, newIdx);
    setLocalItems(newList);
    reorderMutation.mutate(newList.map(t => t.id));
  }

  const handleUpload = () => {
    if (imageFiles.length === 0) return;
    imageFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("image", file);
      addMutation.mutate(formData);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">중3 포스터 이미지 등록</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">이미지 선택 (여러 장 가능)</label>
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
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden">
                  <img src={preview} alt={`미리보기 ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">{idx + 1}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={imageFiles.length === 0 || addMutation.isPending}
            className="w-full sm:w-auto px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {imageFiles.length > 1 ? `${imageFiles.length}개 일괄 등록` : "이미지 등록"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7B2332]" />
            등록된 포스터 목록 ({localItems.length})
          </h4>
          <p className="text-[10px] text-gray-400 font-medium">드래그하여 순서 변경</p>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-200" />
            </div>
          ) : localItems.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">등록된 이미지가 없습니다.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localItems.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-3">
                  {localItems.map((item) => (
                    <SortableMiddleSchoolImageCard
                      key={item.id}
                      item={item}
                      onDelete={(id) => {
                        if (confirm("이 이미지를 삭제하시겠습니까?")) deleteMutation.mutate(id);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
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

function SortableFilterTabRow({
  tab,
  index,
  editingId,
  editingLabel,
  setEditingLabel,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete,
  isUpdatePending,
}: {
  tab: FilterTabItem;
  index: number;
  editingId: number | null;
  editingLabel: string;
  setEditingLabel: (v: string) => void;
  onEditStart: (tab: FilterTabItem) => void;
  onEditCancel: () => void;
  onEditSave: (id: number, label: string) => void;
  onDelete: (id: number, label: string) => void;
  isUpdatePending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isEditing = editingId === tab.id;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded group hover:border-gray-300 transition-colors"
      data-testid={`filter-tab-item-${tab.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-[#7B2332] transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <span className="text-xs text-gray-400 w-6 text-center font-mono">{index + 1}</span>
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editingLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#7B2332]"
            data-testid={`input-edit-filter-tab-${tab.id}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && editingLabel.trim()) onEditSave(tab.id, editingLabel.trim());
              if (e.key === "Escape") onEditCancel();
            }}
          />
          <button onClick={() => editingLabel.trim() && onEditSave(tab.id, editingLabel.trim())} className="p-1 text-green-600 hover:bg-green-50 rounded">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onEditCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-gray-800">{tab.label}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEditStart(tab)}
              className="p-1 text-gray-400 hover:text-[#7B2332]"
              data-testid={`button-edit-filter-tab-${tab.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(tab.id, tab.label)}
              className="p-1 text-gray-400 hover:text-red-600"
              data-testid={`button-delete-filter-tab-${tab.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

  const [localTabs, setLocalTabs] = useState<FilterTabItem[]>([]);
  useEffect(() => {
    setLocalTabs(prev => {
      const prevKey = JSON.stringify(prev);
      const newKey = JSON.stringify(tabs);
      return prevKey === newKey ? prev : tabs;
    });
  }, [tabs]);

  const filterSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch("/api/filter-tabs/reorder", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("순서 변경 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-tabs", selectedCategory] });
    },
    onError: () => {
      setLocalTabs(tabs);
    },
  });

  function handleDragEndFilter(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localTabs.findIndex(t => t.id === Number(active.id));
    const newIdx = localTabs.findIndex(t => t.id === Number(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const newList = arrayMove(localTabs, oldIdx, newIdx);
    setLocalTabs(newList);
    reorderMutation.mutate(newList.map(t => t.id));
  }

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
      ) : localTabs.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 목차가 없습니다.</p>
      ) : (
        <DndContext sensors={filterSensors} collisionDetection={closestCenter} onDragEnd={handleDragEndFilter}>
          <SortableContext items={localTabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {localTabs.map((tab, index) => (
                <SortableFilterTabRow
                  key={tab.id}
                  tab={tab}
                  index={index}
                  editingId={editingId}
                  editingLabel={editingLabel}
                  setEditingLabel={setEditingLabel}
                  onEditStart={(t) => { setEditingId(t.id); setEditingLabel(t.label); }}
                  onEditCancel={() => setEditingId(null)}
                  onEditSave={(id, label) => updateMutation.mutate({ id, label })}
                  onDelete={(id, label) => { if (confirm(`"${label}" 목차를 삭제하시겠습니까?`)) deleteMutation.mutate(id); }}
                  isUpdatePending={updateMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface NoticeImage {
  id: number;
  image_url: string;
  display_order: number;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  images: NoticeImage[];
  is_active: boolean;
  display_order: number;
  created_at: string;
}

function formatNoticeDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function NoticesTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editNewFiles, setEditNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [editDeletedIds, setEditDeletedIds] = useState<Set<number>>(new Set());

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const newFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices?admin=1"],
    queryFn: () => fetch("/api/notices?admin=1").then((r) => r.json()),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notices?admin=1"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notices"] });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("title", newTitle);
      fd.append("content", newContent);
      newFiles.forEach(({ file }) => fd.append("images", file));
      const res = await fetch("/api/notices", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setNewTitle(""); setNewContent(""); setNewFiles([]);
      if (newFileRef.current) newFileRef.current.value = "";
      invalidate();
    },
  });

  const editMutation = useMutation({
    mutationFn: async (id: number) => {
      const fd = new FormData();
      fd.append("title", editTitle);
      fd.append("content", editContent);
      fd.append("delete_image_ids", JSON.stringify(Array.from(editDeletedIds)));
      editNewFiles.forEach(({ file }) => fd.append("images", file));
      const res = await fetch(`/api/notices/${id}`, { method: "PUT", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null); setEditNewFiles([]); setEditDeletedIds(new Set());
      if (editFileRef.current) editFileRef.current.value = "";
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/notices/${id}/toggle`, {}),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notices/${id}`, {}),
    onSuccess: invalidate,
  });

  const startEdit = (notice: Notice) => {
    setEditingId(notice.id);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditNewFiles([]);
    setEditDeletedIds(new Set());
    if (editFileRef.current) editFileRef.current.value = "";
  };

  const handleNewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
    if (newFileRef.current) newFileRef.current.value = "";
  };

  const handleEditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEditNewFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
    if (editFileRef.current) editFileRef.current.value = "";
  };

  const removeNewFile = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeEditNewFile = (idx: number) => {
    setEditNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleDeletedId = (imgId: number) => {
    setEditDeletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else next.add(imgId);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-lg font-bold text-gray-800 mb-1">공지사항 관리</h2>
      <p className="text-xs text-gray-400 mb-6">공개 설정된 공지만 방문자 화면에 표시됩니다.</p>

      {/* 새 공지 등록 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#7B2332]" />
          새 공지 등록
        </p>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-2.5 focus:outline-none focus:border-[#7B2332] focus:ring-1 focus:ring-[#7B2332]/20 bg-gray-50"
          placeholder="제목 *"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          data-testid="input-notice-title"
        />
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#7B2332] focus:ring-1 focus:ring-[#7B2332]/20 resize-none bg-gray-50"
          placeholder="내용 (선택사항)"
          rows={4}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          data-testid="input-notice-content"
        />

        {/* 다중 이미지 미리보기 */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            이미지 첨부 <span className="text-gray-400 font-normal">(여러 장 동시 선택 가능)</span>
          </label>
          {newFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {newFiles.map((f, idx) => (
                <div key={idx} className="relative group">
                  <img src={f.preview} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 bg-gray-50" />
                  <button
                    onClick={() => removeNewFile(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#7B2332] hover:bg-[#7B2332]/5 transition-colors w-fit">
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">이미지 선택 (복수 선택 가능)</span>
            <input ref={newFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleNewFilesChange} data-testid="input-notice-images" />
          </label>
        </div>

        <button
          onClick={() => newTitle.trim() && addMutation.mutate()}
          disabled={addMutation.isPending || !newTitle.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-[#7B2332] text-white text-sm font-semibold rounded-lg hover:bg-[#6a1e2b] disabled:opacity-50 transition-colors"
          data-testid="button-add-notice"
        >
          {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          등록하기
        </button>
      </div>

      {/* 공지 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-sm">등록된 공지사항이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                notice.is_active
                  ? "border-gray-200 bg-white"
                  : "border-dashed border-gray-300 bg-gray-50"
              }`}
              data-testid={`admin-notice-${notice.id}`}
            >
              {editingId === notice.id ? (
                /* 수정 폼 */
                <div className="p-4">
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-2 focus:outline-none focus:border-[#7B2332] bg-gray-50"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    data-testid={`input-edit-title-${notice.id}`}
                  />
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#7B2332] resize-none bg-gray-50"
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    data-testid={`input-edit-content-${notice.id}`}
                  />

                  {/* 이미지 수정 영역 */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">이미지 관리</label>

                    {/* 기존 이미지 */}
                    {notice.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {notice.images.map((img) => {
                          const isDeleted = editDeletedIds.has(img.id);
                          return (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.image_url}
                                alt=""
                                className={`w-20 h-20 object-cover rounded-lg border ${isDeleted ? "opacity-30 border-red-300" : "border-gray-200"} bg-gray-50`}
                              />
                              <button
                                onClick={() => toggleDeletedId(img.id)}
                                className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${isDeleted ? "bg-gray-400 hover:bg-gray-500" : "bg-red-500 hover:bg-red-600"}`}
                                title={isDeleted ? "삭제 취소" : "이미지 삭제"}
                              >
                                {isDeleted ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </button>
                              {isDeleted && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                                  <span className="text-[10px] font-bold text-red-500 bg-white/80 px-1 rounded">삭제예정</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 새로 추가할 이미지 미리보기 */}
                    {editNewFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editNewFiles.map((f, idx) => (
                          <div key={idx} className="relative group">
                            <img src={f.preview} alt="" className="w-20 h-20 object-cover rounded-lg border border-blue-200 bg-blue-50" />
                            <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold text-blue-600 bg-white/80 rounded-b-lg py-0.5">새 사진</div>
                            <button
                              onClick={() => removeEditNewFile(idx)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#7B2332] hover:bg-[#7B2332]/5 transition-colors w-fit">
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">이미지 추가 (복수 선택 가능)</span>
                      <input ref={editFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleEditFilesChange} data-testid={`input-edit-notice-images-${notice.id}`} />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editMutation.mutate(notice.id)}
                      disabled={editMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-[#7B2332] text-white text-xs font-semibold rounded-lg hover:bg-[#6a1e2b] transition-colors"
                      data-testid={`button-save-notice-${notice.id}`}
                    >
                      {editMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                      data-testid={`button-cancel-notice-${notice.id}`}
                    >
                      <X className="w-3 h-3" />
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* 공지 카드 */
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-snug mb-1" data-testid={`text-admin-notice-title-${notice.id}`}>
                        {notice.title}
                      </p>
                      {notice.content && (
                        <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap leading-relaxed">
                          {notice.content}
                        </p>
                      )}
                      {notice.images?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {notice.images.map((img) => (
                            <img key={img.id} src={img.image_url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-100 bg-gray-50" />
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1.5">{formatNoticeDate(notice.created_at)}</p>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <button
                        onClick={() => toggleMutation.mutate(notice.id)}
                        disabled={toggleMutation.isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          notice.is_active
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                        }`}
                        title={notice.is_active ? "클릭하면 비공개로 전환" : "클릭하면 공개로 전환"}
                        data-testid={`button-toggle-notice-${notice.id}`}
                      >
                        {notice.is_active ? (
                          <><Eye className="w-3 h-3" /> 공개</>
                        ) : (
                          <><EyeOff className="w-3 h-3" /> 비공개</>
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(notice)}
                        className="p-1.5 text-gray-400 hover:text-[#7B2332] rounded-lg hover:bg-red-50 transition-colors"
                        title="수정"
                        data-testid={`button-edit-notice-${notice.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm("이 공지사항을 삭제하시겠습니까?")) deleteMutation.mutate(notice.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="삭제"
                        data-testid={`button-delete-notice-${notice.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

function SchoolsTab() {
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: schools = EMPTY_SCHOOLS, isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/schools", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setName("");
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/schools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    const file = fileRef.current?.files?.[0];
    if (file) formData.append("logo", file);
    try {
      await addMutation.mutateAsync(formData);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">학교 로고 관리</h2>
      <p className="text-xs text-gray-400 mb-6">학교별 로고를 등록하면 시간표 목록에 해당 로고가 표시됩니다.</p>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">학교 이름 *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7B2332] bg-gray-50"
            placeholder="예: 화성고"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">학교 로고 (이미지)</label>
          <input ref={fileRef} type="file" accept="image/*" className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
        </div>
        <button
          type="submit"
          disabled={uploading || !name.trim()}
          className="bg-[#7B2332] text-white px-6 py-2 text-sm font-semibold rounded-lg hover:bg-[#6a1e2b] disabled:opacity-50 transition-colors h-[38px] flex items-center gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          등록
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                ) : (
                  <Calendar className="w-6 h-6 text-gray-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{s.name}</p>
                <p className="text-[10px] text-gray-400">등록일: {formatNoticeDate(s.created_at)}</p>
              </div>
              <button
                onClick={() => confirm(`"${s.name}" 학교를 삭제하시겠습니까?`) && deleteMutation.mutate(s.id)}
                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {schools.length === 0 && (
            <p className="col-span-full text-center py-10 text-gray-400 text-sm">등록된 학교가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

function NavigationManager() {
  const { data: menus = [], isLoading } = useQuery<NavigationMenu[]>({
    queryKey: ["/api/admin/navigation"],
  });

  const { register, handleSubmit, reset, setValue } = useForm<Partial<NavigationMenu>>();
  const [editingId, setEditingId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: Partial<NavigationMenu>) => {
      if (editingId) {
        await apiRequest("PATCH", `/api/admin/navigation/${editingId}`, data);
      } else {
        await apiRequest("POST", "/api/admin/navigation", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/navigation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/navigation"] });
      reset();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/navigation/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/navigation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/navigation"] });
    },
  });

  const parentMenus = menus.filter(m => !m.parent_id);

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">{editingId ? "메뉴 수정" : "새 메뉴 추가"}</h3>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">메뉴 이름</label>
            <input {...register("label", { required: true })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none" placeholder="예: 학원소개" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">이동 경로 (Path)</label>
            <input {...register("path", { required: true })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none" placeholder="예: /about" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">상위 메뉴</label>
            <select {...register("parent_id")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none">
              <option value="">없음 (상위 메뉴)</option>
              {parentMenus.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">정렬 순서</label>
            <input type="number" {...register("display_order")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none" />
          </div>
          <div className="md:col-span-2 flex items-center gap-4 pt-2">
            <button type="submit" disabled={mutation.isPending} className="bg-red-600 text-white px-6 py-2 rounded font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
              {mutation.isPending ? "저장 중..." : editingId ? "수정 완료" : "추가하기"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); reset(); }} className="text-gray-500 text-sm font-bold hover:underline">취소</button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">메뉴 목록</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {parentMenus.map(parent => {
            const children = menus.filter(m => m.parent_id === parent.id);
            return (
              <div key={parent.id} className="bg-white">
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center font-bold text-[#7B2332] text-xs">
                      {parent.display_order}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{parent.label}</h4>
                      <p className="text-xs text-gray-400">{parent.path}</p>
                    </div>
                    {!parent.is_visible && <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] font-bold rounded">숨김</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      setEditingId(parent.id);
                      setValue("label", parent.label);
                      setValue("path", parent.path);
                      setValue("parent_id", parent.parent_id);
                      setValue("display_order", parent.display_order);
                    }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => {
                      if (confirm("이 메뉴를 삭제하시겠습니까? 하위 메뉴도 함께 삭제됩니다.")) {
                        deleteMutation.mutate(parent.id);
                      }
                    }} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {children.length > 0 && (
                  <div className="bg-gray-50/30 pl-12 divide-y divide-gray-100 border-t border-gray-100">
                    {children.map(child => (
                      <div key={child.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300">└</span>
                          <div>
                            <h5 className="text-sm font-medium text-gray-700">{child.label}</h5>
                            <p className="text-[10px] text-gray-400">{child.path}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            setEditingId(child.id);
                            setValue("label", child.label);
                            setValue("path", child.path);
                            setValue("parent_id", child.parent_id);
                            setValue("display_order", child.display_order);
                          }} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => {
                            if (confirm("이 하위 메뉴를 삭제하시겠습니까?")) {
                              deleteMutation.mutate(child.id);
                            }
                          }} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function SidebarButton({ id, icon: Icon, label, tab, setTab, setMobileMenuOpen }: any) {
  const active = tab === id;
  return (
    <button
      onClick={() => {
        setTab(id);
        if (setMobileMenuOpen) setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-[#7B2332] text-white shadow-md shadow-[#7B2332]/20"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      }`}
      data-testid={`tab-${id}`}
    >
      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-500"}`} />
      {label}
    </button>
  );
}

export default function AdminPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tab, setTab] = useState<"teachers" | "timetables" | "summary-timetables" | "banners" | "popups" | "briefings" | "sms" | "level-test" | "reviews" | "reservations" | "filter-tabs" | "notices" | "summer" | "schools" | "briefing-events" | "navigation" | "middle-school">("teachers");

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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-admin-home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">이강학원 관리자</h1>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-400 hover:text-white transition-colors">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full md:w-64 bg-gray-900 text-gray-300 md:min-h-screen flex-shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto ${mobileMenuOpen ? 'block' : 'hidden md:block'} transition-all z-40 shadow-xl`}>
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-gray-800">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors" data-testid="link-admin-home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">관리자 대시보드</h1>
        </div>
        <div className="p-4 space-y-8">
           
           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">인물 및 수업</div>
             <div className="space-y-1">
               <SidebarButton id="teachers" icon={Users} label="선생님 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="timetables" icon={Calendar} label="정규 시간표" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="summary-timetables" icon={Image} label="기말/내신 시간표" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">특강 및 설명회</div>
             <div className="space-y-1">
               <SidebarButton id="summer" icon={Image} label="썸머 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="briefings" icon={CalendarDays} label="설명회 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="briefing-events" icon={CalendarDays} label="설명회 캘린더" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="level-test" icon={BookOpen} label="수학레벨테스트" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="reservations" icon={CalendarDays} label="수강예약 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">콘텐츠 및 운영</div>
             <div className="space-y-1">
               <SidebarButton id="banners" icon={Image} label="배너 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="popups" icon={Megaphone} label="팝업 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="notices" icon={Megaphone} label="공지사항" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="reviews" icon={Star} label="합격후기" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="middle-school" icon={Image} label="중3 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

           <div>
             <div className="px-3 mb-3 text-xs font-bold text-gray-500 uppercase tracking-widest">시스템 설정</div>
             <div className="space-y-1">
               <SidebarButton id="sms" icon={MessageSquare} label="문자 수신" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="filter-tabs" icon={ListOrdered} label="목차 관리" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="navigation" icon={ListOrdered} label="메뉴 설정" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
               <SidebarButton id="schools" icon={Calendar} label="학교 로고" tab={tab} setTab={setTab} setMobileMenuOpen={setMobileMenuOpen} />
             </div>
           </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 md:max-w-[calc(100vw-16rem)] overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[calc(100vh-4rem)] md:min-h-0">

        {tab === "teachers" ? <TeachersTab /> : tab === "timetables" ? <TimetablesTab /> : tab === "filter-tabs" ? <FilterTabsTab /> : tab === "summary-timetables" ? <SummaryTimetablesTab /> : tab === "banners" ? <BannersTab /> : tab === "popups" ? <PopupsTab /> : tab === "briefings" ? <BriefingsTab /> : tab === "briefing-events" ? <BriefingEventsTab /> : tab === "reviews" ? <ReviewsTab /> : tab === "reservations" ? <ReservationsTab /> : tab === "notices" ? <NoticesTab /> : tab === "summer" ? <SummerTab /> : tab === "middle-school" ? <MiddleSchoolTab /> : tab === "schools" ? <SchoolsTab /> : tab === "navigation" ? <NavigationManager /> : tab === "level-test" ? <LevelTestTab /> : <SmsSubscriptionsTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
