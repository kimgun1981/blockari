// StartScreen.ts — 시작 화면: 모드 선택 + 설정 + 리더보드 + 리플레이

import { getLevelConfig } from "../config/difficulty";
import { type Settings, saveSettings } from "./settings";
import { loadLeaderboard } from "./highscore";
import { loadLastReplay, encodeReplay } from "../game/replay";
import { THEMES, type ThemeName } from "../render/themes";

export interface StartChoice {
  startLevel: number;
  autoLevelUp: boolean;
}

export interface StartScreenCallbacks {
  onStart: (c: StartChoice) => void;
  onDaily: () => void;
  onReplay: () => void;
  onThemeChange: (name: ThemeName) => void;
  onColorblindChange: (on: boolean) => void;
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
          <div class="ss-srow">
            <span>테마</span>
            <div class="ss-seg" id="ss-theme"></div>
          </div>
          <div class="ss-srow">
            <span>색맹 모드<small>블록에 무늬</small></span>
            <label class="ss-switch">
              <input type="checkbox" id="ss-cb" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow">
            <span>햅틱 진동</span>
            <label class="ss-switch">
              <input type="checkbox" id="ss-haptics" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow ss-dasrow">
            <span>DAS <i id="ss-dasv"></i></span>
            <input type="range" id="ss-das" min="60" max="300" step="10" />
          </div>
          <div class="ss-srow ss-dasrow">
            <span>ARR <i id="ss-arrv"></i></span>
            <input type="range" id="ss-arr" min="0" max="120" step="5" />
          </div>
          <div class="ss-srow">
            <span>BGM</span>
            <label class="ss-switch">
              <input type="checkbox" id="ss-bgm" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow">
            <span>BGM 볼륨</span>
            <input type="range" id="ss-bgmvol" min="0" max="100" step="5" />
          </div>
          <div class="ss-srow">
            <span>효과음</span>
            <label class="ss-switch">
              <input type="checkbox" id="ss-sfx" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow">
            <span>효과음 볼륨</span>
            <input type="range" id="ss-sfxvol" min="0" max="100" step="5" />
          </div>
          <div class="ss-srow">
            <span>CRT 효과</span>
            <label class="ss-switch">
              <input type="checkbox" id="ss-crt" />
              <span></span>
            </label>
          </div>
        </div>
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

    this.wireSettings(root);
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

  private wireSettings(root: HTMLElement): void {
    const s = this.settings;

    // 조작 방식
    const seg = root.querySelector<HTMLElement>("#ss-input")!;
    const dasRows = root.querySelectorAll<HTMLElement>(".ss-dasrow");
    const syncInputMode = () => {
      seg.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("on", b.dataset.mode === s.inputMode)
      );
      dasRows.forEach(
        (r) => (r.style.opacity = s.inputMode === "buttons" ? "1" : "0.4")
      );
    };
    seg.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.addEventListener("click", () => {
        s.inputMode = b.dataset.mode as Settings["inputMode"];
        syncInputMode();
        saveSettings(s);
      });
    });

    // 테마
    const themeSeg = root.querySelector<HTMLElement>("#ss-theme")!;
    themeSeg.innerHTML = (Object.keys(THEMES) as ThemeName[])
      .map((n) => `<button data-theme="${n}">${THEMES[n].label}</button>`)
      .join("");
    const syncTheme = () => {
      themeSeg.querySelectorAll<HTMLButtonElement>("button").forEach((b) =>
        b.classList.toggle("on", b.dataset.theme === s.theme)
      );
    };
    themeSeg.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.addEventListener("click", () => {
        s.theme = b.dataset.theme as ThemeName;
        syncTheme();
        saveSettings(s);
        this.cb.onThemeChange(s.theme);
      });
    });
    syncTheme();

    // 색맹
    const cb = root.querySelector<HTMLInputElement>("#ss-cb")!;
    cb.checked = s.colorblind;
    cb.addEventListener("change", () => {
      s.colorblind = cb.checked;
      saveSettings(s);
      this.cb.onColorblindChange(s.colorblind);
    });

    // 햅틱
    const haptics = root.querySelector<HTMLInputElement>("#ss-haptics")!;
    haptics.checked = s.haptics;
    haptics.addEventListener("change", () => {
      s.haptics = haptics.checked;
      saveSettings(s);
    });

    // DAS/ARR
    const das = root.querySelector<HTMLInputElement>("#ss-das")!;
    const arr = root.querySelector<HTMLInputElement>("#ss-arr")!;
    const dasv = root.querySelector<HTMLElement>("#ss-dasv")!;
    const arrv = root.querySelector<HTMLElement>("#ss-arrv")!;
    das.value = String(s.das);
    arr.value = String(s.arr);
    dasv.textContent = `${s.das}ms`;
    arrv.textContent = `${s.arr}ms`;
    das.addEventListener("input", () => {
      s.das = Number(das.value);
      dasv.textContent = `${s.das}ms`;
      saveSettings(s);
    });
    arr.addEventListener("input", () => {
      s.arr = Number(arr.value);
      arrv.textContent = `${s.arr}ms`;
      saveSettings(s);
    });

    // 오디오
    const bgm = root.querySelector<HTMLInputElement>("#ss-bgm")!;
    const sfx = root.querySelector<HTMLInputElement>("#ss-sfx")!;
    const bgmvol = root.querySelector<HTMLInputElement>("#ss-bgmvol")!;
    const sfxvol = root.querySelector<HTMLInputElement>("#ss-sfxvol")!;
    bgm.checked = s.bgm;
    sfx.checked = s.sfx;
    bgmvol.value = String(Math.round(s.bgmVol * 100));
    sfxvol.value = String(Math.round(s.sfxVol * 100));
    bgm.addEventListener("change", () => {
      s.bgm = bgm.checked;
      saveSettings(s);
    });
    sfx.addEventListener("change", () => {
      s.sfx = sfx.checked;
      saveSettings(s);
    });
    bgmvol.addEventListener("input", () => {
      s.bgmVol = Number(bgmvol.value) / 100;
      saveSettings(s);
    });
    sfxvol.addEventListener("input", () => {
      s.sfxVol = Number(sfxvol.value) / 100;
      saveSettings(s);
    });

    // CRT
    const crt = root.querySelector<HTMLInputElement>("#ss-crt")!;
    crt.checked = s.crt;
    crt.addEventListener("change", () => {
      s.crt = crt.checked;
      document.body.classList.toggle("crt", s.crt);
      saveSettings(s);
    });

    syncInputMode();
  }
}
