# 🕹️ BLOCKARI

오락실 감성 · 모바일 친화 블록 게임 (100단계). Vite + TypeScript + Canvas + Web Audio.

## 로컬 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기 (PWA·서비스워커 확인용)
```

## 기능

- 7-bag · SRS 월킥 · 고스트 · 홀드 · 넥스트
- 정통 점수 (테트리스 · 콤보 · B2B · T스핀)
- ★ 100단계 난이도 (중력 · 락딜레이 · 넥스트 · 고스트 · 가비지 · 홀드봉인 · 블록 페이드)
- 모바일 터치 (제스처 / 가상 D-pad · DAS/ARR · 햅틱 · Wake Lock)
- 칩튠 BGM(코로베이니키) + 효과음 (Web Audio 합성)
- PWA (홈 화면 추가 · 오프라인)
- 일일 챌린지(고정 시드) · 리플레이 저장/공유 · 로컬 리더보드 · 테마(네온/레트로/파스텔) · 색맹 모드

## 배포 (GitHub Pages)

정적 웹앱이라 GitHub Pages로 **무료 배포**됩니다.

### 방법 A — GitHub Actions (자동, 권장)

1. GitHub에 저장소 생성 후 푸시
2. `vite.config.ts`의 `base`를 저장소 이름으로 설정 (아래 참고)
3. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**
4. `.github/workflows/deploy.yml`(이 저장소에 포함)이 푸시 시 자동 빌드·배포
5. 몇 분 뒤 `https://<사용자명>.github.io/<저장소이름>/` 에서 접속

> **중요 — base 경로**: `https://<id>.github.io/블럭게임/` 처럼 하위 경로로 배포되면
> `vite.config.ts`에 `base: "/<저장소이름>/"`를 넣어야 자원 경로가 맞습니다.
> 사용자 페이지(`<id>.github.io` 루트)나 커스텀 도메인이면 `base`는 `"/"`로 둡니다.

### 방법 B — 수동 배포

```bash
npm run build
# dist/ 폴더 내용을 gh-pages 브랜치에 올리거나
npx gh-pages -d dist   # (gh-pages 패키지 사용 시)
```

### 다른 호스팅

Vercel · Netlify · Cloudflare Pages 모두 저장소 연결만 하면
빌드 명령 `npm run build`, 출력 폴더 `dist` 로 자동 배포됩니다.
이 경우 base 경로 신경 쓸 필요 없이 루트로 배포되어 더 간단합니다.
```
