# Yongtong-YiGang 프로젝트 매뉴얼

영통이강학원 웹사이트 및 관리자 시스템 구조, 운영, 유지보수 가이드

| 항목 | 내용 |
|---|---|
| 대상 저장소 | https://github.com/coalfire-create/Yongtong-YiGang |
| 기준 브랜치 | `main` |
| 최종 검수일 | 2026-08-08 |
| 문서 목적 | 신규 담당자가 프로젝트 구조, 실행, 운영 화면, API, DB, 주의사항을 빠르게 인계받기 위한 실무 매뉴얼 |

> 이 문서는 실제 코드(파일 존재 여부, API 엔드포인트, 환경변수, 설정값 등)와 대조 검수를 거쳤습니다.

## 1. 빠른 인계 요약

- 이 저장소는 학원 소개 사이트, 학년/과목별 시간표 게시, 입시 실적/후기 게시, 설명회/예약/문자수신 신청, 관리자 CMS를 하나의 Express + React 프로젝트로 묶은 풀스택 애플리케이션입니다.
- 운영 데이터는 PostgreSQL(Supabase)에 저장되고, 이미지는 Supabase Storage 및 정적 자산 폴더를 함께 사용합니다.
- 프론트엔드는 `client/src` 아래에 있으며, Wouter 라우팅과 TanStack Query를 사용합니다.
- 백엔드는 `server/index.ts`가 진입점이고 `server/routes.ts`에 대부분의 API와 테이블 보정 로직이 모여 있습니다.
- 관리자 화면은 `client/src/pages/admin.tsx`에 집중되어 있으며, 콘텐츠 CRUD와 정렬, 이미지 업로드 기능을 담당합니다.

## 2. 저장소 및 기술 스택

| 구분 | 내용 | 담당자가 확인할 것 |
|---|---|---|
| 저장소 | coalfire-create/Yongtong-YiGang | 권한 연결 상태 확인 |
| 브랜치 | main | 배포 기준 브랜치 |
| 프론트엔드 | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Wouter, TanStack Query | 라우팅은 `App.tsx`, 공통 레이아웃은 `layout.tsx` |
| 백엔드 | Node.js, Express 5, TypeScript | `server/index.ts`와 `server/routes.ts` 중심 |
| DB/스토리지 | PostgreSQL, Supabase, Drizzle 일부 | 실제 주요 테이블은 `routes.ts`에서 직접 SQL로 생성/보정 |
| 외부 연동 | Google Sheets Webhook, Supabase Storage | `GOOGLE_WEBHOOK_URL`, `SUPABASE_*` 환경변수 확인 |
| 배포 | Render (자동 배포: `main` push 시) | Render 대시보드 Environment 탭에서 실제 환경변수 확인 |

## 3. 전체 아키텍처

요청 흐름: 브라우저의 React 앱 → 내부 API(`/api/...`) → Express 서버 → PostgreSQL/Supabase 및 Google Sheets Webhook.

| 계층 | 주요 파일/폴더 | 역할 |
|---|---|---|
| 프론트 | `client/src/App.tsx` | 사이트 전체 라우팅 정의 |
| 프론트 | `client/src/pages/*.tsx` | 홈, 고등관, 중등관, 설명회, 입시, 관리자 등 화면 구현 |
| 프론트 | `client/src/components/*.tsx` | 레이아웃, 배너, 시간표 갤러리, 예약/문자 모달, UI 컴포넌트 |
| 백엔드 | `server/index.ts` | Express 앱 초기화, 세션, 정적 파일, Vite/production 서빙 |
| 백엔드 | `server/routes.ts` | API 라우트, DB 테이블 생성/보정, 이미지 업로드, 관리자 인증 |
| 백엔드 | `server/supabase.ts` | Supabase 클라이언트 및 로컬 DB fallback 래퍼 |
| 공용 | `shared/schema.ts` | Drizzle/Zod 기반 `users` 스키마. 실제 운영 테이블 대부분은 `routes.ts`에서 직접 SQL로 관리 |
| 자산 | `attached_assets`, `client/public` | 로고, 배너, 강사 이미지, 시설 사진, 시간표 이미지 등 |

