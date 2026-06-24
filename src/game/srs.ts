// srs.ts — Super Rotation System 회전 + 월킥 테이블
// 표준 가이드라인 데이터. 좌표는 SRS 관례(y가 위쪽 +)로 저장하고,
// 보드 좌표(y가 아래쪽 +)에 적용할 때 y를 반전한다.

import { getShape, type PieceType, type Rotation } from "./Piece";
import type { Board } from "./Board";

type Kick = [number, number];

// J·L·S·T·Z 공용 월킥
const JLSTZ: Record<string, Kick[]> = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

// I 전용 월킥
const I_KICKS: Record<string, Kick[]> = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export interface RotateResult {
  rotation: Rotation;
  x: number;
  y: number;
}

/** 회전 시도. 월킥으로 성공하면 새 위치/회전, 전부 막히면 null */
export function tryRotate(
  board: Board,
  type: PieceType,
  x: number,
  y: number,
  from: Rotation,
  dir: 1 | -1
): RotateResult | null {
  const to = ((((from + dir) % 4) + 4) % 4) as Rotation;

  if (type === "O") {
    // O는 회전해도 모양이 같다 → 제자리 회전
    return { rotation: to, x, y };
  }

  const shape = getShape(type, to);
  const table = type === "I" ? I_KICKS : JLSTZ;
  const kicks = table[`${from}>${to}`] ?? [[0, 0]];

  for (const [kx, ky] of kicks) {
    const nx = x + kx;
    const ny = y - ky; // SRS y(위쪽+) → 보드 y(아래쪽+) 반전
    if (!board.collides(shape, nx, ny)) {
      return { rotation: to, x: nx, y: ny };
    }
  }
  return null;
}
