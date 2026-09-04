import { expect, type Page, test } from "@playwright/test";

/**
 * End-to-end tests that drive a real browser with real key presses.
 *
 * The 2025 build had 301 unit tests and was unplayable: an enemy spawned on top
 * of the player and ended the game about two seconds after load, every time.
 * Nothing in that suite opened the game. These tests do, which is the only way
 * to catch "renders fine, plays terribly".
 *
 * A fixed seed makes every run identical, so failures are reproducible.
 */
const SEED = 20260903;

/** Minimal shape of the inspection hook `main.ts` attaches to `window`. */
interface GameProbe {
  phase: string;
  score: number;
  lives: number;
  level: number;
  playerTile: { tx: number; ty: number };
  pelletsRemaining: number;
  pelletsTotal: number;
  enemyCount: number;
  minEnemyGap: number;
}

async function probe(page: Page): Promise<GameProbe> {
  return page.evaluate(() => {
    const runner = (
      window as unknown as {
        __mazeRunner: {
          game: {
            phase: string;
            score: number;
            lives: number;
            level: number;
            player: { tile: { tx: number; ty: number }; position: { wx: number; wy: number } };
            pellets: { remaining: number; total: number };
            enemies: Array<{ position: { wx: number; wy: number } }>;
          };
        };
      }
    ).__mazeRunner;
    const game = runner.game;

    const gaps = game.enemies.map((enemy) =>
      Math.hypot(
        enemy.position.wx - game.player.position.wx,
        enemy.position.wy - game.player.position.wy,
      ),
    );

    return {
      phase: game.phase,
      score: game.score,
      lives: game.lives,
      level: game.level,
      playerTile: { tx: game.player.tile.tx, ty: game.player.tile.ty },
      pelletsRemaining: game.pellets.remaining,
      pelletsTotal: game.pellets.total,
      enemyCount: game.enemies.length,
      minEnemyGap: gaps.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...gaps),
    };
  });
}

async function open(page: Page, query = ""): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`/?seed=${SEED}${query}`);
  await page.waitForFunction(
    () => (window as unknown as { __mazeRunner?: unknown }).__mazeRunner !== undefined,
  );

  expect(errors, "the page must load without console errors").toEqual([]);
}

test.describe("loading", () => {
  test("boots the game and shows a starting HUD", async ({ page }) => {
    await open(page);

    await expect(page.locator("#board")).toBeVisible();
    await expect(page.locator('[data-hud="score"]')).toHaveText("0");
    await expect(page.locator('[data-hud="level"]')).toHaveText("1");
    await expect(page.locator('[data-hud="lives"]')).toHaveText("●●●");
    await expect(page.locator('[data-hud="power"]')).toBeHidden();
  });

  test("generates a board with pellets and enemies", async ({ page }) => {
    await open(page);
    const state = await probe(page);

    expect(state.pelletsTotal).toBeGreaterThan(100);
    expect(state.pelletsRemaining).toBe(state.pelletsTotal);
    expect(state.enemyCount).toBeGreaterThanOrEqual(2);
  });

  test("sizes the canvas to the whole board rather than scrolling a camera", async ({ page }) => {
    await open(page);

    const box = await page.locator("#board").boundingBox();
    expect(box).not.toBeNull();
    if (box === null) return;

    // The 41x27 board is wider than it is tall; the canvas must match, and it
    // must fit inside the viewport rather than overflow it.
    expect(box.width).toBeGreaterThan(box.height);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (viewport !== null) {
      expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
  });

  test("draws something other than an empty canvas", async ({ page }) => {
    await open(page);

    const distinctColours = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#board");
      const ctx = canvas?.getContext("2d");
      if (canvas === null || ctx === null || ctx === undefined) return 0;

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const seen = new Set<string>();
      for (let i = 0; i < data.length; i += 4 * 97) {
        seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
      return seen.size;
    });

    // Walls, pellets, player and ghosts: several distinct colours, not one.
    expect(distinctColours).toBeGreaterThan(3);
  });
});

