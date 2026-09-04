export interface FixedStepLoopOptions {
  /** Simulation step in seconds. */
  readonly step: number;
  readonly update: (dt: number) => void;
  /** `alpha` is the fraction of a step left over, for interpolation. */
  readonly render: (alpha: number) => void;
}

/**
 * Fixed-timestep game loop with a decoupled render.
 *
 * The 2025 loop tried to *limit* itself to 60fps by skipping work when
 * `deltaTime < frameInterval`, then moved actors by a per-frame pixel constant.
 * The result was a simulation whose speed was set by the display: twice as fast
 * on a 120Hz panel. Here the simulation always advances in equal `step`
 * increments regardless of how often the browser calls us.
 */
export class FixedStepLoop {
  private readonly options: FixedStepLoopOptions;
  private accumulator = 0;
  private lastTime = 0;
  private frameHandle: number | null = null;

  constructor(options: FixedStepLoopOptions) {
    this.options = options;
  }

  get isRunning(): boolean {
    return this.frameHandle !== null;
  }

  start(): void {
    if (this.frameHandle !== null) return;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.frameHandle === null) return;
    cancelAnimationFrame(this.frameHandle);
    this.frameHandle = null;
  }

  private readonly tick = (now: number): void => {
    const { step, update, render } = this.options;

    // Clamp so a backgrounded tab does not come back and run a thousand steps.
    const elapsed = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.accumulator += elapsed;

    let steps = 0;
    while (this.accumulator >= step && steps < 8) {
      update(step);
      this.accumulator -= step;
      steps++;
    }

    render(this.accumulator / step);
    this.frameHandle = requestAnimationFrame(this.tick);
  };
}
