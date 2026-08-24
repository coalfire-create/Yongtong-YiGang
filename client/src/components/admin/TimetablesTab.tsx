import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Plus, Edit2, Trash2, Upload, Download, Loader2, Eye, EyeOff, X, Image } from "lucide-react";
import * as XLSX from "xlsx";

interface Teacher {
  id: number;
  name: string;
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
}

export function TimetablesTab() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);

  const { data: timetables = [], isLoading } = useQuery<Timetable[]>({
    queryKey: ["/api/timetables"],
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timetables/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/timetables"] }),
  });

  const categoryFiltered = filterCategory === "all"
    ? timetables
    : timetables.filter(t => t.category.includes(filterCategory));

  const schoolFiltered = filterSchool === "all"
    ? categoryFiltered
    : categoryFiltered.filter(t => (t.target_school || "").includes(filterSchool));

  const actualSchools = Array.from(new Set(categoryFiltered.map(t => t.target_school).filter(Boolean))).sort();

  const handleTimetableExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`[${file.name}] 엑셀 파일로 정규 시간표를 일괄 등록하시겠습니까?`)) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetName]);

        if (!rows || rows.length === 0) {
          alert("엑셀 파일에 데이터가 없습니다.");
          return;
        }

        let count = 0;
        for (const row of rows) {
          const category = String(row["구분"] || row["카테고리"] || "고등관").trim();
          let subject = String(row["과목"] || "").trim();
          const target_school = String(row["대상학교"] || row["학교"] || "").trim();
          const class_name = String(row["수업명"] || row["강좌명"] || row["제목"] || "").trim();

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

          if (!class_name) continue;

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
        }

        queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
        alert(`총 ${count}개의 시간표가 성공적으로 등록되었습니다.`);
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
      ["고등관", "화성고1", "수학", "김이강", "수학I 내신대비", "토 18:30-22:00", "7/15(토)", "N", "Y"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "시간표양식");
    XLSX.writeFile(wb, `시간표_일괄등록양식.xlsx`);
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      {/* 엑셀 업로드 배너 */}
      <div className="flex flex-col sm:flex-row gap-4 bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl justify-between items-center">
        <div>
          <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            엑셀로 정규 시간표 일괄 등록
          </h4>
          <p className="text-xs text-emerald-600 mt-1">양식을 다운로드하여 개강 과목 정보를 한 번에 업로드할 수 있습니다.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleTimetableExcelDownload}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg hover:bg-emerald-50 transition"
          >
            <Download className="w-4 h-4" />
            양식 다운로드
          </button>
          <label className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            엑셀 업로드
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleTimetableExcelUpload} />
          </label>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">정규 시간표 목록</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            <Plus className="w-4 h-4" />
            시간표 직접 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 bg-gray-50">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]"
          >
            <option value="all">전체 관</option>
            <option value="고등관">고등관</option>
            <option value="중등관">중등관</option>
            <option value="초등관">초등관</option>
          </select>
          <select 
            value={filterSchool} 
            onChange={(e) => setFilterSchool(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[150px]"
          >
            <option value="all">전체 학교</option>
            {actualSchools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">카테고리/학교</th>
                <th className="px-4 py-3 font-medium">강좌명</th>
                <th className="px-4 py-3 font-medium">강사</th>
                <th className="px-4 py-3 font-medium">시간/개강일</th>
                <th className="px-4 py-3 font-medium">연합/노출</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schoolFiltered.map(tt => (
                <tr key={tt.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{tt.category}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{tt.target_school || "-"}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{tt.class_name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">{tt.teacher_name || "미지정"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 text-xs font-medium">{tt.class_time}</div>
                    <div className="text-red-500 text-xs mt-0.5">{tt.start_date}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {tt.is_union && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">연합</span>}
                      {tt.is_visible ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">노출</span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 border border-gray-300">숨김</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingTimetable(tt)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`'${tt.class_name}' 시간표를 삭제하시겠습니까?`)) {
                            deleteMutation.mutate(tt.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {schoolFiltered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    등록된 시간표가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}

function TimetableModal({ timetable, teachers, onClose }: { timetable: Timetable | null, teachers: Teacher[], onClose: () => void }) {
  const isEdit = !!timetable;
  const { register, handleSubmit } = useForm({ 
    defaultValues: timetable || {
      category: "고등관",
      target_school: "",
      class_name: "",
      teacher_name: "",
      class_time: "",
      start_date: "",
      is_visible: true,
      is_union: false,
    }
  });
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, typeof data[key] === 'boolean' ? String(data[key]) : (data[key] || ""));
      });
      // Find matching teacher ID if name matches
      const matchedTeacher = teachers.find(t => t.name.trim() === data.teacher_name?.trim());
      if (matchedTeacher) {
        formData.append("teacher_id", String(matchedTeacher.id));
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
      if (!res.ok) throw new Error("요청 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetables"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">{isEdit ? "시간표 수정" : "시간표 추가"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="timetable-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">카테고리</label>
                <select {...register("category")} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white shadow-sm transition">
                  <option value="고등관">고등관</option>
                  <option value="중등관">중등관</option>
                  <option value="초등관">초등관</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">대상 학교</label>
                <input {...register("target_school")} placeholder="예: 화성고1" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">강좌명 *</label>
                <input {...register("class_name", { required: true })} placeholder="예: [수학] 수학I 내신대비반" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">강사명</label>
                <input {...register("teacher_name")} placeholder="예: 김이강" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">개강일</label>
                <input {...register("start_date")} placeholder="예: 7/15(토)" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">수업 시간</label>
                <input {...register("class_time")} placeholder="예: 토 18:30-22:00, 일 09:00-12:30" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition" />
              </div>
            </div>
            
            <div className="flex gap-6 mt-6 pt-5 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input type="checkbox" {...register("is_visible")} className="peer w-5 h-5 border-gray-300 rounded text-red-600 focus:ring-red-500 cursor-pointer" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">홈페이지에 노출하기</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input type="checkbox" {...register("is_union")} className="peer w-5 h-5 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">연합반 (학교 무관)</span>
              </label>
            </div>
          </form>
        </div>
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} type="button" className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition">취소</button>
          <button type="submit" form="timetable-form" disabled={mutation.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "수정사항 저장" : "새 시간표 추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
