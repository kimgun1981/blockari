// difficulty.ts — ★ 100단계 난이도 공식 (DESIGN 3.4)

export interface LevelConfig {
  level: number;
  gravity: number; // 초/칸 (0이면 즉시 낙하 20G)
  lockDelayMs: number;
  nextCount: number; // 미리보기 개수
  ghost: "on" | "flicker" | "off";
  garbageIntervalSec: number | null; // null이면 가비지 없음
  holdMode: "free" | "limited" | "locked";
  fadeBlocks: boolean; // 놓인 블록 서서히 사라짐
}

export function getLevelConfig(level: number): LevelConfig {
  // 1~100 범위로 클램프
  level = Math.max(1, Math.min(100, Math.round(level)));

  // ① 중력: 표준 가이드라인 공식 (1~19), 20부터 즉시 낙하
  const gravity =
    level >= 20 ? 0 : Math.pow(0.8 - (level - 1) * 0.007, level - 1);

  // ② 락 딜레이: 20단계까지 500ms 고정, 이후 선형 감소 → 100단계 16ms
  const lockDelayMs =
    level <= 20
      ? 500
      : Math.max(16, Math.round(500 - (level - 20) * (484 / 80)));

  // ③ 넥스트 미리보기
  const nextCount =
    level <= 14 ? 5 : level <= 40 ? 3 : level <= 65 ? 2 : level <= 95 ? 1 : 0;

  // ④ 고스트
  const ghost: LevelConfig["ghost"] =
    level <= 45 ? "on" : level <= 65 ? "flicker" : "off";

  // ⑤ 가비지 라인
  const garbageIntervalSec =
    level < 50 ? null : Math.max(8, 30 - Math.floor((level - 50) / 5) * 2);

  // ⑥ 홀드
  const holdMode: LevelConfig["holdMode"] =
    level < 76 ? "free" : level < 96 ? "limited" : "locked";

  // ⑦ 블록 페이드
  const fadeBlocks = level >= 86;

  return {
    level,
    gravity,
    lockDelayMs,
    nextCount,
    ghost,
    garbageIntervalSec,
    holdMode,
    fadeBlocks,
  };
}

/** 무한 모드: 페이즈별 레벨당 줄 수 (DESIGN 3.5) */
export function linesPerLevel(level: number): number {
  if (level <= 20) return 10; // P1
  if (level <= 40) return 9; // P2
  if (level <= 60) return 8; // P3
  if (level <= 80) return 7; // P4
  return 6; // P5
}
