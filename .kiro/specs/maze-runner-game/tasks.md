# Implementation Plan

Status as of 2026-09-03. Tasks 1–5 were built in Aug–Sep 2025 and then rebuilt in
Sep 2026 — the original implementations were complete in outline but rested on a
movement model that did not work; see `docs/decisions/0001-tile-based-movement.md`.
Task 6 and task 11 are now done. Everything from task 7 onward is unstarted.

## Core game

- [x] 1. Project structure and core game foundation
  - Canvas set up, fixed-timestep game loop, keyboard and touch input
  - _Requirements: 1.1, 6.1, 6.3_

- [x] 2. Maze generation and rendering
  - [x] 2.1 Maze generation algorithm
    - Recursive backtracking, then **braided** to remove every dead end
    - Connectivity asserted across seeds; generation retries on failure
    - Seeded RNG, so a given seed reproduces a board exactly
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 2.2 Maze rendering on canvas
    - Walls drawn, corridors left empty, corridor edges outlined
    - Canvas sized to the whole board and CSS-scaled to fit; no scrolling camera
    - _Requirements: 6.1, 6.3_

- [x] 3. Player character
  - [x] 3.1 Player class and movement
    - Tile-to-tile movement along the maze graph with turn buffering
    - Wall collision is a single lookup; mid-tile reversal preserves position
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 3.2 Maze edge wrapping
    - The board is a torus, so wrapping is a property of the coordinate space
    - The generator carves two side tunnels; other borders stay solid
    - _Requirements: 1.4_

- [x] 4. Pellet collection
  - [x] 4.1 Pellet placement and rendering
    - Normal pellets by density; power pellets placed one per quadrant corner
    - The player's spawn tile is left empty
    - _Requirements: 2.1, 2.4, 8.3_
  - [x] 4.2 Collection mechanics
    - Collected by occupying a tile; score tracked and mirrored to the HUD
    - _Requirements: 2.1, 2.2_
  - [x] 4.3 Level progression
    - New braided board on completion, plus a level bonus and a difficulty step
    - _Requirements: 2.3, 7.3_

- [x] 5. Enemy AI
  - [x] 5.1 Enemy classes
    - Four behaviours: chaser, ambusher, patrol, wanderer; A* over the tile graph
    - Enemies never reverse mid-corridor unless it is the only exit
    - _Requirements: 3.1, 7.2_
  - [x] 5.2 Enemy-player collision
    - Lives, death pause, respawn, post-respawn grace period, game over
    - **Spawns are placed a guaranteed walking distance from the player**, and
      enemies are released in a stagger. See `docs/decisions/0002-verify-by-playing.md`
    - _Requirements: 3.2, 3.3, 7.4_
  - [x] 5.3 Power pellet vulnerability
    - Frightened enemies flee and are edible; score doubles per enemy eaten
    - An eaten enemy returns home rather than being removed from the board
    - Visual states for frightened, about-to-expire, and returning
    - _Requirements: 2.4, 3.4_

- [x] 6. Single-player game mode
  - [x] 6.1 Game state presentation
    - HUD above the board, phase messages on the canvas, local high score
    - Restart on Space or tap after a game over
    - _Requirements: 7.1, 7.4_
    - Note: no separate main menu. The game starts immediately; a menu only makes
      sense once there is a second mode to choose.
  - [x] 6.2 Integrated single-player loop
    - Maze, player, enemies and pellets wired together with a phase state machine
    - Difficulty curve as pure functions of level, asserted for levels 1–50
    - _Requirements: 7.1, 7.3, 7.4_

- [x] 11. Testing suite
  - [x] 11.1 Unit tests for game logic
    - Movement spec, maze properties, pathfinding, spawn placement, game rules
    - Fuzz tests asserting an actor never occupies a wall under random input
    - **Bot-driven playthroughs** asserting the game is winnable and fair
    - _Requirements: 1.1, 1.2, 3.1, 8.1, 8.2_
  - [x] 11.3 Browser testing
    - Playwright against the built bundle with real key presses
    - _Requirements: 6.2, 6.3, 6.4_

## Not started

Tasks 7–10 all depend on a backend design that predates this rebuild and should be
revisited before being implemented — in particular, SQS and CloudWatch Events
purely to broadcast a mode change is a lot of infrastructure for a hobby game, and
the genre-breaking modes are client-side effects that need no backend at all.

- [ ] 7. AWS backend infrastructure
  - [ ] 7.1 Lambda functions for game logic — _Requirements: 4.1, 9.1, 9.2, 9.4_
  - [ ] 7.2 API Gateway WebSocket API — _Requirements: 4.1, 4.2, 9.1, 9.3_
  - [ ] 7.3 DynamoDB tables — _Requirements: 4.3, 9.2, 9.4, 9.5_

- [ ] 8. Multiplayer client
  - [ ] 8.1 WebSocket connection manager — _Requirements: 4.1, 4.4_
  - [ ] 8.2 Room creation and joining — _Requirements: 4.1, 4.2_
  - [ ] 8.3 Real-time state synchronisation — _Requirements: 4.2, 4.3, 4.4_
  - Note: the deterministic, DOM-free simulation core makes an authoritative
    server or lockstep model considerably more tractable than it would have been
    against the 2025 code.

- [ ] 9. Genre-breaking modes
  - [ ] 9.1 Mode scheduling — can be entirely client-side for single player
  - [ ] 9.2 Speed and Ghost modes — _Requirements: 5.1, 5.2_
  - [ ] 9.3 Darkness, Giant, Teleport, Gravity modes — _Requirements: 5.1, 5.2_
  - [ ] 9.4 Mode system across multiplayer — _Requirements: 5.2, 5.3, 5.4_
  - Note: Ghost Mode (passing through walls) needs care, since the movement model
    deliberately makes occupying a wall tile unrepresentable. It wants a distinct
    traversal rule rather than a relaxed collision check.

- [ ] 10. Static hosting and deployment
  - [ ] 10.1 S3 and CloudFront — _Requirements: 6.1, 6.2, 9.1, 9.3_
  - [ ] 10.2 Deployment pipeline — _Requirements: 9.1, 9.3, 9.5_
  - Note: `npm run build` already emits a static bundle with a relative base, so
    it will serve from any static host. Only the wiring is missing.

- [ ] 11.2 Integration tests for multiplayer — blocked on task 8

- [ ] 12. Polish
  - [ ] 12.1 Performance — no known problems; measure before optimising
  - [ ] 12.2 Audio and visual enhancement — no audio at all yet
    - _Requirements: 5.2, 6.2, 6.3_
