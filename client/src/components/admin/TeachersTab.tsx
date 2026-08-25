import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { Trash2, Upload, Download, Loader2, Users, Pencil, Check, X, Plus, Image as ImageIcon } from "lucide-react";
import * as XLSX from "xlsx";

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

interface TeacherImageItem {
  id: number;
  teacher_id: number;
  image_url: string;
  display_order: number;
}

export function TeachersTab() {
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [editBioText, setEditBioText] = useState("");

  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const filteredTeachers = filterDivision === "all"
    ? teachers
    : teachers.filter(t => t.division === filterDivision);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/teachers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/teachers"] }),
  });

  const bioMutation = useMutation({
    mutationFn: async ({ id, bio }: { id: number; bio: string }) => {
      await apiRequest("PATCH", `/api/teachers/${id}`, { bio });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      setEditingTeacherId(null);
    },
  });

  const photoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      const res = await fetch(`/api/teachers/${id}/photo`, { method: "PATCH", body: formData, headers, credentials: "include" });
      if (!res.ok) throw new Error("업로드 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
    }
  });

  const handleTeacherExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`[${file.name}] 엑셀 파일로 선생님 목록을 일괄 등록하시겠습니까?`)) {
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
          const name = String(row["이름"] || row["성명"] || "").trim();
          const division = String(row["소속"] || row["소속구분"] || "고등관").trim();
          const subject = String(row["과목"] || "").trim();
          const description = String(row["한줄소개"] || row["약력"] || row["소개"] || "").trim();

          if (!name || !subject || !description) continue;

          const formData = new FormData();
          formData.append("name", name);
          formData.append("division", division);
          formData.append("subject", subject);
          formData.append("description", description);

          const adminToken = localStorage.getItem("adminToken");
          const headers: Record<string, string> = {};
          if (adminToken) headers["X-Admin-Token"] = adminToken;

          const res = await fetch("/api/teachers", {
            method: "POST",
            body: formData,
            headers,
            credentials: "include",
          });
          if (res.ok) count++;
        }

        queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
        alert(`총 ${count}명의 선생님이 등록되었습니다.`);
      } catch (err: any) {
        console.error(err);
        alert(`오류가 발생했습니다: ${err?.message}`);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleTeacherExcelDownload = () => {
    const wsData = [
      ["이름", "소속", "과목", "한줄소개"],
      ["김이강", "고등관", "수학", "명쾌하고 완벽한 수학 개념 정리\n대성마이맥 출강"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "선생님목록");
    XLSX.writeFile(wb, `선생님_일괄등록양식.xlsx`);
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      {/* 엑셀 업로드 배너 */}
      <div className="flex flex-col sm:flex-row gap-4 bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl justify-between items-center">
        <div>
          <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            엑셀로 강사진 일괄 등록
          </h4>
          <p className="text-xs text-emerald-600 mt-1">양식을 작성하여 여러 명의 강사 정보를 빠르게 업로드하세요.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleTeacherExcelDownload} className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg hover:bg-emerald-50 transition">
            <Download className="w-4 h-4" />
            양식 다운로드
          </button>
          <label className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            엑셀 업로드
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleTeacherExcelUpload} />
          </label>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">강사진 목록 ({filteredTeachers.length}명)</h2>
        <div className="flex items-center gap-3">
          <select 
            value={filterDivision} 
            onChange={(e) => setFilterDivision(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">전체 소속</option>
            <option value="고등관">고등관</option>
            <option value="초/중등관">초/중등관</option>
          </select>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
          >
            <Plus className="w-4 h-4" />
            강사 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map(teacher => (
          <div key={teacher.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition group flex flex-col justify-between">
            <div>
              <div className="flex gap-4 items-start">
                <label className="relative cursor-pointer flex-shrink-0 group/photo">
                  {teacher.image_url ? (
                    <img src={teacher.image_url} alt={teacher.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 group-hover/photo:opacity-80 transition" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border-2 border-dashed border-red-200 group-hover/photo:bg-red-100 transition">
                      <Users className="w-6 h-6 text-red-400" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition shadow-sm">
                    <Upload className="w-3 h-3 text-white" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) photoMutation.mutate({ id: teacher.id, file });
                    }} 
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{teacher.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="text-red-600 font-medium">{teacher.division}</span> · {teacher.subject}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm(`'${teacher.name}' 선생님을 삭제하시겠습니까?`)) {
                          deleteMutation.mutate(teacher.id);
                        }
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                {editingTeacherId === teacher.id ? (
                  <div className="space-y-2">
                    <textarea 
                      value={editBioText}
                      onChange={(e) => setEditBioText(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditingTeacherId(null)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">취소</button>
                      <button 
                        onClick={() => bioMutation.mutate({ id: teacher.id, bio: editBioText })}
                        disabled={bioMutation.isPending}
                        className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded flex items-center gap-1"
                      >
                        {bioMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group/bio">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-2">
                      {teacher.description || "약력이 등록되지 않았습니다."}
                    </p>
                    <button 
                      onClick={() => {
                        setEditingTeacherId(teacher.id);
                        setEditBioText(teacher.description || "");
                      }}
                      className="absolute top-0 right-0 p-1 bg-white border border-gray-200 rounded text-gray-400 hover:text-blue-600 shadow-sm opacity-0 group-hover/bio:opacity-100 transition"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Teacher Brochure Images Manager */}
            <TeacherImagesManager teacherId={teacher.id} teacherName={teacher.name} />
          </div>
        ))}
      </div>

      {isAddModalOpen && <AddTeacherModal onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
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
        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-700 transition-colors"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        강사 브로셔 관리 ({images.length > 0 ? `${images.length}장` : expanded ? "접기" : "펼치기"})
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
            />
            {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-red-600" />}
          </div>

          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : images.length === 0 ? (
            <p className="text-[11px] text-gray-400">등록된 브로셔 이미지가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded overflow-hidden border border-gray-200 bg-white">
                  <img src={img.image_url} alt="브로셔" className="w-full h-16 object-cover" />
                  <button
                    onClick={() => {
                      if (confirm("이 브로셔 이미지를 삭제하시겠습니까?")) deleteMutation.mutate(img.id);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
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

function AddTeacherModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit } = useForm();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("division", data.division);
      formData.append("subject", data.subject);
      formData.append("description", data.description);
      
      const file = fileRef.current?.files?.[0];
      if (file) formData.append("image", file);

      const adminToken = localStorage.getItem("adminToken");
      const headers: Record<string, string> = {};
      if (adminToken) headers["X-Admin-Token"] = adminToken;

      const res = await fetch("/api/teachers", {
        method: "POST",
        body: formData,
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error("등록 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="text-xl font-bold text-gray-900">새 강사 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <form id="add-teacher-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">이름 *</label>
              <input {...register("name", { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">소속 *</label>
                <select {...register("division", { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white">
                  <option value="고등관">고등관</option>
                  <option value="초/중등관">초/중등관</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">과목 *</label>
                <input {...register("subject", { required: true })} placeholder="예: 수학" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">약력 / 소개 *</label>
              <textarea {...register("description", { required: true })} rows={3} placeholder="줄바꿈으로 항목 구분" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition resize-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">프로필 사진</label>
              <input ref={fileRef} type="file" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 transition cursor-pointer" />
            </div>
          </form>
        </div>
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} type="button" className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition">취소</button>
          <button type="submit" form="add-teacher-form" disabled={mutation.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            등록하기
          </button>
        </div>
      </div>
    </div>
  );
}
