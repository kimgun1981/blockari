// themes.ts — 색상 테마(스킨). 블록 팔레트 + 강조색.

export type ThemeName = "neon" | "retro" | "pastel";

export interface Theme {
  name: ThemeName;
  label: string;
  accent: string;
  bg: string; // 보드 배경
  palette: Record<number, string>; // 셀 값(1~8) → 색
}

export const THEMES: Record<ThemeName, Theme> = {
  neon: {
    name: "neon",
    label: "네온",
    accent: "#36e2ff",
    bg: "#05050c",
    palette: {
      1: "#36e2ff",
      2: "#ffd500",
      3: "#b14cff",
      4: "#3ddc4e",
      5: "#ff4757",
      6: "#3a6dff",
      7: "#ff9f1a",
      8: "#6b6b80",
    },
  },
  retro: {
    name: "retro",
    label: "레트로",
    accent: "#e8c34a",
    bg: "#0c0a06",
    palette: {
      1: "#4ec9b0",
      2: "#e8c34a",
      3: "#c586c0",
      4: "#6a9955",
      5: "#d16969",
      6: "#569cd6",
      7: "#ce9178",
      8: "#5a5a4a",
    },
  },
  pastel: {
    name: "pastel",
    label: "파스텔",
    accent: "#ff9ec6",
    bg: "#0e0c12",
    palette: {
      1: "#a0e7e5",
      2: "#fbf8a3",
      3: "#d3b5f0",
      4: "#b5ead7",
      5: "#ffb3ba",
      6: "#a7c7ff",
      7: "#ffd6a5",
      8: "#7d7a88",
    },
  },
};
