// haptics.ts — 진동 피드백 (navigator.vibrate)

let enabled = true;

export function setHaptics(on: boolean): void {
  enabled = on;
}

export function buzz(pattern: number | number[]): void {
  if (!enabled) return;
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// 자주 쓰는 패턴
export const HAPTIC = {
  move: 4,
  rotate: 8,
  lock: 12,
  lineClear: 18,
  tetris: [20, 30, 40] as number[],
  levelUp: [10, 20, 10] as number[],
  gameOver: [40, 60, 80] as number[],
};
