# BLOCKARI — 프로젝트 진행 기록 (Claude Code 인계 문서)

> 이 파일은 다음 Claude Code 세션이 맥락을 바로 잡도록 쓴 문서입니다.
> 게임 설계 원본은 `DESIGN.md`, 사용자용 안내는 `README.md` 참고.

## 한 줄 요약
오락실 감성 · 모바일 친화 **100단계 블록 게임**. Vite + TypeScript + Canvas + Web Audio.
**완성 + 배포 완료** 상태. (DESIGN.md 단계 0~7 전부 + 확장 5종 구현 완료)

## 현재 상태 (2026-06-24 기준)
- ✅ 게임 완성, GitHub Pages 자동 배포 동작 중
- 🌐 **라이브: https://kimgun1981.github.io/blockari/**
- 📦 **저장소: https://github.com/kimgun1981/blockari** (Public)
- 🤖 `main` 브랜치 푸시 → GitHub Actions(`.github/workflows/deploy.yml`)가 자동 빌드·배포
- GitHub 계정: `kimgun1981` (gh CLI 로그인됨, `repo`+`workflow` 스코프 보유)

## 로컬에서 실행 / 재개하는 법
```bash
cd ~/Desktop/블럭게임
npm install        # 최초 1회 (node_modules 없을 때)
npm run dev        # http://localhost:5173 개발 서버 (HMR)
npm run build      # tsc 타입체크 + 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 미리보기 (PWA/서비스워커 확인)
```
- 타입체크만: `npx tsc --noEmit`
- Node 26 / npm 11 환경에서 개발됨.

## 수정 후 재배포 (이게 전부)
```bash
git add -A
git commit -m "수정 내용"
git push           # 1~2분 뒤 라이브 사이트에 자동 반영
```
> 서비스워커 캐시 때문에 업데이트가 한 박자 늦게 보일 수 있음 → 새로고침 한 번 더.
> 캐시 강제 갱신이 필요하면 `public/sw.js`의 `CACHE = "blockari-v1"` 버전을 올릴 것.

## 기술 스택 / 규칙
- **TypeScript strict**, 게임 프레임워크 없음(바닐라 Canvas).
- 게임 루프는 `requestAnimationFrame` + **고정 timestep 누적**(accumulator). React 안 씀.
- 좌표계: 보드 [y][x], 10열 × 20행. y는 아래로 +.
- 셀 값: 0=빈칸, 1~7=피스(I,O,T,S,Z,J,L 순), 8=가비지.
- 주석/식별자는 한국어 주석 + 영어 식별자 혼용(기존 스타일 유지).
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 파일 구조 (역할)
```
src/
├─ main.ts                 # 진입점: 화면전환·입력연결·WakeLock·SW등록·리플레이URL
├─ style.css               # 전체 스타일(HUD/시작화면/D-pad/CRT/리더보드)
├─ game/
│  ├─ Board.ts             # 10×20 그리드, 충돌/잠금/줄삭제(getFullRows/clearLines)
│  ├─ Piece.ts             # 7테트로미노 정의·회전상태, 색상인덱스, 기본 팔레트
│  ├─ srs.ts               # SRS 월킥 테이블(JLSTZ/I), tryRotate
│  ├─ bag.ts               # 7-bag (rng 주입 가능)
│  ├─ rng.ts               # 시드 PRNG(mulberry32) + dailySeed/randomSeed
│  ├─ GameEngine.ts        # ★핵심: 루프·상태머신·중력·락딜레이·가비지·페이드·리플레이기록/재생
│  ├─ scoring.ts           # 점수·콤보·B2B·T스핀(applyScore)
│  ├─ garbage.ts           # 가비지 줄 생성(rng 주입)
│  └─ replay.ts            # 리플레이 저장/로드/인코딩(base64 URL)
├─ config/difficulty.ts    # ★100단계 공식 getLevelConfig(level) + linesPerLevel
├─ render/
│  ├─ CanvasRenderer.ts    # 보드/블록/고스트/플래시/배너/게임오버, 테마·색맹 무늬
│  ├─ ghost.ts             # 고스트 낙하위치
│  └─ themes.ts            # 네온/레트로/파스텔 팔레트
├─ input/
│  ├─ KeyboardInput.ts     # PC 키보드
│  ├─ TouchInput.ts        # 제스처(스와이프/탭/플릭)
│  ├─ ButtonInput.ts       # 가상 D-pad + DAS/ARR
│  └─ haptics.ts           # navigator.vibrate
├─ audio/
│  ├─ ChiptuneEngine.ts    # ★Web Audio 합성, 전역 싱글톤 `audio`, BGM 스케줄러
│  ├─ melody.ts            # 코로베이니키 + 베이스 패턴
│  └─ sfx.ts               # 효과음 합성
└─ ui/
   ├─ StartScreen.ts       # 시작화면(모드/레벨/설정/리더보드/리플레이)
   ├─ HUD.ts               # 점수·레벨·줄·BEST·홀드·넥스트 미리보기
   ├─ settings.ts          # 설정 타입 + localStorage 로드/저장
   ├─ highscore.ts         # 최고점수 + 로컬 리더보드(top10)
   └─ GameOver.ts          # (미사용 스텁 — 게임오버는 CanvasRenderer.drawGameOver에서 처리)
```

