import { MAX_POWER_DURATION } from "./core/difficulty";
import type { Game } from "./core/game";

function requireElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`HUD is missing a required element: ${selector}`);
  }
  return element;
}

/**
 * Mirrors game state into the DOM.
 *
 * The 2025 version called `document.getElementById` four times per frame from
 * inside `GameEngine.update`, which is both wasteful and the reason its scoring
 * tests needed a fake DOM to say anything. Element lookups happen once here,
 * and the simulation knows nothing about any of it.
 */
export class Hud {
  private readonly score: HTMLElement;
  private readonly highScore: HTMLElement;
  private readonly level: HTMLElement;
  private readonly lives: HTMLElement;
  private readonly pellets: HTMLElement;
  private readonly power: HTMLElement;
  private readonly powerBar: HTMLElement;

  private lastRendered = "";

  constructor(root: ParentNode) {
    this.score = requireElement(root, '[data-hud="score"]');
    this.highScore = requireElement(root, '[data-hud="high-score"]');
    this.level = requireElement(root, '[data-hud="level"]');
    this.lives = requireElement(root, '[data-hud="lives"]');
    this.pellets = requireElement(root, '[data-hud="pellets"]');
    this.power = requireElement(root, '[data-hud="power"]');
    this.powerBar = requireElement(root, '[data-hud="power-bar"]');
  }

  update(game: Game, highScore: number): void {
    const powerSeconds = Math.ceil(game.powerRemaining);
    // Skip DOM writes when nothing visible has changed.
    const signature = [
      game.score,
      highScore,
      game.level,
      game.lives,
      game.pellets.remaining,
      powerSeconds,
    ].join("|");
    if (signature === this.lastRendered) return;
    this.lastRendered = signature;

    this.score.textContent = game.score.toLocaleString();
    this.highScore.textContent = highScore.toLocaleString();
    this.level.textContent = String(game.level);
    this.pellets.textContent = String(game.pellets.remaining);
    this.lives.textContent = "●".repeat(Math.max(0, game.lives));
    this.lives.setAttribute("aria-label", `${Math.max(0, game.lives)} lives remaining`);

    if (game.isPowerActive) {
      this.power.hidden = false;
      this.power.dataset.expiring = game.powerRemaining < 2 ? "true" : "false";
      this.powerBar.style.setProperty(
        "--power-fraction",
        `${game.powerRemaining / MAX_POWER_DURATION}`,
      );
      this.powerBar.textContent = `${powerSeconds}s`;
    } else {
      this.power.hidden = true;
    }
  }
}
