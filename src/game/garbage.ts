// garbage.ts — 가비지 라인 생성 (밑에서 차오르는 줄)

import { BOARD_WIDTH, type Cell } from "./Board";
import type { Rng } from "./rng";

/** 구멍 1칸 뚫린 가비지 줄 (셀 값 8) */
export function makeGarbageRow(rng: Rng = Math.random): Cell[] {
  const hole = Math.floor(rng() * BOARD_WIDTH);
  const row = new Array<Cell>(BOARD_WIDTH).fill(8);
  row[hole] = 0;
  return row;
}
