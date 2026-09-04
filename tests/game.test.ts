import { beforeEach, describe, expect, it } from "vitest";
import { tileKey } from "../src/core/coords";
import {
  enemyCountForLevel,
  enemySpeedForLevel,
  mazeSizeForLevel,
  playerSpeedForLevel,
  powerDurationForLevel,
} from "../src/core/difficulty";
import { Enemy } from "../src/core/enemy";
import { Game } from "../src/core/game";
import { walkDistances } from "../src/core/pathfinding";
import { createRng } from "../src/core/rng";
import { playWithBot } from "./helpers/bot";

const STEP = 1 / 120;
const SEEDS = [1, 7, 42, 1337, 20260903, 808];

/** Runs the simulation forward without any player input. */
function advance(game: Game, seconds: number): void {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) game.update(STEP);
}

/** Advances just past the opening READY pause, so the game is live. */
function beginPlay(game: Game): void {
  advance(game, 2);
  expect(game.phase).toBe("playing");
}

const SMALL = { width: 21, height: 15 } as const;

describe("the opening seconds are survivable", () => {
  it.each(SEEDS)(
    "does not take a life before the player has had a chance to move — seed %i",
    (seed) => {
      // This is the regression test for the defect that made the 2025 build
      // unplayable: an enemy spawned ~14px from the player's fixed start and
      // killed them about two seconds into every game, before any input.
      const game = new Game({ seed });
      advance(game, 3.5);

      expect(game.lives).toBe(3);
      expect(game.phase).toBe("playing");
    },
  );

  it.each(SEEDS)("starts every enemy well clear of the player — seed %i", (seed) => {
    const game = new Game({ seed });
    const distances = walkDistances(game.maze, game.player.tile);

    for (const enemy of game.enemies) {
      expect(distances.get(tileKey(enemy.tile)) ?? 0).toBeGreaterThanOrEqual(10);
    }
  });

  it("holds everything still during the READY pause", () => {
    const game = new Game({ seed: 5 });
    const startTile = game.player.tile;
    const enemyTiles = game.enemies.map((e) => tileKey(e.tile));

    game.requestDirection("left");
    advance(game, 1);

    expect(game.phase).toBe("ready");
    expect(game.player.tile).toEqual(startTile);
    expect(game.enemies.map((e) => tileKey(e.tile))).toEqual(enemyTiles);
  });

  it("releases enemies in a stagger rather than all at once", () => {
    const game = new Game({ seed: 3 });
    beginPlay(game);

    const movedEarly = game.enemies.filter((e) => e.mover.isMoving).length;
    expect(movedEarly).toBeLessThan(game.enemies.length);
  });
});

describe("pellets and scoring", () => {
  let game: Game;

  beforeEach(() => {
    game = new Game({ seed: 42, mazeSize: SMALL, startingLives: 99 });
  });

  it("starts the player on an empty tile, so the score does not jump", () => {
    expect(game.score).toBe(0);
    expect(game.pellets.kindAt(game.player.tile)).toBeNull();
  });

  it("scores pellets as the bot eats them", () => {
    playWithBot(game, { seconds: 12 });

    expect(game.score).toBeGreaterThan(0);
    expect(game.pellets.remaining).toBeLessThan(game.pellets.total);
    expect(game.pellets.collectedCount).toBeGreaterThan(0);
  });

  it("removes a pellet permanently once collected", () => {
    playWithBot(game, { seconds: 3 });
    const cleared = game.player.tile;
    expect(game.pellets.kindAt(cleared)).toBeNull();

    // Re-entering the tile must not score again.
    const scoreBefore = game.score;
    game.player.mover.placeAt(cleared);
    game.update(STEP);
    expect(game.score).toBe(scoreBefore);
  });

  it("awards an extra life on crossing 10,000 points", () => {
    game.score = 9_990;
    playWithBot(game, { seconds: 20, until: (g) => g.score >= 10_000 });

    expect(game.score).toBeGreaterThanOrEqual(10_000);
    expect(game.lives).toBe(100);
  });
});

