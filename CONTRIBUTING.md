# 브랜치 전략: GitHub Flow

이 저장소는 `main` 하나만 두고, 모든 작업은 브랜치 → PR → 머지 순서로 진행합니다.

## 규칙

1. **`main`은 항상 배포 가능한 상태를 유지합니다.** `main`에 직접 push하지 않습니다.
2. **작업은 `main`에서 새 브랜치를 따서 시작합니다.**
   - 브랜치 이름은 내용을 알 수 있게: `fix/...`, `feat/...`, `chore/...`, `refactor/...`
   - 예: `fix/admin-password-fallback`, `feat/summer-notice-reorder`
3. **작업 중에도 자주 push하고, 준비되면 PR을 엽니다.**
   ```bash
   git checkout -b fix/example
   git push -u origin fix/example
   gh pr create
   ```
4. **머지 전에 CI(`.github/workflows/ci.yml`: 타입체크 + 빌드)를 통과해야 합니다.**
   - GitHub의 branch protection(머지 버튼 자동 차단)은 이 저장소가 private라서 아직 걸려 있지
     않습니다(무료 플랜은 private 저장소에 branch protection을 지원하지 않음 — GitHub Pro로
     업그레이드하면 걸 수 있습니다). 그전까지는 CI 결과를 직접 확인하고 통과했을 때만 머지합니다.
5. **머지는 PR을 통해서만 합니다.** 머지 방식은 squash merge를 기본으로 합니다(커밋 히스토리를 깔끔하게 유지).
6. **머지 후에는 바로 배포 가능한 상태입니다.** `main`이 곧 배포 대상입니다.
7. **다 쓴 브랜치는 머지 후 삭제합니다.**

## 커밋 메시지

`fix:`, `feat:`, `refactor:`, `chore:`처럼 변경 성격을 앞에 붙이고, 무엇을 왜 바꿨는지 한두 줄로 씁니다.

## 로컬 개발

```bash
npm run dev     # 개발 서버
npm run check   # 타입체크
npm run build   # 프로덕션 빌드
```

`NODE_ENV=production`으로 실행할 때는 `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`이
반드시 설정되어 있어야 하며, 기본값(`admin`, `fallback-secret`)과 같으면 서버가 시작되지
않습니다 (`server/index.ts` 참고).
