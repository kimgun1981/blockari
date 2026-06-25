// StartScreen.ts — 메인 시작 화면 (간소화)

import { type Settings, saveSettings } from "./settings";
import { loadLeaderboard } from "./highscore";

export interface StartChoice {
  startLevel: number;
  autoLevelUp: boolean;
}

export interface StartScreenCallbacks {
  onStart: (c: StartChoice) => void; // 무한 진행 모드
  onLevelSelect: () => void;
  onOpenSettings: () => void;
}

export class StartScreen {
  private root: HTMLElement;

  constructor(
    private cb: StartScreenCallbacks,
    private settings: Settings
  ) {
    this.root = this.build();
    document.body.appendChild(this.root);
  }

  show(): void {
    this.refreshBoard();
    this.root.style.display = "flex";
  }
  hide(): void {
    this.root.style.display = "none";
  }

  private build(): HTMLElement {
    const root = document.createElement("div");
    root.id = "start-screen";
    root.innerHTML = `
      <div class="start-card">
        <h1>BLOCKARI</h1>
        <p class="ss-sub">모바일 친화 블록 게임 · 100단계</p>
        <button class="ss-btn ss-primary" id="ss-infinite">
          무한 진행 모드<small>레벨 1부터 점점 빠르게</small>
        </button>
        <button class="ss-btn" id="ss-level">
          🎯 레벨 도전<small>1~100단계 골라서 시작</small>
        </button>

        <div class="ss-divider">최고 기록</div>
        <ol class="ss-board" id="ss-board"></ol>

        <div class="ss-divider">설정</div>
        <div class="ss-settings">
          <div class="ss-srow">
            <span>조작 방식</span>
            <div class="ss-seg" id="ss-input">
              <button data-mode="gesture">제스처</button>
              <button data-mode="buttons">버튼</button>
            </div>
          </div>
        </div>
        <button class="ss-btn" id="ss-more">⚙️ 추가 설정 (테마·소리·CRT 등)</button>
      </div>`;

    root
      .querySelector("#ss-infinite")!
      .addEventListener("click", () =>
        this.cb.onStart({ startLevel: 1, autoLevelUp: true })
      );
    root
      .querySelector("#ss-level")!
      .addEventListener("click", () => this.cb.onLevelSelect());
    root
      .querySelector("#ss-more")!
      .addEventListener("click", () => this.cb.onOpenSettings());

    this.wireInputMode(root);
    this.refreshBoard(root);
    return root;
  }

  // 최고 기록 목록 갱신
  private refreshBoard(scope?: HTMLElement): void {
    const board = (scope ?? this.root).querySelector<HTMLElement>("#ss-board");
    if (!board) return;
    const list = loadLeaderboard();
    if (list.length === 0) {
      board.innerHTML = `<li class="ss-empty">아직 기록이 없어요. 한 판 해보세요!</li>`;
    } else {
      board.innerHTML = list
        .map(
          (e) =>
            `<li><span class="ss-rkscore">${e.score}</span>` +
            `<span class="ss-rkmeta">${e.mode} · Lv${e.level} · ${e.date}</span></li>`
        )
        .join("");
    }
  }

  private wireInputMode(root: HTMLElement): void {
    const s = this.settings;
    const seg = root.querySelector<HTMLElement>("#ss-input")!;
    const sync = () =>
      seg.querySelectorAll<HTMLButtonElement>("button").forEach((b) =>
        b.classList.toggle("on", b.dataset.mode === s.inputMode)
      );
    seg.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.addEventListener("click", () => {
        s.inputMode = b.dataset.mode as Settings["inputMode"];
        sync();
        saveSettings(s);
      });
    });
    sync();
  }
}
