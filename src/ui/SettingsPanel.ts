// SettingsPanel.ts — 별도 설정 화면 (테마/색맹/햅틱/DAS·ARR/오디오/CRT)

import { type Settings, saveSettings } from "./settings";
import { THEMES, type ThemeName } from "../render/themes";

export interface SettingsPanelCallbacks {
  onThemeChange: (name: ThemeName) => void;
  onColorblindChange: (on: boolean) => void;
  onBack: () => void;
}

export class SettingsPanel {
  private root: HTMLElement;

  constructor(
    private cb: SettingsPanelCallbacks,
    private settings: Settings
  ) {
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
    root.id = "settings-screen";
    root.innerHTML = `
      <div class="start-card">
        <div class="ss-head">
          <button class="ss-back" id="set-back">←</button>
          <h2>설정</h2>
        </div>
        <div class="ss-settings">
          <div class="ss-srow">
            <span>테마</span>
            <div class="ss-seg" id="set-theme"></div>
          </div>
          <div class="ss-srow">
            <span>색맹 모드<small>블록에 무늬</small></span>
            <label class="ss-switch">
              <input type="checkbox" id="set-cb" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow">
            <span>햅틱 진동</span>
            <label class="ss-switch">
              <input type="checkbox" id="set-haptics" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow ss-dasrow">
            <span>DAS <i id="set-dasv"></i></span>
            <input type="range" id="set-das" min="60" max="300" step="10" />
          </div>
          <div class="ss-srow ss-dasrow">
            <span>ARR <i id="set-arrv"></i></span>
            <input type="range" id="set-arr" min="0" max="120" step="5" />
          </div>
          <div class="ss-srow">
            <span>BGM</span>
            <label class="ss-switch">
              <input type="checkbox" id="set-bgm" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow">
            <span>BGM 볼륨</span>
            <input type="range" id="set-bgmvol" min="0" max="100" step="5" />
          </div>
          <div class="ss-srow">
            <span>효과음</span>
            <label class="ss-switch">
              <input type="checkbox" id="set-sfx" />
              <span></span>
            </label>
          </div>
          <div class="ss-srow">
            <span>효과음 볼륨</span>
            <input type="range" id="set-sfxvol" min="0" max="100" step="5" />
          </div>
          <div class="ss-srow">
            <span>CRT 효과</span>
            <label class="ss-switch">
              <input type="checkbox" id="set-crt" />
              <span></span>
            </label>
          </div>
        </div>
        <button class="ss-btn ss-primary" id="set-done">완료</button>
      </div>`;

    this.wire(root);
    root.querySelector("#set-back")!.addEventListener("click", () =>
      this.cb.onBack()
    );
    root.querySelector("#set-done")!.addEventListener("click", () =>
      this.cb.onBack()
    );
    return root;
  }

  private wire(root: HTMLElement): void {
    const s = this.settings;

    // 테마
    const themeSeg = root.querySelector<HTMLElement>("#set-theme")!;
    themeSeg.innerHTML = (Object.keys(THEMES) as ThemeName[])
      .map((n) => `<button data-theme="${n}">${THEMES[n].label}</button>`)
      .join("");
    const syncTheme = () =>
      themeSeg.querySelectorAll<HTMLButtonElement>("button").forEach((b) =>
        b.classList.toggle("on", b.dataset.theme === s.theme)
      );
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
    const cb = root.querySelector<HTMLInputElement>("#set-cb")!;
    cb.checked = s.colorblind;
    cb.addEventListener("change", () => {
      s.colorblind = cb.checked;
      saveSettings(s);
      this.cb.onColorblindChange(s.colorblind);
    });

    // 햅틱
    const haptics = root.querySelector<HTMLInputElement>("#set-haptics")!;
    haptics.checked = s.haptics;
    haptics.addEventListener("change", () => {
      s.haptics = haptics.checked;
      saveSettings(s);
    });

    // DAS/ARR
    const das = root.querySelector<HTMLInputElement>("#set-das")!;
    const arr = root.querySelector<HTMLInputElement>("#set-arr")!;
    const dasv = root.querySelector<HTMLElement>("#set-dasv")!;
    const arrv = root.querySelector<HTMLElement>("#set-arrv")!;
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
    const bgm = root.querySelector<HTMLInputElement>("#set-bgm")!;
    const sfx = root.querySelector<HTMLInputElement>("#set-sfx")!;
    const bgmvol = root.querySelector<HTMLInputElement>("#set-bgmvol")!;
    const sfxvol = root.querySelector<HTMLInputElement>("#set-sfxvol")!;
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
    const crt = root.querySelector<HTMLInputElement>("#set-crt")!;
    crt.checked = s.crt;
    crt.addEventListener("change", () => {
      s.crt = crt.checked;
      document.body.classList.toggle("crt", s.crt);
      saveSettings(s);
    });
  }
}
