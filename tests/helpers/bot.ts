import { type Tile, tileKey } from "../../src/core/coords";
import type { Direction } from "../../src/core/direction";
import type { Game } from "../../src/core/game";
import { type Maze, openDirections, step } from "../../src/core/maze";

/**
 * A bot that plays the game: it walks toward pellets and routes around ghosts.
 *
 * This exists because the single largest defect in the 2025 build — an enemy
 * spawning on the player and killing them within two seconds of every game —
 * survived 301 tests and three sessions of work. Not one of those tests played
 * the game. A bot that does is the cheapest possible guard against a whole class
 * of "technically passes, actually unplayable" regressions: if the board cannot
 * be cleared, or the ghosts are unfairly fast, or a corridor is a death trap,
 * the bot's score stops climbing and the suite says so.
 *
 * It is deliberately simple — greedy nearest-pellet with a danger buffer — so
 * that it measures the *game*, not the cleverness of the bot.
 */

/** Tiles this close to a hunting enemy are treated as off limits. */
const DANGER_RADIUS = 3;

export type TilePredicate = (game: Game, t: Tile) => boolean;

const seekAnyPellet: TilePredicate = (game, t) => game.pellets.kindAt(t) !== null;

/** Tiles within `radius` steps of any enemy that can currently take a life. */
export function dangerTiles(game: Game, radius: number = DANGER_RADIUS): Set<string> {
  const danger = new Set<string>();

  for (const enemy of game.enemies) {
    if (!enemy.isDangerous) continue;

    const seen = new Set<string>([tileKey(enemy.tile)]);
    let frontier: Tile[] = [enemy.tile];
    danger.add(tileKey(enemy.tile));

    for (let depth = 0; depth < radius; depth++) {
      const next: Tile[] = [];
      for (const current of frontier) {
        for (const direction of openDirections(game.maze, current)) {
          const neighbour = step(game.maze, current, direction);
          const key = tileKey(neighbour);
          if (seen.has(key)) continue;
          seen.add(key);
          danger.add(key);
          next.push(neighbour);
        }
      }
      frontier = next;
    }
  }

  return danger;
}

/**
 * Breadth-first search for the first step toward the nearest tile satisfying
 * `accept`, skipping any tile in `avoid`. Returns null when there is no route,
 * or when `from` is itself a goal and the bot should simply hold its course.
 */
export function directionTowardNearest(
  game: Game,
  from: Tile,
  accept: TilePredicate,
  avoid: ReadonlySet<string> = new Set(),
): Direction | null {
  const { maze } = game;

  // Already heading somewhere worth arriving at: hold course. Without this the
  // search skips its own start tile, so a bot approaching the last pellet in a
  // corridor would be routed at the pellet *behind* it, reverse mid-tile, and
  // then oscillate between the same two tiles forever.
  if (accept(game, from) && !avoid.has(tileKey(from))) return null;

  const firstStep = new Map<string, Direction>();
  const seen = new Set<string>([tileKey(from)]);
  const queue: Tile[] = [];

  for (const direction of openDirections(maze, from)) {
    const next = step(maze, from, direction);
    const key = tileKey(next);
    if (seen.has(key) || avoid.has(key)) continue;
    seen.add(key);
    firstStep.set(key, direction);
    queue.push(next);
  }

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === undefined) continue;
    const inherited = firstStep.get(tileKey(current));
    if (inherited === undefined) continue;

    if (accept(game, current)) return inherited;

    for (const direction of openDirections(maze, current)) {
      const next = step(maze, current, direction);
      const key = tileKey(next);
      if (seen.has(key) || avoid.has(key)) continue;
      seen.add(key);
      firstStep.set(key, inherited);
      queue.push(next);
    }
  }

  return null;
}

/** The open direction from `from` that gets furthest from the danger zone. */
function directionAwayFromDanger(
  game: Game,
  from: Tile,
  danger: ReadonlySet<string>,
): Direction | null {
  let best: Direction | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const direction of openDirections(game.maze, from)) {
    const candidate = step(game.maze, from, direction);
    // Prefer a safe tile; among safe tiles prefer one with more ways out, so
    // the bot does not back itself into a pocket.
    const safe = danger.has(tileKey(candidate)) ? 0 : 10;
    const score = safe + openDirections(game.maze, candidate).length;
    if (score > bestScore) {
      bestScore = score;
      best = direction;
    }
  }

  return best;
}

/**
 * The tile the bot should plan from: the one it is about to arrive at, or the
 * one it is sitting on when stopped.
 *
 * Planning from the *current* tile would be a tile too late. A turn requested
 * part-way along an edge is buffered until the next centre, so the decision has
 * to be made for the junction being approached — which is exactly how a person
 * plays, pressing the key just before the corner.
 */
function decisionTile(maze: Maze, game: Game): Tile {
  const { mover } = game.player;
  if (mover.dir === null) return mover.tile;
  return step(maze, mover.tile, mover.dir);
}

export interface PlayResult {
  readonly simulatedSeconds: number;
  readonly steps: number;
  readonly deaths: number;
}

export interface PlayOptions {
  readonly seconds: number;
  readonly step?: number;
  readonly until?: (game: Game) => boolean;
  /** Which tiles count as a goal; defaults to any remaining pellet. */
  readonly seek?: TilePredicate;
  /** Set false to make the bot ignore enemies entirely. */
  readonly avoidEnemies?: boolean;
}

/**
 * Runs the bot for up to `seconds` of simulated time at a fixed step,
 * stopping early when `until` is satisfied.
 */
export function playWithBot(game: Game, options: PlayOptions): PlayResult {
  const dt = options.step ?? 1 / 120;
  const maxSteps = Math.ceil(options.seconds / dt);
  const seek = options.seek ?? seekAnyPellet;
  const avoidEnemies = options.avoidEnemies ?? true;

  let lastPlannedFrom = "";
  let livesSeen = game.lives;
  let deaths = 0;

  for (let i = 0; i < maxSteps; i++) {
    if (options.until?.(game) === true) {
      return { simulatedSeconds: i * dt, steps: i, deaths };
    }

    const from = decisionTile(game.maze, game);
    const key = tileKey(from);
    // Re-plan on entering a new tile, and whenever danger is in play, since the
    // ghosts move while the bot is committed to an edge.
    const danger = avoidEnemies ? dangerTiles(game) : new Set<string>();
    const threatened = avoidEnemies && danger.has(key);

    if (key !== lastPlannedFrom || threatened) {
      lastPlannedFrom = key;
      const direction =
        directionTowardNearest(game, from, seek, danger) ??
        (threatened ? directionAwayFromDanger(game, from, danger) : null) ??
        directionTowardNearest(game, from, seek);
      if (direction !== null) game.requestDirection(direction);
    }

    game.update(dt);

    if (game.lives < livesSeen) {
      deaths += livesSeen - game.lives;
      livesSeen = game.lives;
    }
  }

  return { simulatedSeconds: maxSteps * dt, steps: maxSteps, deaths };
}

/** A single decision from the player's current tile, for focused tests. */
export function directionTowardNearestPellet(game: Game): Direction | null {
  return directionTowardNearest(game, game.player.tile, seekAnyPellet);
}
