import { type Tile, tilesEqual, type WorldPoint } from "./coords";
import { type Direction, opposite, vector } from "./direction";
import { GridMover } from "./gridMover";
import { isPath, type Maze, openDirections, step, wrap } from "./maze";
import { directionToward, torusDistance } from "./pathfinding";
import type { Rng } from "./rng";

export type EnemyKind = "chaser" | "ambusher" | "patrol" | "wanderer";

export type EnemyMood =
  /** Actively pursuing its target tile. */
  | "hunting"
  /** Power pellet is active: flees, and is edible. */
  | "frightened"
  /** Eaten: heading back to its home tile, harmless on the way. */
  | "returning";

/** How far ahead of the player the ambusher aims, in tiles. */
const AMBUSH_LEAD = 4;

export interface EnemyTarget {
  readonly tile: Tile;
  readonly facing: Direction;
}

export class Enemy {
  readonly kind: EnemyKind;
  readonly homeTile: Tile;
  readonly mover: GridMover;
  mood: EnemyMood = "hunting";
  /** Seconds of frightened time left; only meaningful while frightened. */
  frightenedRemaining = 0;

  private readonly rng: Rng;
  private maze: Maze;
  private patrolIndex = 0;
  private readonly patrolRoute: readonly Tile[];

  constructor(options: {
    maze: Maze;
    kind: EnemyKind;
    homeTile: Tile;
    speed: number;
    rng: Rng;
    patrolRoute?: readonly Tile[];
  }) {
    this.kind = options.kind;
    this.homeTile = options.homeTile;
    this.maze = options.maze;
    this.rng = options.rng;
    this.patrolRoute = options.patrolRoute ?? [options.homeTile];
    this.mover = new GridMover(options.maze, options.homeTile, options.speed);
    this.mover.decide = null; // set by bindTo once a target exists
  }

  get tile(): Tile {
    return this.mover.tile;
  }

  get position(): WorldPoint {
    return this.mover.position;
  }

  get facing(): Direction {
    return this.mover.facing;
  }

  /** True while the player can eat this enemy rather than the reverse. */
  get isEdible(): boolean {
    return this.mood === "frightened";
  }

  /** True while this enemy can take a life. */
  get isDangerous(): boolean {
    return this.mood === "hunting";
  }

  setMaze(maze: Maze, startTile: Tile): void {
    this.maze = maze;
    this.mover.setMaze(maze, startTile);
    this.mood = "hunting";
    this.frightenedRemaining = 0;
  }

  frighten(seconds: number): void {
    if (this.mood === "returning") return;
    this.mood = "frightened";
    this.frightenedRemaining = seconds;
    // Turning tail is the visual cue that the tables have turned.
    const dir = this.mover.dir;
    if (dir !== null) this.mover.request(opposite(dir));
  }

  /** Called when the player eats this enemy. */
  eaten(): void {
    this.mood = "returning";
    this.frightenedRemaining = 0;
  }

  update(dt: number, target: EnemyTarget): void {
    if (this.mood === "frightened") {
      this.frightenedRemaining -= dt;
      if (this.frightenedRemaining <= 0) {
        this.mood = "hunting";
        this.frightenedRemaining = 0;
      }
    }

    if (this.mood === "returning" && tilesEqual(this.mover.tile, this.homeTile)) {
      this.mood = "hunting";
    }

    this.mover.decide = (mover) => this.chooseDirection(mover, target);
    this.mover.update(dt);
  }

  /**
   * Picks a direction at a tile centre.
   *
   * Enemies never reverse mid-corridor — that produced the visible jitter in
   * the old build, where an enemy one tile from the player would oscillate.
   * Reversal is allowed only when it is the sole exit.
   */
  private chooseDirection(mover: GridMover, target: EnemyTarget): Direction | null {
    const exits = openDirections(this.maze, mover.tile);
    if (exits.length === 0) return null;

    const banned = mover.dir === null ? undefined : opposite(mover.dir);
    const allowed = exits.length === 1 ? exits : exits.filter((d) => d !== banned);
    const usable = allowed.length > 0 ? allowed : exits;

    if (this.mood === "frightened") {
      return this.fleeFrom(mover.tile, target.tile, usable);
    }

    const goal = this.mood === "returning" ? this.homeTile : this.goalTile(target);
    const routed = directionToward(
      this.maze,
      mover.tile,
      goal,
      banned === undefined ? {} : { forbidFirst: banned },
    );
    if (routed !== null && usable.includes(routed)) return routed;

    // Unreachable (or the only route reverses): fall back to the exit that
    // reduces distance most, and wander if even that is ambiguous.
    return this.greedyToward(mover.tile, goal, usable);
  }

  private goalTile(target: EnemyTarget): Tile {
    switch (this.kind) {
      case "chaser":
        return target.tile;

      case "ambusher": {
        // Aim where the player is heading, backing off to the nearest walkable
        // tile if the lead point lands inside a wall.
        const v = vector(target.facing);
        for (let lead = AMBUSH_LEAD; lead > 0; lead--) {
          const candidate = wrap(
            this.maze,
            target.tile.tx + v.dtx * lead,
            target.tile.ty + v.dty * lead,
          );
          if (isPath(this.maze, candidate)) return candidate;
        }
        return target.tile;
      }

      case "patrol": {
        const waypoint = this.patrolRoute[this.patrolIndex % this.patrolRoute.length];
        if (waypoint === undefined) return target.tile;
        if (tilesEqual(this.mover.tile, waypoint)) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolRoute.length;
        }
        return waypoint;
      }

      case "wanderer":
        // Heads roughly toward the player but without pathfinding, so it drifts.
        return target.tile;
    }
  }

  private fleeFrom(from: Tile, threat: Tile, usable: readonly Direction[]): Direction | null {
    let best: Direction | null = null;
    let bestDistance = Number.NEGATIVE_INFINITY;
    for (const d of usable) {
      const distance = torusDistance(this.maze, step(this.maze, from, d), threat);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = d;
      }
    }
    return best;
  }

  private greedyToward(from: Tile, goal: Tile, usable: readonly Direction[]): Direction | null {
    if (this.kind === "wanderer" && this.rng.next() < 0.45) {
      return this.rng.pick(usable);
    }

    let best: Direction | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const d of usable) {
      const distance = torusDistance(this.maze, step(this.maze, from, d), goal);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = d;
      }
    }
    return best ?? this.rng.pick(usable);
  }
}
