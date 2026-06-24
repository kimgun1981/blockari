// CanvasRenderer.ts — Canvas로 보드/블록/활성 피스 그리기 + 반응형 스케일

import { BOARD_WIDTH, BOARD_HEIGHT, type Cell } from "../game/Board";
import {
  getShape,
  PIECE_COLOR_INDEX,
  type PieceType,
  type Rotation,
} from "../game/Piece";
import { THEMES, type ThemeName } from "./themes";

export interface RenderPiece {
  type: PieceType;
  rotation: Rotation;
  x: number;
  y: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private cell = 0;
  private palette: Record<number, string> = THEMES.neon.palette;
  private accent = THEMES.neon.accent;
  private bg = THEMES.neon.bg;
  private colorblind = false;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D 컨텍스트를 얻지 못했습니다");
    this.ctx = ctx;
    this.resize();
  }

  setTheme(name: ThemeName): void {
    const t = THEMES[name] ?? THEMES.neon;
    this.palette = t.palette;
    this.accent = t.accent;
    this.bg = t.bg;
  }

  setColorblind(on: boolean): void {
    this.colorblind = on;
  }

  /** 화면 크기에 맞춰 셀 크기 재계산 + 고해상도(devicePixelRatio) 대응 */
  resize(): void {
    const stage = this.canvas.parentElement!;
    const availW = stage.clientWidth;
    const availH = stage.clientHeight;

    let cell = Math.floor(
      Math.min(availW / BOARD_WIDTH, availH / BOARD_HEIGHT)
    );
    cell = Math.max(8, cell);
    this.cell = cell;

    const cssW = cell * BOARD_WIDTH;
    const cssH = cell * BOARD_HEIGHT;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(
    grid: Cell[][],
    piece?: RenderPiece,
    ghost?: RenderPiece,
    fadeBlocks = false,
    clearingRows?: number[]
  ): void {
    const ctx = this.ctx;
    const cell = this.cell;

    // 배경
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, cell * BOARD_WIDTH, cell * BOARD_HEIGHT);

    this.drawGrid();

    // 페이드 기믹: 놓인 블록을 흐리게(맥동) → 잘 안 보임 (충돌은 그대로)
    if (fadeBlocks) {
      ctx.globalAlpha =
        0.28 + 0.2 * Math.abs(Math.sin(performance.now() / 500));
    }
    // 고정된 블록
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const v = grid[y][x];
        if (v) this.drawCell(x, y, this.palette[v], v);
      }
    }
    ctx.globalAlpha = 1;

    // 고스트 피스 (활성 피스 아래에 반투명으로)
    if (ghost) {
      const shape = getShape(ghost.type, ghost.rotation);
      const color = this.palette[PIECE_COLOR_INDEX[ghost.type]];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) this.drawGhostCell(ghost.x + c, ghost.y + r, color);
        }
      }
    }

    // 활성 피스
    if (piece) {
      const shape = getShape(piece.type, piece.rotation);
      const v = PIECE_COLOR_INDEX[piece.type];
      const color = this.palette[v];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) this.drawCell(piece.x + c, piece.y + r, color, v);
        }
      }
    }

    // 줄삭제 플래시 (스트로브)
    if (clearingRows && clearingRows.length) {
      const alpha = 0.85 * Math.abs(Math.sin(performance.now() / 45));
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      for (const y of clearingRows) {
        ctx.fillRect(0, y * cell, BOARD_WIDTH * cell, cell);
      }
    }
  }

  /** 상단 배너 (레벨업 연출 등) */
  drawBanner(text: string, alpha: number): void {
    const ctx = this.ctx;
    const w = this.cell * BOARD_WIDTH;
    const h = this.cell * BOARD_HEIGHT;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.accent;
    ctx.font = `bold ${Math.max(20, this.cell * 1.4)}px monospace`;
    ctx.shadowColor = this.accent;
    ctx.shadowBlur = 16;
    ctx.fillText(text, w / 2, h * 0.3);
    ctx.restore();
  }

  /** 게임오버 화면 (점수/최고점수/순위) */
  drawGameOver(
    score: number,
    best: number,
    newBest: boolean,
    rank = 0,
    replay = false
  ): void {
    const ctx = this.ctx;
    const w = this.cell * BOARD_WIDTH;
    const h = this.cell * BOARD_HEIGHT;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#ff4757";
    ctx.font = `bold ${Math.max(20, this.cell * 1.2)}px monospace`;
    ctx.fillText(replay ? "REPLAY END" : "GAME OVER", w / 2, h * 0.34);

    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(13, this.cell * 0.6)}px monospace`;
    ctx.fillText(`SCORE  ${score}`, w / 2, h * 0.46);

    if (!replay) {
      ctx.fillStyle = newBest ? "#ffd500" : "#8a8ab0";
      ctx.fillText(
        newBest ? `★ NEW BEST  ${best}` : `BEST   ${best}`,
        w / 2,
        h * 0.54
      );
      if (rank > 0) {
        ctx.fillStyle = "#ffd500";
        ctx.fillText(`리더보드 ${rank}위!`, w / 2, h * 0.62);
      }
    }

    ctx.fillStyle = this.accent;
    ctx.font = `${Math.max(11, this.cell * 0.5)}px monospace`;
    ctx.fillText("R 재시작 · M(≡) 메뉴", w / 2, h * 0.72);
    ctx.textBaseline = "alphabetic";
  }

  private drawGhostCell(x: number, y: number, color: string): void {
    if (y < 0) return;
    const ctx = this.ctx;
    const cell = this.cell;
    const px = x * cell;
    const py = y * cell;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1.5, py + 1.5, cell - 3, cell - 3);
  }

  /** 일시정지/게임오버 등 중앙 오버레이 텍스트 */
  drawCenter(title: string, subtitle?: string): void {
    const ctx = this.ctx;
    const w = this.cell * BOARD_WIDTH;
    const h = this.cell * BOARD_HEIGHT;
    ctx.fillStyle = "rgba(0,0,0,0.66)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.max(16, this.cell * 1.1)}px monospace`;
    ctx.fillText(title, w / 2, h / 2 - this.cell * 0.4);
    if (subtitle) {
      ctx.fillStyle = this.accent;
      ctx.font = `${Math.max(11, this.cell * 0.55)}px monospace`;
      ctx.fillText(subtitle, w / 2, h / 2 + this.cell * 0.9);
    }
    ctx.textBaseline = "alphabetic";
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const cell = this.cell;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, BOARD_HEIGHT * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(BOARD_WIDTH * cell, y * cell + 0.5);
      ctx.stroke();
    }
  }

  private drawCell(x: number, y: number, color: string, value?: number): void {
    if (y < 0) return; // 버퍼 영역(화면 위)은 안 그림
    const ctx = this.ctx;
    const cell = this.cell;
    const px = x * cell;
    const py = y * cell;
    const edge = Math.max(2, cell * 0.12);

    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);

    // 상단 하이라이트 / 하단 그림자 → 블록 입체감
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(px + 1, py + 1, cell - 2, edge);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(px + 1, py + cell - edge - 1, cell - 2, edge);

    // 색맹 모드: 색마다 다른 무늬를 덧그려 구분
    if (this.colorblind && value) this.drawPattern(px, py, cell, value);
  }

  // 셀 값(1~8)마다 고유한 무늬 (색맹 모드)
  private drawPattern(px: number, py: number, cell: number, value: number): void {
    const ctx = this.ctx;
    const cx = px + cell / 2;
    const cy = py + cell / 2;
    const r = cell * 0.18;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = Math.max(1.2, cell * 0.08);
    ctx.beginPath();
    switch (value) {
      case 1: // I — 가로선
        ctx.moveTo(px + cell * 0.25, cy);
        ctx.lineTo(px + cell * 0.75, cy);
        ctx.stroke();
        break;
      case 2: // O — 점
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 3: // T — 세로선
        ctx.moveTo(cx, py + cell * 0.25);
        ctx.lineTo(cx, py + cell * 0.75);
        ctx.stroke();
        break;
      case 4: // S — 슬래시
        ctx.moveTo(px + cell * 0.28, py + cell * 0.72);
        ctx.lineTo(px + cell * 0.72, py + cell * 0.28);
        ctx.stroke();
        break;
      case 5: // Z — 역슬래시
        ctx.moveTo(px + cell * 0.28, py + cell * 0.28);
        ctx.lineTo(px + cell * 0.72, py + cell * 0.72);
        ctx.stroke();
        break;
      case 6: // J — 원(외곽선)
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 7: // L — 플러스
        ctx.moveTo(cx, py + cell * 0.28);
        ctx.lineTo(cx, py + cell * 0.72);
        ctx.moveTo(px + cell * 0.28, cy);
        ctx.lineTo(px + cell * 0.72, cy);
        ctx.stroke();
        break;
      default: // 8 가비지 — X
        ctx.moveTo(px + cell * 0.3, py + cell * 0.3);
        ctx.lineTo(px + cell * 0.7, py + cell * 0.7);
        ctx.moveTo(px + cell * 0.7, py + cell * 0.3);
        ctx.lineTo(px + cell * 0.3, py + cell * 0.7);
        ctx.stroke();
    }
    ctx.restore();
  }
}
