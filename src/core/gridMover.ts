import { CELL_SIZE, type Tile, tileCentre, type WorldPoint } from "./coords";
import { type Direction, opposite, vector } from "./direction";
import { isPath, type Maze, step } from "./maze";

/** Float slop for comparing an offset against a cell boundary. */
const EPSILON = 1e-9;

/**
 * Chooses a direction when the mover reaches a tile centre. Returning null
 * leaves the existing buffered direction alone. Enemies use this to run their
 * AI; the player leaves it unset and feeds `request()` from the keyboard.
 */
export type CentreDecision = (mover: GridMover) => Direction | null;

/**
 * Tile-to-tile movement along the maze graph.
 *
 * A mover is always *on an edge of the maze graph*: it sits at `tile` and has
 * travelled `offset` pixels from that tile's centre toward `dir`. Reaching
 * `CELL_SIZE` means arriving at the next tile, and only at a tile centre can it
 * turn. Wall collision is therefore a single lookup — "is the next tile a
 * wall?" — and being between two open tiles is, by construction, always legal.
 *
 * The 2025 version instead let the player float at arbitrary pixel coordinates
 * and tested four corners of a 16px box against 20px cells, leaving 2px of
 * clearance. Turns were then rescued by snapping to a cell centre. That model
 * produced the bug swarm the old suite chased — `NoMidwayStop`,
 * `AntiMidwayStop`, `TurnIntoWallTest`, `WallCollisionDebug` — and none of those
 * failure modes can be expressed in this one.
 *
 * Two further properties the old model lacked:
 *
 *  - **Framerate independence.** `speed` is world pixels per *second* and
 *    `update` consumes a real delta. The old `speed = 2` was pixels per *frame*
 *    and `handleMovement(deltaTime)` ignored its argument entirely, so the game
 *    ran at double speed on a 120Hz display.
 *  - **Turn buffering.** A direction requested before an intersection is held
 *    and applied on arrival. The old code deleted an unusable request outright
 *    (`// If queued direction is invalid, clear it to prevent stopping`),
 *    which is the single biggest reason it felt unresponsive.
 */
export class GridMover {
  tile: Tile;
  /** Direction of travel, or null when stopped against a wall. */
  dir: Direction | null = null;
  /** Direction requested but not yet applied; survives until it becomes legal. */
  desired: Direction | null = null;
  /** Last direction actually travelled, kept for rendering while stopped. */
  facing: Direction = "left";
  /** Pixels travelled from `tile`'s centre toward `dir`, in [0, CELL_SIZE). */
  offset = 0;
  /** World pixels per second. */
  speed: number;
  /** Optional AI hook, consulted at each tile centre. */
  decide: CentreDecision | null = null;

  private maze: Maze;

  constructor(maze: Maze, startTile: Tile, speed: number) {
    this.maze = maze;
    this.tile = startTile;
    this.speed = speed;
  }

  get position(): WorldPoint {
    const centre = tileCentre(this.tile);
    if (this.dir === null || this.offset === 0) return centre;
    const v = vector(this.dir);
    return {
      wx: centre.wx + v.dtx * this.offset,
      wy: centre.wy + v.dty * this.offset,
    };
  }

  get atTileCentre(): boolean {
    return this.offset === 0;
  }

  get isMoving(): boolean {
    return this.dir !== null;
  }

  /** Swaps in a new maze (new level) and parks the mover at `startTile`. */
  setMaze(maze: Maze, startTile: Tile): void {
    this.maze = maze;
    this.placeAt(startTile);
  }

  /** Teleports to a tile centre and clears all motion state. */
  placeAt(t: Tile): void {
    this.tile = t;
    this.offset = 0;
    this.dir = null;
    this.desired = null;
  }

  /** True if the tile one step in `d` is walkable. */
  canMove(d: Direction): boolean {
    return isPath(this.maze, step(this.maze, this.tile, d));
  }

  /**
   * Requests a direction change.
   *
   * A reversal is applied immediately, mid-tile, preserving world position —
   * turning back the way you came never needs to wait for an intersection.
   * Anything else is buffered until the mover reaches a centre where it is
   * legal, which is what makes tight corners feel responsive.
   */
  request(d: Direction): void {
    if (this.dir !== null && this.offset > 0 && d === opposite(this.dir)) {
      // Re-anchor to the tile ahead and measure back toward it: same point in
      // world space, opposite heading.
      this.tile = step(this.maze, this.tile, this.dir);
      this.offset = CELL_SIZE - this.offset;
      this.dir = d;
      this.facing = d;
      this.desired = null;
      return;
    }
    this.desired = d;
  }

  /** Clears motion but keeps the mover where it is. */
  halt(): void {
    this.dir = null;
    this.desired = null;
  }

  /**
   * Advances by `dt` seconds, crossing as many tile boundaries as the elapsed
   * time allows and re-deciding direction at each centre.
   */
  update(dt: number): void {
    let remaining = this.speed * dt;
    if (remaining <= 0) return;

    // Decide exactly once per tile centre — including the centre the mover
    // lands on as its last act, so that after update() returns, a mover
    // resting at a centre has already committed to its next direction.
    let needsDecision = this.offset === 0;

    // Bounded so a pathological dt can never spin here forever.
    for (let guard = 0; guard < 256; guard++) {
      if (needsDecision) {
        if (!this.chooseAtCentre()) return; // Stopped, nothing legal buffered.
        needsDecision = false;
      }

      const dir = this.dir;
      if (dir === null) return;

      const advance = Math.min(remaining, CELL_SIZE - this.offset);
      this.offset += advance;
      remaining -= advance;

      if (this.offset >= CELL_SIZE - EPSILON) {
        this.tile = step(this.maze, this.tile, dir);
        this.offset = 0;
        needsDecision = true;
      }

      if (remaining <= EPSILON) {
        if (needsDecision) this.chooseAtCentre();
        return;
      }
    }
  }

  /**
   * Picks the direction to leave the current tile centre by.
   * Returns false when nothing is legal, leaving the mover stopped.
   */
  private chooseAtCentre(): boolean {
    if (this.decide !== null) {
      const chosen = this.decide(this);
      if (chosen !== null) this.desired = chosen;
    }

    const desired = this.desired;
    if (desired !== null && this.canMove(desired)) {
      this.dir = desired;
      this.facing = desired;
      this.desired = null;
      return true;
    }

    // Hold the buffered request — it may become legal at a later intersection.
    if (this.dir !== null && this.canMove(this.dir)) {
      this.facing = this.dir;
      return true;
    }

    this.dir = null;
    return false;
  }
}
