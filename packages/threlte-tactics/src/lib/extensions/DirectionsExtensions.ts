import type { Vector3 } from "#lib/common/unity/vector3.ts"
import { Directions } from "#lib/enums/Directions.ts"
import { Point } from "#lib/model/Point.ts"
import type { Tile } from "#lib/view-model-component/Tile.svelte.ts"

/** Port of `Extensions/DirectionsExtensions.cs`. */

/** The direction to travel from `t1` to the neighbouring `t2`. */
export function getDirection(t1: Tile, t2: Tile): Directions
/** The direction a board offset points in. */
export function getDirection(p: Point): Directions
export function getDirection(...args: [t1: Tile, t2: Tile] | [p: Point]): Directions {
	if (args.length === 1) {
		const [p] = args
		if (p.y > 0) return Directions.North
		if (p.x > 0) return Directions.East
		if (p.y < 0) return Directions.South
		return Directions.West
	}

	const [t1, t2] = args
	if (t1.pos.y < t2.pos.y) return Directions.North
	if (t1.pos.x < t2.pos.x) return Directions.East
	if (t1.pos.y > t2.pos.y) return Directions.South
	return Directions.West
}

/** The `localEulerAngles` of something facing `d`. */
export function toEuler(d: Directions): Vector3 {
	return [0, d * 90, 0]
}

/** The board offset of one step towards `dir`. */
export function getNormal(dir: Directions): Point {
	switch (dir) {
		case Directions.North:
			return Point.of(0, 1)
		case Directions.East:
			return Point.of(1, 0)
		case Directions.South:
			return Point.of(0, -1)
		default: // Directions.West
			return Point.of(-1, 0)
	}
}
