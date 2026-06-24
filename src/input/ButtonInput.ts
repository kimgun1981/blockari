// ButtonInput.ts — 가상 버튼 D-pad (방식 B). 누르고 있으면 DAS/ARR 연속 이동.

import type { GameEngine } from "../game/GameEngine";

interface BtnDef {
  id: string;
  label: string;
  cls: string;
  repeat: boolean;
  action: (e: GameEngine) => void;
}

const BUTTONS: BtnDef[] = [
  { id: "rot", label: "⟳", cls: "b-rot", repeat: false, action: (e) => e.rotate(1) },
  { id: "left", label: "◀", cls: "b-left", repeat: true, action: (e) => e.moveLeft() },
  { id: "soft", label: "▼", cls: "b-soft", repeat: true, action: (e) => e.softDrop() },
  { id: "right", label: "▶", cls: "b-right", repeat: true, action: (e) => e.moveRight() },
  { id: "hard", label: "⏬", cls: "b-hard", repeat: false, action: (e) => e.hardDrop() },
  { id: "hold", label: "HOLD", cls: "b-hold", repeat: false, action: (e) => e.holdPiece() },
];

export class ButtonInput {
  private container: HTMLElement;
  private dasTimer = 0;
  private arrTimer = 0;

  constructor(
    private engine: GameEngine,
    private host: HTMLElement,
    private opts: { das: number; arr: number }
  ) {
    this.container = this.build();
    this.host.appendChild(this.container);
  }

  attach(): void {
    this.container.style.display = "grid";
  }

  detach(): void {
    this.container.style.display = "none";
    this.stopRepeat();
  }

  private build(): HTMLElement {
    const pad = document.createElement("div");
    pad.id = "dpad";
    pad.style.display = "none";
    for (const def of BUTTONS) {
      const btn = document.createElement("button");
      btn.className = `dbtn ${def.cls}`;
      btn.textContent = def.label;
      btn.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        btn.setPointerCapture?.(ev.pointerId);
        def.action(this.engine);
        if (def.repeat) this.startRepeat(def.action);
      });
      const stop = (ev: Event) => {
        ev.preventDefault();
        if (def.repeat) this.stopRepeat();
      };
      btn.addEventListener("pointerup", stop);
      btn.addEventListener("pointercancel", stop);
      btn.addEventListener("pointerleave", stop);
      pad.appendChild(btn);
    }
    return pad;
  }

  private startRepeat(action: (e: GameEngine) => void): void {
    this.stopRepeat();
    this.dasTimer = window.setTimeout(() => {
      this.arrTimer = window.setInterval(
        () => action(this.engine),
        this.opts.arr
      );
    }, this.opts.das);
  }

  private stopRepeat(): void {
    clearTimeout(this.dasTimer);
    clearInterval(this.arrTimer);
    this.dasTimer = 0;
    this.arrTimer = 0;
  }
}
