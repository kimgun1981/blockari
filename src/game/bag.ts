// bag.ts — 7-bag 랜덤 생성기. 7개 피스를 섞어 한 묶음씩 배출.

import { PIECE_TYPES, type PieceType } from "./Piece";
import type { Rng } from "./rng";

export class Bag {
  private queue: PieceType[] = [];

  // rng를 주입하면 시드 기반 결정적 생성 (일일 챌린지·리플레이)
  constructor(private rng: Rng = Math.random) {}

  private refill(): void {
    const bag = [...PIECE_TYPES];
    // Fisher–Yates 셔플
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.queue.push(...bag);
  }

  next(): PieceType {
    if (this.queue.length === 0) this.refill();
    return this.queue.shift()!;
  }
}