## 구현된 기능 체크리스트
- [x] 7-bag, SRS 월킥, 고스트, 홀드, 넥스트
- [x] 정통 점수(테트리스/콤보/B2B/T스핀 3코너 판정)
- [x] 100단계 난이도(중력/락딜레이/넥스트/고스트/가비지/홀드봉인/블록페이드)
- [x] 모드: 무한 진행 / 레벨 도전(1~100) / 일일 챌린지(고정 시드)
- [x] 모바일: 제스처 + 가상버튼(DAS/ARR), 햅틱, WakeLock, 반응형 스케일
- [x] 칩튠 BGM(레벨업 시 템포↑) + 효과음, 볼륨/뮤트
- [x] PWA(매니페스트/서비스워커/오프라인/홈화면추가)
- [x] 최고점수·로컬 리더보드, 줄삭제 플래시·레벨업 배너·게임오버 화면, CRT
- [x] 리플레이 저장/공유(URL #r=), 테마 3종, 색맹 모드

## 알려진 한계 / 주의점 (다음에 손볼 만한 것)
1. **리플레이 정확도**: 입력을 게임시간(ms)으로 기록 후 시드+가변 dt로 재생 →
   "거의 동일"한 베스트-에포트. 완전 결정적이 아님(긴 판에서 미세 어긋남 가능).
   → 완전 재현하려면 고정 dt 시뮬레이션으로 전환 필요(엔진 루프 리팩터).
2. **PWA 아이콘이 SVG 1개**(`public/icons/icon.svg`). 일부 환경은 PNG 192/512 선호 →
   필요시 PNG 아이콘 추가 + manifest icons 보강.
3. **온라인 리더보드 미구현**(정적 호스팅 한계). 현재는 기기별 localStorage.
   → 붙이려면 Supabase/Firebase 등 백엔드 필요.
4. 일일 챌린지에 "오늘 이미 했는지/오늘의 최고점" 표시 없음 → UX 개선 여지.
5. `src/ui/GameOver.ts`는 빈 스텁(실제 게임오버는 렌더러에서 그림). 정리하거나 활용 가능.

## 다음에 해볼 만한 아이디어 (DESIGN 10번 + α)
- 줄삭제 시 블록이 무너져 내리는 추가 애니메이션
- 일일 챌린지 전용 리더보드/오늘의 기록 표시
- PNG 아이콘 + 스플래시, 더 화려한 테트리스/콤보 텍스트 연출
- 키 리매핑, 손잡이(왼손/오른손) 레이아웃
- 온라인 리더보드(백엔드 연동)

## 자주 쓰는 명령 메모
```bash
# 배포 상태/로그
gh run list --repo kimgun1981/blockari --limit 5
gh run view <run-id> --repo kimgun1981/blockari --log-failed

# 라이브 응답 확인
curl -s -o /dev/null -w "%{http_code}\n" https://kimgun1981.github.io/blockari/
```
> 주의: zsh에서 `status`는 예약 변수. 스크립트 변수명으로 쓰지 말 것.
