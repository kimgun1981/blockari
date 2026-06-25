// LevelSelect.ts — 레벨 도전 화면 (1~100 선택해서 시작)

import { getLevelConfig } from "../config/difficulty";
import type { StartChoice } from "./StartScreen";

export interface LevelSelectCallbacks {
  onStart: (c: StartChoice) => void;
  onBack: () => void;
}

export class LevelSelect {
  private root: HTMLElement;
  private range!: HTMLInputElement;
  private info!: HTMLElement;

  constructor(private cb: LevelSelectCallbacks) {
    this.root = this.build();
    document.body.appendChild(this.root);
  }

  show(): void {
    this.root.style.display = "flex";
  }
  hide(): void {
    this.root.style.display = "none";
  }

  private build(): HTMLElement {
    const root = document.createElement("div");
    root.id = "level-screen";
    root.innerHTML = `
      <div class="start-card">
        <div class="ss-head">
          <button class="ss-back" id="lv-back">←</button>
          <h2>레벨 도전</h2>
        </div>
        <p class="ss-sub">1~100단계 중 골라서 바로 시작</p>
        <div class="ss-chips">
          <button class="ss-chip" data-lv="1">1</button>
          <button class="ss-chip" data-lv="50">50</button>
          <button class="ss-chip" data-lv="80">80</button>
          <button class="ss-chip" data-lv="100">100</button>
        </div>
        <div class="ss-lvrow">
          <span>LV</span>
          <input id="lv-range" type="range" min="1" max="100" value="1" />
          <span id="lv-num">1</span>
        </div>
        <div class="ss-info" id="lv-info"></div>
        <button class="ss-btn ss-primary" id="lv-start">이 레벨로 시작</button>
      </div>`;

    this.range = root.querySelector<HTMLInputElement>("#lv-range")!;
    this.info = root.querySelector<HTMLElement>("#lv-info")!;
    const num = root.querySelector<HTMLElement>("#lv-num")!;

    const refresh = () => {
      const lv = Number(this.range.value);
      num.textContent = String(lv);
      this.info.innerHTML = this.describe(lv);
    };
    this.range.addEventListener("input", refresh);

    root.querySelectorAll<HTMLButtonElement>(".ss-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.range.value = chip.dataset.lv!;
        refresh();
      });
    });

    root.querySelector("#lv-back")!.addEventListener("click", () =>
      this.cb.onBack()
    );
    root.querySelector("#lv-start")!.addEventListener("click", () =>
      this.cb.onStart({ startLevel: Number(this.range.value), autoLevelUp: false })
    );

    refresh();
    return root;
  }

  private describe(level: number): string {
    const c = getLevelConfig(level);
    const grav = c.gravity === 0 ? "즉시(20G)" : `${c.gravity.toFixed(3)}s/칸`;
    const garbage =
      c.garbageIntervalSec == null ? "없음" : `${c.garbageIntervalSec}s마다`;
    const ghost =
      c.ghost === "on" ? "ON" : c.ghost === "flicker" ? "깜빡임" : "OFF";
    const hold =
      c.holdMode === "free" ? "자유" : c.holdMode === "limited" ? "간헐봉인" : "봉인";
    const rows: [string, string][] = [
      ["중력", grav],
      ["락딜레이", `${c.lockDelayMs}ms`],
      ["넥스트", `${c.nextCount}개`],
      ["고스트", ghost],
      ["가비지", garbage],
      ["홀드", hold],
      ["페이드", c.fadeBlocks ? "ON" : "OFF"],
    ];
    return rows.map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join("");
  }
}
