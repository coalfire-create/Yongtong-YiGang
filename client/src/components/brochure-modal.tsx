import { X } from "lucide-react";

interface Guideline {
  id: number;
  title: string;
  content: string;
  division?: string;
}

const HEADER_RE = /^\s*\[([^\]]+)\]\s*$/;

// content를 [섹션] 단위로 파싱
function parseSections(content: string): { name: string; body: string }[] {
  const lines = (content || "").replace(/\r/g, "").split("\n");
  const out: { name: string; body: string[] }[] = [];
  let cur: { name: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(HEADER_RE);
    if (m) {
      cur = { name: m[1].trim(), body: [] };
      out.push(cur);
    } else if (cur) {
      cur.body.push(line);
    }
  }
  return out.map((s) => ({ name: s.name, body: s.body.join("\n").trim() }));
}

// 제목에서 [고1] 등 학년 태그 제거
function cleanTitle(t: string): string {
  return (t || "").replace(/\n/g, " ").trim();
}

export function BrochureModal({ guideline, onClose }: { guideline: Guideline; onClose: () => void }) {
  const sections = parseSections(guideline.content);
  const schedule = sections.find((s) => s.name === "수업 일정");
  const scheduleLine = schedule ? schedule.body.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "" : "";
  const rows = sections.filter((s) => s.name !== "수업 일정");

  // 과제/TEST 는 '과제'로 표기 (사이트 정책과 동일)
  const label = (name: string) => (name.replace(/\s+/g, "").includes("과제") ? "과제" : name);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="brochure-modal"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 break-keep">{cleanTitle(guideline.title)}</h3>
            {scheduleLine && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#7B2332]/30 bg-[#7B2332]/5 px-3 py-1 text-xs sm:text-sm font-bold text-[#7B2332]">
                <span>🕒</span>
                <span>{scheduleLine}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 flex-shrink-0" aria-label="닫기">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <table className="w-full text-[13px] sm:text-sm border-collapse border border-gray-300">
            <thead className="bg-[#f8f9fa] text-[#333] font-bold">
              <tr>
                <th className="py-2.5 px-3 border border-gray-300 w-[28%] text-center">구분</th>
                <th className="py-2.5 px-3 border border-gray-300 text-center">내용</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={i} className="bg-white align-top">
                  <td className="py-3 px-3 border border-gray-300 font-bold text-gray-800 text-center align-middle">
                    {label(s.name)}
                  </td>
                  <td className="py-3 px-4 border border-gray-300 text-gray-700 leading-relaxed whitespace-pre-line break-keep">
                    {s.body || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
