import { describe, expect, it } from "vitest";
import { tile, tileKey } from "../src/core/coords";
import { directionToward, findPath, torusDistance, walkDistances } from "../src/core/pathfinding";
import { mazeFromAscii } from "./helpers/maze";

// A ring corridor with a wall in the middle, so there are two routes round.
const RING = mazeFromAscii(["#######", "#.....#", "#.###.#", "#.....#", "#######"]);

const TUNNEL_ROW = mazeFromAscii(["#######", ".......", "#######"]);

describe("findPath", () => {
  it("returns the tiles to walk, excluding the start and including the goal", () => {
    const path = findPath(RING, tile(1, 1), tile(3, 1));
    expect(path).toEqual([tile(2, 1), tile(3, 1)]);
  });

  it("returns an empty path when already at the goal", () => {
    expect(findPath(RING, tile(1, 1), tile(1, 1))).toEqual([]);
  });

  it("returns an empty path to an unreachable tile", () => {
    // (2,2) is inside the central wall block.
    expect(findPath(RING, tile(1, 1), tile(2, 2))).toEqual([]);
  });

  it("finds the shorter of two routes round an obstacle", () => {
    const path = findPath(RING, tile(1, 1), tile(5, 1));
    expect(path).toHaveLength(4); // straight along the top, not round the bottom
  });

  it("routes through a wrap tunnel when that is shorter", () => {
    // From (5,1) to (1,1): going right wraps in 3 steps, going left takes 4.
    const path = findPath(TUNNEL_ROW, tile(5, 1), tile(1, 1));
    expect(path).toHaveLength(3);
    expect(path.map(tileKey)).toContain(tileKey(tile(0, 1)));
  });

  it("honours forbidFirst so enemies cannot turn back on the spot", () => {
    const unrestricted = findPath(TUNNEL_ROW, tile(3, 1), tile(1, 1));
    expect(unrestricted[0]).toEqual(tile(2, 1));

    const restricted = findPath(TUNNEL_ROW, tile(3, 1), tile(1, 1), { forbidFirst: "left" });
    expect(restricted[0]).toEqual(tile(4, 1));
  });
});

describe("torusDistance", () => {
  it("measures the short way round rather than straight across", () => {
    const maze = TUNNEL_ROW; // 7 wide
    expect(torusDistance(maze, tile(0, 1), tile(6, 1))).toBe(1);
    expect(torusDistance(maze, tile(1, 1), tile(3, 1))).toBe(2);
  });
});

describe("directionToward", () => {
  it("gives the first direction of the shortest route", () => {
    expect(directionToward(RING, tile(1, 1), tile(5, 1))).toBe("right");
    expect(directionToward(RING, tile(1, 3), tile(1, 1))).toBe("up");
  });

  it("returns null when the goal cannot be reached", () => {
    expect(directionToward(RING, tile(1, 1), tile(2, 2))).toBeNull();
  });
});

describe("walkDistances", () => {
  it("measures distance across the maze graph, not in a straight line", () => {
    const distances = walkDistances(RING, tile(1, 1));
    // (1,3) is directly two rows below, and also two steps away round the ring.
    expect(distances.get(tileKey(tile(1, 3)))).toBe(2);
    // (5,3) is a short hop away in space but a long walk round the block.
    expect(distances.get(tileKey(tile(5, 3)))).toBe(6);
  });

  it("omits unreachable tiles entirely", () => {
    const distances = walkDistances(RING, tile(1, 1));
    expect(distances.has(tileKey(tile(2, 2)))).toBe(false);
  });

  it("returns nothing when starting inside a wall", () => {
    expect(walkDistances(RING, tile(2, 2)).size).toBe(0);
  });
});