## 4. 디렉터리 구조

| 경로 | 내용 | 인계 포인트 |
|---|---|---|
| `client/` | React/Vite 프론트엔드 | 사용자 화면과 관리자 화면이 모두 포함됨 |
| `client/src/pages/` | 페이지 단위 컴포넌트 | `App.tsx`의 라우트와 1:1로 매핑되는 파일이 많음 |
| `client/src/components/` | 공통 컴포넌트 | 레이아웃, 배너, 모달, 갤러리, shadcn/Radix UI 계열 |
| `client/public/` | 브라우저에서 직접 접근 가능한 이미지 | 배너, 입시 실적, 시설 사진, favicon 등 |
| `server/` | API 서버 | `routes.ts`가 매우 크므로 기능별 분리 후보 |
| `shared/` | 공용 타입/스키마 | 현재 `users` 스키마 중심. 실제 DB와 괴리가 있음 |
| `attached_assets/` | 업로드/로고/시간표 이미지 | Vite alias `@assets`와 Express static으로 접근 |
| `script/` | 빌드 스크립트 | client와 server를 함께 dist로 빌드 |
| `.github/workflows/` | CI 설정 | PR to main에서 npm ci, type check, build 수행 |

파일 유형 기준 `.tsx` 80개, `.ts` 17개 정도이며, 실제 콘텐츠 자산(이미지 90개 이상)의 비중이 큰 웹사이트형 저장소입니다.

## 5. 실행, 빌드, 배포

### 5.1 로컬 실행

1. Node.js 20 계열 환경을 준비합니다. CI도 Node 20을 사용합니다.
2. 저장소 루트에서 `npm install` (또는 CI와 동일하게 `npm ci`)을 실행합니다.
3. `.env` 파일에 필수 환경변수를 설정합니다 (6번 섹션 참고).
4. `npm run dev`를 실행하면 Express 서버가 Vite 개발 서버를 붙여 앱을 제공합니다 (포트는 `.env`의 `PORT`, 기본값 5000).

### 5.2 주요 스크립트

| 명령 | 역할 | 비고 |
|---|---|---|
| `npm run dev` | 개발 서버 실행 | `NODE_ENV=development tsx server/index.ts` |
| `npm run build` | 운영 빌드 | `script/build.ts`가 Vite client + esbuild server 번들 생성 |
| `npm run start` | 운영 서버 실행 | `dist/index.cjs` 실행 |
| `npm run check` | TypeScript 타입 검사 | CI에서 실행됨 |
| `npm run db:push` | Drizzle 스키마 push | `shared/schema.ts` 범위가 제한적이므로 실제 테이블 전체 반영 도구로 보기 어려움 |

### 5.3 CI

`.github/workflows/ci.yml`은 `main` 브랜치 대상 Pull Request에서 `npm ci`, `npm run check`, `npm run build`를 순서대로 실행합니다. 배포는 이 CI와 별개로 **Render가 `main` 브랜치 push를 감지해 자동 빌드/배포**합니다 (Render 대시보드에서 Build/Start 커맨드와 환경변수를 직접 확인하세요).

## 6. 환경변수

| 변수 | 용도 | 운영 주의사항 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | 운영 필수. 세션 저장과 대부분의 API 테이블에 사용. **로컬 `.env`와 Render의 값이 다를 수 있으니 실제 운영 DB인지 반드시 확인** (03번 문서 참고) |
| `SESSION_SECRET` | 세션 서명 키 | 운영에서 fallback 값 사용 금지 |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 | 운영에서 기본값 사용 금지 |
| `ADMIN_SESSION_TOKEN` | 관리자 세션/토큰 관련 값 | `server/routes.ts`의 관리자 인증 흐름에서 사용 |
| `SUPABASE_URL` | Supabase 프로젝트 URL | Storage 및 일부 Supabase REST 호출에 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | 서버 전용 비밀값. 클라이언트 노출 금지. RLS를 우회하는 권한이므로 특히 조심 |
| `ARCHIVE_DATABASE_URL` | 신청/예약 백업용 archive DB | 없으면 백업 비활성화 경고만 출력 |
| `GOOGLE_WEBHOOK_URL` | Google Apps Script Webhook | 예약, 문자수신, 레벨테스트 접수 내용을 Google Sheet로 전송 |
| `PORT` | 서버 포트 | 기본 5000 (macOS 로컬에서는 AirPlay와 충돌 가능 → `.env`에서 5001 등으로 지정 권장) |
| `NODE_ENV` | development/production 분기 | 운영에서 정적 `dist/public` 서빙 |

