// ghost.ts — 고스트 피스 낙하 위치 계산

import { getShape, type PieceType, type Rotation } from "../game/Piece";
import type { Board } from "../game/Board";

/** 현재 피스를 그대로 떨어뜨렸을 때 멈추는 y 좌표 */
export function ghostY(
  board: Board,
  type: PieceType,
  rotation: Rotation,
  x: number,
  y: number
): number {
  const shape = getShape(type, rotation);
  let gy = y;
  while (!board.collides(shape, x, gy + 1)) gy++;
  return gy;
}
