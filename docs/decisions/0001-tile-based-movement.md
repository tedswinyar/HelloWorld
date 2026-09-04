# 1. Movement is tile-to-tile, not free-floating

Date: 2026-09-03
Status: accepted
Supersedes: the collision system described in the deleted
`docs/collision-system-implementation.md`

## Context

The 2025 implementation modelled the player as a point at arbitrary pixel
coordinates, moved by a fixed number of pixels per frame, with wall collision
tested by checking the four corners of a 16-pixel bounding box against 20-pixel
cells. Misalignment was corrected after the fact by snapping to a cell centre.

That model does not work, and the test suite is the evidence. Of 23 suites, eight
existed only to chase symptoms of it:

| Suite | Symptom it was chasing |
| --- | --- |
| `NoMidwayStop`, `AntiMidwayStop` | player halting between cells |
| `TurnIntoWallTest` | turns silently swallowed |
| `WallCollisionDebug`, `SimpleCollisionTest` | committed debug scratchpads |
| `GridBasedMovement`, `ContinuousMovement` | grid alignment and queuing |
| `CoordinateSystemTest` | tile vs pixel coordinates disagreeing |

Two of those suites fight the same symptom from opposite directions. Thirty of
their assertions were failing when this work started, and in most cases the test
described the correct behaviour while the code did not.

The root causes were:

1. **2 pixels of clearance.** A 16px box in a 20px cell means any misalignment
   greater than 2px blocks a legal turn. Whether a corner worked depended on
   arithmetic luck.
2. **Two disagreeing coordinate systems.** `Player` computed grid position with
   `Math.floor(this.x / cellSize)` in one branch and `mazeRenderer.worldToGrid()`
   in another. `snapToNearestGridCenter` used `floor`, so it snapped to the cell
   the player was *in*, not the nearest centre — which is what its own test
   asserted, and failed.
3. **Per-frame movement.** `speed = 2` meant 2 pixels per frame, and
   `handleMovement(deltaTime)` accepted a delta and never used it. The game ran
   at double speed on a 120Hz display.
4. **Discarded turn requests.** A queued direction that was not legal on the
   frame it arrived was deleted, with the comment `// If queued direction is
   invalid, clear it to prevent stopping`. Pre-buffering a turn before a junction
   is the single most important feel mechanic in this genre, and it had been
   removed to suppress a symptom.

## Decision

An actor is always on an edge of the maze graph. It sits at a `tile`, has
travelled `offset` pixels from that tile's centre toward `dir`, and reaching
`CELL_SIZE` means arriving at the next tile. Turning happens only at a tile
centre, with one exception: a reversal applies immediately, mid-tile,
re-anchoring to the tile ahead so world position is preserved exactly.

Consequences:

- Wall collision is `isWall(step(tile, dir))`. One lookup, exact, no tolerance
  parameter to tune and no bounding box.
- Being wedged inside geometry is not representable, so the entire class of bugs
  the eight suites chased cannot occur. They were deleted, not fixed.
- Actor size becomes purely cosmetic. The sprite can be any size without
  affecting whether a corner is passable.
- `speed` is pixels per second and `update(dt)` consumes a real delta, driven by
  a fixed-timestep loop.
- A requested direction is buffered until it becomes legal, however many
  junctions away that is.

The three coordinate spaces are now distinct types — `Tile {tx, ty}`,
`WorldPoint {wx, wy}`, `ScreenPoint {sx, sy}` — so mixing them is a compile
error rather than a bug to be found later by a test.

## Alternatives considered

**Keep the floating model and widen the tolerance.** This is what the 2025 build
was already doing incrementally, and it trades one set of misalignment bugs for
another: enough tolerance to make turns reliable is also enough to let an actor
clip a wall corner.

**Snap to the grid only when turning.** Still needs a tolerance, still allows
positions the maze does not permit, and does not fix framerate dependence.

## Consequences for the maze

Constraining actors to the graph exposed a second problem that the floating model
had been masking: the generator produced a *perfect* maze, so there was exactly
one route between any two tiles and dead ends everywhere. With A* pursuers that
makes being cornered inevitable rather than avoidable. The generator now braids
the maze, removing every dead end, and `deadEnds(maze)` is asserted empty across
a range of seeds. See `src/core/mazeGenerator.ts`.
