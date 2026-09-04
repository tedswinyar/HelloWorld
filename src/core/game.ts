import { CELL_SIZE, type Tile, worldDistance } from "./coords";
import {
  enemyCountForLevel,
  enemySpeedForLevel,
  type MazeSize,
  mazeSizeForLevel,
  pelletDensityForLevel,
  playerSpeedForLevel,
  powerDurationForLevel,
  powerPelletCountForLevel,
} from "./difficulty";
import type { Direction } from "./direction";
import { Enemy, type EnemyKind } from "./enemy";
import type { Maze } from "./maze";
import { generateMaze } from "./mazeGenerator";
import { PELLET_POINTS, PelletField } from "./pellets";
import { Player } from "./player";
import { createRng, type Rng } from "./rng";
import { planSpawns } from "./spawns";

export type GamePhase =
  /** Brief pause before play begins; nothing moves. */
  | "ready"
  | "playing"
  /** Player was caught; brief pause before respawn. */
  | "dying"
  | "levelComplete"
  | "gameOver";

export type GameEvent =
  | { readonly type: "pelletEaten"; readonly points: number }
  | { readonly type: "powerPellet" }
  | { readonly type: "enemyEaten"; readonly points: number }
  | { readonly type: "lifeLost" }
  | { readonly type: "extraLife" }
  | { readonly type: "levelStart"; readonly level: number }
  | { readonly type: "gameOver"; readonly score: number };

export interface GameOptions {
  readonly seed?: number;
  readonly startingLives?: number;
  /**
   * Fixes the board size for every level instead of following the growth
   * curve. Tests use it to keep simulated playthroughs cheap.
   */
  readonly mazeSize?: MazeSize;
}

const READY_SECONDS = 1.8;
const DYING_SECONDS = 1.2;
const LEVEL_COMPLETE_SECONDS = 1.5;
const INVULNERABLE_SECONDS = 2;
/** Seconds between each enemy being released at the start of a life. */
const ENEMY_RELEASE_INTERVAL = 1.5;
/** Player and enemy are touching when their centres are this close. */
const CONTACT_DISTANCE = CELL_SIZE * 0.7;
const EXTRA_LIFE_EVERY = 10_000;

const ENEMY_ROTATION: readonly EnemyKind[] = ["chaser", "ambusher", "patrol", "wanderer"];

/**
 * The whole simulation, with no reference to the DOM, canvas, or timers.
 *
 * Keeping it that way is what makes the rules testable at speed: the suite runs
 * thousands of simulated seconds in a Node environment. The 2025 version read
 * `document.getElementById` from inside its update loop and called
 * `setTimeout` to sequence respawns, so its tests had to mock the DOM to assert
 * on scoring, and several did little more than check a method existed.
 */
export class Game {
  maze: Maze;
  player: Player;
  enemies: Enemy[] = [];
  pellets: PelletField;

  score = 0;
  lives: number;
  level = 1;
  phase: GamePhase = "ready";

  /** Seconds of power-pellet effect left, 0 when inactive. */
  powerRemaining = 0;
  /** Seconds of post-respawn grace left, 0 when inactive. */
  invulnerableRemaining = 0;

  /** Drained by the presentation layer each frame. */
  readonly events: GameEvent[] = [];

  private readonly rng: Rng;
  private readonly baseSeed: number;
  private readonly startingLives: number;
  private readonly sizeOverride: MazeSize | undefined;
  private phaseTimer = READY_SECONDS;
  private timeInLife = 0;
  private powerChain = 0;
  private nextExtraLifeAt = EXTRA_LIFE_EVERY;
  private patrolRoute: readonly Tile[] = [];
  private playerStart: Tile;

  constructor(options: GameOptions = {}) {
    this.baseSeed = options.seed ?? Date.now();
    this.rng = createRng(this.baseSeed);
    this.startingLives = options.startingLives ?? 3;
    this.lives = this.startingLives;
    this.sizeOverride = options.mazeSize;

    this.maze = this.buildMaze();
    const plan = planSpawns(this.maze, enemyCountForLevel(this.level));
    this.playerStart = plan.playerStart;
    this.patrolRoute = plan.patrolRoute;
    this.player = new Player(this.maze, plan.playerStart, playerSpeedForLevel(this.level));
    this.pellets = this.buildPellets(plan.playerStart);
    this.enemies = this.buildEnemies(plan.enemyHomes);
    this.events.push({ type: "levelStart", level: this.level });
  }

  get isPowerActive(): boolean {
    return this.powerRemaining > 0;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableRemaining > 0;
  }

  /** Queue a direction for the player; ignored unless play is under way. */
  requestDirection(direction: Direction): void {
    if (this.phase !== "playing" && this.phase !== "ready") return;
    this.player.request(direction);
  }

  /** Starts a brand new game at level 1. */
  restart(): void {
    this.score = 0;
    this.lives = this.startingLives;
    this.level = 1;
    this.powerRemaining = 0;
    this.invulnerableRemaining = 0;
    this.powerChain = 0;
    this.nextExtraLifeAt = EXTRA_LIFE_EVERY;
    this.startLevel();
  }

  /**
   * Advances the simulation by `dt` seconds. Callers are expected to feed a
   * fixed timestep; see `FixedStepLoop`.
   */
  update(dt: number): void {
    switch (this.phase) {
      case "ready":
        this.tickPhase(dt, () => {
          this.phase = "playing";
        });
        return;

      case "dying":
        this.tickPhase(dt, () => this.afterDeath());
        return;

      case "levelComplete":
        this.tickPhase(dt, () => this.advanceLevel());
        return;

      case "gameOver":
        return;

      case "playing":
        this.updatePlaying(dt);
        return;
    }
  }

