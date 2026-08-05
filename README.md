# 영통이강학원 홈페이지

초·중·고 입시 전문 「영통이강학원」 공식 홈페이지 및 관리자 시스템입니다.
학원 소개, 강사진, 수업 시간표, 입시 실적, 공지사항 등을 제공하며, 관리자 페이지에서
콘텐츠와 시간표를 직접 관리할 수 있습니다.

## 기술 스택

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter
- **Backend:** Node.js, Express 5, TypeScript
- **Database / Storage:** Supabase (PostgreSQL), Drizzle ORM
- **기타:** Google Sheets 연동, Excel(xlsx) 시간표 업로드/파싱

## 주요 기능

- 학원 소개 · 강사진 · 시설 안내 페이지
- 수업/내신 시간표 (Excel 업로드 → 자동 파싱 후 게시)
- 입시 실적 갤러리 (고등관 / 초·중등관 탭 구분, 라이트박스)
- 공지사항 · 배너 · 팝업 관리
- 관리자 페이지 (콘텐츠 CRUD, 시간표 관리, 이미지 업로드)

## 프로젝트 구조

```
client/          # React 프론트엔드
  src/           #   컴포넌트, 페이지, 훅
  public/        #   정적 리소스
server/          # Express 백엔드 (API, 파일 서빙, Google Sheets 동기화)
shared/          # 프론트/백엔드 공용 스키마 (Drizzle + Zod)
attached_assets/ # 업로드된 이미지 및 로고
script/          # 빌드 스크립트
```

## 개발 환경 실행

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 설정 (.env)
#    SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL 등

# 3) 개발 서버 실행
npm run dev
```

## 빌드 / 배포

```bash
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버 실행
```

## 환경변수

`.env` 파일에 다음 값이 필요합니다. (실제 값은 저장소에 포함되지 않습니다.)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase anon 키 |
| `ADMIN_TOKEN` | 관리자 API 인증 토큰 |
| `GOOGLE_WEBHOOK_URL` | 예약/문자/레벨테스트 데이터를 전송할 Google Apps Script 웹훅 URL |
// ci test 1785914195
