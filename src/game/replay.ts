// replay.ts — 리플레이 저장/공유 (입력 액션 + 시드 기록 → 재생)

export interface Replay {
  v: 1;
  seed: string;
  startLevel: number;
  autoLevelUp: boolean;
  daily: boolean;
  // [게임시간(ms), 액션코드] 목록. 코드: 0←,1→,2회전CW,3회전CCW,4소프트,5하드,6홀드
  actions: [number, number][];
  score: number;
  level: number;
  date: string;
}

const LAST_KEY = "blockari.lastReplay";

export function saveLastReplay(r: Replay): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function loadLastReplay(): Replay | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) return JSON.parse(raw) as Replay;
  } catch {
    /* ignore */
  }
  return null;
}

// URL 공유용 base64 인코딩 (유니코드 안전)
export function encodeReplay(r: Replay): string {
  const json = JSON.stringify(r);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeReplay(s: string): Replay | null {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    const r = JSON.parse(json) as Replay;
    if (r && r.v === 1 && Array.isArray(r.actions)) return r;
  } catch {
    /* ignore */
  }
  return null;
}
