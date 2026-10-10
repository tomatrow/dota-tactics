/** Simulation ticks per second. */
export const TICK_RATE = 20

/** Seconds per tick. */
export const TICK_SECONDS = 1 / TICK_RATE

/**
 * A full gauge. Gauges are held in points × TICK_RATE, so a unit adds its speed (points per second)
 * each tick and stays in whole numbers: speed 20 fills in exactly 100 ticks (5 s).
 */
export const GAUGE_FULL = 100 * TICK_RATE

/** Game units per tile. */
export const TILE_UNITS = 64

/**
 * A completed step. Step progress is held in game units × TICK_RATE, so a walking unit adds its
 * walk speed (game units per second) each tick and stays in whole numbers.
 */
export const STEP_FULL = TILE_UNITS * TICK_RATE

/** Whole ticks in `s` seconds. */
export const ticks = (s: number): number => Math.round(s * TICK_RATE)
