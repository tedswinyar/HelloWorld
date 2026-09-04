import { describe, expect, it } from "vitest";
import { CELL_SIZE, tile, tileCentre, worldToTile } from "../src/core/coords";
import type { Direction } from "../src/core/direction";
import { GridMover } from "../src/core/gridMover";
import { isPath } from "../src/core/maze";
import { createRng } from "../src/core/rng";
import { mazeFromAscii } from "./helpers/maze";

// A plus-shaped junction inside a sealed border. Tile (2,2) is the centre,
// with open corridors in all four directions.
const CROSS = mazeFromAscii(["#####", "##.##", "#...#", "##.##", "#####"]);

// A corridor running left-right with a single side opening upward at (3,2).
const SIDE_OPENING = mazeFromAscii(["######", "###.##", "#....#", "######"]);

describe("GridMover: speed is in pixels per second", () => {
  it("advances exactly one tile per second at one cell per second", () => {
    const mover = new GridMover(CROSS, tile(1, 2), CELL_SIZE);
    mover.request("right");

    mover.update(1);

    expect(mover.tile).toEqual(tile(2, 2));
    expect(mover.offset).toBe(0);
  });

  it("is framerate independent: 120 small steps match one large step", () => {
    const fast = new GridMover(CROSS, tile(1, 2), CELL_SIZE);
    const slow = new GridMover(CROSS, tile(1, 2), CELL_SIZE);
    fast.request("right");
    slow.request("right");

    for (let i = 0; i < 120; i++) fast.update(1 / 120);
    slow.update(1);

    expect(fast.tile).toEqual(slow.tile);
    expect(fast.offset).toBeCloseTo(slow.offset, 9);
  });

  it("covers the same ground whether the frame budget arrives in one or two parts", () => {
    const once = new GridMover(CROSS, tile(1, 2), CELL_SIZE * 3);
    const twice = new GridMover(CROSS, tile(1, 2), CELL_SIZE * 3);
    once.request("right");
    twice.request("right");

    once.update(0.5);
    twice.update(0.25);
    twice.update(0.25);

    expect(once.position).toEqual(twice.position);
  });
});

describe("GridMover: walls", () => {
  it("stops at a tile centre when it runs into a wall, never mid-tile", () => {
    const mover = new GridMover(CROSS, tile(2, 2), CELL_SIZE * 10);
    mover.request("right");

    mover.update(1); // Far enough to overshoot the wall many times over.

    expect(mover.tile).toEqual(tile(3, 2));
    expect(mover.offset).toBe(0);
    expect(mover.isMoving).toBe(false);
  });

  it("never comes to rest inside a wall tile", () => {
    const mover = new GridMover(CROSS, tile(2, 2), CELL_SIZE * 10);
    for (const d of ["right", "up", "left", "down"] as const) {
      mover.request(d);
      mover.update(1);
      expect(isPath(CROSS, mover.tile)).toBe(true);
    }
  });

  it("keeps facing the blocked direction so rendering stays put", () => {
    const mover = new GridMover(CROSS, tile(2, 2), CELL_SIZE * 10);
    mover.request("right");
    mover.update(1);

    expect(mover.facing).toBe("right");
    expect(mover.dir).toBeNull();
  });
});

describe("GridMover: turn buffering", () => {
  it("applies a turn requested before the intersection, on arrival", () => {
    // Start at (1,2) heading right; the only upward exit is at (3,2).
    const mover = new GridMover(SIDE_OPENING, tile(1, 2), CELL_SIZE);
    mover.request("right");
    mover.update(1); // now at (2,2)
    expect(mover.tile).toEqual(tile(2, 2));

    // Ask to turn up while still one tile short of the opening.
    mover.request("up");
    expect(mover.dir).toBe("right"); // request is buffered, not applied yet

    mover.update(1); // arrive at (3,2), where "up" becomes legal
    expect(mover.dir).toBe("up");
  });

  it("holds a buffered turn across many frames until it becomes legal", () => {
    // The regression that mattered most: the 2025 build discarded a request
    // the instant it was not immediately usable.
    const mover = new GridMover(SIDE_OPENING, tile(1, 2), CELL_SIZE);
    mover.request("right");
    mover.update(1 / 60); // get under way before buffering the turn
    mover.request("up"); // illegal here, and at the next tile too

    for (let i = 0; i < 60; i++) mover.update(1 / 60);

    expect(mover.desired).toBe("up");
    expect(mover.dir).toBe("right");

    mover.update(1); // reach (3,2)
    expect(mover.dir).toBe("up");
    expect(mover.desired).toBeNull();
  });

  it("keeps moving when an impossible turn is requested", () => {
    const mover = new GridMover(SIDE_OPENING, tile(1, 2), CELL_SIZE);
    mover.request("right");
    mover.update(0.5);
    mover.request("down"); // solid wall for the whole corridor

    mover.update(0.5);

    expect(mover.dir).toBe("right");
    expect(mover.tile).toEqual(tile(2, 2));
  });
});

