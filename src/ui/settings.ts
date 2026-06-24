// settings.ts — 사용자 설정 (localStorage 영속)

import type { ThemeName } from "../render/themes";

export interface Settings {
  inputMode: "gesture" | "buttons";
  haptics: boolean;
  das: number; // 길게 누를 때 첫 반복 지연(ms)
  arr: number; // 반복 간격(ms)
  bgm: boolean;
  sfx: boolean;
  bgmVol: number; // 0~1
  sfxVol: number; // 0~1
  crt: boolean; // CRT 스캔라인 효과
  theme: ThemeName;
  colorblind: boolean;
}

const KEY = "blockari.settings";

const DEFAULTS: Settings = {
  inputMode: "gesture",
  haptics: true,
  das: 150,
  arr: 40,
  bgm: true,
  sfx: true,
  bgmVol: 0.5,
  sfxVol: 0.6,
  crt: true,
  theme: "neon",
  colorblind: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
