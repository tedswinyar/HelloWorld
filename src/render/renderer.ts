import { CELL_SIZE, tile as makeTile, tileCentre } from "../core/coords";
import type { Direction } from "../core/direction";
import type { Enemy, EnemyKind } from "../core/enemy";
import type { Game } from "../core/game";
import { isPath, type Maze } from "../core/maze";

const COLOURS = {
  background: "#000000",
  wall: "#1d1db8",
  wallEdge: "#5c5cff",
  pellet: "#ffb897",
  powerPellet: "#ffd9a0",
  player: "#ffe000",
  frightened: "#2121de",
  frightenedFlash: "#f0f0ff",
  eye: "#ffffff",
  pupil: "#1c1c8c",
  text: "#ffffff",
  textAccent: "#ffe000",
} as const;

const ENEMY_COLOURS: Record<EnemyKind, string> = {
  chaser: "#ff2d2d",
  ambusher: "#ffb2f0",
  patrol: "#3ff0f0",
  wanderer: "#ffab4a",
};

/** Angle of travel used to orient the player's mouth and the ghosts' eyes. */
const FACING_ANGLE: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/**
 * Draws the board.
 *
 * Two things the 2025 renderer got wrong, both visible the moment you loaded it:
 * it filled *path* cells with bright blue and left walls black, so the maze read
 * as a solid blue field with black cracks through it; and it ran a scrolling
 * camera over a board that already fitted on screen, which shrank the player to
 * an unreadable speck beneath the HUD. Here walls are drawn and paths are left
 * empty, and the canvas is sized to the whole maze and scaled by CSS — you can
 * see every enemy, which is the information the game is actually about.
 */
