// StartScreen.ts — 시작 화면: 모드 선택 + 설정 + 리더보드 + 리플레이

import { getLevelConfig } from "../config/difficulty";
import { type Settings, saveSettings } from "./settings";
import { loadLeaderboard } from "./highscore";
import { loadLastReplay, encodeReplay } from "../game/replay";

export interface StartChoice {
  startLevel: number;
  autoLevelUp: boolean;
}

export interface StartScreenCallbacks {
  onStart: (c: StartChoice) => void;
  onDaily: () => void;
  onReplay: () => void;
  onOpenSettings: () => void;
}

export class StartScreen {
  private root: HTMLElement;
  private range!: HTMLInputElement;
  private info!: HTMLElement;

  constructor(
    private cb: StartScreenCallbacks,
    private settings: Settings
  ) {
    this.root = this.build();
    document.body.appendChild(this.root);
  }

  show(): void {
    this.refreshDynamic();
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
        <button class="ss-btn" id="ss-daily">
          🗓️ 오늘의 챌린지<small>매일 같은 블록 순서 (고정 시드)</small>
        </button>

        <div class="ss-divider">레벨 도전</div>
        <div class="ss-chips">
          <button class="ss-chip" data-lv="1">1</button>
          <button class="ss-chip" data-lv="50">50</button>
          <button class="ss-chip" data-lv="80">80</button>
          <button class="ss-chip" data-lv="100">100</button>
        </div>
        <div class="ss-lvrow">
          <span>LV</span>
          <input id="ss-range" type="range" min="1" max="100" value="1" />
          <span id="ss-lvnum">1</span>
        </div>
        <div class="ss-info" id="ss-info"></div>
        <button class="ss-btn" id="ss-start">선택 레벨로 시작 (도전)</button>

        <div class="ss-divider">리더보드 (이 기기)</div>
        <ol class="ss-board" id="ss-board"></ol>

        <div class="ss-divider">리플레이</div>
        <div class="ss-replay" id="ss-replay">
          <button class="ss-btn ss-small" id="ss-replay-play">▶ 마지막 판 보기</button>
          <button class="ss-btn ss-small" id="ss-replay-share">🔗 공유 링크 복사</button>
        </div>

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

    this.range = root.querySelector<HTMLInputElement>("#ss-range")!;
    this.info = root.querySelector<HTMLElement>("#ss-info")!;
    const lvnum = root.querySelector<HTMLElement>("#ss-lvnum")!;

    const refresh = () => {
      const lv = Number(this.range.value);
      lvnum.textContent = String(lv);
      this.info.innerHTML = this.describe(lv);
    };
    this.range.addEventListener("input", refresh);

    root.querySelectorAll<HTMLButtonElement>(".ss-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.range.value = chip.dataset.lv!;
        refresh();
      });
    });

    root
      .querySelector("#ss-infinite")!
      .addEventListener("click", () =>
        this.cb.onStart({ startLevel: 1, autoLevelUp: true })
      );
    root.querySelector("#ss-daily")!.addEventListener("click", () =>
      this.cb.onDaily()
    );
    root
      .querySelector("#ss-start")!
      .addEventListener("click", () =>
        this.cb.onStart({
          startLevel: Number(this.range.value),
          autoLevelUp: false,
        })
      );

    root
      .querySelector("#ss-replay-play")!
      .addEventListener("click", () => this.cb.onReplay());
    root
      .querySelector("#ss-replay-share")!
      .addEventListener("click", () => this.shareReplay());
    root
      .querySelector("#ss-more")!
      .addEventListener("click", () => this.cb.onOpenSettings());

    this.wireInputMode(root);
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

  // 리더보드 + 리플레이 가용성 갱신 (show 시점마다)
  private refreshDynamic(): void {
    const board = this.root.querySelector<HTMLElement>("#ss-board")!;
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
    const hasReplay = !!loadLastReplay();
    this.root.querySelector<HTMLElement>("#ss-replay")!.style.opacity =
      hasReplay ? "1" : "0.4";
    this.root
      .querySelectorAll<HTMLButtonElement>("#ss-replay button")
      .forEach((b) => (b.disabled = !hasReplay));
  }

  private async shareReplay(): Promise<void> {
    const r = loadLastReplay();
    if (!r) return;
    const url = `${location.origin}${location.pathname}#r=${encodeReplay(r)}`;
    const btn = this.root.querySelector<HTMLButtonElement>("#ss-replay-share")!;
    try {
      await navigator.clipboard.writeText(url);
      const old = btn.textContent;
      btn.textContent = "✅ 복사됨!";
      setTimeout(() => (btn.textContent = old), 1500);
    } catch {
      prompt("이 링크를 복사하세요:", url);
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