## 7. 프론트엔드 화면 구조

### 7.1 라우팅

| URL | 컴포넌트 | 설명 |
|---|---|---|
| `/` | Home | 메인 홈 화면 |
| `/high-school` | HighSchool | 고등관 소개 |
| `/high-school/schedule/g1,g2,g3` | HighSchoolScheduleG1/G2/G3 | 고등 학년별 시간표 |
| `/middle-school`, `/middle-school/schedule` | MiddleSchool, MiddleSchoolSchedule | 중등관(중3) 및 시간표 |
| `/junior-school`, `/junior-school/schedule` | JuniorSchool, JuniorSchoolSchedule | 초/중등관 및 시간표 |
| `/teachers`, `/teachers/:id` | TeachersPage, TeacherDetail | 강사진 목록과 상세 |
| `/summer` | Summer | 여름특강 페이지 |
| `/math-school` | MathSchool | 수학관/수학 콘텐츠 |
| `/owl`, `/owl/info`, `/owl/usage` | Owl, OwlInfo, OwlUsage | OWL 관리형 스터디카페/시설 안내 |
| `/briefing/*` | Briefing 계열 | 설명회, 예약, 일정 |
| `/admissions/*` | Admissions 계열 | 입시 실적, 합격 후기 |
| `/about`, `/directions`, `/notices` | About/Directions/Notices | 학원 소개, 오시는 길, 공지사항 |
| `/admin` | AdminPage | 관리자 CMS |

### 7.2 공통 컴포넌트

- `layout.tsx`: Header, Footer, PageLayout, SectionPage 제공. Header는 `/api/navigation` 데이터를 사용.
- `floating-sidebar.tsx`: 상담/문자/레벨테스트 등 빠른 행동을 위한 플로팅 UI.
- `timetable-gallery.tsx`, `summary-timetable.tsx`: 시간표와 요약 시간표 표시.
- `reservation-modal.tsx`, `sms-subscribe-modal.tsx`, `math-level-test-modal.tsx`: 사용자 신청 입력 모달.
- `banner-carousel.tsx`, `popup-modal.tsx`: 운영자가 관리하는 배너/팝업 표시.
- `components/ui/`: Radix UI/shadcn 계열 UI 기본 컴포넌트 모음.

## 8. 관리자 페이지 기능

관리자 페이지는 `client/src/pages/admin.tsx` 한 파일(7000줄 이상)에 많은 탭이 구현되어 있습니다. 기능 추가나 버그 수정 시 먼저 탭 컴포넌트 이름을 검색한 뒤 연결 API를 확인하는 방식이 빠릅니다.

| 관리 탭 | 관련 데이터/API | 운영자가 할 수 있는 일 |
|---|---|---|
| 강사 관리 | `/api/teachers`, `/api/teachers/:id/images` | 강사 등록, 사진 변경, 경력/소개 수정, 정렬, 삭제, 상세 이미지 관리 |
| 정규 시간표 | `/api/timetables` | 과목/강사/학교/수업명/수업시간/개강일 관리, 노출 여부, 상세 이미지 |
| 필터 탭(목차) 관리 | `/api/filter-tabs` | 학년별(고1/고2/고3/초중등관) 상단 필터 탭 추가/이름변경/순서/숨김 |
| 요약 시간표 | `/api/summary-timetables` | 중간/기말 또는 입시 포스터성 이미지 묶음 업로드 및 정렬 |
| 배너 | `/api/banners` | 메인/구분별 배너 이미지, 링크, 노출 여부 관리 |
| 팝업 | `/api/popups` | 팝업 이미지, 링크, 노출 여부, 순서 관리 |
| 공지사항 | `/api/notices` | 공지 제목/본문/다중 이미지 등록, 수정, 노출 토글 |
| 설명회 | `/api/briefings`, `/api/briefing-events` | 설명회 정보와 캘린더 이벤트 관리 |
| 예약 관리 | `/api/admin/reservations` | 수강 예약 접수 조회 및 삭제 처리 |
| 문자 수신 | `/api/sms-subscriptions` | 문자 수신 신청 조회 및 삭제 처리 |
| 레벨테스트 | `/api/level-test-registrations` | 수학 레벨테스트 신청 조회 및 삭제 처리 |
| 학교 로고 | `/api/schools` | 학교명과 로고 등록/삭제 (GET 목록 조회 포함) |
| 메뉴 설정 | `/api/admin/navigation` | 상위/하위 메뉴명, 경로, 순서, 노출 여부 관리 |
| 여름특강 | `/api/summer-*` | 특강 이미지, 안내사항, 핵심 포인트, 일정, 공지, 시간표 슬롯 관리 |
| 브로셔/커리큘럼 | `/api/summer-guidelines` | 강사별 커리큘럼(강좌특징/교재/과제/회차별 내용) 관리. 시간표 카드의 "브로셔" 버튼과 연결 |

