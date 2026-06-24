// KeyboardInput.ts — PC 키보드 조작
//  ← → 이동 / ↑·X 회전(CW) / Z·Ctrl 회전(CCW) / ↓ 소프트드롭
//  Space 하드드롭 / Shift·C 홀드 / P·Esc 일시정지 / R 재시작

import type { GameEngine } from "../game/GameEngine";

export class KeyboardInput {
  constructor(private engine: GameEngine) {}

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (ev: KeyboardEvent): void => {
    const e = this.engine;
    switch (ev.code) {
      case "ArrowLeft":
        e.moveLeft();
        break;
      case "ArrowRight":
        e.moveRight();
        break;
      case "ArrowDown":
        e.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        if (!ev.repeat) e.rotate(1);
        break;
      case "KeyZ":
      case "ControlLeft":
        if (!ev.repeat) e.rotate(-1);
        break;
      case "Space":
        if (!ev.repeat) e.hardDrop();
        break;
      case "ShiftLeft":
      case "KeyC":
        if (!ev.repeat) e.holdPiece();
        break;
      case "KeyP":
      case "Escape":
        if (!ev.repeat) e.togglePause();
        break;
      case "KeyR":
        if (!ev.repeat) e.restart();
        break;
      default:
        return;
    }
    ev.preventDefault();
  };
}
