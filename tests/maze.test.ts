import { describe, expect, it } from "vitest";
import { tile } from "../src/core/coords";
import { cellAt, deadEnds, isFullyConnected, PATH, pathTiles, WALL } from "../src/core/maze";
import { generateMaze } from "../src/core/mazeGenerator";
import { createRng } from "../src/core/rng";

const SEEDS = [1, 7, 42, 1337, 20260903, 99999];

describe("generateMaze", () => {
  it("rejects dimensions it cannot lay out", () => {
    expect(() => generateMaze({ width: 40, height: 27, rng: createRng(1) })).toThrow(/odd/);
    expect(() => generateMaze({ width: 5, height: 27, rng: createRng(1) })).toThrow(/>= 7/);
  });

  it("is reproducible for a given seed", () => {
    const a = generateMaze({ width: 21, height: 15, rng: createRng(4242) });
    const b = generateMaze({ width: 21, height: 15, rng: createRng(4242) });
    expect(a.cells).toEqual(b.cells);
  });

  it("produces different mazes for different seeds", () => {
    const a = generateMaze({ width: 21, height: 15, rng: createRng(1) });
    const b = generateMaze({ width: 21, height: 15, rng: createRng(2) });
    expect(a.cells).not.toEqual(b.cells);
  });

  it.each(SEEDS)("keeps every walkable tile reachable (requirement 8.2) — seed %i", (seed) => {
    const maze = generateMaze({ width: 31, height: 21, rng: createRng(seed) });
    expect(isFullyConnected(maze)).toBe(true);
  });

  it.each(SEEDS)("leaves no dead ends once braided — seed %i", (seed) => {
    // The property that makes the board survivable: an A* pursuer cannot corner
    // the player anywhere, because there are no corners to be cornered in.
    const maze = generateMaze({ width: 31, height: 21, rng: createRng(seed) });
    expect(deadEnds(maze)).toEqual([]);
  });

  it("does have dead ends before braiding, which is why braiding is needed", () => {
    const raw = generateMaze({
      width: 31,
      height: 21,
      rng: createRng(9),
      braid: false,
      tunnels: 0,
    });
    expect(deadEnds(raw).length).toBeGreaterThan(5);
  });

  it("carves exactly the requested number of wrap tunnels", () => {
    const maze = generateMaze({ width: 31, height: 21, rng: createRng(11), tunnels: 2 });

    let openBorderRows = 0;
    for (let ty = 0; ty < maze.height; ty++) {
      const leftOpen = cellAt(maze, 0, ty) === PATH;
      const rightOpen = cellAt(maze, maze.width - 1, ty) === PATH;
      if (leftOpen && rightOpen) openBorderRows++;
      // A tunnel must be open on both sides or it leads nowhere.
      expect(leftOpen).toBe(rightOpen);
    }

    expect(openBorderRows).toBe(2);
  });

  it("keeps the top and bottom borders solid", () => {
    const maze = generateMaze({ width: 31, height: 21, rng: createRng(13) });
    for (let tx = 0; tx < maze.width; tx++) {
      expect(cellAt(maze, tx, 0)).toBe(WALL);
      expect(cellAt(maze, tx, maze.height - 1)).toBe(WALL);
    }
  });

  it("leaves enough of the board walkable to be worth playing", () => {
    const maze = generateMaze({ width: 41, height: 27, rng: createRng(5) });
    const walkableFraction = pathTiles(maze).length / (maze.width * maze.height);
    expect(walkableFraction).toBeGreaterThan(0.35);
  });
});

describe("maze is a torus", () => {
  it("wraps out-of-range coordinates instead of returning nothing", () => {
    const maze = generateMaze({ width: 21, height: 15, rng: createRng(3) });
    expect(cellAt(maze, -1, 5)).toBe(cellAt(maze, maze.width - 1, 5));
    expect(cellAt(maze, maze.width, 5)).toBe(cellAt(maze, 0, 5));
    expect(cellAt(maze, 5, -1)).toBe(cellAt(maze, 5, maze.height - 1));
  });

  it("treats the border as wall for tiles far outside the maze", () => {
    const maze = generateMaze({ width: 21, height: 15, rng: createRng(3) });
    // Two full widths out lands back on the same column.
    expect(cellAt(maze, 5 + maze.width * 2, 3)).toBe(cellAt(maze, 5, 3));
  });

  it("reports dead ends by tile, not by index", () => {
    const raw = generateMaze({
      width: 21,
      height: 15,
      rng: createRng(8),
      braid: false,
      tunnels: 0,
    });
    for (const end of deadEnds(raw)) {
      expect(cellAt(raw, end.tx, end.ty)).toBe(PATH);
      expect(end).toEqual(tile(end.tx, end.ty));
    }
  });
});
