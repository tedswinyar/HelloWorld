import { type Tile, tile } from "./coords";
import { DIRECTIONS, type Direction, vector } from "./direction";

export const PATH = 0;
export const WALL = 1;
export type Cell = typeof PATH | typeof WALL;

/**
 * A maze is a torus: tile coordinates wrap in both axes.
 *
 * This is the whole of requirement 1.4 ("wrap around to the opposite side").
 * The 2025 version implemented wrapping as ~80 lines of `handleEdgeWrapping`
 * running every frame, teleporting the player whenever it drifted near an edge,
 * with an unreachable "corner cases" branch bolted on the end. Making the
 * coordinate space itself toroidal deletes all of that: `step` is total, always
 * returns a real tile, and wrapping only actually lets you *through* an edge
 * where the generator has carved a tunnel.
 */
export interface Maze {
  readonly width: number;
  readonly height: number;
  /** Row-major, length width * height. */
  readonly cells: readonly Cell[];
}

/** Wraps a raw coordinate pair onto the torus. */
export function wrap(maze: Maze, tx: number, ty: number): Tile {
  const x = ((tx % maze.width) + maze.width) % maze.width;
  const y = ((ty % maze.height) + maze.height) % maze.height;
  return tile(x, y);
}

/**
 * Total cell accessor — out-of-range coordinates wrap rather than returning
 * undefined, so no caller ever needs a bounds check or a null guard.
 */
export function cellAt(maze: Maze, tx: number, ty: number): Cell {
  const t = wrap(maze, tx, ty);
  const cell = maze.cells[t.ty * maze.width + t.tx];
  return cell ?? WALL;
}

export function isWall(maze: Maze, t: Tile): boolean {
  return cellAt(maze, t.tx, t.ty) === WALL;
}

export function isPath(maze: Maze, t: Tile): boolean {
  return !isWall(maze, t);
}

/** The neighbouring tile one step in `d`, wrapped onto the torus. */
export function step(maze: Maze, t: Tile, d: Direction): Tile {
  const v = vector(d);
  return wrap(maze, t.tx + v.dtx, t.ty + v.dty);
}

/** Directions from `t` that lead onto a path tile. */
export function openDirections(maze: Maze, t: Tile): Direction[] {
  return DIRECTIONS.filter((d) => isPath(maze, step(maze, t, d)));
}

/** Path tiles adjacent to `t`. */
export function openNeighbours(maze: Maze, t: Tile): Tile[] {
  return openDirections(maze, t).map((d) => step(maze, t, d));
}

/** Every path tile in the maze, in row-major order. */
export function pathTiles(maze: Maze): Tile[] {
  const tiles: Tile[] = [];
  for (let ty = 0; ty < maze.height; ty++) {
    for (let tx = 0; tx < maze.width; tx++) {
      if (cellAt(maze, tx, ty) === PATH) {
        tiles.push(tile(tx, ty));
      }
    }
  }
  return tiles;
}

/**
 * Tiles with exactly one exit. A chase game wants none of these: being herded
 * into a dead end by an A* pursuer is unsurvivable rather than difficult.
 */
export function deadEnds(maze: Maze): Tile[] {
  return pathTiles(maze).filter((t) => openDirections(maze, t).length === 1);
}

/** True if every path tile is reachable from every other (requirement 8.2). */
export function isFullyConnected(maze: Maze): boolean {
  const all = pathTiles(maze);
  const first = all[0];
  if (first === undefined) return true;

  const seen = new Set<number>([first.ty * maze.width + first.tx]);
  const queue: Tile[] = [first];

  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) break;
    for (const neighbour of openNeighbours(maze, current)) {
      const index = neighbour.ty * maze.width + neighbour.tx;
      if (!seen.has(index)) {
        seen.add(index);
        queue.push(neighbour);
      }
    }
  }

  return seen.size === all.length;
}
