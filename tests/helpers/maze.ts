import { type Cell, type Maze, PATH, WALL } from "../../src/core/maze";

/**
 * Builds a maze from ASCII art: `#` is wall, anything else is path.
 * Lets a test state the exact topology it cares about, instead of generating a
 * random maze and hoping it contains the shape under test.
 */
export function mazeFromAscii(art: readonly string[]): Maze {
  const rows = art.filter((row) => row.length > 0);
  const first = rows[0];
  if (first === undefined) throw new Error("mazeFromAscii needs at least one row");

  const width = first.length;
  const height = rows.length;
  const cells: Cell[] = [];

  for (const [y, row] of rows.entries()) {
    if (row.length !== width) {
      throw new Error(`Row ${y} is ${row.length} wide, expected ${width}`);
    }
    for (const char of row) {
      cells.push(char === "#" ? WALL : PATH);
    }
  }

  return { width, height, cells };
}
