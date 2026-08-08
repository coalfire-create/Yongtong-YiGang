# 접근 권한 / 계정 인계 가이드

이 문서는 **어디서 무엇을 확인해야 하는지**만 안내합니다. 비밀번호, API 키, 토큰 같은 실제 값은 이 문서(그리고 이 저장소 전체)에 절대 적지 않습니다.

## 1. GitHub

- 저장소: https://github.com/coalfire-create/Yongtong-YiGang
- 확인할 것: 새 담당자를 Collaborator로 초대 (Settings → Collaborators and teams)
- `main` 브랜치가 배포 기준 브랜치이므로, 보호 규칙(브랜치 프로텍션)이 걸려 있는지 같이 확인하세요.

## 2. 배포 — Render

- 이 사이트는 Render에서 `main` 브랜치 push 시 자동 빌드/배포됩니다.
- Render 대시보드 → 해당 서비스 → **Environment** 탭에서 실제 운영 환경변수(DATABASE_URL, SUPABASE_*, ADMIN_PASSWORD 등)를 확인할 수 있습니다.
- 새 담당자를 Render 팀 멤버로 초대하는 절차는 Render 대시보드 → Team/Settings에서 진행합니다.
- **주의**: 로컬 개발용 `.env`와 Render의 실제 값이 다를 수 있습니다. 특히 `DATABASE_URL`이 서로 다른 Supabase 프로젝트를 가리키는 사례가 실제로 있었습니다 (03번 문서 참고). 작업 전 반드시 Render의 값을 기준으로 확인하세요.

## 3. Supabase

- 운영 DB/Storage가 올라가 있는 Supabase 프로젝트는 Render 환경변수의 `DATABASE_URL` / `SUPABASE_URL`에 있는 프로젝트 참조값(project ref)으로 식별합니다.
- supabase.com 로그인 → 해당 프로젝트 → **Project Settings → Team**(또는 조직 단위 초대)에서 새 담당자를 초대합니다.
  - `Developer` 역할: Storage 포함 대부분 기능 접근/편집 가능
  - `Read-only`/`Viewer`: 조회만 가능
  - Supabase는 버킷 단위로 세분화된 대시보드 권한이 없습니다. "이미지만 보게 하고 싶다"면 계정 초대 대신 이미지의 공개 URL(또는 signed URL)만 전달하는 방법도 있습니다.
- Storage: `images` 버킷이 public으로 설정되어 있어 이미지 자체는 로그인 없이도 URL로 볼 수 있습니다. 업로드/삭제는 서버(service_role 키)를 통해서만 가능합니다.
- **RLS(Row Level Security)는 전체 테이블에서 켜져 있습니다.** 새 테이블을 추가할 때는 반드시 함께 켜주세요. (자세한 내용은 01번 문서 10절, 03번 문서 참고)

## 4. 관리자 페이지(`/admin`) 로그인

- 로그인 비밀번호는 Render 환경변수 `ADMIN_PASSWORD`에 저장되어 있습니다 (Render 대시보드에서 확인).
- 담당자가 바뀌면 `ADMIN_PASSWORD`를 새 값으로 교체하는 것을 권장합니다 (교체 후 Render 재배포 필요).

## 5. Google Sheets Webhook

- 예약/문자수신/레벨테스트 신청이 전송되는 Google Sheets와 Apps Script Webhook URL(`GOOGLE_WEBHOOK_URL`)의 소유자를 확인하세요.
- 소유자가 바뀌지 않으면 새 담당자가 시트에 접근하지 못할 수 있습니다. 시트 공유 설정을 함께 확인하세요.

## 6. 도메인

- 실제 서비스 도메인의 등록기관(레지스트라)과 DNS 관리 주체를 확인하고, 필요하면 새 담당자를 추가하세요.
