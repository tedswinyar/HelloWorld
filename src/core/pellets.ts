import { type Tile, tileKey } from "./coords";
import { type Maze, pathTiles } from "./maze";
import type { Rng } from "./rng";

export type PelletKind = "normal" | "power";

export const PELLET_POINTS: Record<PelletKind, number> = {
  normal: 10,
  power: 50,
};

export interface PelletOptions {
  readonly maze: Maze;
  readonly rng: Rng;
  /** Fraction of walkable tiles that get a normal pellet, 0..1. */
  readonly density: number;
  readonly powerPelletCount: number;
  /** Tiles left deliberately empty, e.g. the player's spawn. */
  readonly exclude?: readonly Tile[];
}

/**
 * Pellets live on tiles, and are collected by *occupying* the tile.
 *
 * The 2025 version did radius-overlap tests between a floating player position
 * and every pellet's world coordinates each frame. Because actors are now
 * always on the maze graph, "am I on a pellet" is one map lookup, and there is
 * no tuning parameter that can make a pellet unreachable or double-collected.
 */
export class PelletField {
  private readonly pellets = new Map<string, PelletKind>();
  private collected = 0;
  private initialTotal = 0;

  static generate(options: PelletOptions): PelletField {
    const { maze, rng, density, powerPelletCount } = options;
    const field = new PelletField();

    const excluded = new Set((options.exclude ?? []).map(tileKey));
    const candidates = pathTiles(maze).filter((t) => !excluded.has(tileKey(t)));

    for (const t of candidates) {
      if (rng.next() < density) field.pellets.set(tileKey(t), "normal");
    }

    for (const t of choosePowerTiles(maze, candidates, powerPelletCount)) {
      field.pellets.set(tileKey(t), "power");
    }

    field.initialTotal = field.pellets.size;
    return field;
  }

  get remaining(): number {
    return this.pellets.size;
  }

  get total(): number {
    return this.initialTotal;
  }

  get collectedCount(): number {
    return this.collected;
  }

  get allCollected(): boolean {
    return this.initialTotal > 0 && this.pellets.size === 0;
  }

  kindAt(t: Tile): PelletKind | null {
    return this.pellets.get(tileKey(t)) ?? null;
  }

  /** Removes and returns the pellet on `t`, or null if there wasn't one. */
  collect(t: Tile): PelletKind | null {
    const key = tileKey(t);
    const kind = this.pellets.get(key);
    if (kind === undefined) return null;
    this.pellets.delete(key);
    this.collected++;
    return kind;
  }

  /** Every remaining pellet, for rendering. */
  entries(): Array<{ tile: Tile; kind: PelletKind }> {
    const out: Array<{ tile: Tile; kind: PelletKind }> = [];
    for (const [key, kind] of this.pellets) {
      const [tx, ty] = key.split(",").map(Number);
      if (tx !== undefined && ty !== undefined) out.push({ tile: { tx, ty }, kind });
    }
    return out;
  }
}

/**
 * Puts power pellets in the outermost walkable tile of each quadrant, the way
 * the arcade original does, so they are spread out and worth travelling for
 * rather than clustered by chance.
 */
function choosePowerTiles(maze: Maze, candidates: readonly Tile[], count: number): Tile[] {
  if (count <= 0 || candidates.length === 0) return [];

  const midX = (maze.width - 1) / 2;
  const midY = (maze.height - 1) / 2;
  const quadrants: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];

  const chosen: Tile[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    const quadrant = quadrants[i % quadrants.length];
    if (quadrant === undefined) continue;
    const [qx, qy] = quadrant;

    // Corner of this quadrant, then the free tile nearest to it.
    const cornerX = qx === 0 ? 1 : maze.width - 2;
    const cornerY = qy === 0 ? 1 : maze.height - 2;

    let best: Tile | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const t of candidates) {
      if (used.has(tileKey(t))) continue;
      const inQuadrant = (t.tx < midX ? 0 : 1) === qx && (t.ty < midY ? 0 : 1) === qy;
      const score = Math.abs(t.tx - cornerX) + Math.abs(t.ty - cornerY) + (inQuadrant ? 0 : 1000);
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }

    if (best !== undefined) {
      used.add(tileKey(best));
      chosen.push(best);
    }
  }

  return chosen;
}
