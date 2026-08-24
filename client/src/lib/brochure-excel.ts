// 브로셔/시간표 엑셀 파싱 공용 로직.
// - 관리자 [브로셔 관리]의 커리큘럼 업로드
// - 정규 시간표 탭의 통합 업로드(시간표 + 브로셔 동시 생성)
// 두 곳이 같은 세로형/가로형 파싱을 공유하도록 여기서 단일 소스로 관리한다.

export interface BrochureContentParts {
  schedule?: string;
  features?: string;
  materials?: string;
  tasks?: string;
  management?: string;
  sessions?: string;
  linked?: string;
}

// content 문자열(=[섹션] 블록)을 파츠로 분해 (관리자 편집폼용)
export function parseContent(contentStr: string): Required<BrochureContentParts> {
  const res = { schedule: "", features: "", materials: "", tasks: "", management: "", sessions: "", linked: "" };
  if (!contentStr) return res;
  let currentCategory = "";
  for (const line of contentStr.split("\n")) {
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
}

// 파츠 → [섹션] 블록 content 문자열
export function stringifyContent(data: BrochureContentParts): string {
  let res = "";
  if (data.schedule?.trim()) res += `[수업 일정]\n${data.schedule.trim()}\n\n`;
  if (data.features?.trim()) res += `[강좌 특징]\n${data.features.trim()}\n\n`;
  if (data.materials?.trim()) res += `[교재/제공자료]\n${data.materials.trim()}\n\n`;
  if (data.tasks?.trim()) res += `[과제/TEST]\n${data.tasks.trim()}\n\n`;
  if (data.management?.trim()) res += `[관리 SYSTEM 및 CLINIC]\n${data.management.trim()}\n\n`;
  if (data.sessions?.trim()) res += `[회차별 내용]\n${data.sessions.trim()}\n\n`;
  if (data.linked?.trim()) res += `[연계 강좌]\n${data.linked.trim()}\n`;
  return res.trim();
}

export interface ParsedClassSheet {
  // 브로셔용
  title: string;
  category: "curriculum";
  content: string;
  // 시간표용 구조화 필드
  target: string;       // 대상 (→ 대상학교)
  className: string;    // 강좌명 (→ 수업명)
  teacherName: string;  // 강사명 (원본, 예: "김종인T")
  schedule: string;     // 수업 일정 (→ 수업시간)
  startDate: string;    // 개강일
  count: string;        // 회차
}

// 세로형(구분/내용, 시트 1개=강좌 1개) 시트인지 감지
export function isVerticalSheet(data: any[][]): boolean {
  return data.some((r) => /구분|수업\s*일정|강좌\s*특징/.test(r && r[0] != null ? r[0].toString() : ""));
}

// 세로형 시트 1개 → 강좌 1개 파싱 (브로셔 content + 시간표 구조화 필드)
export function parseVerticalSheet(data: any[][], sheetName: string): ParsedClassSheet | null {
  const cell = (r: any[] | undefined, i: number) => (r && r[i] != null ? r[i].toString().replace(/\r/g, "").trim() : "");
  const titleRaw = cell(data[0], 0);
  // 헤더("구분"이 있는 줄) 다음부터 데이터
  let start = data.findIndex((r) => /구분/.test(cell(r, 0)));
  start = start >= 0 ? start + 1 : 1;

  const sectionKey = (label: string): string | null => {
    if (/^대상/.test(label)) return "target";
    if (/강좌명/.test(label)) return "class_name";
    if (/강사명/.test(label)) return "teacher_name";
    if (/수업\s*일정/.test(label)) return "schedule";
    if (/^요일/.test(label)) return "schedule_days";
    if (/^시간/.test(label)) return "schedule_time";
    if (/시작\s*시간/.test(label)) return "schedule_time_start";
    if (/종료\s*시간/.test(label)) return "schedule_time_end";
    if (/개강일/.test(label)) return "schedule_date";
    if (/^회차$/.test(label) || /^수업\s*횟수$/.test(label)) return "schedule_count";
    if (/특징/.test(label)) return "features";
    if (/교재|자료/.test(label)) return "materials";
    if (/과제|TEST/i.test(label)) return "tasks";
    if (/관리|CLINIC|클리닉|SYSTEM/i.test(label)) return "management";
    if (/회차/.test(label)) return "sessions";
    if (/연계/.test(label)) return "linked";
    return null;
  };

  // 모든 섹션 키를 초기화(대상/강좌명/강사명 포함 — 누락 시 push 크래시 방지)
  const f: Record<string, string[]> = {
    target: [], class_name: [], teacher_name: [],
    schedule: [], schedule_days: [], schedule_time: [], schedule_time_start: [], schedule_time_end: [],
    schedule_date: [], schedule_count: [], features: [], materials: [], tasks: [], management: [], sessions: [], linked: [],
  };
  let cur: string | null = null;
  for (const row of data.slice(start)) {
    const a = cell(row, 0), b = cell(row, 1), c = cell(row, 2);
    if (a) cur = sectionKey(a);
    if (!cur || !(cur in f)) continue;
    if (cur === "management") {
      if (b || c) f.management.push(c ? `• ${b}: ${c}` : b);
    } else if (cur === "sessions") {
      if (b || c) f.sessions.push(`${b}${c ? ` - ${c}` : ""}`.trim());
    } else if (cur === "linked") {
      if (b || c) f.linked.push(`${b}${c ? ` - ${c}` : ""}`.trim());
    } else {
      const v = c || b;
      if (v) f[cur].push(v);
    }
  }

  // 수업 일정: 명시 값 우선, 없으면 요일/시간/개강일/회차 조합
  let finalSchedule = f.schedule.join("\n");
  if (!finalSchedule && (f.schedule_days.length || f.schedule_time.length || f.schedule_time_start.length || f.schedule_time_end.length || f.schedule_date.length || f.schedule_count.length)) {
    const parts: string[] = [];
    if (f.schedule_days[0]) parts.push(f.schedule_days[0]);
    if (f.schedule_time[0]) {
      parts.push(f.schedule_time[0]);
    } else if (f.schedule_time_start[0] || f.schedule_time_end[0]) {
      parts.push(`${f.schedule_time_start[0] || ""}~${f.schedule_time_end[0] || ""}`);
    }
    finalSchedule = parts.join(" ").trim();
  }

  const content = stringifyContent({
    schedule: finalSchedule,
    features: f.features.join("\n"),
    materials: f.materials.join("\n"),
    tasks: f.tasks.join("\n"),
    management: f.management.join("\n"),
    sessions: f.sessions.join("\n"),
    linked: f.linked.join("\n"),
  });
  if (!content) return null; // 내용 없으면 건너뜀

  const target = f.target[0] || "";
  const className = f.class_name[0] || "";
  const teacherName = f.teacher_name[0] || "";
  const startDate = f.schedule_date[0] || "";
  const count = f.schedule_count[0] || "";

  // 제목: [대상] 강좌명 - 강사명 (개강일 개강, 회차)
  let dynamicTitle = "";
  if (target || className || teacherName) {
    const tgt = target ? `[${target.replace(/[\[\]]/g, "")}]` : "";
    dynamicTitle = `${tgt} ${className}`.trim();
    if (teacherName) dynamicTitle += ` - ${teacherName}`;
    if (startDate || count) {
      const sub: string[] = [];
      if (startDate) sub.push(`${startDate} 개강`);
      if (count) sub.push(count);
      dynamicTitle += ` (${sub.join(", ")})`;
    }
  }
  const title = dynamicTitle || titleRaw.replace(/\s+/g, " ").trim() || sheetName.trim();

  return { title, category: "curriculum", content, target, className, teacherName, schedule: finalSchedule, startDate, count };
}

// 강좌명/시트명에서 과목 추정 (홍보문구가 아닌 제목 기반으로만 판별)
export function detectSubject(text: string): string {
  const t = String(text || "");
  if (/미적분|확률|확통|공통수학|기하|대수|수학/.test(t)) return "수학";
  if (/국어|문학|독서|화작|언매|국비/.test(t)) return "국어";
  if (/영어/.test(t)) return "영어";
  if (/화학|물리|생명|생물|지구|통과|통합과학|과학/.test(t)) return "과학";
  return "";
}

// 대상/파일명 힌트로 시간표 카테고리 + 브로셔 division 추정
export function mapTargetToDivision(target: string, fileNameHint = ""): { division: string; category: string } {
  const s = `${target || ""} ${fileNameHint || ""}`;
  if (/중\s*3|중등|초중/.test(s)) return { division: "중3", category: "중등관-중3" };
  if (/고\s*3/.test(s)) return { division: "고3", category: "고등관-고3" };
  if (/고\s*2/.test(s)) return { division: "고2", category: "고등관-고2" };
  if (/고\s*1/.test(s)) return { division: "고1", category: "고등관-고1" };
  return { division: "고1", category: "고등관-고1" };
}

// 강사명 정리: 끝의 "T", 앞의 과목명 제거 → DB 강사명과 매칭(teacher_id/사진 연동)
export function cleanTeacherName(name: string): string {
  return (name || "").replace(/\s*T$/, "").replace(/^(국어|영어|수학|과학)\s+/, "").trim();
}

// 대상학교 정규화: "화성고1", "고2-청명고반", "영신여고반" → "화성고","청명고","영신여고".
// (학년은 카테고리에 이미 담겨 있으므로 학교명만 남겨 기존 그룹과 합쳐지게 한다.)
// 학교명을 포함하지 않으면(예: "고1", "중3", "연합") 원본을 그대로 반환.
const CANONICAL_SCHOOLS = ["화성고", "가온고", "병점고", "영덕고", "수원고", "청명고", "고색고", "동국고", "동탄국제고", "영신여고"];
export function normalizeSchool(raw: string): string {
  const s = raw || "";
  return CANONICAL_SCHOOLS.find((sc) => s.includes(sc)) || s.trim();
}
