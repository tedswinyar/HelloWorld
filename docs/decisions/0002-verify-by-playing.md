# 2. The suite has to play the game

Date: 2026-09-03
Status: accepted

## Context

The 2025 build shipped 301 tests across 23 suites. It was also unplayable in a
way that took about two seconds to notice by hand:

```
Spawned patrol enemy at position (40, 40)
Hit by patrol enemy!   →   Lives remaining: 2
```

`AIController.calculateSpawnPositions()` hardcoded candidate spawns at fixed
pixel offsets, the first at `(cellSize * 2, cellSize * 2)` = `(40, 40)`. The
player was placed at `getAccessiblePositions(maze)[0]` — the first walkable tile
in row-major order, which is `(1, 1)`, world `(30, 30)`. Those points are 14
pixels apart, and contact was tested at a 16-pixel radius. There was no
minimum-distance check of any kind.

So the first enemy killed the player within the 2-second spawn delay of every
single game, before any input. Three sessions of work and 301 passing-ish tests
did not surface it, because every one of those tests asserted on units in
isolation. Several asserted little more than that a method existed:

```js
expect(typeof gameEngine.checkWallCollision).toBe('function');
```

The gap was not coverage. It was that nothing ever ran the game.

## Decision

Three layers, and the middle one is the new part:

1. **Unit and property tests** over the DOM-free simulation core. Includes fuzz
   tests that drive random input for tens of thousands of steps and assert
   invariants — an actor is always on a walkable tile, at a legal offset.

2. **Bot-driven playthroughs.** A greedy nearest-pellet bot with ghost avoidance
   plays whole levels inside the unit suite. It asserts things no unit test can
   express:
   - a level can be *cleared* — so the board is completable and the ghosts are
     not too fast;
   - progress is steady — at least 60% of pellets in 120 simulated seconds,
     measured at 82–100% across seeds;
   - deaths stay low — measured 0–4 per 120 seconds, with the test failing above
     12, so the ghosts becoming unfair breaks the build;
   - a bot with avoidance *disabled* dies more often, which confirms the ghosts
     are a real threat rather than decoration.

   The bot is deliberately simple, so that it measures the game rather than its
   own cleverness.

3. **Playwright against the built bundle**, pressing real keys and asserting on
   both the DOM and live game state. Chief among these: three lives are still
   intact after 3.5 seconds of no input, which is precisely what the 2025 build
   failed.

The spawn defect itself is fixed in `src/core/spawns.ts`, where
`MIN_ENEMY_DISTANCE` is enforced as a *walking* distance across the maze graph,
not a straight line — a wall can make two nearby tiles a long walk apart, and
straight-line distance would have permitted a spawn on the other side of a thin
wall.

## Consequences

- The suite went from 301 tests with 30 failures to 115 tests with none, running
  in about a third of the time. Fewer tests, because eight suites of
  symptom-chasing were deleted rather than fixed; more coverage of things that
  matter, because the remaining ones assert behaviour rather than existence.
- Every random source is seeded (`src/core/rng.ts`) and the seed is settable from
  the URL. Playthroughs are reproducible, so a bot or browser failure can be
  replayed exactly.
- Tests are slower than pure unit tests — a full-board playthrough is a few
  hundred milliseconds of wall time. That is a good trade for catching the class
  of defect that made the previous version worthless.

## What this does not cover

Rendering correctness beyond "the canvas is not blank and has several distinct
colours". Whether the game *looks* right is still a human judgement; the
Playwright suite only asserts that it is drawn, sized to the board, and not
throwing.
