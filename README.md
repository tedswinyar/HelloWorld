# Maze Runner

A browser-based maze runner in the Pac-Man tradition: clear the board, dodge the
ghosts, eat a power pellet and turn the tables. TypeScript, HTML5 canvas, no
runtime dependencies.

```bash
npm install
npm run dev      # http://localhost:8080
```

Add `?seed=12345` to the URL to replay an exact board.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Typecheck, then bundle to `dist/` |
| `npm test` | Vitest unit and simulation suite |
| `npm run e2e` | Playwright tests against a real browser |
| `npm run lint` | Biome lint and format check |
| `npm run check` | Typecheck + lint + unit tests |

Playwright needs its browser once: `npm run e2e:install`.

## Controls

Arrow keys or `WASD` to move, `Space` to restart after a game over, swipe on
touch devices.

## Two projects in one repository

This repo started in 2014 as five commits of README markdown practice — the
GitHub description still says "First GitHub test project". In August 2025 it was
rebuilt as this game, deliberately as an exercise in **spec-driven development
with Kiro**: requirements in EARS format, a design document, then a task list
worked through in order. Those artefacts are still in
[`.kiro/specs/maze-runner-game/`](.kiro/specs/maze-runner-game/) and remain the
most interesting thing about the project.

In September 2026 the core was rebuilt again. The 2025 version is preserved at
the `baseline-2025-kiro` tag, and it is worth checking out, because the
difference between the two is a clean record of what a year of model improvement
changes about a codebase.

The 2025 build had 9,400 lines and 301 tests. It also had 30 failing tests and
was **unplayable**: an enemy spawned 14 pixels from the player's fixed starting
tile, inside a 16-pixel collision radius, so the first ghost ended the game about
two seconds after load, before any key was pressed. Every game. That defect
survived three sessions of work and 301 tests, because not one of those tests
ever played the game.

That is the lesson, and it is not really about model capability. Volume of
plausible code and volume of passing tests are both easy; the missing piece was
any check that the thing worked as a *game*. See
[`docs/decisions/`](docs/decisions/) for what changed and why.

## How it works

The simulation is deliberately free of the DOM, canvas, and timers, so the whole
rule set can be tested in Node at thousands of simulated seconds per second.

```
src/
  core/            # simulation — no DOM, no canvas, no timers
    coords.ts        tile / world / screen spaces, kept apart by field name
    direction.ts     the four directions and their vectors
    maze.ts          the board as a torus; wrapping falls out for free
    mazeGenerator.ts recursive backtracking, then braided to remove dead ends
    gridMover.ts     tile-to-tile movement with turn buffering
    pathfinding.ts   A* and BFS over the tile graph
    spawns.ts        spawn placement with a guaranteed player separation
    pellets.ts       pellets, collected by occupying a tile
    player.ts        the player actor
    enemy.ts         enemy actors and their four behaviours
    difficulty.ts    the level curve, as pure functions
    game.ts          rules, phases, scoring, lives
  render/
    renderer.ts    # canvas drawing
  loop.ts          # fixed-timestep loop
  input.ts         # keyboard and touch
  hud.ts           # DOM mirror of game state
  highScore.ts     # localStorage, guarded
  main.ts          # wiring
tests/             # Vitest: unit, property and bot-driven playthroughs
e2e/               # Playwright: real browser, real key presses
```

Four ideas carry most of the weight:

**Actors live on the maze graph.** An actor is at a tile with an offset toward
the next one, so "can I move here" is a single wall lookup, and being wedged
inside geometry is not representable. The 2025 build let the player float at
arbitrary pixel coordinates and tested four corners of a 16px box against 20px
cells — 2px of clearance — then rescued the result by snapping to a cell centre.

**The board is a torus.** Wrapping around the edges is a property of the
coordinate space, not a special case checked every frame.

**The maze is braided.** Recursive backtracking gives a perfect maze: one route
between any two tiles, dead ends everywhere. That is the wrong topology for being
chased — the 2025 build shipped it unmodified, so an A* pursuer could corner you
somewhere with no exit. Braiding removes every dead end, and the test suite
asserts there are none.

**Time is fixed-step.** Speed is pixels per *second* and the simulation advances
in equal increments. The 2025 build moved a fixed number of pixels per frame, so
it ran at double speed on a 120Hz display.

## Testing

Three layers, all of which have to pass:

- **Unit and property tests** over the simulation, including a movement spec and
  fuzz tests asserting an actor never occupies a wall whatever the input.
- **Bot-driven playthroughs** — a greedy pellet-seeking bot with ghost avoidance
  plays whole levels. If the board cannot be cleared, or the ghosts become
  unfairly fast, the bot's score stops climbing and the suite fails. This is the
  layer the 2025 build most needed and entirely lacked.
- **Playwright** against the built bundle, pressing real keys, asserting on both
  the DOM and live game state. It has already earned its keep: it caught a CSS
  bug where `.hud-group { display: flex }` outranked the `hidden` attribute and
  left the power meter permanently on screen.

## Not built

Honest status, because the previous README claimed directories that did not
exist:

- **Multiplayer.** Unstarted. The original design called for API Gateway
  WebSockets, Lambda, DynamoDB, plus SQS and CloudWatch Events purely to
  broadcast mode changes. That is a lot of moving parts for a hobby game and
  worth redesigning rather than inheriting.
- **Genre-breaking modes** (Speed, Ghost, Darkness, Giant, Teleport, Gravity).
  Unstarted. These are client-side effects and do not need a backend to exist.
- **Audio.** None yet.
- **Deployment.** The build output is a static bundle with a relative base, so it
  will serve from anywhere; nothing is wired up.

## Licence

MIT — see [LICENSE](LICENSE).
