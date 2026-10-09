/** A Unity `Vector2` as a plain tuple (see `Vector3`). */
export type Vector2 = [x: number, y: number]

/** The unit vector in the direction of `v`, or the zero vector for the zero vector. */
export function normalized([x, y]: Vector2): Vector2 {
	const magnitude = Math.hypot(x, y)
	return magnitude > 0 ? [x / magnitude, y / magnitude] : [0, 0]
}

/** The dot product. */
export function dot([ax, ay]: Vector2, [bx, by]: Vector2): number {
	return ax * bx + ay * by
}
