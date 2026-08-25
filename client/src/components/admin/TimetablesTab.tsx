import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  Loader2,
  Eye,
  EyeOff,
  X,
  Image as ImageIcon,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  Users,
  Check,
  Zap,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  isVerticalSheet,
  parseVerticalSheet,
  detectSubject,
  mapTargetToDivision,
  cleanTeacherName,
  normalizeSchool,
  formatClassTitle,
} from "@/lib/brochure-excel";

interface Teacher {
  id: number;
  name: string;
  subject?: string;
  division?: string;
  image_url?: string;
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
  is_visible: boolean;
  is_union: boolean;
  description: string;
  subject: string;
  teacher_image_url?: string | null;
  detail_image_url?: string | null;
  teacher_ids?: number[] | null;
}

interface TimetablePhoto {
  teacher_id: number;
  teacher_name: string;
  image_url: string;
}

const CATEGORY_OPTIONS = [
  "고등관-고1",
  "고등관-고2",
  "고등관-고3",
  "중등관-중3",
  "초/중등관",
  "고등관",
];

const SUBJECT_OPTIONS = ["수학", "국어", "영어", "통합과학", "통합사회/한국사", "탐구", "논술"];

export function TimetablesTab() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showPhotoManager, setShowPhotoManager] = useState(false);

  // Inline Row Edit State
  const [inlineEditId, setInlineEditId] = useState<number | null>(null);
  const [inlineForm, setInlineForm] = useState<{
    category: string;
    subject: string;
    target_school: string;
    class_name: string;
    teacher_name: string;
    class_time: string;
    start_date: string;
    is_visible: boolean;
    is_union: boolean;
  }>({
    category: "고등관-고1",
    subject: "수학",
    target_school: "",
    class_name: "",
    teacher_name: "",
    class_time: "",
    start_date: "",
    is_visible: true,
    is_union: false,
  });
  const [inlineSaving, setInlineSaving] = useState(false);

  // Queries
  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables"],
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: timetablePhotos = [] } = useQuery<TimetablePhoto[]>({
    queryKey: ["/api/teacher-timetable-photos"],
  });

  // Single delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timetables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("POST", "/api/timetables/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setSelectedIds(new Set());
      alert(`선택한 ${data.count || "모든"}개 시간표가 삭제되었습니다.`);
    },
    onError: (err: any) => {
      alert(`일괄 삭제 실패: ${err?.message || "오류가 발생했습니다."}`);
    },
  });

  // Bulk visibility mutation
  const bulkVisibilityMutation = useMutation({
    mutationFn: async ({ ids, is_visible }: { ids: number[]; is_visible: boolean }) => {
      await apiRequest("PATCH", "/api/timetables/bulk-visibility", { ids, is_visible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setSelectedIds(new Set());
    },
  });

  // Single visibility toggle mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, is_visible }: { id: number; is_visible: boolean }) => {
      await apiRequest("PATCH", "/api/timetables/bulk-visibility", { ids: [id], is_visible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  // Inline edit handlers
  const startInlineEdit = (tt: Timetable) => {
    setInlineEditId(tt.id);
    setInlineForm({
      category: tt.category || "고등관-고1",
      subject: tt.subject || "수학",
      target_school: tt.target_school || "",
      class_name: tt.class_name || "",
      teacher_name: tt.teacher_name || "",
      class_time: tt.class_time || "",
      start_date: tt.start_date || "",
      is_visible: tt.is_visible ?? true,
      is_union: tt.is_union ?? false,
    });
  };

  const saveInlineEdit = async (id: number) => {
    if (!inlineForm.class_name.trim()) {
      alert("강좌명(제목)은 필수 입력 사항입니다.");
      return;
    }
    setInlineSaving(true);
    try {
      const formData = new FormData();
      formData.append("category", inlineForm.category);
      formData.append("subject", inlineForm.subject);
      formData.append("target_school", inlineForm.target_school);
      formData.append("class_name", inlineForm.class_name);
      formData.append("teacher_name", inlineForm.teacher_name);
      formData.append("class_time", inlineForm.class_time);
      formData.append("start_date", inlineForm.start_date);
      formData.append("is_visible", String(inlineForm.is_visible));
      formData.append("is_union", String(inlineForm.is_union));

      const matchedTeacher = teachers.find((t) => t.name.trim() === inlineForm.teacher_name.trim());
      if (matchedTeacher) {
        formData.append("teacher_id", String(matchedTeacher.id));
      }

      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (adminToken) headers["X-Admin-Token"] = adminToken;

      const res = await fetch(`/api/timetables/${id}`, {
        method: "PUT",
        body: formData,
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "수정 중 오류가 발생했습니다.");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      setInlineEditId(null);
    } catch (err: any) {
      alert(`수정 실패: ${err.message}`);
    } finally {
      setInlineSaving(false);
    }
  };

  // Filters calculation
  const categoryFiltered = filterCategory === "all"
    ? timetables
    : timetables.filter((t) => t.category.includes(filterCategory));

  const schoolFiltered = filterSchool === "all"
    ? categoryFiltered
    : categoryFiltered.filter((t) => (t.target_school || "").includes(filterSchool));

  const filteredTimetables = schoolFiltered.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (t.class_name || "").toLowerCase().includes(q) ||
      (t.teacher_name || "").toLowerCase().includes(q) ||
      (t.target_school || "").toLowerCase().includes(q) ||
      (t.subject || "").toLowerCase().includes(q)
    );
  });

  const actualSchools = Array.from(
    new Set(categoryFiltered.map((t) => t.target_school).filter(Boolean))
  ).sort();

  // Multi-select handlers
  const isAllSelected =
    filteredTimetables.length > 0 &&
    filteredTimetables.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTimetables.map((t) => t.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Excel import (Unified & Legacy)
  const importVerticalUnified = async (
    sheets: { name: string; aoa: any[][] }[],
    fileName: string
  ) => {
    const existingKeys = new Set<string>();
    try {
      const gr = await fetch("/api/summer-guidelines");
      if (gr.ok) {
        const gs = await gr.json();
        for (const g of gs || []) existingKeys.add(`${g.division} ${(g.title || "").trim()}`);
      }
    } catch { /* ignore */ }

    const existingTtKeys = new Set<string>();
    const ttKey = (cat: string, name: string, teacher: string, start: string) =>
      `${cat}|${name.trim()}|${teacher.trim()}|${start.trim()}`;
    try {
      const tr = await fetch("/api/timetables");
      if (tr.ok) {
        const ts = await tr.json();
        for (const t of ts || [])
          existingTtKeys.add(ttKey(t.category || "", t.class_name || "", t.teacher_name || "", t.start_date || ""));
      }
    } catch { /* ignore */ }

    let ttCount = 0, ttSkip = 0, brCount = 0, brSkip = 0, failed = 0;
    for (const s of sheets) {
      const p = parseVerticalSheet(s.aoa, s.name);
      if (!p || !p.className) continue;

      const { division, category } = mapTargetToDivision(p.target, fileName);
      const subject = detectSubject(`${p.className} ${s.name}`);
      const cleanedTeacher = cleanTeacherName(p.teacherName);
      const matchedTeacher = teachers.find((t) => t.name.trim() === cleanedTeacher);
      const classTitle = formatClassTitle({
        target: p.target,
        className: p.className,
        teacherName: p.teacherName,
        startDate: p.startDate,
        subject,
        category,
      });

      const tKey = ttKey(category, classTitle, cleanedTeacher, p.startDate);
      if (existingTtKeys.has(tKey)) {
        ttSkip++;
      } else {
        try {
          await apiRequest("POST", "/api/timetables", {
            category,
            subject,
            target_school: normalizeSchool(p.target),
            class_name: classTitle,
            teacher_name: cleanedTeacher,
            teacher_id: matchedTeacher ? matchedTeacher.id : undefined,
            class_time: p.schedule,
            start_date: p.startDate,
            description: "",
            is_union: false,
            is_visible: true,
          });
          ttCount++;
          existingTtKeys.add(tKey);
        } catch { failed++; }
      }

      const key = `${division} ${p.title.trim()}`;
      if (existingKeys.has(key)) {
        brSkip++;
      } else {
        try {
          await apiRequest("POST", "/api/summer-guidelines", {
            division,
            title: p.title,
            category: "curriculum",
            content: p.content,
          });
          brCount++;
          existingKeys.add(key);
        } catch { failed++; }
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
    alert(
      `통합 업로드 완료!\n\n` +
        `· 시간표 ${ttCount}개 등록${ttSkip ? `, ${ttSkip}개는 이미 존재하여 건너뜀` : ""}\n` +
        `· 브로셔 ${brCount}개 등록${brSkip ? `, ${brSkip}개는 이미 존재하여 건너뜀` : ""}` +
        (failed ? `\n· 실패 ${failed}건` : "")
    );
  };

  const handleTimetableExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`[${file.name}] 파일을 업로드하시겠습니까?\n(강사 세로형 원본 파일이면 시간표와 브로셔가 함께 자동 등록됩니다.)`)) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const verticalSheets = wb.SheetNames
          .filter((sn) => !sn.includes("예시") && !sn.includes("안내"))
          .map((sn) => ({ name: sn, aoa: XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sn], { header: 1 }) as any[][] }))
          .filter((s) => s.aoa && s.aoa.length > 0 && isVerticalSheet(s.aoa));

        if (verticalSheets.length > 0) {
          await importVerticalUnified(verticalSheets, file.name);
          return;
        }

        const sheetName = wb.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetName], { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          alert("엑셀 파일에 데이터가 없습니다.");
          return;
        }

        const normKey = (s: string) => String(s).replace(/\s+/g, "");
        const detectedHeaders = Object.keys(rawRows[0] || {});
        const rows = rawRows.map((r: any) => {
          const o: Record<string, any> = {};
          for (const k of Object.keys(r)) o[normKey(k)] = r[k];
          return o;
        });

        let count = 0;
        let skipped = 0;
        for (const row of rows) {
          const category = String(row["구분"] || row["카테고리"] || "고등관").trim();
          let subject = String(row["과목"] || "").trim();
          const target_school = String(row["대상학교"] || row["학교"] || "").trim();
          const class_name = String(
            row["수업명"] || row["강좌명"] || row["강좌"] || row["반명"] || row["클래스명"] || row["제목"] || ""
          ).trim();

          if (!subject && class_name) {
            if (/수학|공통수학|미적분|확률|확통/.test(class_name)) subject = "수학";
            else if (/국어|국비/.test(class_name)) subject = "국어";
            else if (/영어/.test(class_name)) subject = "영어";
            else if (/화학|물리|생물|지구|통과|과학/.test(class_name)) subject = "과학";
            else subject = "수학";
          }
          const teacher_name = String(row["강사명"] || row["선생님"] || "").trim();
          const class_time = String(row["수업시간"] || row["시간"] || "").trim();
          const start_date = String(row["개강일"] || row["개강"] || "").trim();
          const description = String(row["수업설명"] || row["설명"] || "").trim();
          const is_union_raw = String(row["연합반여부(Y/N)"] || row["연합반"] || "").trim().toUpperCase();
          const is_union = is_union_raw === "Y" || is_union_raw === "TRUE" || is_union_raw === "예";
          const is_visible_raw = String(row["노출여부(Y/N)"] || row["노출"] || "").trim().toUpperCase();
          const is_visible = is_visible_raw === "" || is_visible_raw === "Y" || is_visible_raw === "TRUE" || is_visible_raw === "예";

          if (!class_name) { skipped++; continue; }

          const matchedTeacher = teachers.find((t) => t.name.trim() === teacher_name);

          const body = {
            category,
            subject,
            target_school,
            class_name,
            teacher_name,
            teacher_id: matchedTeacher ? matchedTeacher.id : undefined,
            class_time,
            start_date,
            description,
            is_union,
            is_visible,
          };

          const res = await apiRequest("POST", "/api/timetables", body);
          if (res.ok) count++;
          else skipped++;
        }

        queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
        if (count === 0) {
          alert(
            `등록된 시간표가 없습니다. 엑셀에서 '수업명' 열을 찾지 못했습니다.\n\n` +
              `감지된 열 제목: ${detectedHeaders.join(", ") || "(없음)"}\n\n` +
              `[양식 다운로드] 파일의 열 제목(구분, 대상학교, 과목, 강사명, 수업명, 수업시간, 개강일, 연합반여부(Y/N), 노출여부(Y/N))과 일치하는지 확인해 주세요.`
          );
        } else if (skipped > 0) {
          alert(`총 ${count}개 등록 완료. ${skipped}개 행은 '수업명'이 비어 있어 건너뛰었습니다.`);
        } else {
          alert(`총 ${count}개의 시간표가 성공적으로 등록되었습니다.`);
        }
      } catch (err: any) {
        console.error(err);
        alert(`엑셀 등록 중 오류가 발생했습니다: ${err?.message || "양식을 확인해 주세요."}`);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleTimetableExcelDownload = () => {
    const wsData = [
      ["구분", "대상학교", "과목", "강사명", "수업명", "수업시간", "개강일", "연합반여부(Y/N)", "노출여부(Y/N)"],
      ["고등관-고1", "화성고1", "수학", "김이강", "수학I 내신대비", "토 18:30-22:00", "7/15(토)", "N", "Y"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "시간표양식");
    XLSX.writeFile(wb, `시간표_일괄등록양식.xlsx`);
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* 1. Excel Banner */}
      <div className="flex flex-col sm:flex-row gap-4 bg-emerald-50/70 p-4 border border-emerald-200 rounded-xl justify-between items-center shadow-sm">
        <div>
          <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-600" />
            엑셀로 정규 시간표 & 브로셔 일괄 등록
          </h4>
          <p className="text-xs text-emerald-700 mt-1">
            강사 원본 시트(세로형) 또는 양식 엑셀을 업로드하면 시간표와 브로셔(상세설명)가 한번에 등록됩니다.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
          <button
            onClick={handleTimetableExcelDownload}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg hover:bg-emerald-100 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            양식 다운로드
          </button>
          <label className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-2xs">
            <Upload className="w-3.5 h-3.5" />
            엑셀 파일 업로드
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleTimetableExcelUpload} />
          </label>
        </div>
      </div>

      {/* 2. Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            정규 시간표 관리
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
              총 {filteredTimetables.length}개
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            행에서 [빠른 수정]으로 수업명/시간/개강일을 즉시 변경하거나, [상세 수정]에서 브로셔 이미지를 첨부할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowPhotoManager(true)}
            className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-gray-500" />
            강사 시간표 전용 사진 관리
          </button>
          <button
            onClick={() => {
              setEditingTimetable(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            시간표 직접 추가
          </button>
        </div>
      </div>

      {/* 3. Bulk Action Bar (when selected) */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-red-50 border-2 border-red-200 p-4 rounded-xl shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-sm font-bold text-red-900">
            <CheckSquare className="w-5 h-5 text-red-600" />
            <span>총 {selectedIds.size}개 시간표가 선택되었습니다.</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={() =>
                bulkVisibilityMutation.mutate({ ids: Array.from(selectedIds), is_visible: true })
              }
              disabled={bulkVisibilityMutation.isPending}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              일괄 노출
            </button>
            <button
              onClick={() =>
                bulkVisibilityMutation.mutate({ ids: Array.from(selectedIds), is_visible: false })
              }
              disabled={bulkVisibilityMutation.isPending}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-gray-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
            >
              <EyeOff className="w-3.5 h-3.5" />
              일괄 숨김
            </button>
            <button
              onClick={() => {
                if (confirm(`선택한 ${selectedIds.size}개의 시간표를 정말로 삭제하시겠습니까?\n삭제된 시간표는 복구할 수 없습니다.`)) {
                  bulkDeleteMutation.mutate(Array.from(selectedIds));
                }
              }}
              disabled={bulkDeleteMutation.isPending}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition shadow-2xs"
            >
              {bulkDeleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              선택 항목 삭제 ({selectedIds.size})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 underline"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* 4. Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
            >
              <option value="all">전체 관/카테고리</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
            >
              <option value="all">전체 학교</option>
              {actualSchools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="강좌명, 강사명, 과목 검색..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 5. Main Timetables Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-100/70 text-gray-600 border-b border-gray-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center">
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-red-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5 font-bold min-w-[120px]">카테고리 / 학교</th>
                <th className="px-4 py-3.5 font-bold min-w-[260px]">과목 / 강좌명(제목)</th>
                <th className="px-4 py-3.5 font-bold min-w-[120px]">강사명</th>
                <th className="px-4 py-3.5 font-bold min-w-[200px]">수업시간 / 개강일</th>
                <th className="px-4 py-3.5 font-bold text-center">브로셔</th>
                <th className="px-4 py-3.5 font-bold text-center">노출 상태</th>
                <th className="px-4 py-3.5 font-bold text-right min-w-[140px]">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTimetables.map((tt) => {
                const isSelected = selectedIds.has(tt.id);
                const isInlineEditing = inlineEditId === tt.id;

                if (isInlineEditing) {
                  // Inline Editing Row
                  return (
                    <tr key={tt.id} className="bg-amber-50/70 border-2 border-amber-300">
                      <td className="px-4 py-3 text-center">
                        <Zap className="w-4 h-4 text-amber-600 mx-auto animate-bounce" />
                      </td>

                      {/* Category & School */}
                      <td className="px-4 py-3 space-y-1">
                        <select
                          value={inlineForm.category}
                          onChange={(e) => setInlineForm({ ...inlineForm, category: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-semibold bg-white"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={inlineForm.target_school}
                          onChange={(e) => setInlineForm({ ...inlineForm, target_school: e.target.value })}
                          placeholder="학교 (예: 화성고1)"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                        />
                      </td>

                      {/* Subject & Class Name (Title) */}
                      <td className="px-4 py-3 space-y-1">
                        <div className="flex gap-1 items-center">
                          <select
                            value={inlineForm.subject}
                            onChange={(e) => setInlineForm({ ...inlineForm, subject: e.target.value })}
                            className="border border-gray-300 rounded px-1.5 py-1 text-xs font-bold bg-white"
                          >
                            {SUBJECT_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inlineForm.is_union}
                              onChange={(e) => setInlineForm({ ...inlineForm, is_union: e.target.checked })}
                              className="rounded border-gray-300 text-purple-600"
                            />
                            연합반
                          </label>
                        </div>
                        <input
                          type="text"
                          value={inlineForm.class_name}
                          onChange={(e) => setInlineForm({ ...inlineForm, class_name: e.target.value })}
                          placeholder="강좌명 / 제목 입력..."
                          className="w-full border-2 border-amber-400 rounded px-2.5 py-1 text-xs font-bold bg-white text-gray-900 shadow-xs"
                        />
                      </td>

                      {/* Teacher Name */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inlineForm.teacher_name}
                          onChange={(e) => setInlineForm({ ...inlineForm, teacher_name: e.target.value })}
                          placeholder="강사명"
                          list="teacher-suggestions"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white font-semibold"
                        />
                      </td>

                      {/* Class Time & Start Date */}
                      <td className="px-4 py-3 space-y-1">
                        <input
                          type="text"
                          value={inlineForm.class_time}
                          onChange={(e) => setInlineForm({ ...inlineForm, class_time: e.target.value })}
                          placeholder="수업시간 (예: 토 18:30-22:00)"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white font-semibold"
                        />
                        <input
                          type="text"
                          value={inlineForm.start_date}
                          onChange={(e) => setInlineForm({ ...inlineForm, start_date: e.target.value })}
                          placeholder="개강일 (예: 7/15(토))"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white font-bold text-red-600"
                        />
                      </td>

                      {/* Brochure Status (Read Only in Inline Mode) */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] text-gray-400">모달에서 수정</span>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setInlineForm({ ...inlineForm, is_visible: !inlineForm.is_visible })}
                          className={`px-2 py-1 rounded text-xs font-bold border ${
                            inlineForm.is_visible
                              ? "bg-green-100 text-green-800 border-green-300"
                              : "bg-gray-200 text-gray-700 border-gray-300"
                          }`}
                        >
                          {inlineForm.is_visible ? "노출중" : "숨김"}
                        </button>
                      </td>

                      {/* Save & Cancel */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => saveInlineEdit(tt.id)}
                            disabled={inlineSaving}
                            className="flex items-center gap-1 bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 shadow-xs disabled:opacity-50 transition"
                          >
                            {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            저장
                          </button>
                          <button
                            onClick={() => setInlineEditId(null)}
                            className="bg-gray-200 text-gray-700 font-bold px-2.5 py-1.5 rounded-lg text-xs hover:bg-gray-300 transition"
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Normal Row
                return (
                  <tr
                    key={tt.id}
                    className={`transition-colors ${
                      isSelected ? "bg-red-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleSelect(tt.id)} className="flex items-center justify-center">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{tt.category}</div>
                      <div className="text-gray-500 text-[11px] mt-0.5 font-medium">
                        {tt.target_school ? (
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                            {tt.target_school}
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 max-w-[280px]">
                      <div className="flex items-center gap-1.5">
                        {tt.subject && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0">
                            {tt.subject}
                          </span>
                        )}
                        {tt.is_union && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0">
                            연합반
                          </span>
                        )}
                        <span className="font-bold text-gray-900 truncate" title={tt.class_name}>
                          {tt.class_name}
                        </span>
                      </div>
                      {tt.description && (
                        <p className="text-[11px] text-gray-400 mt-1 truncate" title={tt.description}>
                          {tt.description}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tt.teacher_image_url ? (
                          <img
                            src={tt.teacher_image_url}
                            alt={tt.teacher_name}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-[10px] flex-shrink-0">
                            {tt.teacher_name ? tt.teacher_name.charAt(0) : "강"}
                          </div>
                        )}
                        <span className="font-semibold text-gray-800">
                          {tt.teacher_name || "미지정"}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-gray-900 font-semibold">{tt.class_time || "-"}</div>
                      <div className="text-red-600 font-bold text-[11px] mt-0.5">
                        {tt.start_date ? `개강: ${tt.start_date}` : ""}
                      </div>
                    </td>

                    {/* Brochure Detail Image column */}
                    <td className="px-4 py-3 text-center">
                      {tt.detail_image_url ? (
                        <button
                          onClick={() => setPreviewImageUrl(tt.detail_image_url!)}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 font-bold text-[11px] transition"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          브로셔 보기
                        </button>
                      ) : (
                        <span className="text-gray-300 text-[11px]">미등록</span>
                      )}
                    </td>

                    {/* Visibility status */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          toggleVisibilityMutation.mutate({ id: tt.id, is_visible: !tt.is_visible })
                        }
                        title="클릭하여 노출 여부 변경"
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${
                          tt.is_visible
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200"
                        }`}
                      >
                        {tt.is_visible ? (
                          <>
                            <Eye className="w-3 h-3 text-green-600" /> 노출중
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-gray-400" /> 숨김
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startInlineEdit(tt)}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition"
                          title="테이블 행에서 즉시 수정 (제목, 시간, 개강일 등)"
                        >
                          <Zap className="w-3 h-3 text-amber-600" />
                          빠른 수정
                        </button>

                        <button
                          onClick={() => setEditingTimetable(tt)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition"
                          title="상세 정보 및 브로셔 이미지 관리"
                        >
                          <Edit2 className="w-3 h-3" />
                          상세
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`'${tt.class_name}' 시간표를 정말 삭제하시겠습니까?`)) {
                              deleteMutation.mutate(tt.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="시간표 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTimetables.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                      <p className="font-semibold text-sm">조건에 맞는 시간표가 없습니다.</p>
                      <p className="text-xs text-gray-400">
                        상단에서 검색어를 바꾸거나 [시간표 직접 추가] / [엑셀 업로드]를 진행해 주세요.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Add / Edit Modal */}
      {(editingTimetable || isAddModalOpen) && (
        <TimetableModal
          timetable={editingTimetable}
          teachers={teachers}
          onClose={() => {
            setEditingTimetable(null);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* 7. Brochure Lightbox Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                상세 브로셔 이미지 미리보기
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
                  title="새 창에서 열기"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewImageUrl(null)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto p-4 flex justify-center bg-gray-100">
              <img src={previewImageUrl} alt="Brochure" className="max-w-full max-h-[75vh] object-contain rounded shadow-md" />
            </div>
          </div>
        </div>
      )}

      {/* 8. Teacher Timetable Photo Manager Modal */}
      {showPhotoManager && (
        <TeacherPhotoManagerModal
          teachers={teachers}
          timetablePhotos={timetablePhotos}
          onClose={() => setShowPhotoManager(false)}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* Timetable Add & Edit Full Modal                                           */
/* ========================================================================= */
function TimetableModal({
  timetable,
  teachers,
  onClose,
}: {
  timetable: Timetable | null;
  teachers: Teacher[];
  onClose: () => void;
}) {
  const isEdit = !!timetable;
  const teacherImageRef = useRef<HTMLInputElement>(null);
  const detailImageRef = useRef<HTMLInputElement>(null);

  const [teacherImagePreview, setTeacherImagePreview] = useState<string>(timetable?.teacher_image_url || "");
  const [detailImagePreview, setDetailImagePreview] = useState<string>(timetable?.detail_image_url || "");
  const [deleteDetailImage, setDeleteDetailImage] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: timetable || {
      category: "고등관-고1",
      subject: "수학",
      target_school: "",
      class_name: "",
      teacher_name: "",
      class_time: "",
      start_date: "",
      description: "",
      is_visible: true,
      is_union: false,
    },
  });

  // CRITICAL FIX: Reset form values whenever selected timetable prop changes!
  useEffect(() => {
    if (timetable) {
      reset({
        category: timetable.category || "고등관-고1",
        subject: timetable.subject || "수학",
        target_school: timetable.target_school || "",
        class_name: timetable.class_name || "",
        teacher_name: timetable.teacher_name || "",
        class_time: timetable.class_time || "",
        start_date: timetable.start_date || "",
        description: timetable.description || "",
        is_visible: timetable.is_visible ?? true,
        is_union: timetable.is_union ?? false,
      });
      setTeacherImagePreview(timetable.teacher_image_url || "");
      setDetailImagePreview(timetable.detail_image_url || "");
      setDeleteDetailImage(false);
    } else {
      reset({
        category: "고등관-고1",
        subject: "수학",
        target_school: "",
        class_name: "",
        teacher_name: "",
        class_time: "",
        start_date: "",
        description: "",
        is_visible: true,
        is_union: false,
      });
      setTeacherImagePreview("");
      setDetailImagePreview("");
      setDeleteDetailImage(false);
    }
  }, [timetable, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("category", data.category || "");
      formData.append("subject", data.subject || "");
      formData.append("target_school", data.target_school || "");
      formData.append("class_name", data.class_name || "");
      formData.append("teacher_name", data.teacher_name || "");
      formData.append("class_time", data.class_time || "");
      formData.append("start_date", data.start_date || "");
      formData.append("description", data.description || "");
      formData.append("is_visible", String(data.is_visible ?? true));
      formData.append("is_union", String(data.is_union ?? false));

      const matchedTeacher = teachers.find((t) => t.name.trim() === (data.teacher_name || "").trim());
      if (matchedTeacher) {
        formData.append("teacher_id", String(matchedTeacher.id));
      }

      if (teacherImageRef.current?.files?.[0]) {
        formData.append("teacher_image", teacherImageRef.current.files[0]);
      }

      if (detailImageRef.current?.files?.[0]) {
        formData.append("detail_image", detailImageRef.current.files[0]);
      } else if (deleteDetailImage) {
        formData.append("delete_detail_image", "true");
      }

      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (adminToken) headers["X-Admin-Token"] = adminToken;

      const url = isEdit ? `/api/timetables/${timetable.id}` : `/api/timetables`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "저장 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      onClose();
    },
    onError: (err: any) => {
      alert(`저장 중 오류 발생: ${err.message}`);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEdit ? `'${timetable.class_name}' 시간표 및 브로셔 수정` : "새 시간표 작성"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              강좌 제목, 수업시간, 개강일 및 브로셔(상세설명 이미지)를 입력하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <form
            id="timetable-edit-form"
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">카테고리(관) *</label>
                <select
                  {...register("category", { required: true })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">과목 *</label>
                <select
                  {...register("subject", { required: true })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                >
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">대상 학교</label>
                <input
                  {...register("target_school")}
                  placeholder="예: 화성고1, 세마고"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">강사명</label>
                <input
                  {...register("teacher_name")}
                  placeholder="예: 김이강"
                  list="teacher-suggestions"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <datalist id="teacher-suggestions">
                  {teachers.map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">강좌명 (수업 제목) *</label>
                <input
                  {...register("class_name", { required: true })}
                  placeholder="예: [수학] 수학I 내신대비반"
                  className="w-full border-2 border-red-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">수업 시간 *</label>
                <input
                  {...register("class_time")}
                  placeholder="예: 토 18:30-22:00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">개강일 *</label>
                <input
                  {...register("start_date")}
                  placeholder="예: 7/15(토)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">수업 특징/설명</label>
                <textarea
                  {...register("description")}
                  rows={2}
                  placeholder="강좌의 간단한 설명이나 커리큘럼 특징"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("is_visible")}
                  className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-gray-800">홈페이지에 노출하기</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("is_union")}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-gray-800">연합반 (학교 구분 없음)</span>
              </label>
            </div>

            {/* Images Upload Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              {/* Teacher/Course Image */}
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  강사/시간표 이미지
                </label>
                <input
                  ref={teacherImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = () => setTeacherImagePreview(r.result as string);
                      r.readAsDataURL(f);
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
                />
                {teacherImagePreview && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={teacherImagePreview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>

              {/* Brochure Detail Image */}
              <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/40">
                <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  상세 브로셔 이미지 (커리큘럼)
                </label>
                <input
                  ref={detailImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setDeleteDetailImage(false);
                      const r = new FileReader();
                      r.onload = () => setDetailImagePreview(r.result as string);
                      r.readAsDataURL(f);
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />

                {detailImagePreview && !deleteDetailImage ? (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={detailImagePreview}
                      alt="Brochure Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-emerald-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteDetailImage(true);
                        setDetailImagePreview("");
                        if (detailImageRef.current) detailImageRef.current.value = "";
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800 border border-red-200 px-2 py-1 rounded bg-white"
                    >
                      브로셔 삭제
                    </button>
                  </div>
                ) : (
                  deleteDetailImage && (
                    <p className="text-xs font-bold text-red-600 mt-1">
                      저장 시 기존 브로셔 이미지가 삭제됩니다.
                    </p>
                  )
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sticky bottom-0">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            취소
          </button>
          <button
            type="submit"
            form="timetable-edit-form"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "수정사항 저장" : "새 시간표 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* Teacher Custom Timetable Photo Manager Modal                              */
/* ========================================================================= */
function TeacherPhotoManagerModal({
  teachers,
  timetablePhotos,
  onClose,
}: {
  teachers: Teacher[];
  timetablePhotos: TimetablePhoto[];
  onClose: () => void;
}) {
  const photoFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ teacherId, teacherName, file }: { teacherId: number; teacherName: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("teacher_name", teacherName);
      const res = await fetch(`/api/teacher-timetable-photos/${teacherId}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("업로드 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-timetable-photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch(`/api/teacher-timetable-photos/${teacherId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error("삭제 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-timetable-photos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
    },
  });

  const photoMap = new Map(timetablePhotos.map((p) => [p.teacher_id, p.image_url]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-base font-bold text-gray-900">시간표 전용 강사 사진 관리</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              선생님 소개 페이지와 별도로 시간표에 표시될 전용 사진을 설정합니다.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {teachers.map((t) => {
            const customPhoto = photoMap.get(t.id);
            return (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <img
                    src={customPhoto || t.image_url || "/default-profile.png"}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-300"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">{t.name}</h4>
                    <p className="text-[11px] text-gray-500">
                      {customPhoto ? "시간표 전용 사진 등록됨" : "기본 프로필 사용 중"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs">
                    {uploadPhotoMutation.isPending ? "업로드..." : "사진 변경"}
                    <input
                      ref={(el) => { photoFileRefs.current[t.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          uploadPhotoMutation.mutate({ teacherId: t.id, teacherName: t.name, file: f });
                        }
                      }}
                    />
                  </label>

                  {customPhoto && (
                    <button
                      onClick={() => {
                        if (confirm(`${t.name} 선생님의 전용 사진을 삭제하시겠습니까?`)) {
                          deletePhotoMutation.mutate(t.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-800 p-1.5 border border-red-200 rounded-lg bg-white"
                      title="사진 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
