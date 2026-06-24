// ChiptuneEngine.ts — Web Audio 칩튠 합성 (사각파 멜로디 + 삼각파 베이스) + SFX

import { KOROBEINIKI, BASS_PATTERN, type Note } from "./melody";
import { playSfx, type SfxName } from "./sfx";

interface Voice {
  seq: Note[];
  i: number;
  nextTime: number;
  type: OscillatorType;
  gain: GainNode;
  peak: number;
}

const LOOKAHEAD = 0.15; // 초
const TICK_MS = 25;

// 음이름 → 주파수 (A4 = 440Hz)
const SEMITONES: Record<string, number> = {
  C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4,
  "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2,
};
function noteToFreq(name: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 0;
  const semis = SEMITONES[m[1]] + (Number(m[2]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

class ChiptuneEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmGain!: GainNode;
  private sfxGain!: GainNode;

  private melodyVoice!: Voice;
  private bassVoice!: Voice;
  private timer = 0;
  private playing = false;

  private bpm = 130;
  private bgmEnabled = true;
  private sfxEnabled = true;
  private bgmVol = 0.5;
  private sfxVol = 0.6;
  private muted = false;

  /** 사용자 제스처 시점에 호출 (모바일 오디오 정책) */
  init(): void {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.bgmGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();

    // 멜로디(사각파) + 베이스(삼각파). 두 시퀀스 총 박자를 맞춰 루프 정렬.
    const totalBeats = KOROBEINIKI.reduce((s, [, b]) => s + b, 0);
    const bassSeq: Note[] = [];
    for (let i = 0; i < Math.round(totalBeats); i++) {
      bassSeq.push([BASS_PATTERN[i % BASS_PATTERN.length], 1]);
    }
    this.melodyVoice = {
      seq: KOROBEINIKI,
      i: 0,
      nextTime: 0,
      type: "square",
      gain: this.bgmGain,
      peak: 0.32,
    };
    this.bassVoice = {
      seq: bassSeq,
      i: 0,
      nextTime: 0,
      type: "triangle",
      gain: this.bgmGain,
      peak: 0.45,
    };
  }

  resume(): void {
    this.ctx?.resume().catch(() => {});
  }

  private get secPerBeat(): number {
    return 60 / this.bpm;
  }

  /** 레벨 오를수록 템포 ↑ */
  setLevel(level: number): void {
    this.bpm = Math.min(300, 125 + level * 1.6);
  }

  startBgm(): void {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    const t0 = this.ctx.currentTime + 0.1;
    this.melodyVoice.i = 0;
    this.bassVoice.i = 0;
    this.melodyVoice.nextTime = t0;
    this.bassVoice.nextTime = t0;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
  }

  stopBgm(): void {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = 0;
  }

  private schedule(): void {
    if (!this.ctx) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    this.scheduleVoice(this.melodyVoice, horizon);
    this.scheduleVoice(this.bassVoice, horizon);
  }

  private scheduleVoice(v: Voice, horizon: number): void {
    while (v.nextTime < horizon) {
      const [name, beats] = v.seq[v.i];
      const dur = beats * this.secPerBeat;
      if (name !== "REST") {
        this.playTone(v.type, noteToFreq(name), v.nextTime, dur * 0.95, v.gain, v.peak);
      }
      v.nextTime += dur;
      v.i = (v.i + 1) % v.seq.length;
    }
  }

  private playTone(
    type: OscillatorType,
    freq: number,
    start: number,
    dur: number,
    out: GainNode,
    peak: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    const a = 0.006;
    const r = Math.min(0.06, dur * 0.3);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + a);
    g.gain.setValueAtTime(peak, start + Math.max(a, dur - r));
    g.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(g).connect(out);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  sfx(name: SfxName): void {
    if (!this.ctx || !this.sfxEnabled || this.muted) return;
    playSfx(this.ctx, this.sfxGain, name);
  }

  // ── 볼륨/뮤트 ──
  private applyVolumes(): void {
    if (!this.ctx) return;
    this.bgmGain.gain.value = this.muted || !this.bgmEnabled ? 0 : this.bgmVol;
    this.sfxGain.gain.value = this.muted || !this.sfxEnabled ? 0 : this.sfxVol;
  }
  setBgmEnabled(on: boolean): void {
    this.bgmEnabled = on;
    this.applyVolumes();
  }
  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on;
    this.applyVolumes();
  }
  setBgmVolume(v: number): void {
    this.bgmVol = v;
    this.applyVolumes();
  }
  setSfxVolume(v: number): void {
    this.sfxVol = v;
    this.applyVolumes();
  }
  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes();
  }
  isMuted(): boolean {
    return this.muted;
  }
}

// 앱 전역에서 공유하는 단일 인스턴스
export const audio = new ChiptuneEngine();
