# Project Structure

## Directory organisation

```
/
├── index.html               # Vite entry point
├── src/
│   ├── core/                # Simulation. No DOM, no canvas, no timers.
│   │   ├── coords.ts        # Tile / world / screen spaces and conversions
│   │   ├── direction.ts     # The four directions
│   │   ├── maze.ts          # The board as a torus
│   │   ├── mazeGenerator.ts # Recursive backtracking, then braiding
│   │   ├── gridMover.ts     # Tile-to-tile movement with turn buffering
│   │   ├── pathfinding.ts   # A* and BFS over the tile graph
│   │   ├── spawns.ts        # Spawn placement with guaranteed separation
│   │   ├── pellets.ts       # Pellets, collected by occupying a tile
│   │   ├── player.ts        # Player actor
│   │   ├── enemy.ts         # Enemy actors and behaviours
│   │   ├── difficulty.ts    # Level curve, as pure functions
│   │   └── game.ts          # Rules, phases, scoring, lives
│   ├── render/
│   │   └── renderer.ts      # Canvas drawing
│   ├── loop.ts              # Fixed-timestep loop
│   ├── input.ts             # Keyboard and touch
│   ├── hud.ts               # DOM mirror of game state
│   ├── highScore.ts         # localStorage, guarded
│   ├── main.ts              # Wiring
│   └── styles.css
├── tests/                   # Vitest
│   └── helpers/
│       ├── maze.ts          # ASCII-art maze builder
│       └── bot.ts           # A bot that plays the game
├── e2e/                     # Playwright
├── docs/decisions/          # Why the core was rebuilt
└── .kiro/
    ├── specs/               # The 2025 spec-driven-development artefacts
    └── steering/            # These files
```

## Naming conventions

- **TypeScript modules**: camelCase filenames (`gridMover.ts`), even when the main
  export is a class. Classes themselves are PascalCase.
- **Tests**: `*.test.ts` under `tests/`, `*.spec.ts` under `e2e/`.
- **CSS**: kebab-case class names.

## Code organisation principles

- **Simulation / presentation split.** The boundary is `src/core/`. Anything in
  there that reaches for `document`, `window` or a timer is a bug.
- **Total functions over guards.** `cellAt` wraps rather than returning undefined;
  `step` always yields a real tile. Callers should not need null checks.
- **Pure functions for tuning.** The difficulty curve is a set of pure functions of
  the level number so its invariants can be asserted for every level, not only the
  ones a test can reach by playing.
- **State machine for game flow.** `ready → playing → dying → ready`, plus
  `levelComplete` and `gameOver`. Phase transitions are driven by a timer the
  simulation owns, never by `setTimeout`.
- **Events for things state cannot express.** `Game.events` is drained by the
  presentation layer each frame; the HUD reads state directly.

## Import/export standards

- ES modules, named exports throughout, no default exports.
- `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Biome sorts imports; run `npm run lint:fix` rather than ordering by hand.
