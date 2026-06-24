// TouchInput.ts — 제스처 입력 (방식 A)
//  좌우 스와이프=이동(드래그 비례 다칸) · 탭=회전 · 아래 천천히=소프트드롭
//  아래로 빠른 플릭=하드드롭 · 위로 스와이프=홀드

import type { GameEngine } from "../game/GameEngine";

const DEADZONE = 10; // 이 거리 넘어야 드래그로 인정 (px)
const STEP_X = 26; // 가로 한 칸 이동에 필요한 드래그 거리
const STEP_Y = 30; // 세로 한 칸 소프트드롭에 필요한 드래그 거리
const TAP_TIME = 220; // 탭으로 인정하는 최대 시간(ms)
const SWIPE_MIN = 40; // 위로 홀드 인정 최소 거리
const FLICK_DIST = 70; // 하드드롭 플릭 최소 거리
const FLICK_TIME = 250; // 하드드롭 플릭 최대 시간(ms)

export class TouchInput {
  private sx = 0;
  private sy = 0;
  private st = 0;
  private anchorX = 0;
  private anchorY = 0;
  private axis: "x" | "y" | null = null;
  private active = false;

  constructor(
    private engine: GameEngine,
    private target: HTMLElement
  ) {}

  attach(): void {
    this.target.addEventListener("touchstart", this.onStart, { passive: false });
    this.target.addEventListener("touchmove", this.onMove, { passive: false });
    this.target.addEventListener("touchend", this.onEnd, { passive: false });
    this.target.addEventListener("touchcancel", this.onEnd, { passive: false });
  }

  detach(): void {
    this.target.removeEventListener("touchstart", this.onStart);
    this.target.removeEventListener("touchmove", this.onMove);
    this.target.removeEventListener("touchend", this.onEnd);
    this.target.removeEventListener("touchcancel", this.onEnd);
  }

  private onStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    this.sx = this.anchorX = t.clientX;
    this.sy = this.anchorY = t.clientY;
    this.st = performance.now();
    this.axis = null;
    this.active = true;
    e.preventDefault();
  };

  private onMove = (e: TouchEvent): void => {
    if (!this.active) return;
    const t = e.touches[0];
    const x = t.clientX;
    const y = t.clientY;
    const dx = x - this.sx;
    const dy = y - this.sy;

    if (this.axis === null) {
      if (Math.abs(dx) > DEADZONE || Math.abs(dy) > DEADZONE) {
        this.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    }

    if (this.axis === "x") {
      while (x - this.anchorX >= STEP_X) {
        this.engine.moveRight();
        this.anchorX += STEP_X;
      }
      while (this.anchorX - x >= STEP_X) {
        this.engine.moveLeft();
        this.anchorX -= STEP_X;
      }
    } else if (this.axis === "y") {
      // 아래로 천천히 드래그 → 소프트드롭 (증분)
      while (y - this.anchorY >= STEP_Y) {
        this.engine.softDrop();
        this.anchorY += STEP_Y;
      }
    }
    e.preventDefault();
  };

  private onEnd = (e: TouchEvent): void => {
    if (!this.active) return;
    this.active = false;
    const dt = performance.now() - this.st;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.sx;
    const dy = t.clientY - this.sy;

    if (this.axis === null) {
      // 움직임 거의 없음 + 짧음 → 탭 = 회전
      if (dt < TAP_TIME) this.engine.rotate(1);
    } else if (this.axis === "y") {
      if (dy < -SWIPE_MIN) {
        this.engine.holdPiece(); // 위로 스와이프 = 홀드
      } else if (dy > FLICK_DIST && dt < FLICK_TIME) {
        this.engine.hardDrop(); // 아래로 빠른 플릭 = 하드드롭
      }
    }
    e.preventDefault();
  };
}
