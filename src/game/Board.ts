// Board.ts — 10×20 그리드 + 충돌·잠금·줄삭제

export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export class Board {
  grid: Cell[][];

  constructor() {
    this.grid = Board.empty();
  }

  static empty(): Cell[][] {
    return Array.from(
      { length: BOARD_HEIGHT },
      () => new Array<Cell>(BOARD_WIDTH).fill(0)
    );
  }

  reset(): void {
    this.grid = Board.empty();
  }

  /** shape를 (px,py)에 놓을 때 벽/바닥/기존 블록과 충돌하는지 */
  collides(shape: number[][], px: number, py: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = px + c;
        const y = py + r;
        if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return true;
        // y<0(위쪽 버퍼)은 허용
        if (y >= 0 && this.grid[y][x]) return true;
      }
    }
    return false;
  }

  /** shape를 그리드에 고정 */
  lock(shape: number[][], px: number, py: number, color: Cell): void {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = px + c;
        const y = py + r;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          this.grid[y][x] = color;
        }
      }
    }
  }

  /** 꽉 찬 줄들의 y 인덱스 목록 (애니메이션용) */
  getFullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (this.grid[y].every((v) => v !== 0)) rows.push(y);
    }
    return rows;
  }

  /** 꽉 찬 줄 삭제, 위 블록 내려오기. 삭제한 줄 수 반환 */
  clearLines(): number {
    let cleared = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.grid[y].every((v) => v !== 0)) {
        this.grid.splice(y, 1);
        this.grid.unshift(new Array<Cell>(BOARD_WIDTH).fill(0));
        cleared++;
        y++; // 같은 인덱스를 다시 검사(위에서 내려온 줄)
      }
    }
    return cleared;
  }
}
