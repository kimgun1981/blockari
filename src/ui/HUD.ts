// HUD.ts — 점수·레벨·줄 + 홀드/넥스트 미리보기 그리기

import { getShape, PIECE_COLOR_INDEX, type PieceType } from "../game/Piece";
import { THEMES, type ThemeName } from "../render/themes";

export interface HUDView {
  score: number;
  best: number;
  level: number;
  lines: number;
  hold: PieceType | null;
  next: PieceType[];
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} 요소를 찾을 수 없습니다`);
  return el as T;
}

// 회전0 모양에서 채워진 칸만 추려 좌상단 정렬 + 크기 반환
function trim(type: PieceType): { cells: [number, number][]; w: number; h: number } {
  const s = getShape(type, 0);
  let minR = 99,
    maxR = -1,
    minC = 99,
    maxC = -1;
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    }
  }
  const cells: [number, number][] = [];
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (s[r][c]) cells.push([r - minR, c - minC]);
    }
  }
  return { cells, w: maxC - minC + 1, h: maxR - minR + 1 };
}

export class HUD {
  private scoreEl = byId("score");
  private bestEl = byId("best");
  private levelEl = byId("level");
  private linesEl = byId("lines");
  private holdCanvas = byId<HTMLCanvasElement>("hold");
  private nextCanvas = byId<HTMLCanvasElement>("next");
  private palette: Record<number, string> = THEMES.neon.palette;

  setTheme(name: ThemeName): void {
    this.palette = (THEMES[name] ?? THEMES.neon).palette;
  }

  update(v: HUDView): void {
    this.scoreEl.textContent = String(v.score);
    this.bestEl.textContent = String(v.best);
    this.levelEl.textContent = String(v.level);
    this.linesEl.textContent = String(v.lines);
    this.drawPieces(this.holdCanvas, v.hold ? [v.hold] : [], 1);
    this.drawPieces(this.nextCanvas, v.next, Math.max(1, v.next.length));
  }

  /** 캔버스를 가로로 slots등분해 각 칸에 피스 하나씩 그림 */
  private drawPieces(
    canvas: HTMLCanvasElement,
    types: PieceType[],
    slots: number
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const slotW = cssW / slots;
    types.forEach((t, i) => {
      const { cells, w, h } = trim(t);
      const cell = Math.floor(Math.min((slotW - 4) / 4, (cssH - 4) / 2));
      const ox = i * slotW + (slotW - w * cell) / 2;
      const oy = (cssH - h * cell) / 2;
      const color = this.palette[PIECE_COLOR_INDEX[t]];
      for (const [r, c] of cells) {
        const px = ox + c * cell;
        const py = oy + r * cell;
        ctx.fillStyle = color;
        ctx.fillRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
      }
    });
  }
}
