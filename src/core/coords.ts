/**
 * Three coordinate spaces, kept apart by their field names.
 *
 * The 2025 version of this game conflated all three — it would call
 * `Math.floor(this.x / cellSize)` in one place and `mazeRenderer.worldToGrid()`
 * in another, and the two disagreed. Using distinct field names per space means
 * the compiler rejects the mix-up outright, which is cheaper than the tests
 * that used to chase the symptoms.
 *
 *   Tile   — integer maze cell indices          (tx, ty)
 *   World  — pixels in maze space, origin at the maze's top-left  (wx, wy)
 *   Screen — pixels in canvas space, after the camera transform   (sx, sy)
 */

/** Width and height of one maze cell, in world pixels. */
export const CELL_SIZE = 24;

export interface Tile {
  readonly tx: number;
  readonly ty: number;
}

export interface WorldPoint {
  readonly wx: number;
  readonly wy: number;
}

export interface ScreenPoint {
  readonly sx: number;
  readonly sy: number;
}

export interface Camera {
  /** World coordinate shown at the canvas origin. */
  readonly wx: number;
  readonly wy: number;
  readonly width: number;
  readonly height: number;
}

export function tile(tx: number, ty: number): Tile {
  return { tx, ty };
}

export function tilesEqual(a: Tile, b: Tile): boolean {
  return a.tx === b.tx && a.ty === b.ty;
}

/** World position of the centre of a tile. Actors always sit on this lattice. */
export function tileCentre(t: Tile): WorldPoint {
  return {
    wx: t.tx * CELL_SIZE + CELL_SIZE / 2,
    wy: t.ty * CELL_SIZE + CELL_SIZE / 2,
  };
}

/** World position of a tile's top-left corner, for drawing cell rectangles. */
export function tileTopLeft(t: Tile): WorldPoint {
  return { wx: t.tx * CELL_SIZE, wy: t.ty * CELL_SIZE };
}

/** The tile containing a world point. */
export function worldToTile(p: WorldPoint): Tile {
  return {
    tx: Math.floor(p.wx / CELL_SIZE),
    ty: Math.floor(p.wy / CELL_SIZE),
  };
}

export function worldToScreen(p: WorldPoint, camera: Camera): ScreenPoint {
  return { sx: p.wx - camera.wx, sy: p.wy - camera.wy };
}

/** Straight-line world distance, used for actor-vs-actor collision. */
export function worldDistance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.wx - b.wx, a.wy - b.wy);
}

/** Manhattan distance in tiles, used as the A* heuristic. */
export function tileDistance(a: Tile, b: Tile): number {
  return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
}

/** Stable string key for a tile, for use in Set/Map. */
export function tileKey(t: Tile): string {
  return `${t.tx},${t.ty}`;
}
