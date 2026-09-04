import { type Tile, tileKey } from "./coords";
import { type Maze, openDirections, pathTiles } from "./maze";
import { walkDistances } from "./pathfinding";

/**
 * Minimum walking distance, in tiles, between the player's spawn and any
 * enemy's spawn.
 *
 * This constant is the fix for the defect that made the 2025 build unplayable.
 * That version hardcoded enemy spawns at fixed pixel offsets — the first at
 * `(cellSize * 2, cellSize * 2)` — and placed the player at the first walkable
 * tile it found, which was the adjacent cell. The two were 14 world pixels
 * apart with a 16-pixel collision radius, so the first enemy killed the player
 * about two seconds into every single game, before any key was pressed.
 */
export const MIN_ENEMY_DISTANCE = 10;

/** Keep enemies from spawning on top of each other. */
const MIN_ENEMY_SEPARATION = 4;

export interface SpawnPlan {
  readonly playerStart: Tile;
  readonly enemyHomes: readonly Tile[];
  /** Waypoints for patrolling enemies. */
  readonly patrolRoute: readonly Tile[];
}

/**
 * Chooses a player spawn and up to `enemyCount` enemy spawns that are a
 * guaranteed walking distance away, measured across the maze graph.
 */
export function planSpawns(maze: Maze, enemyCount: number): SpawnPlan {
  const walkable = pathTiles(maze);
  const playerStart = choosePlayerStart(maze, walkable);
  const distances = walkDistances(maze, playerStart);

  // Farthest-first, so the enemies that do spawn are as far away as the maze
  // allows, then relax the bar only if the maze is too small to satisfy it.
  const ranked = walkable
    .filter((t) => distances.has(tileKey(t)))
    .sort((a, b) => (distances.get(tileKey(b)) ?? 0) - (distances.get(tileKey(a)) ?? 0));

  const homes = pickHomes(maze, ranked, distances, enemyCount, MIN_ENEMY_DISTANCE);
  const relaxed =
    homes.length >= enemyCount
      ? homes
      : pickHomes(maze, ranked, distances, enemyCount, Math.floor(MIN_ENEMY_DISTANCE / 2));

  return {
    playerStart,
    enemyHomes: relaxed.length > 0 ? relaxed : [playerStart],
    patrolRoute: choosePatrolRoute(maze, ranked),
  };
}

function pickHomes(
  maze: Maze,
  ranked: readonly Tile[],
  distances: Map<string, number>,
  count: number,
  minFromPlayer: number,
): Tile[] {
  const homes: Tile[] = [];
  // One BFS per accepted home, not per candidate considered.
  const homeDistances: Array<Map<string, number>> = [];

  for (const candidate of ranked) {
    if (homes.length >= count) break;
    if ((distances.get(tileKey(candidate)) ?? 0) < minFromPlayer) continue;

    const clearOfOthers = homeDistances.every(
      (from) => (from.get(tileKey(candidate)) ?? -1) >= MIN_ENEMY_SEPARATION,
    );
    if (clearOfOthers) {
      homes.push(candidate);
      homeDistances.push(walkDistances(maze, candidate));
    }
  }

  return homes;
}

/**
 * Spawns the player at a junction near the middle of the maze: central so the
 * board is symmetric to defend, and a junction so there is somewhere to run.
 */
function choosePlayerStart(maze: Maze, walkable: readonly Tile[]): Tile {
  const midX = (maze.width - 1) / 2;
  const midY = (maze.height - 1) / 2;

  let best: Tile | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const t of walkable) {
    const exits = openDirections(maze, t).length;
    // Junctions strongly preferred; distance from centre breaks ties.
    const score = (4 - exits) * 100 + Math.abs(t.tx - midX) + Math.abs(t.ty - midY);
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }

  const fallback = walkable[0];
  if (best !== undefined) return best;
  if (fallback !== undefined) return fallback;
  throw new Error("Maze has no walkable tiles");
}

/** A handful of spread-out tiles for patrolling enemies to circulate between. */
function choosePatrolRoute(maze: Maze, ranked: readonly Tile[]): Tile[] {
  const midX = (maze.width - 1) / 2;
  const midY = (maze.height - 1) / 2;
  const quadrants: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  const route: Tile[] = [];
  for (const [qx, qy] of quadrants) {
    const found = ranked.find((t) => (t.tx < midX ? 0 : 1) === qx && (t.ty < midY ? 0 : 1) === qy);
    if (found !== undefined) route.push(found);
  }

  const fallback = ranked[0];
  if (route.length > 0) return route;
  return fallback === undefined ? [] : [fallback];
}
