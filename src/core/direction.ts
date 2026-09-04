export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

interface DirectionVector {
  readonly dtx: number;
  readonly dty: number;
}

const VECTORS: Record<Direction, DirectionVector> = {
  up: { dtx: 0, dty: -1 },
  down: { dtx: 0, dty: 1 },
  left: { dtx: -1, dty: 0 },
  right: { dtx: 1, dty: 0 },
};

const OPPOSITES: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function vector(d: Direction): DirectionVector {
  return VECTORS[d];
}

export function opposite(d: Direction): Direction {
  return OPPOSITES[d];
}