export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private mazeSignature = "";

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("This browser does not support the 2D canvas context");
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  render(game: Game): void {
    this.syncSize(game.maze);

    const { ctx } = this;
    ctx.fillStyle = COLOURS.background;
    ctx.fillRect(0, 0, game.maze.width * CELL_SIZE, game.maze.height * CELL_SIZE);

    this.drawMaze(game.maze);
    this.drawPellets(game);
    for (const enemy of game.enemies) this.drawEnemy(enemy, game.powerRemaining);
    this.drawPlayer(game);
    this.drawPhaseMessage(game);
  }

  /** Matches the backing store to the maze size and the device pixel ratio. */
  private syncSize(maze: Maze): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const signature = `${maze.width}x${maze.height}@${dpr}`;
    if (signature === this.mazeSignature) return;
    this.mazeSignature = signature;

    const worldWidth = maze.width * CELL_SIZE;
    const worldHeight = maze.height * CELL_SIZE;

    this.canvas.width = Math.round(worldWidth * dpr);
    this.canvas.height = Math.round(worldHeight * dpr);
    this.canvas.style.aspectRatio = `${worldWidth} / ${worldHeight}`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private drawMaze(maze: Maze): void {
    const { ctx } = this;

    ctx.fillStyle = COLOURS.wall;
    for (let ty = 0; ty < maze.height; ty++) {
      for (let tx = 0; tx < maze.width; tx++) {
        if (isPath(maze, makeTile(tx, ty))) continue;
        ctx.fillRect(tx * CELL_SIZE, ty * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // Outline the corridor side of every wall, which is what gives the maze its
    // shape rather than a flat slab of colour.
    ctx.strokeStyle = COLOURS.wallEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let ty = 0; ty < maze.height; ty++) {
      for (let tx = 0; tx < maze.width; tx++) {
        if (isPath(maze, makeTile(tx, ty))) continue;
        const left = tx * CELL_SIZE;
        const top = ty * CELL_SIZE;

        if (isPath(maze, makeTile(tx, ty - 1))) {
          ctx.moveTo(left, top + 1);
          ctx.lineTo(left + CELL_SIZE, top + 1);
        }
        if (isPath(maze, makeTile(tx, ty + 1))) {
          ctx.moveTo(left, top + CELL_SIZE - 1);
          ctx.lineTo(left + CELL_SIZE, top + CELL_SIZE - 1);
        }
        if (isPath(maze, makeTile(tx - 1, ty))) {
          ctx.moveTo(left + 1, top);
          ctx.lineTo(left + 1, top + CELL_SIZE);
        }
        if (isPath(maze, makeTile(tx + 1, ty))) {
          ctx.moveTo(left + CELL_SIZE - 1, top);
          ctx.lineTo(left + CELL_SIZE - 1, top + CELL_SIZE);
        }
      }
    }
    ctx.stroke();
  }

  private drawPellets(game: Game): void {
    const { ctx } = this;
    // One shared pulse so the power pellets blink in unison.
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);

    for (const { tile, kind } of game.pellets.entries()) {
      const centre = tileCentre(tile);
      const radius = kind === "power" ? CELL_SIZE * 0.3 * pulse : CELL_SIZE * 0.1;
      ctx.fillStyle = kind === "power" ? COLOURS.powerPellet : COLOURS.pellet;
      ctx.beginPath();
      ctx.arc(centre.wx, centre.wy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlayer(game: Game): void {
    const { ctx } = this;
    if (game.phase === "gameOver") return;

    // Blink through the post-respawn grace period.
    if (game.isInvulnerable && Math.floor(performance.now() / 120) % 2 === 0) return;

    const { wx, wy } = game.player.position;
    const radius = CELL_SIZE * 0.44;

    // Mouth opens and closes only while moving; a stopped player stays closed.
    const openness = game.player.isMoving
      ? Math.abs(Math.sin(game.player.animationTime * 11)) * 0.72
      : 0;
    const angle = FACING_ANGLE[game.player.facing];

    ctx.fillStyle = COLOURS.player;
    ctx.beginPath();
    if (openness < 0.02) {
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
    } else {
      ctx.moveTo(wx, wy);
      ctx.arc(wx, wy, radius, angle + openness, angle - openness + Math.PI * 2);
      ctx.closePath();
    }
    ctx.fill();
  }

  private drawEnemy(enemy: Enemy, powerRemaining: number): void {
    const { ctx } = this;
    const { wx, wy } = enemy.position;
    const radius = CELL_SIZE * 0.42;
    const bodyTop = wy - radius * 0.2;

    const isFlashing = enemy.isEdible && powerRemaining < 2;
    const showBody = enemy.mood !== "returning";

    if (showBody) {
      if (enemy.isEdible) {
        ctx.fillStyle =
          isFlashing && Math.floor(performance.now() / 200) % 2 === 0
            ? COLOURS.frightenedFlash
            : COLOURS.frightened;
      } else {
        ctx.fillStyle = ENEMY_COLOURS[enemy.kind];
      }

      // Dome plus the classic scalloped skirt.
      ctx.beginPath();
      ctx.arc(wx, bodyTop, radius, Math.PI, 0);
      ctx.lineTo(wx + radius, wy + radius * 0.8);
      const scallops = 3;
      const scallopWidth = (radius * 2) / scallops;
      for (let i = 0; i < scallops; i++) {
        const startX = wx + radius - i * scallopWidth;
        ctx.quadraticCurveTo(
          startX - scallopWidth / 2,
          wy + radius * (i % 2 === 0 ? 0.15 : 1.1),
          startX - scallopWidth,
          wy + radius * 0.8,
        );
      }
      ctx.closePath();
      ctx.fill();
    }

    this.drawEyes(wx, bodyTop, radius, enemy.facing, enemy.isEdible && !isFlashing);
  }

  private drawEyes(
    wx: number,
    wy: number,
    radius: number,
    facing: Direction,
    dimPupils: boolean,
  ): void {
    const { ctx } = this;
    const eyeOffsetX = radius * 0.38;
    const eyeRadius = radius * 0.3;
    const pupilRadius = radius * 0.15;
    const angle = FACING_ANGLE[facing];
    const lookX = Math.cos(angle) * eyeRadius * 0.45;
    const lookY = Math.sin(angle) * eyeRadius * 0.45;

    for (const side of [-1, 1]) {
      const eyeX = wx + side * eyeOffsetX;

      ctx.fillStyle = COLOURS.eye;
      ctx.beginPath();
      ctx.ellipse(eyeX, wy, eyeRadius * 0.85, eyeRadius, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = dimPupils ? COLOURS.frightened : COLOURS.pupil;
      ctx.beginPath();
      ctx.arc(eyeX + lookX, wy + lookY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPhaseMessage(game: Game): void {
    const message = phaseMessage(game);
    if (message === null) return;

    const { ctx } = this;
    const worldWidth = game.maze.width * CELL_SIZE;
    const worldHeight = game.maze.height * CELL_SIZE;

    if (game.phase === "gameOver") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(0, 0, worldWidth, worldHeight);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = message.accent ? COLOURS.textAccent : COLOURS.text;
    ctx.font = `bold ${Math.round(CELL_SIZE * 1.5)}px system-ui, sans-serif`;
    ctx.fillText(message.title, worldWidth / 2, worldHeight / 2);

    if (message.subtitle !== undefined) {
      ctx.fillStyle = COLOURS.text;
      ctx.font = `${Math.round(CELL_SIZE * 0.75)}px system-ui, sans-serif`;
      ctx.fillText(message.subtitle, worldWidth / 2, worldHeight / 2 + CELL_SIZE * 1.6);
    }
  }
}

interface PhaseMessage {
  readonly title: string;
  readonly subtitle?: string;
  readonly accent: boolean;
}

function phaseMessage(game: Game): PhaseMessage | null {
  switch (game.phase) {
    case "ready":
      return { title: "READY!", accent: true };
    case "levelComplete":
      return { title: `LEVEL ${game.level}`, subtitle: "cleared", accent: true };
    case "gameOver":
      return {
        title: "GAME OVER",
        subtitle: `${game.score.toLocaleString()} points — press Space to play again`,
        accent: false,
      };
    case "playing":
    case "dying":
      return null;
  }
}

/** Re-exported so the HUD can reuse the palette for the lives display. */
export { COLOURS as PALETTE };
