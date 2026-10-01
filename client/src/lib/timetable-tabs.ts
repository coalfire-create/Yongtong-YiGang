// 시간표 학교별/과목별 탭 분류 규칙 (공개 페이지 + 관리자 검증 공용 단일 소스)

export interface FilterTab {
  label: string;
  filterFn: (tt: any) => boolean;
  isSummary?: boolean;
}

export const isNonsul = (tt: any) =>
  (tt.class_name || "").includes("논술") ||
  (tt.subject || "").includes("논술") ||
  (tt.target_school || "") === "논술";

const SCIENCE_SUBJECTS = ["통합과학", "통과", "물리", "화학", "생명", "지구", "탐구", "생명과학", "지구과학", "물리학", "과학탐구", "과학"];

const isHighSchoolMath = (tt: any) => {
  if (tt.subject && tt.subject !== "수학" && tt.subject !== "수학/탐구") return false;
  const cn = (tt.class_name || "");
  return /공통수학|대수|미적분|기하|확통|블랙스타|수학1|수학2/.test(cn);
};

// 초/중등관 수학: 초등/중등 기초 과정과 고등 선행(공통수학·대수·미적분 등) 과정을 구분
const isElementaryMiddleMath = (tt: any) => {
  if (tt.subject && tt.subject !== "수학" && tt.subject !== "수학/탐구") return false;
  const cn = (tt.class_name || "");
  if (/1-1|1-2|2-1|2-2|3-1|3-2|초등|중1|중2|중3/.test(cn) && !/공통수학|미적분|기하|확통|블랙스타/.test(cn)) return true;
  return !isHighSchoolMath(tt);
};

const isSocialSubject = (tt: any) => /통합사회|통사|한국사/.test(`${tt.subject || ""} ${tt.class_name || ""}`);

export const isScienceSubject = (tt: any) => {
  const subj = (tt.subject || "").trim();
  const cn = (tt.class_name || "").trim();
  return SCIENCE_SUBJECTS.some(s => subj.includes(s) || cn.includes(s));
};

export function buildFilterFn(label: string): (tt: any) => boolean {
  if (label === "전체시간표" || label === "전체") return () => true;
  if (label.includes("커리큘럼")) return () => true;
  if (label === "썸머시간표" || label === "요약시간표" || label.includes("내신시간표") || label.includes("중간") || label.includes("파이널") || label.includes("수능")) return () => false;
  if (label === "논술") return (tt) => isNonsul(tt);
  if (label === "수학/탐구") {
    // 과목명이 "과학"/"물리"/"통합사회한국사"처럼 조금씩 달라도 빠지지 않게 과학·사회 계열 전부 포함
    return (tt) => !isNonsul(tt) && (tt.subject === "수학" || isScienceSubject(tt) || isSocialSubject(tt));
  }
  if (
    label === "초&중등 수학" ||
    label === "초중등 수학" ||
    label === "초/중등 수학" ||
    label === "중등 수학" ||
    label === "초등 수학" ||
    label.includes("초&중등") ||
    label.includes("초중등") ||
    label.includes("초/중등")
  ) {
    return (tt) => !isNonsul(tt) && isElementaryMiddleMath(tt);
  }
  if (label === "고등과정 수학") {
    return (tt) => !isNonsul(tt) && isHighSchoolMath(tt);
  }

  const SUBJECTS = ["국어", "영어", "수학", "탐구", "통합과학", "통합사회/한국사", "생명과학", "사회문화", "생윤"];
  if (SUBJECTS.includes(label)) {
    return (tt) => {
      if (isNonsul(tt)) return false;
      // 탐구 탭: 통합과학·물리·화학·생명·지구·과학 등 과학 과목 전부
      if (label === "탐구") return isScienceSubject(tt);
      if (label === "통합사회/한국사") {
        return (
          tt.subject === "통합사회/한국사" ||
          tt.subject === "통사/한국사" ||
          (tt.subject || "").includes("통사") ||
          (tt.subject || "").includes("한국사") ||
          (tt.class_name || "").includes("통합사회") ||
          (tt.class_name || "").includes("한국사")
        );
      }
      return (
        tt.subject === label ||
        (tt.target_school || "") === label ||
        (tt.subject || "").includes(label) ||
        (tt.class_name || "").includes(label)
      );
    };
  }

  return (tt) => {
    if (isNonsul(tt)) return false;

    if (label === "청명고" || label === "영덕고" || label === "영신여고") {
      const ts = tt.target_school || "";
      const isUnionSchool = ts === "공통" || ts === "연합" || ts === "연합반" || ts.startsWith("연합 (");
      if (isUnionSchool) return true;
    }

    // 타겟 학교나 클래스 이름에 해당 필터 탭 라벨이 포함되어 있으면 true 반환
    return (tt.target_school || "").includes(label) || (tt.class_name || "").includes(label);
  };
}

export function buildFilterTabs(apiTabs: { id: number; label: string }[], category?: string): FilterTab[] {
  return apiTabs.map((tab) => {
    let displayLabel = tab.label;
    if (tab.label === "기말/내신시간표" && (category === "고등관-고1" || category === "고등관-고2")) {
      displayLabel = "2학기 중간 내신시간표";
    }
    const isSummaryOnly =
      displayLabel === "썸머시간표" ||
      displayLabel === "요약시간표" ||
      displayLabel === "2학기 중간 내신시간표" ||
      displayLabel === "기말/내신시간표" ||
      displayLabel.includes("파이널") ||
      displayLabel.includes("수능");
    return {
      label: displayLabel,
      filterFn: buildFilterFn(tab.label),
      isSummary: isSummaryOnly,
    };
  });
}

// 탭 라벨이 실제 분류 탭인지 (전체/요약 탭 제외)
export function isClassifyingTab(label: string): boolean {
  if (label === "전체시간표" || label === "전체" || label.includes("커리큘럼")) return false;
  if (label === "썸머시간표" || label === "요약시간표" || label.includes("내신시간표") || label.includes("중간") || label.includes("파이널") || label.includes("수능")) return false;
  return true;
}

// 이 수업이 노출될 학교별/과목별 탭 목록. 비어 있으면 '전체'에만 보이는 상태.
export function matchingTabs(tt: any, tabLabels: string[]): string[] {
  return tabLabels.filter((l) => isClassifyingTab(l) && buildFilterFn(l)(tt));
}

// API에 탭 설정이 없을 때 각 페이지가 쓰는 기본 탭 (middle-school.tsx 등과 동일)
const DEFAULT_TAB_LABELS: Record<string, string[]> = {
  "중등관-중3": ["수학", "국어", "영어", "탐구"],
};

// 해당 카테고리 공개 페이지에 실제로 보이는 학교별/과목별 탭 라벨 (페이지별 숨김 규칙 반영)
export function classifyingTabsFor(category: string, allTabs: { label: string; category: string; is_visible?: boolean }[]): string[] {
  let labels = (allTabs || [])
    .filter((t) => t.category === category && t.is_visible !== false)
    .map((t) => t.label);
  if (category === "고등관-고1") labels = labels.filter((l) => l !== "동탄국제고");
  if (category === "고등관-고3") labels = labels.filter((l) => l !== "사회문화" && l !== "생윤");
  if (!labels.length) labels = DEFAULT_TAB_LABELS[category] || [];
  return labels.filter(isClassifyingTab);
}
