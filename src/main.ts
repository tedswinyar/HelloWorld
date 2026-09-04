import { Game } from "./core/game";
import { loadHighScore, saveHighScore } from "./highScore";
import { Hud } from "./hud";
import { attachInput } from "./input";
import { FixedStepLoop } from "./loop";
import { Renderer } from "./render/renderer";
import "./styles.css";

/** Simulation step: 120Hz, so the physics is finer than any display refresh. */
const SIMULATION_STEP = 1 / 120;

function readSeed(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boot(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#board");
  const shell = document.querySelector<HTMLElement>("#shell");
  if (canvas === null || shell === null) {
    throw new Error("Game markup is missing #board or #shell");
  }

  const seed = readSeed();
  const game = new Game(seed === undefined ? {} : { seed });
  const renderer = new Renderer(canvas);
  const hud = new Hud(document);

  let highScore = loadHighScore();
  let savedForThisRun = false;

  const loop = new FixedStepLoop({
    step: SIMULATION_STEP,
    update: (dt) => {
      game.update(dt);

      // Drain events; the HUD reads state directly, so these are only needed
      // for the things state alone cannot express.
      for (const event of game.events.splice(0)) {
        if (event.type === "gameOver" && !savedForThisRun) {
          highScore = saveHighScore(event.score);
          savedForThisRun = true;
        }
      }
    },
    render: () => {
      renderer.render(game);
      hud.update(game, highScore);
    },
  });

  attachInput(shell, {
    onDirection: (direction) => game.requestDirection(direction),
    onConfirm: () => {
      if (game.phase === "gameOver") {
        game.restart();
        savedForThisRun = false;
      }
    },
  });

  // Pause when the tab is hidden: the loop clamps long gaps anyway, but this
  // avoids burning battery on an unwatched game.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      loop.stop();
    } else {
      loop.start();
    }
  });

  loop.start();

  // Inspection hook for the Playwright suite, which asserts on real game state
  // rather than on pixels.
  Object.defineProperty(window, "__mazeRunner", { value: { game, loop } });
}

boot();