## 9. 백엔드 API 구조

### 9.1 서버 진입점

- `server/index.ts`는 `.env`를 수동 로드하고, 운영 환경에서 `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL` 누락 또는 안전하지 않은 기본값을 차단합니다.
- `express-session`과 `connect-pg-simple`을 사용해 PostgreSQL `session` 테이블에 세션을 저장합니다.
- API 응답은 no-cache 헤더를 붙이고, API 요청 로그를 콘솔에 남깁니다.
- 개발 환경에서는 `server/vite.ts`로 Vite를 붙이고, 운영 환경에서는 `server/static.ts`로 `dist/public`을 제공합니다.

### 9.2 API 그룹

| 그룹 | 대표 엔드포인트 | 설명 |
|---|---|---|
| 관리자 인증 | `POST /api/admin/login`, `GET /api/admin/status` | 관리자 페이지 접근 인증 |
| 공개 내비게이션 | `GET /api/navigation` | 헤더 메뉴 데이터 제공 |
| 강사 | `GET/POST/PATCH/DELETE /api/teachers` | 강사 CRUD와 이미지 업로드 |
| 시간표 | `GET/POST/PUT/PATCH/DELETE /api/timetables` | 수업 시간표, 노출, 상세 이미지, 정렬 |
| 예약 | `POST /api/reservations`, `GET /api/admin/reservations` | 사용자 수강 예약 접수와 관리자 조회 |
| 콘텐츠 | `/api/banners`, `/api/popups`, `/api/notices`, `/api/reviews` | 배너/팝업/공지/후기 관리 |
| 설명회 | `/api/briefings`, `/api/briefing-events` | 설명회 목록 및 일정 관리 |
| 여름특강 | `/api/summer-images` 등 `/api/summer-*` | 여름특강 전용 콘텐츠 관리 |
| 회원 인증 | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` | 학생/회원 가입, 로그인, 세션 확인 |
| 외부 전송 | `sheets-sync.ts` 호출 | 예약/문자/레벨테스트를 Google Sheets Webhook으로 전송 |

**유지보수 팁**: `server/routes.ts`가 매우 크기 때문에 특정 기능 수정 시에는 엔드포인트 문자열 또는 관리자 탭 이름으로 검색하는 것이 가장 빠릅니다. 장기적으로는 teachers, timetables, content, admissions, summer, auth 등 기능별 라우터로 분리하는 것이 좋습니다.

## 10. DB 및 데이터 모델

DB는 PostgreSQL을 기준으로 동작합니다. Supabase JS client(`service_role` 키, RLS 우회)와 raw `pg.Pool`(DATABASE_URL, `postgres` 계정, RLS 우회) 두 경로를 함께 사용하며, 실제 저장/조회 로직은 `pg.Pool`을 직접 쓰는 부분이 많습니다.

| 테이블 | 주요 용도 | 비고 |
|---|---|---|
| `teachers` | 강사 기본 정보 | division, subject, image_url, display_order 등 |
| `teacher_images`, `teacher_timetable_photos` | 강사 상세/시간표용 이미지 | 강사 상세 페이지 및 시간표 카드용 |
| `timetables` | 정규 수업 시간표 | teacher_id, category, target_school, subject, class_time, is_visible, is_union 등 |
| `summary_timetables` | 요약 시간표/포스터 이미지 | division별 이미지 관리 |
| `filter_tabs` | 시간표 필터 탭 | 학년/학교/구분별 필터 UI에 사용 |
| `summer_guidelines` | 강사 커리큘럼/브로셔 | division·category(`curriculum`/`guideline`)로 구분, 시간표 브로셔 버튼과 매칭 |
| `reservations` | 수강 예약 접수 | Google Sheet와 archive DB로도 전송 가능 |
| `sms_subscriptions` | 문자 수신 신청 | soft delete 컬럼 있음 |
| `level_test_registrations` | 레벨테스트 신청 | soft delete 컬럼 있음 |
| `members` | 회원 정보 | bcrypt 해시 비밀번호, 학생/학부모 연락처 포함 |
| `phone_verifications` | 전화번호 인증 코드 | 개발 환경에서는 인증번호를 콘솔에 출력 |
| `banners`, `popups`, `notices`, `notice_images` | 운영 콘텐츠 | 이미지 업로드는 Supabase Storage `images` 버킷 사용 |
| `briefings`, `briefing_events` | 설명회 정보와 캘린더 | active 상태와 display_order 관리 |
| `reviews`, `testimonials` | 합격 후기 | 이미지 배열과 순서 정보 |
| `schools` | 학교 로고 | 기본 학교 데이터 자동 삽입 로직 있음 |
| `navigation_menus` | 헤더 메뉴 | 상하위 메뉴와 노출 여부 |
| `summer_*` (images, highlights, schedules, notices, timetable_slots) | 여름특강 전용 데이터 | 이미지, 안내문, 하이라이트, 일정, 공지, 시간표 슬롯 |
| `middle_school_images` | 중등부 이미지 | 초/중등관 관련 |
| `session` | express-session 저장소 | connect-pg-simple이 자동 관리 |

- `shared/schema.ts`의 Drizzle 스키마는 `users` 중심으로 제한적입니다. DB 전체 구조의 단일 기준으로 사용하기 어렵습니다.
- `routes.ts`의 `ensure*Table` 함수들이 **서버 시작 시** 테이블과 컬럼을 보정합니다. 운영 DB 변경은 마이그레이션 이력 없이 코드 실행으로 누적될 수 있으므로 주의가 필요합니다.
- `ARCHIVE_DATABASE_URL`이 설정되면 예약, 문자수신, 레벨테스트 신청이 별도 archive DB에도 fire-and-forget 방식으로 저장됩니다.
- **RLS(Row Level Security)**: 2026-08-08부로 `public` 스키마 29개 테이블 전체에 RLS를 활성화했습니다(정책 없음 = anon/authenticated의 직접 접근 차단). 앱은 `postgres`/`service_role` 권한(둘 다 RLS 우회)만 사용하므로 영향 없습니다. 새 테이블을 추가하면 **반드시 RLS도 함께 켜주세요.**

## 11. 이미지와 파일 업로드

- `attached_assets/`는 로고와 시간표 이미지 등 저장소에 포함된 정적 자산입니다. Vite alias `@assets`와 Express static `/attached_assets`로 접근합니다.
- `client/public/`는 브라우저에서 직접 제공되는 이미지입니다. 배너, 입시 실적, 강사 사진, 시설 사진 등이 들어 있습니다.
- 관리자에서 업로드하는 이미지는 multer로 받아 Supabase Storage `images` 버킷에 업로드하는 흐름이 많습니다.
- `supabase.ts`에는 실제 Supabase client가 없을 때 PostgreSQL fallback처럼 동작하는 래퍼가 있습니다. 로컬 개발 시 환경변수 상태에 따라 동작이 달라질 수 있습니다.

## 12. 외부 연동

### 12.1 Google Sheets Webhook

`server/sheets-sync.ts`는 세 종류의 접수 데이터를 `GOOGLE_WEBHOOK_URL`로 POST합니다.

| 함수 | 전송 데이터 | 사용 상황 |
|---|---|---|
| `appendReservationRow` | 과목, 강사명, 수업명, 학생명, 학생/학부모 연락처, 학교 | 수강 예약 접수 |
| `appendSmsRow` | 이름, 전화번호, 학교, 학년 | 문자 수신 신청 |
| `appendLevelTestRow` | 이름, 전화번호, 학교, 학년 | 수학 레벨테스트 신청 |

### 12.2 Supabase

- `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 설정되면 Storage 업로드와 REST/RPC 호출에 사용됩니다.
- Storage 버킷명은 코드상 `images`를 주로 사용 (public 버킷).
- service role key는 반드시 서버 환경변수로만 관리해야 하며 클라이언트 코드에 노출하면 안 됩니다.

