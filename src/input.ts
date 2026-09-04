import type { Direction } from "./core/direction";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

/** Minimum swipe travel, in CSS pixels, before it counts as a direction. */
const SWIPE_THRESHOLD = 24;

export interface InputHandlers {
  readonly onDirection: (direction: Direction) => void;
  readonly onConfirm: () => void;
}

/**
 * Keyboard and touch input.
 *
 * Requirement 6.3 asks for responsive controls "across different devices", and
 * the 2025 build was keyboard-only, so it was unplayable on the mobile browsers
 * its own README claimed to support.
 */
export function attachInput(target: HTMLElement, handlers: InputHandlers): () => void {
  let touchStartX = 0;
  let touchStartY = 0;

  const onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_MAP[event.code];
    if (direction !== undefined) {
      event.preventDefault();
      handlers.onDirection(direction);
      return;
    }
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      handlers.onConfirm();
    }
  };

  const onTouchStart = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (touch === undefined) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  };

  const onTouchEnd = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (touch === undefined) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      handlers.onConfirm();
      return;
    }

    event.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) {
      handlers.onDirection(dx > 0 ? "right" : "left");
    } else {
      handlers.onDirection(dy > 0 ? "down" : "up");
    }
  };

  window.addEventListener("keydown", onKeyDown);
  target.addEventListener("touchstart", onTouchStart, { passive: true });
  target.addEventListener("touchend", onTouchEnd);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("touchstart", onTouchStart);
    target.removeEventListener("touchend", onTouchEnd);
  };
}
