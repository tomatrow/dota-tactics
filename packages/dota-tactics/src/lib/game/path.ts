/** A point on the map in game units: x east, y north. */
export type Point2 = readonly [x: number, y: number]

/** The length of a polyline, in the points' units. */
export function pathLength(points: readonly Point2[]): number {
	let length = 0
	for (let i = 1; i < points.length; i++) {
		length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
	}
	return length
}

/**
 * The point `distance` along a polyline from its first point. Distances before the start or past
 * the end clamp to the end points.
 */
export function pointAlong(points: readonly Point2[], distance: number): Point2 {
	if (points.length === 0) throw new Error("pointAlong needs at least one point")
	if (distance <= 0) return points[0]
	let left = distance
	for (let i = 1; i < points.length; i++) {
		const [ax, ay] = points[i - 1]
		const [bx, by] = points[i]
		const step = Math.hypot(bx - ax, by - ay)
		if (left <= step) {
			const t = step === 0 ? 0 : left / step
			return [ax + (bx - ax) * t, ay + (by - ay) * t]
		}
		left -= step
	}
	return points[points.length - 1]
}
