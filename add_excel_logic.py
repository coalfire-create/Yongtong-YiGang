import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

# 1. Add XLSX import
if 'import * as XLSX from "xlsx"' not in content:
    content = content.replace('import { useQuery, useQueryClient } from "@tanstack/react-query";', 'import { useQuery, useQueryClient } from "@tanstack/react-query";\nimport * as XLSX from "xlsx";')

# 2. Add Excel handlers in SummerGuidelinesManager
s_start = "function SummerGuidelinesManager({ activeTab }: { activeTab: \"중등\" | \"고1\" | \"고2\" }) {"
s_end = "  const { data: guidelines = [], isLoading } = useQuery<SummerGuideline[]>({"

excel_logic = """
  const handleExcelDownload = () => {
    const wsData = [
      ["제목", "과목", "대상", "강사명", "수업일정", "강좌특징", "교재", "과제", "관리시스템", "회차별내용", "연계강좌"],
      ["예: 고1 수학 연합반 A반", "수학", "고1", "강현T", "월/수 18:00~22:00", "핵심 유형 마스터", "자체교재", "매회 모의고사", "질의응답 1:1 클리닉", "1회차 - 다항식연산\\n2회차 - 항등식", "고1 심화반"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "썸머커리큘럼양식");
    XLSX.writeFile(wb, "썸머커리큘럼_업로드양식.xlsx");
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`정말로 엑셀 파일 [${file.name}]의 데이터를 추가하시겠습니까?`)) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Read as array of arrays to handle headers easily
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (data.length <= 1) {
          alert("데이터가 없습니다.");
          return;
        }

        const headers = data[0];
        const rows = data.slice(1);
        let successCount = 0;

        for (const row of rows) {
          if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

          // Try to match headers or fallback to index
          const getVal = (name: string, fallbackIdx: number) => {
            const hIdx = headers.findIndex(h => h && h.toString().includes(name));
            const val = hIdx !== -1 ? row[hIdx] : row[fallbackIdx];
            return val ? val.toString().trim() : "";
          };

          const title = getVal("제목", 0);
          const subject = getVal("과목", 1);
          const target = getVal("대상", 2);
          const teacher = getVal("강사명", 3);
          
          const rawSchedule = getVal("수업일정", 4);
          const rawFeatures = getVal("강좌특징", 5);
          const rawMaterials = getVal("교재", 6);
          const rawTasks = getVal("과제", 7);
          const rawManagement = getVal("관리시스템", 8);
          const rawSessions = getVal("회차별내용", 9);
          const rawLinked = getVal("연계강좌", 10);

          // Convert to expected stringified content format
          let cRes = "";
          if (rawSchedule) cRes += `[수업 일정]\\n${rawSchedule}\\n\\n`;
          if (rawFeatures) cRes += `[강좌 특징]\\n${rawFeatures}\\n\\n`;
          if (rawMaterials) cRes += `[교재/제공자료]\\n${rawMaterials}\\n\\n`;
          if (rawTasks) cRes += `[과제/TEST]\\n${rawTasks}\\n\\n`;
          if (rawManagement) cRes += `[관리 SYSTEM 및 CLINIC]\\n${rawManagement}\\n\\n`;
          if (rawSessions) cRes += `[회차별 내용]\\n${rawSessions}\\n\\n`;
          if (rawLinked) cRes += `[연계 강좌]\\n${rawLinked}\\n`;
          
          const payload = {
            title,
            subject,
            target,
            teacher,
            content: cRes.trim()
          };

          const response = await fetch('/api/summer-guidelines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (response.ok) {
            successCount++;
          }
        }

        queryClient.invalidateQueries({ queryKey: ['/api/summer-guidelines'] });
        alert(`총 ${successCount}개의 커리큘럼이 성공적으로 추가되었습니다!`);
      } catch (err) {
        console.error(err);
        alert("엑셀 파일을 처리하는 도중 오류가 발생했습니다. 양식을 확인해주세요.");
      } finally {
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };
"""

content = content.replace(s_end, excel_logic + "\n" + s_end)

# 3. Add UI buttons
ui_start = """      <div className="flex justify-between items-center bg-gray-50 p-4 border border-gray-200 rounded-lg">
        <h4 className="font-bold text-gray-800">{activeTab} 커리큘럼 관리</h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}"""

ui_new = """      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 border border-gray-200 rounded-lg gap-3">
        <h4 className="font-bold text-gray-800">{activeTab} 커리큘럼 관리</h4>
        <div className="flex gap-2">
          <button
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
          <button
            onClick={() => setShowAddForm(!showAddForm)}"""

content = content.replace(ui_start, ui_new)

# Add Upload, Download to lucide-react imports if missing
if 'Download,' not in content and 'import { Download' not in content:
    content = content.replace('Plus, Trash2, Edit2, Check, X, AlertCircle', 'Plus, Trash2, Edit2, Check, X, AlertCircle, Download, Upload')
if 'Upload' not in content and 'import { Upload' not in content:
    content = content.replace('Download,', 'Download, Upload,')

with open('client/src/pages/admin.tsx', 'w') as f:
    f.write(content)

print("Added Excel logic to admin.tsx")