## 13. 운영 작업별 가이드

### 13.1 새 강사 추가

1. 관리자 페이지 `/admin`에 로그인합니다.
2. 강사 관리 탭에서 이름, 소속, 과목, 소개, 대표 이미지를 등록합니다.
3. 필요하면 강사 상세 이미지 관리에서 추가 이미지를 업로드합니다.
4. 시간표 등록 시 해당 강사를 teacher_id 또는 teacher_ids로 연결합니다.

### 13.2 시간표 등록/수정

1. 정규 시간표 탭에서 카테고리, 대상 학교, 수업명, 시간, 개강일, 과목, 강사, 노출 여부를 입력합니다.
2. **연합(공통) 반은 기본적으로 전체시간표 탭에서만 노출**됩니다. 특정 학교 탭에서도 보여야 하는 경우(예: 청명고, 영덕고, 영신여고)는 `high-school.tsx`의 `buildFilterFn` 안에 학교명 예외 처리가 되어 있는지 확인/추가해야 합니다. 무작정 모든 학교에 다 보이게 바꾸면 안 됩니다(연합반은 원칙적으로 전체시간표 전용).
3. 브로셔가 필요한 강좌는 `/api/summer-guidelines`에 division(고1/고2/고3/중3 등)과 title에 강사명이 들어가도록 등록해야 시간표 카드의 "브로셔" 버튼과 자동으로 매칭됩니다 (`timetable-gallery.tsx`의 `matchGuideline` 참고).
4. 정렬/노출 변경 후 실제 사용자 페이지에서 필터 탭별 표시를 확인합니다.

