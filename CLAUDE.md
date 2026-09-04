# Maze Runner — working notes

A Pac-Man-style maze game in TypeScript. No runtime dependencies.

## Commands

```bash
npm run dev        # dev server on :8080
npm run check      # typecheck + lint + unit tests — run this before committing
npm test           # Vitest only
npm run e2e        # Playwright (needs `npm run e2e:install` once)
npm run lint:fix   # Biome autofix
```

`?seed=12345` in the URL replays an exact board. Every random source is seeded.

## Git state is tracked outside this repo

Current state and what's owed live in `HANDOFF.md`, mirrored on Specter card
`8df7b4cb-cfc3-4460-800d-3057f583ba74`. **If you change what is committed, pushed, or merged
here, update both.** The card asserts this repo's state and has no way to notice it has gone
stale.

Pushes are gated by Code Defender's external-repository allowlist. A refused push is policy,
not a code problem — see `HANDOFF.md`.

## Non-negotiables

These are the rules that keep the bugs this codebase used to have from coming
back. Breaking them will fail the suite, but understand *why* before working
around a failure.

**`src/core/` must not touch the DOM, canvas, `setTimeout`, or `requestAnimationFrame.**
The whole rule set is testable in Node because of this. Presentation lives in
`src/render/`, `src/hud.ts`, `src/input.ts`, `src/loop.ts`.

**Never mix coordinate spaces.** `Tile {tx, ty}`, `WorldPoint {wx, wy}` and
`ScreenPoint {sx, sy}` have distinct field names on purpose. Convert only via the
functions in `src/core/coords.ts`. Do not add a helper that takes bare `x, y`.

**Actors move tile-to-tile.** An actor is at a `tile` with an `offset` toward
`dir`. Do not add free pixel positioning, bounding-box wall tests, or
snap-to-centre corrections — that combination is what made the 2025 version
unplayable. See `docs/decisions/0001-tile-based-movement.md`.

**Speed is pixels per second.** Anything that advances state takes a `dt` and
must use it. A per-frame constant makes the game run at the display's refresh
rate.

**The maze is a torus.** `cellAt` and `step` wrap; they are total functions and
never return undefined. Do not add bounds checks around them, and do not
special-case edge wrapping.

**Braiding stays.** `generateMaze` removes every dead end, and the suite asserts
`deadEnds(maze)` is empty. A perfect maze plus A* pursuers is unsurvivable rather
than difficult.

**Enemies stay slower than the player, at every level.** Asserted in
`tests/game.test.ts` for levels 1–50. Difficulty comes from numbers and
positioning, not from making escape arithmetically impossible.

## Testing expectations

New gameplay behaviour needs more than a unit test. The three layers:

- `tests/*.test.ts` — units, properties, fuzz. Prefer asserting invariants over
  asserting specific values.
- `tests/helpers/bot.ts` — a bot that plays. If a change could make the game
  unwinnable, unfair, or stuck, add or extend a bot assertion. This layer exists
  because 301 unit tests once passed on a build that killed the player two
  seconds into every game.
- `e2e/*.spec.ts` — real browser, real key presses. Anything involving the DOM,
  CSS, input, or `localStorage` belongs here; unit tests cannot see it. It has
  already caught a CSS bug that unit tests could not.

Use `mazeFromAscii` in `tests/helpers/maze.ts` to state an exact topology rather
than generating a random maze and hoping.

## Layout

`src/core/` simulation · `src/render/` canvas · `tests/` Vitest · `e2e/`
Playwright · `.kiro/specs/` the original 2025 spec-driven-development artefacts ·
`docs/decisions/` why the core was rebuilt.

## History worth knowing

The `baseline-2025-kiro` tag is the previous implementation: 9,400 lines, 301
tests, 30 of them failing, and unplayable. Kept deliberately as a comparison
point. Read `docs/decisions/` before concluding that any of the constraints above
are over-engineering.

## Unbuilt

Multiplayer, the six genre-breaking modes, and audio are all unstarted. The
original spec's AWS backend design (API Gateway WebSockets + Lambda + DynamoDB +
SQS + CloudWatch Events) has not been implemented and should be redesigned rather
than inherited — the modes in particular are client-side effects that need no
backend.
