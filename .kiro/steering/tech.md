# Technology Stack

## Current stack

- **TypeScript** (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **HTML5 Canvas** — all rendering
- **Vite** — dev server and production bundle
- **Vitest** — unit, property and bot-driven simulation tests
- **Playwright** — browser tests against the built bundle
- **Biome** — lint and format

No runtime dependencies. The shipped bundle is under 10 kB gzipped.

## Common commands

```bash
npm run dev        # dev server on :8080
npm run build      # typecheck, then bundle to dist/
npm run check      # typecheck + lint + unit tests
npm test           # Vitest
npm run e2e        # Playwright (npm run e2e:install once first)
npm run lint:fix   # Biome autofix
```

## Architecture principles

- **The simulation is free of the platform.** Nothing in `src/core/` may touch the
  DOM, canvas, or timers. This is what lets the rules be tested at thousands of
  simulated seconds per second.
- **Coordinate spaces are distinct types.** Tile, world and screen coordinates use
  different field names so mixing them is a compile error.
- **Actors move on the maze graph**, tile to tile, never at free pixel positions.
- **Fixed timestep.** Speed is per second; the simulation advances in equal steps
  independently of display refresh rate.
- **Determinism.** Every random source is seeded and the seed is settable from the
  URL, so any playthrough can be replayed exactly.
- **Browser compatibility** — modern evergreen browsers, desktop and mobile.
  Touch input is supported.

## Superseded

Vanilla JavaScript, Jest and Babel were the 2025 stack; the AWS serverless
backend (Lambda, API Gateway WebSockets, DynamoDB, SQS, CloudWatch Events) was
designed but never built, and should be reconsidered rather than inherited. See
`docs/decisions/`.
