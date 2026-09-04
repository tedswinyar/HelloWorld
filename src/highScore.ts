const STORAGE_KEY = "maze-runner:high-score";

/**
 * Local high score (requirement 7.4).
 *
 * Every access is guarded because `localStorage` throws rather than returning
 * null in a handful of real situations — Safari private browsing, and any
 * embedding where storage is partitioned off. A crash there would take the
 * whole game down with it.
 */
export function loadHighScore(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/** Stores `score` if it beats the stored value; returns the resulting best. */
export function saveHighScore(score: number): number {
  const best = Math.max(score, loadHighScore());
  try {
    window.localStorage.setItem(STORAGE_KEY, String(best));
  } catch {
    // Non-fatal: the score just will not survive a reload.
  }
  return best;
}