describe("power pellets", () => {
  it("makes every enemy edible when one is eaten", () => {
    const game = new Game({ seed: 11, mazeSize: SMALL, startingLives: 99 });
    playWithBot(game, {
      seconds: 60,
      seek: (g, t) => g.pellets.kindAt(t) === "power",
      until: (g) => g.isPowerActive,
    });

    expect(game.isPowerActive).toBe(true);
    expect(game.powerRemaining).toBeLessThanOrEqual(powerDurationForLevel(1));
    for (const enemy of game.enemies) {
      // A ghost already heading home stays harmless rather than becoming edible.
      expect(enemy.isDangerous).toBe(false);
    }
  });

  it("doubles the score for each enemy eaten in one power phase", () => {
    const game = new Game({ seed: 4, mazeSize: SMALL, startingLives: 99 });
    beginPlay(game);

    // Level 1 only fields two enemies, so top the board up to see the whole
    // 200/400/800/1600 chain the rule describes.
    while (game.enemies.length < 4) {
      const template = game.enemies[0];
      if (template === undefined) throw new Error("expected at least one enemy");
      game.enemies.push(
        new Enemy({
          maze: game.maze,
          kind: "chaser",
          homeTile: template.homeTile,
          speed: 100,
          rng: createRng(1),
        }),
      );
    }
    for (const enemy of game.enemies) enemy.frighten(6);

    const points: number[] = [];
    for (const enemy of game.enemies) {
      game.events.length = 0;
      enemy.mover.placeAt(game.player.tile);
      game.update(STEP);
      for (const event of game.events) {
        if (event.type === "enemyEaten") points.push(event.points);
      }
    }

    expect(points).toEqual([200, 400, 800, 1600]);
    expect(game.lives).toBe(99);
  });

  it("sends an eaten enemy home instead of deleting it", () => {
    // The 2025 build removed eaten enemies outright, so a good power phase
    // permanently emptied the board.
    const game = new Game({ seed: 4, mazeSize: SMALL, startingLives: 99 });
    beginPlay(game);
    const countBefore = game.enemies.length;

    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.frighten(6);
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);

    expect(game.enemies).toHaveLength(countBefore);
    expect(enemy.mood).toBe("returning");
    expect(enemy.isDangerous).toBe(false);
  });

  it("lets the power phase lapse and the enemies turn dangerous again", () => {
    const game = new Game({ seed: 4, mazeSize: SMALL, startingLives: 99 });
    beginPlay(game);

    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.frighten(1);
    expect(enemy.isEdible).toBe(true);

    advance(game, 1.5);

    expect(enemy.isEdible).toBe(false);
    expect(enemy.isDangerous).toBe(true);
  });
});

describe("losing lives and ending the game", () => {
  it("takes one life per contact and pauses before respawning", () => {
    const game = new Game({ seed: 9, mazeSize: SMALL });
    beginPlay(game);
    const startTile = game.player.tile;

    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);

    expect(game.lives).toBe(2);
    expect(game.phase).toBe("dying");

    advance(game, 1.4);

    expect(game.phase).toBe("ready");
    expect(game.player.tile).toEqual(startTile);
    expect(game.isInvulnerable).toBe(true);
  });

  it("cannot lose two lives to the same contact", () => {
    const game = new Game({ seed: 9, mazeSize: SMALL });
    beginPlay(game);

    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.mover.placeAt(game.player.tile);
    advance(game, 0.5); // several frames while still overlapping

    expect(game.lives).toBe(2);
  });

  it("is immune during the post-respawn grace period", () => {
    const game = new Game({ seed: 9, mazeSize: SMALL });
    beginPlay(game);

    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);
    advance(game, 1.4); // through "dying" into the new "ready"
    advance(game, 2); // through "ready" into play, still invulnerable

    expect(game.isInvulnerable).toBe(true);
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);

    expect(game.lives).toBe(2);
  });

  it("ends the game when the last life goes, and reports the score", () => {
    const game = new Game({ seed: 9, mazeSize: SMALL, startingLives: 1 });
    beginPlay(game);
    game.score = 1_234;

    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    game.events.length = 0;
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);
    advance(game, 1.4);

    expect(game.phase).toBe("gameOver");
    expect(game.events).toContainEqual({ type: "gameOver", score: 1_234 });
  });

  it("ignores input once the game is over", () => {
    const game = new Game({ seed: 9, mazeSize: SMALL, startingLives: 1 });
    beginPlay(game);
    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);
    advance(game, 1.4);

    const tileAtGameOver = game.player.tile;
    game.requestDirection("left");
    advance(game, 1);

    expect(game.player.tile).toEqual(tileAtGameOver);
  });

  it("restarts cleanly from a game over", () => {
    const game = new Game({ seed: 9, mazeSize: SMALL, startingLives: 1 });
    beginPlay(game);
    const enemy = game.enemies[0];
    if (enemy === undefined) throw new Error("expected at least one enemy");
    enemy.mover.placeAt(game.player.tile);
    game.update(STEP);
    advance(game, 1.4);
    expect(game.phase).toBe("gameOver");

    game.restart();

    expect(game.phase).toBe("ready");
    expect(game.score).toBe(0);
    expect(game.lives).toBe(1);
    expect(game.level).toBe(1);
    expect(game.pellets.remaining).toBe(game.pellets.total);
  });
});