test.describe("the opening is survivable", () => {
  test("keeps all three lives through the first seconds with no input", async ({ page }) => {
    // The headline regression: this is exactly what the 2025 build failed.
    await open(page);

    const atLoad = await probe(page);
    expect(atLoad.minEnemyGap).toBeGreaterThan(100);

    await page.waitForTimeout(3_500);

    const later = await probe(page);
    expect(later.lives).toBe(3);
    expect(later.phase).toBe("playing");
    await expect(page.locator('[data-hud="lives"]')).toHaveText("●●●");
  });

  test("holds the player still until READY clears", async ({ page }) => {
    await open(page);
    const start = await probe(page);

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(300);

    const during = await probe(page);
    expect(during.phase).toBe("ready");
    expect(during.playerTile).toEqual(start.playerTile);
  });
});

test.describe("controls", () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
    await page.waitForTimeout(2_000); // let READY clear
  });

  test("moves the player with the arrow keys", async ({ page }) => {
    const before = await probe(page);

    for (const key of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(400);
    }

    const after = await probe(page);
    expect(after.playerTile).not.toEqual(before.playerTile);
  });

  test("moves the player with WASD too", async ({ page }) => {
    const before = await probe(page);

    for (const key of ["KeyA", "KeyW", "KeyD", "KeyS"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(400);
    }

    expect((await probe(page)).playerTile).not.toEqual(before.playerTile);
  });

  test("scores pellets while being driven around", async ({ page }) => {
    for (const key of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(500);
    }

    const state = await probe(page);
    expect(state.score).toBeGreaterThan(0);
    expect(state.pelletsRemaining).toBeLessThan(state.pelletsTotal);
    await expect(page.locator('[data-hud="score"]')).not.toHaveText("0");
  });

  test("does not let arrow keys scroll the page", async ({ page }) => {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe("game over and restart", () => {
  /** Ends the run immediately by walking a ghost into the player. */
  async function forceGameOver(page: Page): Promise<void> {
    await page.evaluate(() => {
      const game = (
        window as unknown as {
          __mazeRunner: {
            game: {
              lives: number;
              player: { tile: { tx: number; ty: number } };
              enemies: Array<{ mover: { placeAt: (t: { tx: number; ty: number }) => void } }>;
            };
          };
        }
      ).__mazeRunner.game;

      game.lives = 1;
      for (const enemy of game.enemies) enemy.mover.placeAt(game.player.tile);
    });
    await page.waitForTimeout(1_800);
  }

  test("ends the game and offers a restart", async ({ page }) => {
    await open(page);
    await page.waitForTimeout(2_000);
    await forceGameOver(page);

    expect((await probe(page)).phase).toBe("gameOver");
  });

  test("restarts on Space, back to a full board", async ({ page }) => {
    await open(page);
    await page.waitForTimeout(2_000);
    await forceGameOver(page);

    await page.keyboard.press("Space");
    await page.waitForTimeout(200);

    const state = await probe(page);
    expect(state.phase).not.toBe("gameOver");
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);
    expect(state.pelletsRemaining).toBe(state.pelletsTotal);
    await expect(page.locator('[data-hud="score"]')).toHaveText("0");
  });

  test("remembers the high score across a reload", async ({ page }) => {
    await open(page);
    await page.waitForTimeout(2_000);

    await page.evaluate(() => {
      const game = (window as unknown as { __mazeRunner: { game: { score: number } } }).__mazeRunner
        .game;
      game.score = 4_321;
    });
    await forceGameOver(page);

    await page.reload();
    await page.waitForFunction(
      () => (window as unknown as { __mazeRunner?: unknown }).__mazeRunner !== undefined,
    );

    await expect(page.locator('[data-hud="high-score"]')).toHaveText("4,321");
  });
});

test.describe("determinism", () => {
  test("the same seed produces the same board", async ({ page }) => {
    await open(page);
    const first = await probe(page);

    await page.reload();
    await page.waitForFunction(
      () => (window as unknown as { __mazeRunner?: unknown }).__mazeRunner !== undefined,
    );
    const second = await probe(page);

    expect(second.playerTile).toEqual(first.playerTile);
    expect(second.pelletsTotal).toBe(first.pelletsTotal);
  });
});
