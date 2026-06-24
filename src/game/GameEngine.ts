// GameEngine.ts — 게임 루프·상태머신 (단계 4: 100단계 난이도 시스템)

import { Board, BOARD_WIDTH, BOARD_HEIGHT, type Cell } from "./Board";
import { Bag } from "./bag";
import {
  getShape,
  PIECE_COLOR_INDEX,
  type PieceType,
  type Rotation,
} from "./Piece";
import { tryRotate } from "./srs";
import { applyScore, type TSpin } from "./scoring";
import { makeGarbageRow } from "./garbage";
import {
  getLevelConfig,
  linesPerLevel,
  type LevelConfig,
} from "../config/difficulty";
import { makeRng, randomSeed, type Rng } from "./rng";
import { saveLastReplay, type Replay } from "./replay";
import { CanvasRenderer } from "../render/CanvasRenderer";
import { ghostY } from "../render/ghost";
import { buzz, HAPTIC } from "../input/haptics";
import { audio } from "../audio/ChiptuneEngine";
import { loadBest, saveBest, addScore } from "../ui/highscore";
import type { HUDView } from "../ui/HUD";

export interface ActivePiece {
  type: PieceType;
  rotation: Rotation;
  x: number;
  y: number;
}

export type Status = "ready" | "playing" | "paused" | "gameover";

export interface StartOptions {
  startLevel: number;
  autoLevelUp: boolean;
  seed?: string; // 지정 시 결정적 (일일 챌린지)
  daily?: boolean;
}

