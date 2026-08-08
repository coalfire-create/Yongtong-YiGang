# 알아두면 좋은 것들 (실제로 겪은 함정)

작업하면서 실제로 부딪혔던 문제와 원인, 해결 방법을 정리했습니다. 비슷한 증상을 다시 만나면 여기부터 확인하세요.

## 1. 로컬 `.env`와 운영(Render) DB가 서로 다른 프로젝트였던 사례

로컬 개발용 `.env`의 `DATABASE_URL`이 가리키는 Supabase 프로젝트와, 실제 운영 사이트(Render)가 연결된 Supabase 프로젝트가 **서로 달랐던** 적이 있습니다. 그 상태로 로컬 `.env` 기준으로 DB를 수정했더니 실제 사이트에는 전혀 반영되지 않는 문제가 발생했습니다.

**교훈**: DB 데이터를 직접 고치기 전에, 지금 연결하려는 `DATABASE_URL`이 Render 대시보드에 있는 값과 같은지 반드시 확인하세요. (Supabase 프로젝트 참조값 = 연결 문자열의 `postgres.<project-ref>` 부분으로 구분 가능)

## 2. Supabase RLS(Row Level Security)가 전체 테이블에서 꺼져 있었던 사례

`public` 스키마의 29개 테이블 전부 RLS가 비활성화되어 있었고, `anon` 역할에 SELECT/INSERT/UPDATE/DELETE 권한이 부여되어 있었습니다. 즉 Supabase anon 키만 있으면 누구나 `phone_verifications`(인증코드), `members`, `reservations`, `session` 등을 직접 조회/수정/삭제할 수 있는 상태였습니다.

**조치 (2026-08-08 완료)**: 29개 테이블 전부 RLS를 활성화했습니다. 정책(policy)은 추가하지 않았으므로 anon/authenticated의 직접 접근은 차단되고, 앱이 실제로 쓰는 연결(`postgres` 계정의 DATABASE_URL, `service_role` 키)은 둘 다 RLS를 우회하는 권한이라 영향이 없습니다.

**교훈**: 새 테이블을 만들면 (`CREATE TABLE` 직후) 반드시 `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`를 같이 실행하세요. Supabase 대시보드 Table Editor로 테이블을 만들면 자동으로 물어보지만, 이 프로젝트처럼 서버 코드(`ensure*Table` 함수)로 `CREATE TABLE IF NOT EXISTS`를 실행하면 RLS가 기본으로 꺼진 채 만들어집니다.

## 3. "연합(공통)" 반은 원칙적으로 전체시간표 탭에서만 보임

`timetables.target_school`이 `공통`/`연합`/`연합반` 등으로 태그된 반(여러 학교 학생이 함께 듣는 연합 수업)은 **기본적으로 개별 학교 탭에서는 보이지 않고, 전체시간표 탭에서만** 보이도록 설계되어 있습니다.

과거에 "청명고" 한 곳만 예외적으로 연합반이 청명고 탭에서도 보이도록 `high-school.tsx`의 `buildFilterFn`에 하드코딩되어 있습니다. 이걸 "모든 학교에 다 보이게" 일반화하면 안 됩니다 — 실제로 그렇게 바꿨다가 되돌린 적이 있습니다. 특정 학교에서 특정 연합반이 안 보인다는 요청이 오면, 그 학교만 콕 집어 예외 처리하거나, 애초에 그 반이 그 학교 전용 반이 맞는지(공통이 아니라 학교명으로 따로 태그해야 하는 반은 아닌지) 먼저 확인하세요.

## 4. 시간표 카드 "브로셔" 버튼과 매칭 로직

시간표(`timetables`)와 커리큘럼(`summer_guidelines`, category=`curriculum`)은 **직접적인 외래키로 연결되어 있지 않고**, `timetable-gallery.tsx`의 `matchGuideline` 함수가 강사 이름과 학교/과목 키워드로 느슨하게(fuzzy) 매칭합니다.

- 브로셔가 안 뜨면: 십중팔구 `summer_guidelines`에 해당 강사·division의 커리큘럼 자체가 없는 경우입니다.
- 브로셔가 **엉뚱한** 강좌로 뜨면: 같은 강사의 여러 강좌 중 `class_time`이 커리큘럼 content의 `[수업 일정]`과 정확히 문자열 일치하지 않아서(예: 오타로 시간이 다르게 적힘) 잘못 매칭된 경우입니다. `content`의 `[수업 일정]` 줄이 실제 `timetables.class_time`과 정확히 같은 문자열인지 확인하세요.

## 5. 초/중등관 카테고리 관련

- `초/중등관`과 `중등관-중3`은 서로 다른 `category` 값이며 독립적인 데이터입니다. 과거에 "중3 관련 강좌를 초/중등관에서 숨기고 중3 탭에서만 보이게" 하려고 class_name 문자열(`"중3"`, `"대수"`, `"공통수학2"` 포함 여부)로 임시 필터링했던 적이 있는데, 이 방식은 관련 없는 강좌까지 잘못 숨기는 버그를 냈습니다. **학년/구분이 다른 강좌는 문자열 필터가 아니라 `timetables.category` 값 자체를 바꿔서 구분**하세요.
- "상세보기" 토글 기능은 완전히 제거되었습니다(2026-08-08). 관련 코드를 다시 추가하지 마세요.

## 6. 학교 로고

- `schools` 테이블은 서버 시작 시 `ensureSchoolsTable()`이 기본 학교 목록을 `INSERT ... ON CONFLICT (name) DO NOTHING`으로 채웁니다. **이미 존재하는 학교의 잘못된 로고 URL은 이 로직으로 고쳐지지 않습니다** (DO NOTHING이라 스킵됨). 로고가 깨진 학교가 있으면 직접 `UPDATE schools SET logo_url = ...`로 고쳐야 합니다.
- 새 학교를 추가할 때는 `server/routes.ts`의 `defaultSchools` 배열에도 추가해 두면, 다음에 DB가 리셋되거나 새 환경이 생겨도 자동으로 채워집니다.
