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

// 엑셀 시간 셀은 하루의 비율(0.75 = 18:00)로 읽힌다. 문자열 속 소수 시간을 HH:MM으로 복원.
// 예) "금 0.75~0.875" → "금 18:00~21:00"
export function fixExcelTimes(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s.replace(/(^|[^\d.])(0?\.\d+)(?![\d.])/g, (_m, pre: string, num: string) => {
    const mins = Math.round(parseFloat(num) * 24 * 60);
    const hh = String(Math.floor(mins / 60) % 24).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    return `${pre}${hh}:${mm}`;
  });
}

// content의 [수업 일정] 블록을 schedule로 교체(없으면 맨 앞에 추가).
// 시간표 수업시간을 브로셔에 동기화할 때 사용 — 나머지 섹션은 그대로 둔다.
export function setScheduleInContent(content: string, schedule: string): string {
  const sched = (schedule || "").trim();
  const lines = (content || "").replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let found = false;
  let skipping = false;
  for (const line of lines) {
    const m = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (m) {
      skipping = false;
      if (!found && m[1].replace(/\s+/g, "") === "수업일정") {
        found = true;
        skipping = true;
        if (sched) out.push("[수업 일정]", sched, "");
        continue;
      }
    }
    if (!skipping) out.push(line);
  }
  let res = out.join("\n");
  if (!found && sched) res = `[수업 일정]\n${sched}\n\n${res}`;
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
      let v = c || b;
      if (v && cur.startsWith("schedule") && cur !== "schedule_date" && cur !== "schedule_count") v = fixExcelTimes(v);
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

// 시간표 수업명 규칙: "{학교/학년} {과목} 내신[반-{코드}] - {강사}T ({개강일} 개강)".
// 예) 화성고 수학 내신반-S1 - 최주용T (8/16 개강)
//     화성고 영어 내신 - 대니얼T (8/21 개강)
//     영신여고 과학 내신 - 김종인T (학원 개강일과 동일)
export function formatClassTitle(params: {
  target: string;
  className: string;
  teacherName: string;
  startDate: string;
  subject: string;
  category: string;
}): string {
  const { target, className, teacherName, startDate, subject, category } = params;

  // 접두: 학교명이 있으면 학교명(학년 없이), 없으면 학년 토큰(고1/고2/중3)
  const school = CANONICAL_SCHOOLS.find((sc) => (target || "").includes(sc));
  const gradeTok = (category.match(/고1|고2|고3|중3/) || [])[0] || "";
  const prefix = school || gradeTok;

  // 과목: 수학/영어/국어는 일반명 그대로. 과학은 세부(통합과학/물리/화학/생명/지구)를
  // 살려 같은 페이지 동명 충돌(중복 방지에 걸려 누락)을 막는다.
  let subj = subject || "수학";
  if (subj === "과학") {
    const cn = className || "";
    if (/통합과학|통과/.test(cn)) subj = "통합과학";
    else if (/물리/.test(cn)) subj = "물리";
    else if (/화학/.test(cn)) subj = "화학";
    else if (/생명|생물/.test(cn)) subj = "생명";
    else if (/지구/.test(cn)) subj = "지구";
  }

  // 반 코드: S1/S2/A1/A2/의치서/M/S/A + "반" → "내신반-{코드}", 없으면 "내신"
  const code = ((className || "").match(/(의치서|S1|S2|A1|A2|M|S|A)\s*반/) || [])[1] || "";
  const naishin = code ? `내신반-${code}` : "내신";

  // 강사: 정리 후 항상 T 접미 (최주용 → 최주용T, 김종인T → 김종인T)
  const t = cleanTeacherName(teacherName);
  const teacherT = t ? `${t}T` : "";

  // 개강일: 요일 괄호 제거, 날짜면 "X 개강", 날짜 아닌 문구면 그대로
  const isDate = /\d{1,2}\s*[/.]\s*\d{1,2}/.test(startDate || "");
  const cleanedDate = (startDate || "").replace(/\s*\([가-힣]\)/g, "").replace(/\s*개강.*$/, "").trim();
  const datePart = isDate ? `${cleanedDate} 개강` : (startDate || "").replace(/\s*개강\s*$/, "").trim();

  const dash = teacherT ? ` - ${teacherT}` : "";
  const paren = datePart ? ` (${datePart})` : "";
  return `${prefix} ${subj} ${naishin}${dash}${paren}`.replace(/\s+/g, " ").trim();
}

// ── 브로셔(강사커리큘럼) 매칭 공용 로직 ──────────────────────
const _SCHOOL_ROOTS = ["화성", "가온", "병점", "영덕", "수원", "청명", "고색", "동탄"];

export function _gkeys(s: string): Set<string> {
  s = (s || "").toUpperCase();
  const k = new Set<string>();
  for (const r of _SCHOOL_ROOTS) if (s.includes(r)) k.add(r);
  if (/의치서|의치/.test(s)) k.add("의치");
  if (/대수.*미적|미적.*대수|대수미적/.test(s)) k.add("대수미적");
  else if (/대수\s*특강|대수특강/.test(s)) k.add("대수특강");
  if (/올데이|ALL\s?-?DAY/.test(s)) k.add("올데이");
  if (/기하/.test(s)) k.add("기하");
  if (/확통/.test(s)) k.add("확통");
  if (/역학/.test(s)) k.add("역학");
  if (/전범위|전과정/.test(s)) k.add("전범위");
  if (/집중/.test(s)) k.add("집중");
  if (/M반|의치서M/.test(s)) k.add("M");
  if (/S-?1/.test(s)) k.add("S1"); else if (/S-?2/.test(s)) k.add("S2");
  else if (/S반|연합\s*S/.test(s)) k.add("S");
  if (/A-?1|A1반/.test(s)) k.add("A1"); else if (/A-?2|A2반/.test(s)) k.add("A2");
  else if (/A반|연합\s*A/.test(s)) k.add("A");
  if (/연합/.test(s)) k.add("연합");
  if (/국어/.test(s)) k.add("국어"); if (/영어/.test(s)) k.add("영어");
  if (/물리|역학/.test(s)) k.add("물리"); if (/화학|물질과/.test(s)) k.add("화학");
  if (/생명|세포/.test(s)) k.add("생명"); if (/통과|통합과학/.test(s)) k.add("통과");
  if (/비평준/.test(s)) k.add("비평준");
  else if (/일반고|일반/.test(s)) k.add("일반고");
  if (s.includes("동국")) k.add("동탄");
  if (/수능|조기수능/.test(s)) k.add("수능");
  return k;
}

export function getDivisionFromCategory(category: string): string {
  const _divMap: Record<string, string> = {
    "고등관-고1": "고1",
    "고등관-고2": "고2",
    "고등관-고3": "고3",
    "중등관-중3": "중3",
    "초/중등관": "중3",
    "고등관": "고1",
  };
  return _divMap[category] || (category.match(/고1|고2|고3|중3/) || [])[0] || "고1";
}

// 공개 시간표와 동일한 기준으로, 해당 카테고리(학년)에 노출되는 브로셔만 추림.
// 관리자 화면도 이걸 써야 사이트에 실제로 뜨는 브로셔와 같은 것을 편집하게 된다.
export function guidelinesForCategory(guidelines: any[], category: string): any[] {
  const div = getDivisionFromCategory(category || "");
  return (guidelines || []).filter((g: any) => {
    if (g.category !== "curriculum") return false;
    const d = g.division || "";
    return d === div || d.includes(div);
  });
}

export function matchGuideline(
  tt: { teacher_name?: string; class_name?: string; class_time?: string; category?: string },
  guidelines: any[]
): any | null {
  const tn = (tt.teacher_name || "").match(/([가-힣]{2,4})T?/)?.[1] || "";
  if (!tn) return null;
  const cand = guidelines.filter((g) => {
    if (g.category && g.category !== "curriculum") return false;
    return (
      (g.title || "").includes(tn) ||
      (tn === "손자은" && (g.title || "").includes("손지은")) ||
      (tn === "손지은" && (g.title || "").includes("손자은"))
    );
  });
  if (!cand.length) return null;
  if (cand.length === 1) return cand[0];
  const tk = _gkeys(tt.class_name || "");
  const cleanName = (tt.class_name || "").replace(/\s*-\s*(초중등\s*모티브샘|[가-힣]{2,4}T?).*/, "").trim();
  let best: any = null,
    bs = -1;
  for (const g of cand) {
    const gk = _gkeys((g.title || "").replace(/^\[[^\]]*\]/, ""));
    let sc = 0;
    for (const x of tk) if (gk.has(x)) sc++;
    if (tt.class_time && g.content && g.content.includes(tt.class_time)) sc += 2;
    if (cleanName && g.title && g.title.includes(cleanName)) {
      sc += 10;
      if (g.title.includes(`] ${cleanName} -`) || g.title.includes(` ${cleanName} -`)) sc += 10;
    }
    if (sc > bs) {
      bs = sc;
      best = g;
    }
  }
  if (bs >= 1 && best) return best;
  return cand[0];
}