  private tickPhase(dt: number, onElapsed: () => void): void {
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) onElapsed();
  }

  private updatePlaying(dt: number): void {
    this.timeInLife += dt;

    if (this.invulnerableRemaining > 0) {
      this.invulnerableRemaining = Math.max(0, this.invulnerableRemaining - dt);
    }
    if (this.powerRemaining > 0) {
      this.powerRemaining = Math.max(0, this.powerRemaining - dt);
      if (this.powerRemaining === 0) this.powerChain = 0;
    }

    this.player.update(dt);
    this.collectPellet();

    const target = { tile: this.player.tile, facing: this.player.facing };
    for (const [index, enemy] of this.enemies.entries()) {
      // Staggered release, so a fresh life is never met by the whole pack.
      if (this.timeInLife < index * ENEMY_RELEASE_INTERVAL) continue;
      enemy.update(dt, target);
    }

    this.resolveContacts();

    if (this.pellets.allCollected && this.phase === "playing") {
      this.phase = "levelComplete";
      this.phaseTimer = LEVEL_COMPLETE_SECONDS;
    }
  }

  private collectPellet(): void {
    const kind = this.pellets.collect(this.player.tile);
    if (kind === null) return;

    this.addScore(PELLET_POINTS[kind]);
    this.events.push({ type: "pelletEaten", points: PELLET_POINTS[kind] });

    if (kind === "power") {
      this.powerRemaining = powerDurationForLevel(this.level);
      this.powerChain = 0;
      for (const enemy of this.enemies) enemy.frighten(this.powerRemaining);
      this.events.push({ type: "powerPellet" });
    }
  }

  private resolveContacts(): void {
    const playerPosition = this.player.position;

    for (const enemy of this.enemies) {
      if (worldDistance(playerPosition, enemy.position) > CONTACT_DISTANCE) continue;

      if (enemy.isEdible) {
        // Classic doubling: 200, 400, 800, 1600 within one power phase.
        const points = 200 * 2 ** this.powerChain;
        this.powerChain++;
        this.addScore(points);
        enemy.eaten();
        this.events.push({ type: "enemyEaten", points });
        continue;
      }

      if (enemy.isDangerous && !this.isInvulnerable) {
        this.loseLife();
        return;
      }
    }
  }

  private addScore(points: number): void {
    this.score += points;
    while (this.score >= this.nextExtraLifeAt) {
      this.lives++;
      this.nextExtraLifeAt += EXTRA_LIFE_EVERY;
      this.events.push({ type: "extraLife" });
    }
  }

  private loseLife(): void {
    this.lives--;
    this.powerRemaining = 0;
    this.powerChain = 0;
    this.player.mover.halt();
    this.events.push({ type: "lifeLost" });

    this.phase = "dying";
    this.phaseTimer = DYING_SECONDS;
  }

  private afterDeath(): void {
    if (this.lives <= 0) {
      this.phase = "gameOver";
      this.events.push({ type: "gameOver", score: this.score });
      return;
    }

    // Same maze and pellets, everyone back to their start.
    this.player.mover.placeAt(this.playerStart);
    for (const enemy of this.enemies) {
      enemy.mover.placeAt(enemy.homeTile);
      enemy.mood = "hunting";
      enemy.frightenedRemaining = 0;
    }

    this.invulnerableRemaining = INVULNERABLE_SECONDS;
    this.timeInLife = 0;
    this.phase = "ready";
    this.phaseTimer = READY_SECONDS;
  }

  private advanceLevel(): void {
    this.addScore(this.level * 100);
    this.level++;
    this.startLevel();
  }

  private startLevel(): void {
    this.maze = this.buildMaze();
    const plan = planSpawns(this.maze, enemyCountForLevel(this.level));
    this.playerStart = plan.playerStart;
    this.patrolRoute = plan.patrolRoute;

    this.player.mover.setMaze(this.maze, plan.playerStart);
    this.player.speed = playerSpeedForLevel(this.level);
    this.pellets = this.buildPellets(plan.playerStart);
    this.enemies = this.buildEnemies(plan.enemyHomes);

    this.powerRemaining = 0;
    this.powerChain = 0;
    this.invulnerableRemaining = 0;
    this.timeInLife = 0;
    this.phase = "ready";
    this.phaseTimer = READY_SECONDS;
    this.events.push({ type: "levelStart", level: this.level });
  }

  private buildMaze(): Maze {
    const size = this.sizeOverride ?? mazeSizeForLevel(this.level);
    // Derive each level's seed from the base seed, so a given seed replays the
    // whole run identically — which is what makes the E2E tests deterministic.
    return generateMaze({
      width: size.width,
      height: size.height,
      rng: createRng(this.baseSeed + this.level * 7919),
    });
  }

  private buildPellets(playerStart: Tile): PelletField {
    return PelletField.generate({
      maze: this.maze,
      rng: createRng(this.baseSeed + this.level * 104_729),
      density: pelletDensityForLevel(this.level),
      powerPelletCount: powerPelletCountForLevel(this.level),
      exclude: [playerStart],
    });
  }

  private buildEnemies(homes: readonly Tile[]): Enemy[] {
    const speed = enemySpeedForLevel(this.level);
    return homes.map((home, index) => {
      const kind = ENEMY_ROTATION[index % ENEMY_ROTATION.length] ?? "chaser";
      return new Enemy({
        maze: this.maze,
        kind,
        homeTile: home,
        speed,
        rng: this.rng,
        patrolRoute: this.patrolRoute,
      });
    });
  }
}