function todayStr(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const QUEUE_SIZE = 5; // 내부 큐는 항상 5개 유지, 표시는 config.nextCount
const CLEAR_MS = 180; // 줄삭제 플래시 시간
const LEVELUP_MS = 900; // 레벨업 배너 표시 시간

export class GameEngine {
  board = new Board();
  bag = new Bag();
  active!: ActivePiece;
  hold: PieceType | null = null;
  holdUsed = false;
  holdSealed = false; // 이번 피스에 홀드 봉인 여부 (holdMode)
  nextQueue: PieceType[] = [];
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  backToBack = false;
  best = 0;
  newBest = false;
  status: Status = "ready";
  config: LevelConfig = getLevelConfig(1);

  lastRank = 0; // 직전 판의 리더보드 순위 (0=미진입)

  private opts: StartOptions = { startLevel: 1, autoLevelUp: true };
  private linesIntoLevel = 0;
  private clearing: { rows: number[]; timer: number } | null = null;
  private banner: { level: number; timer: number } | null = null;

  // 시드/리플레이
  private rng: Rng = Math.random;
  private seed = "";
  private daily = false;
  private gameTime = 0;
  private recording: [number, number][] | null = null;
  private replaying = false;
  private replayActions: [number, number][] = [];
  private replayIdx = 0;
  private currentReplay: Replay | null = null;

  private gravityMs = 1000; // 0이면 즉시낙하(20G)
  private lockDelayMs = 500;
  private gravAccum = 0;
  private lockTimer = 0;
  private garbageAccum = 0;
  private lastRotation = false;

  private rafId = 0;
  private lastTs = 0;

  constructor(
    private renderer: CanvasRenderer,
    private onUpdate: (v: HUDView) => void
  ) {}

  start(opts: StartOptions): void {
    this.opts = opts;
    const seed = opts.seed ?? randomSeed();
    this.recording = [];
    this.replaying = false;
    this.replayActions = [];
    this.replayIdx = 0;
    this.currentReplay = null;
    this.begin(seed, opts.startLevel, opts.daily ?? false);
  }

  /** 리플레이 재생 시작 (입력 기록 없이 액션 자동 주입) */
  startReplay(r: Replay): void {
    this.opts = {
      startLevel: r.startLevel,
      autoLevelUp: r.autoLevelUp,
      seed: r.seed,
      daily: r.daily,
    };
    this.recording = null;
    this.replaying = true;
    this.replayActions = r.actions;
    this.replayIdx = 0;
    this.currentReplay = r;
    this.begin(r.seed, r.startLevel, r.daily);
  }

  isReplaying(): boolean {
    return this.replaying;
  }

  private begin(seed: string, startLevel: number, daily: boolean): void {
    this.seed = seed;
    this.daily = daily;
    this.rng = makeRng(seed);
    this.board.reset();
    this.bag = new Bag(this.rng);
    this.nextQueue = [];
    while (this.nextQueue.length < QUEUE_SIZE) this.nextQueue.push(this.bag.next());
    this.hold = null;
    this.holdUsed = false;
    this.score = 0;
    this.lines = 0;
    this.linesIntoLevel = 0;
    this.level = Math.max(1, Math.min(100, Math.round(startLevel)));
    this.combo = -1;
    this.backToBack = false;
    this.best = loadBest();
    this.newBest = false;
    this.lastRank = 0;
    this.clearing = null;
    this.banner = null;
    this.gameTime = 0;
    this.gravAccum = 0;
    this.garbageAccum = 0;
    this.applyConfig();
    this.status = "playing";
    this.spawnFromQueue();
    this.emit();

    audio.setLevel(this.level);
    audio.startBgm();

    cancelAnimationFrame(this.rafId);
    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  restart(): void {
    if (this.replaying && this.currentReplay) this.startReplay(this.currentReplay);
    else this.start(this.opts);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.status = "ready";
    audio.stopBgm();
  }

  // ── 입력 액션 ──
  moveLeft(): void {
    if (this.status !== "playing") return;
    this.rec(0);
    if (this.tryMove(-1, 0)) audio.sfx("move");
  }
  moveRight(): void {
    if (this.status !== "playing") return;
    this.rec(1);
    if (this.tryMove(1, 0)) audio.sfx("move");
  }
  softDrop(): void {
    if (this.status !== "playing") return;
    this.rec(4);
    if (this.tryMove(0, 1)) {
      this.score += 1;
      this.gravAccum = 0;
      this.emit();
    }
  }
  hardDrop(): void {
    if (this.status !== "playing") return;
    this.rec(5);
    const rotated = this.lastRotation;
    let n = 0;
    while (this.tryMove(0, 1)) n++;
    this.lastRotation = rotated;
    this.score += n * 2;
    this.lockPiece();
  }
  rotate(dir: 1 | -1): void {
    if (this.status !== "playing") return;
    this.rec(dir === 1 ? 2 : 3);
    const res = tryRotate(
      this.board,
      this.active.type,
      this.active.x,
      this.active.y,
      this.active.rotation,
      dir
    );
    if (res) {
      this.active.x = res.x;
      this.active.y = res.y;
      this.active.rotation = res.rotation;
      this.lockTimer = 0;
      this.lastRotation = true;
      buzz(HAPTIC.rotate);
      audio.sfx("rotate");
    }
  }
  holdPiece(): void {
    if (this.status !== "playing") return;
    this.rec(6);
    if (this.holdUsed || this.holdSealed) return;
    const cur = this.active.type;
    if (this.hold === null) {
      this.hold = cur;
      const type = this.nextQueue.shift()!;
      this.nextQueue.push(this.bag.next());
      this.spawn(type);
    } else {
      const swapped = this.hold;
      this.hold = cur;
      this.spawn(swapped);
    }
    this.holdUsed = true;
    this.emit();
  }
  togglePause(): void {
    if (this.status === "playing") {
      this.status = "paused";
      audio.stopBgm();
    } else if (this.status === "paused") {
      this.status = "playing";
      this.lastTs = performance.now();
      audio.startBgm();
    }
  }

  // ── 리플레이 기록/재생 ──
  private rec(code: number): void {
    if (this.recording) this.recording.push([Math.round(this.gameTime), code]);
  }

  private applyAction(code: number): void {
    switch (code) {
      case 0: this.moveLeft(); break;
      case 1: this.moveRight(); break;
      case 2: this.rotate(1); break;
      case 3: this.rotate(-1); break;
      case 4: this.softDrop(); break;
      case 5: this.hardDrop(); break;
      case 6: this.holdPiece(); break;
    }
  }

  private feedReplay(): void {
    while (
      this.replayIdx < this.replayActions.length &&
      this.replayActions[this.replayIdx][0] <= this.gameTime
    ) {
      this.applyAction(this.replayActions[this.replayIdx][1]);
      this.replayIdx++;
    }
  }

  // ── 내부 ──
  private applyConfig(): void {
    this.config = getLevelConfig(this.level);
    this.gravityMs = this.config.gravity > 0 ? this.config.gravity * 1000 : 0;
    this.lockDelayMs = this.config.lockDelayMs;
  }

  private tryMove(dx: number, dy: number): boolean {
    const shape = getShape(this.active.type, this.active.rotation);
    if (!this.board.collides(shape, this.active.x + dx, this.active.y + dy)) {
      this.active.x += dx;
      this.active.y += dy;
      this.lockTimer = 0;
      this.lastRotation = false;
      return true;
    }
    return false;
  }

  private spawnFromQueue(): void {
    const type = this.nextQueue.shift()!;
    this.nextQueue.push(this.bag.next());
    this.holdUsed = false;
    this.spawn(type);
  }

  private spawn(type: PieceType): void {
    const shape = getShape(type, 0);
    const x = Math.floor((BOARD_WIDTH - shape.length) / 2);
    this.active = { type, rotation: 0, x, y: 0 };
    this.gravAccum = 0;
    this.lockTimer = 0;
    this.lastRotation = false;
    // 홀드 봉인 여부 갱신 (holdMode)
    this.holdSealed =
      this.config.holdMode === "locked"
        ? true
        : this.config.holdMode === "limited"
          ? this.rng() < 0.5
          : false;
    if (this.board.collides(shape, x, 0)) {
      this.status = "gameover";
    }
  }

  private lockPiece(): void {
    const tspin = this.detectTspin();
    const shape = getShape(this.active.type, this.active.rotation);
    this.board.lock(
      shape,
      this.active.x,
      this.active.y,
      PIECE_COLOR_INDEX[this.active.type] as Cell
    );
    const fullRows = this.board.getFullRows();
    const cleared = fullRows.length;
    const out = applyScore(
      { level: this.level, combo: this.combo, backToBack: this.backToBack },
      cleared,
      tspin
    );
    this.score += out.points;
    this.combo = out.combo;
    this.backToBack = out.backToBack;
    this.lines += cleared;

    // 햅틱 + 효과음
    if (cleared >= 4) {
      buzz(HAPTIC.tetris);
      audio.sfx("tetris");
    } else if (cleared > 0) {
      buzz(HAPTIC.lineClear);
      audio.sfx("lineClear");
    } else {
      buzz(HAPTIC.lock);
      audio.sfx("lock");
    }

    if (cleared > 0) {
      const before = this.level;
      this.maybeLevelUp(cleared);
      if (this.level > before) {
        buzz(HAPTIC.levelUp);
        audio.sfx("levelUp");
        audio.setLevel(this.level);
        this.banner = { level: this.level, timer: LEVELUP_MS };
      }
      // 줄삭제 플래시 후 실제 제거 (update에서 처리)
      this.clearing = { rows: fullRows, timer: CLEAR_MS };
      this.emit();
    } else {
      this.spawnFromQueue();
      this.afterSpawnGameOverCheck();
      this.emit();
    }
  }

  private afterSpawnGameOverCheck(): void {
    if (this.status === "gameover") {
      this.finishGameOver();
    }
  }

  private finishGameOver(): void {
    buzz(HAPTIC.gameOver);
    audio.sfx("gameOver");
    audio.stopBgm();
    if (this.replaying) return; // 리플레이는 기록/저장 안 함

    this.newBest = this.score > this.best;
    if (this.newBest) {
      this.best = this.score;
      saveBest(this.best);
    }

    // 리플레이 저장
    if (this.recording) {
      const r: Replay = {
        v: 1,
        seed: this.seed,
        startLevel: this.opts.startLevel,
        autoLevelUp: this.opts.autoLevelUp,
        daily: this.daily,
        actions: this.recording,
        score: this.score,
        level: this.level,
        date: todayStr(),
      };
      saveLastReplay(r);
      this.currentReplay = r;
    }

    // 리더보드
    const mode = this.daily
      ? "일일"
      : this.opts.autoLevelUp
        ? "무한"
        : `도전 Lv${this.opts.startLevel}`;
    this.lastRank = addScore({
      score: this.score,
      level: this.level,
      mode,
      date: todayStr(),
    });
  }

  /** 무한 모드에서 줄 누적 시 레벨업 */
  private maybeLevelUp(cleared: number): void {
    if (!this.opts.autoLevelUp || this.level >= 100) return;
    this.linesIntoLevel += cleared;
    while (
      this.level < 100 &&
      this.linesIntoLevel >= linesPerLevel(this.level)
    ) {
      this.linesIntoLevel -= linesPerLevel(this.level);
      this.level++;
    }
    this.applyConfig();
  }

  private addGarbage(): void {
    // 맨 위 줄에 블록이 있으면 가비지가 밀어내 게임오버
    if (this.board.grid[0].some((v) => v !== 0)) {
      this.status = "gameover";
      this.finishGameOver();
      return;
    }
    this.board.grid.shift();
    this.board.grid.push(makeGarbageRow(this.rng));
    // 차오른 후 활성 피스가 겹치면 한 칸 위로 보정
    const shape = getShape(this.active.type, this.active.rotation);
    if (this.board.collides(shape, this.active.x, this.active.y)) {
      this.active.y--;
    }
  }

  private detectTspin(): TSpin {
    if (this.active.type !== "T" || !this.lastRotation) return "none";
    const { x, y, rotation } = this.active;
    const occ = (cx: number, cy: number): boolean =>
      cx < 0 ||
      cx >= BOARD_WIDTH ||
      cy >= BOARD_HEIGHT ||
      (cy >= 0 && this.board.grid[cy][cx] !== 0);
    const tl = occ(x, y);
    const tr = occ(x + 2, y);
    const bl = occ(x, y + 2);
    const br = occ(x + 2, y + 2);
    if ([tl, tr, bl, br].filter(Boolean).length < 3) return "none";
    let front: boolean[];
    switch (rotation) {
      case 0:
        front = [tl, tr];
        break;
      case 1:
        front = [tr, br];
        break;
      case 2:
        front = [bl, br];
        break;
      default:
        front = [tl, bl];
    }
    return front.filter(Boolean).length === 2 ? "full" : "mini";
  }

  private loop = (ts: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(100, ts - this.lastTs);
    this.lastTs = ts;
    if (this.status === "playing") {
      this.gameTime += dt;
      if (this.replaying) this.feedReplay();
      this.update(dt);
    }
    this.render();
  };

  private update(dt: number): void {
    // 배너 타이머는 항상 진행
    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) this.banner = null;
    }

    // 줄삭제 플래시 중에는 낙하/가비지 정지
    if (this.clearing) {
      this.clearing.timer -= dt;
      if (this.clearing.timer <= 0) {
        this.board.clearLines();
        this.clearing = null;
        this.spawnFromQueue();
        this.afterSpawnGameOverCheck();
        this.emit();
      }
      return;
    }

    // 2. 중력
    if (this.gravityMs === 0) {
      // 즉시 낙하 (20G): 매 프레임 바닥까지
      while (this.tryMove(0, 1)) {}
    } else {
      this.gravAccum += dt;
      while (this.gravAccum >= this.gravityMs) {
        this.gravAccum -= this.gravityMs;
        if (!this.tryMove(0, 1)) {
          this.gravAccum = 0;
          break;
        }
      }
    }

    // 3. 락 딜레이
    const shape = getShape(this.active.type, this.active.rotation);
    const grounded = this.board.collides(shape, this.active.x, this.active.y + 1);
    if (grounded) {
      this.lockTimer += dt;
      if (this.lockTimer >= this.lockDelayMs) this.lockPiece();
    } else {
      this.lockTimer = 0;
    }

    // 5. 가비지 라인 타이머
    if (this.config.garbageIntervalSec != null && this.status === "playing") {
      this.garbageAccum += dt;
      const intervalMs = this.config.garbageIntervalSec * 1000;
      if (this.garbageAccum >= intervalMs) {
        this.garbageAccum -= intervalMs;
        this.addGarbage();
      }
    }
  }

  private render(): void {
    // 줄삭제 플래시 중에는 활성 피스/고스트 숨김
    const piece = this.clearing ? undefined : this.active;
    let ghost: ActivePiece | undefined;
    const showGhost =
      this.config.ghost === "on" ||
      (this.config.ghost === "flicker" &&
        Math.floor(performance.now() / 220) % 2 === 0);
    if (piece && this.status !== "gameover" && showGhost) {
      const gy = ghostY(
        this.board,
        piece.type,
        piece.rotation,
        piece.x,
        piece.y
      );
      ghost = { ...piece, y: gy };
    }
    this.renderer.render(
      this.board.grid,
      piece,
      ghost,
      this.config.fadeBlocks,
      this.clearing?.rows
    );

    if (this.banner) {
      const alpha = Math.min(1, this.banner.timer / 300);
      this.renderer.drawBanner(`LEVEL ${this.banner.level}`, alpha);
    }
    if (this.replaying && this.status === "playing")
      this.renderer.drawBanner("▶ REPLAY", 0.5);
    if (this.status === "paused")
      this.renderer.drawCenter("PAUSED", "P 키로 계속");
    if (this.status === "gameover")
      this.renderer.drawGameOver(
        this.score,
        this.best,
        this.newBest,
        this.lastRank,
        this.replaying
      );
  }

  private emit(): void {
    this.onUpdate({
      score: this.score,
      best: Math.max(this.best, this.score),
      level: this.level,
      lines: this.lines,
      hold: this.hold,
      next: this.nextQueue.slice(0, this.config.nextCount),
    });
  }
}
