# [기술·개발 부서] 기술 스펙 — 학원 홈페이지 스타터 패키지

## 1. 아키텍처 개요
- **프론트엔드:** 정적 사이트(HTML/CSS/JS) 또는 Next.js 경량 빌드 — 표준 패키지는 정적 사이트로 원가 절감, 트래픽 증가 시 Next.js로 확장.
- **백엔드/DB:** Supabase 사용
  - `inquiries` 테이블: 상담 신청 데이터 저장(이름, 연락처, 학년, 희망과목, 접수일시)
  - `reviews` 테이블: 학부모 후기(승인 전/후 상태값 포함, 원장 승인 후 노출)
  - `notices` 테이블: 공지사항/입시정보 게시글
- **인증:** 원장(관리자) 전용 로그인만 Supabase Auth 이메일 로그인으로 구성. 학부모용 회원가입은 1차 패키지에서 불필요.
- **알림:** 상담 신청 접수 시 Supabase Edge Function → 이메일/카카오 알림톡 발송.

## 2. Supabase RLS 정책 (필수 검토 항목)
- `inquiries`: INSERT는 anon 허용(공개 폼), SELECT/UPDATE/DELETE는 인증된 관리자만 허용.
- `reviews`: INSERT는 관리자만(또는 별도 승인 폼), SELECT는 `status = 'approved'` 조건에서만 anon 허용.
- `notices`: SELECT는 전체 공개, INSERT/UPDATE/DELETE는 관리자만.

## 3. 성능/접근성 체크리스트
- 이미지 WebP 변환 및 lazy loading 적용
- 모바일 LCP 3초 이내, CLS 0.1 이하
- 상담 신청 폼 라벨-입력값 연결(스크린리더 대응), 색 대비 AA 기준

## 4. 배포 및 유지보수
- 배포: Vercel 또는 Cloudflare Pages
- 유지보수 패키지(월 정액): 콘텐츠 수정 2회/월, 장애 대응 SLA 24시간

## 5. 개발 체크리스트 (Definition of Done)
- [ ] 상담 신청 폼 유효성 검사 및 관리자 알림 테스트 완료
- [ ] RLS 정책 전수 적용 확인
- [ ] 모바일/데스크톱/3대 브라우저 크로스 테스트
- [ ] 접근성 Critical/Serious 이슈 0건
- [ ] 개인정보처리방침 페이지 게시 확인
