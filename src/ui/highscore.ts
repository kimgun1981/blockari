// highscore.ts — 최고 점수 + 로컬 리더보드 (localStorage)

const BEST_KEY = "blockari.best";
const BOARD_KEY = "blockari.leaderboard";
const MAX_ENTRIES = 10;

export interface ScoreEntry {
  score: number;
  level: number;
  mode: string; // "무한" | "도전 Lv50" | "일일" 등
  date: string; // YYYY-MM-DD
}

export function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* ignore */
  }
}

export function loadLeaderboard(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (raw) return JSON.parse(raw) as ScoreEntry[];
  } catch {
    /* ignore */
  }
  return [];
}

/** 점수 추가 후 상위 10개만 유지. 순위(1부터) 반환, 미진입 시 0 */
export function addScore(entry: ScoreEntry): number {
  const list = loadLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  const rank = trimmed.indexOf(entry) + 1;
  return rank;
}
