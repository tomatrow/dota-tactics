import { Vector3 } from "three"
import type { MapModel } from "#lib/map/model.ts"
import type { MapLane } from "#lib/map/schema.ts"
import { sceneX, sceneY, sceneZ } from "./coords.ts"

/** Each team's path keeps to its own right (tiles), so both directions of a lane show. */
const KEEP_RIGHT = 0.35
/** Height above the ground (tiles). */
const LIFT = 0.12
/** Sample spacing along a path (game units). */
const STEP = 24

/**
 * Points along a lane path that follow the ground, sampled closely enough that a line through them
 * steps up and down with the tiles under it.
 */
export function laneSamples(model: MapModel, lane: MapLane, verticalScale: number): Vector3[] {
	const out: Vector3[] = []
	const { points } = lane
	for (let s = 0; s + 1 < points.length; s++) {
		const [ax, ay, az] = points[s]
		const [bx, by] = points[s + 1]
		const length = Math.hypot(bx - ax, by - ay)
		// Right of travel in game space (x east, y north) is (dy, -dx).
		const rx = length ? (by - ay) / length : 0
		const ry = length ? -(bx - ax) / length : 0
		const n = Math.max(1, Math.ceil(length / STEP))
		for (let k = s === 0 ? 0 : 1; k <= n; k++) {
			const t = k / n
			const x = ax + (bx - ax) * t + rx * KEEP_RIGHT * model.cell
			const y = ay + (by - ay) * t + ry * KEEP_RIGHT * model.cell
			const cell = model.cellOf(x, y)
			const ground = cell ? model.height[model.index(...cell)] : Number.NaN
			out.push(
				new Vector3(
					sceneX(model, x),
					sceneY(model, Number.isNaN(ground) ? az : ground, verticalScale) + LIFT,
					sceneZ(model, y)
				)
			)
		}
	}
	return out
}