describe("GridMover: reversal", () => {
  it("reverses immediately mid-tile without moving in world space", () => {
    const mover = new GridMover(CROSS, tile(1, 2), CELL_SIZE);
    mover.request("right");
    mover.update(0.5);
    const before = mover.position;

    mover.request("left");

    expect(mover.position).toEqual(before);
    expect(mover.dir).toBe("left");
  });

  it("re-anchors to the tile ahead when reversing", () => {
    const mover = new GridMover(CROSS, tile(1, 2), CELL_SIZE);
    mover.request("right");
    mover.update(0.25); // a quarter of the way to (2,2)

    mover.request("left");

    expect(mover.tile).toEqual(tile(2, 2));
    expect(mover.offset).toBeCloseTo(CELL_SIZE * 0.75, 9);
  });

  it("returns to where it started after reversing and travelling back", () => {
    const mover = new GridMover(CROSS, tile(1, 2), CELL_SIZE);
    const origin = mover.position;
    mover.request("right");
    mover.update(0.5);
    mover.request("left");
    mover.update(0.5);

    expect(mover.position.wx).toBeCloseTo(origin.wx, 9);
    expect(mover.position.wy).toBeCloseTo(origin.wy, 9);
  });
});

describe("GridMover: edge wrapping (requirement 1.4)", () => {
  // Row 1 is open all the way across, including both border columns, so it is
  // a wrap tunnel; row 2 is sealed at the borders and must not wrap.
  const TUNNEL = mazeFromAscii(["#####", ".....", "#...#", "#####"]);

  it("wraps to the opposite side through a tunnel", () => {
    const mover = new GridMover(TUNNEL, tile(4, 1), CELL_SIZE);
    mover.request("right");

    mover.update(1);

    expect(mover.tile).toEqual(tile(0, 1));
  });

  it("does not wrap where the border is solid", () => {
    const mover = new GridMover(TUNNEL, tile(3, 2), CELL_SIZE * 10);
    mover.request("right");

    mover.update(1);

    expect(mover.tile).toEqual(tile(3, 2));
    expect(mover.isMoving).toBe(false);
  });
});

describe("GridMover: invariants under random input", () => {
  it("always sits on a path tile, at a legal offset, whatever the input", () => {
    const maze = mazeFromAscii([
      "#########",
      "#...#...#",
      "#.#.#.#.#",
      "#.#...#.#",
      "#.#####.#",
      "#.......#",
      "#########",
    ]);
    const rng = createRng(20260903);
    const directions: readonly Direction[] = ["up", "down", "left", "right"];
    const mover = new GridMover(maze, tile(1, 1), CELL_SIZE * 4);

    for (let frame = 0; frame < 20_000; frame++) {
      if (rng.next() < 0.1) mover.request(rng.pick(directions));
      mover.update(1 / 120);

      expect(isPath(maze, mover.tile)).toBe(true);
      expect(mover.offset).toBeGreaterThanOrEqual(0);
      expect(mover.offset).toBeLessThan(CELL_SIZE);
      // The rendered position must resolve back to a walkable tile too.
      expect(isPath(maze, worldToTile(mover.position))).toBe(true);
    }
  });

  it("reports a position that stays within half a cell of its tile centre", () => {
    const maze = mazeFromAscii(["#####", "#...#", "#.#.#", "#...#", "#####"]);
    const rng = createRng(7);
    const directions: readonly Direction[] = ["up", "down", "left", "right"];
    const mover = new GridMover(maze, tile(1, 1), CELL_SIZE * 2);

    for (let frame = 0; frame < 5_000; frame++) {
      if (rng.next() < 0.2) mover.request(rng.pick(directions));
      mover.update(1 / 120);

      const centre = tileCentre(mover.tile);
      expect(Math.abs(mover.position.wx - centre.wx)).toBeLessThan(CELL_SIZE);
      expect(Math.abs(mover.position.wy - centre.wy)).toBeLessThan(CELL_SIZE);
    }
  });
});
