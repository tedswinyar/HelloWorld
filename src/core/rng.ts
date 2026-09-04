/**
 * Small seedable PRNG (mulberry32).
 *
 * The maze generator and the AI both need randomness, and the 2025 version
 * reached straight for `Math.random()`. That made every maze test either
 * tautological or flaky, so the suite tested trivia instead of the actual
 * generated structure. With an injectable seed, tests can assert real
 * properties of real mazes and still be deterministic.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Uniform choice; throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** In-place Fisher-Yates shuffle, returning the same array. */
  shuffle<T>(items: T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (n: number): number => Math.floor(next() * n);

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      const chosen = items[int(items.length)];
      if (chosen === undefined) {
        throw new Error("Rng.pick called with an empty list");
      }
      return chosen;
    },
    shuffle<T>(items: T[]): T[] {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const a = items[i];
        const b = items[j];
        if (a !== undefined && b !== undefined) {
          items[i] = b;
          items[j] = a;
        }
      }
      return items;
    },
  };
}
