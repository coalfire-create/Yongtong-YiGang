import fs from 'fs';
const content = `[수업 일정]
화/목 18:00-22:00

[강좌 특징]
지금까지 공부한 수학내용과 전혀 다른 형태의 개념수업. 정확한 개념을 학생 스스로 설명할 수 있게 만들어 주는 학습법.

[교재/제공자료]
기본정석/RPM

[과제/TEST]
수준별 개별 테스트와 개별 과제 제공

[관리 SYSTEM 및 CLINIC]
• 과제 체크 : 과제 입력한 것을 바탕으로 오답 체크와 오답문항 재배부. 완벽하게 학습할때까지 과제 체크
• 테스트 : 과제내용과 전 수업시간에 배운것을 바탕으로 리뷰테스트 다음시간에 제공
• 클리닉 : 개별 FEEDBACK 클리닉 진행

[회차별 내용]
1회차 - 다항식연산
2회차 - 항등식과 나머지정리
3회차 - 인수분해, 복소수
4회차 - 이차방정식과 이차함수
5회차 - 이차함수와 그래프
6회차 - 여러가지 방정식
7회차 - 부등식
8회차 - 이차부등식, 경우의수
9회차 - 순열, 조합
10회차 - 행렬`;

// The formatSummerCurriculumTitle function extracted from summer.tsx
export function formatSummerCurriculumTitle(rawTitle, content, division) {
  if (!rawTitle) return "";
  let teacher = "";
  let subject = "";
  let course = "";
  
  let grade = division;
  if (!grade) {
    if (rawTitle.includes("고2")) grade = "고2";
    else if (rawTitle.includes("고1")) grade = "고1";
    else grade = "중등";
  }

  // Extract Teacher
  const tMatch = rawTitle.match(/([가-힣]+)[T\s]*$/) || rawTitle.match(/([가-힣]+)\s*T/);
  if (tMatch && tMatch[1].length >= 2 && tMatch[1].length <= 4) {
    teacher = tMatch[1] + "T";
  } else {
    teacher = "강사 미정";
  }

  // Extract Subject
  if (rawTitle.includes("수학") || rawTitle.includes("공수") || rawTitle.includes("대수") || rawTitle.includes("미적") || rawTitle.includes("확통")) {
    subject = "수학";
  } else if (rawTitle.includes("국어")) {
    subject = "국어";
  } else if (rawTitle.includes("영어")) {
    subject = "영어";
  } else if (rawTitle.includes("물리") || rawTitle.includes("화학") || rawTitle.includes("생명") || rawTitle.includes("지학") || rawTitle.includes("통과") || rawTitle.includes("과학")) {
    subject = "과학";
  }

  // Clean raw title to extract course name
  let cleanCourse = rawTitle;
  cleanCourse = cleanCourse.replace(/고[123]/g, '');
  cleanCourse = cleanCourse.replace(/중[123]/g, '');
  cleanCourse = cleanCourse.replace(new RegExp(tMatch ? tMatch[0] : "", 'g'), '');
  cleanCourse = cleanCourse.replace(/T/g, '');
  cleanCourse = cleanCourse.replace(/수학|국어|영어|과학/g, '');
  cleanCourse = cleanCourse.replace(/\[.*\]/g, ''); // remove anything in brackets just in case
  cleanCourse = cleanCourse.replace(/[-_:]/g, ''); // remove separators
  course = cleanCourse.trim();

  // sessions and startDate parsing omitted for brevity, just return basic
  return `[${grade}] ${subject} ${course} - ${teacher}`;
}

console.log(formatSummerCurriculumTitle("고1 수학 연합반 A반 - 강현T", content, "고1"));
