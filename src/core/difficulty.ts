import { BASE_PLAYER_SPEED } from "./player";

/**
 * Difficulty curve, as pure functions of the level number.
 *
 * Kept out of the Game class so the curve's invariants can be asserted
 * directly for every level, rather than only for whichever levels a test
 * happens to be able to reach by playing.
 */

const BASE_ENEMY_SPEED = 104;
/** Enemies never get closer than this fraction of the player's speed. */
const ENEMY_SPEED_CEILING = 0.94;

export function playerSpeedForLevel(level: number): number {
  return Math.min(BASE_PLAYER_SPEED * 1.35, BASE_PLAYER_SPEED * (1 + (level - 1) * 0.03));
}

/**
 * Enemies stay strictly slower than the player at every level.
 *
 * Outrunning them down a corridor has to remain possible or extra difficulty
 * stops being difficulty and just becomes unfairness — you would lose to
 * arithmetic rather than to a mistake.
 */
export function enemySpeedForLevel(level: number): number {
  const raw = BASE_ENEMY_SPEED * (1 + (level - 1) * 0.045);
  return Math.min(raw, playerSpeedForLevel(level) * ENEMY_SPEED_CEILING);
}

export function enemyCountForLevel(level: number): number {
  return Math.min(5, 2 + Math.floor((level - 1) / 2));
}

/** Seconds of power-pellet effect, shortening as levels climb. */
export function powerDurationForLevel(level: number): number {
  return Math.max(4, 9 - (level - 1) * 0.35);
}

/** Longest a power phase can last, used to scale the HUD meter. */
export const MAX_POWER_DURATION = powerDurationForLevel(1);

export function pelletDensityForLevel(level: number): number {
  return Math.max(0.45, 0.85 - (level - 1) * 0.02);
}

export function powerPelletCountForLevel(level: number): number {
  return level % 5 === 0 ? 5 : 4;
}

export interface MazeSize {
  readonly width: number;
  readonly height: number;
}

/** The board grows every third level, up to a size A* still handles cheaply. */
export function mazeSizeForLevel(level: number): MazeSize {
  const growths = Math.floor(level / 3);
  return {
    width: Math.min(61, 41 + growths * 4),
    height: Math.min(41, 27 + growths * 2),
  };
}
