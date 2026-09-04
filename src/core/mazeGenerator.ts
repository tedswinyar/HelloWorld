import { type Tile, tile } from "./coords";
import { DIRECTIONS, vector } from "./direction";
import { type Cell, isFullyConnected, isPath, type Maze, openDirections, PATH, WALL } from "./maze";
import type { Rng } from "./rng";

export interface MazeOptions {
  /** Odd number >= 7. */
  readonly width: number;
  /** Odd number >= 7. */
  readonly height: number;
  readonly rng: Rng;
  /**
   * Remove dead ends by carving extra connections, turning the perfect maze
   * into a braided one. Defaults to true; set false only to inspect the raw
   * spanning tree in tests.
   */
  readonly braid?: boolean;
  /** Number of horizontal wrap-around tunnels to carve. Defaults to 2. */
  readonly tunnels?: number;
}

/**
 * Generates a braided maze suitable for a chase game.
 *
 * Recursive backtracking alone produces a *perfect* maze: exactly one route
 * between any two cells, and dead ends everywhere. That is the right topology
 * for a puzzle and the wrong one for being chased — the 2025 build shipped it
 * unmodified, so an A* pursuer could herd the player into a pocket with no
 * escape, every time. Braiding (removing dead ends by adding cycles) is what
 * makes the board fair, and no amount of AI tuning substitutes for it.
 */
export function generateMaze(options: MazeOptions): Maze {
  const { rng } = options;
  const width = requireOdd(options.width, "width");
  const height = requireOdd(options.height, "height");
  const shouldBraid = options.braid ?? true;
  const tunnelCount = options.tunnels ?? 2;

  // Requirement 8.4: retry rather than hand back a broken board.
  for (let attempt = 0; attempt < 8; attempt++) {
    const cells = carvePerfectMaze(width, height, rng);
    const maze: Maze = { width, height, cells };

    if (shouldBraid) {
      braid(maze, cells, rng);
    }
    carveWrapTunnels(maze, cells, tunnelCount, rng);

    if (isFullyConnected(maze)) {
      return { width, height, cells };
    }
  }

  throw new Error(`Maze generation failed to produce a connected ${width}x${height} maze`);
}

function requireOdd(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 7 || value % 2 === 0) {
    throw new Error(`Maze ${name} must be an odd integer >= 7, got ${value}`);
  }
  return value;
}

/** Recursive backtracking over the odd-coordinate lattice, iteratively. */
function carvePerfectMaze(width: number, height: number, rng: Rng): Cell[] {
  const cells: Cell[] = new Array<Cell>(width * height).fill(WALL);
  const index = (tx: number, ty: number): number => ty * width + tx;

  const start = tile(1, 1);
  cells[index(start.tx, start.ty)] = PATH;

  const stack: Tile[] = [start];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    if (current === undefined) break;

    // Unvisited rooms are two cells away, with a wall in between.
    const candidates = DIRECTIONS.filter((d) => {
      const v = vector(d);
      const nx = current.tx + v.dtx * 2;
      const ny = current.ty + v.dty * 2;
      return nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && cells[index(nx, ny)] === WALL;
    });

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const direction = rng.pick(candidates);
    const v = vector(direction);
    cells[index(current.tx + v.dtx, current.ty + v.dty)] = PATH;
    cells[index(current.tx + v.dtx * 2, current.ty + v.dty * 2)] = PATH;
    stack.push(tile(current.tx + v.dtx * 2, current.ty + v.dty * 2));
  }

  return cells;
}

/**
 * Removes dead ends by carving one extra exit from each, which converts the
 * spanning tree into a graph with cycles. Mutates `cells` in place.
 */
function braid(maze: Maze, cells: Cell[], rng: Rng): void {
  const index = (tx: number, ty: number): number => ty * maze.width + tx;

  // Each carve can only reduce the dead-end count, but re-scan so that dead
  // ends created by an earlier carve are caught too.
  for (let pass = 0; pass < 4; pass++) {
    const ends = collectDeadEnds(maze);
    if (ends.length === 0) return;

    let carved = 0;
    for (const end of ends) {
      // Re-check: an earlier carve in this pass may have opened this tile.
      if (openDirections(maze, end).length !== 1) continue;

      const candidates = DIRECTIONS.filter((d) => {
        const v = vector(d);
        const wallX = end.tx + v.dtx;
        const wallY = end.ty + v.dty;
        const roomX = end.tx + v.dtx * 2;
        const roomY = end.ty + v.dty * 2;

        // Keep the outer border intact; wrap tunnels are carved deliberately.
        if (wallX <= 0 || wallX >= maze.width - 1 || wallY <= 0 || wallY >= maze.height - 1) {
          return false;
        }
        if (roomX <= 0 || roomX >= maze.width - 1 || roomY <= 0 || roomY >= maze.height - 1) {
          return false;
        }
        return cells[index(wallX, wallY)] === WALL && cells[index(roomX, roomY)] === PATH;
      });

      if (candidates.length === 0) continue;

      const direction = rng.pick(candidates);
      const v = vector(direction);
      cells[index(end.tx + v.dtx, end.ty + v.dty)] = PATH;
      carved++;
    }

    if (carved === 0) return;
  }
}

function collectDeadEnds(maze: Maze): Tile[] {
  const ends: Tile[] = [];
  for (let ty = 1; ty < maze.height - 1; ty++) {
    for (let tx = 1; tx < maze.width - 1; tx++) {
      const t = tile(tx, ty);
      if (isPath(maze, t) && openDirections(maze, t).length === 1) {
        ends.push(t);
      }
    }
  }
  return ends;
}

/**
 * Carves left/right border openings on interior corridor rows so the torus
 * actually connects, giving the classic side tunnels.
 */
function carveWrapTunnels(maze: Maze, cells: Cell[], count: number, rng: Rng): void {
  if (count <= 0) return;
  const index = (tx: number, ty: number): number => ty * maze.width + tx;

  // Odd rows are corridor rows; column 1 and width-2 are their end rooms.
  const rows: number[] = [];
  for (let ty = 1; ty < maze.height - 1; ty += 2) {
    if (cells[index(1, ty)] === PATH && cells[index(maze.width - 2, ty)] === PATH) {
      rows.push(ty);
    }
  }

  for (const ty of rng.shuffle(rows).slice(0, count)) {
    cells[index(0, ty)] = PATH;
    cells[index(maze.width - 1, ty)] = PATH;
  }
}