### 13.3 공지/배너/팝업 변경

1. 관리자에서 해당 탭으로 이동해 이미지와 링크, 노출 여부를 수정합니다.
2. 이미지를 바꾼 경우 Supabase Storage 삭제/업로드 로직이 정상 동작하는지 확인합니다.
3. 배너가 하나도 없을 때는 빈 화면(플레이스홀더 문구)이 뜨는 게 정상입니다. 예전에는 하드코딩된 기본 문구가 대신 뜨는 버그가 있었으나 수정되었습니다.

### 13.4 설명회/예약 운영

1. 설명회 관리에서 제목, 날짜, 시간, 설명, 신청 폼 URL, 노출 여부를 관리합니다.
2. 설명회 캘린더는 `briefing_events` 테이블과 `/api/briefing-events` API를 사용합니다.
3. 예약 접수는 DB 저장, archive DB 백업, Google Sheets Webhook 전송이 각각 별도로 동작할 수 있으므로 접수 누락 여부를 세 경로에서 확인합니다.

## 14. 코드 품질 및 리스크

| 리스크 | 영향 | 권장 조치 |
|---|---|---|
| `routes.ts` 과대화 | API, DB 생성, 업로드, 인증 로직이 한 파일(3700줄+)에 집중되어 변경 영향 추적이 어려움 | 기능별 라우터와 서비스로 단계적 분리 |
| 마이그레이션 부재 | 서버 시작 시 ALTER TABLE로 운영 DB가 조용히 변경될 수 있음 | Drizzle 또는 SQL migration 체계로 전환 |
| `shared/schema.ts`와 실제 DB 괴리 | 타입 안정성과 DB 문서화 효과가 제한적 | 실제 테이블 스키마를 shared/db schema 또는 migrations로 정리 |
| 관리자 페이지 단일 대형 파일 | `admin.tsx`(7000줄+) 유지보수 난이도 높음 | 탭별 컴포넌트 파일 분리 |
| 비밀값 관리 | service role key, admin password 노출 위험 | 배포 플랫폼 secret 관리, 로컬 `.env` 커밋 금지 확인 |
| 외부 Webhook 실패 처리 | Google Sheets 전송 실패 시 운영자가 놓칠 수 있음 | 재시도/상태 저장/관리자 알림 체계 추가 검토 |
| 로컬/운영 DB 혼동 | 로컬 `.env`의 `DATABASE_URL`이 운영(Render)과 다른 Supabase 프로젝트를 가리킬 수 있음 (실제로 겪은 사례, 03번 문서 참고) | 작업 전 항상 어느 DB에 연결됐는지 확인 |

