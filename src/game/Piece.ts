// Piece.ts — 7가지 테트로미노 정의·회전 상태

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Rotation = 0 | 1 | 2 | 3;

export const PIECE_TYPES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

// 보드 셀 값 = 색상 인덱스. (DESIGN 7번: 1~7 피스, 8 가비지)
export const PIECE_COLOR_INDEX: Record<PieceType, number> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

// 표준 색상 (DESIGN 2.2)
export const COLORS: Record<number, string> = {
  1: "#36e2ff", // I 하늘
  2: "#ffd500", // O 노랑
  3: "#b14cff", // T 보라
  4: "#3ddc4e", // S 초록
  5: "#ff4757", // Z 빨강
  6: "#3a6dff", // J 파랑
  7: "#ff9f1a", // L 주황
  8: "#6b6b80", // 가비지
};

// 스폰(rotation 0) 모양. 1 = 채워진 칸.
const SPAWN: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// 정사각 행렬을 시계방향 90도 회전
function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const out: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = m[r][c];
    }
  }
  return out;
}

// 각 피스의 회전 4상태를 미리 생성 (SRS 월킥은 단계 3에서 별도 처리)
export const PIECE_SHAPES: Record<PieceType, number[][][]> = (() => {
  const result = {} as Record<PieceType, number[][][]>;
  for (const t of PIECE_TYPES) {
    const states: number[][][] = [];
    let m = SPAWN[t];
    for (let i = 0; i < 4; i++) {
      states.push(m);
      m = rotateCW(m);
    }
    result[t] = states;
  }
  return result;
})();

export function getShape(type: PieceType, rotation: Rotation): number[][] {
  return PIECE_SHAPES[type][rotation];
}
