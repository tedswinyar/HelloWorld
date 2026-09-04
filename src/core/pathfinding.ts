import { type Tile, tileKey } from "./coords";
import type { Direction } from "./direction";
import { isPath, type Maze, openDirections, step } from "./maze";

/**
 * Shortest tile distance allowing for wrap-around.
 *
 * Plain Manhattan distance is not the right heuristic on a torus — it
 * overestimates whenever going the other way round is shorter, which would make
 * A* return non-optimal paths through the wrap tunnels.
 */
export function torusDistance(maze: Maze, a: Tile, b: Tile): number {
  const dx = Math.abs(a.tx - b.tx);
  const dy = Math.abs(a.ty - b.ty);
  return Math.min(dx, maze.width - dx) + Math.min(dy, maze.height - dy);
}

interface HeapEntry {
  readonly tile: Tile;
  readonly priority: number;
}

/** Minimal binary min-heap; A* runs several times a second per enemy. */
class MinHeap {
  private readonly items: HeapEntry[] = [];

  get size(): number {
    return this.items.length;
  }

  push(entry: HeapEntry): void {
    this.items.push(entry);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const a = this.items[i];
      const b = this.items[parent];
      if (a === undefined || b === undefined || b.priority <= a.priority) break;
      this.items[i] = b;
      this.items[parent] = a;
      i = parent;
    }
  }

  pop(): HeapEntry | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (top === undefined) return undefined;
    if (this.items.length === 0 || last === undefined) return top;

    this.items[0] = last;
    let i = 0;
    for (;;) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      const current = this.items[smallest];
      const l = this.items[left];
      const r = this.items[right];
      if (current === undefined) break;
      if (l !== undefined && l.priority < current.priority) smallest = left;
      const best = this.items[smallest];
      if (best !== undefined && r !== undefined && r.priority < best.priority) smallest = right;
      if (smallest === i) break;
      const swap = this.items[smallest];
      const here = this.items[i];
      if (swap === undefined || here === undefined) break;
      this.items[i] = swap;
      this.items[smallest] = here;
      i = smallest;
    }
    return top;
  }
}

/**
 * Path distance in tiles from `from` to every reachable tile, keyed by
 * `tileKey`. Used to place spawns a guaranteed distance apart — straight-line
 * distance is not good enough, because a wall can make two tiles that look
 * adjacent a long walk apart, and vice versa.
 */
export function walkDistances(maze: Maze, from: Tile): Map<string, number> {
  const distances = new Map<string, number>();
  if (!isPath(maze, from)) return distances;

  distances.set(tileKey(from), 0);
  const queue: Tile[] = [from];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === undefined) continue;
    const distance = distances.get(tileKey(current)) ?? 0;

    for (const direction of openDirections(maze, current)) {
      const next = step(maze, current, direction);
      const key = tileKey(next);
      if (!distances.has(key)) {
        distances.set(key, distance + 1);
        queue.push(next);
      }
    }
  }

  return distances;
}

export interface PathOptions {
  /**
   * A direction the path may not start with, used to stop enemies from
   * reversing on the spot and jittering in place.
   */
  readonly forbidFirst?: Direction;
}

/**
 * A* from `from` to `to` across walkable tiles.
 * Returns the tiles to walk through, excluding `from` and including `to`, or an
 * empty array when no route exists.
 */
export function findPath(maze: Maze, from: Tile, to: Tile, options: PathOptions = {}): Tile[] {
  if (!isPath(maze, from) || !isPath(maze, to)) return [];

  const startKey = tileKey(from);
  const goalKey = tileKey(to);
  if (startKey === goalKey) return [];

  const cameFrom = new Map<string, Tile>();
  const costSoFar = new Map<string, number>([[startKey, 0]]);
  const open = new MinHeap();
  open.push({ tile: from, priority: torusDistance(maze, from, to) });

  while (open.size > 0) {
    const current = open.pop();
    if (current === undefined) break;
    const currentKey = tileKey(current.tile);

    if (currentKey === goalKey) {
      return reconstruct(cameFrom, from, to);
    }

    const isStart = currentKey === startKey;
    for (const direction of openDirections(maze, current.tile)) {
      if (isStart && options.forbidFirst === direction) continue;

      const next = step(maze, current.tile, direction);
      const nextKey = tileKey(next);
      const nextCost = (costSoFar.get(currentKey) ?? 0) + 1;

      if (nextCost < (costSoFar.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        costSoFar.set(nextKey, nextCost);
        cameFrom.set(nextKey, current.tile);
        open.push({ tile: next, priority: nextCost + torusDistance(maze, next, to) });
      }
    }
  }

  return [];
}

function reconstruct(cameFrom: Map<string, Tile>, from: Tile, to: Tile): Tile[] {
  const path: Tile[] = [];
  let cursor: Tile | undefined = to;
  const fromKey = tileKey(from);

  while (cursor !== undefined && tileKey(cursor) !== fromKey) {
    path.push(cursor);
    cursor = cameFrom.get(tileKey(cursor));
  }

  return path.reverse();
}

/**
 * The direction to take from `from` to make progress toward `to`,
 * or null when unreachable.
 */
export function directionToward(
  maze: Maze,
  from: Tile,
  to: Tile,
  options: PathOptions = {},
): Direction | null {
  const path = findPath(maze, from, to, options);
  const next = path[0];
  if (next === undefined) return null;

  for (const direction of openDirections(maze, from)) {
    const candidate = step(maze, from, direction);
    if (candidate.tx === next.tx && candidate.ty === next.ty) return direction;
  }
  return null;
}