## 15. 신규 담당자 체크리스트

**첫날 확인**
- [ ] GitHub 저장소 접근 권한과 main 브랜치 보호 정책 확인
- [ ] 운영 배포 플랫폼(Render), 도메인, SSL, 환경변수 위치 확인
- [ ] DATABASE_URL, Supabase 프로젝트, Google Sheets Webhook 소유자 확인
- [ ] 관리자 계정/비밀번호 변경 절차 확인
- [ ] `npm ci`, `npm run check`, `npm run build`가 로컬 또는 CI에서 통과하는지 확인
- [ ] 운영 사이트의 핵심 화면: 홈, 고등 시간표, 중등 시간표, 설명회, 입시 실적, 관리자 로그인을 확인

**수정 전 확인**
- [ ] 수정 대상이 사용자 공개 페이지인지 관리자 페이지인지 구분
- [ ] 연결 API와 DB 테이블 확인
- [ ] 이미지 업로드가 포함되면 Supabase Storage 경로와 삭제 로직 확인
- [ ] 예약/문자/레벨테스트는 DB 저장과 Google Sheet 전송을 모두 확인
- [ ] 시간표 변경은 필터 탭, 학교별 노출, is_visible, is_union 조건까지 확인
- [ ] **어느 DB(로컬 vs 운영)에 연결해서 작업 중인지 반드시 확인**

**배포 전 확인**
- [ ] `npm run check` 실행
- [ ] `npm run build` 실행
- [ ] 운영 필수 환경변수 누락 여부 확인
- [ ] 관리자 주요 CRUD 한 번씩 점검
- [ ] 모바일 헤더/메뉴와 주요 이미지 로딩 확인
- [ ] 배포 후 API 오류 로그와 Google Sheets 접수 테스트 확인

## 16. 부록: 주요 파일별 역할

| 파일 | 역할 |
|---|---|
| `package.json` | 의존성, 실행 스크립트, 빌드/검사 명령 정의 |
| `vite.config.ts` | Vite root를 client로 설정하고 `@`, `@shared`, `@assets` alias 정의 |
| `script/build.ts` | dist 정리 후 client Vite build와 server esbuild bundle 수행 |
| `server/index.ts` | 서버 초기화, 세션, 정적 파일, Vite/production 서빙 |
| `server/routes.ts` | API 라우트, DB 테이블 보정, Supabase 업로드, 관리자 인증 |
| `server/supabase.ts` | Supabase client 및 fallback query/storage 래퍼 |
| `server/sheets-sync.ts` | Google Sheets Webhook 전송 |
| `client/src/App.tsx` | 전체 라우팅과 QueryClient/Tooltip/Toaster provider 구성 |
| `client/src/lib/queryClient.ts` | API 요청 공통 함수와 TanStack Query 기본 설정 |
| `client/src/components/layout.tsx` | 공통 Header/Footer/PageLayout |
| `client/src/components/timetable-gallery.tsx` | 시간표 필터링/그룹핑/브로셔 매칭 핵심 로직 |
| `client/src/pages/admin.tsx` | 관리자 CMS 전체 UI와 mutation/query 연결 |
| `shared/contact-info.ts` | 푸터/연락처 표시용 전화번호 데이터 |
| `shared/schema.ts` | Drizzle/Zod `users` 스키마 |
| `.github/workflows/ci.yml` | PR 대상 CI: install, type check, build |
