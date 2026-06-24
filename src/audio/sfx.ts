// sfx.ts — 효과음 합성 (Web Audio 오실레이터)

export type SfxName =
  | "move"
  | "rotate"
  | "lock"
  | "lineClear"
  | "tetris"
  | "levelUp"
  | "gameOver";

// 한 음 짧게 재생
function tone(
  ctx: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  peak = 0.5
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  const a = 0.004;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + a);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// 주파수 글리산도(하강 등)
function sweep(
  ctx: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  f0: number,
  f1: number,
  start: number,
  dur: number,
  peak = 0.5
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), start + dur);
  g.gain.setValueAtTime(peak, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSfx(ctx: AudioContext, out: AudioNode, name: SfxName): void {
  const t = ctx.currentTime;
  switch (name) {
    case "move":
      tone(ctx, out, "square", 200, t, 0.025, 0.18);
      break;
    case "rotate":
      tone(ctx, out, "square", 660, t, 0.05, 0.3);
      break;
    case "lock":
      tone(ctx, out, "triangle", 130, t, 0.09, 0.5);
      break;
    case "lineClear":
      [523, 659, 784].forEach((f, i) =>
        tone(ctx, out, "square", f, t + i * 0.05, 0.12, 0.35)
      );
      break;
    case "tetris":
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        tone(ctx, out, "square", f, t + i * 0.05, 0.16, 0.4)
      );
      break;
    case "levelUp":
      [392, 523, 659, 784].forEach((f, i) =>
        tone(ctx, out, "square", f, t + i * 0.06, 0.14, 0.4)
      );
      break;
    case "gameOver":
      sweep(ctx, out, "sawtooth", 440, 60, t, 0.9, 0.4);
      break;
  }
}