describe("the game can actually be won", () => {
  // These are the tests the 2025 build most needed and least had: something
  // that plays the game and checks the score goes up. Its board was a perfect
  // maze full of dead ends patrolled by A* pursuers, so being cornered was a
  // matter of time rather than of mistakes.

  it.each([42, 808, 2026])("clears level 1 and opens a fresh board — seed %i", (seed) => {
    const game = new Game({ seed, mazeSize: SMALL, startingLives: 99 });
    const firstMaze = game.maze.cells;
    const firstTotal = game.pellets.total;

    playWithBot(game, { seconds: 250, until: (g) => g.level >= 2 });

    expect(game.level).toBeGreaterThanOrEqual(2);
    expect(game.maze.cells).not.toEqual(firstMaze);
    expect(game.pellets.remaining).toBe(game.pellets.total);
    expect(game.pellets.total).toBeGreaterThan(0);
    // Every pellet is worth at least 10, plus the level bonus.
    expect(game.score).toBeGreaterThan(firstTotal * 10);
  });

  it.each(SEEDS)("makes steady progress without dying constantly — seed %i", (seed) => {
    const game = new Game({ seed, mazeSize: SMALL, startingLives: 99 });
    const total = game.pellets.total;

    const result = playWithBot(game, { seconds: 120 });

    const cleared = game.level > 1 ? total : total - game.pellets.remaining;
    expect(cleared).toBeGreaterThan(total * 0.6);
    // Measured 0-4 deaths across these seeds; this is a generous ceiling that
    // still fails loudly if the ghosts ever become unfair.
    expect(result.deaths).toBeLessThanOrEqual(12);
  });

  it("clears a level on the full-sized board too", () => {
    const game = new Game({ seed: 2026, startingLives: 99 });
    playWithBot(game, { seconds: 450, until: (g) => g.level >= 2 });

    expect(game.level).toBeGreaterThanOrEqual(2);
  });

  it("dies far more often with the ghosts ignored, which is the point of them", () => {
    const careless = new Game({ seed: 2026, mazeSize: SMALL, startingLives: 999 });
    const careful = new Game({ seed: 2026, mazeSize: SMALL, startingLives: 999 });

    const recklessRun = playWithBot(careless, { seconds: 90, avoidEnemies: false });
    const carefulRun = playWithBot(careful, { seconds: 90 });

    expect(recklessRun.deaths).toBeGreaterThan(carefulRun.deaths);
  });
});

describe("determinism", () => {
  it("replays identically from the same seed", () => {
    const a = new Game({ seed: 777, mazeSize: SMALL, startingLives: 99 });
    const b = new Game({ seed: 777, mazeSize: SMALL, startingLives: 99 });

    playWithBot(a, { seconds: 30 });
    playWithBot(b, { seconds: 30 });

    expect(a.score).toBe(b.score);
    expect(a.player.tile).toEqual(b.player.tile);
    expect(a.enemies.map((e) => tileKey(e.tile))).toEqual(b.enemies.map((e) => tileKey(e.tile)));
  });
});

describe("difficulty curve", () => {
  it("keeps enemies slower than the player at every level", () => {
    for (let level = 1; level <= 50; level++) {
      expect(enemySpeedForLevel(level)).toBeLessThan(playerSpeedForLevel(level));
    }
  });

  it("never lets the player or enemies get slower as levels climb", () => {
    for (let level = 2; level <= 50; level++) {
      expect(playerSpeedForLevel(level)).toBeGreaterThanOrEqual(playerSpeedForLevel(level - 1));
      expect(enemySpeedForLevel(level)).toBeGreaterThanOrEqual(enemySpeedForLevel(level - 1));
    }
  });

  it("adds enemies up to a cap", () => {
    expect(enemyCountForLevel(1)).toBe(2);
    expect(enemyCountForLevel(3)).toBe(3);
    expect(enemyCountForLevel(20)).toBe(5);
    for (let level = 1; level <= 50; level++) {
      expect(enemyCountForLevel(level)).toBeLessThanOrEqual(5);
    }
  });

  it("shortens power phases but never below four seconds", () => {
    for (let level = 1; level <= 50; level++) {
      expect(powerDurationForLevel(level)).toBeGreaterThanOrEqual(4);
    }
    expect(powerDurationForLevel(20)).toBeLessThan(powerDurationForLevel(1));
  });

  it("grows the board only up to the capped size, always odd", () => {
    for (let level = 1; level <= 50; level++) {
      const size = mazeSizeForLevel(level);
      expect(size.width % 2).toBe(1);
      expect(size.height % 2).toBe(1);
      expect(size.width).toBeLessThanOrEqual(61);
      expect(size.height).toBeLessThanOrEqual(41);
    }
  });
});
