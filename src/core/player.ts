import type { Tile, WorldPoint } from "./coords";
import type { Direction } from "./direction";
import { GridMover } from "./gridMover";
import type { Maze } from "./maze";

/** World pixels per second at level 1. */
export const BASE_PLAYER_SPEED = 132;

export class Player {
  readonly mover: GridMover;
  /** Seconds of movement so far, driving the mouth animation. */
  animationTime = 0;

  constructor(maze: Maze, startTile: Tile, speed: number = BASE_PLAYER_SPEED) {
    this.mover = new GridMover(maze, startTile, speed);
    this.mover.facing = "right";
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

  get isMoving(): boolean {
    return this.mover.isMoving;
  }

  get speed(): number {
    return this.mover.speed;
  }

  set speed(value: number) {
    this.mover.speed = Math.max(0, value);
  }

  request(direction: Direction): void {
    this.mover.request(direction);
  }

  update(dt: number): void {
    this.mover.update(dt);
    if (this.mover.isMoving) this.animationTime += dt;
  }
}
