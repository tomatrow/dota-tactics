/**
 * Tiles, directions and distances. A tile is (col, row): col grows east, row grows north (row 0 is
 * the south edge), as in the map data. Movement and ranges are 4-way: distance is Manhattan.
 */

/** What the simulation needs from the map: walkable tiles and their height levels. */
export interface Terrain {
	readonly cols: number
	readonly rows: number
	/** 1 where a unit may stand; row-major, index = row * cols + col. */
	readonly walkable: Uint8Array
	/** Height level per tile; NaN where there's no ground. */
	readonly level: Float32Array
}

export const tileIndex = (terrain: Terrain, col: number, row: number): number =>
	row * terrain.cols + col

export const inside = (terrain: Terrain, col: number, row: number): boolean =>
	col >= 0 && row >= 0 && col < terrain.cols && row < terrain.rows

export const isWalkable = (terrain: Terrain, col: number, row: number): boolean =>
	inside(terrain, col, row) && terrain.walkable[tileIndex(terrain, col, row)] === 1

/** A facing, and the direction of a step. */
export const Facing = { north: 0, east: 1, south: 2, west: 3 } as const
export type Facing = (typeof Facing)[keyof typeof Facing]

/** The four directions in the order every search tries them: north, east, south, west. */
export const DIRECTIONS: readonly { facing: Facing; dc: number; dr: number }[] = [
	{ facing: Facing.north, dc: 0, dr: 1 },
	{ facing: Facing.east, dc: 1, dr: 0 },
	{ facing: Facing.south, dc: 0, dr: -1 },
	{ facing: Facing.west, dc: -1, dr: 0 }
]

/**
 * The facing that points along (dc, dr): its larger axis, north/south on a tie. `fallback` when
 * there's no direction at all.
 */
export function facingToward(dc: number, dr: number, fallback: Facing): Facing {
	if (dc === 0 && dr === 0) return fallback
	if (Math.abs(dc) > Math.abs(dr)) return dc > 0 ? Facing.east : Facing.west
	return dr > 0 ? Facing.north : Facing.south
}

/** Which side of a unit an attack comes from, for evasion (FFTA). */
export type Exposure = "front" | "side" | "back"

/**
 * Which side of a unit facing `facing` an attacker at offset (dc, dr) from it hits. An attacker on
 * the same tile hits the front.
 */
export function exposure(facing: Facing, dc: number, dr: number): Exposure {
	const from = facingToward(dc, dr, facing)
	if (from === facing) return "front"
	return (from + 2) % 4 === facing ? "back" : "side"
}

/**
 * Manhattan distance between two square footprints: centres (c1, r1) and (c2, r2), each spanning
 * `radius` tiles out from its centre (0 = one tile, 1 = 3×3). Adjacent footprints are 1 apart.
 */
export function footprintDistance(
	c1: number,
	r1: number,
	radius1: number,
	c2: number,
	r2: number,
	radius2: number
): number {
	const reach = radius1 + radius2
	return Math.max(0, Math.abs(c1 - c2) - reach) + Math.max(0, Math.abs(r1 - r2) - reach)
}
