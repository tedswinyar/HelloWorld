import { describe, expect, it } from "vitest";
import { tileKey } from "../src/core/coords";
import { isPath } from "../src/core/maze";
import { generateMaze } from "../src/core/mazeGenerator";
import { walkDistances } from "../src/core/pathfinding";
import { createRng } from "../src/core/rng";
import { MIN_ENEMY_DISTANCE, planSpawns } from "../src/core/spawns";

const SEEDS = [1, 7, 42, 1337, 20260903, 55, 808, 12345];

describe("planSpawns", () => {
  it.each(SEEDS)("keeps every enemy at least %s tiles' walk from the player — seed %i", (seed) => {
    const maze = generateMaze({ width: 41, height: 27, rng: createRng(seed) });
    const plan = planSpawns(maze, 4);
    const distances = walkDistances(maze, plan.playerStart);

    expect(plan.enemyHomes).toHaveLength(4);
    for (const home of plan.enemyHomes) {
      const distance = distances.get(tileKey(home));
      expect(distance).toBeDefined();
      expect(distance).toBeGreaterThanOrEqual(MIN_ENEMY_DISTANCE);
    }
  });

  it.each(SEEDS)("places all spawns on walkable tiles — seed %i", (seed) => {
    const maze = generateMaze({ width: 31, height: 21, rng: createRng(seed) });
    const plan = planSpawns(maze, 4);

    expect(isPath(maze, plan.playerStart)).toBe(true);
    for (const home of plan.enemyHomes) expect(isPath(maze, home)).toBe(true);
    for (const waypoint of plan.patrolRoute) expect(isPath(maze, waypoint)).toBe(true);
  });

  it("never puts two enemies on the same tile", () => {
    for (const seed of SEEDS) {
      const maze = generateMaze({ width: 31, height: 21, rng: createRng(seed) });
      const plan = planSpawns(maze, 5);
      const keys = plan.enemyHomes.map(tileKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("never puts an enemy on the player's tile", () => {
    for (const seed of SEEDS) {
      const maze = generateMaze({ width: 21, height: 15, rng: createRng(seed) });
      const plan = planSpawns(maze, 4);
      for (const home of plan.enemyHomes) {
        expect(tileKey(home)).not.toBe(tileKey(plan.playerStart));
      }
    }
  });

  it("starts the player at a junction, so there is always somewhere to run", () => {
    const maze = generateMaze({ width: 41, height: 27, rng: createRng(2026) });
    const plan = planSpawns(maze, 4);
    const exits = walkDistances(maze, plan.playerStart);
    // At least three tiles are one step away from a junction.
    const adjacent = [...exits.entries()].filter(([, d]) => d === 1);
    expect(adjacent.length).toBeGreaterThanOrEqual(3);
  });

  it("still returns spawns on a maze too small to honour the minimum", () => {
    // The bar has to relax rather than return an empty list, or a small board
    // would silently produce a game with no enemies at all.
    const maze = generateMaze({ width: 7, height: 7, rng: createRng(1) });
    const plan = planSpawns(maze, 4);
    expect(plan.enemyHomes.length).toBeGreaterThan(0);
  });
});
