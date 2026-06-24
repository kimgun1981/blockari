// scoring.ts — 정통 점수: 줄삭제·테트리스·콤보·B2B·T스핀 (DESIGN 2.4)

export type TSpin = "none" | "mini" | "full";

export interface ScoreContext {
  level: number;
  combo: number; // 시작 -1, 연속 줄삭제마다 +1
  backToBack: boolean;
}

export interface ScoreOutcome {
  points: number;
  combo: number;
  backToBack: boolean;
}

function baseScore(lines: number, tspin: TSpin): number {
  if (tspin === "full") return [400, 800, 1200, 1600][lines] ?? 0;
  if (tspin === "mini") return [100, 200, 200, 200][lines] ?? 0;
  return [0, 100, 300, 500, 800][lines] ?? 0;
}

/** 한 번의 잠금 결과로 얻는 점수 + 갱신된 콤보/B2B */
export function applyScore(
  ctx: ScoreContext,
  lines: number,
  tspin: TSpin
): ScoreOutcome {
  const base = baseScore(lines, tspin);
  // "어려운" 클리어 = 테트리스(4줄) 또는 줄을 지운 T스핀 → B2B 대상
  const difficult = tspin !== "none" ? lines > 0 : lines === 4;

  let points = base * ctx.level;
  let backToBack = ctx.backToBack;
  let combo = ctx.combo;

  if (lines > 0) {
    if (difficult && ctx.backToBack && base > 0) {
      points = Math.floor(base * ctx.level * 1.5); // B2B ×1.5
    }
    backToBack = difficult; // 일반 줄삭제는 B2B 끊김
    combo = ctx.combo + 1;
    if (combo > 0) points += 50 * combo * ctx.level; // 콤보 보너스
  } else {
    // 줄 없음(T스핀 단독 등): 점수는 주되 콤보 리셋, B2B 유지
    combo = -1;
  }

  return { points, combo, backToBack };
}
